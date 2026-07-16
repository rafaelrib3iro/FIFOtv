const ICON = {
    settings: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    wifi: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="0.8" fill="currentColor" stroke="none"/></svg>',
    bluetooth: '<svg width="14" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5"/></svg>',
    tv: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>',
    monitor: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
    info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    trash: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    home: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    refresh: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>',
    power: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="12"/><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/></svg>',
    chevronUp: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>',
    chevronDown: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
    x: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    arrowLeft: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
    zoomIn: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>',
    zoomOut: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>',
    clock: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    globe: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    download: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    volumeUp: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>',
    volumeDown: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>',
    infoCircle: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
};

const PALETTES = [
    // Greens / Teals
    ["#0d2818", "#1a3a2a", "#0a1e3d"],
    ["#1a2e1a", "#0d3b2a", "#1a3040"],
    ["#1e3a2a", "#2a1e3a", "#1a2a1e"],
    ["#0a3d2e", "#1a4a3a", "#0d2e3e"],
    ["#1a4a2e", "#2e4a1a", "#1a3a4a"],
    // Blues / Deep
    ["#1a1a2e", "#16213e", "#0f3460"],
    ["#0d1b2a", "#1b2838", "#1a1a3e"],
    ["#0d2e3e", "#1a3e5a", "#1a2a4a"],
    ["#1a2a3e", "#0d3a5a", "#1a3a4e"],
    ["#0a1e3d", "#1a3060", "#0d2850"],
    // Purples
    ["#2d1b4e", "#1b2838", "#1a1a2e"],
    ["#1a0a2e", "#0d1b2a", "#1b2838"],
    ["#2e1a4a", "#1a2e3e", "#2e1a3e"],
    ["#3a1a5a", "#1a2a4a", "#2e1a4a"],
    ["#2a1a4e", "#1a3a5a", "#3a1a4e"],
    // Warm / Earth
    ["#2e1a1a", "#3a2a1a", "#2e1a2e"],
    ["#3a2a1a", "#1a3a2e", "#2e3a3a"],
    ["#4a2a1a", "#2e3a2a", "#3a2a3a"],
    ["#3a1a1a", "#4a3a2a", "#3a2a2a"],
    ["#5a3a1a", "#3a4a2a", "#4a3a3a"],
    // Sunset / Warm
    ["#4a1a2a", "#3a2a1a", "#2a1a3a"],
    ["#5a2a1a", "#3a3a2a", "#4a2a2a"],
    ["#6a3a1a", "#4a4a2a", "#5a3a2a"],
    ["#3a1a2a", "#5a3a1a", "#4a2a3a"],
    ["#4a2a1a", "#3a4a3a", "#5a2a2a"],
    // Cool / Slate
    ["#1a2a3a", "#2a3a4a", "#1a3a4a"],
    ["#2a3a4a", "#1a2a3a", "#3a4a5a"],
    ["#1a3a4a", "#2a4a5a", "#1a2a4a"],
    ["#2a4a5a", "#1a3a5a", "#3a4a6a"],
    ["#1a4a5a", "#2a3a6a", "#1a4a6a"],
    // Dark / Moody
    ["#0a0a1a", "#1a1a2a", "#0a1a2a"],
    ["#1a0a2a", "#0a1a1a", "#1a1a0a"],
    ["#0a1a2a", "#1a2a1a", "#0a0a2a"],
    ["#1a1a1a", "#2a1a0a", "#1a2a1a"],
    ["#0a2a1a", "#1a0a1a", "#2a1a2a"],
    // Vibrant accents
    ["#1a3a2a", "#0a4a3a", "#1a2a4a"],
    ["#2a1a4a", "#1a3a2a", "#3a2a1a"],
    ["#1a4a4a", "#4a1a2a", "#2a3a4a"],
    ["#3a4a1a", "#1a2a4a", "#4a1a3a"],
    ["#2a4a2a", "#4a2a4a", "#1a4a2a"]
];

const SS_TIMEOUT = 15 * 60 * 1000;
const DPMS_TIMEOUT = 60 * 60 * 1000;

// Sound effects
const SFX = {
    hover: new Audio('assets/sounds/hover.mp3'),
    select: new Audio('assets/sounds/opencard.mp3'),
    notification: new Audio('assets/sounds/notification.mp3'),
    splash: new Audio('assets/sounds/splash.mp3')
};
Object.values(SFX).forEach(a => { a.volume = 0.3; a.preload = 'auto'; });

function playSound(name) {
    const sfx = SFX[name];
    if (sfx) { sfx.currentTime = 0; sfx.play().catch(() => {}); }
}

// Usage tracking
let usageCounts = {};

function loadUsageCounts() {
    try {
        const saved = localStorage.getItem('fifotv_usage');
        usageCounts = saved ? JSON.parse(saved) : {};
    } catch (e) {
        usageCounts = {};
    }
}

function saveUsageCounts() {
    localStorage.setItem('fifotv_usage', JSON.stringify(usageCounts));
}

function trackUsage(id) {
    usageCounts[id] = (usageCounts[id] || 0) + 1;
    saveUsageCounts();
}

