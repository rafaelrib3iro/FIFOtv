const test = require('node:test');
const assert = require('node:assert/strict');
const { Popup } = require('../frontend/popup-manager');

function classList(...classes) {
  const values = new Set(classes);
  return {
    add: (...names) => names.forEach((name) => values.add(name)),
    remove: (...names) => names.forEach((name) => values.delete(name)),
    contains: (name) => values.has(name),
  };
}

test('show cancels an earlier animated hide', () => {
  const timers = [];
  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;
  global.setTimeout = (callback) => {
    const timer = { callback, cancelled: false };
    timers.push(timer);
    return timer;
  };
  global.clearTimeout = (timer) => { if (timer) timer.cancelled = true; };

  try {
    const element = { classList: classList() };
    const popup = new Popup(element);
    popup.hide();
    popup.show();
    timers.forEach((timer) => { if (!timer.cancelled) timer.callback(); });
    assert.equal(popup.isVisible(), true);
    assert.equal(element.classList.contains('fading-out'), false);
  } finally {
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
  }
});
