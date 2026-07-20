const test = require('node:test');
const assert = require('node:assert/strict');
const { createNetworkErrorRegistry, redactUrl } = require('../electron/runtime-logging');
const { resolveLogFile, resolveRuntimeProfile, supportsBluez, supportsPowerActions } = require('../electron/runtime-profile');

test('resolves the explicit macOS runtime profile and keeps Linux as fallback', () => {
  assert.equal(resolveRuntimeProfile('macos'), 'macos');
  assert.equal(resolveRuntimeProfile(undefined), 'linux');
  assert.equal(resolveRuntimeProfile('linux'), 'linux');
  assert.equal(resolveRuntimeProfile('MACOS'), 'linux');
});

test('uses a project-local log file only for the macOS profile', () => {
  const projectRoot = '/tmp/fifotv';
  const configuredFile = '/var/log/fifotv/main.log';

  assert.equal(resolveLogFile(configuredFile, 'macos', projectRoot), '/tmp/fifotv/.runtime-logs/main.log');
  assert.equal(resolveLogFile(configuredFile, 'linux', projectRoot), configuredFile);
});

test('allows BlueZ only on Linux', () => {
  assert.equal(supportsBluez('linux'), true);
  assert.equal(supportsBluez('darwin'), false);
  assert.equal(supportsBluez('win32'), false);
});

test('allows machine power actions only in the Linux runtime profile', () => {
  assert.equal(supportsPowerActions('linux'), true);
  assert.equal(supportsPowerActions('macos'), false);
});

test('redacts credentials, query and fragment from logged URLs', () => {
  assert.equal(
    redactUrl('https://user:secret@example.com/watch/item?token=secret#episode'),
    'https://example.com/watch/item'
  );
  assert.equal(redactUrl('not a URL'), '[invalid URL]');
});

test('attributes network errors through one listener per session', () => {
  let listener;
  let installations = 0;
  const reports = [];
  const electronSession = {
    webRequest: {
      onErrorOccurred(callback) {
        installations += 1;
        listener = callback;
      },
    },
  };
  const registry = createNetworkErrorRegistry((report) => reports.push(report));
  const removeHome = registry.register(electronSession, 10, 'home');
  registry.register(electronSession, 20, 'streaming:youtube');

  listener({ webContentsId: 10, method: 'GET', url: 'https://example.com/a?token=1#x', error: 'net::ERR_FAILED' });
  listener({ webContentsId: 20, method: 'POST', url: 'https://example.com/b?q=2', error: 'net::ERR_TIMED_OUT' });
  listener({ webContentsId: 30, method: 'GET', url: 'https://example.com/c', error: 'net::ERR_NAME_NOT_RESOLVED' });
  listener({ webContentsId: 20, method: 'GET', url: 'https://example.com/ignored', error: 'net::ERR_ABORTED' });
  removeHome();
  listener({ webContentsId: 10, method: 'GET', url: 'https://example.com/d', error: 'net::ERR_FAILED' });

  assert.equal(installations, 1);
  assert.deepEqual(reports.map(({ label, url }) => ({ label, url })), [
    { label: 'home', url: 'https://example.com/a' },
    { label: 'streaming:youtube', url: 'https://example.com/b' },
    { label: 'webContents:30', url: 'https://example.com/c' },
    { label: 'webContents:10', url: 'https://example.com/d' },
  ]);
});
