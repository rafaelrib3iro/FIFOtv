const test = require('node:test');
const assert = require('node:assert/strict');
const { redactStreamingUrl, runInjectionStages } = require('../electron/streaming-injection');

test('redacts query, fragment and credentials from injection logs', () => {
  assert.equal(
    redactStreamingUrl('https://token:secret@play.max.com/watch?id=123#player'),
    'https://play.max.com/watch'
  );
  assert.equal(redactStreamingUrl('not a url'), '[invalid URL]');
});

test('executes injection stages sequentially and stops at a failed stage', async () => {
  const executed = [];
  const failures = [];
  const webContents = {
    async executeJavaScript(code) {
      executed.push(code);
      if (code === 'shared') throw new Error('shared failed');
    },
  };

  const result = await runInjectionStages({
    webContents,
    stages: [
      { name: 'polyfill', code: 'polyfill' },
      { name: 'shared', code: 'shared' },
      { name: 'slug', code: 'slug' },
    ],
    isCurrent: () => true,
    onStageError: (name, error) => failures.push([name, error.message]),
  });

  assert.deepEqual(executed, ['polyfill', 'shared']);
  assert.deepEqual(failures, [['shared', 'shared failed']]);
  assert.deepEqual(result, { ok: false, stage: 'shared' });
});

test('does not inject into a stale streaming generation', async () => {
  let called = false;
  const result = await runInjectionStages({
    webContents: { executeJavaScript: async () => { called = true; } },
    stages: [{ name: 'polyfill', code: 'polyfill' }],
    isCurrent: () => false,
    onStageError: () => {},
  });

  assert.equal(called, false);
  assert.deepEqual(result, { ok: false, stale: true });
});
