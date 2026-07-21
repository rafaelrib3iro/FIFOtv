const { isAppCatalog } = require('./ipc-validation');

function parseAppCatalog(text) {
  let catalog;
  try {
    catalog = JSON.parse(text);
  } catch {
    throw new Error('App catalog contains invalid JSON');
  }
  if (!isAppCatalog(catalog)) throw new Error('App catalog has an invalid format');
  return catalog;
}

function migrateStreamingCatalog(text) {
  let legacy;
  try {
    legacy = JSON.parse(text);
  } catch {
    throw new Error('Streaming catalog contains invalid JSON');
  }
  if (!legacy || !Array.isArray(legacy.streamings)) throw new Error('Streaming catalog has an invalid format');
  const catalog = { apps: legacy.streamings.map((streaming) => ({ ...streaming, type: 'web' })) };
  if (!isAppCatalog(catalog)) throw new Error('Streaming catalog has an invalid format');
  return catalog;
}

function readAppCatalog({ readFile, writeFile }) {
  try {
    return parseAppCatalog(readFile('apps'));
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }

  let catalog;
  try {
    catalog = migrateStreamingCatalog(readFile('streamings'));
  } catch (error) {
    if (error?.code === 'ENOENT') throw new Error('App catalog file is missing');
    throw error;
  }
  writeFile(JSON.stringify(catalog, null, 2));
  return catalog;
}

module.exports = { migrateStreamingCatalog, parseAppCatalog, readAppCatalog };
