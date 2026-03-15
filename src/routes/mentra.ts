import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { formatForGlasses } from '../mentra/display-format';
import { MOLTBOT_PORT } from '../config';
import { ensureMoltbotGateway } from '../gateway';

const VERSION = '1.0.0';
const MENTRA_BRIDGE_PORT = 7010;

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
 * POST /webhook — Proxy to MentraOS AppServer inside the container.
 * The AppServer handles the session lifecycle and WebSocket to MentraOS Cloud.
 * Falls back to direct OpenClaw chat if the bridge isn't running.
 */
mentraRoutes.post('/webhook', async (c) => {
  console.log('[Mentra] Webhook received');
  console.log('[Mentra] Headers:', JSON.stringify(Object.fromEntries(
    [...c.req.raw.headers.entries()].filter(([k]) => !k.includes('cookie') && !k.includes('cf-access')),
  )));

  const sandbox = c.get('sandbox');
  await ensureMoltbotGateway(sandbox, c.env);

  // Try forwarding to the MentraOS AppServer bridge on port 7010
  try {
    const bridgeResp = await sandbox.containerFetch(
      new Request(`http://localhost:${MENTRA_BRIDGE_PORT}/webhook`, {
        method: 'POST',
        headers: c.req.raw.headers,
        body: c.req.raw.body,
      }),
      MENTRA_BRIDGE_PORT,
    );

    if (bridgeResp.ok) {
      console.log('[Mentra] Bridge handled webhook');
      return new Response(bridgeResp.body, {
        status: bridgeResp.status,
        headers: bridgeResp.headers,
      });
    }
    console.log('[Mentra] Bridge returned', bridgeResp.status, '- falling back to direct chat');
  } catch (err) {
    console.log('[Mentra] Bridge not available, falling back to direct chat:', err instanceof Error ? err.message : '');
  }

  // Fallback: direct OpenClaw chat (for when bridge isn't running)
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
    const messages: Array<{ role: string; content: string }> = [
      { role: 'user', content: message },
    ];

    const gatewayResp = await sandbox.containerFetch(
      new Request(`http://localhost:${MOLTBOT_PORT}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${gatewayToken}`,
        },
        body: JSON.stringify({ messages, max_tokens: 256 }),
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

    return c.json({
      success: true,
      response: formatForGlasses(data.choices?.[0]?.message?.content || 'No response'),
    });
  } catch (err) {
    console.error('[Mentra] Webhook query failed:', err);
    return c.json(
      { error: 'Failed to process request', details: err instanceof Error ? err.message : 'Unknown error' },
      502,
    );
  }
});

/**
 * Catch-all proxy — forward any other /mentra/* requests to the AppServer.
 * MentraOS Cloud may send various HTTP requests beyond just /webhook.
 */
mentraRoutes.all('/*', async (c) => {
  const sandbox = c.get('sandbox');

  try {
    await ensureMoltbotGateway(sandbox, c.env);
    const url = new URL(c.req.url);
    const path = url.pathname.replace('/mentra', '') || '/';

    const bridgeResp = await sandbox.containerFetch(
      new Request(`http://localhost:${MENTRA_BRIDGE_PORT}${path}${url.search}`, {
        method: c.req.method,
        headers: c.req.raw.headers,
        body: c.req.method !== 'GET' && c.req.method !== 'HEAD' ? c.req.raw.body : undefined,
      }),
      MENTRA_BRIDGE_PORT,
    );

    return new Response(bridgeResp.body, {
      status: bridgeResp.status,
      headers: bridgeResp.headers,
    });
  } catch (err) {
    return c.json(
      { error: 'MentraOS bridge not available', details: err instanceof Error ? err.message : '' },
      502,
    );
  }
});
