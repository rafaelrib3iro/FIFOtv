# FIFOtv — Guia de Suporte a Apps webOS

> Documentação técnica para implementação e manutenção de suporte a apps webOS (hospedados) no FIFOtv.
> Baseado na validação experimental de Julho 2026 com Spotify webOS (`spotify-beehive` v2.0.36).

---

## Visão Geral

Apps webOS são aplicações web (HTML/CSS/JS) rodando em Chromium embarcado. O webOS TV 24+ usa Chromium 108+. Apps hospedados (hosted apps) consistem de um `appinfo.json` + `index.html` que redireciona para o servidor do app (ex: Spotify, YouTube, Jellyfin).

**O FIFOtv roda Electron + Chromium** — portanto, apps webOS podem rodar com uma camada de compatibilidade que expõe as APIs webOS esperadas.

---

## APIs Necessárias (O que um App webOS Espera)

### 1. Identidade de Dispositivo (Client-Side)

| API | Valor Esperado | Onde é Verificado |
|-----|---------------|-------------------|
| `navigator.userAgent` | `Mozilla/5.0 (SMART-TV; Linux; Tizen 6.5) AppleWebKit/537.36 Chrome/149.0.0.0 Safari/537.36` | JS do app |
| `navigator.platform` | `'Tizen'` | JS do app |
| `navigator.userAgentData` | `{brands: [...], platform: 'Tizen', getHighEntropyValues: fn}` | Client Hints API |
| `screen.width/height` | `1280 / 720` | Layout/CSS |
| `window.chrome` | Objeto completo com `app`, `runtime`, `loadTimes`, `csi`, `webstore` | Detecção Chromium |
| `window.PalmSystem` | `{stageReady, stageActivated, stageDeactivated, deviceInfo: JSON_STRING}` | Legacy webOS API |
| `window.launchParams` | `'{}'` | Inicialização |

**Importante**: `PalmSystem.deviceInfo` deve ser **string JSON** (não objeto), pois o `webOSTV.js` do Spotify faz `JSON.parse()`.

### 2. WebOSServiceBridge + Luna Service Bus (JS → Native)

```javascript
// App faz:
const bridge = new WebOSServiceBridge();
bridge.call('luna://com.webos.service.sm/deviceid/getIDs', '{}');
// Espera callback em bridge.onservicecallback com {deviceId, lgDeviceId, returnValue: true}
```

**Serviços Luna mais usados por apps de streaming:**

| Serviço Luna | Método | Uso | Mock Necessário |
|-------------|--------|-----|-----------------|
| `com.webos.service.audio` | `volumeUp`, `volumeDown`, `setVolume`, `setMute` | Controle de volume | wpctl |
| `com.webos.service.connectionmanager` | `getStatus` | Status rede | nmcli |
| `com.webos.settingsservice` | `getSystemSettings` | Locale, timezone | Config local |
| `com.webos.service.sm` | `deviceid/getIDs` | Device ID único | UUID fixo |
| `com.webos.service.tv.systemproperty` | `getSystemInfo` | Modelo, SDK, firmware | Info estática |
| `com.webos.service.tvpower` | `registerScreenSaverRequest` | Screensaver | no-op |
| `com.webos.service.applicationmanager` | `launch`, `running` | Lifecycle | Electron IPC |

**O Spotify webOS usa `PalmServiceBridge` (capital P, S)** — não `WebOSServiceBridge`. O `webOSTV.js` do Spotify procura por `window.PalmServiceBridge`.

### 3. Headers HTTP / Client Hints (Server-Side)

O servidor do app valida headers em **todas as requisições**:

```
User-Agent: Mozilla/5.0 (SMART-TV; Linux; Tizen 6.5) AppleWebKit/537.36 Chrome/149.0.0.0 Safari/537.36
Sec-CH-UA-Platform: "Tizen"
Sec-CH-UA-Mobile: ?0
Sec-CH-UA: "Chromium";v="149", "Not_A Brand";v="24"
Sec-CH-UA-Full-Version-List: "Chromium";v="149.0.0.0", "Not_A Brand";v="24.0.0.0"
Sec-CH-UA-Platform-Version: "6.5.0"
Sec-CH-UA-Model: ""
Sec-CH-UA-Form-Factors: "TV"
```

