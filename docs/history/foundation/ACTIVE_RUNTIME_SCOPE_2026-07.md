# Escopo Ativo do Runtime - Snapshot de Julho de 2026

> **Documento histórico.** Este inventário registra a promoção da fundação Electron e não é a fonte do runtime atual. Consulte `docs/README.md` e `docs/ARCHITECTURE.md`.

## Status e finalidade

Este documento é o inventário oficial aprovado da Macroetapa 5. Ele descreve a fundação Electron consolidada após as Macroetapas 1 a 5 e a limpeza física feita a partir do checkpoint `electron-foundation-before-repository-cleanup`.

Aprovação do usuário registrada em 16 de julho de 2026. As decisões sobre OpenCode, bootstrap e documentos antigos estão consolidadas abaixo.

Os documentos derivados `docs/ARCHITECTURE.md`, `docs/DEVELOPMENT_GUIDE.md` e `docs/MANUAL_TEST_CHECKLIST.md` não devem ser criados antes da aprovação deste inventário.

## Baseline verificada

- Branch: `refactor/electron-foundation`.
- HEAD inicial da Sessão 5: `112f886 fix(streaming): make provider injection deterministic`.
- Base preservada anterior à refatoração: tag `electron-before-refactor` no commit `9b31cec`.
- Macroetapas 1 a 4 aprovadas e representadas por `5fe1cdb`, `1bd1502`, `c56a50d` e `112f886`.
- O runtime da branch parte de `package.json:5`, que aponta para `electron/main.js`.
- `npm run dev` executa `electron .`; `npm start` executa `electron . --kiosk` (`package.json:6-10`).
- A unidade instalada em `/etc/systemd/system/fifotv.service` está habilitada, mas estava inativa no momento desta inspeção. Quando iniciada, ela executa o Electron Castlabs deste checkout com `.` e `--kiosk`.
- O único arquivo versionado em `system/` é `.xinitrc`, preservado como helper local de Xorg e fora do runtime JavaScript.
- Mudanças anteriores do usuário foram consolidadas no commit `7f727f0`, incluindo `config/settings.json`, a movimentação para `docs/old/` e a exclusão de `scripts/FIFOtv-Dev.desktop`.

## Critério de classificação

Um componente só entra no runtime ativo quando existe evidência concreta na branch atual: `require`, preload, `loadFile`, `loadURL`, IPC com fluxo completo, leitura em runtime, recurso carregado, comando executado ou chamada indireta demonstrada.

Presença no repositório, nome do diretório, documentação histórica, configuração de build ou código da antiga `main` não são prova. Diretórios mistos são discriminados por componente.

# Ativo no runtime Electron atual

## Bootstrap e processo main

| Componente | Evidência concreta | Papel ativo |
|---|---|---|
| `package.json` | Campo `main` e scripts `dev`/`start` em `package.json:5-10` | Entrada do Electron no checkout |
| `electron/main.js` | Carregado pelo campo `main` | Processo main, views, IPC, integrações locais, navegação e lifecycle |
| Electron Castlabs | Dependência em `package.json:17`; `components.whenReady()` em `electron/main.js:1296-1301` | Chromium/Electron e disponibilidade do Widevine |
| `dbus-next` | Dependência em `package.json:13`; `require` em `electron/main.js:459` | Acesso direto ao BlueZ por D-Bus |
| `electron-log` | Dependência em `package.json:14`; carregamento condicionado por `config/logging.json` em `electron/main.js:18-37` | Logging do main e renderers |
| `electron/ipc-validation.js` | `require` em `electron/main.js:8` | Validação de catálogo, streaming, URL, slug indireto e MAC |
| `electron/catalog.js` | `require` em `electron/main.js:9` | Parse e validação defensiva do catálogo |
| `electron/system-controls.js` | `require` em `electron/main.js:10` | Clamp e parser de saída terse do `nmcli` |
| `electron/view-lifecycle.js` | `require` em `electron/main.js:11` | Guarda de view e geração corrente |
| `electron/provider-resolution.js` | `require` em `electron/main.js:12` | Resolução por hostname e subdomínio |
| `electron/streaming-injection.js` | `require` em `electron/main.js:13` | Execução sequencial do pipeline de injeção |
| `electron/client-hints.js` | `require` em `electron/main.js:14` | Client Hints limitados ao `webContentsId` do streaming |
| `electron/runtime-logging.js` | `require` em `electron/main.js:15` e por `streaming-injection.js:1` | Um listener de erro de rede por sessão, atribuição por view e redaction de URL |

