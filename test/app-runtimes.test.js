const test = require('node:test');
const assert = require('node:assert/strict');
const { createAppRuntimeRegistry } = require('../electron/app-runtimes');
const { normalizeUrl } = require('../electron/web-runtime');

test('resolves the web runtime session factory without exposing future runtimes', () => {
  const registry = createAppRuntimeRegistry({ rootDir: __dirname });
  assert.equal(registry.resolve({ type: 'web' }).type, 'web');
  assert.throws(() => registry.resolve({ type: 'webos' }), /Unsupported app runtime/);
});

test('normalizes web app URLs without treating lookalike hosts as YouTube', () => {
  assert.equal(normalizeUrl('youtube.com/watch?v=x'), 'https://www.youtube.com/tv');
  assert.equal(normalizeUrl('https://www.youtube.com.example/watch'), 'https://www.youtube.com.example/watch');
});
