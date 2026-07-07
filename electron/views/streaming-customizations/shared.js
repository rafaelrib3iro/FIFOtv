(function () {
  if (window.__FIFOtv_shared) return;
  window.__FIFOtv_shared = true;

  window.FIFOtv = {
    watchAndClick(selector, opts = {}) {
      const { interval = 1000, once = true, callback = null } = opts;
      const tryClick = () => {
        const el = document.querySelector(selector);
        if (el) {
          el.click();
          if (callback) callback(el);
          return true;
        }
        return false;
      };

      if (tryClick() && once) return null;

      const observer = new MutationObserver(() => {
        if (tryClick() && once) observer.disconnect();
      });
      observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true,
      });
      return observer;
    },

    watchMultiple(mapping, opts = {}) {
      const { once = true } = opts;
      const observers = [];
      for (const [selector, callback] of Object.entries(mapping)) {
        observers.push(this.watchAndClick(selector, { once, callback }));
      }
      return observers;
    },

    autoFullscreen() {
      const observer = new MutationObserver(() => {
        const video = document.querySelector('video');
        if (video && !video._fifoFullscreenBound) {
          video._fifoFullscreenBound = true;
          video.addEventListener('playing', () => {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen().catch(() => {});
            }
          });
        }
      });
      observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true,
      });
      return observer;
    },

    removeElements(selectors) {
      const observer = new MutationObserver(() => {
        selectors.forEach((sel) => {
          document.querySelectorAll(sel).forEach((el) => el.remove());
        });
      });
      observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true,
      });
      return observer;
    },

    hideElements(selectors) {
      const style = document.createElement('style');
      style.id = 'fifotv-hidden';
      style.textContent = selectors
        .map((s) => `${s} { display: none !important; }`)
        .join('\n');
      document.head.appendChild(style);
    },

    addStyles(css) {
      const style = document.createElement('style');
      style.id = 'fifotv-custom';
      style.textContent = css;
      document.head.appendChild(style);
    },

    spatialNav(config = {}) {
      if (!window.__spatialNavigation__) return;

      if (config.containers) {
        document.querySelectorAll(config.containers.join(',')).forEach((el) => {
          el.style.setProperty('--spatial-navigation-contain', 'contain');
        });
      }

      if (config.gridRows) {
        document.querySelectorAll(config.gridRows.join(',')).forEach((el) => {
          el.style.setProperty('--spatial-navigation-function', 'grid');
        });
      }

      if (config.focusableSelectors) {
        const selector = config.focusableSelectors.join(',');
        document.querySelectorAll(selector).forEach((el) => {
          if (el.tabIndex < 0) el.tabIndex = 0;
        });
        // Re-run when DOM changes (Netflix lazy-loads content)
        const observer = new MutationObserver(() => {
          document.querySelectorAll(selector).forEach((el) => {
            if (el.tabIndex < 0) el.tabIndex = 0;
          });
        });
        observer.observe(document.body || document.documentElement, {
          childList: true, subtree: true
        });
      }

      if (config.actionFocus) {
        document.querySelectorAll(config.actionFocus.join(',')).forEach((el) => {
          el.style.setProperty('--spatial-navigation-action', 'focus');
        });
      }

      if (config.blockSelectors) {
        const style = document.createElement('style');
        style.id = 'fifotv-spatial-block';
        style.textContent = config.blockSelectors
          .map((el) => `${el} { outline: none !important; pointer-events: none !important; }`)
          .join('\n');
        document.head.appendChild(style);
      }

      if (config.onBeforeFocus) {
        document.addEventListener('navbeforefocus', (e) => {
          if (config.onBeforeFocus(e.detail.causedTarget, e)) {
            e.preventDefault();
          }
        }, true);
      }
    },

    clickWhenReady(selector, timeout = 30000) {
      return new Promise((resolve) => {
        const start = Date.now();
        const check = () => {
          const el = document.querySelector(selector);
          if (el) {
            el.click();
            resolve(el);
            return;
          }
          if (Date.now() - start > timeout) {
            resolve(null);
            return;
          }
          setTimeout(check, 500);
        };
        check();
      });
    },
  };

  console.log('[FIFOtv] shared utilities loaded');
})();
