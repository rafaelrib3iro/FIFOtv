(() => {
  'use strict';

  const slug = process.argv?.find(a => !a.startsWith('-') && a !== 'electron');
  const isPrimeVideo = slug === 'primevideo';

  if (isPrimeVideo) return;

  const UA = 'Mozilla/5.0 (SMART-TV; Linux; Tizen 6.5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36';

  const descriptors = {
    navigator: {
      userAgent:             { get: () => UA },
      platform:              { get: () => 'Tizen' },
      appVersion:            { get: () => UA.slice(8) },
      maxTouchPoints:        { get: () => 0 },
      hardwareConcurrency:   { get: () => 4 },
      deviceMemory:          { get: () => 2 },
      webdriver:             { get: () => false },
      languages:             { get: () => ['pt-BR', 'pt', 'en-US', 'en'] },
      language:              { get: () => 'pt-BR' },
      plugins:               { get: () => [1, 2, 3] },
    },
    screen: {
      width:       { get: () => 1280 },
      height:      { get: () => 720 },
      availWidth:  { get: () => 1280 },
      availHeight: { get: () => 720 },
      colorDepth:  { get: () => 24 },
      pixelDepth:  { get: () => 24 },
    },
    window: {
      devicePixelRatio: { get: () => 1 },
    },
  };

  for (const [obj, props] of Object.entries(descriptors)) {
    const target = obj === 'window' ? window : navigator;
    for (const [prop, desc] of Object.entries(props)) {
      try { Object.defineProperty(target, prop, { ...desc, configurable: true, writable: false }); } catch (_) {}
    }
  }

  if (navigator.connection) {
    try { Object.defineProperty(navigator.connection, 'rtt', { get: () => 100, configurable: true }); } catch (_) {}
  }

  const uadData = {
    brands: [
      { brand: 'Chromium', version: '149' },
      { brand: 'Not_A Brand', version: '24' },
    ],
    mobile: false,
    platform: 'Tizen',
    getHighEntropyValues: (hints) => Promise.resolve({
      brands: [
        { brand: 'Chromium', version: '149' },
        { brand: 'Not_A Brand', version: '24' },
      ],
      mobile: false,
      platform: 'Tizen',
      platformVersion: '6.5.0',
      architecture: '',
      bitness: '',
      model: '',
      uaFullVersion: '149.0.0.0',
      fullVersionList: [
        { brand: 'Chromium', version: '149.0.0.0' },
        { brand: 'Not_A Brand', version: '24.0.0.0' },
      ],
      wow64: false,
    }),
    toJSON: () => ({
      brands: [
        { brand: 'Chromium', version: '149' },
        { brand: 'Not_A Brand', version: '24' },
      ],
      mobile: false,
      platform: 'Tizen',
    }),
  };

  try { Object.defineProperty(navigator, 'userAgentData', { get: () => uadData, configurable: true }); } catch (_) {}

  const WEBGL = { vendor: 'Samsung Electronics Co., Ltd.', renderer: 'Mali-G51' };
  for (const ctx of [WebGLRenderingContext, WebGL2RenderingContext]) {
    if (!ctx) continue;
    const orig = ctx.prototype.getParameter;
    ctx.prototype.getParameter = function (param) {
      if (param === 0x1F01) return WEBGL.renderer;
      if (param === 0x1F00) return WEBGL.vendor;
      return orig.call(this, param);
    };
  }
})();
