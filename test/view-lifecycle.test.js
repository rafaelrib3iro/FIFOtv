const test = require('node:test');
const assert = require('node:assert/strict');
const { isCurrentView } = require('../electron/view-lifecycle');

function view(destroyed = false) {
  return { webContents: { isDestroyed: () => destroyed } };
}

test('accepts only the current live view generation', () => {
  const current = view();
  assert.equal(isCurrentView(current, 2, current, 2), true);
  assert.equal(isCurrentView(view(), 2, current, 2), false);
  assert.equal(isCurrentView(current, 1, current, 2), false);
  assert.equal(isCurrentView(view(true), 2, current, 2), false);
});
