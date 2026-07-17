# FIFOtv v2 — Bugs Reportados

> **Documento histórico.** Este arquivo registra bugs da migração e suas correções na época. Não representa problemas atuais; consulte `docs/README.md` e `docs/ARCHITECTURE.md`.

## Status

| # | Bug | Status | Commit |
|---|-----|--------|--------|
| 1 | Tela não preenche display (800x600) | ✅ Resolvido | `0c7a52b` |
| 2 | "Ativar Acesso Remoto" não funciona | ✅ Resolvido | `0c7a52b` |
| 3 | Bluetooth scan não retorna dispositivos | ✅ Resolvido | — |
| 4 | Toast de volume aparece atrás do streaming | ✅ Resolvido | — |
| 5 | Seção "Extensões" no settings não deve existir | ✅ Resolvido | — |
| 6 | Sem som nenhum (caixa nativa + P2) | ✅ Resolvido | — |
| 7 | Checklist do desenvolvimento deve ser removido | ✅ Resolvido | — |
| 8 | Bluetooth não conecta (br-connection-page-timeout) | ✅ Resolvido | — |
| 9 | Mouse cursor some rapidamente (invisível ao usar) | ✅ Resolvido | — |
| 10 | Foco não volta pro streaming após toast/menu | ✅ Resolvido | — |
| 11 | Xorg encerra imediatamente no boot (.xinitrc sem processo background) | ✅ Resolvido | `3da6532` |
| 12 | Prime Video: play não abre vídeo (clica em reproduzir e nada acontece) | ✅ Resolvido | — |
| 13 | Cards "Mais Usados" abrem streaming errado (loading mostra um, abre outro) | ✅ Resolvido | — |
| 14 | Navegação D-pad no settings escapa pro grid da homepage | ✅ Resolvido | — |
| 15 | Tela não desliga após tempo inativo (DPMS não funciona) | ✅ Resolvido | — |
| 16 | Botão voltar não funciona no YouTube (conflito com SPA) | ✅ Resolvido | — |
| 17 | Menu de contexto do overlay não aparece visualmente (invisível mas clicável) | ✅ Resolvido | — |
| 18 | D-pad quebrado em streamings após fix do Bug 16 (overlayMenuVisible stale) | ✅ Resolvido | — |
| 19 | Janelas de propaganda abrem como popup branca (window.open) | ✅ Resolvido | — |
| 20 | Highlight duplo (FIFOtv + Chromium spatial navigation) | ✅ Resolvido | — |

---

## Bug 1 — Tela não preenche display

**Descrição:** Janela renderiza em 800x600 centralizada na tela, em vez de preencher o display inteiro (1366x768).

**Causa:** `fullscreen: true` e `kiosk: true` dependem de window manager pra processar o pedido `_NET_WM_STATE_FULLSCREEN`. O `.xinitrc` da v2 não tem WM (Openbox foi removido).

**Fix:** Remover `fullscreen`/`kiosk`, usar tamanho explícito via `getViewBounds()`:
```js
const { width, height } = getViewBounds();
win = new BrowserWindow({ x: 0, y: 0, width, height, frame: false, ... });
```

**Arquivos:** `electron/main.js`

---

## Bug 2 — "Ativar Acesso Remoto" não funciona

**Descrição:** Botão na aba "Acesso Remoto" do settings não faz nada. Status sempre mostra "Inativo".

**Causa:** A feature nunca foi implementada na v2. `loadRemoteStatus()` retornava dados hardcoded, `toggleRemoteAccess()` era um stub.

**Fix:** Implementar IPC handlers `remote:status` e `remote:toggle` no main.js. Toggle inicia/para `opencode serve --port 3000` via `child_process.exec`.

**Arquivos:** `electron/main.js`, `electron/preload.js`, `frontend/script.js`

---

## Bug 3 — Bluetooth scan não retorna dispositivos

**Descrição:** Ao abrir aba Bluetooth no settings, mostrar "Nenhum dispositivo conectado" e lista vazia. Scan não retorna dispositivos.

