function redactUrl(value) {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}${url.pathname}`;
  } catch {
    return '[invalid URL]';
  }
}

function createNetworkErrorRegistry(report) {
  const sessions = new WeakMap();

  return {
    register(electronSession, webContentsId, label) {
      let state = sessions.get(electronSession);
      if (!state) {
        state = { consumers: new Map() };
        sessions.set(electronSession, state);
        electronSession.webRequest.onErrorOccurred((details) => {
          if (details.error === 'net::ERR_ABORTED') return;
          const consumer = state.consumers.get(details.webContentsId);
          report({
            label: consumer?.label || (details.webContentsId ? `webContents:${details.webContentsId}` : 'unknown'),
            webContentsId: details.webContentsId,
            method: details.method,
            url: redactUrl(details.url),
            error: details.error,
          });
        });
      }

      const token = Symbol(label);
      state.consumers.set(webContentsId, { label, token });
      return () => {
        if (state.consumers.get(webContentsId)?.token === token) {
          state.consumers.delete(webContentsId);
        }
      };
    },
  };
}

module.exports = { createNetworkErrorRegistry, redactUrl };
