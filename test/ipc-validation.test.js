const test = require('node:test');
const assert = require('node:assert/strict');
const { isCatalog, isMacAddress, isStreaming, isStreamingUrl } = require('../electron/ipc-validation');

const streaming = { id: 1, name: 'TV "Sala" <teste>', slug: 'tv-sala', url: 'example.com/watch' };

test('accepts valid streaming URLs with and without protocol', () => {
  assert.equal(isStreamingUrl('https://example.com/watch'), true);
  assert.equal(isStreamingUrl('example.com/watch'), true);
  assert.equal(isStreamingUrl('javascript:alert(1)'), false);
});

test('accepts a valid streaming and rejects malformed fields', () => {
  assert.equal(isStreaming(streaming), true);
  assert.equal(isStreaming({ ...streaming, id: '1' }), false);
  assert.equal(isStreaming({ ...streaming, slug: 'tv sala' }), false);
  assert.equal(isStreaming({ ...streaming, url: 'ftp://example.com' }), false);
});

test('accepts unique catalog IDs and rejects duplicates', () => {
  assert.equal(isCatalog({ streamings: [streaming, { ...streaming, id: 2 }] }), true);
  assert.equal(isCatalog({ streamings: [streaming, streaming] }), false);
  assert.equal(isCatalog({ streamings: 'invalid' }), false);
});

test('accepts standard Bluetooth MAC addresses only', () => {
  assert.equal(isMacAddress('01:23:45:67:89:ab'), true);
  assert.equal(isMacAddress('01:23:45:67:89'), false);
  assert.equal(isMacAddress('01:23:45:67:89:zz'), false);
});
