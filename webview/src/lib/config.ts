/**
 * Configuration reader for gateway and relay connections.
 *
 * In production, everything goes through the same origin (webview.aebots.org)
 * via Cloudflare Tunnel path rules to avoid CORS:
 *   /api/*   -> localhost:18789 (OpenClaw gateway)
 *   /relay/* -> localhost:3210  (Bridge relay WS)
 *   /*       -> localhost:3200  (Webview static)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AppConfig {
  /** Health check URL for the gateway */
  healthUrl: string;
  /** WebSocket URL for the bridge relay */
  relayUrl: string;
  /** Gateway bearer token */
  gatewayToken: string | null;
  /** REST URL for POST /v1/chat/completions */
  chatCompletionsUrl: string;
}

// ---------------------------------------------------------------------------
// Defaults (local dev)
// ---------------------------------------------------------------------------

const LOCAL_HEALTH = 'http://localhost:18789/health';
const LOCAL_RELAY = 'ws://localhost:3210';
const LOCAL_CHAT_API = 'http://localhost:18789/v1/chat/completions';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseHashParams(): Record<string, string> {
  const hash = window.location.hash;
  const params: Record<string, string> = {};
  const qIdx = hash.indexOf('?');
  const fragment = qIdx >= 0 ? hash.slice(qIdx + 1) : '';
  if (!fragment) {
    const eqIdx = hash.indexOf('=');
    if (eqIdx > 0 && !hash.includes('/')) {
      for (const pair of hash.slice(1).split('&')) {
        const [k, v] = pair.split('=');
        if (k && v) params[k] = decodeURIComponent(v);
      }
    }
    return params;
  }
  for (const pair of fragment.split('&')) {
    const [k, v] = pair.split('=');
    if (k && v) params[k] = decodeURIComponent(v);
  }
  return params;
}

function isProduction(): boolean {
  return window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

let _config: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (_config) return _config;

  const urlParams = new URLSearchParams(window.location.search);
  const hashParams = parseHashParams();
  const prod = isProduction();
  const origin = window.location.origin; // e.g. https://webview.aebots.org

  // Same-origin in production via CF tunnel path rules (no prefix stripping)
  const healthUrl = prod ? `${origin}/health` : LOCAL_HEALTH;
  const chatCompletionsUrl = urlParams.get('chat_api') || hashParams['chat_api'] ||
    import.meta.env.VITE_CHAT_API_URL ||
    (prod ? `${origin}/v1/chat/completions` : LOCAL_CHAT_API);

  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const relayUrl = urlParams.get('relay_url') || hashParams['relay_url'] ||
    import.meta.env.VITE_RELAY_URL ||
    (prod ? `${wsProtocol}//${window.location.host}/relay/` : LOCAL_RELAY);

  const gatewayToken = hashParams['token'] || urlParams.get('token') ||
    import.meta.env.VITE_GATEWAY_TOKEN || null;

  _config = { healthUrl, relayUrl, gatewayToken, chatCompletionsUrl };
  return _config;
}

export function resetConfig(): void {
  _config = null;
}