function getMostUsed() {
    return streamings
        .map(s => ({ ...s, count: usageCounts[s.id] || 0 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 4)
        .filter(s => s.count > 0);
}

let focusedIndex = 0;
let streamings = [];
let ssTimer = null;
let dpmsTimer = null;
let initialRender = true;

// Navigation state machine
// States: 'grid', 'header', 'context-menu', 'settings-popup', 'settings-item', 'settings-sub-item', 'add-popup', 'wifi-modal'
let navState = 'grid';
let settingsSectionIndex = 0;
let settingsItemIndex = 0;
let settingsSubItemIndex = 0;

const settingsPopup = new Popup('settings-popup');
const addPopup = new Popup('add-popup');
const monitorPopup = new Popup('monitor-popup');
const wifiModal = new Popup('wifi-modal');
let activeWifiModal = null;

const popupNav = new PopupNavigator();

popupNav.register('add-popup', {
    getFocusables: () => [document.getElementById('add-url'), document.getElementById('add-name'), document.getElementById('add-cancel'), document.getElementById('add-confirm')].filter(Boolean),
    onClose: () => { addPopup.hide(false); navState = 'grid'; }
});

popupNav.register('wifi-modal', {
    getFocusables: () => [document.getElementById('wifi-pass-input'), document.getElementById('wifi-pass-cancel'), document.getElementById('wifi-pass-confirm')].filter(Boolean),
    onClose: () => { document.getElementById('wifi-pass-cancel').click(); }
});

popupNav.register('context-menu', {
    getFocusables: () => {
        const menu = document.getElementById('context-menu');
        return Array.from(menu.querySelectorAll('.context-menu-item')).filter(el => el.offsetParent !== null);
    },
    onHighlight: (items, idx) => {
        items.forEach((el, i) => {
            el.classList.toggle('fifotv-focused', i === idx);
        });
    },
    onEnter: (items, idx) => {
        const item = items[idx];
        if (!item) return;
        if (item.dataset.action === 'vol-bar') return;
        item.click();
    },
    onClose: () => { hideContextMenu(); navState = 'grid'; }
});

popupNav.register('header', {
    getFocusables: () => Array.from(document.querySelectorAll('.pill')),
    onEnter: (items, idx) => {
        if (items[idx]) items[idx].click();
    },
    onClose: () => {
        navState = 'grid';
        document.activeElement.blur();
        document.querySelectorAll('.pill.fifotv-focused').forEach(el => el.classList.remove('fifotv-focused'));
        focusedIndex = 0;
        updateFocus();
    }
});

function applyRandomPalette() {
    const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
    const angle = Math.floor(Math.random() * 360);
    document.body.style.backgroundImage = `linear-gradient(${angle}deg, ${palette[0]}, ${palette[1]}, ${palette[2]})`;
}

function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
                    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const dateStr = `${days[now.getDay()]}, ${now.getDate()} de ${months[now.getMonth()]}`;

    document.getElementById('clock').textContent = timeStr;
    document.getElementById('date').textContent = dateStr;
    document.getElementById('screensaver-clock').textContent = timeStr;
    document.getElementById('screensaver-date').textContent = dateStr;
}

async function loadStreamings() {
    try {
        const data = await window.fifotv.getStreamings();
        streamings = data.streamings;
    } catch (e) {
        streamings = [];
        showToast('Não foi possível carregar o catálogo de streamings');
    }
    renderGrid();
}

function renderGrid() {
    const recentsGrid = document.getElementById('recents-grid');
    const mainGrid = document.getElementById('grid');
    const recentsSection = document.getElementById('recents-section');
    const focusedCard = document.querySelector(`.card[data-pos="${focusedIndex}"]`);
    const focusedStreamingId = focusedCard ? Number(focusedCard.dataset.streamingId) : null;
    recentsGrid.innerHTML = '';
    mainGrid.innerHTML = '';

    const mostUsed = getMostUsed();
    const recentsCount = mostUsed.length;
    recentsSection.style.display = recentsCount > 0 ? '' : 'none';

    // Render Mais Usados
    mostUsed.forEach((s, i) => {
        const card = document.createElement('div');
        card.className = 'card card-sm';
        card.dataset.pos = i;
        card.dataset.streamingId = s.id;
        const icon = document.createElement('div');
        icon.className = 'card-icon';
        appendStreamingIcon(icon, s);
        card.appendChild(icon);
        recentsGrid.appendChild(card);
    });

    // Render main grid (streamings + add button)
    const totalSlots = 12;

    streamings.forEach((s, i) => {
        const pos = recentsCount + i;
        const card = document.createElement('div');
        card.className = 'card card-sm';
        card.dataset.pos = pos;
        card.dataset.streamingId = s.id;
        const icon = document.createElement('div');
        icon.className = 'card-icon';
        appendStreamingIcon(icon, s);
        const title = document.createElement('div');
        title.className = 'card-title';
        title.textContent = s.name;
        card.append(icon, title);
        mainGrid.appendChild(card);
    });

    // Add button
    const addCard = document.createElement('div');
    addCard.className = 'card card-sm card-add';
    addCard.dataset.pos = recentsCount + streamings.length;
    addCard.dataset.action = 'add';
    const addIcon = document.createElement('div');
    addIcon.className = 'card-icon';
    addIcon.textContent = '+';
    addCard.appendChild(addIcon);
    mainGrid.appendChild(addCard);

    // Empty slots
    for (let i = streamings.length + 1; i < totalSlots; i++) {
        const emptyCard = document.createElement('div');
        emptyCard.className = 'card card-sm card-empty';
        emptyCard.dataset.pos = recentsCount + i;
        mainGrid.appendChild(emptyCard);
    }

    if (Number.isSafeInteger(focusedStreamingId)) {
        const matchingCard = document.querySelector(`.card[data-streaming-id="${focusedStreamingId}"]`);
        if (matchingCard) focusedIndex = Number(matchingCard.dataset.pos);
    }

    // Click handlers for all cards
    document.querySelectorAll('.card[data-pos]').forEach(card => {
        card.addEventListener('click', () => {
            focusedIndex = parseInt(card.dataset.pos);
            updateFocus();
            activateCard(focusedIndex);
        });
    });

    updateFocus();
}

function appendStreamingIcon(container, streaming, imageStyle = '') {
    const fallback = () => {
        const label = document.createElement('span');
        label.className = 'fallback';
        label.textContent = streaming.name ? streaming.name[0] : '?';
        container.replaceChildren(label);
    };

    if (!streaming.slug) {
        fallback();
        return;
    }

    const image = document.createElement('img');
    image.src = `assets/icons/${encodeURIComponent(streaming.slug)}.svg`;
    image.alt = streaming.name || streaming.slug;
    image.style.cssText = imageStyle;
    image.addEventListener('error', () => {
        image.src = `https://cdn.simpleicons.org/${encodeURIComponent(streaming.slug)}/white`;
        image.addEventListener('error', fallback, { once: true });
    }, { once: true });
    container.appendChild(image);
}

function updateFocus() {
    if (!initialRender) playSound('hover');
    initialRender = false;
    document.querySelectorAll('.card').forEach(c => c.classList.remove('fifotv-focused'));
    const target = document.querySelector(`.card[data-pos="${focusedIndex}"]`);
    if (target) target.classList.add('fifotv-focused');
}

function handleKeydown(e) {
    resetScreensaverTimers();

    // ─── AIR MOUSE BUTTON MAPPING ──────────────────────
    // BrowserBack: always handle (even when input is focused) to close popups
    if (e.key === 'BrowserBack' || e.key === 'GoBack' || e.keyCode === 166) {
        if (!window._backPressStart) {
            window._backPressStart = Date.now();
            window._backTimer = setTimeout(() => {
                closeAllPopups();
                navState = 'grid';
                focusedIndex = 0;
                updateFocus();
                window._backPressStart = null;
            }, 600);
        }
        e.preventDefault();
        return;
    }

    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        // Popup navigator handles arrows/escape even when input is focused
        if (['add-popup', 'wifi-modal'].includes(navState) && ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            popupNav.handle(e, navState);
        }
        return;
    }

    console.log(`[FIFOtv Key] key="${e.key}" code="${e.code}" keyCode=${e.keyCode} which=${e.which}`);

    if (e.key === 'Escape' || e.keyCode === 8) {
        if (navState === 'grid') {
            if (!window._backPressStart) {
                window._backPressStart = Date.now();
                window._backTimer = setTimeout(() => {
                    closeAllPopups();
                    navState = 'grid';
                    focusedIndex = 0;
                    updateFocus();
                    window._backPressStart = null;
                }, 600);
            }
            e.preventDefault();
            return;
        }
        // Non-grid: fall through to nav-specific handlers and global escape
    }

    // Volume: handled via IPC from main process (globalShortcut captures OS media keys)
    // Fallback: keyboard volume keys still work if air mouse sends them
    if (e.keyCode === 174 || e.key === 'VolumeDown') {
        e.preventDefault();
        changeVolume('down');
        return;
    }
    if (e.keyCode === 175 || e.key === 'VolumeUp') {
        e.preventDefault();
        changeVolume('up');
        return;
    }

    // Map other air mouse remote keys
    const airMouseMap = {
        'BrowserHome':   () => { closeAllPopups(); navState = 'grid'; focusedIndex = 0; updateFocus(); window.fifotv.goHome(); },
        'ContextMenu':   () => {
            if (monitorPopup.isVisible()) {
                hideMonitorPopup();
                return;
            }
            const menu = document.getElementById('context-menu');
            if (!menu.classList.contains('hidden')) { hideContextMenu(); }
            else { showContextMenu({ clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 }); }
        },
        'BrowserForward': () => {},
        'F1':  () => { showSettingsPopup(); },
        'F5':  () => { showMonitorPopup(); },
        'F8':  () => { history.back(); },
        'F9':  () => { window.fifotv.shutdown(); },
        'F12': () => { window.fifotv.restartApp(); },
    };

    if (airMouseMap[e.key]) {
        e.preventDefault();
        airMouseMap[e.key]();
        return;
    }

    // Global escape handler — always close popups
    if (e.key === 'Escape') {
        if (navState === 'context-menu' || navState === 'header') { popupNav.handle(e, navState); return; }
        if (navState === 'settings-popup' || navState === 'settings-item' || navState === 'settings-sub-item') { closeAllPopups(); e.preventDefault(); return; }
        if (navState === 'add-popup' || navState === 'wifi-modal') { popupNav.handle(e, navState); return; }
    }

    switch (navState) {
        case 'grid':
            handleGridNav(e);
            break;
        case 'context-menu': {
            const menu = document.getElementById('context-menu');
            const focused = menu.querySelector('.context-menu-item.fifotv-focused');
            if (focused && focused.dataset.action === 'vol-bar' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
                changeVolume(e.key === 'ArrowLeft' ? 'down' : 'up');
                e.preventDefault();
            } else {
                popupNav.handle(e, navState);
            }
            break;
        }
        case 'settings-popup':
            handleSettingsNav(e);
            break;
        case 'settings-item':
            handleSettingsItemNav(e);
            break;
        case 'settings-sub-item':
            handleSettingsSubItemNav(e);
            break;
        case 'header': {
            if (e.key === 'ArrowDown') {
                navState = 'grid';
                document.activeElement.blur();
                document.querySelectorAll('.pill.fifotv-focused').forEach(el => el.classList.remove('fifotv-focused'));
                focusedIndex = 0;
                updateFocus();
                e.preventDefault();
            } else {
                popupNav.handle(e, navState);
            }
            break;
        }
        case 'add-popup':
        case 'wifi-modal':
            popupNav.handle(e, navState);
            break;
    }
}

