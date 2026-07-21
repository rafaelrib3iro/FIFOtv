const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { createVisualServer, resolvePort } = require('../scripts/visual-server');

function request(port, pathname, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: pathname, method }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => resolve({ body, headers: response.headers, statusCode: response.statusCode }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('resolves a valid visual server port', () => {
  assert.equal(resolvePort(undefined), 4173);
  assert.equal(resolvePort('3000'), 3000);
  assert.throws(() => resolvePort('0'), RangeError);
  assert.throws(() => resolvePort('invalid'), RangeError);
});

test('keeps a browser implementation for every home preload method', () => {
  const root = path.join(__dirname, '..');
  const preload = fs.readFileSync(path.join(root, 'electron', 'preload.js'), 'utf8');
  const bridge = fs.readFileSync(path.join(root, 'frontend', 'visual-bridge.js'), 'utf8');
  const methods = [...preload.matchAll(/^\s{2}([A-Za-z]\w*):/gm)].map((match) => match[1]);

  for (const method of methods) {
    assert.match(bridge, new RegExp(`\\b${method}:`), `missing visual implementation for ${method}`);
  }
});

test('serves only the visual home and read-only catalog', async () => {
  const server = createVisualServer(path.join(__dirname, '..'));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  try {
    const root = await request(port, '/');
    const home = await request(port, '/frontend/');
    const catalog = await request(port, '/backend/apps.json');
    const privateFile = await request(port, '/package.json');
    const head = await request(port, '/frontend/style.css', 'HEAD');

    assert.equal(root.statusCode, 302);
    assert.equal(root.headers.location, '/frontend/');
    assert.equal(home.statusCode, 200);
    assert.match(home.body, /visual-bridge\.js/);
    assert.equal(catalog.statusCode, 200);
    assert.ok(Array.isArray(JSON.parse(catalog.body).apps));
    assert.equal(privateFile.statusCode, 404);
    assert.equal(head.statusCode, 200);
    assert.equal(head.body, '');
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
