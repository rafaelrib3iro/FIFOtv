(() => {
  'use strict';

  if (window.location.hostname === 'localhost') return;

  const BASE_URL = 'http://localhost:5000';

  const ICON = {
    home: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    refresh: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>',
    zoomIn: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>',
    zoomOut: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>',
    volumeUp: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>',
    volumeDown: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>',
    monitor: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
    settings: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    power: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="12"/><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/></svg>',
    infoCircle: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  };

  let currentVolume = 50;
  let currentZoom = 100;
  let menuVisible = false;

  // ─── VOLUME TOAST ──────────────────────────────────────

  let volToastEl = null;
  let volToastTimer = null;

  function showVolumeToast() {
    if (!volToastEl) {
      volToastEl = document.createElement('div');
      volToastEl.id = 'fifotv-volume-toast';
      volToastEl.innerHTML = `
        <div class="fifotv-voltoast-icon">${ICON.volumeUp}</div>
        <div class="fifotv-voltoast-bar-wrap">
          <div class="fifotv-voltoast-bar">
            <div class="fifotv-voltoast-fill" id="fifotv-voltoast-fill" style="width:${currentVolume}%"></div>
          </div>
        </div>
      `;
      document.body.appendChild(volToastEl);
    } else {
      const fill = volToastEl.querySelector('#fifotv-voltoast-fill');
      if (fill) fill.style.width = currentVolume + '%';
      volToastEl.classList.remove('fifotv-fade-out');
    }
    clearTimeout(volToastTimer);
    volToastTimer = setTimeout(() => {
      if (volToastEl) {
        volToastEl.classList.add('fifotv-fade-out');
        setTimeout(() => { if (volToastEl) { volToastEl.remove(); volToastEl = null; } }, 250);
      }
    }, 2000);
  }

  // ─── TOAST NOTIFICATIONS ───────────────────────────────

  function showToast(message) {
    let container = document.getElementById('fifotv-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'fifotv-toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'fifotv-toast';
    toast.innerHTML = `
      <div class="fifotv-toast-icon">${ICON.infoCircle}</div>
      <span class="fifotv-toast-text">${message}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('fifotv-removing');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ─── API CALLS ─────────────────────────────────────────

  async function apiVolume(action) {
    try {
      const res = await fetch(`${BASE_URL}/api/volume/${action}`);
      const data = await res.json();
      if (data.volume !== undefined) currentVolume = data.volume;
      else {
        if (action === 'up') currentVolume = Math.min(100, currentVolume + 5);
        else if (action === 'down') currentVolume = Math.max(0, currentVolume - 5);
      }
    } catch (_) {
      if (action === 'up') currentVolume = Math.min(100, currentVolume + 5);
      else if (action === 'down') currentVolume = Math.max(0, currentVolume - 5);
    }
    showVolumeToast();
    const fill = document.getElementById('fifotv-ctx-volume-fill');
    if (fill) fill.style.width = currentVolume + '%';
  }

  async function apiShutdown() {
    try {
      await fetch(`${BASE_URL}/api/system/shutdown`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    } catch (_) {}
  }

  async function apiRestart() {
    try {
      await fetch(`${BASE_URL}/api/system/restart-chromium`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    } catch (_) {}
  }

  function changeZoom(delta) {
    currentZoom = Math.max(50, Math.min(150, currentZoom + delta));
    document.body.style.zoom = String(currentZoom / 100);
    const fill = document.getElementById('fifotv-ctx-zoom-fill');
    if (fill) fill.style.width = ((currentZoom - 50) / 1.5) + '%';
    showToast(`Zoom: ${currentZoom}%`);
  }

  // ─── CONTEXT MENU ──────────────────────────────────────

  function buildMenuHTML() {
    return `
      <div class="fifotv-ctx-item" data-action="home">
        ${ICON.home} Voltar ao início
      </div>
      <div class="fifotv-ctx-item" data-action="reload">
        ${ICON.refresh} Recarregar página
      </div>
      <div class="fifotv-ctx-volume">
        <button class="fifotv-ctx-vol-btn" data-action="zoom-out">${ICON.zoomOut}</button>
        <div class="fifotv-ctx-volume-bar">
          <div class="fifotv-ctx-volume-fill" id="fifotv-ctx-zoom-fill" style="width:${(currentZoom - 50) / 1.5}%"></div>
        </div>
        <button class="fifotv-ctx-vol-btn" data-action="zoom-in">${ICON.zoomIn}</button>
      </div>
      <div class="fifotv-ctx-volume">
        <button class="fifotv-ctx-vol-btn" data-action="vol-down">${ICON.volumeDown}</button>
        <div class="fifotv-ctx-volume-bar">
          <div class="fifotv-ctx-volume-fill" id="fifotv-ctx-volume-fill" style="width:${currentVolume}%"></div>
        </div>
        <button class="fifotv-ctx-vol-btn" data-action="vol-up">${ICON.volumeUp}</button>
      </div>
      <div class="fifotv-ctx-item" data-action="monitor">
        ${ICON.monitor} Monitor
      </div>
      <div class="fifotv-ctx-item" data-action="settings">
        ${ICON.settings} Configurações
      </div>
      <div class="fifotv-ctx-item" data-action="shutdown">
        ${ICON.power} Desligar
      </div>
    `;
  }

  function showMenu(x, y) {
    let menu = document.getElementById('fifotv-ctx');
    if (!menu) {
      menu = document.createElement('div');
      menu.id = 'fifotv-ctx';
      menu.className = 'fifotv-ctx fifotv-hidden';
      document.body.appendChild(menu);
    }
    menu.innerHTML = buildMenuHTML();
    menu.classList.remove('fifotv-hidden', 'fifotv-fading-out');

    const mw = 300, mh = menu.offsetHeight || 340;
    const pad = 12;
    menu.style.left = Math.min(x, window.innerWidth - mw - pad) + 'px';
    menu.style.top = Math.min(y, window.innerHeight - mh - pad) + 'px';

    menuVisible = true;
  }

  function hideMenu() {
    const menu = document.getElementById('fifotv-ctx');
    if (!menu || menu.classList.contains('fifotv-hidden')) return;
    menu.classList.add('fifotv-fading-out');
    setTimeout(() => {
      menu.classList.add('fifotv-hidden');
      menu.classList.remove('fifotv-fading-out');
    }, 200);
    menuVisible = false;
  }

  function toggleMenu(x, y) {
    if (menuVisible) hideMenu();
    else showMenu(x, y);
  }

  // ─── MENU ACTION HANDLER ───────────────────────────────

  function handleAction(action) {
    switch (action) {
      case 'home':
        window.location.href = BASE_URL + '/app';
        break;
      case 'reload':
        window.location.reload();
        break;
      case 'zoom-out':
        changeZoom(-10);
        break;
      case 'zoom-in':
        changeZoom(10);
        break;
      case 'vol-down':
        apiVolume('down');
        break;
      case 'vol-up':
        apiVolume('up');
        break;
      case 'monitor':
        localStorage.setItem('fifotv-open-monitor', '1');
        window.location.href = BASE_URL + '/app';
        break;
      case 'settings':
        localStorage.setItem('fifotv-open-settings', '1');
        window.location.href = BASE_URL + '/app';
        break;
      case 'shutdown':
        apiShutdown();
        break;
    }
    hideMenu();
  }

  // ─── EVENT: CONTEXT MENU (right-click) ─────────────────

  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleMenu(e.clientX, e.clientY);
  }, true);

  // ─── EVENT: CLICK OUTSIDE ──────────────────────────────

  document.addEventListener('click', (e) => {
    if (menuVisible && !e.target.closest('#fifotv-ctx')) {
      hideMenu();
    }
  }, true);

  // ─── EVENT: CLICK ON MENU ITEMS ────────────────────────

  document.addEventListener('click', (e) => {
    const item = e.target.closest('[data-action]');
    if (item) {
      e.preventDefault();
      e.stopPropagation();
      handleAction(item.dataset.action);
    }
  }, true);

  // ─── EVENT: KEYBOARD (air mouse) ───────────────────────

  document.addEventListener('keydown', (e) => {
    // ContextMenu key → toggle
    if (e.key === 'ContextMenu') {
      e.preventDefault();
      if (menuVisible) hideMenu();
      else showMenu(window.innerWidth / 2, window.innerHeight / 2);
      return;
    }

    // Volume keys
    if (e.keyCode === 174 || e.key === 'VolumeDown' || e.key === '-') {
      e.preventDefault();
      apiVolume('down');
      return;
    }
    if (e.keyCode === 175 || e.key === 'VolumeUp' || e.key === '+') {
      e.preventDefault();
      apiVolume('up');
      return;
    }
    if (e.keyCode === 173 || e.key === 'AudioVolumeMute' || e.key === 'm') {
      e.preventDefault();
      apiVolume('mute');
      return;
    }

    // Other air mouse keys
    const keyActions = {
      'Home': () => { hideMenu(); },
      'MediaPlayPause': () => { apiVolume('mute'); },
      'MediaStop': () => { hideMenu(); },
      'F1': () => { localStorage.setItem('fifotv-open-settings', '1'); window.location.href = BASE_URL + '/app'; },
      'F5': () => { localStorage.setItem('fifotv-open-monitor', '1'); window.location.href = BASE_URL + '/app'; },
      'F8': () => { window.history.back(); },
      'F9': () => { apiShutdown(); },
      'F12': () => { apiRestart(); },
    };

    if (keyActions[e.key]) {
      e.preventDefault();
      keyActions[e.key]();
      return;
    }

    // Escape closes menu
    if (e.key === 'Escape' && menuVisible) {
      e.preventDefault();
      hideMenu();
    }
  });

  // ─── EVENT: BACK BUTTON (long/short press) ─────────────

  let backPressStart = null;
  let backTimer = null;

  document.addEventListener('keydown', (e) => {
    if (e.key === 'BrowserBack' || e.key === 'GoBack' || e.keyCode === 166 || e.keyCode === 8) {
      if (!backPressStart) {
        backPressStart = Date.now();
        backTimer = setTimeout(() => {
          hideMenu();
          backPressStart = null;
        }, 600);
      }
      e.preventDefault();
    }
  });

  document.addEventListener('keyup', (e) => {
    if (e.key === 'BrowserBack' || e.key === 'GoBack' || e.keyCode === 166 || e.keyCode === 8) {
      if (backTimer) { clearTimeout(backTimer); backTimer = null; }
      if (backPressStart) {
        const elapsed = Date.now() - backPressStart;
        backPressStart = null;
        if (elapsed < 600) {
          if (menuVisible) hideMenu();
          else window.history.back();
        }
      }
    }
  });
})();
