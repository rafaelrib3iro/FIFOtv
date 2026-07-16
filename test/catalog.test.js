const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCatalog, readCatalog } = require('../electron/catalog');

const validCatalog = JSON.stringify({
  streamings: [{ id: 1, name: 'Netflix', slug: 'netflix', url: 'https://netflix.com' }],
});

test('reads a valid streaming catalog', () => {
  assert.deepEqual(readCatalog(() => validCatalog), JSON.parse(validCatalog));
});

test('reports a missing streaming catalog', () => {
  const error = Object.assign(new Error('missing'), { code: 'ENOENT' });
  assert.throws(() => readCatalog(() => { throw error; }), /file is missing/);
});

test('rejects invalid JSON and invalid catalog shapes', () => {
  assert.throws(() => parseCatalog('{'), /invalid JSON/);
  assert.throws(() => parseCatalog(JSON.stringify({ streamings: 'invalid' })), /invalid format/);
});

test('rejects duplicate streaming IDs', () => {
  const duplicate = JSON.stringify({
    streamings: [
      { id: 1, name: 'Netflix', slug: 'netflix', url: 'https://netflix.com' },
      { id: 1, name: 'YouTube', slug: 'youtube', url: 'https://youtube.com' },
    ],
  });
  assert.throws(() => parseCatalog(duplicate), /invalid format/);
});
