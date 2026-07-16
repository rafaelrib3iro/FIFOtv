function createClientHintsRegistry() {
  const sessions = new WeakMap();

  function register(session, webContentsId, headers) {
    let state = sessions.get(session);
    if (!state) {
      state = { consumers: new Map() };
      sessions.set(session, state);
      session.webRequest.onBeforeSendHeaders({ urls: ['*://*/*'] }, (details, callback) => {
        const consumerHeaders = state.consumers.get(details.webContentsId);
        callback({
          requestHeaders: consumerHeaders
            ? { ...details.requestHeaders, ...consumerHeaders }
            : details.requestHeaders,
        });
      });
    }

    state.consumers.set(webContentsId, headers);
    return () => state.consumers.delete(webContentsId);
  }

  return { register };
}

module.exports = { createClientHintsRegistry };
