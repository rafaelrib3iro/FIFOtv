# Revisão Arquitetural FIFOtv

> **Documento histórico do baseline `9b31cec`.** Não use caminhos, linhas ou conclusões daqui como estado atual. Fontes removidas permanecem na tag `electron-foundation-before-repository-cleanup`; a fonte técnica atual é `docs/ARCHITECTURE.md`.

Revisão estática da branch `refactor/electron-foundation`, commit `9b31cec`. Nenhum arquivo foi alterado, nenhuma dependência foi instalada e a aplicação não foi executada. O único item não versionado já existente é `.directory`.

## Conclusão Executiva

A base Electron atual é arquiteturalmente viável. O modelo de uma `BrowserWindow` com múltiplas `WebContentsView` deve ser preservado. Não há evidência que justifique reescrever a aplicação, trocar Electron ou introduzir framework frontend.

Os principais problemas não estão no modelo de views, mas em quatro áreas:

1. Fronteiras privilegiadas inseguras: dados externos entram em HTML e em comandos shell.
2. Estados de navegação, foco e overlay distribuídos e parcialmente contraditórios.
3. Identidade e configuração dos aplicativos espalhadas entre slug, domínio, URL e scripts.
4. Runtime Electron, persistência, build, instalação e atualização representam gerações diferentes do produto.

Há também defeitos funcionais já presentes, incluindo cards que podem abrir o aplicativo errado, monitor do overlay invisível, spoofing parcialmente inoperante, métricas incorretas e ações exibidas sem implementação.

## Prioridades

| Prioridade | Significado |
|---|---|
| P0 | Vulnerabilidade ou risco operacional imediato |
| P1 | Defeito funcional importante ou bloqueio de evolução/distribuição |
| P2 | Fragilidade real de manutenção ou comportamento inconsistente |
| P3 | Deriva documental, contrato morto ou melhoria de baixo risco |

# Arquitetura Atual

## Inicialização

O fluxo de produção pretendido é:

```text
TTY1/autologin
  → startx
  → .xinitrc mantém Xorg ativo
  → fifotv.service
  → Electron main process
  → BrowserWindow única
  → WebContentsViews empilhadas
```

Referências:

- `system/.xinitrc:1-8`
- `system/fifotv.service:1-19`
- `electron/main.js:1157-1298`

O main espera o componente Castlabs/Widevine, tenta restaurar o acesso remoto, cria a janela, mostra o splash por 3,5 segundos e depois cria a homepage.

## Composição das Views

```text
BrowserWindow.contentView
├── splashView
├── homeView
├── streamingView
├── loadingView
└── overlayView
```

A `homeView` permanece montada como fundo. Ao abrir um aplicativo:

1. O main cria a `streamingView`.
2. Normaliza a URL e aplica identidade TV.
3. Injeta polyfill, helpers e customização do serviço.
4. Cria `loadingView` e `overlayView`.
5. Adiciona streaming e loading ao compositor.
6. Remove o loading após cinco segundos.
7. Mantém o overlay fora da árvore enquanto ocioso.

Esse desenho evita destruir a homepage e evita remover o streaming do compositor quando o overlay aparece.

## Comunicação

A homepage recebe uma bridge ampla em `electron/preload.js`, com CRUD, rede, Bluetooth, volume, sistema, navegação e acesso remoto.

O overlay recebe uma bridge menor em `electron/preload-overlay.js`.

O streaming externo não recebe `window.fifotv`, mas executa `preload-streaming.js` no mesmo mundo da página porque usa `contextIsolation: false`.

## Navegação

A entrada de usuário passa por vários caminhos:

- `globalShortcut` para volume e mídia.
- `BrowserWindow.app-command` para botões de navegador.
- `before-input-event` na home e no streaming.
- Eventos DOM na home e overlay.
- Navegação própria do serviço.
- Polyfill WICG injetado em serviços selecionados.

A homepage mantém uma máquina de estados informal em `frontend/script.js:124-142`. Foco lógico, foco DOM e foco da view Electron são controlados separadamente.

## Persistência

| Estado | Local |
|---|---|
| Catálogo | `backend/streamings.json` |
| Logging | `config/logging.json` |
| Acesso remoto | `config/settings.json` criado em runtime |
| Contadores de uso | `localStorage` da homepage |

Os três JSON do main ficam ou são criados dentro do checkout Git.

## Integrações do Sistema

Todas estão concentradas em `electron/main.js`:

- Volume via `wpctl`.
- Wi-Fi via `nmcli`.
- Bluetooth via BlueZ/D-Bus.
- Estatísticas via comandos Unix.
- Update via shell script.
- Acesso remoto via processo `opencode serve`.
- Shutdown, reboot e DPMS via comandos externos.

# Pontos Positivos a Preservar

1. **Uso de `WebContentsView`.** É coerente com o Electron atual e evita a API `BrowserView` depreciada.

2. **Uma única janela real.** Reduz complexidade de kiosk, compositor e consumo em hardware fraco.

