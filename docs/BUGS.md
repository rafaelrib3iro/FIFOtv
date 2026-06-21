# FIFOtv v2 — Bugs Reportados

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

**Causa:** Seção herdada da v1 (Chromium + extensão tv-override). Na v2, tudo é nativo no Electron.

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
