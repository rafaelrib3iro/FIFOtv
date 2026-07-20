(function installVisualBridge() {
    if (window.fifotv) return;

    let streamings = null;
    let volume = 50;
    let muted = false;

    const copy = (items) => items.map((item) => ({ ...item }));
    const unavailable = (feature) => ({ ok: false, error: `${feature} não está disponível no modo visual` });

    async function getVisualStreamings() {
        if (streamings) return streamings;
        const response = await fetch('/backend/streamings.json', { cache: 'no-store' });
        if (!response.ok) throw new Error('Não foi possível carregar o catálogo visual');
        const catalog = await response.json();
        if (!Array.isArray(catalog.streamings)) throw new TypeError('Catálogo visual inválido');
        streamings = copy(catalog.streamings);
        return streamings;
    }

    function volumeState() {
        return { ok: true, volume, muted };
    }

    window.fifotv = {
        getStreamings: async () => ({ streamings: copy(await getVisualStreamings()) }),
        addStreaming: async (streaming) => {
            const items = await getVisualStreamings();
            if (items.some((item) => item.id === streaming.id)) return { ok: false, error: 'ID de streaming duplicado' };
            items.push({ ...streaming });
            return { ok: true };
        },
        removeStreaming: async (id) => {
            streamings = (await getVisualStreamings()).filter((item) => item.id !== id);
            return { ok: true };
        },
        reorderStreamings: async (catalog) => {
            if (!Array.isArray(catalog?.streamings)) return { ok: false, error: 'Catálogo visual inválido' };
            streamings = copy(catalog.streamings);
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
        openStreaming: async () => unavailable('Abrir streaming'),
        goHome: async () => ({ ok: true }),
        screenOff: async () => unavailable('Apagar a tela'),
        onGlobalKey: () => {},
        onScreensaverReset: () => {},
    };
})();
