const MAC_ADDRESS = /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/i;
const SLUG = /^[a-z0-9][a-z0-9-]*$/i;

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isAppUrl(value) {
  if (!isNonEmptyString(value)) return false;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isApp(app) {
  return app && typeof app === 'object'
    && Number.isSafeInteger(app.id)
    && isNonEmptyString(app.name)
    && typeof app.slug === 'string' && SLUG.test(app.slug)
    && app.type === 'web'
    && isAppUrl(app.url);
}

function isAppCatalog(catalog) {
  if (!catalog || typeof catalog !== 'object' || !Array.isArray(catalog.apps)) return false;
  const ids = new Set();
  return catalog.apps.every((app) => {
    if (!isApp(app) || ids.has(app.id)) return false;
    ids.add(app.id);
    return true;
  });
}

function isMacAddress(value) {
  return typeof value === 'string' && MAC_ADDRESS.test(value);
}

module.exports = {
  isApp,
  isAppCatalog,
  isAppUrl,
  isMacAddress,
  isNonEmptyString,
};
