const path = require('path');
const { hostnameFromUrl, matchesHostname, resolveCustomScript } = require('./provider-resolution');
const { redactStreamingUrl, runInjectionStages } = require('./streaming-injection');

const SMART_TV_UA = 'Mozilla/5.0 (SMART-TV; Linux; Tizen 6.5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36';
const SMART_TV_CLIENT_HINTS = {
  'Sec-CH-UA-Platform': '"Tizen"', 'Sec-CH-UA-Mobile': '?0',
  'Sec-CH-UA': '"Chromium";v="149", "Not_A Brand";v="24"',
  'Sec-CH-UA-Full-Version-List': '"Chromium";v="149.0.0.0", "Not_A Brand";v="24.0.0.0"',
  'Sec-CH-UA-Platform-Version': '"6.5.0"', 'Sec-CH-UA-Model': '""', 'Sec-CH-UA-Form-Factors': '"TV"',
};

function normalizeUrl(url) {
  const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  const hostname = hostnameFromUrl(normalized);
  return matchesHostname(hostname, 'youtube.com') || matchesHostname(hostname, 'youtu.be')
    ? 'https://www.youtube.com/tv'
    : normalized;
}

function createWebRuntime({ WebContentsView, fs, clientHintsRegistry, attachRendererLogging, redactUrl, loadStreamingConfig, loadSpatialConfig, rootDir }) {
  const customDir = path.join(rootDir, 'views', 'streaming-customizations');
  const spaDomains = new Set(['youtube']);

  function open({ app, bounds, isCurrent, onFatal }) {
    const url = normalizeUrl(app.url);
    const view = new WebContentsView({
      webPreferences: {
        preload: path.join(rootDir, 'preload-streaming.js'),
        contextIsolation: false,
        nodeIntegration: false,
        additionalArguments: [app.slug],
      },
    });
    view.setBackgroundColor('#0a0816');
    view.setBounds(bounds);
    view.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    attachRendererLogging(view.webContents, `app:web:${app.slug}`);

    const isPrimeVideo = matchesHostname(hostnameFromUrl(url), 'primevideo.com');
    let removeClientHints = null;
    if (!isPrimeVideo && app.slug !== 'netflix') {
      view.webContents.setUserAgent(SMART_TV_UA);
      removeClientHints = clientHintsRegistry.register(view.webContents.session, view.webContents.id, SMART_TV_CLIENT_HINTS);
    }

    let failureHandled = false;
    const fail = (reason) => {
      if (failureHandled || !isCurrent()) return;
      failureHandled = true;
      console.error(`[app:web] returning home after ${reason}`);
      onFatal();
    };
    view.webContents.on('did-fail-load', (_, code, desc, failedUrl, isMainFrame) => {
      console.error(`[app:web] failed to load: ${code} ${desc}`);
      if (code !== -3 && isMainFrame) fail(`main-frame load failure: ${redactUrl(failedUrl)}`);
    });
    view.webContents.on('render-process-gone', (_, details) => fail(`renderer exit: ${details.reason}`));
    view.webContents.on('dom-ready', () => runWebInjection({ app, view, isCurrent, fs, customDir, loadStreamingConfig, loadSpatialConfig }));
    view.webContents.on('dom-ready', () => {
      if (!isCurrent()) return;
      setTimeout(() => { if (isCurrent()) view.webContents.focus(); }, 3000);
    });
    view.webContents.loadURL(url);

    return {
      view,
      dispose() { removeClientHints?.(); removeClientHints = null; },
      focus() { if (!view.webContents.isDestroyed()) view.webContents.focus(); },
      reload() { if (!view.webContents.isDestroyed()) view.webContents.reload(); },
      setBounds(nextBounds) { view.setBounds(nextBounds); },
      zoom(delta, clamp) {
        if (view.webContents.isDestroyed()) return null;
        const zoom = clamp(Math.round(view.webContents.getZoomFactor() * 100) + delta, 50, 150);
        view.webContents.setZoomFactor(zoom / 100);
        return zoom;
      },
      handleAppCommand(command, host) {
        if (command !== 'browser-backward') return command === 'browser-forward' && host.forwardOverlay({ key: 'BrowserForward', type: 'keyDown' });
        if (host.overlayMenuVisible()) return host.forwardOverlay({ key: 'BrowserBack', type: 'keyDown' });
        if (spaDomains.has(app.slug)) {
          view.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' });
          view.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Escape' });
        } else if (view.webContents.navigationHistory.canGoBack()) view.webContents.navigationHistory.goBack();
      },
      handleInput(event, input, host) {
        if (input.type === 'keyDown') host.resetActivity();
        if (input.type !== 'keyDown') return;
        if (input.key === 'ContextMenu') { event.preventDefault(); host.openContextMenu(); return; }
        if (input.key === 'BrowserHome') { event.preventDefault(); host.forwardOverlay(input); return; }
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(input.key) && !host.overlayMenuVisible()) {
          view.webContents.executeJavaScript('if (document.activeElement === document.body || document.activeElement === document.documentElement) { const first = document.querySelector("button, a, [tabindex], input, [role=button]"); if (first) first.focus(); }').catch(() => {});
        }
        if (host.overlayMenuVisible() && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(input.key)) {
          event.preventDefault(); host.forwardOverlay({ key: input.key, type: 'keyDown' });
        }
      },
    };
  }

  return { type: 'web', open };
}

function runWebInjection({ app, view, isCurrent, fs, customDir, loadStreamingConfig, loadSpatialConfig }) {
  if (!isCurrent()) return;
  const currentUrl = view.webContents.getURL();
  const redactedUrl = redactStreamingUrl(currentUrl);
  const config = loadSpatialConfig()[app.slug] || {};
  const scriptSelection = resolveCustomScript(loadStreamingConfig(), currentUrl);
  const stages = [];
  const addStage = (name, filePath) => {
    try { stages.push({ name, code: fs.readFileSync(filePath, 'utf8') }); return true; }
    catch (error) { console.error(`[app:web] injection failed provider=${app.slug} stage=${name} url=${redactedUrl}: ${error.message}`); return false; }
  };
  if (config.enabled !== false && !addStage('polyfill', path.join(rootDirFor(customDir), 'spatial-navigation', 'polyfill.js'))) return;
  if (!addStage('shared', path.join(customDir, 'shared.js'))) return;
  stages.push({ name: 'slug', code: `window.__FIFOtv_slug = ${JSON.stringify(app.slug)};` });
  if (!addStage('spatial config', path.join(customDir, 'spatial-nav.js'))) return;
  if (scriptSelection?.scriptFile && !addStage('provider script', path.join(customDir, scriptSelection.scriptFile))) return;
  console.log(`[app:web] injection plan provider=${app.slug} hostname=${hostnameFromUrl(currentUrl) || '[invalid]'} script=${scriptSelection?.scriptFile || 'none'} url=${redactedUrl}`);
  runInjectionStages({ webContents: view.webContents, stages, isCurrent, onStageError: (stage, error) => console.error(`[app:web] injection failed provider=${app.slug} stage=${stage} url=${redactedUrl}: ${error.message}`) })
    .then((result) => { if (result.ok) console.log(`[app:web] injection complete provider=${app.slug} url=${redactedUrl}`); })
    .catch((error) => console.error(`[app:web] injection failed provider=${app.slug} stage=pipeline url=${redactedUrl}: ${error.message}`));
}

function rootDirFor(customDir) { return path.dirname(customDir); }

module.exports = { createWebRuntime, normalizeUrl };
