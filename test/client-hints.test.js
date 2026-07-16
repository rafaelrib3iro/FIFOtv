const test = require('node:test');
const assert = require('node:assert/strict');
const { createClientHintsRegistry } = require('../electron/client-hints');

test('scopes Client Hints to registered streaming web contents', () => {
  let handler;
  let installations = 0;
  const session = {
    webRequest: {
      onBeforeSendHeaders(_filter, listener) {
        installations += 1;
        handler = listener;
      },
    },
  };
  const registry = createClientHintsRegistry();
  const removeFirst = registry.register(session, 10, { 'Sec-CH-UA-Platform': '"Tizen"' });
  const removeSecond = registry.register(session, 11, { 'Sec-CH-UA-Mobile': '?0' });
  const responses = [];

  handler({ webContentsId: 99, requestHeaders: { Accept: '*/*' } }, (response) => responses.push(response));
  handler({ webContentsId: 10, requestHeaders: { Accept: '*/*' } }, (response) => responses.push(response));
  removeFirst();
  handler({ webContentsId: 10, requestHeaders: { Accept: '*/*' } }, (response) => responses.push(response));
  handler({ webContentsId: 11, requestHeaders: { Accept: '*/*' } }, (response) => responses.push(response));
  removeSecond();

  assert.equal(installations, 1);
  assert.deepEqual(responses, [
    { requestHeaders: { Accept: '*/*' } },
    { requestHeaders: { Accept: '*/*', 'Sec-CH-UA-Platform': '"Tizen"' } },
    { requestHeaders: { Accept: '*/*' } },
    { requestHeaders: { Accept: '*/*', 'Sec-CH-UA-Mobile': '?0' } },
  ]);
});
