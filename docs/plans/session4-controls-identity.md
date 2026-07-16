---
plan name: session4-controls-identity
plan description: D-pad injection + TV identity
plan status: archived
---

Plano concluído e arquivado. Referências à extensão Chromium removida podem ser consultadas na tag `electron-foundation-before-repository-cleanup`.

## Idea

## Sessão 4 — Controles + TV Identity

### Problema
Após a migração para Electron (Sessão 3), existem 3 problemas principais:

1. **D-pad setas desaparecem**: As setas ArrowUp/Down/Left/Right são capturadas pelo `before-input-event` mas quando o menu está fechado, elas simplesmente somem — o streaming nunca recebe. O overlay não tem handler para setas quando o menu está fechado.

2. **Streaming não identifica como Smart TV**: Não há User-Agent nem headers HTTP para identificar como Samsung Tizen TV. O Chromium padrão é detectado como desktop.

3. **Mouse/teclado normais podem não funcionar**: Focus pode ser perdido entre views.

### Arquitetura Atual (Referência)
```
BrowserWindow (1, backgroundColor:'#0a0816')
  └── contentView
      ├── homeView      → frontend/index.html (preload.js) [sempre presente]
      ├── loadingView   → views/loading.html [criado por 5s, depois destruído]
      ├── streamingView → URL externa [criado/destruído por streaming]
      └── overlayView   → views/overlay.html (preload-overlay.js) [sempre no topo]
```

### Solução

#### 4.1 — D-pad: Injeção de setas via sendInputEvent

Quando o menu está fechado e o usuário pressiona setas do D-pad, o `handleBeforeInput` em main.js precisa:
- Verificar se o overlay menu está aberto (`overlayMenuOpen` flag)
- Se FECHADO: injetar a tecla no DOM do streaming via `streamingView.webContents.sendInputEvent()` (funciona sem CSP, melhor que `executeJavaScript`)
- Se ABERTO: forward pro overlay processar normalmente

**Mudanças em `electron/main.js`:**
- Adicionar variável `let overlayMenuOpen = false;` no topo
- Modificar `handleBeforeInput` para tratar ArrowUp/Down/Left/Right
- Adicionar IPC handler `overlay:menu-state` para sincronizar flag
- No handler `nav:open-streaming`: resetar `overlayMenuOpen = false`

**Mudanças em `electron/preload-overlay.js`:**
- Adicionar `setMenuState: (isOpen) => ipcRenderer.invoke('overlay:menu-state', isOpen)`

**Mudanças em `electron/views/overlay.js`:**
- Em `showMenu()`: chamar `window.fifotv.setMenuState(true)` 
- Em `hideMenu()`: chamar `window.fifotv.setMenuState(false)`

**Alternativa `sendInputEvent` vs `executeJavaScript`:**
`sendInputEvent` é melhor porque:
- Funciona independente de CSP da página
- Electron-level injection, não DOM-level
- Não precisa de `contextIsolation: false`
- Mais confiável com Netflix/YouTube

```js
streamingView.webContents.sendInputEvent({
  type: 'keyDown',
  key: input.key,
  code: input.code,
  windowsVirtualKeyCode: 0,
  nativeKeyCode: 0,
});
```

#### 4.2 — TV Identity

**a) User-Agent (no `nav:open-streaming`):**
```js
const SMART_TV_UA = 'Mozilla/5.0 (SMART-TV; Linux; Tizen 6.5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36';
streamingView.webContents.setUserAgent(SMART_TV_UA);
```

**b) HTTP Headers (Sec-CH-UA-*) via `session.webRequest.onBeforeSendHeaders`:**
No `nav:open-streaming`, antes do `loadURL`:
```js
streamingView.webContents.session.webRequest.onBeforeSendHeaders(
  { urls: ['*://*/*'] },
  (details, callback) => {
    details.requestHeaders['Sec-CH-UA-Platform'] = '"Tizen"';
    details.requestHeaders['Sec-CH-UA-Mobile'] = '?0';
    details.requestHeaders['Sec-CH-UA'] = '"Chromium";v="149", "Not_A Brand";v="24"';
    details.requestHeaders['Sec-CH-UA-Full-Version-List'] = '"Chromium";v="149.0.0.0", "Not_A Brand";v="24.0.0.0"';
    details.requestHeaders['Sec-CH-UA-Platform-Version'] = '"6.5.0"';
    details.requestHeaders['Sec-CH-UA-Model'] = '""';
    details.requestHeaders['Sec-CH-UA-Form-Factors'] = '"TV"';
    callback({ requestHeaders: details.requestHeaders });
  }
);
```

**c) Navigator overrides via `preload-streaming.js`:**

Criar `electron/preload-streaming.js` que usa `contextBridge.executeInMainWorld` (Electron 35+) ou `world: 'MAIN'` para injetar overrides antes de qualquer script da página:

