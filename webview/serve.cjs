#!/usr/bin/env node
/**
 * Static file server + reverse proxy for the webview.
 *
 * Routes:
 *   /v1/*     -> OpenClaw gateway (localhost:18789)
 *   /health   -> OpenClaw gateway (localhost:18789)
 *   /relay/*  -> Bridge relay WS  (localhost:3210)
 *   /*        -> Static files from dist/
 *
 * This avoids CORS by serving everything from the same origin.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { createProxyServer } = require('http-proxy');

const PORT = parseInt(process.env.WEBVIEW_PORT || '3200', 10);
const GATEWAY_TARGET = process.env.GATEWAY_URL || 'http://localhost:18789';
const RELAY_TARGET = process.env.RELAY_URL || 'http://localhost:3210';
const BRIDGE_TARGET = process.env.BRIDGE_URL || 'http://localhost:7010';
const DIST = path.join(__dirname, 'dist');

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff',
};

const gatewayProxy = createProxyServer({ target: GATEWAY_TARGET });
const relayProxy = createProxyServer({ target: RELAY_TARGET, ws: true });
const bridgeProxy = createProxyServer({ target: BRIDGE_TARGET });
gatewayProxy.on('error', (err) => console.error('[proxy:gateway]', err.message));
relayProxy.on('error', (err) => console.error('[proxy:relay]', err.message));

const server = http.createServer((req, res) => {
  const url = req.url || '/';

  // Proxy /control/* to bridge (mic/audio/ptt controls)
  if (url.startsWith('/control')) {
    bridgeProxy.web(req, res);
    return;
  }

  // Proxy /v1/* and /health to OpenClaw gateway
  if (url.startsWith('/v1/') || url.startsWith('/v1') || url === '/health') {
    gatewayProxy.web(req, res);
    return;
  }

  // Proxy /relay/* to bridge relay (strip /relay prefix)
  if (url.startsWith('/relay')) {
    req.url = url.replace('/relay', '') || '/';
    relayProxy.web(req, res);
    return;
  }

  // Serve static files
  let filePath = path.join(DIST, url === '/' ? 'index.html' : url);
  if (!fs.existsSync(filePath)) filePath = path.join(DIST, 'index.html');

  const ext = path.extname(filePath);
  const contentType = MIME[ext] || 'application/octet-stream';

  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// WebSocket upgrades for /relay/
server.on('upgrade', (req, socket, head) => {
  if (req.url?.startsWith('/relay')) {
    req.url = req.url.replace('/relay', '') || '/';
    relayProxy.ws(req, socket, head);
  } else {
    socket.destroy();
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[webview] http://0.0.0.0:${PORT}`);
  console.log(`[webview]   /v1/*, /health -> ${GATEWAY_TARGET}`);
  console.log(`[webview]   /relay/*       -> ${RELAY_TARGET}`);
  console.log(`[webview]   /*             -> ${DIST}`);
});
