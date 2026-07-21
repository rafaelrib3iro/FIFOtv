# Arquitetura Electron

## Escopo

Esta é a fonte técnica do runtime Electron da branch atual. Ela deriva do código, das configurações versionadas e dos testes; `docs/README.md` define a ordem de autoridade da documentação.

O systemd instalado é somente uma fronteira ambiental observada: ele pode iniciar o checkout encaminhando `--kiosk`. O único arquivo versionado em `system/`, `.xinitrc`, é um helper local de Xorg e não integra a arquitetura ativa.

## Bootstrap

`package.json` define `electron/main.js` como entrada. Os comandos de execução são:

- `npm run dev`: desenvolvimento direto no Linux, com `electron .`.
- `npm run dev:mac`: desenvolvimento no macOS; executa o mesmo Electron com o perfil macOS explícito.
- `npm run appliance`: execução manual no Debian/all-in-one; encaminha `--kiosk`.
- `npm start`: alias de compatibilidade de `npm run appliance`.

O main não consome atualmente esse argumento para criar um segundo modo de janela. `dev`, `appliance` e `start` usam o mesmo runtime Linux, cuja janela é criada sem frame e dimensionada para o display. Homologação no all-in-one e uso como appliance são contextos operacionais desse mesmo runtime: a primeira exige o checklist manual e a segunda normalmente é iniciada pela unidade systemd externa.

No aparelho inspecionado, uma unidade externa em `/etc/systemd/system/fifotv.service` aponta para o Electron Castlabs instalado em `node_modules`, usa este checkout como diretório de trabalho e adiciona `--kiosk`. A configuração operacional completa desse serviço fica fora do escopo da fundação.

`npm run visual` inicia um servidor HTTP somente em `127.0.0.1:4173` e disponibiliza a home em `/frontend/`. Esse modo injeta uma bridge de navegador somente quando o preload Electron não definiu `window.fifotv`: ele lê o catálogo ativo de forma somente leitura, mantém alterações de catálogo apenas em memória e substitui capacidades locais por respostas explícitas de indisponibilidade. É uma ferramenta de desenvolvimento e inspeção da home, não outro runtime do produto nem uma substituição da homologação Debian.

Antes de `app.whenReady()`, o main configura switches do Chromium. Ao ficar pronto, espera `components.whenReady()` quando disponível para inicializar os componentes Castlabs/Widevine, cria a janela principal e registra permissões restritas ao `mediaKeySystem`.

## Processo Main

`electron/main.js` concentra a orquestração ativa:

- Inicialização do Electron e Widevine.
- Criação, composição e destruição das views.
- Registro de IPC e validação de origem/payload.
- Catálogo persistido no checkout.
- Wi-Fi, Bluetooth, volume, métricas, DPMS e ações de sistema.
- Navegação do app ativo e lifecycle do overlay.
- Registro de runtimes e lifecycle da sessão do app ativo.
- Logging de main, renderers, rede e falhas de processo.
- Atalhos globais e encaminhamento de teclas.

Módulos pequenos isolam contratos puros sem criar uma camada de serviços artificial:

| Módulo | Responsabilidade |
|---|---|
| `electron/ipc-validation.js` | Validação de payloads privilegiados |
| `electron/app-catalog.js` | Parse, validação e migração única do catálogo de apps |
| `electron/app-runtimes.js` | Registro e resolução do runtime por tipo de app |
| `electron/web-runtime.js` | Sessão do runtime `web`: view externa, identidade, injeção, foco, comandos e encerramento |
| `electron/system-controls.js` | Parser do `nmcli` e clamp |
| `electron/view-lifecycle.js` | Validade da view e geração corrente |
| `electron/provider-resolution.js` | Matching de hostname e seleção de script |
| `electron/streaming-injection.js` | Ordem assíncrona de injeção |
| `electron/client-hints.js` | Client Hints por sessão e `webContentsId` |
| `electron/runtime-logging.js` | Listener de rede por sessão, atribuição e redaction |

## Modelo de Views

A aplicação usa uma `BrowserWindow` sem frame como contentor. O `webContents` próprio da janela carrega apenas um documento `data:` preto para impedir flash branco. A interface é formada por `WebContentsView` empilhadas em `win.contentView`.

### Splash

`splashView` carrega `frontend/splash.html`. Após 3,5 segundos, ela é removida e destruída antes da criação da home.

### Home