## Views, preloads e renderers

| Componente | Evidência concreta | Papel ativo |
|---|---|---|
| `BrowserWindow` principal | Criada em `electron/main.js:1312-1328`; carrega um `data:` local em `:1327` | Janela sem frame e contentor das views |
| `frontend/splash.html` | `loadFile` em `electron/main.js:1349` | Splash Electron temporário |
| `frontend/favicon.svg`, `frontend/FIFOtv.svg` | Referências em `frontend/splash.html:7,67` e favicon também em `frontend/index.html:7` | Recursos do splash/home |
| `homeView` | Criada em `electron/main.js:1360-1373` com `electron/preload.js` | Renderer local privilegiado da home |
| `frontend/index.html` | `loadFile` em `electron/main.js:1372` | Estrutura da home, Settings, popups, modal e screensaver |
| `frontend/style.css` | `frontend/index.html:8` | Estilos da home |
| `frontend/popup-manager.js` | `frontend/index.html:120` | Lifecycle reutilizado por popups locais |
| `frontend/card-resolution.js` | `frontend/index.html:121` | Resolução de cards por ID estável |
| `frontend/script.js` | `frontend/index.html:122` | Estado, navegação, DOM, catálogo e IPC da home |
| Fontes Poppins 200/300/400/500 | Preload em `frontend/index.html:9-12` e `@font-face` em `frontend/style.css:11-40` | Tipografia local |
| Sons `hover.mp3`, `opencard.mp3`, `notification.mp3`, `splash.mp3` | Objetos `Audio` em `frontend/script.js:81-88` | Recursos carregados pela home; `splash.mp3` é instanciado, mas não possui chamada de reprodução |
| `streamingView` | Criada em `electron/main.js:844-852`; URL externa em `:883` | Conteúdo do provider |
| `electron/preload-streaming.js` | Preload em `electron/main.js:847` | Identidade JavaScript da view externa; não expõe IPC FIFOtv |
| `loadingView` e `electron/views/loading.html` | Criação e `loadFile` em `electron/main.js:934-948` | Loading temporário do streaming |
| `overlayView` | Criação em `electron/main.js:950-962` | Menu, toast, monitor e controles sobre o streaming |
| `electron/preload-overlay.js` | Preload em `electron/main.js:952` | Bridge mínima do overlay |
| `electron/views/overlay.html`, `overlay.css`, `overlay.js` | `loadFile` em `electron/main.js:961`; recursos em `overlay.html:7,45` | Renderer do overlay |

## Catálogo, estado e recursos dinâmicos

| Componente | Evidência concreta | Papel ativo |
|---|---|---|
| `backend/streamings.json` | `DATA_PATH` em `electron/main.js:57`; leitura/escrita em `:91-97`; IPC CRUD em `:183-208` | Catálogo persistido ativo, apesar de estar dentro de `backend/` |
| `config/logging.json` | Leitura síncrona em `electron/main.js:18-26` | Configuração ativa do logging |
| `localStorage` da home | Uso em `frontend/script.js:95-104` e fluxo de uso recente | Contagem local de “Mais Usados” |
| `frontend/assets/icons/*.svg` | Caminho dinâmico por slug em `frontend/script.js:303-324` e loading em `electron/main.js:943` | Ícones locais para catálogo atual ou apps adicionados; fallback para Simple Icons |
| `frontend/assets/sounds/*` | Construção em `frontend/script.js:81-88` | Feedback sonoro local |

Após a limpeza física, `backend/` contém somente `backend/streamings.json`, que participa do Electron atual.

## IPC e integrações locais

