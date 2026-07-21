const test = require('node:test');
const assert = require('node:assert/strict');
const { isAppCatalog, isApp, isAppUrl, isMacAddress } = require('../electron/ipc-validation');

const app = { id: 1, name: 'TV "Sala" <teste>', slug: 'tv-sala', type: 'web', url: 'example.com/watch' };

test('accepts valid app URLs with and without protocol', () => {
  assert.equal(isAppUrl('https://example.com/watch'), true);
  assert.equal(isAppUrl('example.com/watch'), true);
  assert.equal(isAppUrl('javascript:alert(1)'), false);
});

test('accepts a valid web app and rejects malformed fields or runtimes', () => {
  assert.equal(isApp(app), true);
  assert.equal(isApp({ ...app, id: '1' }), false);
  assert.equal(isApp({ ...app, slug: 'tv sala' }), false);
  assert.equal(isApp({ ...app, type: 'webos' }), false);
  assert.equal(isApp({ ...app, url: 'ftp://example.com' }), false);
});

test('accepts unique catalog IDs and rejects duplicates', () => {
  assert.equal(isAppCatalog({ apps: [app, { ...app, id: 2 }] }), true);
  assert.equal(isAppCatalog({ apps: [app, app] }), false);
  assert.equal(isAppCatalog({ apps: 'invalid' }), false);
});

test('accepts standard Bluetooth MAC addresses only', () => {
  assert.equal(isMacAddress('01:23:45:67:89:ab'), true);
  assert.equal(isMacAddress('01:23:45:67:89'), false);
  assert.equal(isMacAddress('01:23:45:67:89:zz'), false);
});