function handleGridNav(e) {
    const mostUsed = getMostUsed();
    const hasRecents = mostUsed.length > 0;
    const recentsCount = mostUsed.length;
    const totalSlots = 12;
    const totalPositions = recentsCount + totalSlots;
    const mainCols = 6;

    function isFocusable(idx) {
        if (idx < 0 || idx >= totalPositions) return false;
        if (idx < recentsCount) return hasRecents;
        const gridIdx = idx - recentsCount;
        return gridIdx <= streamings.length;
    }

    function findNext(from, dir) {
        let idx = from;
        for (let i = 0; i < totalPositions + 2; i++) {
            idx += dir;
            if (idx >= totalPositions) idx = 0;
            if (idx < 0) idx = totalPositions - 1;
            if (isFocusable(idx)) return idx;
        }
        return from;
    }

    switch (e.key) {
        case 'ArrowRight':
            focusedIndex = findNext(focusedIndex, 1);
            updateFocus();
            e.preventDefault();
            break;
        case 'ArrowLeft':
            focusedIndex = findNext(focusedIndex, -1);
            updateFocus();
            e.preventDefault();
            break;
        case 'ArrowDown': {
            e.preventDefault();
            if (hasRecents && focusedIndex < recentsCount) {
                const srcCol = focusedIndex;
                const target = Math.min(recentsCount + srcCol, totalPositions - 1);
                if (isFocusable(target)) focusedIndex = target;
            } else if (focusedIndex >= recentsCount) {
                const gridIdx = focusedIndex - recentsCount;
                const col = gridIdx % mainCols;
                const row = Math.floor(gridIdx / mainCols);
                const nextRowStart = recentsCount + (row + 1) * mainCols + col;
                if (nextRowStart < totalPositions && isFocusable(nextRowStart)) {
                    focusedIndex = nextRowStart;
                }
            }
            updateFocus();
            break;
        }
        case 'ArrowUp': {
            e.preventDefault();
            if (hasRecents && focusedIndex < recentsCount) {
                // Recents → header pills
                document.querySelectorAll('.card').forEach(c => c.classList.remove('fifotv-focused'));
                const pill = document.getElementById('btn-settings');
                if (pill) pill.focus();
                navState = 'header';
                return;
            } else if (hasRecents && focusedIndex >= recentsCount && focusedIndex < recentsCount + mainCols) {
                // First row of main grid → recents
                const gridCol = focusedIndex - recentsCount;
                if (gridCol < recentsCount) {
                    focusedIndex = gridCol;
                }
            } else if (!hasRecents && focusedIndex < mainCols) {
                // No recents, first row → header pills
                document.querySelectorAll('.card').forEach(c => c.classList.remove('fifotv-focused'));
                const pill = document.getElementById('btn-settings');
                if (pill) pill.focus();
                navState = 'header';
                return;
            } else if (focusedIndex >= recentsCount) {
                // Main grid → previous row
                const gridIdx = focusedIndex - recentsCount;
                const col = gridIdx % mainCols;
                const row = Math.floor(gridIdx / mainCols);
                const prevRowStart = recentsCount + (row - 1) * mainCols + col;
                if (prevRowStart >= recentsCount && isFocusable(prevRowStart)) {
                    focusedIndex = prevRowStart;
                }
            }
            updateFocus();
            break;
        }
        case 'Enter':
            activateCard(focusedIndex);
            e.preventDefault();
            break;
        case 'Escape':
            closeAllPopups();
            e.preventDefault();
            break;
        case 'Backspace':
            history.back();
            e.preventDefault();
            break;
    }
}

function clearSettingsFocus() {
    const popup = document.getElementById('settings-popup');
    if (popup) popup.querySelectorAll('.fifotv-focused').forEach(el => el.classList.remove('fifotv-focused'));
}

function handleSettingsNav(e) {
    const popup = document.getElementById('settings-popup');
    const sidebarItems = popup.querySelectorAll('.settings-sidebar-item');
    
    switch (e.key) {
        case 'ArrowDown':
            clearSettingsFocus();
            settingsSectionIndex = Math.min(settingsSectionIndex + 1, sidebarItems.length - 1);
            settingsItemIndex = 0;
            sidebarItems[settingsSectionIndex].click();
            sidebarItems[settingsSectionIndex].classList.add('fifotv-focused');
            playSound('hover');
            e.preventDefault();
            break;
        case 'ArrowUp':
            clearSettingsFocus();
            settingsSectionIndex = Math.max(settingsSectionIndex - 1, 0);
            settingsItemIndex = 0;
            sidebarItems[settingsSectionIndex].click();
            sidebarItems[settingsSectionIndex].classList.add('fifotv-focused');
            playSound('hover');
            e.preventDefault();
            break;
        case 'ArrowRight': {
            clearSettingsFocus();
            const activeSection = popup.querySelector('.settings-section.active');
            if (activeSection) {
                const contentItems = activeSection.querySelectorAll('.streaming-item, .system-btn, button.btn-primary');
                const firstItem = contentItems[0];
                if (firstItem) {
                    firstItem.classList.add('fifotv-focused');
                    firstItem.focus();
                    settingsItemIndex = 0;
                    navState = 'settings-item';
                }
            }
            e.preventDefault();
            break;
        }
        case 'ArrowLeft':
            clearSettingsFocus();
            sidebarItems[settingsSectionIndex].classList.add('fifotv-focused');
            sidebarItems[settingsSectionIndex].focus();
            e.preventDefault();
            break;
        case 'Escape':
            closeAllPopups();
            navState = 'grid';
            e.preventDefault();
            break;
    }
}

function handleSettingsItemNav(e) {
    const popup = document.getElementById('settings-popup');
    const sidebarItems = popup.querySelectorAll('.settings-sidebar-item');
    const activeSection = popup.querySelector('.settings-section.active');
    if (!activeSection) { navState = 'settings-popup'; return; }

    const items = activeSection.querySelectorAll('.streaming-item, .system-btn, button.btn-primary');
    const visibleItems = Array.from(items).filter(el => el.offsetParent !== null);
    if (visibleItems.length === 0) { navState = 'settings-popup'; return; }

    switch (e.key) {
        case 'ArrowDown':
            clearSettingsFocus();
            settingsItemIndex = Math.min(settingsItemIndex + 1, visibleItems.length - 1);
            visibleItems[settingsItemIndex].classList.add('fifotv-focused');
            visibleItems[settingsItemIndex].focus();
            playSound('hover');
            e.preventDefault();
            break;
        case 'ArrowUp':
            clearSettingsFocus();
            settingsItemIndex = Math.max(settingsItemIndex - 1, 0);
            visibleItems[settingsItemIndex].classList.add('fifotv-focused');
            visibleItems[settingsItemIndex].focus();
            playSound('hover');
            e.preventDefault();
            break;
        case 'ArrowLeft':
            clearSettingsFocus();
            navState = 'settings-popup';
            sidebarItems[settingsSectionIndex].classList.add('fifotv-focused');
            sidebarItems[settingsSectionIndex].focus();
            e.preventDefault();
            break;
        case 'ArrowRight': {
            const el = visibleItems[settingsItemIndex];
            const subBtns = el ? Array.from(el.querySelectorAll('.btn-icon')) : [];
            if (subBtns.length > 0) {
                clearSettingsFocus();
                settingsSubItemIndex = 0;
                navState = 'settings-sub-item';
                subBtns[0].classList.add('fifotv-focused');
                subBtns[0].focus();
                playSound('hover');
            }
            e.preventDefault();
            break;
        }
        case 'Escape':
            closeAllPopups();
            navState = 'grid';
            e.preventDefault();
            break;
        case 'Enter':
            if (visibleItems[settingsItemIndex]) {
                const el = visibleItems[settingsItemIndex];
                if (el.classList.contains('streaming-item')) {
                    const btn = el.querySelector('.btn-icon');
                    if (btn) btn.click();
                    else el.click();
                } else {
                    el.click();
                }
            }
            e.preventDefault();
            break;
    }
}