**Diagnóstico parcial:**
- Bluetooth service: ✅ Rodando
- Adapter: ✅ Powered on
- D-Bus system bus: ✅ `org.bluez` registrado
- dbus-next (fora do Electron): ✅ Scan funciona, 4-5 dispositivos
- IPC handlers: ⚠️ Catch blocks silenciosos — erros são engolidos

**Possíveis causas:**
1. `bt:scan` nunca chama `StopDiscovery()` — sessão duplicada causa erro silencioso
2. Catch blocks retornam `{ devices: [] }` sem logar erro
3. Pode haver erro de permissão ou timeout dentro do processo Electron

**Fix:**
1. Corrigido import: `const dbus = require('dbus-next')` + `dbus.systemBus()` (antes: `const { bus } = require('dbus-next')` que retornava `undefined`)
2. Adicionado `console.error` nos catch blocks de `getBtAdapter`, `bt:status`, `bt:scan`, `bt:disconnect`
3. Adicionado `StopDiscovery()` antes de `StartDiscovery()` (evitar sessão duplicada)
4. Adicionado `StopDiscovery()` após coletar dispositivos (limpar sessão)

**Arquivos:** `electron/main.js`

---

## Bug 4 — Toast de volume aparece atrás do streaming

**Descrição:** Ao mudar o volume dentro de um streaming, o toast/notificação de volume aparece atrás da webview do streaming e fica invisível.

**Causa:** O overlay foi movido para atrás do streamingView pra resolver o problema de mouse não acessar o streaming (Bug 1 da Sessão 4.7). O toast de volume é renderizado pelo overlay, então agora fica atrás do streaming.

**Fluxo atual (incorreto):**
1. Overlay fica atrás do streamingView (pra mouse funcionar)
2. Usuário muda volume → overlay emite toast
3. Toast fica ATRÁS do streamingView → invisível

**Fix:**
1. Novos IPC handlers `overlay:toast-show` e `overlay:toast-hide` em `main.js` — z-order sem troca de foco
2. Novas APIs `showToastOverlay()` e `hideToastOverlay()` em `preload-overlay.js`
3. Variável `toastVisible` em `overlay.js` pra rastrear estado do toast
4. `showVolumeToast()` chama `showToastOverlay()` ao exibir e `hideToastOverlay()` ao ocultar (só se menu não estiver aberto)
5. `hideMenu()` só chama `sendOverlayToBack()` se `toastVisible` for `false`

**Arquivos:** `electron/main.js`, `electron/views/overlay.js`, `electron/preload-overlay.js`

---

## Bug 5 — Seção "Extensões" no settings não deve existir

**Descrição:** O popup de configurações tem uma aba/seção "Extensões" que não faz sentido na v2, pois não existem mais extensões Chrome instaladas.

**Causa:** Seção herdada da v1 (Chromium + extensão tv-override). Na v2, tudo é nativo no Electron; a extensão foi removida na limpeza física do repositório.

**Fix:** Removido a seção "Extensões" do settings popup. Removido ícone `ICON.extensions`, menu item, seção HTML, chamadas `renderExtensionsList()`, `DEFAULT_EXTENSIONS` array, `renderExtensionsList()` e `toggleExtension()`.

**Arquivos:** `frontend/script.js`

---

## Bug 6 — Sem som nenhum (caixa nativa + P2)

**Descrição:** Não sai nenhum som pelo FIFOtv — nem notificações, nem vídeo em streaming. Testado com caixas de som nativas do all-in-one e com caixa externa via cabo P2. Bluetooth não testado (Bug 3 pendente).

**Diagnóstico parcial:**
- Volume handler usa `wpctl` (PipeWire/WirePlumber)
- Não há verificação se PipeWire está rodando no all-in-one
- Pode ser que o dispositivo de áudio padrão não está configurado corretamente
- Pode ser que o Electron não está conectado ao PipeWire

