const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('preserves an existing OpenCode process and detaches its own child', () => {
  const main = fs.readFileSync(path.join(__dirname, '..', 'electron', 'main.js'), 'utf8');

  assert.doesNotMatch(main, /fuser\s+-k\s+3000/);
  assert.match(main, /Porta 3000 já está em uso; mantendo processo existente\./);
  assert.match(main, /detached:\s*true,\s*stdio:\s*'ignore'/);
});