function handleSettingsSubItemNav(e) {
    const popup = document.getElementById('settings-popup');
    const sidebarItems = popup.querySelectorAll('.settings-sidebar-item');
    const activeSection = popup.querySelector('.settings-section.active');
    if (!activeSection) { navState = 'settings-popup'; return; }

    const items = activeSection.querySelectorAll('.streaming-item, .system-btn, button.btn-primary');
    const visibleItems = Array.from(items).filter(el => el.offsetParent !== null);
    if (visibleItems.length === 0) { navState = 'settings-popup'; return; }

    const currentItem = visibleItems[settingsItemIndex];
    if (!currentItem) { navState = 'settings-item'; return; }

    const subButtons = Array.from(currentItem.querySelectorAll('.btn-icon'));
    if (subButtons.length === 0) { navState = 'settings-item'; return; }

    switch (e.key) {
        case 'ArrowRight':
            clearSettingsFocus();
            settingsSubItemIndex = Math.min(settingsSubItemIndex + 1, subButtons.length - 1);
            subButtons[settingsSubItemIndex].classList.add('fifotv-focused');
            subButtons[settingsSubItemIndex].focus();
            playSound('hover');
            e.preventDefault();
            break;
        case 'ArrowLeft':
            if (settingsSubItemIndex === 0) {
                clearSettingsFocus();
                navState = 'settings-item';
                currentItem.classList.add('fifotv-focused');
                currentItem.focus();
            } else {
                clearSettingsFocus();
                settingsSubItemIndex--;
                subButtons[settingsSubItemIndex].classList.add('fifotv-focused');
                subButtons[settingsSubItemIndex].focus();
            }
            playSound('hover');
            e.preventDefault();
            break;
        case 'ArrowDown':
            clearSettingsFocus();
            settingsSubItemIndex = 0;
            settingsItemIndex = Math.min(settingsItemIndex + 1, visibleItems.length - 1);
            const nextBtns = Array.from(visibleItems[settingsItemIndex].querySelectorAll('.btn-icon'));
            if (nextBtns.length > 0) {
                navState = 'settings-sub-item';
                nextBtns[0].classList.add('fifotv-focused');
                nextBtns[0].focus();
            } else {
                navState = 'settings-item';
                visibleItems[settingsItemIndex].classList.add('fifotv-focused');
                visibleItems[settingsItemIndex].focus();
            }
            playSound('hover');
            e.preventDefault();
            break;
        case 'ArrowUp':
            clearSettingsFocus();
            settingsSubItemIndex = 0;
            settingsItemIndex = Math.max(settingsItemIndex - 1, 0);
            const prevBtns = Array.from(visibleItems[settingsItemIndex].querySelectorAll('.btn-icon'));
            if (prevBtns.length > 0) {
                navState = 'settings-sub-item';
                prevBtns[0].classList.add('fifotv-focused');
                prevBtns[0].focus();
            } else {
                navState = 'settings-item';
                visibleItems[settingsItemIndex].classList.add('fifotv-focused');
                visibleItems[settingsItemIndex].focus();
            }
            playSound('hover');
            e.preventDefault();
            break;
        case 'Enter':
            if (subButtons[settingsSubItemIndex]) {
                subButtons[settingsSubItemIndex].click();
            }
            e.preventDefault();
            break;
        case 'Escape':
            clearSettingsFocus();
            navState = 'settings-item';
            currentItem.classList.add('fifotv-focused');
            currentItem.focus();
            e.preventDefault();
            break;
    }
}

function activateCard(pos) {
    playSound('select');
    const card = document.querySelector(`.card[data-pos="${pos}"]`);
    if (!card) return;

    if (card.dataset.action === 'add') {
        showAddPopup();
        return;
    }

    const id = Number(card.dataset.streamingId);
    const s = window.FIFOtvCardResolution.resolveStreamingById(streamings, id);
    if (s && s.url) {
        trackUsage(s.id);
        renderGrid();
        showTransition(s);
    }
}

function showTransition(streaming) {
    if (typeof window.fifotv !== 'undefined' && window.fifotv.openStreaming) {
        window.fifotv.openStreaming(streaming.url, streaming.name, streaming.slug);
    } else {
        window.location.href = streaming.url;
    }
}