3. **Streaming nunca removido para exibir menu ou toast.** Essa decisão corrigiu flashes e perda de foco, conforme o registro hoje preservado em `docs/history/migration/V2_MIGRATION_BUGS.md`.

4. **Home e overlay endurecidos.** Ambos usam `contextIsolation: true` e `nodeIntegration: false`.

5. **Bridge separada por contexto.** O overlay possui menos capacidades que a homepage.

6. **Conteúdo externo sem bridge FIFOtv.** Não foi encontrada exposição direta de `ipcRenderer`, Node ou das operações do sistema ao streaming.

7. **Permissões negadas por padrão.** Apenas `mediaKeySystem` é autorizado em `electron/main.js:1190-1198`.

8. **Popups externos negados por padrão.** `setWindowOpenHandler()` retorna `deny`.

9. **Customizações separadas por serviço.** A pasta `streaming-customizations` é uma fronteira útil e deve continuar existindo.

10. **Exceções baseadas em regressões conhecidas.** YouTube usa `/tv`; Prime Video permanece sem customização específica devido a um problema de reprodução documentado.

11. **Bluetooth por D-Bus.** É uma melhoria real sobre o fluxo legado baseado em `bluetoothctl`.

12. **Destruição postergada no retorno à home.** O `setImmediate()` em `nav:go-home` evita destruir o renderer durante seu próprio handler IPC.

13. **Timeouts em comandos e operações Bluetooth.** Evitam parte dos bloqueios permanentes.

# Problemas Arquiteturais

## 1. Injeção de comandos no Wi-Fi

**Prioridade:** P0.

**Evidência:** `run()` usa `exec()` em `electron/main.js:77-82`. SSID e senha entram diretamente no shell em `electron/main.js:360-362`:

```js
run(`nmcli dev wifi connect "${ssid}" password "${password}"`)
```

Aspas duplas não bloqueiam substituições como `$()` e crases. Um SSID é controlável por qualquer ponto de acesso próximo.

**Impacto atual:** selecionar uma rede com nome malicioso pode executar comandos como usuário `tv`. A senha também fica visível na linha de comando do processo.

**Risco futuro:** combinado com uma injeção na homepage ou permissões administrativas do usuário, amplia-se para comprometimento do appliance.

**Recomendação:** substituir apenas os comandos com entrada dinâmica por `execFile`/`spawn` com argumentos separados e `shell: false`. Para não expor senha em `ps`, considerar stdin ou D-Bus do NetworkManager posteriormente.

**Risco da mudança:** baixo a médio; SSIDs abertos, ocultos, Unicode e com espaços precisam ser preservados.

**Comportamento a preservar:** conexão com redes protegidas e feedback `{ok, output}`.

**Validação:** testar SSIDs e senhas com espaços, aspas, `$()`, ponto e vírgula, dois-pontos, barra invertida e Unicode, confirmando que nenhum comando secundário é executado.

---

## 2. XSS no renderer privilegiado da homepage

**Prioridade:** P0.

**Evidência:** dados externos são inseridos em `innerHTML` e handlers inline:

- Cards: `frontend/script.js:242-272`
- Wi-Fi: `frontend/script.js:1005-1016`
- Bluetooth: `frontend/script.js:1100-1140`
- Lista de aplicativos: `frontend/script.js:1213-1231`
- Cache: `frontend/script.js:1268-1281`
- Toasts: `frontend/script.js:1303-1317`

A página não possui CSP e recebe a bridge privilegiada de `electron/preload.js:3-52`. Não há bloqueio de navegação da `homeView`.

**Impacto atual:** nome de app, SSID ou nome Bluetooth pode injetar markup e JavaScript. SSIDs e nomes Bluetooth são controláveis externamente. O código injetado pode chamar shutdown, update, Wi-Fi, acesso remoto e outras operações.

**Risco futuro:** qualquer nova capacidade adicionada ao preload automaticamente aumenta o impacto. Se a home navegar para uma origem remota, o preload continua associado à view.

**Recomendação:** construir dados externos com `createElement`, `textContent`, propriedades DOM e `addEventListener`. Bloquear `will-navigate` da home e overlay para origens não locais. Adicionar CSP após remover scripts e handlers inline incompatíveis.

**Risco da mudança:** médio; ícones, fallbacks e navegação D-pad dependem da estrutura atual do DOM.

**Comportamento a preservar:** nomes Unicode, fallback de ícone, clique por air mouse e foco por D-pad.

**Validação:** inserir HTML, SVG, aspas e handlers em nomes, URLs, SSIDs e Bluetooth. Todo conteúdo deve aparecer literalmente e nenhuma API FIFOtv deve ser chamada.

---

## 3. Cards podem abrir outro aplicativo após “Mais Usados” mudar

**Prioridade:** P1.

**Evidência:** os cards guardam posições calculadas durante `renderGrid()` em `frontend/script.js:231-301`. No clique, `activateCard()` recalcula `getMostUsed()` em `frontend/script.js:768-793`. A homepage permanece montada e não é renderizada novamente ao voltar do streaming.

