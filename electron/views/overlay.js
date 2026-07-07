(() => {
  'use strict';

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
  let menuFocusIndex = -1;
  let toastVisible = false;

  // Menu items: 'home', 'reload', 'zoom-bar', 'vol-bar', 'monitor', 'settings', 'shutdown'
  // Volume bar and zoom bar are single focusable items (D-pad left/right adjusts them)

  // ─── VOLUME TOAST ──────────────────────────────────────

  let volToastEl = null;
  let volToastTimer = null;

  function showVolumeToast() {
    toastVisible = true;

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

    // Bring overlay to front so toast is visible over streaming
    if (window.fifotv && window.fifotv.showToastOverlay) {
      window.fifotv.showToastOverlay();
    }

    clearTimeout(volToastTimer);
    volToastTimer = setTimeout(() => {
      if (volToastEl) {
        volToastEl.classList.add('fifotv-fade-out');
        setTimeout(() => { if (volToastEl) { volToastEl.remove(); volToastEl = null; } }, 250);
      }
      toastVisible = false;
      // Send overlay back only if menu is not open
      if (!menuVisible && window.fifotv && window.fifotv.hideToastOverlay) {
        window.fifotv.hideToastOverlay();
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

  // ─── API CALLS (via IPC) ───────────────────────────────

  async function apiVolume(action) {
    try {
      if (action === 'up') await window.fifotv.volumeUp();
      else if (action === 'down') await window.fifotv.volumeDown();
      else if (action === 'mute') await window.fifotv.volumeMute();
    } catch (_) {}
    if (action === 'up') currentVolume = Math.min(100, currentVolume + 5);
    else if (action === 'down') currentVolume = Math.max(0, currentVolume - 5);
    showVolumeToast();
    updateMenuBars();
  }

  async function apiShutdown() {
    try { await window.fifotv.shutdown(); } catch (_) {}
  }

  async function apiRestart() {
    try { await window.fifotv.restartApp(); } catch (_) {}
  }

  function applyZoom(delta) {
    currentZoom = Math.max(50, Math.min(150, currentZoom + delta));
    window.fifotv.zoom(delta);
    updateMenuBars();
  }

  // ─── MONITOR POPUP ────────────────────────────────────

  let monitorInterval = null;

  function showMonitorPopup() {
    const el = document.getElementById('fifotv-monitor');
    if (!el) return;
    el.classList.remove('fifotv-hidden');
    // Keep overlay capturing mouse for the popup
    if (window.fifotv && window.fifotv.setMouseEvents) window.fifotv.setMouseEvents(false);
    if (window.fifotv && window.fifotv.setFocus) window.fifotv.setFocus('overlay');
    fetchMonitorStats();
    monitorInterval = setInterval(fetchMonitorStats, 3000);
  }

  function hideMonitorPopup() {
    const el = document.getElementById('fifotv-monitor');
    if (!el) return;
    el.classList.add('fifotv-hidden');
    clearInterval(monitorInterval);
    monitorInterval = null;
    // Return mouse events to streaming page
    if (window.fifotv && window.fifotv.setMouseEvents) window.fifotv.setMouseEvents(true);
    if (window.fifotv && window.fifotv.setFocus) window.fifotv.setFocus('streaming');
  }

  async function fetchMonitorStats() {
    try {
      const data = await window.fifotv.getStats();
      const cpuFill = document.getElementById('fifotv-monitor-cpu-fill');
      const cpuVal = document.getElementById('fifotv-monitor-cpu-val');
      const ramFill = document.getElementById('fifotv-monitor-ram-fill');
      const ramVal = document.getElementById('fifotv-monitor-ram-val');
      const diskFill = document.getElementById('fifotv-monitor-disk-fill');
      const diskVal = document.getElementById('fifotv-monitor-disk-val');
      const procVal = document.getElementById('fifotv-monitor-proc-val');
      if (cpuFill) cpuFill.style.width = data.cpu + '%';
      if (cpuVal) cpuVal.textContent = data.cpu + '%';
      if (ramFill) ramFill.style.width = ((data.ram_used / data.ram_total) * 100) + '%';
      if (ramVal) ramVal.textContent = data.ram_used + ' / ' + data.ram_total + ' MB';
      if (diskFill) diskFill.style.width = ((data.disk_used / data.disk_total) * 100) + '%';
      if (diskVal) diskVal.textContent = data.disk_used + ' / ' + data.disk_total + ' MB';
      if (procVal) procVal.textContent = data.processes + ' processos';
    } catch (_) {}
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
      <div class="fifotv-ctx-item fifotv-ctx-bar-item" data-action="zoom-bar">
        ${ICON.zoomOut}
        <div class="fifotv-ctx-volume-bar">
          <div class="fifotv-ctx-volume-fill" id="fifotv-ctx-zoom-fill" style="width:${(currentZoom - 50) / 1.5}%"></div>
        </div>
        ${ICON.zoomIn}
      </div>
      <div class="fifotv-ctx-item fifotv-ctx-bar-item" data-action="vol-bar">
        ${ICON.volumeDown}
        <div class="fifotv-ctx-volume-bar">
          <div class="fifotv-ctx-volume-fill" id="fifotv-ctx-volume-fill" style="width:${currentVolume}%"></div>
        </div>
        ${ICON.volumeUp}
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

  function getMenuItems() {
    const menu = document.getElementById('fifotv-ctx');
    if (!menu) return [];
    return Array.from(menu.querySelectorAll('.fifotv-ctx-item'));
  }

  function updateMenuFocus() {
    const items = getMenuItems();
    items.forEach((el, i) => {
      el.classList.toggle('fifotv-focused', i === menuFocusIndex);
    });
  }

  function updateMenuBars() {
    const zoomFill = document.getElementById('fifotv-ctx-zoom-fill');
    const volFill = document.getElementById('fifotv-ctx-volume-fill');
    if (zoomFill) zoomFill.style.width = ((currentZoom - 50) / 1.5) + '%';
    if (volFill) volFill.style.width = currentVolume + '%';
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
    menu.classList.remove('fifotv-hidden');
    menu.style.display = '';
    menu.style.opacity = '1';

    const mw = 300, mh = menu.offsetHeight || 340;
    const pad = 12;
    menu.style.left = Math.min(x, window.innerWidth - mw - pad) + 'px';
    menu.style.top = Math.min(y, window.innerHeight - mh - pad) + 'px';

    menuVisible = true;
    menuFocusIndex = 0;
    updateMenuFocus();

    // Overlay captures mouse + keyboard for menu navigation
    if (window.fifotv && window.fifotv.setMouseEvents) window.fifotv.setMouseEvents(false);
    if (window.fifotv && window.fifotv.setFocus) window.fifotv.setFocus('overlay');
    if (window.fifotv && window.fifotv.setMenuVisibility) window.fifotv.setMenuVisibility(true);
    if (window.fifotv && window.fifotv.bringOverlayToFront) window.fifotv.bringOverlayToFront();
  }

  function hideMenu() {
    const menu = document.getElementById('fifotv-ctx');
    if (!menu || menu.classList.contains('fifotv-hidden')) return;
    menu.classList.add('fifotv-hidden');
    menu.style.display = 'none';
    menuVisible = false;
    menuFocusIndex = -1;

    // Mouse passes through to streaming + streaming gets keyboard focus
    if (window.fifotv && window.fifotv.setMouseEvents) window.fifotv.setMouseEvents(true);
    if (window.fifotv && window.fifotv.setFocus) window.fifotv.setFocus('streaming');
    if (window.fifotv && window.fifotv.setMenuVisibility) window.fifotv.setMenuVisibility(false);
    // Send overlay back only if toast is not visible
    if (!toastVisible && window.fifotv && window.fifotv.sendOverlayToBack) {
      window.fifotv.sendOverlayToBack();
    }
  }

  function toggleMenu(x, y) {
    if (menuVisible) hideMenu();
    else showMenu(x, y);
  }

  // ─── MENU ACTION HANDLER ───────────────────────────────

  function handleAction(action) {
    switch (action) {
      case 'home':
        window.fifotv.goHome();
        hideMenu();
        break;
      case 'reload':
        window.fifotv.reloadStreaming();
        hideMenu();
        break;
      case 'zoom-bar':
        // Do nothing on Enter — use D-pad left/right
        break;
      case 'vol-bar':
        // Do nothing on Enter — use D-pad left/right
        break;
      case 'monitor':
        showMonitorPopup();
        hideMenu();
        break;
      case 'settings':
        hideMenu();
        break;
      case 'shutdown':
        apiShutdown();
        hideMenu();
        break;
    }
  }

  // ─── MENU NAVIGATION (D-pad) ──────────────────────────

  function navigateMenu(direction) {
    const items = getMenuItems();
    if (items.length === 0) return;

    const focused = items[menuFocusIndex];
    const action = focused ? focused.dataset.action : null;

    // If focused on a bar item, D-pad left/right adjusts the value
    if (action === 'vol-bar' || action === 'zoom-bar') {
      if (direction === 'left') {
        if (action === 'vol-bar') apiVolume('down');
        else applyZoom(-10);
        return;
      }
      if (direction === 'right') {
        if (action === 'vol-bar') apiVolume('up');
        else applyZoom(10);
        return;
      }
    }

    // Up/down navigation
    if (direction === 'down') {
      menuFocusIndex = (menuFocusIndex + 1) % items.length;
    } else if (direction === 'up') {
      menuFocusIndex = (menuFocusIndex - 1 + items.length) % items.length;
    }
    updateMenuFocus();
  }

  function activateMenuItem() {
    const items = getMenuItems();
    if (menuFocusIndex >= 0 && menuFocusIndex < items.length) {
      const item = items[menuFocusIndex];
      const action = item.dataset ? item.dataset.action : null;
      if (action) handleAction(action);
    }
  }

  // ─── EVENT: CLICK ON MENU ITEMS ────────────────────────

  document.addEventListener('click', (e) => {
    const item = e.target.closest('[data-action]');
    if (item) {
      e.preventDefault();
      e.stopPropagation();
      handleAction(item.dataset.action);
    }
  }, true);

  // ─── EVENT: CLICK OUTSIDE ──────────────────────────────

  document.addEventListener('click', (e) => {
    if (menuVisible && !e.target.closest('#fifotv-ctx')) {
      hideMenu();
    }
    const monitorEl = document.getElementById('fifotv-monitor');
    if (monitorEl && !monitorEl.classList.contains('fifotv-hidden') && !e.target.closest('#fifotv-monitor')) {
      hideMonitorPopup();
    }
  }, true);

  // ─── KEY HANDLER (receives forwarded keys from main) ──

  function handleKey(input) {
    const key = input.key;
    const type = input.type;

    if (type !== 'keyDown') return;

    // ContextMenu key → toggle menu (always)
    if (key === 'ContextMenu') {
      if (menuVisible) hideMenu();
      else showMenu(window.innerWidth / 2, window.innerHeight / 2);
      return;
    }

    // When monitor popup is open: BrowserBack/Escape closes it
    const monitorEl = document.getElementById('fifotv-monitor');
    if (monitorEl && !monitorEl.classList.contains('fifotv-hidden')) {
      if (key === 'BrowserBack' || key === 'Escape') {
        hideMonitorPopup();
        return;
      }
      return;
    }

    // When menu is open: only handle navigation keys
    if (menuVisible) {
      // BrowserBack or Escape → close menu
      if (key === 'BrowserBack' || key === 'Escape') {
        hideMenu();
        return;
      }
      switch (key) {
        case 'ArrowDown':
          navigateMenu('down');
          return;
        case 'ArrowUp':
          navigateMenu('up');
          return;
        case 'ArrowLeft':
          navigateMenu('left');
          return;
        case 'ArrowRight':
          navigateMenu('right');
          return;
        case 'Enter':
          activateMenuItem();
          return;
        case 'Escape':
          hideMenu();
          return;
      }
      // All other keys ignored when menu is open
      return;
    }

    // ─── Menu closed: global keys ────────────────────────

    // Volume keys (key name only — keyCode is undefined in Electron 35)
    if (key === 'VolumeDown' || key === '-') {
      apiVolume('down');
      return;
    }
    if (key === 'VolumeUp' || key === '+') {
      apiVolume('up');
      return;
    }
    if (key === 'AudioVolumeMute' || key === 'm') {
      apiVolume('mute');
      return;
    }

    // BrowserHome (hold) → go home
    if (key === 'BrowserHome') {
      window.fifotv.goHome();
      return;
    }

    // Other keys
    switch (key) {
      case 'Home':
        window.fifotv.goHome();
        break;
      case 'MediaPlayPause':
        apiVolume('mute');
        break;
      case 'MediaStop':
        break;
      case 'F1':
        break;
      case 'F5':
        window.fifotv.reloadStreaming();
        break;
      case 'F8':
        break;
      case 'F9':
        apiShutdown();
        break;
      case 'F12':
        apiRestart();
        break;
    }
  }

  // ─── LISTEN FOR FORWARDED KEYS FROM MAIN PROCESS ───────

  if (window.fifotv && window.fifotv.onKey) {
    window.fifotv.onKey(handleKey);
  }

  // ─── NATIVE DOM KEYDOWN (overlay has focus as topmost view) ──

  document.addEventListener('keydown', (e) => {
    handleKey({ key: e.key, code: e.code, type: 'keyDown' });
  }, true);

  // ─── LISTEN FOR SHOW/HIDE MENU FROM MAIN PROCESS ───────

  if (window.fifotv && window.fifotv.onShowMenu) {
    window.fifotv.onShowMenu((data) => {
      showMenu(data.x, data.y);
    });
  }

  if (window.fifotv && window.fifotv.onHideMenu) {
    window.fifotv.onHideMenu(() => {
      hideMenu();
    });
  }

  // ─── INIT: Fetch current volume ────────────────────────

  async function initVolume() {
    try {
      const data = await window.fifotv.getVolume();
      if (data && data.volume !== undefined) currentVolume = data.volume;
    } catch (_) {}
  }

  initVolume();
})();
