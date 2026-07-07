(function () {
  if (window.__FIFOtv_spatialnav) return;
  window.__FIFOtv_spatialnav = true;

  const slug = window.__FIFOtv_slug || '';

  const CONFIGS = {
    youtube: {
      actionFocus: ['ytd-guide-renderer'],
    },
    disney: {
      containers: ['.dss-contentWrapper'],
    },
    max: {
      containers: ['.content-area'],
    },
    appletv: {},
    applemusic: {},
    globoplay: {},
  };

  const cfg = CONFIGS[slug] || {};

  if (window.FIFOtv && FIFOtv.spatialNav) {
    FIFOtv.spatialNav(cfg);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      if (window.FIFOtv && FIFOtv.spatialNav) {
        FIFOtv.spatialNav(cfg);
      }
    });
  }

  console.log('[FIFOtv] spatial navigation configured for:', slug || '(default)');
})();
