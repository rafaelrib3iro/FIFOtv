(function () {
  if (window.__FIFOtv_netflix) return;
  window.__FIFOtv_netflix = true;

  const S = FIFOtv;

  // ═══════════════════════════════════════════════════════════
  // Auto-skip, remove games, auto-fullscreen
  // ═══════════════════════════════════════════════════════════

  S.watchAndClick('[data-uia="player-skip-intro"]');
  S.watchAndClick('[data-uia="player-skip-recap"]');
  S.watchAndClick('[data-uia="player-skip-preplay"]');
  S.watchAndClick('[data-uia="next-episode-seamless-button-draining"]');
  S.watchAndClick('[data-uia="interrupt-autoplay-continue"]');

  S.removeElements([
    'div.mobile-games-row',
    'div[data-list-context="configbased_cloudpersonalizedgames"]',
    'div.billboard-row.billboard-row-games',
  ]);

  S.autoFullscreen();

  // ═══════════════════════════════════════════════════════════
  // Popup auto-focus (detail modal)
  // ═══════════════════════════════════════════════════════════

  let popupExpected = false;
  let popupFocusDone = false;
  let lastCard = null;

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const card = e.target.closest('.slider-item');
      if (card) {
        lastCard = e.target.closest('a.slider-refocus') || e.target;
        popupExpected = true;
        popupFocusDone = false;
      }
    }
  }, true);

  setInterval(() => {
    if (!popupExpected) return;

    if (popupFocusDone) {
      const popup = document.querySelector('.previewModal--wrapper.detail-modal');
      if (!popup || popup.offsetParent === null) {
        popupExpected = false;
        popupFocusDone = false;
        if (lastCard && lastCard.isConnected) {
          lastCard.focus();
        }
        lastCard = null;
      }
      return;
    }

    const popup = document.querySelector('.previewModal--wrapper.detail-modal')
               || document.querySelector('[class*="detail-modal"]');
    if (!popup) return;

    const btn = popup.querySelector('a.playLink, a.primary-button, button[tabindex="0"], a[tabindex="0"]');
    if (btn) {
      btn.focus();
      popupFocusDone = true;
    }
  }, 300);

  // ═══════════════════════════════════════════════════════════
  // Player D-pad Navigation via Polyfill
  // ═══════════════════════════════════════════════════════════

  let playerActive = false;
  let playerControlsContainer = null;

  const CONTROL_SELECTOR = '[data-uia^="control-"]';

  function findPlayerControlsContainer() {
    const first = document.querySelector(CONTROL_SELECTOR);
    if (!first) return null;
    let el = first.parentElement;
    while (el && el !== document.body) {
      if (el.querySelector(CONTROL_SELECTOR) && el.querySelectorAll(CONTROL_SELECTOR).length >= 3) {
        return el;
      }
      el = el.parentElement;
    }
    return first.parentElement || first;
  }

  function showPlayerControls() {
    document.dispatchEvent(new MouseEvent('mousemove', {
      clientX: window.innerWidth / 2,
      clientY: window.innerHeight / 2,
      bubbles: true,
    }));
  }

  function configurePlayerSpatialNav() {
    playerControlsContainer = findPlayerControlsContainer();
    if (!playerControlsContainer) return;

    // Set as spatial navigation container
    playerControlsContainer.style.setProperty('--spatial-navigation-contain', 'contain');

    // Hide internal Netflix elements that compete for focus
    playerControlsContainer.querySelectorAll('*').forEach((el) => {
      if (!el.matches(CONTROL_SELECTOR) && el.tabIndex >= 0) {
        el.dataset._fifoOrigTi = el.tabIndex;
        el.tabIndex = -1;
      }
    });

    // Ensure control buttons are focusable
    playerControlsContainer.querySelectorAll(CONTROL_SELECTOR).forEach((el) => {
      if (el.tabIndex < 0) el.tabIndex = 0;
    });
  }

  function restorePlayerSpatialNav() {
    if (playerControlsContainer) {
      // Restore original tabindex values
      document.querySelectorAll('[data-_fifoOrigTi]').forEach((el) => {
        el.tabIndex = parseInt(el.dataset._fifoOrigTi, 10);
        delete el.dataset._fifoOrigTi;
      });

      // Remove container config
      playerControlsContainer.style.removeProperty('--spatial-navigation-contain');
      playerControlsContainer = null;
    }
  }

  function activatePlayerMode() {
    if (playerActive) return;
    playerActive = true;
    configurePlayerSpatialNav();
    showPlayerControls();
    console.log('[FIFOtv/Netflix] Player D-pad mode activated');
  }

  function deactivatePlayerMode() {
    if (!playerActive) return;
    playerActive = false;
    restorePlayerSpatialNav();
    console.log('[FIFOtv/Netflix] Player D-pad mode deactivated');
  }

  // Enter handler — click focused control button
  document.addEventListener('keydown', (e) => {
    if (!playerActive || e.key !== 'Enter') return;
    const focused = document.activeElement;
    if (focused && focused.matches && focused.matches(CONTROL_SELECTOR)) {
      e.stopImmediatePropagation();
      e.preventDefault();
      focused.click();
    }
  }, true);

  // Escape/Back handler — exit player mode
  document.addEventListener('keydown', (e) => {
    if (!playerActive) return;
    if (e.key === 'Escape' || e.key === 'BrowserBack') {
      deactivatePlayerMode();
    }
  }, true);

  // Event-driven player detection (zero polling)
  const videoObserver = new MutationObserver(() => {
    const video = document.querySelector('video');
    if (video && !video._fifotvPlayerBound) {
      video._fifotvPlayerBound = true;
      video.addEventListener('play', () => activatePlayerMode());
      video.addEventListener('ended', () => deactivatePlayerMode());
    }
  });
  videoObserver.observe(document.documentElement, {
    childList: true, subtree: true,
  });

  // CSS for player control focus
  S.addStyles(`
    ${CONTROL_SELECTOR}:focus-visible {
      outline: 2px solid rgba(255, 255, 255, 0.8) !important;
      outline-offset: 2px;
    }
  `);

  console.log('[FIFOtv] Netflix customization loaded (player D-pad via polyfill)');
})();
