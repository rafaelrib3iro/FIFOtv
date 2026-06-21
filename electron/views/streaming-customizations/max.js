(function () {
  if (window.__FIFOtv_max) return;
  window.__FIFOtv_max = true;

  var S = FIFOtv;

  S.watchAndClick('button[class*="SkipButton-"]', {
    callback: function () {
      console.log('[FIFOtv/Max] intro skipped');
    },
  });

  S.watchAndClick('button[class*="UpNextButton-"]', {
    once: false,
    callback: function () {
      console.log('[FIFOtv/Max] credits skipped → next episode');
    },
  });

  S.watchAndClick('button[class*="DismissButton-"]', {
    once: false,
    callback: function () {
      console.log('[FIFOtv/Max] credits card dismissed');
    },
  });

  S.autoFullscreen();

  console.log('[FIFOtv] Max customization loaded');
})();