**Possíveis causas:**
1. PipeWire/WirePlumber não rodando ou não configurado no all-in-one
2. Dispositivo de áudio errado sendo controlado por `@DEFAULT_AUDIO_SINK@`
3. Permissão de acesso ao dispositivo de áudio no Electron
4. Sink muted ou com volume 0

**Fix proposto:**
1. Diagnosticar via SSH: status do PipeWire, lista de sinks, volume atual
2. Verificar se `wpctl` funciona corretamente fora do Electron
3. Adicionar logging no handler `volume:get` pra ver que dispositivo está sendo retornado
4. Se necessário, forçar dispositivo de áudio específico

**Arquivos:** `electron/main.js` (handlers de volume)

---

## Bug 7 — Checklist do desenvolvimento deve ser removido

**Descrição:** A funcionalidade de checklist criada durante o desenvolvimento da v2 não é mais necessária e deve ser removida do FIFOtv por completo.

**Causa:** Feature de desenvolvimento que ficou no código. Não tem uso final.

**Fix:** Removido HTML do checklist em `index.html` (botão FAB + painel), referência `<script src="checklist.js">`, todo o CSS do checklist em `style.css` (~280 linhas), e deletado `frontend/checklist.js`.

**Arquivos:** `frontend/script.js`, `frontend/index.html`, `frontend/style.css`, `frontend/checklist.js` (deletado)

---

## Bug 8 — Bluetooth não conecta (br-connection-page-timeout)

**Descrição:** Dispositivos Bluetooth aparecem corretamente no scan, mas ao tentar conectar aparece "Falha: br-connection-page-timeout" no frontend.

**Causa:** `bt:connect` chamava `Device1.Connect()` diretamente sem pareamento prévio. O BlueZ precisa de um bond (link key) antes de conectar. Sem isso, o device remoto rejeita a página de conexão.

**Fix:**
1. Criado `BluezAgent` — agent de pareamento D-Bus `NoInputNoOutput` via `dbus-next` `Interface.configureMembers()`
2. Agent registrado no startup com `AgentManager1.RegisterAgent()` + `RequestDefaultAgent()`
3. `bt:connect` reescrito: check Connected → Pair (com polling Paired) → Trust → Connect (com polling Connected)
4. Tratamento de erros `AlreadyExists` e `AlreadyConnected` via `e.type`
5. Novo handler `bt:unpair` — `Adapter1.RemoveDevice()`
6. `bt:scan` adicionado `Pairable=true` + `Discoverable=true` antes do discovery
7. Frontend: botão "Esquecer" (trash) + "Desconectar" (X), `onclick` só nos ícones

**Arquivos:** `electron/main.js`, `electron/preload.js`, `frontend/script.js`

---

## Bug 9 — Mouse cursor some rapidamente (invisível ao usar)

**Descrição:** O ponteiro do mouse fica invisível e só aparece por ~1s quando movido, impedindo de usar o mouse normalmente.

**Causa:** `unclutter -idle 0` no `.xinitrc` escondia o cursor instantaneamente.

**Fix:**
1. Removido `unclutter` completamente (de `.xinitrc`, `update.sh`, `restart.sh`, `configure.sh`, `setup.sh`)
2. Criado cursor customizado: `tv-dot.png` (bolinha branca 32x32 com glow) e `tv-dot-hover.png` (com tint azul)
3. CSS global de cursor em `frontend/style.css` e `electron/views/overlay.css`
4. Cursor injetado no streamingView via `insertCSS()` com base64 data URIs (bypass CSP)
5. Timer de idle: 3s sem mouse → `fifotv-cursor-idle` → `cursor: none`
6. Electron agora tem controle total do cursor

**Arquivos atuais:** `electron/main.js`, `frontend/style.css`, `electron/views/overlay.css`, `frontend/assets/cursors/`, `system/.xinitrc`. Os fluxos de update/instalação e `system/scripts/restart.sh` são históricos e estão preservados no checkpoint pré-limpeza.

---

## Bug 10 — Foco não volta pro streaming após toast/menu

**Descrição:** Ao mudar o volume ou abrir/fechar o menu de contexto, a tela pisca e o streaming perde o foco. Não é possível recuperar com click do mouse.