**Impacto atual:** após o primeiro uso, a quantidade ou ordem de “Mais Usados” pode mudar sem o DOM mudar. Uma posição visual passa a ser reinterpretada com outro offset e pode abrir outro aplicativo.

Exemplo:

```text
DOM inicial: Netflix pos=0, YouTube pos=1, sem recentes
Usuário abre Netflix
Netflix passa a ser recente, mas DOM não é refeito
Usuário clica no card visual do YouTube, ainda pos=1
activateCard considera 1 recente e resolve pos=1 como Netflix
```

**Risco futuro:** qualquer nova ordenação dinâmica aumenta a frequência do erro.

**Recomendação:** vincular cada card a um `streaming.id` estável. A posição deve servir somente para geometria de navegação. Atualizar a seção de recentes quando a home volta a ficar ativa.

**Risco da mudança:** médio; botão Adicionar e slots vazios não podem ser confundidos com IDs de apps.

**Comportamento a preservar:** ordem visual, contadores de uso e retorno ao foco anterior.

**Validação:** testar retorno com 0, 1 e 4 recentes e alterar repetidamente o ranking.

---

## 4. Overlay não possui uma máquina de estados coerente

**Prioridade:** P1.

**Evidência:**

- Main mantém `overlayMenuVisible`: `electron/main.js:39,949-951`.
- Overlay mantém `menuVisible` e `toastVisible`: `electron/views/overlay.js:17-21`.
- O estado visual real depende ainda da presença da view na árvore.
- `showMonitorPopup()` é seguido imediatamente por `hideMenu()`: `overlay.js:293-296`.
- `hideMenu()` devolve foco ao streaming e remove o overlay: `overlay.js:252-268`.
- `overlayView.webContents.setIgnoreMouseEvents()` é chamado em `main.js:933-937`, mas essa API existe em `BrowserWindow`/`BaseWindow`, não em `WebContents`.
- “Configurações” apenas fecha o menu: `overlay.js:297-299`.

**Impacto atual:** o monitor pode continuar logicamente aberto e coletando métricas, mas ficar invisível. O invoke de mouse pode rejeitar. Toasts podem bloquear temporariamente o air mouse. A opção Configurações não executa sua ação anunciada.

**Risco futuro:** novos estados modais ampliarão combinações impossíveis entre montagem, foco, mouse, menu e toast.

**Recomendação:** modelar um único modo de apresentação, por exemplo `hidden`, `toast`, `menu` e `monitor`. Uma única transição IPC deve aplicar montagem, foco e roteamento de entrada de forma coerente.

**Risco da mudança:** médio a alto; z-order e foco já causaram regressões no hardware.

**Comportamento a preservar:** streaming nunca removido do compositor, ausência de flash, toast sem roubar teclado e retorno de foco ao streaming.

**Validação:** matriz menu/monitor/toast com D-pad, air mouse, Escape, BrowserBack e volume.

---

## 5. Identidade dos aplicativos está dispersa e inconsistente

**Prioridade:** P1.

**Evidência:**

- Dados usam `disneyplus` e `hbomax`: `backend/streamings.json:21-31`.
- Spatial navigation usa `disney` e `max`: `electron/views/spatial-navigation/config.js:4-6`.
- `spatial-nav.js` repete `disney` e `max`: linhas 11-16.
- Customizações são escolhidas por domínio em `streaming-customizations/config.js`.
- YouTube e Prime são identificados por substring de URL.
- Netflix e navegação SPA são identificadas por slug.
- Slugs customizados são derivados do nome digitado.

**Impacto atual:** Disney+ e Max recebem o polyfill pelo default, mas não recebem sua configuração espacial específica. Globoplay depende de um redirect para o domínio mapeado. URLs com um domínio apenas na query podem acionar lógica indevida.

**Risco futuro:** rebranding, aliases e apps personalizados aumentam a divergência silenciosa.

**Recomendação:** criar um registro simples e canônico por provider contendo slug, aliases, hostnames, estratégia de navegação, política de identidade e script específico. Usar `new URL().hostname` com fronteiras de subdomínio.

**Risco da mudança:** alto por provider; autenticação, DRM e navegação podem depender de hosts auxiliares.

**Comportamento a preservar:** YouTube `/tv` sem polyfill, Prime sem script específico e slugs usados nos ícones e contadores.

**Validação:** matriz por aplicativo com slug, hostname, script injetado, motor D-pad, back, login e playback DRM.

---

## 6. Spoofing de identidade está parcialmente inoperante

**Prioridade:** P1.

**Evidência em `electron/preload-streaming.js`:**

- Linhas 37-40 combinam descriptor accessor `get` com `writable: false`, combinação inválida em `Object.defineProperty`. As exceções são silenciosamente descartadas.
- O bloco `screen` é direcionado para `navigator`, pois apenas `window` recebe tratamento especial.
- O slug é obtido pelo primeiro argumento que não começa com `-`, não por um argumento nomeado.
- Referências diretas a `WebGLRenderingContext` e `WebGL2RenderingContext` podem interromper o preload se algum construtor estiver ausente.
- O main pula identidade para Prime e Netflix, enquanto o preload pretende pular apenas Prime.

