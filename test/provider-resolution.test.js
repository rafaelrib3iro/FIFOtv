const test = require('node:test');
const assert = require('node:assert/strict');
const { hostnameFromUrl, matchesHostname, resolveCustomScript } = require('../electron/provider-resolution');

test('resolves exact hostnames and valid subdomains only', () => {
  assert.equal(hostnameFromUrl('https://play.max.com/home?target=netflix.com'), 'play.max.com');
  assert.equal(matchesHostname('play.max.com', 'max.com'), true);
  assert.equal(matchesHostname('notmax.com', 'max.com'), false);
  assert.equal(matchesHostname('example.com', 'max.com'), false);
});

test('does not select a provider from a query string or lookalike hostname', () => {
  const config = { 'netflix.com': 'netflix.js', 'play.max.com': 'max.js' };
  assert.equal(resolveCustomScript(config, 'https://example.com/?next=netflix.com'), null);
  assert.equal(resolveCustomScript(config, 'https://notnetflix.com'), null);
});

test('selects the most specific matching provider hostname', () => {
  const config = { 'max.com': null, 'play.max.com': 'max.js' };
  assert.deepEqual(resolveCustomScript(config, 'https://play.max.com/br'), {
    hostname: 'play.max.com',
    domain: 'play.max.com',
    scriptFile: 'max.js',
  });
});