**Causa:** Handlers IPC usavam `removeChildView(streamingView) + addChildView(streamingView)` pra reordenar views. Isso removia o streaming do compositor (flash preto) e causava re-compositing GPU (congelamento ~1s). Além disso, `overlay:toast-hide` não chamava `focus()`.

**Fix — abordagem add/remove overlay:**
1. Overlay **não é adicionado** na hierarquia na abertura de streaming (fica fora)
2. `overlay:show-menu` / `overlay:toast-show`: `addChildView(overlayView)` — overlay aparece no topo
3. `overlay:hide-menu` / `overlay:toast-hide`: `removeChildView(overlayView)` — overlay some da hierarquia
4. StreamingView **NUNCA é removido** → zero flash, zero congelamento
5. `streamingView.webContents.focus()` chamado após cada remoção do overlay

**Arquivos:** `electron/main.js`

---

## Bug 11 — Xorg encerra imediatamente no boot

**Descrição:** Após reiniciar o all-in-one, o Xorg iniciava mas encerrava imediatamente. Usuário ficava em TTY (`tv@localhost:~$`). Erro: `xinit: connection to X server lost`.

**Causa:** O `.xinitrc` terminava com `wait`, que esperava processos background. Quando removemos o `unclutter -idle 0 &` (Bug 9), não sobrou nenhum processo background. O `wait` retornava na hora, o `.xinitrc` terminava, e o Xorg encerrava.

**Fix:** Substituir `wait` por `exec sleep infinity` — mantém o Xorg rodando eternamente sem processos extras.

**Arquivos:** `system/.xinitrc`, `scripts/update.sh`, `update.sh`

---

## Bug 12 — Prime Video: play não abre vídeo

**Descrição:** Ao clicar em "Reproduzir" no Prime Video (tanto com mouse quanto com D-pad/controle), o botão responde visualmente (hover/focus) mas o vídeo não abre. Nenhum erro aparece nos logs.

**Causa:** Customizações específicas no `primevideo.js` (autoFullscreen, seletores obfuscados) conflitavam com o player do Prime Video.

**Fix:** Removidas as customizações específicas. `config.js` agora define `'primevideo.com': null` (sem customização). Apenas TV Identity (`preload-streaming.js`) é aplicada. Play funciona normalmente.

**Nota:** Navegação D-pad no Prime Video ainda é ruim (interface desktop) — será resolvido em sessão futura.

**Arquivo atual:** `electron/views/streaming-customizations/config.js`. O script específico desabilitado foi removido e permanece disponível no checkpoint pré-limpeza.

---

## Bug 13 — Cards "Mais Usados" abrem streaming errado

**Descrição:** Ao clicar num card da seção "Mais Usados", a tela de loading mostra o ícone/nome de um streaming (ex: YouTube) mas abre outro (ex: Prime Video). O problema ocorre porque a ordem dos cards muda dinamicamente entre a renderização e o clique.

**Causa:** `showTransition()` recalcula qual streaming abrir chamando `getMostUsed()` uma segunda vez, mas `trackUsage()` já mutou os contadores de uso entre as duas chamadas. A segunda ordenação pode resultar num streaming diferente.

Fluxo do bug:
1. `activateCard(pos)` chama `getMostUsed()` → streaming certo (ex: YouTube)
2. `trackUsage(id)` muta `usageCounts` → YouTube sobe pra posição 0
3. `showTransition()` chama `getMostUsed()` de novo → YouTube agora é posição 0, mas `focusedIndex` ainda é 1 → aponta pra Netflix
4. Resultado: abre URL do YouTube, mas mostra nome/slug do Netflix

**Fix:** `showTransition()` agora recebe o objeto `streaming` diretamente do `activateCard()`, sem recalcular `getMostUsed()`.

**Arquivos:** `frontend/script.js` (funções `activateCard` ~linhas 659-686, `showTransition` ~linhas 688-705)

---

## Bug 14 — Navegação D-pad no settings escapa pro grid

