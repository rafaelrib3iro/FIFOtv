const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

function resolvePort(value) {
  const port = Number(value || 4173);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new RangeError('FIFOTV_VISUAL_PORT must be an integer between 1 and 65535');
  }
  return port;
}

function sendFile(request, response, filePath) {
  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) {
      response.writeHead(404, { 'Cache-Control': 'no-store' });
      response.end('Not found');
      return;
    }

    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
    });
    if (request.method === 'HEAD') {
      response.end();
      return;
    }
    fs.createReadStream(filePath).pipe(response);
  });
}

function createVisualServer(projectRoot) {
  const frontendRoot = path.join(projectRoot, 'frontend');
  const catalogPath = path.join(projectRoot, 'backend', 'streamings.json');

  return http.createServer((request, response) => {
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' });
      response.end();
      return;
    }

    let pathname;
    try {
      pathname = new URL(request.url, 'http://127.0.0.1').pathname;
    } catch {
      response.writeHead(400, { 'Cache-Control': 'no-store' });
      response.end('Bad request');
      return;
    }

    if (pathname === '/') {
      response.writeHead(302, { Location: '/frontend/', 'Cache-Control': 'no-store' });
      response.end();
      return;
    }

    if (pathname === '/backend/streamings.json') {
      sendFile(request, response, catalogPath);
      return;
    }

    if (!pathname.startsWith('/frontend/')) {
      response.writeHead(404, { 'Cache-Control': 'no-store' });
      response.end('Not found');
      return;
    }

    let relativePath;
    try {
      relativePath = decodeURIComponent(pathname.slice('/frontend/'.length)) || 'index.html';
    } catch {
      response.writeHead(400, { 'Cache-Control': 'no-store' });
      response.end('Bad request');
      return;
    }

    const filePath = path.resolve(frontendRoot, relativePath);
    if (filePath !== frontendRoot && !filePath.startsWith(`${frontendRoot}${path.sep}`)) {
      response.writeHead(403, { 'Cache-Control': 'no-store' });
      response.end('Forbidden');
      return;
    }

    sendFile(request, response, filePath);
  });
}

function start() {
  const server = createVisualServer(path.join(__dirname, '..'));
  const port = resolvePort(process.env.FIFOTV_VISUAL_PORT);
  server.on('error', (error) => {
    console.error(`[FIFOtv visual] ${error.message}`);
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(`[FIFOtv visual] http://127.0.0.1:${port}/frontend/`);
  });
}

if (require.main === module) start();

module.exports = { createVisualServer, resolvePort };
