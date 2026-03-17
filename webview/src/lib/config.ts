/**
 * Configuration reader for gateway and relay connections.
 *
 * Reads from URL params, URL hash fragment, or falls back to defaults.
 * No external dependencies.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AppConfig {
  gatewayUrl: string;
  relayUrl: string;
  gatewayToken: string | null;
  chatCompletionsUrl: string;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_GATEWAY_WS = 'ws://localhost:18789';
const DEFAULT_RELAY_WS = 'ws://localhost:3210';
const DEFAULT_CHAT_API = 'https://moltworker.aebots.org/v1/chat/completions';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract key=value pairs from the URL hash fragment after the path. */
function parseHashParams(): Record<string, string> {
  const hash = window.location.hash;
  const params: Record<string, string> = {};
  // Hash format: #/path?key=val&key=val  or  #token=val
  const qIdx = hash.indexOf('?');
  const fragment = qIdx >= 0 ? hash.slice(qIdx + 1) : '';
  if (!fragment) {
    // Also check for #token=... format (no path)
    const eqIdx = hash.indexOf('=');
    if (eqIdx > 0 && !hash.includes('/')) {
      const pairs = hash.slice(1).split('&');
      for (const pair of pairs) {
        const [k, v] = pair.split('=');
        if (k && v) params[k] = decodeURIComponent(v);
      }
    }
    return params;
  }
  const pairs = fragment.split('&');
  for (const pair of pairs) {
    const [k, v] = pair.split('=');
    if (k && v) params[k] = decodeURIComponent(v);
  }
  return params;
}

/** Derive a WebSocket URL from the current page origin. */
function deriveGatewayFromOrigin(): string {
  const loc = window.location;
  const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${loc.host}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

let _config: AppConfig | null = null;

/** Read and cache configuration. Safe to call multiple times. */
export function getConfig(): AppConfig {
  if (_config) return _config;

  const urlParams = new URLSearchParams(window.location.search);
  const hashParams = parseHashParams();

  // Gateway URL: URL param > env > derive from origin > default
  const gatewayUrl =
    urlParams.get('gateway_url') ||
    hashParams['gateway_url'] ||
    import.meta.env.VITE_GATEWAY_URL ||
    (window.location.hostname !== 'localhost'
      ? deriveGatewayFromOrigin()
      : DEFAULT_GATEWAY_WS);

  // Relay URL: URL param > env > default
  const relayUrl =
    urlParams.get('relay_url') ||
    hashParams['relay_url'] ||
    import.meta.env.VITE_RELAY_URL ||
    DEFAULT_RELAY_WS;

  // Gateway token: hash param > URL param > env
  const gatewayToken =
    hashParams['token'] ||
    urlParams.get('token') ||
    import.meta.env.VITE_GATEWAY_TOKEN ||
    null;

  // Chat completions API
  const chatCompletionsUrl =
    urlParams.get('chat_api') ||
    hashParams['chat_api'] ||
    import.meta.env.VITE_CHAT_API_URL ||
    DEFAULT_CHAT_API;

  _config = { gatewayUrl, relayUrl, gatewayToken, chatCompletionsUrl };
  return _config;
}

/** Reset cached config (useful for testing). */
export function resetConfig(): void {
  _config = null;
}