### 4. WebGL (Vendor/Renderer)

```
Vendor: Samsung Electronics Co., Ltd.
Renderer: Mali-G51
```

---

## Implementação no FIFOtv

### Estrutura de Arquivos

```
electron/
├── main.js                          # Main process — handlers, CDP, token management
├── preload.js                       # Bridge IPC → homepage (window.fifotv.*)
├── preload-webos.js                 # Camada de compatibilidade webOS (spoofing + mocks)
├── preload-streaming.js             # Spoofing padrão para streamings normais
├── preload-overlay.js               # Bridge IPC → overlay menu
└── views/
    ├── overlay.html / .js / .css    # Menu contexto, volume toast, toasts
    ├── loading.html                 # Tela de loading
    └── streaming-customizations/    # Customizações por streaming
```

### 1. preload-webos.js (Camada de Compatibilidade)

Executa no contexto da página (`contextIsolation: false`). Responsabilidades:

- **Spoofing completo**: UA, navigator.*, screen.*, window.chrome, WebGL
- **PalmSystem**: `deviceInfo` como **string JSON**, `launchParams: '{}'`
- **PalmServiceBridge**: Mock de todos os serviços Luna (síncrono com callback)
- **PalmServiceBridge** (capital P, S) — esperado pelo Spotify
- **window.webOS** namespace: `platform.tv`, `service.request()`, `devInfo.getSystemInfo()`

```javascript
// Exemplo de mock Luna
const LUNA_MOCKS = {
  'luna://com.webos.service.sm/deviceid/getIDs': () => ({
    deviceId: 'fifotv-device-001',
    lgDeviceId: 'fifotv-lg-001',
    returnValue: true,
  }),
  // ... outros serviços
};

class PalmServiceBridge {
  constructor() { this.onservicecallback = null; }
  call(url, params) {
    const mockFn = LUNA_MOCKS[url];
    if (mockFn) {
      const result = mockFn(params);
      if (this.onservicecallback) setTimeout(() => this.onservicecallback(result), 0);
    }
  }
}
```

### 2. main.js — Handler `nav:open-streaming`

```javascript
ipcMain.handle('nav:open-streaming', async (_, url, name, slug, type) => {
  const isWebOS = type === 'webos';
  const preloadFile = isWebOS ? 'preload-webos.js' : 'preload-streaming.js';
  
  // Sessão persistente para preservar cookies/localStorage
  const streamingSession = isWebOS && slug === 'spotify' 
    ? session.fromPartition('persist:spotify') 
    : session.defaultSession;

  const streamingView = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, preloadFile),
      contextIsolation: false,      // Necessário para spoofing direto no window
      nodeIntegration: false,
      webSecurity: isWebOS ? false : true,
      sandbox: isWebOS ? false : true,
      allowRunningInsecureContent: isWebOS ? true : false,
      session: streamingSession,    // Persistência de cookies/localStorage
      additionalArguments: [slug],
    }
  });

  // CDP para interceptar tokens do Spotify
  if (isWebOS && slug === 'spotify') {
    streamingView.webContents.debugger.attach('1.3');
    streamingView.webContents.debugger.sendCommand('Network.enable');
    streamingView.webContents.debugger.on('message', (event, method, params) => {
      // Captura TODAS as requisições Spotify auth (device auth, token, refresh)
      // Salva refresh_token automaticamente
    });
  }

  // Injeta token no hash: #auth=<access_token> ou dummy
  streamingView.webContents.loadURL(url);
});
```

**Flags críticas para webOS:**
- `contextIsolation: false` — permite spoofing direto no `window`
- `webSecurity: false` / `sandbox: false` — necessário para alguns apps
- `session.fromPartition('persist:spotify')` — persiste cookies/localStorage entre aberturas

### 3. Gerenciamento de Tokens (Spotify)

**Arquivo**: `/home/tv/.fifotv/spotify_tokens.json`

```json
{
  "refreshToken": "AQ...",
  "fingerprint": "fifotv",
  "clientId": "REAL_TV_APP_CLIENT_ID",  // Descoberto via CDP
  "scope": "streaming umbrella-tv",
  "deviceId": "...",
  "savedAt": 1784073524093
}
```