**Impacto atual:** `navigator.userAgent`, plataforma, memória, CPU, idiomas, plugins, screen e `devicePixelRatio` provavelmente não são sobrescritos pelo loop. A resolução real de 1280×720 mascara a falha de `screen` na máquina alvo.

**Risco futuro:** identidade parcial e contraditória pode afetar seleção de interface, DRM e detecção antifraude.

**Recomendação:** usar argumento nomeado, mapear explicitamente `navigator`, `screen` e `window`, corrigir os descriptors e unificar a política de exceções com o registro de providers.

**Risco da mudança:** alto para Netflix e Prime Video.

**Comportamento a preservar:** Widevine, play do Prime e identidade visível no main world.

**Validação:** coletar UA, Client Hints, `navigator`, `screen`, WebGL e slug interpretado em cada provider antes e depois.

---

## 7. Injeção e carregamento não formam uma operação determinística

**Prioridade:** P1.

**Evidência:** em `electron/main.js:720-766`, polyfill, helpers, slug, configuração espacial e script específico são enviados em chamadas independentes de `executeJavaScript()`. As Promises não são aguardadas e os erros são descartados.

O loading é removido por timer fixo em `main.js:815-819`, independentemente de sucesso ou falha. Crashes e `did-fail-load` são apenas registrados.

**Impacto atual:** dependências entre scripts permanecem implícitas, falhas são invisíveis e a UI pode remover o loading cedo demais ou mantê-lo sobre uma página já pronta.

**Risco futuro:** mais customizações aumentam o acoplamento de ordem. Crash de home ou streaming pode deixar o kiosk sem caminho de recuperação.

**Recomendação:** encadear explicitamente os estágios de injeção e registrar falhas por estágio. Associar loading a eventos reais com timeout de segurança. Definir política de recuperação: recriar home ou retornar à home quando streaming falhar.

**Risco da mudança:** médio; SPAs não possuem um único evento que represente “visualmente pronto”.

**Comportamento a preservar:** loading imediato, timeout máximo, cookies e reinjeção após reload completo.

**Validação:** rede rápida, lenta e offline; redirect; reload; crash forçado do renderer; erro de preload e falha de Widevine.

---

## 8. Estado mutável fica dentro do checkout e não é compatível com build

**Prioridade:** P1.

**Evidência:**

- Catálogo: `electron/main.js:45,65-75`.
- Logging: `main.js:10-18,292-305`.
- Settings: `main.js:47,989-1005`.
- Escritas síncronas, diretas e não atômicas.
- Erro de leitura do catálogo vira lista vazia silenciosamente.
- `package.json:30-34` inclui apenas `electron`, `frontend` e `package.json`.
- `backend`, `config` e `scripts/update.sh` ficam fora do pacote.
- Existe um segundo catálogo divergente em `frontend/script.js:210-219`.

**Impacto atual:** CRUD e configuração podem sujar o checkout e bloquear updates. Uma interrupção durante escrita pode truncar o JSON. `.deb` e AppImage tendem a iniciar sem os recursos esperados ou tentar escrever dentro do pacote.

**Risco futuro:** perda de dados, migrações difíceis e builds distribuídos não funcionais.

**Recomendação:** manter defaults imutáveis no pacote e migrar estado para `app.getPath('userData')`. Usar schema versionado, escrita temporária seguida de rename e backup do último estado válido.

**Risco da mudança:** alto; dados existentes precisam de migração idempotente.

**Comportamento a preservar:** catálogo personalizado, ordem, IDs, contadores de uso, logging e remote habilitado.

**Validação:** primeira execução, upgrade, JSON inválido, filesystem somente leitura, interrupção de escrita, `.deb` e AppImage.

---

## 9. Frontend possui estados de foco e modal incompatíveis

**Prioridade:** P1.

**Evidência:**

- `navState`, `focusedIndex`, índices de settings, `document.activeElement` e foco da view são independentes.
- `showMonitorPopup()` não muda `navState`: `frontend/script.js:1520-1525`.
- `closeAllPopups()` esconde o monitor sem limpar `monitorInterval`: linhas 1555-1560.
- `.popup` representa apenas o painel central, não um backdrop modal: `frontend/style.css:475-499`.
- `settingsSection` persiste, mas `settingsSectionIndex` volta a zero.
- `Popup.hide()` não cancela timers de animação: `frontend/popup-manager.js:9-23`.
- O modal Wi-Fi pode ser escondido sem resolver sua Promise.
- Reorder reconstrói o DOM e mantém índices que agora podem apontar para outro app.

**Impacto atual:** entrada pode atuar no grid atrás do monitor, timers podem ficar ativos, foco visual pode desaparecer e operações repetidas podem atingir outro item.

**Risco futuro:** cada novo popup exigirá mais exceções e aumentará estados impossíveis.

**Recomendação:** introduzir um coordenador modal pequeno com popup ativo, estado anterior, restauração de foco e cleanup. Usar identidade estável do item focado, não apenas índice.