**Descrição:** Ao navegar com D-pad dentro do popup de configurações, pressionar seta direita repetidamente faz o foco sair do popup e ir pro grid da homepage. Usuário fica preso — não consegue voltar pro settings nem navegar de volta.

**Causa:** `handleSettingsItemNav()` não tem `case 'ArrowRight'` no switch. Quando o usuário pressiona seta direita no conteúdo do popup, o evento não é capturado, `e.preventDefault()` não é chamado, e Chromium's spatial navigation move o foco pro elemento focável mais próximo à direita — um card do grid.

Estado resultante: `navState` = `'settings-item'` mas foco visual está no grid → desincronização total.

**Fix:** Adicionado `case 'ArrowRight': e.preventDefault(); break;` em `handleSettingsItemNav()`.

**Arquivos:** `frontend/script.js` (função `handleSettingsItemNav` ~linhas 565-612)

---

## Bug 15 — Tela não desliga após tempo inativo (DPMS)

**Descrição:** A tela de descanso (screensaver) funciona corretamente após 15 minutos, mas a tela nunca desliga. O esperado era que após tempo adicional a tela fosse desligada via DPMS.

**Causa:** Três problemas combinados:

1. **Timer DPMS vazio:** `dpmsTimer` em `script.js:1503` tem callback `// DPMS off not available in Electron` — não faz nada
2. **Sem IPC channel:** Não existe handler `system:off` no main.js nem API no preload pra desligar a tela
3. **DPMS desabilitado no X:** `.xinitrc` tem `xset -dpms` que desliga o DPMS globalmente

**Nota:** O timeout configurado é 30min (`DPMS_TIMEOUT = 30 * 60 * 1000`), não 1h.

**Fix:**
1. Re-enable DPMS no `.xinitrc`: `xset -dpms` → `xset +dpms` + `xset dpms 0 0 1800` (off após 30min)
2. Criado IPC handler `system:screen-off` no main.js → `exec('xset dpms force off')`
3. Exposto `screenOff()` no preload.js
4. Timer no `script.js` chama `window.fifotv.screenOff()`
5. A correção histórica do instalador ficou preservada no checkpoint pré-limpeza.

**Arquivos atuais:** `system/.xinitrc`, `electron/main.js`, `electron/preload.js`, `frontend/script.js`. O instalador histórico está preservado no checkpoint pré-limpeza.

---

## Bug 16 — Botão voltar não funciona no YouTube

**Descrição:** Ao apertar o botão voltar (air mouse / controle remoto) dentro do YouTube TV, nada acontece. Em outros streamings (Netflix, Disney+, etc.) o voltar funciona normalmente.

**Causa:** `handleAppCommand` em `main.js:684` chama `navigationHistory.goBack()` quando o botão voltar é pressionado. Isso faz uma navegação de browser level (Chromium navega pra URL anterior). Mas YouTube TV é um SPA (Single Page Application) — toda navegação é interna via JavaScript. O `goBack()` navega pra fora do YouTube TV em vez de deixar o SPA tratar internamente.

**Por que só afeta o YouTube:** YouTube é o único streaming que roda em `/tv` (interface TV completa, SPA). Outros streamings são sites desktop normais — `goBack()` funciona pra eles.

**Fluxo do bug:**
1. Usuário aperta voltar → `app-command` fires com `cmd = 'browser-backward'`
2. `handleAppCommand`: overlay fechado ✅, streamingView existe ✅, `canGoBack()` ✅
3. Chama `navigationHistory.goBack()` → Chromium navega pra URL anterior
4. YouTube TV nunca recebe o evento pra tratar internamente

**Fix:** Abordagem condicional — `SPA_DOMAINS` define quais sites são SPA. `handleAppCommand` verifica o slug do streaming atual:
- **SPA (YouTube):** `sendInputEvent({ type: 'keyDown', keyCode: 'Escape' })` + `sendInputEvent({ type: 'keyUp', keyCode: 'Escape' })` — injeta tecla no pipeline nativo do Chromium
- **Não-SPA (Netflix, etc.):** `navigationHistory.goBack()` — navegação de browser level

