/**
 * Local dev server — mirrors Vercel's serverless function + static file behavior.
 * Loads .env.local, serves /api/roadmap (GET + PATCH), and serves HTML files.
 *
 * Usage:  node server.js
 * Port:   3001  (set PORT env var to override)
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');

// ── Load .env.local ──────────────────────────────────────────
const envFile = path.join(__dirname, '.env.local');
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, 'utf8').split('\n').forEach(line => {
    const eq = line.indexOf('=');
    if (eq > 0) {
      const key = line.slice(0, eq).trim();
      const val = line.slice(eq + 1).trim();
      if (key) process.env[key] = val;
    }
  });
  console.log('[env] Loaded .env.local');
}

const roadmapHandler = require('./api/roadmap');
const PORT = process.env.PORT || 3001;
const ROOT = __dirname;

// ── Static file helper ───────────────────────────────────────
function serveFile(res, filePath) {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('Not found');
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(fs.readFileSync(filePath));
}

// ── Server ───────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  // API route
  if (url === '/api/roadmap') {
    return roadmapHandler(req, res);
  }

  // Root → dashboard
  if (url === '/') {
    return serveFile(res, path.join(ROOT, 'ai-builder-dashboard.html'));
  }

  // Other HTML files
  const filePath = path.join(ROOT, url.replace(/^\//, ''));
  if (filePath.endsWith('.html') && fs.existsSync(filePath)) {
    return serveFile(res, filePath);
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n  🚀  Dev server ready at http://localhost:${PORT}\n`);
  console.log(`  GET  http://localhost:${PORT}/`);
  console.log(`  GET  http://localhost:${PORT}/api/roadmap`);
  console.log(`  PATCH http://localhost:${PORT}/api/roadmap\n`);
});