**Risco da mudança:** médio a alto por envolver D-pad, teclado e air mouse.

**Comportamento a preservar:** navegação geométrica própria do grid e destaque `.fifotv-focused`.

**Validação:** abrir e fechar cada popup por mouse, D-pad, Escape e BrowserBack; alternar D-pad, Tab e mouse na mesma sessão.

---

## 10. Roteamento de teclas está espalhado e semanticamente divergente

**Prioridade:** P2, podendo subir após teste no hardware.

**Evidência:**

- Main: `electron/main.js:821-889,1234-1283`.
- Home: `frontend/script.js:312-549,1671-1684`.
- Overlay: `electron/views/overlay.js:373-473`.
- Netflix possui handlers próprios.

Divergências concretas:

- F12 reinicia em um caminho e alterna fullscreen em outro.
- F5 abre monitor na home e recarrega no overlay.
- `MediaPlayPause` é convertido em mute.
- BrowserBack depende de `app-command` em parte dos contextos.
- O resultado de `globalShortcut.register()` não é verificado.

**Impacto atual:** a ação depende da view focada e do tipo de evento emitido pelo hardware.

**Risco futuro:** novos controles remotos multiplicarão regressões locais.

**Recomendação:** normalizar entrada bruta em ações semânticas como `BACK`, `HOME`, `OPEN_MENU` e `VOLUME_UP`, mantendo o tratamento nativo das setas nos sites quando o overlay estiver fechado.

**Risco da mudança:** alto; drivers Linux e controles distintos emitem eventos diferentes.

**Comportamento a preservar:** Back especial do YouTube, volume global e D-pad nativo dos serviços.

**Validação:** matriz `tecla × origem do evento × view × estado do menu`, usando o hardware real.

---

## 11. Integrações de sistema retornam estado incorreto ou incompleto

**Prioridade:** P2.

**Evidência:**

- `free -m` já retorna MB, mas o resultado é dividido por 1024: `electron/main.js:186-193`.
- Shutdown, reboot e screen-off retornam sucesso antes do comando terminar.
- `nmcli -t` é processado com `split(':')`, sem tratar escaping.
- Redes abertas ainda passam pelo fluxo obrigatório de senha.
- Volume é atualizado localmente mesmo se `wpctl` falhar.
- Zoom visual é limitado, mas o main continua acumulando zoom.
- `volume:changed` é declarado no preload, mas nunca emitido.

**Impacto atual:** RAM aparece aproximadamente mil vezes menor, SSIDs com `:` são interpretados incorretamente e UI pode divergir do volume e zoom reais.

**Risco futuro:** diagnósticos e decisões de UI baseados em estado falso.

**Recomendação:** tornar o main autoritativo para volume e zoom; retornar resultado real dos comandos; usar parsing robusto ou API estruturada para Wi-Fi.

**Risco da mudança:** baixo a médio.

**Comportamento a preservar:** passos de volume, resposta rápida e shape dos objetos onde possível.

**Validação:** comparar com `free -m`, `wpctl`, zoom do `webContents`, redes abertas e SSIDs especiais.

---

## 12. Bluetooth deixa estado global ativo e não trata restart do BlueZ

**Prioridade:** P2.

**Evidência:**

- Scan força `Pairable` e `Discoverable` para `true`: `electron/main.js:509-510`.
- Os valores anteriores não são restaurados.
- `StopDiscovery()` não está em `finally`.
- Adapter e registro do agent são cacheados indefinidamente.
- Não há serialização entre scan, connect, disconnect e unpair.

**Impacto atual:** o aparelho pode permanecer descobrível, discovery pode ficar ativo após falha e o app pode não se recuperar de restart do BlueZ.

**Risco futuro:** comportamento intermitente com hotplug e operações concorrentes.

**Recomendação:** guardar/restaurar flags em `finally`, sempre parar discovery, invalidar cache em falhas de D-Bus e serializar operações mutáveis.

**Risco da mudança:** médio; restaurar `Pairable` cedo demais pode quebrar pareamento iniciado após o scan.

**Comportamento a preservar:** agent `NoInputNoOutput`, trust e conexão de áudio/controles.

**Validação:** erro durante scan, restart do `bluetoothd`, adapter desligado e operações concorrentes.

---

## 13. Helpers de customização têm lifecycle frágil para SPAs

**Prioridade:** P2.

**Evidência em `streaming-customizations/shared.js`:**

- `interval` é declarado e ignorado.
- `once: false` pode clicar o mesmo elemento em toda mutação.
- `once: true` encerra após a primeira ocorrência de toda a sessão SPA.
- `autoFullscreen()` e `removeElements()` não fazem passagem inicial.
- Apenas parte de `spatialNav()` reaplica configuração em DOM lazy-loaded.

A customização Netflix possui restauração de `tabIndex` por seletor provavelmente incompatível com a conversão de `dataset`, ativa o modo player antes de mostrar controles e não detecta toda saída SPA.

**Impacto atual:** auto-skip pode funcionar apenas no primeiro episódio ou clicar repetidamente. Elementos podem permanecer sem foco. Múltiplos observers globais consomem CPU no hardware alvo.