**Fluxo de Token**:
1. **Primeira carga**: injeta `#auth=webos_dummy_token` → app mostra QR login
2. **QR login**: app faz Device Code Flow → CDP intercepta resposta → salva `refresh_token` + `client_id` real
3. **Cargas subsequentes**: lê `refresh_token` → faz `refresh_token grant` → injeta `#auth=<access_token_real>`
4. **Logout no app**: limpa arquivo de token + cookies da sessão persistente

### 4. CDP (Chrome DevTools Protocol) — Interceptação de Tokens

```javascript
streamingView.webContents.debugger.attach('1.3');
streamingView.webContents.debugger.sendCommand('Network.enable');

streamingView.webContents.debugger.on('message', (event, method, params) => {
  // Captura TODAS as requisições accounts.spotify.com
  if (method === 'Network.requestWillBeSent' && params.request?.url?.includes('accounts.spotify.com')) {
    console.log('[SpotifyCDP] Auth request:', params.request.url, params.request.postData);
  }
  if (method === 'Network.responseReceived' && params.response?.status === 200) {
    // Captura resposta de token, extrai refresh_token, client_id, scope, device_id
    // Salva automaticamente via saveSpotifyTokens()
  }
});
```

**Captura automática**:
- `device_code` flow (QR login) → captura `refresh_token` + **client_id real do app TV**
- `refresh_token` grant → atualiza `access_token` válido
- Salva: `refreshToken`, `fingerprint`, `clientId`, `scope`, `deviceId`

---

## Descoberta do Client ID Real (Crítico)

**Problema**: O client_id `3e29cb18c4c34d60837ec94cf31e9f3e` é do **Web Playback SDK**. O app TV real usa um **client_id allowlisted diferente**.

**Solução**: Capturar via CDP durante o Device Code Flow inicial:

```javascript
// CDP captura a requisição inicial de device auth:
params.request.url.includes('accounts.spotify.com/oauth2/device/authorize')
// ou a primeira chamada a /api/token com grant_type=device_code
// O postData revelará o client_id real do app TV
```

**Ação**: Após capturar o client_id real, atualizar:
1. `SPOTIFY_CLIENT_ID` no main.js
2. `refreshSpotifyAccessToken()` para usar o client_id salvo no token file
3. Token file salva `clientId` capturado durante o QR login

---

## IPC Handlers Necessários

### Spotify Auth (Device Code Flow)
```javascript
// main.js
ipcMain.handle('spotify:auth:start-device', async () => { /* inicia device auth */ });
ipcMain.handle('spotify:auth:poll-device', async (_, deviceCode, interval) => { /* polling */ });
ipcMain.handle('spotify:auth:logout', async () => { /* limpa tokens + cookies */ });
ipcMain.handle('spotify:auth:status', async () => { /* verifica se tem token */ });
ipcMain.handle('spotify:auth:get-token', async () => { /* retorna access_token fresco */ });
```

### Token Persistence
```javascript
ipcMain.handle('spotify:token:save', async (_, { refreshToken, fingerprint }) => { ... });
ipcMain.handle('spotify:token:load', async () => { /* lê arquivo JSON */ });
```

### Exposto no preload.js
```javascript
contextBridge.exposeInMainWorld('fifotv', {
  spotifyAuth: {
    getToken: () => ipcRenderer.invoke('spotify:auth:get-token'),
    startDevice: () => ipcRenderer.invoke('spotify:auth:start-device'),
    pollDevice: (deviceCode, interval) => ipcRenderer.invoke('spotify:auth:poll-device', deviceCode, interval),
    logout: () => ipcRenderer.invoke('spotify:auth:logout'),
    status: () => ipcRenderer.invoke('spotify:auth:status'),
  },
  spotifyToken: {
    save: (refreshToken, fingerprint) => ipcRenderer.invoke('spotify:token:save', { refreshToken, fingerprint }),
    load: () => ipcRenderer.invoke('spotify:token:load'),
  },
});
```

---

## Configuração de Streaming (backend/streamings.json)

```json
{
  "streamings": [
    {
      "id": 5,
      "name": "Spotify",
      "slug": "spotify",
      "url": "https://api-partner.spotify.com/tvapp?platform=webos4plus",
      "type": "webos"
    }
  ]
}
```