`homeView` carrega `frontend/index.html` com `electron/preload.js`, `contextIsolation: true` e `nodeIntegration: false`. A home permanece montada durante o streaming, preservando DOM, estado de navegação e `localStorage`.

### App ativo

O `main.js` abre o app pedindo uma sessão ao registro de runtimes e conserva apenas a referência à sua view para compô-la com home, loading e overlay. Ele é o anfitrião da TV: cria a janela, administra as views locais, foco, energia, IPC e a volta para a home. O runtime decide como abrir, redimensionar, focar, recarregar, receber comandos e encerrar o seu app.

No ciclo atual, somente o runtime `web` existe. Sua sessão, em `electron/web-runtime.js`, carrega URL HTTP/HTTPS externa, usa `electron/preload-streaming.js`, mantém `nodeIntegration: false` e usa `contextIsolation: false` para a identidade JavaScript exigida pelos providers atuais.

A view recebe uma geração monotônica. Callbacks de `dom-ready`, timers, injeção e recuperação verificam se operam sobre a mesma view viva e geração corrente. Falha de load do frame principal ou encerramento do renderer retorna para a home uma única vez. Voltar à home fecha o app; pausa, retomada e múltiplos apps em memória não existem.

### Loading

`loadingView` carrega `electron/views/loading.html` com nome e ícone do app. Ela é adicionada acima do streaming e removida por timeout de segurança de cinco segundos, com guarda contra uma view substituída.

### Overlay

`overlayView` carrega `electron/views/overlay.html` com `electron/preload-overlay.js`. Ela não permanece sobre o streaming quando ociosa: é anexada somente para menu, monitor ou toast e removida ao terminar a interação.

O streaming nunca é removido do compositor para mostrar o overlay. Essa decisão evita flash, perda de estado visual e problemas de foco. Toasts não tomam foco; menu e monitor transferem foco explicitamente e o devolvem ao streaming no fechamento.

## Preloads e Renderers

### Home preload

`electron/preload.js` expõe somente os grupos usados por `frontend/script.js`:

- Catálogo.
- Sistema visível.
- Volume.
- Wi-Fi.
- Bluetooth.
- Navegação.
- DPMS/screensaver.
- Eventos globais de tecla e reset do screensaver.

### Overlay preload

`electron/preload-overlay.js` expõe volume, stats, navegação, shutdown/restart, zoom, foco, z-order, toast e eventos enviados pelo main. APIs sem consumidor ou sem emissor foram removidas.

### Streaming preload

`electron/preload-streaming.js` não expõe `window.fifotv`, `contextBridge` ou `ipcRenderer`. Ele tenta aplicar a identidade JavaScript do contexto de streaming, enquanto o main controla User-Agent e Client Hints de rede. Netflix e Prime possuem exceções diferentes entre essas camadas. Nem todos os descriptors de `navigator` e `screen` são garantidos pelo Chromium atual; identidade efetiva precisa ser medida por provider. Mudanças dependem de validação específica de login, DRM e playback.

## IPC e Fronteiras de Privilégio

Todos os handlers ativos passam por `handleFrom()` ou `onFrom()`. A autorização exige simultaneamente:

- `event.sender` igual ao `webContents` de uma view permitida.
- View existente e não destruída.
- `event.senderFrame` igual ao frame principal do sender.

O main também valida payloads antes de efeitos colaterais: catálogo, IDs, URL, slug, MAC, booleanos, zoom, foco, nível de logging e credenciais Wi-Fi.

Distribuição de capacidades:

- Somente home: CRUD, reboot, info, screen-off, Wi-Fi e Bluetooth.
- Home e overlay: shutdown, restart, stats e volume.
- Somente overlay: reload, zoom, foco, z-order e toast.
- Home ou overlay: retorno à home.
- Streaming externo: nenhuma bridge FIFOtv.

`homeView` e `overlayView` bloqueiam `window.open` e navegação para destinos não `file:`. O streaming possui política separada e nega novas janelas, mas pode navegar dentro de sua view externa.

O teste `test/ipc-contracts.test.js` verifica que cada canal exposto pelos preloads possui handler/listener ou emissor e que cada método exposto possui consumidor no renderer correspondente.

## Catálogo de Apps e Persistência Atual

O catálogo ativo é `backend/apps.json`. O main lê, valida e escreve `{ apps: [...] }`; cada app atual possui `id`, `name`, `slug`, `type: "web"` e `url`. JSON inválido, formato inválido, IDs duplicados ou arquivo ausente geram erro explícito. A home não cria um catálogo alternativo silencioso.

