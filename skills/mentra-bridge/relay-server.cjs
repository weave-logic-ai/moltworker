#!/usr/bin/env node
/**
 * WebSocket Relay Server for Mentra Bridge webview.
 *
 * Runs on port 3210 and broadcasts real-time events from the bridge to any
 * connected WebSocket client (the webview at port 3200).
 *
 * Also provides a REST endpoint: GET /api/status
 *
 * Usage:
 *   - As standalone: node relay-server.cjs
 *   - As module: require('./relay-server.cjs').createRelay({ sessionStates })
 *
 * Events broadcast:
 *   session, transcription, photo, button, agent-response, tts, battery,
 *   status, error
 */

const http = require('node:http');
const WebSocket = require('ws');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const RELAY_PORT = parseInt(process.env.RELAY_PORT || '3210', 10);

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** @type {WebSocket.Server | null} */
let wss = null;

/** @type {http.Server | null} */
let httpServer = null;

/** @type {Map<string, object> | null} Reference to bridge's sessionStates */
let bridgeSessionStates = null;

/** Service health tracking */
const serviceHealth = {
  bridge: { healthy: false, lastSeen: 0 },
  openclaw: { healthy: false, lastSeen: 0 },
  glasses: { healthy: false, lastSeen: 0 },
};

/** Recent events buffer (last 50 for late-joining clients) */
const recentEvents = [];
const MAX_RECENT = 50;

// ---------------------------------------------------------------------------
// Broadcast to all connected WebSocket clients
// ---------------------------------------------------------------------------

function broadcast(data) {
  if (!wss) return;
  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      try { client.send(payload); } catch (_e) { /* client gone */ }
    }
  }
}

// ---------------------------------------------------------------------------
// Public API: emitToRelay (called by mentra-bridge.cjs)
// ---------------------------------------------------------------------------

/**
 * Emit an event to all connected WebSocket clients.
 * Also updates internal state tracking.
 *
 * @param {object} event - Event object with at minimum a `type` field
 */
function emitToRelay(event) {
  if (!event || !event.type) return;

  // Add server timestamp
  const stamped = { ...event, ts: Date.now() };

  // Track service health from status events
  if (event.type === 'status' && event.service) {
    serviceHealth[event.service] = {
      healthy: !!event.healthy,
      lastSeen: Date.now(),
    };
  }

  // Track glasses connectivity from session events
  if (event.type === 'session') {
    if (event.event === 'connected') {
      serviceHealth.glasses = { healthy: true, lastSeen: Date.now() };
    } else if (event.event === 'disconnected') {
      serviceHealth.glasses = { healthy: false, lastSeen: Date.now() };
    }
  }

  // Buffer recent events
  recentEvents.push(stamped);
  if (recentEvents.length > MAX_RECENT) {
    recentEvents.shift();
  }

  broadcast(stamped);
}

// ---------------------------------------------------------------------------
// REST endpoint: GET /api/status
// ---------------------------------------------------------------------------

function buildStatusResponse() {
  const sessions = [];
  if (bridgeSessionStates) {
    for (const [sid, state] of bridgeSessionStates.entries()) {
      sessions.push({
        sessionId: sid,
        userId: state.userId,
        messageCount: state.messageCount,
        lastActivity: state.lastActivity,
        isProcessing: state.isProcessing,
        isSpeaking: state.isSpeaking,
        historyLength: state.history ? state.history.length : 0,
      });
    }
  }

  return {
    relay: {
      port: RELAY_PORT,
      clients: wss ? wss.clients.size : 0,
      uptime: process.uptime(),
    },
    sessions,
    services: serviceHealth,
    recentEventCount: recentEvents.length,
  };
}

function handleRequest(req, res) {
  // CORS headers for localhost webview
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/api/status') {
    const status = buildStatusResponse();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(status, null, 2));
    return;
  }

  if (req.method === 'GET' && req.url === '/api/recent') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(recentEvents));
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, ts: Date.now() }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
}

// ---------------------------------------------------------------------------
// Create and start relay
// ---------------------------------------------------------------------------

/**
 * Create the relay server.
 *
 * @param {object} opts
 * @param {Map<string, object>} [opts.sessionStates] - Reference to bridge session states map
 * @returns {{ httpServer: http.Server, wss: WebSocket.Server }}
 */
function createRelay(opts = {}) {
  if (wss) {
    console.log('[relay] Already running');
    return { httpServer, wss };
  }

  if (opts.sessionStates) {
    bridgeSessionStates = opts.sessionStates;
  }

  httpServer = http.createServer(handleRequest);

  wss = new WebSocket.Server({ server: httpServer });

  wss.on('connection', (ws, req) => {
    const addr = req.socket.remoteAddress || 'unknown';
    console.log(`[relay] Client connected from ${addr} (total: ${wss.clients.size})`);

    // Send recent events to the new client so it catches up
    for (const evt of recentEvents) {
      try { ws.send(JSON.stringify(evt)); } catch (_e) { break; }
    }

    // Send current status snapshot
    try {
      ws.send(JSON.stringify({
        type: 'snapshot',
        ts: Date.now(),
        ...buildStatusResponse(),
      }));
    } catch (_e) { /* client gone */ }

    ws.on('close', () => {
      console.log(`[relay] Client disconnected (remaining: ${wss.clients.size})`);
    });

    ws.on('error', (err) => {
      console.error('[relay] Client error:', err.message);
    });

    // Clients can send ping/pong or request status
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
        } else if (msg.type === 'status') {
          ws.send(JSON.stringify({
            type: 'snapshot',
            ts: Date.now(),
            ...buildStatusResponse(),
          }));
        }
      } catch (_e) { /* ignore malformed */ }
    });
  });

  httpServer.listen(RELAY_PORT, () => {
    console.log(`[relay] WebSocket relay listening on port ${RELAY_PORT}`);
    console.log(`[relay] REST status: http://localhost:${RELAY_PORT}/api/status`);
  });

  // Mark bridge as healthy since relay was created from the bridge
  serviceHealth.bridge = { healthy: true, lastSeen: Date.now() };

  return { httpServer, wss };
}

// ---------------------------------------------------------------------------
// Standalone mode
// ---------------------------------------------------------------------------

if (require.main === module) {
  console.log('[relay] Starting in standalone mode...');
  createRelay();
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  createRelay,
  emitToRelay,
  broadcast,
};