As APIs expostas por `electron/preload.js` possuem handler/emissor e consumidor em `frontend/script.js`. As APIs remanescentes de `electron/preload-overlay.js` possuem contraparte em `electron/views/overlay.js`. O teste `test/ipc-contracts.test.js` verifica esses contratos estaticamente.

Grupos ativos:

- Catálogo: `streamings:get`, `streamings:add`, `streamings:remove`, `streamings:reorder`.
- Sistema visível: shutdown, reboot, restart, stats, info e screen-off.
- Volume: up, down, mute e leitura autoritativa via `wpctl`.
- Wi-Fi: status e scan por comandos estáticos do `nmcli`; conexão com SSID/senha via `execFile`, sem shell.
- Bluetooth: status, scan, connect, disconnect e unpair via `dbus-next`/BlueZ.
- Navegação: abrir streaming, voltar à home e reload pelo overlay.
- Overlay: zoom, foco, visibilidade, z-order, toast e eventos de tecla/menu.
- Eventos main para renderer: `global-key`, `screensaver:reset`, `key-event` e `show-menu`.
- Integrações de ambiente chamadas pelo main: `shutdown`, `free`, `df`, `/proc`, `xset`, `wpctl`, `nmcli` e D-Bus BlueZ (`electron/main.js:211-745`).

Os handlers `system:update`, `logging:*` e `remote:*` existem no main, mas nenhum preload atual os expõe. Portanto, não são APIs do fluxo normal da UI. Sua classificação específica aparece abaixo.

## Providers e pipeline de injeção

| Componente | Evidência concreta | Papel ativo |
|---|---|---|
| `electron/views/spatial-navigation/config.js` | Carregamento dinâmico por `electron/main.js:82-83,889` | Liga/desliga o polyfill por slug |
| `electron/views/spatial-navigation/polyfill.js` | Leitura condicional em `electron/main.js:903` | Navegação espacial quando habilitada |
| `electron/views/streaming-customizations/config.js` | Carregamento dinâmico em `electron/main.js:82,891` | Mapeia hostname para script específico ou `null` |
| `electron/views/streaming-customizations/shared.js` | Leitura em `electron/main.js:904` | Helpers compartilhados injetados em todo streaming |
| `electron/views/streaming-customizations/spatial-nav.js` | Leitura em `electron/main.js:906` | Configuração espacial injetada por slug |
| `netflix.js`, `disney.js`, `appletv.js`, `applemusic.js`, `max.js`, `globoplay.js` | Mapeamento em `streaming-customizations/config.js:2,5-9`; seleção por hostname | Scripts condicionais por provider |

Observações de escopo:

- `max.js` só é selecionado após hostname compatível com `play.max.com`.
- `globoplay.js` só é selecionado após hostname compatível com `globoplay.globo.com`.
- YouTube e Prime Video estão explicitamente mapeados para `null`; não recebem script específico.
- Google, Nuvio e apps customizados sem hostname mapeado usam apenas as etapas compartilhadas aplicáveis.
- O pipeline ativo é: polyfill opcional, helpers compartilhados, slug, configuração espacial e script específico opcional.

## Logging ativo após a correção da Macroetapa 5

- Um único `onErrorOccurred` é instalado por sessão compartilhada.
- Cada view registra seu `webContentsId` e label; a remoção de uma view remove somente esse consumidor.
- URLs registradas removem credenciais, query e fragment.
- `preload-error` usa a assinatura `(event, preloadPath, error)`.
- Falha do processo GPU usa o evento global `child-process-gone`, não um evento inexistente por renderer.
- `console-message` usa os campos do evento atual.
- `test/runtime-logging.test.js` cobre listener único, atribuição, cleanup, `ERR_ABORTED` e redaction.

# Ferramentas exclusivas de desenvolvimento

## OpenCode

Classificação oficial: **ferramenta exclusiva de desenvolvimento, fora do fluxo normal do produto**.

Evidência do mecanismo existente:

