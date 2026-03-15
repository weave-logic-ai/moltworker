import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { formatForGlasses } from '../mentra/display-format';
import { MOLTBOT_PORT } from '../config';
import { ensureMoltbotGateway } from '../gateway';

const VERSION = '1.0.0';

export const mentraRoutes = new Hono<AppEnv>();

/**
 * GET /health — Simple health check for monitoring
 */
mentraRoutes.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'WeaveLogic MentraOS Bridge',
    version: VERSION,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /status — Bridge configuration status
 */
mentraRoutes.get('/status', (c) => {
  return c.json({
    bridge: 'active',
    mentraConfigured: !!c.env.MENTRA_API_KEY,
    openClawConfigured: !!c.env.MOLTBOT_GATEWAY_TOKEN,
    version: VERSION,
  });
});

/**
 * POST /webhook — Receive MentraOS events (transcriptions, photos)
 * Forwards to the OpenClaw /api/chat endpoint and returns the response.
 */
mentraRoutes.post('/webhook', async (c) => {
  // Log incoming headers for debugging MentraOS webhook format
  console.log('[Mentra] Webhook headers:', JSON.stringify(Object.fromEntries(
    [...c.req.raw.headers.entries()].filter(([k]) => !k.includes('cookie') && !k.includes('cf-access')),
  )));

  // Verify API key — accept via Authorization Bearer, x-api-key header, or ?key= query param
  const expectedKey = c.env.MENTRA_API_KEY;
  if (expectedKey) {
    const authHeader = c.req.header('Authorization');
    const bearerKey = authHeader?.replace('Bearer ', '');
    const xApiKey = c.req.header('x-api-key');
    const queryKey = new URL(c.req.url).searchParams.get('key');
    const providedKey = bearerKey || xApiKey || queryKey;
    if (providedKey !== expectedKey) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
  }

  const gatewayToken = c.env.MOLTBOT_GATEWAY_TOKEN;
  if (!gatewayToken) {
    return c.json({ error: 'Gateway token not configured' }, 503);
  }

  let body: { type?: string; text?: string; imageData?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const message = body.text || 'What do you see? Be concise.';

  try {
    // Call gateway directly inside the container — bypasses CF Access and Worker proxy
    const sandbox = c.get('sandbox');
    await ensureMoltbotGateway(sandbox, c.env);

    // Use OpenAI Chat Completions API format
    const messages: Array<{ role: string; content: string }> = [
      { role: 'user', content: message },
    ];

    const chatBody = {
      model: 'gw-openrouter/google/gemini-2.0-flash-001',
      messages,
      max_tokens: 256,
    };

    const gatewayResp = await sandbox.containerFetch(
      new Request(`http://localhost:${MOLTBOT_PORT}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${gatewayToken}`,
        },
        body: JSON.stringify(chatBody),
      }),
      MOLTBOT_PORT,
    );

    if (!gatewayResp.ok) {
      const text = await gatewayResp.text().catch(() => '');
      throw new Error(`Gateway returned ${gatewayResp.status}: ${text.substring(0, 200)}`);
    }

    const data = (await gatewayResp.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const responseText = data.choices?.[0]?.message?.content || 'No response';

    return c.json({
      success: true,
      response: formatForGlasses(responseText),
    });
  } catch (err) {
    console.error('[Mentra] Webhook query failed:', err);
    return c.json(
      { error: 'Failed to process request', details: err instanceof Error ? err.message : 'Unknown error' },
      502,
    );
  }
});