function showAddPopup() {
    const popup = document.getElementById('add-popup');
    navState = 'add-popup';
    popup.style.width = '420px';
    popup.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
            ${ICON.plus}
            <h3 style="font-weight:500;font-size:17px;">Adicionar Streaming</h3>
        </div>
        <div style="display:flex;gap:16px;margin-bottom:20px;">
            <div id="add-preview" style="width:64px;height:64px;border-radius:16px;background:rgba(255,255,255,0.06);border:1px solid var(--pill-border);display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;">
                <span style="font-size:24px;color:var(--text-dim);">?</span>
            </div>
            <div style="flex:1;display:flex;flex-direction:column;gap:10px;">
                <input type="text" id="add-url" placeholder="https://exemplo.com" style="width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--pill-border);background:rgba(255,255,255,0.06);color:white;font-family:inherit;font-size:13px;">
                <input type="text" id="add-name" placeholder="Nome do serviço" style="width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--pill-border);background:rgba(255,255,255,0.06);color:white;font-family:inherit;font-size:13px;">
            </div>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;">
            <button id="add-cancel" class="btn-primary" style="border:1px solid var(--pill-border);background:transparent;">Cancelar</button>
            <button id="add-confirm" class="btn-primary">Adicionar</button>
        </div>
    `;
    addPopup.show();

    const urlInput = document.getElementById('add-url');
    const nameInput = document.getElementById('add-name');
    const preview = document.getElementById('add-preview');

    urlInput.addEventListener('input', () => {
        const url = urlInput.value.trim();
        if (!url) { setAddPreview(preview); return; }
        try {
            const hostname = new URL(url.startsWith('http') ? url : 'https://' + url).hostname.replace('www.', '');
            const slug = hostname.split('.')[0];
            setAddPreview(preview, slug);
            if (!nameInput.value) nameInput.value = slug.charAt(0).toUpperCase() + slug.slice(1);
        } catch (e) {
            setAddPreview(preview);
        }
    });

    document.getElementById('add-cancel').onclick = () => { addPopup.hide(false); navState = 'grid'; };
    document.getElementById('add-confirm').onclick = async () => {
        const url = urlInput.value;
        const name = nameInput.value;
        if (url && name) {
            const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '');
            await window.fifotv.addStreaming({ id: Date.now(), name, slug, url });
            addPopup.hide(false);
            navState = 'grid';
            loadStreamings();
            showToast(`${name} adicionado`);
        }
    };
}

function setAddPreview(preview, slug) {
    preview.replaceChildren();
    if (!slug) {
        const placeholder = document.createElement('span');
        placeholder.textContent = '?';
        placeholder.style.cssText = 'font-size:24px;color:var(--text-dim);';
        preview.appendChild(placeholder);
        return;
    }
    appendStreamingIcon(preview, { name: slug[0].toUpperCase(), slug }, 'width:48px;height:48px;filter:brightness(0) invert(1);');
}

let settingsSection = 'streamings';

function showSettingsPopup() {
    const popup = document.getElementById('settings-popup');
    popup.className = 'popup settings-popup';
    navState = 'settings-popup';
    settingsSectionIndex = 0;

    const sections = [
        { id: 'streamings', icon: ICON.tv, label: 'Streamings' },
        { id: 'wifi', icon: ICON.wifi, label: 'Wi-Fi' },
        { id: 'bluetooth', icon: ICON.bluetooth, label: 'Bluetooth' },
        { id: 'system', icon: ICON.monitor, label: 'Sistema' }
    ];

    popup.innerHTML = `
        <div class="settings-sidebar">
            ${sections.map(s => `
                <div class="settings-sidebar-item ${s.id === settingsSection ? 'active' : ''}" data-section="${s.id}">
                    ${s.icon} ${s.label}
                </div>
            `).join('')}
        </div>
        <div class="settings-content">
            <div class="settings-section ${settingsSection === 'streamings' ? 'active' : ''}" id="section-streamings">
                <div class="settings-section-title">Streamings</div>
                <div id="streamings-list"></div>
                <button class="btn-primary" id="btn-add-streaming" style="margin-top:12px;">+ Adicionar novo</button>
            </div>
            <div class="settings-section ${settingsSection === 'wifi' ? 'active' : ''}" id="section-wifi">
                <div class="settings-section-title">Wi-Fi</div>
                <div id="wifi-info" class="info-grid" style="margin-bottom:16px;">
                    <span class="info-label">Rede atual:</span>
                    <span class="info-value" id="wifi-current">Carregando...</span>
                </div>
                <div class="info-label" style="margin-bottom:8px;">Redes disponíveis:</div>
                <div id="wifi-list"></div>
            </div>
            <div class="settings-section ${settingsSection === 'bluetooth' ? 'active' : ''}" id="section-bluetooth">
                <div class="settings-section-title">Bluetooth</div>
                <div id="bt-info" class="info-grid" style="margin-bottom:16px;">
                    <span class="info-label">Dispositivo conectado:</span>
                    <span class="info-value" id="bt-current">Carregando...</span>
                </div>
                <div class="info-label" style="margin-bottom:8px;">Dispositivos pareados:</div>
                <div id="bt-list"></div>
            </div>
            <div class="settings-section ${settingsSection === 'system' ? 'active' : ''}" id="section-system">
                <div class="settings-section-title">Sistema</div>
                <button class="system-btn" onclick="window.fifotv.shutdown()">${ICON.power} Desligar máquina</button>
                <button class="system-btn" onclick="window.fifotv.reboot()">${ICON.refresh} Reiniciar máquina</button>
                <button class="system-btn" onclick="window.fifotv.restartApp()">${ICON.globe} Reiniciar FIFOtv</button>
            </div>
        </div>
    `;

    settingsPopup.show();

    popup.querySelectorAll('.settings-sidebar-item').forEach(item => {
        item.onclick = () => {
            const newSection = item.dataset.section;
            if (newSection === settingsSection) return;
            
            const content = popup.querySelector('.settings-content');
            
            // Fade out
            content.classList.add('fading');
            
            setTimeout(() => {
                settingsSection = newSection;
                // Update sidebar active state
                popup.querySelectorAll('.settings-sidebar-item').forEach(s => s.classList.remove('active'));
                item.classList.add('active');
                // Hide all sections, show new one
                popup.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
                const newEl = document.getElementById('section-' + newSection);
                if (newEl) newEl.classList.add('active');
                // Re-render content for the new section
                if (newSection === 'streamings') renderStreamingsList();
                if (newSection === 'wifi') loadWifiSection();
                if (newSection === 'bluetooth') loadBluetoothSection();
                // Fade in
                content.classList.remove('fading');
            }, 150);
        };
    });

    document.getElementById('btn-add-streaming').onclick = () => {
        settingsPopup.hide(false);
        showAddPopup();
    };

    renderStreamingsList();
    if (settingsSection === 'wifi') loadWifiSection();
    if (settingsSection === 'bluetooth') loadBluetoothSection();
}

async function loadWifiSection() {
    const info = document.getElementById('wifi-current');
    const list = document.getElementById('wifi-list');
    if (!info || !list) return;
    info.textContent = 'Carregando...';
    list.innerHTML = '<div style="color:var(--text-dim);font-size:13px;">Escaneando redes...</div>';
    try {
        const [status, scan] = await Promise.all([
            window.fifotv.wifiStatus(),
            window.fifotv.wifiScan()
        ]);
        info.textContent = status.connected ? status.ssid : 'Desconectado';
        info.style.color = status.connected ? '#4ade80' : '#f87171';
        if (scan.networks && scan.networks.length > 0) {
            list.replaceChildren();
            scan.networks.forEach((network) => {
                const item = document.createElement('div');
                item.className = 'streaming-item';
                item.tabIndex = 0;
                item.style.cursor = 'pointer';
                item.addEventListener('click', () => connectWifi(network.ssid, network.security));

                const icon = document.createElement('div');
                icon.className = 'streaming-item-icon';
                const strongSignal = network.signal > 60;
                icon.style.cssText = `background:${strongSignal ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.06)'};border:1px solid ${strongSignal ? 'rgba(74,222,128,0.3)' : 'var(--pill-border)'};min-width:36px;min-height:36px;display:flex;align-items:center;justify-content:center;`;
                icon.innerHTML = ICON.wifi;

                const details = document.createElement('div');
                details.className = 'streaming-item-info';
                const name = document.createElement('div');
                name.className = 'streaming-item-name';
                name.textContent = network.ssid;
                const security = document.createElement('div');
                security.className = 'streaming-item-url';
                security.textContent = `${network.security || 'Aberta'} · ${network.signal}%`;
                details.append(name, security);
                item.append(icon, details);
                list.appendChild(item);
            });
        } else {
            list.innerHTML = '<div style="color:var(--text-dim);font-size:13px;">Nenhuma rede encontrada</div>';
        }
    } catch (e) {
        info.textContent = 'Erro ao carregar';
        list.innerHTML = '<div style="color:var(--text-dim);font-size:13px;">Falha ao escanear redes</div>';
    }
}

