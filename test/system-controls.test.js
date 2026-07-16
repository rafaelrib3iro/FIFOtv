const test = require('node:test');
const assert = require('node:assert/strict');
const { clamp, parseNmcliTerse } = require('../electron/system-controls');

test('parses nmcli terse fields with escaped delimiters and Unicode', () => {
  assert.deepEqual(parseNmcliTerse('Casa\\:TV:72:WPA2'), ['Casa:TV', '72', 'WPA2']);
  assert.deepEqual(parseNmcliTerse('Café:55:--'), ['Café', '55', '--']);
});

test('parses nmcli terse empty fields and escaped backslashes', () => {
  assert.deepEqual(parseNmcliTerse(':0:'), ['', '0', '']);
  assert.deepEqual(parseNmcliTerse('Rede\\\\5G:100:WPA3'), ['Rede\\5G', '100', 'WPA3']);
});

test('clamps volume and zoom bounds', () => {
  assert.equal(clamp(-1, 0, 100), 0);
  assert.equal(clamp(50, 0, 100), 50);
  assert.equal(clamp(151, 50, 150), 150);
});