**Risco futuro:** seletores adicionais multiplicarão queries e efeitos inesperados.

**Recomendação:** definir semanticamente o que significa “uma vez”, “por instância do elemento” e “por episódio”. Fazer passagem inicial e registrar elementos já tratados. Ajustar cada provider somente com teste real.

**Risco da mudança:** alto por streaming.

**Comportamento a preservar:** Prime sem script, auto-skip já confirmado e navegação do Netflix.

**Validação:** pelo menos dois episódios consecutivos sem reload, botão persistente, botão recriado e saída/entrada repetida no player.

---

## 14. IPC não valida sender, origem ou payload

**Prioridade:** P1 como fronteira de segurança; P2 isoladamente.

**Evidência:** handlers em `electron/main.js:103-616,657-983,1129-1154` ignoram o `event.sender`. Não existem schemas para catálogo, URL, MAC, bool, zoom ou reorder.

**Impacto atual:** a homepage possui intencionalmente muitas capacidades, mas uma navegação indevida ou XSS pode usá-las sem barreiras adicionais. Payload inválido pode gerar estado parcial.

**Risco futuro:** qualquer nova bridge ou frame privilegiado poderá chamar canais que não lhe pertencem.

**Recomendação:** autorizar canais pela identidade do `webContents`, bloquear frames secundários quando não necessários e validar payloads no main.

**Risco da mudança:** médio; IDs mudam ao recriar views e a autorização precisa acompanhar lifecycle.

**Comportamento a preservar:** API pública dos preloads e retorno assíncrono atual.

**Validação:** chamar cada canal a partir de home, overlay, streaming e subframe, com payloads válidos e inválidos.

---

## 15. Contratos exibidos não correspondem ao comportamento implementado

**Prioridade:** P1 para ações enganosas; P3 para APIs mortas.

**Evidência:**

- “Limpar cache” apenas mostra sucesso: `frontend/script.js:1284-1286`.
- “Configurações” do overlay não abre configurações.
- `volume:changed`, `bt:status-changed` e `hide-menu` têm APIs de subscription sem produtores ativos.
- Canais `logging:*` não são expostos pelos preloads.
- O socket `/tmp/fifotv-socket` documentado em `AGENTS.md` não existe.
- Respostas IPC alternam entre `{ok}`, dados diretos e erros silenciosos.

**Impacto atual:** usuário recebe confirmação falsa e desenvolvedores podem confiar em APIs que nunca disparam.

**Risco futuro:** cada novo consumidor precisará conhecer exceções implícitas.

**Recomendação:** inventariar contratos e classificar cada um como ativo, não implementado ou removido. Não mostrar sucesso antes da confirmação do main.

**Risco da mudança:** baixo, exceto limpeza real de cache, que pode encerrar sessões e afetar DRM.

**Comportamento a preservar:** não apagar cookies ou logins sem confirmação explícita.

**Validação:** teste de contrato que associe cada API de preload a handler, emissor e consumidor.

---

## 16. Acesso remoto não possui ownership ou segurança verificáveis

**Prioridade:** P1; potencial P0 se exposto sem autenticação na LAN.

**Evidência:**

- Porta ocupada provoca `fuser -k 3000/tcp`: `electron/main.js:1051-1057`.
- O processo é considerado ativo antes de readiness: linhas 1061-1086.
- Health check apenas registra falha.
- Processo detached não é parado em `will-quit`.
- Status usa estado em memória.
- O instalador configura OpenCode em `0.0.0.0`: `system/install/configure.sh:221-235`.
- Não há credencial, TLS ou firewall declarados no repositório.

**Impacto atual:** outro processo legítimo pode ser morto, o botão pode mostrar “Ativo” sem serviço funcional e processos podem ficar órfãos.

**Risco futuro:** se o OpenCode estiver acessível sem autenticação, a rede local recebe acesso a um agente capaz de operar no checkout como usuário `tv`.

**Recomendação:** não matar processos desconhecidos; aguardar readiness; verificar ownership por PID; definir claramente shutdown e restart. Exigir política explícita de bind e autenticação antes de ativar LAN.

**Risco da mudança:** médio; pode alterar a persistência atual após restart.

**Comportamento a preservar:** recurso opt-in, status visível e manutenção remota deliberada.

**Validação:** binário ausente, porta ocupada, crash, restart do app, dois toggles simultâneos e acesso de outra máquina sem credenciais.

**Incerteza:** não foi possível confirmar a autenticação nativa ou configuração efetivamente instalada do OpenCode.

---

## 17. Runtime v2 e instalação continuam representando arquiteturas diferentes

**Prioridade:** P1, bloqueadora para instalação limpa.

**Evidência:**

- `system/install/setup.sh` instala Chromium, Openbox, Python e Flask.
- `configure.sh:69-108` inicia Flask, Openbox, Chromium e extensão.
- `deploy.sh:68-91` não copia `electron`, `package.json`, `scripts` ou `config`.
- O instalador pode marcar `/etc/fifo-tv-ready` mesmo após deploy com warning.
- Existem dois updaters: `update.sh` e `scripts/update.sh`.
- O updater ativo força `git pull origin electron`.
- `package-lock.json` é ignorado.
- A unit codifica UID `1000` e depende indiretamente de Xorg estar pronto.

