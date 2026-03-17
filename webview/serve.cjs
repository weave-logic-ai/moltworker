#!/usr/bin/env node
/**
 * Static file server for the webview build output.
 * Also proxies /relay/ WebSocket and HTTP requests to the relay server on port 3210.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { createProxyServer } = require('http-proxy');

const PORT = parseInt(process.env.WEBVIEW_PORT || '3200', 10);
const RELAY_TARGET = process.env.RELAY_URL || 'http://localhost:3210';
const DIST = path.join(__dirname, 'dist');

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

// Proxy for /relay/ paths
const proxy = createProxyServer({ target: RELAY_TARGET, ws: true });
proxy.on('error', (err) => console.error('[proxy]', err.message));

const server = http.createServer((req, res) => {
  // Proxy /relay/ HTTP requests
  if (req.url?.startsWith('/relay/')) {
    req.url = req.url.replace('/relay', '');
    proxy.web(req, res);
    return;
  }

  // Serve static files from dist/
  let filePath = path.join(DIST, req.url === '/' ? 'index.html' : req.url);
  if (!fs.existsSync(filePath)) filePath = path.join(DIST, 'index.html'); // SPA fallback

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

// Proxy WebSocket upgrades for /relay/
server.on('upgrade', (req, socket, head) => {
  if (req.url?.startsWith('/relay')) {
    req.url = req.url.replace('/relay', '') || '/';
    proxy.ws(req, socket, head);
  } else {
    socket.destroy();
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[webview] Serving ${DIST} on http://0.0.0.0:${PORT}`);
  console.log(`[webview] Proxying /relay/ -> ${RELAY_TARGET}`);
});