function showWifiPasswordModal(ssid) {
    finishWifiPasswordModal(null);
    return new Promise((resolve) => {
        const el = wifiModal.el;
        if (!el) { resolve(null); return; }
        el.style.width = '420px';
        el.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
                ${ICON.wifi}
                <h3 style="font-weight:500;font-size:17px;">Conectar em <span id="wifi-network-name"></span></h3>
            </div>
            <div style="margin-bottom:20px;">
                <label style="font-size:13px;color:var(--text-secondary);display:block;margin-bottom:8px;">Senha</label>
                <input type="password" id="wifi-pass-input" placeholder="Digite a senha" autofocus
                    style="width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--pill-border);background:rgba(255,255,255,0.06);color:white;font-family:inherit;font-size:13px;outline:none;">
            </div>
            <div style="display:flex;gap:10px;justify-content:flex-end;">
                <button id="wifi-pass-cancel" class="btn-primary" style="border:1px solid var(--pill-border);background:transparent;">Cancelar</button>
                <button id="wifi-pass-confirm" class="btn-primary">Conectar</button>
            </div>
        `;
        document.getElementById('wifi-network-name').textContent = ssid;
        wifiModal.show();
        navState = 'wifi-modal';
        activeWifiModal = { resolve };

        const input = document.getElementById('wifi-pass-input');
        const cancelBtn = document.getElementById('wifi-pass-cancel');
        const confirmBtn = document.getElementById('wifi-pass-confirm');

        input.focus();

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { confirmBtn.click(); e.preventDefault(); }
            if (e.key === 'Escape') { cancelBtn.click(); e.preventDefault(); }
        });

        cancelBtn.onclick = () => finishWifiPasswordModal(null);
        confirmBtn.onclick = () => {
            finishWifiPasswordModal(input.value);
        };
    });
}

function finishWifiPasswordModal(value) {
    if (!activeWifiModal) return;
    const { resolve } = activeWifiModal;
    activeWifiModal = null;
    wifiModal.hide(false);
    navState = 'settings-item';
    resolve(value);
}

async function connectWifi(ssid, security) {
    const isOpenNetwork = !security || security === '--';
    const password = isOpenNetwork ? undefined : await showWifiPasswordModal(ssid);
    if (!isOpenNetwork && (password === null || password === undefined)) return;
    try {
        const data = await window.fifotv.wifiConnect(ssid, password);
        if (data.ok) {
            showToast('Conectado em ' + ssid);
            loadWifiSection();
        } else {
            showToast('Falha ao conectar em ' + ssid);
        }
    } catch (e) {
        showToast('Erro de conexão');
    }
}

async function loadBluetoothSection() {
    const info = document.getElementById('bt-current');
    const list = document.getElementById('bt-list');
    if (!info || !list) return;
    info.textContent = 'Carregando...';
    list.innerHTML = '<div style="color:var(--text-dim);font-size:13px;">Escaneando dispositivos...</div>';
    try {
        const [status, scan] = await Promise.all([
            window.fifotv.btStatus(),
            window.fifotv.btScan()
        ]);
        const connectedDevices = Array.isArray(status.devices)
            ? status.devices
            : status.connected ? [status] : [];
        info.textContent = connectedDevices.length > 1
            ? `${connectedDevices.length} dispositivos conectados`
            : status.connected ? (status.name || status.mac) : 'Nenhum dispositivo';
        info.style.color = status.connected ? '#4ade80' : 'var(--text-secondary)';
        list.replaceChildren();
        connectedDevices.forEach(device => list.appendChild(createBluetoothItem(device, true)));
        if (scan.devices && scan.devices.length > 0) {
            const connectedMacs = new Set(connectedDevices.map(device => device.mac));
            const devices = scan.devices.filter(device => !connectedMacs.has(device.mac));
            if (devices.length > 0) {
                if (connectedDevices.length > 0) {
                    const divider = document.createElement('div');
                    divider.style.cssText = 'color:var(--text-dim);font-size:12px;margin:12px 0 6px;';
                    divider.textContent = 'Dispositivos próximos:';
                    list.appendChild(divider);
                }
                devices.forEach(device => list.appendChild(createBluetoothItem(device, false)));
            }
        }
        if (connectedDevices.length === 0 && (!scan.devices || scan.devices.length === 0)) {
            list.innerHTML = '<div style="color:var(--text-dim);font-size:13px;">Nenhum dispositivo encontrado. Ative o pareamento no dispositivo.</div>';
        }
    } catch (e) {
        info.textContent = 'Erro ao carregar';
        list.innerHTML = '<div style="color:var(--text-dim);font-size:13px;">Falha ao escanear dispositivos</div>';
    }
}

function createBluetoothItem(device, connected) {
    const item = document.createElement('div');
    item.className = 'streaming-item';
    item.tabIndex = 0;

    const icon = document.createElement('div');
    icon.className = 'streaming-item-icon';
    icon.style.cssText = `background:${connected ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.06)'};border:1px solid ${connected ? 'rgba(74,222,128,0.3)' : 'var(--pill-border)'};min-width:36px;min-height:36px;display:flex;align-items:center;justify-content:center;`;
    icon.innerHTML = ICON.bluetooth;

    const details = document.createElement('div');
    details.className = 'streaming-item-info';
    const name = document.createElement('div');
    name.className = 'streaming-item-name';
    name.textContent = device.name || device.mac;
    const mac = document.createElement('div');
    mac.className = 'streaming-item-url';
    mac.textContent = device.mac;
    details.append(name, mac);

    const actions = document.createElement('div');
    actions.className = 'streaming-item-actions';
    if (connected) {
        const unpair = document.createElement('button');
        unpair.className = 'btn-icon';
        unpair.title = 'Esquecer';
        unpair.style.color = '#f87171';
        unpair.innerHTML = ICON.trash;
        unpair.addEventListener('click', () => unpairBluetooth(device.mac));
        const disconnect = document.createElement('button');
        disconnect.className = 'btn-icon';
        disconnect.title = 'Desconectar';
        disconnect.style.color = '#fbbf24';
        disconnect.innerHTML = ICON.x;
        disconnect.addEventListener('click', () => disconnectBluetooth(device.mac));
        actions.append(unpair, disconnect);
    } else {
        const connect = document.createElement('button');
        connect.className = 'btn-icon';
        connect.title = 'Conectar';
        connect.style.color = 'var(--text-secondary)';
        connect.innerHTML = ICON.monitor;
        connect.addEventListener('click', () => connectBluetooth(device.mac));
        actions.appendChild(connect);
    }

    item.append(icon, details, actions);
    return item;
}

async function connectBluetooth(mac) {
    showToast('Conectando...');
    try {
        const data = await window.fifotv.btConnect(mac);
        if (data.ok) {
            showToast('Conectado!');
            setTimeout(loadBluetoothSection, 1000);
        } else {
            const detail = data.error || 'Desconhecido';
            showToast('Falha: ' + detail);
            console.log('[BT Connect]', data);
        }
    } catch (e) {
        showToast('Erro de conexão');
    }
}

async function disconnectBluetooth(mac) {
    try {
        await window.fifotv.btDisconnect(mac);
        showToast('Desconectado');
        loadBluetoothSection();
    } catch (e) {
        showToast('Erro ao desconectar');
    }
}

async function unpairBluetooth(mac) {
    try {
        showToast('Esquecendo dispositivo...');
        const data = await window.fifotv.btUnpair(mac);
        if (data.ok) {
            showToast('Dispositivo esquecido');
            loadBluetoothSection();
        } else {
            showToast('Falha: ' + (data.error || 'Desconhecido'));
        }
    } catch (e) {
        showToast('Erro ao esquecer');
    }
}

async function updateBluetoothPill() {
    try {
        const data = await window.fifotv.btStatus();
        const nameEl = document.getElementById('bt-pill-name');
        const dotEl = document.getElementById('bt-pill-dot');
        const pillEl = document.querySelector('.pill-bluetooth');
        if (!nameEl || !dotEl || !pillEl) return;
        if (data.connected && data.name) {
            nameEl.textContent = data.name;
            dotEl.className = 'dot dot-connected';
            pillEl.style.opacity = '1';
        } else {
            nameEl.textContent = '';
            dotEl.className = 'dot';
            pillEl.style.opacity = '0.5';
        }
    } catch (e) {}
}

function renderStreamingsList() {
    const list = document.getElementById('streamings-list');
    if (!list) return;
    list.replaceChildren();
    streamings.forEach((streaming) => {
        const item = createStreamingListItem(streaming);
        const actions = document.createElement('div');
        actions.className = 'streaming-item-actions';
        actions.append(
            createStreamingAction('Mover acima', ICON.chevronUp, () => moveStreaming(streaming.id, -1)),
            createStreamingAction('Mover abaixo', ICON.chevronDown, () => moveStreaming(streaming.id, 1)),
            createStreamingAction('Remover', ICON.x, () => removeStreaming(streaming.id), true)
        );
        item.appendChild(actions);
        list.appendChild(item);
    });
}

function createStreamingListItem(streaming) {
    const item = document.createElement('div');
    item.className = 'streaming-item';
    item.dataset.id = streaming.id;
    item.tabIndex = 0;

    const icon = document.createElement('div');
    icon.className = 'streaming-item-icon';
    const image = document.createElement('img');
    image.src = `assets/icons/${encodeURIComponent(streaming.slug)}.svg`;
    image.alt = streaming.name;
    image.addEventListener('error', () => { image.style.display = 'none'; }, { once: true });
    icon.appendChild(image);

    const details = document.createElement('div');
    details.className = 'streaming-item-info';
    const name = document.createElement('div');
    name.className = 'streaming-item-name';
    name.textContent = streaming.name;
    const url = document.createElement('div');
    url.className = 'streaming-item-url';
    url.textContent = streaming.url;
    details.append(name, url);
    item.append(icon, details);
    return item;
}

function createStreamingAction(title, icon, action, danger = false) {
    const button = document.createElement('button');
    button.className = `btn-icon${danger ? ' danger' : ''}`;
    button.title = title;
    button.innerHTML = icon;
    button.addEventListener('click', action);
    return button;
}

async function moveStreaming(id, direction) {
    const idx = streamings.findIndex(s => s.id === id);
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= streamings.length) return;
    [streamings[idx], streamings[newIdx]] = [streamings[newIdx], streamings[idx]];
    await window.fifotv.reorderStreamings({ streamings });
    renderStreamingsList();
    renderGrid();
    focusStreamingSettingsAction(newIdx, direction > 0 ? 1 : 0);
    showToast('Ordem alterada');
}

async function removeStreaming(id) {
    const removedIndex = streamings.findIndex(s => s.id === id);
    await window.fifotv.removeStreaming(id);
    streamings = streamings.filter(s => s.id !== id);
    renderStreamingsList();
    renderGrid();
    focusStreamingSettingsAction(removedIndex, 2);
    showToast('Streaming removido');
}

function focusStreamingSettingsAction(itemIndex, actionIndex) {
    const section = document.getElementById('section-streamings');
    const items = section ? Array.from(section.querySelectorAll('.streaming-item')) : [];
    clearSettingsFocus();

    if (items.length === 0) {
        const addButton = document.getElementById('btn-add-streaming');
        if (!addButton) return;
        settingsItemIndex = 0;
        navState = 'settings-item';
        addButton.classList.add('fifotv-focused');
        addButton.focus();
        return;
    }

    settingsItemIndex = Math.max(0, Math.min(itemIndex, items.length - 1));
    const actions = items[settingsItemIndex].querySelectorAll('.btn-icon');
    settingsSubItemIndex = Math.min(actionIndex, actions.length - 1);
    navState = 'settings-sub-item';
    actions[settingsSubItemIndex].classList.add('fifotv-focused');
    actions[settingsSubItemIndex].focus();
}

async function loadSystemInfo() {
    try {
        const data = await window.fifotv.getInfo();
        const ipEl = document.getElementById('info-ip');
        const hostnameEl = document.getElementById('info-hostname');
        if (ipEl) ipEl.textContent = data.ip || 'N/A';
        if (hostnameEl) hostnameEl.textContent = data.hostname || 'N/A';
    } catch (e) {
        const ipEl = document.getElementById('info-ip');
        const hostnameEl = document.getElementById('info-hostname');
        if (ipEl) ipEl.textContent = 'N/A';
        if (hostnameEl) hostnameEl.textContent = 'N/A';
    }
}

function showToast(message) {
    playSound('notification');
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'toast';
    const icon = document.createElement('div');
    icon.className = 'toast-icon';
    icon.innerHTML = ICON.infoCircle;
    const text = document.createElement('span');
    text.className = 'toast-text';
    text.textContent = message;
    toast.append(icon, text);
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

let volumeToastEl = null;
let volumeToastTimeout = null;

function showVolumeToast() {
    if (!volumeToastEl) {
        volumeToastEl = document.createElement('div');
        volumeToastEl.className = 'volume-toast';
        volumeToastEl.innerHTML = `
            <div class="volume-toast-icon">${ICON.volumeUp}</div>
            <div class="volume-toast-bar-container">
                <div class="volume-toast-bar">
                    <div class="volume-toast-fill" id="volume-toast-fill" style="width:${currentVolume}%"></div>
                </div>
            </div>
        `;
        document.body.appendChild(volumeToastEl);
    } else {
        const fill = volumeToastEl.querySelector('#volume-toast-fill');
        if (fill) fill.style.width = currentVolume + '%';
        volumeToastEl.classList.remove('fade-out');
    }
    
    clearTimeout(volumeToastTimeout);
    volumeToastTimeout = setTimeout(() => {
        if (volumeToastEl) {
            volumeToastEl.classList.add('fade-out');
            setTimeout(() => {
                if (volumeToastEl) { volumeToastEl.remove(); volumeToastEl = null; }
            }, 250);
        }
    }, 2000);
}

let currentVolume = 50;

let currentZoom = 100;

function showContextMenu(e) {
    const menu = document.getElementById('context-menu');
    const isHome = typeof window.fifotv !== 'undefined';

    let html = '';

    if (isHome) {
        html = `
            <div class="context-menu-item context-volume-bar-item" data-action="vol-bar">
                ${ICON.volumeDown}
                <div class="context-volume-bar">
                    <div class="context-volume-fill" id="ctx-volume-fill" style="width:${currentVolume}%"></div>
                </div>
                ${ICON.volumeUp}
            </div>
            <div class="context-menu-item" id="ctx-info-item">
                ${ICON.info} <span id="ctx-ip-display">Carregando...</span>
            </div>
            <div class="context-menu-item" onclick="showMonitorPopup();hideContextMenu();">
                ${ICON.monitor} Monitor
            </div>
            <div class="context-menu-item" onclick="window.fifotv.shutdown()">
                ${ICON.power} Desligar
            </div>
        `;
    } else {
        html = `
            <div class="context-menu-item" onclick="window.fifotv.goHome()">
                ${ICON.home} Voltar ao início
            </div>
            <div class="context-menu-item" onclick="location.reload()">
                ${ICON.refresh} Recarregar página
            </div>
            <div class="context-volume">
                <button class="context-volume-btn" onclick="changeZoom(-10)">${ICON.zoomOut}</button>
                <div class="context-volume-bar">
                    <div class="context-volume-fill" id="ctx-zoom-fill" style="width:${(currentZoom - 50) / 1.5}%"></div>
                </div>
                <button class="context-volume-btn" onclick="changeZoom(10)">${ICON.zoomIn}</button>
            </div>
            <div class="context-volume">
                <button class="context-volume-btn" onclick="changeVolume('down')">${ICON.volumeDown}</button>
                <div class="context-volume-bar">
                    <div class="context-volume-fill" id="ctx-volume-fill" style="width:${currentVolume}%"></div>
                </div>
                <button class="context-volume-btn" onclick="changeVolume('up')">${ICON.volumeUp}</button>
            </div>
            <div class="context-menu-item" onclick="showMonitorPopup();hideContextMenu();">
                ${ICON.monitor} Monitor
            </div>
            <div class="context-menu-item" onclick="showSettingsPopup();hideContextMenu();">
                ${ICON.settings} Configurações
            </div>
            <div class="context-menu-item" onclick="window.fifotv.shutdown()">
                ${ICON.power} Desligar
            </div>
        `;
    }

    menu.innerHTML = html;
    menu.classList.remove('hidden');

    // Set navigation state to context menu
    navState = 'context-menu';
    popupNav.resetIndex('context-menu');

    // Defer positioning to next frame so offsetHeight is computed
    requestAnimationFrame(() => {
        menu.style.left = Math.min(e.clientX || 100, window.innerWidth - 320) + 'px';
        menu.style.top = Math.min(e.clientY || 100, window.innerHeight - menu.offsetHeight - 20) + 'px';

        const firstItem = menu.querySelector('.context-menu-item');
        if (firstItem) firstItem.classList.add('fifotv-focused');
    });

    if (isHome) loadIPInfo();
}

async function loadIPInfo() {
    try {
        const data = await window.fifotv.getInfo();
        const el = document.getElementById('ctx-ip-display');
        if (el) el.textContent = `${data.ip || 'N/A'} · ${data.hostname || ''}`;
    } catch (e) {}
}

async function changeVolume(action) {
    try {
        let data;
        if (action === 'up') data = await window.fifotv.volumeUp();
        else if (action === 'down') data = await window.fifotv.volumeDown();
        else if (action === 'mute') data = await window.fifotv.volumeMute();
        if (!data || !data.ok) throw new Error(data?.error || 'Falha ao alterar o volume');
        currentVolume = data.volume;
    } catch (e) {
        console.error('[FIFOtv] changeVolume error:', e);
        showToast('Não foi possível alterar o volume');
        return;
    }
    const fill = document.getElementById('ctx-volume-fill');
    if (fill) fill.style.width = currentVolume + '%';
    showVolumeToast();
}

function changeZoom(delta) {
    currentZoom = Math.max(50, Math.min(150, currentZoom + delta));
    document.body.style.zoom = currentZoom / 100;
    const fill = document.getElementById('ctx-zoom-fill');
    if (fill) fill.style.width = ((currentZoom - 50) / 1.5) + '%';
    showToast(`Zoom: ${currentZoom}%`);
}

function hideContextMenu() {
    const ctx = document.getElementById('context-menu');
    if (!ctx.classList.contains('hidden')) {
        ctx.classList.add('fading-out');
        setTimeout(() => {
            ctx.classList.add('hidden');
            ctx.classList.remove('fading-out');
            // Reset highlights
            ctx.querySelectorAll('.context-menu-item, .context-volume-btn').forEach(el => {
                el.classList.remove('fifotv-focused');
            });
        }, 200);
    }
    if (navState === 'context-menu') navState = 'grid';
}

let monitorInterval = null;

function showMonitorPopup() {
    monitorPopup.show();
    hideContextMenu();
    fetchMonitorStats();
    clearInterval(monitorInterval);
    monitorInterval = setInterval(fetchMonitorStats, 3000);
}

function hideMonitorPopup() {
    monitorPopup.hide();
    clearInterval(monitorInterval);
    monitorInterval = null;
}

async function fetchMonitorStats() {
    try {
        const data = await window.fifotv.getStats();
        const cpuFill = document.getElementById('monitor-cpu-fill');
        const cpuVal = document.getElementById('monitor-cpu-val');
        const ramFill = document.getElementById('monitor-ram-fill');
        const ramVal = document.getElementById('monitor-ram-val');
        const diskFill = document.getElementById('monitor-disk-fill');
        const diskVal = document.getElementById('monitor-disk-val');
        if (cpuFill) cpuFill.style.width = data.cpu + '%';
        if (cpuVal) cpuVal.textContent = data.cpu + '%';
        if (ramFill) ramFill.style.width = (data.ram_total > 0 ? (data.ram_used / data.ram_total) * 100 : 0) + '%';
        if (ramVal) ramVal.textContent = data.ram_used + ' / ' + data.ram_total + ' MB';
        if (diskFill) diskFill.style.width = (data.disk_total > 0 ? (data.disk_used / data.disk_total) * 100 : 0) + '%';
        if (diskVal) diskVal.textContent = data.disk_used + ' / ' + data.disk_total + ' MB';
        const procVal = document.getElementById('monitor-proc-val');
        if (procVal) procVal.textContent = data.processes + ' processos';
    } catch (e) {
        console.error('[FIFOtv] fetchMonitorStats error:', e);
    }
}

function closeAllPopups() {
    hideContextMenu();
    hideMonitorPopup();
    settingsPopup.hide();
    addPopup.hide();
    finishWifiPasswordModal(null);
    
    // Reset navigation state
    navState = 'grid';
    settingsSectionIndex = 0;
    settingsSubItemIndex = 0;
    
    // Clear all focus highlights
    document.querySelectorAll('.fifotv-focused').forEach(el => el.classList.remove('fifotv-focused'));
    
    // Hide transition overlay
    const overlay = document.getElementById('transition-overlay');
    overlay.classList.add('hidden');
    overlay.classList.remove('visible');
    const frame = document.getElementById('preload-frame');
    if (frame) frame.remove();
}

function resetScreensaverTimers() {
    clearTimeout(ssTimer);
    clearTimeout(dpmsTimer);
    document.getElementById('screensaver').classList.add('hidden');

    ssTimer = setTimeout(() => {
        document.getElementById('screensaver').classList.remove('hidden');
    }, SS_TIMEOUT);

    dpmsTimer = setTimeout(() => {
        if (typeof window.fifotv !== 'undefined' && window.fifotv.screenOff) {
            window.fifotv.screenOff();
        }
    }, DPMS_TIMEOUT);
}

document.addEventListener('keydown', handleKeydown);
document.addEventListener('keyup', (e) => {
    if (e.key === 'BrowserBack' || e.key === 'GoBack' || e.key === 'Escape' || e.keyCode === 166 || e.keyCode === 8) {
        if (window._backTimer) {
            clearTimeout(window._backTimer);
            window._backTimer = null;
        }
        if (window._backPressStart) {
            const elapsed = Date.now() - window._backPressStart;
            window._backPressStart = null;
            if (elapsed < 600) {
                const hasPopups = !document.getElementById('context-menu').classList.contains('hidden') ||
                    settingsPopup.isVisible() ||
                    addPopup.isVisible() ||
                    monitorPopup.isVisible() ||
                    wifiModal.isVisible();
                if (hasPopups) {
                    closeAllPopups();
                } else if (typeof window.fifotv !== 'undefined' && window.fifotv.goHome) {
                    window.fifotv.goHome();
                }
            }
        }
    }
});
document.addEventListener('mousemove', resetScreensaverTimers);
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (monitorPopup.isVisible()) {
        hideMonitorPopup();
        return;
    }
    const menu = document.getElementById('context-menu');
    if (!menu.classList.contains('hidden')) {
        hideContextMenu();
    } else {
        showContextMenu(e);
    }
}, true);
document.getElementById('btn-settings').addEventListener('click', (e) => {
    e.stopPropagation();
    hideContextMenu();
    showSettingsPopup();
});

