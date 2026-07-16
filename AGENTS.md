# FIFOtv

## O que é

FIFOtv é uma SmartTV para PCs de hardware fraco. Transforma qualquer máquina com Debian em uma interface de TV completa, com acesso a streamings (Netflix, YouTube, Disney+, etc.), navegação por controle remoto/D-pad, Bluetooth, Wi-Fi e volume — sem desktop environment.

O projeto está em fase de beta (primeira versão).

## Arquitetura

A fonte detalhada e aprovada do runtime é `docs/ACTIVE_RUNTIME_SCOPE.md`; `docs/ARCHITECTURE.md` descreve somente os componentes comprovadamente ativos.

```
Bootstrap externo observado ou npm scripts → Electron (kiosk/dev)
                                              │
                                              ├─ BrowserWindow (frameless, fullscreen)
                                              │   └─ contentView (WebContentsViews empilhadas)
                                              │       ├─ homeView      → frontend/index.html
                                              │       ├─ loadingView   → views/loading.html
                                              │       ├─ streamingView → URL externa
                                              │       └─ overlayView   → views/overlay.html
                                              │
                                              └─ Main Process (Node.js)
                                                  ├─ IPC handlers (sistema, volume, rede, BT)
                                                  ├─ globalShortcuts (teclas de mídia)
                                                  └─ before-input-event (D-pad keys)
```

**Por que Electron:** suporte nativo a Widevine DRM (Netflix, Disney+, Max, etc.), Chromium embutido, empacotamento simples com electron-builder.

**Modelo de views:** 1 BrowserWindow + múltiplas WebContentsViews empilhadas via `contentView.addChildView()`. BrowserView foi deprecated no Electron 35.

## Estrutura do Projeto

```
├── electron/
│   ├── main.js                          # Main process — janelas, views, IPC, navegação
│   ├── preload.js                       # Bridge IPC → homepage (window.fifotv.*)
│   ├── preload-overlay.js               # Bridge IPC → overlay menu
│   ├── preload-streaming.js             # TV identity spoofing (UA, screen, WebGL)
│   └── views/
│       ├── overlay.html / overlay.js / overlay.css   # Menu contexto, volume toast, toasts
│       ├── loading.html                                 # Tela de loading (ícone + spinner)
│       └── streaming-customizations/
│           ├── config.js                # Mapeamento domínio → arquivo de customização
│           ├── shared.js                # Helpers comuns (watchAndClick, removeElements, etc.)
│           ├── netflix.js               # Customização Netflix
│           ├── disney.js                # Customização Disney+
│           ├── max.js                   # Customização Max
│           ├── appletv.js               # Customização Apple TV+
│           ├── applemusic.js            # Customização Apple Music
│           └── globoplay.js             # Customização Globoplay
├── frontend/
│   ├── index.html                       # Homepage (grid de streamings)
│   ├── script.js                        # Lógica da homepage (D-pad, settings, CRUD)
│   ├── style.css                        # CSS glassmorphism
│   ├── splash.html                      # Splash screen
│   ├── keytest.html                     # Teste de teclas
│   └── assets/                          # SVGs, cursores, ícones
├── backend/
│   └── streamings.json                  # Dados dos streamings (CRUD via IPC)
├── system/                              # Operação/legado fora do runtime ativo aprovado
├── scripts/
│   ├── dev.sh                           # npm run dev helper
│   ├── update.sh                        # Script de update no all-in-one
│   └── keytest.js                       # Teste de teclas via Electron
├── docs/                                # Documentação do projeto
├── package.json                         # Dependências Node.js
└── AGENTS.md                            # Este arquivo
```

## IPC Channels

Comunicação entre renderer (frontend/overlay) e main process via `ipcRenderer.invoke()` / `ipcMain.handle()`.

### Streamings
| Canal | Descrição |
|-------|-----------|
| `streamings:get` | Retorna lista de streamings do JSON |
| `streamings:add` | Adiciona novo streaming |
| `streamings:remove` | Remove streaming por ID |
| `streamings:reorder` | Reordena lista de streamings |

### Navegação
| Canal | Descrição |
|-------|-----------|
| `nav:open-streaming` | Abre streaming em WebContentsView separada |
| `nav:go-home` | Fecha streaming, volta pra homepage |
| `nav:reload-streaming` | Recarrega streaming atual |

### Volume
| Canal | Descrição |
|-------|-----------|
| `volume:up` | Aumenta volume (wpctl) |
| `volume:down` | Diminui volume |
| `volume:mute` | Muta/desmuta |
| `volume:get` | Retorna volume atual |

