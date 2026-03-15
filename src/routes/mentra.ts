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
  // G17 fix: Verify MENTRA_API_KEY if configured
  const expectedKey = c.env.MENTRA_API_KEY;
  if (expectedKey) {
    const authHeader = c.req.header('Authorization');
    const providedKey = authHeader?.replace('Bearer ', '');
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

    const chatBody: Record<string, string> = { message };
    if (body.imageData) chatBody.imageData = body.imageData;

    const gatewayResp = await sandbox.containerFetch(
      new Request(`http://localhost:${MOLTBOT_PORT}/api/chat`, {
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

    const data = (await gatewayResp.json()) as { response: string };

    return c.json({
      success: true,
      response: formatForGlasses(data.response),
    });
  } catch (err) {
    console.error('[Mentra] Webhook query failed:', err);
    return c.json(
      { error: 'Failed to process request', details: err instanceof Error ? err.message : 'Unknown error' },
      502,
    );
  }
});
