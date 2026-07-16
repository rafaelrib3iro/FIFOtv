const MAC_ADDRESS = /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/i;
const SLUG = /^[a-z0-9][a-z0-9-]*$/i;

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStreamingUrl(value) {
  if (!isNonEmptyString(value)) return false;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isStreaming(streaming) {
  return streaming && typeof streaming === 'object'
    && Number.isSafeInteger(streaming.id)
    && isNonEmptyString(streaming.name)
    && typeof streaming.slug === 'string' && SLUG.test(streaming.slug)
    && isStreamingUrl(streaming.url);
}

function isCatalog(catalog) {
  if (!catalog || typeof catalog !== 'object' || !Array.isArray(catalog.streamings)) return false;
  const ids = new Set();
  return catalog.streamings.every((streaming) => {
    if (!isStreaming(streaming) || ids.has(streaming.id)) return false;
    ids.add(streaming.id);
    return true;
  });
}

function isMacAddress(value) {
  return typeof value === 'string' && MAC_ADDRESS.test(value);
}

module.exports = {
  isCatalog,
  isMacAddress,
  isNonEmptyString,
  isStreaming,
  isStreamingUrl,
};