**Arquivos:** `electron/main.js` (variáveis `SPA_DOMAINS`, `currentStreamingSlug`, função `handleAppCommand`), `electron/preload-streaming.js` (removido listener `key-event`)

---

## Bug 17 — Menu de contexto do overlay não aparece visualmente

**Descrição:** Ao apertar o botão de menu de contexto, o menu não aparece visualmente, mas as opções existem no DOM e são clicáveis (navegar com D-pad e pressionar Enter aciona uma opção). O toast de volume funciona normalmente.

**Causa:** O `#fifotv-ctx` tinha `animation: fifotv-menu-in 200ms ease-out` que ia de `opacity: 0` → `opacity: 1`. No GMA 3600 do Celeron N3060, a animação falhava silenciosamente, deixando o elemento preso em `opacity: 0`. Além disso, o `hideMenu()` usava `transition` + `setTimeout` pro fade-out, que também conflitava.

**Fix:**
1. Removidos `animation` e `transition` do `#fifotv-ctx` no `overlay.css`
2. Adicionado `opacity: 1` explícito no CSS
3. `showMenu()` agora seta `menu.style.opacity = '1'` e `menu.style.display = ''`
4. `hideMenu()` agora usa `display: none` direto (sem fade-out)

**Arquivos:** `electron/views/overlay.css`, `electron/views/overlay.js`

---

## Bug 18 — D-pad quebrado em streamings após fix do Bug 16

**Descrição:** Após o fix do Bug 16 (botão voltar), a navegação por D-pad parou de funcionar em todos os streamings (funcionava só na homepage).

**Causa:** `overlayMenuVisible` não era resetado ao abrir um streaming. Se o valor ficava `true` de uma sessão anterior, o `handleBeforeInput` interceptava TODAS as setas e encaminhava pro overlay. O overlay recebia mas não processava (porque `menuVisible` era `false`), resultando em setas engolidas.

**Fix:** Adicionado `overlayMenuVisible = false` no handler `nav:open-streaming` em `main.js`.

**Arquivos:** `electron/main.js`

---

## Bug 19 — Janelas de propaganda abrem como popup branca

**Descrição:** Sites de streaming aleatórios abrem janelas de propaganda (popups) quando o usuário clica. A janela aparece branca com menu "File Edit View Window" e código "0x50014".

**Causa:** Sites chamam `window.open()` pra abrir propagandas. Electron cria um novo `BrowserWindow` por padrão.

**Fix:** Adicionado `setWindowOpenHandler` no `streamingView.webContents` pra bloquear todas as chamadas `window.open()`:
```js
streamingView.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
```

**Arquivos:** `electron/main.js`

---

## Bug 20 — Highlight duplo (FIFOtv + Chromium spatial navigation)

**Descrição:** No menu de contexto e settings, aparecem dois highlights: o do FIFOtv e o do Chromium (anel azul). Além disso, ambos processam as setas ao mesmo tempo, causando ação dupla.

**Causa:** `enable-spatial-navigation` é um switch global do Chromium que não pode ser desativado por webContents. `e.preventDefault()` no JavaScript não bloqueia porque spatial navigation roda num nível mais baixo (browser input pipeline).

**Fix (Fase 1):**
1. `before-input-event` no `homeView.webContents`: bloqueia arrow keys via `event.preventDefault()` + re-injeta via `sendInputEvent()` pra handlers JS funcionarem
2. `before-input-event` no `overlayView.webContents`: mesma lógica quando `overlayMenuVisible` é true
3. CSS `*:focus { outline: none }` em `overlay.css` e `style.css` pra remover highlight visual

**Pesquisa de alternativas na época:** `docs/history/research/SPATIAL_NAVIGATION_RESEARCH.md`. O resultado vigente está descrito em `docs/ARCHITECTURE.md`.

**Arquivos:** `electron/main.js`, `electron/views/overlay.js`, `electron/views/overlay.css`, `frontend/script.js`, `frontend/style.css`