### Rede
| Canal | Descrição |
|-------|-----------|
| `wifi:status` | Status da conexão Wi-Fi |
| `wifi:scan` | Escaneia redes disponíveis |
| `wifi:connect` | Conecta em rede (ssid, senha) |
| `bt:status` | Status do Bluetooth |
| `bt:scan` | Escaneia dispositivos visíveis/conhecidos |
| `bt:connect` | Conecta dispositivo por MAC |
| `bt:disconnect` | Desconecta dispositivo |
| `bt:unpair` | Despareia dispositivo |

### Sistema
| Canal | Descrição |
|-------|-----------|
| `system:shutdown` | Desliga máquina |
| `system:reboot` | Reinicia máquina |
| `system:restart` | Reinicia app Electron |
| `system:stats` | CPU, RAM, disco e processos |
| `system:info` | IP e hostname |

### Overlay
| Canal | Descrição |
|-------|-----------|
| `overlay:show-menu` | Sobe overlay pro topo (menu contexto) |
| `overlay:hide-menu` | Remove overlay da composição e foca streaming |
| `overlay:toast-show` | Sobe overlay pra toast de volume |
| `overlay:toast-hide` | Desce overlay após toast |
| `overlay:zoom` | Ajusta zoom do streaming |
| `overlay:focus` | Define foco (streaming ou overlay) |
| `overlay:menu-visibility` | Notifica visibilidade do menu |

### Handlers internos sem bridge

`system:update`, `logging:*` e `remote:*` permanecem registrados no main, mas nenhum preload atual os expõe. Eles não são APIs disponíveis na UI normal. OpenCode é ferramenta exclusiva de desenvolvimento, condicionada pelo `remoteEnabled` local aprovado.

### Eventos (main → renderer)
| Canal | Descrição |
|-------|-----------|
| `global-key` | Tecla global pressionada |
| `key-event` | Tecla encaminhada pro overlay |
| `show-menu` | Overlay deve mostrar menu |

## Customização de Streamings

Cada streaming pode ter um script de customização que injeta CSS/JS na página carregada. O mapeamento fica em `electron/views/streaming-customizations/config.js`:

```js
module.exports = {
  'netflix.com': 'netflix.js',
  'disneyplus.com': 'disney.js',
  'play.max.com': 'max.js',
  // null = sem customização
};
```

**Fluxo:** `main.js` detecta o domínio do streamingView → carrega o arquivo JS correspondente → injeta via `webContents.executeJavaScript()` no evento `dom-ready`.

**Helpers disponíveis** (`shared.js`):
- `FIFOtv.watchAndClick(selector, opts)` — observa DOM e clica quando elemento aparece
- `FIFOtv.watchMultiple(mapping, opts)` — múltiplos watchAndClick
- `FIFOtv.autoFullscreen()` — entra em fullscreen quando vídeo toca
- `FIFOtv.removeElements(selectors)` — remove elementos do DOM
- `FIFOtv.hideElements(selectors)` — esconde elementos via CSS
- `FIFOtv.addStyles(css)` — injeta CSS customizado
- `FIFOtv.clickWhenReady(selector, timeout)` — clica quando elemento existe

## TV Identity (Spoofing)

`electron/preload-streaming.js` executa antes de qualquer script da página no streamingView e sobrescreve:

- **User-Agent:** `Mozilla/5.0 (SMART-TV; Linux; Tizen 6.5) AppleWebKit/537.36 Chrome/149.0.0.0 Safari/537.36`
- **navigator.platform:** `Tizen`
- **navigator.userAgentData:** brands Chromium 149, platform Tizen
- **screen:** 1280x720, colorDepth 24
- **WebGL:** vendor Samsung, renderer Mali-G51
- **navigator.hardwareConcurrency:** 4
- **navigator.deviceMemory:** 2

Usa `contextIsolation: false` no streamingView para que os overrides sejam visíveis ao JS externo.

**Exceção:** Prime Video (slug `primevideo`) é ignorado pelo spoofing por conflito com detecção.

## Overlay System

O overlay (`electron/views/overlay.html`) é uma WebContentsView transparente que fica sobre o streamingView. Gerencia:

- **Menu de contexto:** Início, Recarregar, Zoom, Volume, Monitor, Desligar
- **Volume toast:** Feedback visual ao alterar volume
- **Z-order management:** Overlay fica fora da composição por padrão. Quando menu/toast abre, ele é adicionado acima do streaming; ao fechar, é removido.