**Impacto atual:** o equipamento já migrado manualmente pode funcionar, mas uma instalação limpa instala a geração Flask/Chromium. Update na branch atual pode misturar `origin/electron` com a branch de refatoração.

**Risco futuro:** releases não reproduzíveis, rollback incerto e appliance parcialmente atualizado.

**Recomendação:** declarar explicitamente o runtime v2 como perfil canônico e o v1 como legado/rollback. Depois criar um único instalador e um único updater v2, com lockfile, branch/canal explícito, preflight, health check e rollback.

**Risco da mudança:** alto; boot e update são mecanismos de recuperação.

**Comportamento a preservar:** autologin, Xorg sem desktop, restart automático, SSH de manutenção e rollback testado.

**Validação:** Debian 13 limpo em VM/hardware, dois reboots, update sem rede, checkout sujo, dependência inválida e rollback.

# Responsabilidades Concentradas

## `electron/main.js`

São 1.298 linhas contendo:

- Bootstrap e Widevine.
- Logging.
- Persistência.
- IPC.
- Sistema.
- Volume.
- Wi-Fi.
- Bluetooth.
- Remote.
- Criação e destruição de views.
- Z-order.
- Foco.
- Teclado.
- Identidade.
- Injeção de scripts.
- Update.

O problema não é apenas tamanho. As transições de lifecycle não passam por uma fronteira comum. `nav:go-home` limpa power blocker e listeners, mas crashes não passam pela mesma limpeza.

Separações naturais:

```text
electron/
├── main.js
├── app-lifecycle.js
├── views/view-manager.js
├── navigation/navigation-controller.js
├── ipc/register-handlers.js
├── services/streamings.js
├── services/system.js
├── services/wifi.js
├── services/bluetooth.js
├── services/volume.js
├── services/remote.js
└── logging.js
```

Esses módulos não devem mudar os canais IPC inicialmente.

## `frontend/script.js`

São 1.712 linhas contendo:

- Catálogo e uso.
- Renderização.
- Grid e foco.
- Settings.
- Popups.
- Wi-Fi.
- Bluetooth.
- Remote.
- Volume.
- Monitor.
- Screensaver.
- Menus.
- Atalhos.
- Toasts e ícones.

A primeira extração útil não é por tamanho, mas pelos estados que precisam de cleanup:

- Catálogo/grid.
- Input e foco.
- Coordenador modal.
- Settings.
- Adaptador da API FIFOtv.

## `electron/views/overlay.js`

São 511 linhas, com apresentação, estado, métricas, volume, zoom, menu, input e controle de lifecycle da view. O estado de montagem deve ficar no main; o renderer deve cuidar principalmente da apresentação e solicitar modos de alto nível.

# Lógica Excessivamente Espalhada

| Conceito | Locais |
|---|---|
| Identidade do provider | JSON, main, preload, spatial config, custom config, scripts específicos |
| Teclas | main, home, overlay e customizações |
| Estado do overlay | main, preload-overlay e overlay renderer |
| Volume | main, home, overlay e extensão legada |
| Monitor | home e overlay |
| Catálogo default | JSON e fallback frontend |
| Update | dois scripts e handler main |
| Xorg | `.xinitrc`, dois updaters, installer e documentação |
| Runtime | Electron v2 e Flask/Chromium v1 na mesma branch |

# Duplicações e Padronizações Reais

1. **Provider registry:** unificar slug, aliases, domínios e políticas já divergentes.

2. **Comandos externos:** um adaptador comum baseado em `execFile`/`spawn`, com timeout e resultado padronizado.

3. **Resposta IPC:** adotar progressivamente `{ok, data?, error?}` sem quebrar consumidores existentes.

4. **Overlay mode:** substituir quatro ou mais chamadas de foco/z-order por uma transição de estado.

5. **Volume autoritativo:** main retorna e emite estado real para home e overlay.

6. **Modal contract:** todo modal captura entrada, bloqueia background, possui cleanup e restaura foco.

7. **Persistência:** defaults imutáveis mais estado versionado em `userData`.

8. **Runtime profile:** separar claramente `v2`, `legacy` e artefatos operacionais.

Não há justificativa para unificar todos os scripts de streaming em um arquivo ou criar uma framework genérica para sites externos.

# Fragilidades de Evolução

- Ausência de testes versionados e de `npm test`.
- `scripts/keytest.js` é apenas diagnóstico manual.
- O framework autônomo citado em `AGENTS.md` fica fora deste workspace e não foi executado.
- Seletores externos não foram confirmados contra versões atuais dos serviços.
- Logging de rede é instalado por view sobre uma sessão compartilhada, podendo atribuir o label errado.
- URLs completas podem ser gravadas em logs, incluindo tokens.
- `app.relaunch()` e `Restart=always` representam dois supervisores potenciais; o comportamento exato precisa ser medido no systemd real.
- O service instalado em `/etc/systemd/system` pode diferir do arquivo versionado.
- `system/build/` e `package-lock.json` existem localmente, mas estão ignorados e não foram tratados como conteúdo da branch.