Na primeira abertura de um checkout que ainda só possui `backend/streamings.json`, o catálogo legado é convertido uma vez para apps web e gravado em `backend/apps.json`. O arquivo legado é somente uma fonte de migração, não um segundo catálogo ativo.

Cada entrada possui ID inteiro seguro, nome não vazio, slug validado, tipo permitido e URL HTTP/HTTPS com ou sem protocolo inicial. Cards armazenam `data-app-id`; posição visual não é usada como identidade. Reordenação e remoção restauram foco para uma ação válida.

“Mais Usados” é estado local da home em `localStorage`. Ele altera a ordem visual, mas a ativação resolve o item pelo ID estável.

Catálogo, logging e settings ainda usam caminhos dentro do checkout. Migração para `app.getPath('userData')`, schema, backup, escrita atômica e rollback pertencem ao backlog de persistência.

## Navegação, Foco e Estado Transitório

`frontend/script.js` mantém o estado de navegação da home entre grid, header, Settings e ações de lista. `Popup` e `PopupNavigator`, em `frontend/popup-manager.js`, controlam visibilidade, animação e foco dos popups.

O modal de senha Wi-Fi possui uma única Promise ativa. Cancelamento, confirmação, BrowserBack, Escape ou fechamento global resolvem essa Promise no máximo uma vez.

O monitor da home e o monitor do overlay mantêm no máximo um intervalo de polling. O fechamento semântico limpa o intervalo antes de ocultar a UI.

No streaming:

- ContextMenu monta o overlay e abre o menu.
- BrowserBack fecha primeiro o estado transitório aplicável ou navega no provider.
- BrowserHome retorna à home.
- A saída centralizada limpa views, timers, Client Hints, power blocker e listener `app-command`.
- A home recebe foco novamente e reinicia seus timers de screensaver.

## Runtime Web: Providers e Pipeline de Injeção

`electron/app-runtimes.js` registra o runtime `web`; `electron/web-runtime.js` contém sua implementação. O contrato de uma sessão é pequeno: ela fornece sua `view` e as operações `focus`, `reload`, `setBounds`, `zoom`, `handleAppCommand`, `handleInput` e `dispose`. O `main.js` continua dono das views locais, overlay, energia, IPC, z-order e recuperação para a home. Um runtime futuro não herda identidade, injeções ou regras de navegação do web automaticamente.

A URL do catálogo é normalizada antes da seleção. YouTube é reconhecido por hostname exato/subdomínio válido e direcionado a `https://www.youtube.com/tv`. Prime Video também é detectado por limite real de hostname, sem substring de query ou domínio semelhante.

`electron/views/streaming-customizations/config.js` mapeia hostname para script. O matching aceita host exato ou subdomínio e escolhe a configuração mais específica. Redirects são preservados porque a seleção usa a URL corrente em `dom-ready`.

Ordem do pipeline:

1. Polyfill de navegação espacial, habilitado por padrão e desabilitado explicitamente por slug quando necessário.
2. Helpers compartilhados.
3. Atribuição do slug corrente.
4. Configuração espacial por slug.
5. Script específico, quando o hostname possui mapeamento não nulo.

Cada estágio é aguardado. A pipeline para na primeira falha ou quando a geração deixa de ser corrente. Logs registram provider, hostname, estágio e URL redigida.

Configuração atual:

- YouTube e Prime Video: sem script específico.
- Netflix e Disney+: scripts diretos por domínio.
- Max e Globoplay: scripts selecionados após hostname/redirect compatível.
- Apple TV e Apple Music: scripts por host Apple.
- Google, Nuvio e apps sem mapeamento: pipeline compartilhada aplicável.

Client Hints são adicionados somente às requisições do `webContentsId` registrado. Remover um streaming remove seu consumidor sem apagar o listener compartilhado da sessão.

## Integrações Locais Ativas

| Integração | Implementação atual |
|---|---|
| Volume | `wpctl`; estado lido após cada alteração |
| Wi-Fi | `nmcli`; status/scan usam comandos estáticos e parser terse; connect usa `execFile` |
| Bluetooth | `dbus-next` sobre BlueZ; agente NoInputNoOutput, scan com restauração de flags e suporte a múltiplos conectados |
| Métricas | `/proc/stat`, `free -m`, `df` e contagem de processos |
| Tela | `xset dpms force off` e timers da home |
| Energia | `powerSaveBlocker` durante streaming |
| Sistema | shutdown, reboot e relaunch do Electron |
| DRM | `components.whenReady()` e permissão `mediaKeySystem` |