```js
const { contextBridge } = require('electron');
// Usa contextBridge para injetar scripts no MAIN world
contextBridge.executeInMainWorld(() => {
  // navigator overrides
  // screen overrides
  // WebGL overrides
  // userAgentData
});
```

**ATENÇÃO:** `contextBridge.executeInMainWorld` pode não existir no Electron 35. Alternativas:
1. Usar `webContents.on('dom-ready')` + `executeJavaScript` para injetar no document
2. Usar `webContents.session.setPreloads([preload-streaming.js])` — funciona mas precisa de world isolation correto

**Abordagem mais simples e confiável:** Usar `webContents.on('dom-ready')` + `executeJavaScript` para injetar o script de overrides do `tv-override/content.js`. O script original já funciona como IIFE auto-executável.

**d) Cleanup:** Em `destroyStreamingViews()`, remover o listener `onBeforeSendHeaders` para evitar leaks:
```js
if (streamingView) {
  streamingView.webContents.session.webRequest.onBeforeSendHeaders(null);
  // ... destroy
}
```

#### 4.3 — Bug Mouse/Teclado Normal

Investigar e garantir que `streamingView.webContents.focus()` é chamado:
- Após loading timer (5s) de removeView do loadingView
- Após hideMenu() do overlay
- Adicionar listener `webContents.on('focus')` no streamingView pra garantir

**Possível fix adicional:** Quando overlay tem `setIgnoreMouseEvents(true)`, o focus deveria cair no streaming. Mas pode estar caindo no BrowserWindow's own webContents (data URL dark). Solução: desabilitar foco no BrowserWindow's webContents ou chamar `streamingView.focus()` (WebContentsView-level) em vez de `.webContents.focus()`.

### Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `electron/main.js` | Modificar | Flag `overlayMenuOpen`, IPC handler `overlay:menu-state`, tratar setas em `handleBeforeInput`, TV identity em `nav:open-streaming`, cleanup em `destroyStreamingViews` |
| `electron/preload-overlay.js` | Modificar | Adicionar `setMenuState` bridge |
| `electron/views/overlay.js` | Modificar | Chamar `setMenuState(true/false)` em showMenu/hideMenu |
| `electron/preload-streaming.js` | **Criar** | Navigator overrides para Smart TV identity |
| `frontend/extensions/tv-override/content.js` | Referência | Reaproveitar lógica de overrides |

### Sequência de Implementação

1. **Criar `electron/preload-streaming.js`** com navigator/screen/WebGL overrides
2. **Modificar `electron/main.js`**:
   - Adicionar `let overlayMenuOpen = false`
   - Adicionar IPC `overlay:menu-state`
   - Modificar `handleBeforeInput` para tratar setas
   - Adicionar `preload` + `setUserAgent` + `onBeforeSendHeaders` no `nav:open-streaming`
   - Adicionar cleanup em `destroyStreamingViews`
   - Adicionar fix de focus após loading timer
3. **Modificar `electron/preload-overlay.js`**: adicionar `setMenuState`
4. **Modificar `electron/views/overlay.js`**: chamar `setMenuState` em showMenu/hideMenu
5. **Syntax check** todos os arquivos modificados
6. **Testar com `npm run dev`** se possível

### Checklist de Teste
- [ ] YouTube TV interface aparece (UA Tizen)
- [ ] Netflix mostra interface TV (não mobile/desktop)
- [ ] D-pad setas navegam no grid do streaming
- [ ] BrowserBack funciona — volta no streaming ou fecha menu
- [ ] BrowserHome (hold) volta pra homepage
- [ ] Mouse funciona no streaming
- [ ] Volume up/down funciona (globalShortcut)
- [ ] Context menu continua funcionando sobre streaming
- [ ] Todas as teclas do remote funcionam


## Implementation
- Criar electron/preload-streaming.js com navigator/screen/WebGL/userAgentData overrides (baseado em frontend/extensions/tv-override/content.js)
- Modificar electron/main.js: adicionar flag overlayMenuOpen + IPC handler overlay:menu-state + tratar ArrowUp/Down/Left/Right em handleBeforeInput via sendInputEvent quando menu fechado
- Modificar electron/main.js: em nav:open-streaming, adicionar preload: preload-streaming.js no streamingView, setUserAgent SMART_TV_UA, e onBeforeSendHeaders com Sec-CH-UA-* headers
- Modificar electron/main.js: em destroyStreamingViews, chamar session.webRequest.onBeforeSendHeaders(null) para cleanup e rechamar streamingView.webContents.focus() após loading timer
- Modificar electron/preload-overlay.js: adicionar setMenuState bridge para sincronizar flag overlayMenuOpen
- Modificar electron/views/overlay.js: chamar window.fifotv.setMenuState(true) em showMenu() e setMenuState(false) em hideMenu()
- Rodar syntax check em todos os arquivos modificados (node --check electron/main.js etc)
- Testar com npm run dev: YouTube/Netflix como TV, D-pad funciona, menu overlay funciona, mouse/teclado funciona

## Required Specs
<!-- SPECS_START -->
<!-- SPECS_END -->