# Plano Incremental de Refatoração

## Etapa 0: Caracterização

**Mudança:** criar testes de contrato e uma matriz de comportamento antes de reorganizar módulos.

**Escopo:** IPC, cards, popups, input, overlay e parsers de sistema.

**Risco:** baixo.

**Validação:** testes não devem exigir sites externos inicialmente; capturar eventos reais dos controles no hardware.

## Etapa 1: Fechar Execução de Comandos

**Mudança:** substituir o comando dinâmico de Wi-Fi por execução sem shell.

**Independência:** não alterar UI, IPC ou estrutura do main.

**Risco:** baixo a médio.

**Validação:** SSIDs e senhas hostis, redes abertas e protegidas.

## Etapa 2: Fechar a Fronteira da Homepage

**Mudança:** remover interpolação de dados externos em HTML, bloquear navegação externa da home/overlay e validar sender dos IPCs sensíveis.

**Independência:** manter layout e navegação atuais.

**Risco:** médio.

**Validação:** payloads HTML, navegação indevida e chamadas por renderer não autorizado.

## Etapa 3: Corrigir Defeitos Funcionais Isolados

**Mudança:** cards por ID estável, RAM correta, cache não implementado sem falso sucesso, Settings do overlay removido ou conectado a um contrato real.

**Independência:** não modularizar ainda.

**Risco:** baixo a médio.

**Validação:** ranking de recentes, métricas reais e ações da UI.

## Etapa 4: Consolidar Estados de Modal e Overlay

**Mudança:** coordenador modal na home e modo único de overlay no main.

**Independência:** preservar o modelo `WebContentsView`.

**Risco:** médio a alto.

**Validação:** matriz de foco/z-order/mouse e ausência de timers órfãos.

## Etapa 5: Canonicalizar Providers

**Mudança:** registro único com slug, aliases, hostnames, identidade, spatial navigation e script.

**Independência:** primeiro mover dados sem alterar comportamento; depois corrigir aliases Disney+/Max.

**Risco:** alto por serviço.

**Validação:** um provider por vez, incluindo login, D-pad, back e DRM.

## Etapa 6: Corrigir Spoofing e Pipeline de Injeção

**Mudança:** descriptors, targets, argumento nomeado e sequência aguardada de scripts.

**Independência:** alteração separada por provider quando a política de identidade mudar.

**Risco:** alto para Netflix e Prime.

**Validação:** captura completa de identidade e playback antes/depois.

## Etapa 7: Extrair Serviços do Main

**Mudança:** mover persistência, comandos, Wi-Fi, Bluetooth, volume e remote para módulos mantendo os canais e payloads atuais.

**Independência:** uma extração por serviço.

**Risco:** baixo a médio se acompanhada por testes de contrato.

**Validação:** comparar resultados do handler antigo e do módulo extraído.

## Etapa 8: Migrar Persistência

**Mudança:** defaults empacotados, `userData`, schema, escrita atômica e migração.

**Independência:** migrar catálogo, settings e logging separadamente.

**Risco:** alto.

**Validação:** upgrade e rollback com dados reais existentes.

## Etapa 9: Tornar Build Reproduzível

**Mudança:** incluir recursos necessários, versionar lockfile válido, smoke test de `.deb` e AppImage.

**Risco:** médio a alto.

**Validação:** instalação limpa, CRUD persistente, Widevine e restart.

## Etapa 10: Consolidar Operação v2

**Mudança:** um instalador, um updater, uma fonte de `.xinitrc` e service com readiness.

**Risco:** alto.

**Validação:** instalação limpa, boot frio repetido, update interrompido e rollback.

## Etapa 11: Endurecer Customizações Externas

**Mudança:** lifecycle dos helpers e scripts por provider, com medição de observers.

**Risco:** alto e isolado por serviço.

**Validação:** dois episódios sem reload, modais, player, skip e retorno de foco.

# Incertezas Não Resolvidas

- Eventos reais emitidos por cada controle remoto e air mouse.
- Estado efetivo de autenticação e bind da versão instalada do OpenCode.
- Configuração systemd efetivamente instalada no equipamento.
- Permissões de shutdown, `/var/log/fifotv` e Polkit.
- Valor real de `process.argv` no preload Castlabs.
- Seletores atuais de Netflix, Disney+, Max e Globoplay.
- Comportamento de login que dependa de `window.open`.
- Requisitos de identidade atuais de cada serviço.
- Funcionamento real dos targets `.deb` e AppImage, pois não foram construídos.
- Evidência dos testes externos mencionados na documentação, pois não estão versionados nesta branch.

A refatoração deve começar pelas duas vulnerabilidades P0 e pelo bug de identidade dos cards. Modularizar `main.js` antes disso apenas redistribuiria problemas ainda não estabilizados.
