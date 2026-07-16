class Popup {
    constructor(elementOrId, opts = {}) {
        this.el = typeof elementOrId === 'string'
            ? document.getElementById(elementOrId)
            : elementOrId;
        this.animDuration = opts.animDuration || 200;
        this.hideTimer = null;
    }

    show() {
        clearTimeout(this.hideTimer);
        this.hideTimer = null;
        this.el.classList.remove('fading-out');
        this.el.classList.remove('hidden');
    }

    hide(animated = true) {
        clearTimeout(this.hideTimer);
        this.hideTimer = null;
        if (!animated) {
            this.el.classList.add('hidden');
            this.el.classList.remove('fading-out');
            return;
        }
        if (this.el.classList.contains('hidden')) return;
        this.el.classList.add('fading-out');
        this.hideTimer = setTimeout(() => {
            this.el.classList.add('hidden');
            this.el.classList.remove('fading-out');
            this.hideTimer = null;
        }, this.animDuration);
    }

    isVisible() {
        return !this.el.classList.contains('hidden');
    }
}

class PopupNavigator {
    constructor() {
        this._configs = new Map();
        this._indices = new Map();
    }

    register(navState, config) {
        this._configs.set(navState, config);
        this._indices.set(navState, 0);
    }

    unregister(navState) {
        this._configs.delete(navState);
        this._indices.delete(navState);
    }

    resetIndex(navState) {
        this._indices.set(navState, 0);
    }

    handle(e, navState) {
        const config = this._configs.get(navState);
        if (!config) return false;

        const focusables = config.getFocusables();
        if (!focusables || focusables.length === 0) return false;

        let idx = this._indices.get(navState) || 0;

        const applyHighlight = (items, i) => {
            if (config.onHighlight) {
                config.onHighlight(items, i);
            } else {
                items.forEach((el, j) => el.classList.toggle('fifotv-focused', j === i));
                items[i].focus();
            }
        };

        switch (e.key) {
            case 'ArrowDown':
            case 'ArrowRight': {
                idx = Math.min(idx + 1, focusables.length - 1);
                this._indices.set(navState, idx);
                applyHighlight(focusables, idx);
                e.preventDefault();
                return true;
            }
            case 'ArrowUp':
            case 'ArrowLeft': {
                idx = Math.max(idx - 1, 0);
                this._indices.set(navState, idx);
                applyHighlight(focusables, idx);
                e.preventDefault();
                return true;
            }
            case 'Enter': {
                if (config.onEnter) {
                    config.onEnter(focusables, idx);
                } else {
                    focusables[idx].click();
                }
                e.preventDefault();
                return true;
            }
            case 'Escape': {
                if (config.onClose) config.onClose();
                e.preventDefault();
                return true;
            }
        }
        return false;
    }
}

if (typeof module !== 'undefined') {
    module.exports = { Popup, PopupNavigator };
}