document.getElementById('settings-popup').addEventListener('click', (e) => {
    if (e.target === document.getElementById('settings-popup')) {
        closeAllPopups();
    }
});

document.getElementById('monitor-popup').addEventListener('click', (e) => {
    if (e.target === document.getElementById('monitor-popup')) {
        hideMonitorPopup();
    }
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('.context-menu')) {
        hideContextMenu();
    }
});

document.getElementById('context-menu').addEventListener('contextmenu', (e) => {
    e.stopPropagation();
});

let touchTimer = null;
document.addEventListener('touchstart', (e) => {
    resetScreensaverTimers();
    touchTimer = setTimeout(() => {
        showContextMenu({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
    }, 600);
}, { passive: true });
document.addEventListener('touchend', () => clearTimeout(touchTimer));
document.addEventListener('touchmove', () => clearTimeout(touchTimer));

window.addEventListener('popstate', () => { closeAllPopups(); });
window.addEventListener('pageshow', (e) => { if (e.persisted) closeAllPopups(); });

if (typeof window.fifotv !== 'undefined' && window.fifotv.onGlobalKey) {
    window.fifotv.onGlobalKey((key) => {
        if (key === 'F1') showSettingsPopup();
        else if (key === 'F5') showMonitorPopup();
        else if (key === 'F9') window.fifotv.shutdown();
        else if (key === 'F12') {
            if (document.fullscreenElement) document.exitFullscreen();
            else document.documentElement.requestFullscreen().catch(() => {});
        }
        else if (key === 'VolumeUp') changeVolume('up');
        else if (key === 'VolumeDown') changeVolume('down');
        else if (key === 'MediaPlayPause') changeVolume('mute');
        else if (key === 'BrowserHome') { closeAllPopups(); navState = 'grid'; focusedIndex = 0; updateFocus(); }
    });
}

if (typeof window.fifotv !== 'undefined' && window.fifotv.onScreensaverReset) {
    window.fifotv.onScreensaverReset(() => resetScreensaverTimers());
}

async function initVolume() {
    try {
        const data = await window.fifotv.getVolume();
        if (data.ok) currentVolume = data.volume;
    } catch (_) {}
}

applyRandomPalette();
updateClock();
setInterval(updateClock, 1000);
loadUsageCounts();
loadStreamings();
initVolume();
resetScreensaverTimers();
updateBluetoothPill();
setInterval(updateBluetoothPill, 30000);

// ─── CHECK EXTENSION REDIRECT FLAGS ─────────────────────
// The ui-overlay extension sets these localStorage flags
// when user clicks "Configurações" or "Monitor" on external pages,
// then redirects here. We open the corresponding popup.
setTimeout(() => {
    if (localStorage.getItem('fifotv-open-settings')) {
        localStorage.removeItem('fifotv-open-settings');
        showSettingsPopup();
    } else if (localStorage.getItem('fifotv-open-monitor')) {
        localStorage.removeItem('fifotv-open-monitor');
        showMonitorPopup();
    }
}, 400);