- O subsistema está dentro de `electron/main.js:1124-1293` e pode executar `opencode serve --port 3000` por `spawn` em `:1200`.
- Não há método remoto em `electron/preload.js`; a home não oferece mais ação visual de acesso remoto.
- `remote:status` e `remote:toggle` são handlers sem bridge atual, portanto não fazem parte da API normal do renderer.
- `config/settings.json` registra a condição local aprovada e nesta máquina contém `remoteEnabled: true`.
- `electron/main.js:1303-1310` ainda consulta esse valor em todo startup e pode iniciar OpenCode sem uma condição explícita de desenvolvimento.
- Se a porta 3000 já estiver em uso, o Electron preserva o processo existente; se iniciar seu próprio processo, usa uma sessão destacada sem pipes para sobreviver ao encerramento do Electron.
- Na inspeção, o Electron estava parado, mas havia um processo destacado `opencode serve --port 3000` ainda ativo.

Decisão aprovada: manter o comportamento atual. A condição de desenvolvimento aceita é o estado local `remoteEnabled`; o valor padrão continua `false`, não há bridge/UI normal e esta máquina de desenvolvimento mantém o valor `true`. Não será adicionada a variável `FIFOTV_DEV` nesta macroetapa. A possibilidade de um estado local antigo manter o processo ativo é um risco residual aceito, não uma funcionalidade do produto.

## Outras ferramentas

| Componente | Evidência | Classificação |
|---|---|---|
| `scripts/dev.sh` | Executa `npm run dev` | Launcher manual de desenvolvimento |
| `scripts/keytest.js` e `frontend/keytest.html` | O script abre o HTML diretamente; não são carregados por `electron/main.js` | Diagnóstico de controle/air mouse |
| `test/*.test.js` | Executados por `npm test`/`npm run check`; não importados pelo app | Testes locais `node:test` |
| `AGENTS.md` | Instruções para manutenção/agentes | Documentação de desenvolvimento, não prova de runtime |
| `docs/FOUNDATION_*`, `docs/BUGS.md`, `docs/SESSION-PLAN.md`, `docs/plans/`, `docs/SPATIAL-NAVIGATION-RESEARCH.md` | Revisões, planos e pesquisa | Evidência de engenharia, não componente do produto |
| `node_modules/` | Dependências instaladas e ignoradas | Ambiente local necessário para executar, não fonte versionada |
| `package-lock.json` | Arquivo local ignorado | Estado de instalação; política de lock/release está fora desta promoção |
| `.directory` | Metadado KDE não rastreado e sem referência | Artefato local, fora do produto |

# Legado histórico removido

Os arquivos abaixo foram removidos da árvore oficial depois que o estado completo foi preservado pela tag `electron-foundation-before-repository-cleanup`. O histórico continua disponível nessa tag e em commits anteriores.

| Componente | Evidência de não participação no Electron atual | Classificação |
|---|---|---|
| `backend/app.py` | Aplicação Flask, HTTP em porta 5000 e launcher/watchdog de Chromium; nenhum `spawn`/`require` ativo apontava para ela | Runtime v1 Flask/Chromium removido |
| `backend/bluetooth_manager.py` | Usado pelo Flask; Electron usa `dbus-next` diretamente | Bluetooth Python v1 removido |
| `backend/requirements.txt` | Dependências Python; `package.json` inicia Electron | Instalação v1 removida |
| `backend/config.json` e `backend/__pycache__/` | Config/bytecode locais ignorados, sem leitura pelo Electron | Estado local da geração Python |
| `frontend/extensions/tv-override/` | Era carregado apenas por `backend/app.py`/instalador antigo; não há `loadExtension` no Electron | Extensão Chromium v1 removida |
| `system/scripts/startup.sh` | Iniciava watcher e `python3 app.py`; não era chamado pelo bootstrap Electron | Startup v1 removido |
| `system/scripts/restart.sh` | Matava/reiniciava Chromium e Flask; Electron usa `app.relaunch()` | Restart v1 removido |
| `system/scripts/bluetooth-watch.sh` | Chamado pelo startup/instalador antigos; Electron usa BlueZ D-Bus | Watcher v1 removido |
| `system/openbox/rc.xml` | Regras para janela Chromium; sem carregamento pelo runtime Electron | Desktop v1 removido |
| `system/splash/*` e `frontend/assets/splash-bg.png` | Splash framebuffer/Openbox; Electron usa `frontend/splash.html` | Splash v1 removido |
| `electron/views/streaming-customizations/primevideo.js` | `primevideo.com` mapeia explicitamente para `null` | Customização desabilitada removida |

