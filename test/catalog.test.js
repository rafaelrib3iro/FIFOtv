const test = require('node:test');
const assert = require('node:assert/strict');
const { migrateStreamingCatalog, parseAppCatalog, readAppCatalog } = require('../electron/app-catalog');

const validCatalog = JSON.stringify({
  apps: [{ id: 1, name: 'Netflix', slug: 'netflix', type: 'web', url: 'https://netflix.com' }],
});

test('reads a valid app catalog', () => {
  assert.deepEqual(readAppCatalog({ readFile: () => validCatalog, writeFile: () => {} }), JSON.parse(validCatalog));
});

test('migrates the legacy streaming catalog once when apps are missing', () => {
  const legacy = JSON.stringify({ streamings: [{ id: 1, name: 'Netflix', slug: 'netflix', url: 'https://netflix.com' }] });
  let persisted = null;
  const error = Object.assign(new Error('missing'), { code: 'ENOENT' });
  const catalog = readAppCatalog({
    readFile: (kind) => kind === 'apps' ? (() => { throw error; })() : legacy,
    writeFile: (text) => { persisted = text; },
  });
  assert.deepEqual(catalog, { apps: [{ id: 1, name: 'Netflix', slug: 'netflix', type: 'web', url: 'https://netflix.com' }] });
  assert.equal(persisted, JSON.stringify(catalog, null, 2));
  assert.deepEqual(migrateStreamingCatalog(legacy), catalog);
});

test('reports a missing app catalog', () => {
  const error = Object.assign(new Error('missing'), { code: 'ENOENT' });
  assert.throws(() => readAppCatalog({ readFile: () => { throw error; }, writeFile: () => {} }), /file is missing/);
});

test('rejects invalid JSON and invalid catalog shapes', () => {
  assert.throws(() => parseAppCatalog('{'), /invalid JSON/);
  assert.throws(() => parseAppCatalog(JSON.stringify({ apps: 'invalid' })), /invalid format/);
});

test('rejects duplicate app IDs', () => {
  const duplicate = JSON.stringify({
    apps: [
      { id: 1, name: 'Netflix', slug: 'netflix', type: 'web', url: 'https://netflix.com' },
      { id: 1, name: 'YouTube', slug: 'youtube', type: 'web', url: 'https://youtube.com' },
    ],
  });
  assert.throws(() => parseAppCatalog(duplicate), /invalid format/);
});
