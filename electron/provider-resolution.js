function hostnameFromUrl(value) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function matchesHostname(hostname, domain) {
  const host = String(hostname || '').toLowerCase();
  const expected = String(domain || '').toLowerCase();
  return host === expected || host.endsWith(`.${expected}`);
}

function resolveCustomScript(config, url) {
  const hostname = hostnameFromUrl(url);
  if (!hostname) return null;

  const domain = Object.keys(config)
    .filter((candidate) => matchesHostname(hostname, candidate))
    .sort((a, b) => b.length - a.length)[0];

  return domain ? { hostname, domain, scriptFile: config[domain] } : null;
}

module.exports = { hostnameFromUrl, matchesHostname, resolveCustomScript };