# Futuro ou fora do escopo atual

| Componente | Evidência e limite |
|---|---|
| Instalador, ISO e template systemd versionados | Removidos na limpeza física; a unidade observada continua externa em `/etc/systemd/system/fifotv.service` |
| `scripts/update.sh` e `update.sh` | Fluxos legados bloqueados explicitamente; `system:update` continua interno, sem bridge/UI |
| `package.json` em `build`/`dist` | `.deb` e AppImage são comandos declarados, mas artefatos não foram validados e `build.files` não inclui catálogo/configuração ativos |
| `docs/WEBOS_APPS_GUIDE.md` | Pesquisa/proposta WebOS/Spotify sem implementação correspondente na branch |
| Migração para `userData`, ISO, boot, Plymouth, release, CI, pacote e updater | Backlog explícito da Macroetapa 5; não são arquitetura implementada |

O `system:update` registrado no main é uma capacidade interna dormente, não um produto ativo: nenhum preload pode invocá-lo. Os handlers `logging:*` também são internos e sem consumidor. Eles devem ser documentados como inativos, não apresentados como API disponível.

# Incerto — requer confirmação futura

## Recursos sem referência comprovada

- `frontend/FIFOtv1x1.svg`
- `frontend/assets/bg.gif`
- `frontend/assets/cursors/tv-dot.png`
- `frontend/assets/cursors/tv-dot-hover.png`

Não há referência executável atual para esses arquivos. Eles ficam fora da arquitetura ativa até confirmação; não serão removidos nesta macroetapa.

## Arquivos de operação canônicos

Há dois updaters, duas fontes locais de preseed e um build de ISO ignorado. Nenhum deles participa do runtime normal e todos permanecem fora do escopo. A definição de qual é canônico pertence ao backlog operacional e não bloqueia o inventário ativo.

# Decisões já consolidadas

- O runtime ativo é Electron; Flask/Python/Chromium/Openbox não compõem a arquitetura atual.
- As fontes comprovadamente inativas da geração Flask/Python/Chromium/Openbox foram removidas após a criação do checkpoint pré-limpeza.
- `backend/streamings.json` continua ativo mesmo com os demais itens de `backend/` classificados como legado.
- A home permanece montada enquanto o streaming e o overlay são compostos por `WebContentsView`.
- OpenCode não é funcionalidade normal da TV; é ferramenta de desenvolvimento.
- Build, ISO, instalador, boot, updater, pacote e migração completa de persistência não entram na promoção da fundação.
- A documentação antiga é pista histórica, nunca prova de runtime.
- O systemd instalado pode ser citado como fronteira ambiental observada. `system/.xinitrc` permanece somente como helper local, fora da arquitetura ativa versionada.
- A movimentação das cinco documentações antigas para `docs/old/` é intencional e será tratada separadamente no fechamento Git.
- O comportamento atual do OpenCode, condicionado por `remoteEnabled`, foi mantido por decisão explícita do usuário.

# Estado da aprovação

- Concluído: baseline Git e confirmação das Macroetapas 1 a 4.
- Concluído: correções obrigatórias de logging, redaction e contratos de preload.
- Concluído: inventário por evidência e classificação de diretórios mistos.
- Aprovado: OpenCode permanece condicionado por `remoteEnabled`, sem `FIFOTV_DEV`.
- Aprovado: bootstrap systemd somente como fronteira externa observada.
- Aprovado: movimentação documental anterior é intencional e separada.
- Liberado: criação de `docs/ARCHITECTURE.md`.
- Liberado: criação de `docs/DEVELOPMENT_GUIDE.md`.
- Liberado: criação de `docs/MANUAL_TEST_CHECKLIST.md`.