**Fluxo do menu:**
1. Tecla `ContextMenu` → main monta o overlay e envia `show-menu`
2. Overlay mostra menu → envia `overlay:show-menu` → main sobe overlay ao topo + dá foco
3. D-pad navega no menu → overlay processa internamente
4. Seleção/Voltar → overlay esconde menu → envia `overlay:hide-menu` → main remove overlay + foca streaming

## Navegação por D-pad

O spatial navigation nativo está desabilitado; um polyfill é injetado por streaming quando habilitado pelo slug. Além disso, `before-input-event` no main.js captura teclas especiais:

| Tecla | Ação |
|-------|------|
| `BrowserBack` | Voltar / fechar menu |
| `BrowserHome` | Ir pra homepage |
| `ContextMenu` | Abrir/fechar overlay menu |
| `VolumeUp` / `VolumeDown` | Volume (via globalShortcut) |

A homepage (`frontend/script.js`) mantém estado de navegação (`navState`) para gerenciar foco entre grid, settings sidebar, settings content, etc.

## Stack Técnica

| Componente | Tecnologia |
|------------|-----------|
| Runtime | Electron (castlabs fork com Widevine) |
| Empacotamento | electron-builder declarado, não validado e fora desta promoção |
| Bluetooth | D-Bus nativo (dbus-next) |
| Wi-Fi | NetworkManager (nmcli) |
| Volume | WirePipe (wpctl) |
| Display | Xorg (sem DE) |
| Bootstrap externo | systemd instalado observado; templates versionados fora do runtime ativo |
| Lado do sistema | Debian 13 (Trixie) |

### Dependências Node.js

- `electron` (castlabs+wvcus) — runtime com Widevine DRM
- `dbus-next` — comunicação D-Bus nativa (Bluetooth)
- `electron-builder` — empacotamento (.deb, .AppImage)

## Convenções

- Commits NUNCA devem ser feitos sem autorização expressa do usuário
- Não adicionar comentários no código a menos que solicitado
- Usar a branch atual como fonte de verdade; a `main` antiga não define o runtime automaticamente
- Customizações por streaming ficam em `electron/views/streaming-customizations/`, mapeadas em `config.js`
- IPC channels seguem padrão `domínio:ação` (ex: `volume:up`, `bt:scan`)
- Preloads são específicos por contexto: `preload.js` (homepage), `preload-overlay.js` (overlay), `preload-streaming.js` (streaming)
- CSS do overlay usa visual glassmorphism (backdrop-filter, transparência)
- Ícones estáticos podem ser inline; ícones de apps também existem em `frontend/assets/icons/`

## Comandos Úteis

```bash
# Desenvolvimento (Fedora)
npm run dev                    # Electron em janela (sem kiosk)

# Produção (all-in-one)
npm start                      # Electron em kiosk mode

# Validação local
npm test                       # testes node:test
npm run check                  # syntax checks + testes
git diff --check               # whitespace do diff

# Debug no all-in-one
journalctl -u fifotv -f       # Logs do serviço em tempo real
sudo systemctl status fifotv  # Status do serviço
sudo systemctl restart fifotv # Reiniciar serviço
```

## Testes Versionados

Os testes puros da fundação ficam em `test/` e são executados por `npm test` ou `npm run check`. O diagnóstico físico de teclas usa `npx electron scripts/keytest.js`.

## Framework Externo de Testes

Existe documentação histórica de um framework em `/home/rafael/Documentos/FIFOtv Testes Autônomos/`. Ele fica fora deste workspace e não é evidência automática da promoção atual.

### Como rodar

```bash
cd "/home/rafael/Documentos/FIFOtv Testes Autônomos"

# Teste genérico (homepage)
node run.js

# Teste específico
node tests/youtube-test.js
```

### Criar um teste novo

1. Criar arquivo em `tests/nome-do-teste.js`
2. Usar a lib em `lib/` pra interagir
3. Exemplo:

```javascript
const { launch, close } = require('../lib/connection');
const { screenshot } = require('../lib/screenshot');
const { click, pressKey } = require('../lib/interact');
const { waitForHomepage, waitForPageStable } = require('../lib/navigation');

async function run() {
  const { browser, page } = await launch({ headless: true });
  try {
    await waitForHomepage(page);
    await screenshot(page, '01-homepage');

    // ... sua ação aqui ...

    await screenshot(page, '02-resultado');
  } finally {
    await close(browser);
  }
}
run();
```

