const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const main = fs.readFileSync(path.join(root, 'electron', 'main.js'), 'utf8');

function channels(source, pattern) {
  return new Set([...source.matchAll(pattern)].map((match) => match[1]));
}

function exposedMethods(source) {
  return [...source.matchAll(/^\s{2}([A-Za-z]\w*):/gm)].map((match) => match[1]);
}

for (const [preloadPath, rendererPath] of [
  ['electron/preload.js', 'frontend/script.js'],
  ['electron/preload-overlay.js', 'electron/views/overlay.js'],
]) {
  test(`${preloadPath} exposes only connected IPC contracts`, () => {
    const preload = fs.readFileSync(path.join(root, preloadPath), 'utf8');
    const renderer = fs.readFileSync(path.join(root, rendererPath), 'utf8');
    const invokeChannels = channels(preload, /ipcRenderer\.invoke\('([^']+)'/g);
    const sendChannels = channels(preload, /ipcRenderer\.send\('([^']+)'/g);
    const receiveChannels = channels(preload, /ipcRenderer\.on\('([^']+)'/g);
    const handledChannels = channels(main, /handleFrom\('([^']+)'/g);
    const listenedChannels = channels(main, /onFrom\('([^']+)'/g);
    const emittedChannels = channels(main, /\.send\('([^']+)'/g);

    for (const channel of invokeChannels) assert.ok(handledChannels.has(channel), `missing handler for ${channel}`);
    for (const channel of sendChannels) assert.ok(listenedChannels.has(channel), `missing listener for ${channel}`);
    for (const channel of receiveChannels) assert.ok(emittedChannels.has(channel), `missing emitter for ${channel}`);
    for (const method of exposedMethods(preload)) {
      assert.match(renderer, new RegExp(`\\.fifotv\\.${method}\\b`), `unused preload method ${method}`);
    }
  });
}
