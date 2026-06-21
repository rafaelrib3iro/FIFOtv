(function () {
  if (window.__FIFOtv_disney) return;
  window.__FIFOtv_disney = true;

  var S = FIFOtv;

  function clickShadowButton(rootSelector, shadowSelector, btnSelector) {
    var root = document.querySelector(rootSelector);
    if (!root || !root.shadowRoot) return false;
    var shadow = root.shadowRoot.querySelector(shadowSelector);
    if (!shadow || !shadow.shadowRoot) return false;
    var btn = shadow.shadowRoot.querySelector(btnSelector);
    if (btn) { btn.click(); return true; }
    return false;
  }

  var introObserver = new MutationObserver(function () {
    if (clickShadowButton('skip-overlay', 'skip-button', 'button')) {
      console.log('[FIFOtv/Disney] intro/recap skipped');
    }
  });
  introObserver.observe(document.body || document.documentElement, { childList: true, subtree: true });

  S.watchAndClick('[data-testid="icon-restart"]', {
    once: false,
    callback: function (el) {
      var parent = el.parentElement;
      if (parent) parent.click();
      console.log('[FIFOtv/Disney] credits skipped → next episode');
    },
  });

  S.watchAndClick('.overlay_interstitials__promo_skip_button', {
    once: false,
    callback: function () {
      console.log('[FIFOtv/Disney] self-ad skipped');
    },
  });

  S.autoFullscreen();

  console.log('[FIFOtv] Disney+ customization loaded');
})();