### Regras

- **NUNCA** modificar arquivos em `/home/rafael/Documentos/FIFOtv/`
- Testes rodam da pasta de testes
- Screenshots ficam em `results/`
- Electron abre em headless por padrão
- Usar `waitForPageStable(page)` depois de qualquer ação que pode causar navegação

### Lib disponível

- `lib/connection.js` — launch/close do Electron
- `lib/screenshot.js` — screenshot, screenshotElement, screenshotFull
- `lib/interact.js` — click, pressKey, typeText, wait, waitForElement
- `lib/navigation.js` — waitForPageStable, waitForHomepage, waitForUrl, waitForNavigationAway
- `lib/analyze.js` — getDOM, getElementCount, getText, isVisible, getVisibleElements

## Documentação

| Arquivo | Conteúdo |
|---------|----------|
| `docs/BUGS.md` | Bugs conhecidos e status |
| `docs/ACTIVE_RUNTIME_SCOPE.md` | Inventário ativo aprovado |
| `docs/ARCHITECTURE.md` | Arquitetura Electron ativa |
| `docs/DEVELOPMENT_GUIDE.md` | Guia da fundação atual |
| `docs/MANUAL_TEST_CHECKLIST.md` | Regressão manual reutilizável |
| `docs/SESSION-PLAN.md` | Plano de sessões de desenvolvimento |
| `docs/old/` | Documentos históricos movidos intencionalmente |

## Desenvolvimento (contexto local)

> As informações abaixo são relevantes apenas durante o desenvolvimento.

**Máquina de teste:** Positivo Union UD3630 (all-in-one), Intel Celeron N3060, 3.5GB RAM, 1280x720, Debian 13.

**Acesso SSH:** `tv@<IP>` (serviço ssh habilitado no boot).

**User no all-in-one:** `tv`

**Logs:** `journalctl -u fifotv -f`

## Logging (electron-log)

### Arquivo de configuração
`/home/tv/smarttv/config/logging.json`

```json
{
  "enabled": true,
  "level": "info",
  "file": "/var/log/fifotv/main.log",
  "maxSize": 5242880,
  "consoleOutput": false
}
```

### Campos
| Campo | Descrição |
|-------|-----------|
| `enabled` | Ativa/desativa logging em arquivo |
| `level` | Nível: `error`, `warn`, `info`, `verbose`, `debug`, `silly` |
| `file` | Caminho do arquivo de log (rotação automática em `maxSize`) |
| `maxSize` | Tamanho máximo em bytes antes de rotacionar (default 5MB) |
| `consoleOutput` | Se `true`, também imprime no stdout/journalctl |

### Como ativar/desativar

**Via arquivo (persistente, requer restart):**
```bash
# Desativar
sed -i 's/"enabled": true/"enabled": false/' /home/tv/smarttv/config/logging.json

# Ativar
sed -i 's/"enabled": false/"enabled": true/' /home/tv/smarttv/config/logging.json

# Mudar nível
sed -i 's/"level": "info"/"level": "debug"/' /home/tv/smarttv/config/logging.json

# Reiniciar app
sudo systemctl restart fifotv
```

Os handlers Electron `logging:*` não possuem bridge nem socket Unix no runtime atual. A configuração operacional suportada nesta fase é o arquivo seguido de restart.

### Ver logs em tempo real
```bash
# Arquivo (recomendado - completo)
tail -f /var/log/fifotv/main.log

# journalctl (apenas main process + Chromium logs)
journalctl -u fifotv -f
```

### O que é capturado
- **Main process:** todos os `console.log/error/warn` (IPC handlers, BT, volume, navegação, etc.)
- **Renderer processes:** eventos explícitos de `splashView`, `homeView`, `streamingView`, `loadingView` e `overlayView`
- **Erros críticos por view:** `did-fail-load`, `render-process-gone`, `preload-error` e `unresponsive`
- **GPU:** evento global `child-process-gone`
- **Erros de rede:** um listener por sessão, atribuído por `webContentsId`, exceto `ERR_ABORTED`
- **URLs:** credenciais, query e fragment são removidos dos logs explícitos

### Handlers internos de Logging
| Canal | Descrição |
|-------|-----------|
| `logging:get-status` | Handler sem bridge atual |
| `logging:set-enabled` | Handler sem bridge atual |
| `logging:set-level` | Handler sem bridge atual |

---
