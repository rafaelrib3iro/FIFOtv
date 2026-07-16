const test = require('node:test');
const assert = require('node:assert/strict');
const spatialConfig = require('../electron/views/spatial-navigation/config');
const scriptConfig = require('../electron/views/streaming-customizations/config');
const { resolveCustomScript } = require('../electron/provider-resolution');

test('maps persisted Disney+ and Max slugs to spatial navigation settings', () => {
  assert.deepEqual(spatialConfig.disneyplus, { enabled: true });
  assert.deepEqual(spatialConfig.hbomax, { enabled: true });
});

test('preserves Prime Video and YouTube without provider scripts', () => {
  assert.equal(resolveCustomScript(scriptConfig, 'https://www.primevideo.com').scriptFile, null);
  assert.equal(resolveCustomScript(scriptConfig, 'https://www.youtube.com/tv').scriptFile, null);
});

test('selects redirected Max and Disney+ customization hosts', () => {
  assert.equal(resolveCustomScript(scriptConfig, 'https://play.max.com/br').scriptFile, 'max.js');
  assert.equal(resolveCustomScript(scriptConfig, 'https://www.disneyplus.com/pt-br').scriptFile, 'disney.js');
});
