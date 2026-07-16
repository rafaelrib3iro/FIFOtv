const { isCatalog } = require('./ipc-validation');

function parseCatalog(text) {
  let catalog;
  try {
    catalog = JSON.parse(text);
  } catch {
    throw new Error('Streaming catalog contains invalid JSON');
  }
  if (!isCatalog(catalog)) throw new Error('Streaming catalog has an invalid format');
  return catalog;
}

function readCatalog(readFile) {
  try {
    return parseCatalog(readFile());
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      throw new Error('Streaming catalog file is missing');
    }
    throw error;
  }
}

module.exports = { parseCatalog, readCatalog };
