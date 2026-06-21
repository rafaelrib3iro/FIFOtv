(function () {
  if (window.__FIFOtv_netflix) return;
  window.__FIFOtv_netflix = true;

  const S = FIFOtv;

  S.watchAndClick('[data-uia="player-skip-intro"]', {
    callback: function () {
      console.log('[FIFOtv/Netflix] intro skipped');
    },
  });

  S.watchAndClick('[data-uia="player-skip-recap"]', {
    callback: function () {
      console.log('[FIFOtv/Netflix] recap skipped');
    },
  });

  S.watchAndClick('[data-uia="player-skip-preplay"]', {
    callback: function () {
      console.log('[FIFOtv/Netflix] recap (preplay) skipped');
    },
  });

  S.watchAndClick('[data-uia="next-episode-seamless-button-draining"]', {
    callback: function () {
      console.log('[FIFOtv/Netflix] credits skipped → next episode');
    },
  });

  S.watchAndClick('[data-uia="interrupt-autoplay-continue"]', {
    callback: function () {
      console.log('[FIFOtv/Netflix] "are you still watching?" dismissed');
    },
  });

  S.removeElements([
    'div.mobile-games-row',
    'div[data-list-context="configbased_cloudpersonalizedgames"]',
    'div.billboard-row.billboard-row-games',
  ]);

  S.autoFullscreen();

  console.log('[FIFOtv] Netflix customization loaded');
})();
