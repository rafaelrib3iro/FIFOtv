# FIFOtv v2 — Bugs Reportados

## Status

| # | Bug | Status | Commit |
|---|-----|--------|--------|
| 1 | Tela não preenche display (800x600) | ✅ Resolvido | `0c7a52b` |
| 2 | "Ativar Acesso Remoto" não funciona | ✅ Resolvido | `0c7a52b` |
| 3 | Bluetooth scan não retorna dispositivos | 🔴 Aberto | — |

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

**Fix proposto:**
1. Adicionar `console.error` nos catch blocks de `bt:status` e `bt:scan`
2. Chamar `StopDiscovery()` antes de `StartDiscovery()` (evitar sessão duplicada)
3. Chamar `StopDiscovery()` após coletar dispositivos (limpar sessão)

**Arquivos:** `electron/main.js`
