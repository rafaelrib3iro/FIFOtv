(function () {
  if (window.__FIFOtv_primevideo) return;
  window.__FIFOtv_primevideo = true;

  var S = FIFOtv;

  // Skip Intro
  S.watchAndClick('[class*=skipelement]', {
    callback: function () {
      console.log('[FIFOtv/PrimeVideo] intro skipped');
    },
  });

  S.watchAndClick("button[aria-label='Skip Intro']", {
    callback: function () {
      console.log('[FIFOtv/PrimeVideo] intro skipped (aria-label)');
    },
  });

  // Skip Credits → next episode
  S.watchAndClick('[class*=nextupcard-button]', {
    once: false,
    callback: function () {
      console.log('[FIFOtv/PrimeVideo] credits skipped → next episode');
    },
  });

  // Watch Credits (dismiss the "next episode" card)
  S.watchAndClick('[class*=nextupcardhide-button]', {
    once: false,
    callback: function () {
      console.log('[FIFOtv/PrimeVideo] credits card dismissed');
    },
  });

  // Auto-close X-Ray panel
  S.watchAndClick('.xrayVodHeaderTitle.expanded .arrow.show', {
    callback: function () {
      console.log('[FIFOtv/PrimeVideo] X-Ray closed');
    },
  });

  console.log('[FIFOtv] Prime Video customization loaded');
})();