Essas integrações dependem do Debian e do hardware. Inspeção estática não substitui teste de Wi-Fi, Bluetooth, áudio, DPMS, controle físico ou DRM.

O desenvolvimento local no macOS usa `FIFOtv_RUNTIME_PROFILE=macos`: o perfil grava em `.runtime-logs/main.log`, não inicializa BlueZ/D-Bus e recusa desligar ou reiniciar a máquina; `btStatus()` mantém estado neutro sem tentar abrir o socket Linux. A reinicialização do próprio FIFOtv permanece disponível. O runtime padrão continua destinado ao Linux; os controles permanecem visíveis e workarounds de Wi-Fi, volume e DPMS ainda dependem do ambiente principal.

## Logging

`config/logging.json` define ativação, nível, arquivo, tamanho e saída de console. Quando habilitado, `electron-log` recebe logs do main e eventos explícitos dos renderers.

No perfil macOS, somente o destino do arquivo é substituído por `.runtime-logs/main.log`; as demais opções permanecem as de `config/logging.json`. O perfil padrão preserva o caminho configurado para Linux.

`attachRendererLogging()` registra console, falha de load, renderer encerrado, preload, responsividade e cleanup. `electron/runtime-logging.js` mantém um único listener `onErrorOccurred` por sessão e atribui falhas usando `webContentsId`.

URLs estruturadas pelo main nos logs de rede e injeção removem credenciais, query e fragment. `net::ERR_ABORTED` é ignorado no listener de rede. Falhas GPU usam o evento global `child-process-gone` e não recebem label falso de view. Mensagens de console emitidas por páginas externas são conteúdo não confiável e não possuem garantia geral de redaction.

## Ferramentas de Desenvolvimento

`scripts/dev.sh`, `scripts/keytest.js`, `frontend/keytest.html` e `test/` são ferramentas de desenvolvimento/diagnóstico, não componentes do produto.

OpenCode também é classificado exclusivamente como ferramenta de desenvolvimento. Ele não aparece na home nem nos preloads normais. Por decisão explícita do usuário, o comportamento atual foi preservado: o arquivo versionado `config/settings.json` contém `remoteEnabled: true`, portanto o checkout atual tenta garantir o serviço em todo startup. O fallback do código é `false` quando o arquivo está ausente ou inválido. Não foi adicionada a condição `FIFOTV_DEV`. Uma porta 3000 ocupada é preservada como processo externo; um processo iniciado pelo Electron usa sessão destacada sem pipes e não depende do encerramento da TV.

Os handlers `remote:*` permanecem sem bridge. Isso não transforma OpenCode em funcionalidade suportada da TV. Autenticação, TLS, bind, firewall, ownership e supervisão de produto estão fora desta fundação.

## Decisões Arquiteturais Consolidadas

- Preservar Electron Castlabs e o modelo `BrowserWindow` + `WebContentsView`.
- Preservar a home montada durante streaming.
- Não modularizar `main.js` apenas por tamanho.
- Autorizar IPC por view e frame principal.
- Tratar dados externos como texto/nós DOM, não HTML executável.
- Executar dados dinâmicos de comandos sem shell.
- Resolver cards e providers por identidades estáveis, não posição ou substring.
- Tornar callbacks e recursos assíncronos dependentes da view/geração corrente.
- Manter identidade, DRM e customizações específicas condicionados a teste por provider.
- Tratar OpenCode como ferramenta de desenvolvimento, não produto.
- Tratar switches do Chromium como configuração global do processo; identidade, polyfill espacial e customizações pertencem ao runtime `web`.
- Manter webOS como pesquisa futura: ele exigirá preload, segurança e validação próprios, sem reutilizar a bridge ou o pipeline web por padrão.

## Limitações e Backlog

Não fazem parte da arquitetura implementada ou suportada:

- Flask/Python/Chromium/Openbox e extensão v1.
- ISO, instalador, boot, Plymouth e autologin.
- Updater e canal de distribuição; os scripts legados existentes falham de forma explícita.
- `.deb`, AppImage e release reproduzível. Os comandos estão declarados, mas o `build.files` não inclui catálogo/configuração e a persistência ainda escreve no checkout.
- Migração completa para `userData`.
- Endurecimento amplo de spoofing/customizações sem reprodução.
- OpenCode como funcionalidade suportada de produto.

Registros da consolidação e dos componentes removidos permanecem em `docs/history/` e nas tags de preservação listadas em `docs/README.md`.
