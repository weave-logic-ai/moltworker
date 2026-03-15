import { Hono } from 'hono';
import { getContainer } from '@cloudflare/containers';
import type { AppEnv } from '../types';
import { formatForGlasses } from '../mentra/display-format';
import { MOLTBOT_PORT } from '../config';
import { ensureMoltbotGateway } from '../gateway';

const VERSION = '1.0.0';
const MENTRA_BRIDGE_PORT = 7010;

export const mentraRoutes = new Hono<AppEnv>();

/**
 * GET /logs — Read bridge container logs
 */
mentraRoutes.get('/logs', async (c) => {
  try {
    const bridgeStub = c.env.MentraBridge.get(c.env.MentraBridge.idFromName('mentra-bridge'));
    const resp = await bridgeStub.fetch(new Request('http://mentra-bridge/logs'));
    const text = await resp.text();
    return c.text(text);
  } catch (err) {
    return c.json({ error: 'Cannot read bridge logs', details: err instanceof Error ? err.message : '' }, 502);
  }
});

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
 * GET /webview — Phone companion app webview
 */
mentraRoutes.get('/webview', (c) => {
  return c.html(`<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Clawdflare Bridge</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #0f0f1a; color: #e0e0e0; padding: 16px; min-height: 100vh; }
  h1 { color: #e94560; font-size: 1.3em; margin-bottom: 12px; text-align: center; }
  .card { background: #1a1a2e; border-radius: 12px; padding: 14px; margin: 10px 0; border-left: 3px solid #0f3460; }
  .card h2 { color: #e94560; font-size: 1em; margin-bottom: 6px; }
  .card p { line-height: 1.5; color: #b0b0b0; font-size: 0.9em; }
  .status { display: flex; justify-content: space-between; align-items: center; }
  .badge { background: #16213e; padding: 4px 12px; border-radius: 20px; font-size: 0.8em; color: #4ecca3; }
  .chat { background: #16213e; border-radius: 12px; padding: 14px; margin: 10px 0; }
  .chat-log { max-height: 300px; overflow-y: auto; margin-bottom: 10px; }
  .msg { padding: 8px 12px; margin: 6px 0; border-radius: 8px; font-size: 0.9em; }
  .msg-user { background: #0f3460; text-align: right; }
  .msg-ai { background: #1a3a2e; border-left: 2px solid #4ecca3; }
  .msg-system { color: #666; font-style: italic; text-align: center; font-size: 0.8em; }
  .cmd { background: #16213e; padding: 6px 10px; border-radius: 8px; margin: 4px 0; font-family: monospace; font-size: 0.85em; color: #4ecca3; }
  #refreshBtn { background: #0f3460; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; width: 100%; margin-top: 8px; font-size: 0.9em; cursor: pointer; }
</style>
</head><body>
<h1>Clawdflare Bridge</h1>
<div class="card">
  <div class="status"><h2>AI Assistant</h2><span class="badge">Active</span></div>
  <p>Speak to your glasses — AI responds via audio.</p>
</div>
<div class="chat">
  <h2 style="color:#e94560;font-size:1em;margin-bottom:8px;">Conversation</h2>
  <div class="chat-log" id="chatLog">
    <div class="msg msg-system">Speak to your glasses to start a conversation. Responses will appear here and be spoken aloud.</div>
  </div>
  <button id="refreshBtn" onclick="location.reload()">Refresh</button>
</div>
<div class="card">
  <h2>Controls</h2>
  <div class="cmd">Speak → AI responds via audio</div>
  <div class="cmd">Short press → Listen mode</div>
  <div class="cmd">Long press → Capture photo + Analyze</div>
</div>
<div class="card">
  <h2>Your Glasses</h2>
  <p>No display — all AI responses are spoken through the glasses speaker. This webview shows conversation history and detailed results.</p>
</div>
</body></html>`);
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
    // Route to MentraBridge container (separate from Sandbox)
    const bridgeStub = c.env.MentraBridge.get(c.env.MentraBridge.idFromName('mentra-bridge'));
    const bridgeResp = await bridgeStub.fetch(
      new Request(`http://mentra-bridge/webhook`, {
        method: 'POST',
        headers: c.req.raw.headers,
        body: c.req.raw.body,
      }),
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
    const url = new URL(c.req.url);
    const path = url.pathname.replace('/mentra', '') || '/';

    const bridgeStub = c.env.MentraBridge.get(c.env.MentraBridge.idFromName('mentra-bridge'));
    const bridgeResp = await bridgeStub.fetch(
      new Request(`http://mentra-bridge${path}${url.search}`, {
        method: c.req.method,
        headers: c.req.raw.headers,
        body: c.req.method !== 'GET' && c.req.method !== 'HEAD' ? c.req.raw.body : undefined,
      }),
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