**Campos obrigatórios para webOS**:
- `type: "webos"` — seleciona preload-webos.js + flags especiais
- `url` — URL do app hospedado (ex: `api-partner.spotify.com/tvapp?platform=webos4plus`)

---

## Resolução de Tela e Zoom

Apps webOS esperam **1280x720 @ 1x**. No FIFOtv:

```javascript
// preload-webos.js força:
screen.width = 1280;
screen.height = 720;
window.devicePixelRatio = 1;

// main.js cria view fullscreen mas app vê 1280x720 via spoofing
// Se TV for 1366x768, app escala via CSS ou usa transform: scale()
```

---

## Checklist para Novo App webOS

| Item | Status | Observação |
|------|--------|------------|
| Adicionar em `backend/streamings.json` com `type: "webos"` | ☐ | |
| URL correta do app hospedado | ☐ | Ex: `api-partner.spotify.com/tvapp?platform=webos4plus` |
| Testar spoofing (UA, platform, screen, WebGL) | ☐ | |
| Verificar mocks Luna necessários | ☐ | `sm/deviceid`, `tv.systemproperty`, `audio`, `connectionmanager` |
| Testar navegação D-pad (spatial navigation) | ☐ | Polyfill WICG injetado automaticamente |
| Capturar client_id real via CDP (se OAuth) | ☐ | Necessário para apps com auth próprio |
| Testar persistência de sessão (fechar/abrir) | ☐ | Session persist + token refresh |
| Documentar mocks Luna específicos do app | ☐ | |

---

## Problemas Conhecidos e Limitações

| Problema | Causa | Mitigação |
|----------|-------|-----------|
| `contextIsolation: false` | Necessário para spoofing direto no `window` | Segurança reduzida; isolar apenas apps webOS confiáveis |
| `webSecurity: false` | Alguns apps bloqueiam mixed content | Apenas para apps webOS |
| Client ID errado | Web SDK client_id ≠ TV app client_id | Capturar via CDP no primeiro login |
| Token refresh falha | Client ID errado / scopes insuficientes | Capturar client_id real + scopes corretos |
| Screensaver/TVPower mocks | Apps chamam serviços não mockados | Adicionar mocks conforme logs CDP |
| `PalmServiceBridge` vs `WebOSServiceBridge` | Spotify espera `PalmServiceBridge` | Expor ambos no preload |

---

## Debugging

### Logs Úteis
```bash
# Logs principais
tail -f /var/log/fifotv/main.log | grep -i spotify

# Token file
cat /home/tv/.fifotv/spotify_tokens.json

# CDP logs
grep -i spotifycdp /var/log/fifotv/main.log
```

### CDP Logs Esperados (Sucesso)
```
[SpotifyCDP] Auth request: { url: 'https://accounts.spotify.com/oauth2/device/authorize', postData: 'client_id=REAL_TV_APP_ID&scope=...' }
[SpotifyCDP] Auth response: { grant_type: 'device_code', client_id: 'REAL_TV_APP_ID', scope: 'streaming umbrella-tv', has_refresh: true }
[SpotifyToken] Saved: { refreshToken: 'AQ...', clientId: 'REAL_TV_APP_ID', scope: 'streaming umbrella-tv' }
[FIFOtv] Using real Spotify access token
```

---

## Referências

- [webOS TV Developer Guide](https://webostv.developer.lge.com/)
- [Spotify TV App (webOSTV.js) - minificado](https://tv.scdn.co/webos4plus/v2/...)
- [OAuth 2.0 Device Authorization Grant (RFC 8628)](https://tools.ietf.org/html/rfc8628)
- [WICG Spatial Navigation Polyfill](https://github.com/WICG/spatial-navigation)
- [Electron WebContentsView](https://www.electronjs.org/docs/latest/api/web-contents-view)
- [Electron CDP Debugger](https://www.electronjs.org/docs/latest/api/debugger)

---

## Histórico de Versões

| Data | Versão | Mudanças |
|------|--------|----------|
| Jul 2026 | 1.0 | Documento1.0 | Documentação inicial baseada em validação experimental Spotify webOS |

---

> **Nota**: Este documento será atualizado conforme novos apps webOS forem integrados. A questão do re-login automático (token refresh) está documentada mas em desenvolvimento — ver issue #relogin.