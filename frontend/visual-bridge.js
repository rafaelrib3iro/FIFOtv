(function installVisualBridge() {
    if (window.fifotv) return;

    let apps = null;
    let volume = 50;
    let muted = false;

    const copy = (items) => items.map((item) => ({ ...item }));
    const unavailable = (feature) => ({ ok: false, error: `${feature} não está disponível no modo visual` });

    async function getVisualApps() {
        if (apps) return apps;
        const response = await fetch('/backend/apps.json', { cache: 'no-store' });
        if (!response.ok) throw new Error('Não foi possível carregar o catálogo visual');
        const catalog = await response.json();
        if (!Array.isArray(catalog.apps)) throw new TypeError('Catálogo visual inválido');
        apps = copy(catalog.apps);
        return apps;
    }

    function volumeState() {
        return { ok: true, volume, muted };
    }

    window.fifotv = {
        getApps: async () => ({ apps: copy(await getVisualApps()) }),
        addApp: async (app) => {
            const items = await getVisualApps();
            if (items.some((item) => item.id === app.id)) return { ok: false, error: 'ID de app duplicado' };
            items.push({ ...app });
            return { ok: true };
        },
        removeApp: async (id) => {
            apps = (await getVisualApps()).filter((item) => item.id !== id);
            return { ok: true };
        },
        reorderApps: async (catalog) => {
            if (!Array.isArray(catalog?.apps)) return { ok: false, error: 'Catálogo visual inválido' };
            apps = copy(catalog.apps);
            return { ok: true };
        },
        shutdown: async () => unavailable('Desligar a máquina'),
        reboot: async () => unavailable('Reiniciar a máquina'),
        restartApp: () => window.location.reload(),
        getStats: async () => ({ unavailable: true }),
        getInfo: async () => ({ ip: '127.0.0.1', hostname: 'Modo visual' }),
        volumeUp: async () => {
            volume = Math.min(100, volume + 5);
            muted = false;
            return volumeState();
        },
        volumeDown: async () => {
            volume = Math.max(0, volume - 5);
            muted = false;
            return volumeState();
        },
        volumeMute: async () => {
            muted = !muted;
            return volumeState();
        },
        getVolume: async () => volumeState(),
        wifiStatus: async () => ({ connected: false, ssid: '' }),
        wifiScan: async () => ({ networks: [] }),
        wifiConnect: async () => unavailable('Conectar ao Wi-Fi'),
        btStatus: async () => ({ connected: false, name: '', mac: '', devices: [] }),
        btScan: async () => ({ devices: [] }),
        btConnect: async () => unavailable('Conectar ao Bluetooth'),
        btDisconnect: async () => unavailable('Desconectar o Bluetooth'),
        btUnpair: async () => unavailable('Esquecer dispositivo Bluetooth'),
        openApp: async () => unavailable('Abrir app'),
        goHome: async () => ({ ok: true }),
        screenOff: async () => unavailable('Apagar a tela'),
        onGlobalKey: () => {},
        onScreensaverReset: () => {},
    };
})();
