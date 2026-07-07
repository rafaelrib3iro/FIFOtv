# FIFOtv — Plano de Sessões (Migração v1 → v2)

## Visão Geral

```
Sessão 1 ✅ → Sessão 2 ✅ → Sessão 3 ✅ → Sessão 4 ✅ → Sessão 4.5 ✅ → Sessão 4.7 ✅ → Sessão 5 ✅ → Sessão 5.5 ✅ → Sessão 6 ✅ → Sessão 6.5 → Sessão 7 → Sessão 8
  setup         serviços      streaming    controles    TV custom      fixes       teste+push  hw fixes   deploy     popups       merge+tag   iso+inst
```

> **Regra de ouro:** `main` nunca quebra. `electron` é o laboratório. Só une quando está pronto.

---

## Sessão 1 ✅ — Setup e Estrutura

**Objetivo:** Criar o esqueleto do Electron e garantir que a homepage abre.

| O que foi feito | Arquivo | Status |
|----------------|---------|--------|
| Branch `electron` criada a partir de `main` | — | ✅ |
| `package.json` com Electron 35, dbus-next, electron-builder | `package.json` | ✅ |
| `electron/main.js` — abre homepage, lê streamings do JSON | `electron/main.js` | ✅ |
| `electron/preload.js` — bridge IPC com todas as APIs `window.fifotv.*` | `electron/preload.js` | ✅ |
| `scripts/dev.sh` — script pra rodar com `npm run dev` | `scripts/dev.sh` | ✅ |
| `scripts/FIFOtv-Dev.desktop` — atalho clicável no Fedora | `scripts/FIFOtv-Dev.desktop` | ✅ |
| Node.js 22 + npm instalados | sistema | ✅ |
| `npm install` executado | `node_modules/` | ✅ |

**Entregável:** `npm run dev` abre a homepage no Electron, grid funciona.

**Teste:** Clicar em streaming no grid, ver se a homepage carrega os dados do `streamings.json`.

---

## Sessão 2 ✅ — Serviços de Sistema

**Objetivo:** Todas as funcionalidades de backend funcionando via IPC (sem Flask).

| O que foi feito | Onde | Status |
|----------------|------|--------|
| Streamings CRUD (ler/escrever JSON) | `main.js:58-80` | ✅ |
| System shutdown/reboot/restart/update/stats/info | `main.js:82-173` | ✅ |
| Volume up/down/mute/get (via `wpctl`) | `main.js:175-197` | ✅ |
| Wi-Fi status/scan/connect (via `nmcli`) | `main.js:199-230` | ✅ |
| Bluetooth status/scan/connect/disconnect (via D-Bus/dbus-next) | `main.js:232-357` | ✅ |
| Navegação openStreaming/goHome | `main.js:359-372` | ✅ |
| globalShortcut (VolumeUp/Down, MediaPlayPause) | `main.js:378-392` | ✅ |
| `frontend/script.js` já adaptado com `window.fifotv.*` | `frontend/script.js` | ✅ (já estava no repo) |

**Entregável:** `npm run dev` — volume funciona, info do sistema aparece, Bluetooth escaneia, Wi-Fi escaneia.

**Teste:** Abrir Configurações, testar cada aba (Wi-Fi, Bluetooth, Sistema, Info). Verificar que os dados aparecem.

---

## Sessão 3 ✅ — Streaming + Overlay

**Objetivo:** Quando o usuário clica num streaming, abrir em janela separada com overlay de menu contexto por cima.

**Problema atual:** `showTransition()` (script.js:727) faz `window.location.href = url` — navega a homepage pro site externo, destruindo todo o contexto JS. Resultado: sem menu contexto, sem back button, sem volume toast nas páginas externas.

**O que precisa ser feito:**

1. **Reescrever `nav:open-streaming` no main.js:**
   - Em vez de `homeWindow.loadURL(url)`, criar um novo `BrowserWindow` para o streaming
   - Manter a homepage escondida (não destruir)
   - Criar `BrowserView` transparente sobre o streaming para o overlay
   - Expor `streamingWindow` como variável global no main.js

2. **Criar `electron/views/overlay.html`:**
   - HTML minimalista: container para menu contexto + volume toast + toasts
   - Script carrega o overlay.js

3. **Criar `electron/views/overlay.js`:**
   - Adaptar `frontend/extensions/tv-override/ui-overlay.js` (338 linhas)
   - Trocar todas as chamadas `fetch(BASE_URL + '/api/...')` por `window.fifotv.*` (IPC)
   - Lógica: context menu (toggle com D-pad/setas), volume toast, back button (BrowserBack)

4. **Criar `electron/views/overlay.css`:**
   - Adaptar `frontend/extensions/tv-override/ui-overlay.css` (271 linhas)
   - Manter visual glassmorphism (`fifotv-ctx`, `fifotv-volume-toast`, etc.)

5. **Reescrever `nav:go-home` no main.js:**
   - Fechar `streamingWindow` se existir
   - Fechar `overlayView` se existir
   - Mostrar `homeWindow` novamente
   - Recarregar homepage

6. **Adicionar IPC para overlay↔main:**
   - `overlay:show` / `overlay:hide` (main controla visibility do BrowserView)
   - `overlay:volume` (main processa volume quando overlay pede)

**Arquivos a criar:**
- `electron/views/overlay.html`
- `electron/views/overlay.js`
- `electron/views/overlay.css`

**Arquivos a modificar:**
- `electron/main.js` — reescrever `nav:open-streaming` e `nav:go-home`, gerenciar streamingWindow + overlayView
- `electron/preload.js` — adicionar APIs necessárias pro overlay

**Referência principal:** `frontend/extensions/tv-override/ui-overlay.js` (338 linhas) — como o menu contexto funciona hoje na extensão Chrome
**Referência CSS:** `frontend/extensions/tv-override/ui-overlay.css` (271 linhas)
**Referência TV identity:** `frontend/extensions/tv-override/content.js` (90 linhas) — UA spoofing (irá pra Sessão 4)

**Fluxo esperado:**
```
Usuário clica em Netflix
  → main.js cria streamingWindow (loadURL)
  → main.js cria overlayView (BrowserView transparente sobre streamingWindow)
  → Usuário aperta D-pad/setas → overlay navega nos itens do menu
  → Usuário aperta "Voltar" → streamingWindow fecha, overlayView fecha, homepage volta
  → Volume sobe/desce → toast aparece sobre o streaming
```

**Entregável:** Clicar em Netflix → abre janela nova → menu contexto aparece com D-pad → "Voltar" volta pra homepage.

**Teste:** Testar com 3+ streamings diferentes. Menu contexto funciona sobre streaming. Volume toast aparece. "Voltar" funciona. Volume funciona (up/down/mute). Reload funciona.

---

## Sessão 4 ✅ — Controles + TV Identity

**Objetivo:** D-pad funciona em qualquer tela, streaming reconhece como Smart TV.

> **Nota preload-streaming.js:** Criado `electron/preload-streaming.js` — preload que sobrescreve `navigator`, `screen`, `WebGLRenderingContext` e `navigator.userAgentData` no contexto da página. Usa `contextIsolation: false` no streamingView pra que os overrides sejam visíveis ao JS externo. Executa antes de qualquer script da página.
>
> **Nota spatial-navigation:** `app.commandLine.appendSwitch('enable-spatial-navigation')` habilita navegação por setas entre elementos focáveis em qualquer página. Setas agora navegam entre links/botões nativos do streaming — não precisa mais de injeção customizada de setas.

**Entregável:** D-pad navega no streaming. YouTube mostra interface TV. Netflix/Disney+ abrem normalmente. Mouse/teclado funcionam.

**Teste:** YouTube TV interface, D-pad no grid, ContextMenu abre overlay, BrowserBack fecha menu, BrowserHome volta pra home.

---

## Sessão 4.5 — Customização de Interface dos Streamings (Modo TV)

**Objetivo:** Customizar a interface de streamings específicos para um layout maior, menos poluído e mais adequado para navegação por D-pad em tela de TV (1280x720).

**Problema:** Streamings como Netflix, Disney+, Prime Video, Max, Apple TV+ mostram interfaces desktop quando acessados via web. Interface poluída com botões desnecessários (rodapé, cookies, popups), layouts pequenos e navegação não otimizada para TV.

**Escopo de Customização:**
1. **Remover elementos de UI desnecessários:** Botões de rodapé (sobre nós, contato, etc.), banners de cookies/privacy, popups de login, elementos de propaganda
2. **Ampliar layout:** Aumentar tamanho de cards, thumbnails, fontes — otimizar para visualização em TV a distância
3. **Melhorar navegação D-pad:** Garantir que todos os elementos interativos sejam focáveis e que a navegação por setas funcione de forma intuitiva
4. **Extensões existentes:** Considerar uso de extensões prontas como BetterNetflix quando disponíveis

**Abordagem Técnica:**
- Usar `webContents.on('dom-ready')` + `executeJavaScript(script)` para injetar CSS/JS customizado em cada streaming
- Scripts de customização ficam em `electron/views/streaming-customizations/`
- Cada streaming tem seu próprio arquivo de customização (ex: `netflix.js`, `disney.js`, etc.)
- Detectar streaming atual via URL para aplicar customização correta

**Streamings a customizar:**
- [x] Fase 0 — Infraestrutura de injeção (config.js, shared.js, main.js dom-ready injection)
- [ ] Netflix (Fase 1 — customização de interface pronta, mas DRM bloqueia playback)
- [ ] Disney+ (prioridade alta)
- [ ] Prime Video (prioridade média)
- [ ] Max/HBO (prioridade média)
- [ ] Apple TV+ (prioridade baixa)
- [ ] YouTube (já tem endpoint TV — verificar se precisa de ajustes)

**Arquivos a criar:**
- `electron/views/streaming-customizations/` — diretório com scripts por streaming
- `electron/main.js` — modificar `nav:open-streaming` para detectar streaming e injetar customização

**Entregável:** Cada streaming listado mostra interface otimizada para TV, com layout ampliado, sem elementos desnecessários, e navegação D-pad fluida.

**Teste:** Testar cada streaming customizado. Verificar que a customização não quebra funcionalidades essenciais (play, pause, busca). Verificar que o overlay continua funcionando sobre a interface customizada.

---

## Sessão 4.7 — Fixes

**Objetivo:** Resolver bugs e problemas acumulados das sessões anteriores antes de prosseguir pro teste e deploy.

### Fix 1 — Mouse click não funciona nos streamings (PRIORIDADE ALTA) ✅

**Problema:** Cliques do mouse não chegam ao streaming view. O overlay view (WebContentsView, topo da z-order) intercepta os cliques.

**Causa raiz:** `setIgnoreMouseEvents(true)` **não funciona** para `WebContentsView` no Linux/X11 no Electron 35 — bug conhecido (issues #49039, #23863). A API funciona apenas para `BrowserWindow`.

**Solução aplicada:** Overlay fica **atrás** do streamingView por padrão (z-order). Só sobe pro topo quando menu de contexto é aberto. Quando fecha, streaming volta pro topo.

**Fluxo:**
1. Streaming abre → overlay adicionado ATRÁS do streamingView → mouse funciona no streaming
2. ContextMenu pressionado → streaming encaminha pro overlay → overlay mostra menu → main sobe overlay pro topo
3. Setas/Enter no menu → streaming encaminha pro overlay → overlay navega
4. BrowserBack/Escape/Seleção → overlay fecha menu → main desce overlay, streaming volta pro topo

**Arquivos modificados:** `electron/main.js` (z-order + IPC handlers + before-input-event), `electron/preload-overlay.js` (bringOverlayToFront/sendOverlayToBack), `electron/views/overlay.js` (chamadas IPC), `electron/views/overlay.css` (removido pointer-events: none)

---

### Fix 2 — DRM/Widevine/Netflix (M7701-1003) (PRIORIDADE MÉDIA) ⏳

**Problema:** Ao dar play em qualquer vídeo no Netflix, aparece erro M7701-1003. O Electron oficial (v35) não vem com Widevine CDM.

**Causa raiz:** O `--widevine-cdm-path` não funciona no Electron stock desde v8 (2019). O código CDM loading foi removido do build.

**Solução aplicada:** Trocado `electron` stock por `castlabs/electron-releases` v42.3.3+wvcus — fork compilado com Widevine embutido + VMP.

**Mudanças feitas:**
- `package.json`: `"electron": "https://github.com/castlabs/electron-releases#v42.3.3+wvcus"`
- `electron/main.js`: import `components`, `components.whenReady()`, permission handlers `mediaKeySystem`, GTK 3 safety switch
- `electron/main.js`: `goBack()` atualizado pra `navigationHistory.goBack()` (deprecated v32+)
- `docs/ELECTRON-CASTLABS-FIX.md`: documentação completa

**Validação:**
- ✅ Netflix play funciona — erro M7701-1003 sumiu
- ✅ Widevine CDM carrega corretamente

**Arquivos modificados:** `package.json`, `electron/main.js`

---

### Fix 3 — Ícones de streamings cortados na tela de loading (PRIORIDADE ALTA) ✅

**Problema:** Ícones 1:1 (Prime Video, Apple TV/Music, Disney+) aparecem cortados na tela de loading (`loading.html`).

**Causa provável:** O container do ícone não tem `object-fit: contain` ou dimensões fixas adequadas. Pode ser que o CSS do loading não preserve a proporção original do SVG/PNG.

**O que fazer:**
- Revisar `electron/views/loading.html` — verificar como os ícones são renderizados
- Adicionar `object-fit: contain` + `width`/`height` fixos no container
- Testar com cada streaming pra garantir que nenhum fica cortado

**Arquivos a verificar:** `electron/views/loading.html`, `electron/views/overlay.js` (onde gera o loading)

---

### Fix 4 — Ícones pretos não ficam brancos na tela de loading (PRIORIDADE ALTA) ✅

**Problema:** Ícones com SVG preto (tipo HBO Max) não ficam brancos na tela de loading.

**Causa provável:** O CSS usa `filter: brightness(0) invert(1)` pra deixar branco, mas pode não estar sendo aplicado corretamente ou o SVG tem cores inline que sobrescrevem o filter.

**O que fazer:**
- Revisar o CSS do loading — verificar se `filter: brightness(0) invert(1)` está aplicado
- Se o SVG tem `fill` inline, pode ser necessário usar `filter: brightness(0) invert(1)` com `!important` ou usar `color: white` no container
- Testar com HBO Max e outros ícones pretos

**Arquivos a verificar:** `electron/views/loading.html`, CSS do loading

---

### Fix 5 — Monitor popup não funciona dentro de streaming (PRIORIDADE MÉDIA) ✅

**Problema:** Ao clicar em "Monitor" no menu contexto dentro de um streaming, o popup não aparece. Só funciona corretamente na homepage.

**Causa provável:** O popup de monitor está no HTML da homepage (`index.html`), mas quando o streaming está aberto, a homepage está destruída/escondida. O popup precisa existir no overlay ou ser criado dinamicamente.

**O que fazer:**
- Verificar como `showMonitorPopup()` funciona — ela manipula `#monitor-popup` que existe no `index.html`
- Implementar popup de monitor no overlay (`overlay.js`/`overlay.html`) OU criar popup via JavaScript dinâmico
- Garantir que os dados de stats (`getStats`) chegam ao popup dentro do streaming

**Arquivos a verificar:** `frontend/script.js` (função `showMonitorPopup`), `electron/views/overlay.js`

---

### Fix 6 — Splash screen não aparece no dev (PRIORIDADE MÉDIA) ✅

**Problema:** A tela de loading do FIFOtv não aparece quando roda `npm run dev`.

**Causas possíveis:**
1. A splash screen (`splash.html`) não está sendo carregada pelo `main.js` — o Electron pode estar pulando direto pra homepage
2. O tempo de loading é tão curto no Fedora que a splash não dá tempo de aparecer
3. A splash não foi implementada na v2

**O que fazer:**
- Verificar se `main.js` carrega `splash.html` antes da homepage
- Se não, implementar: criar `BrowserWindow` com `splash.html` → esperar 3-5s → trocar pra `index.html`
- Se já existe mas é rápido demais, aumentar o tempo mínimo

**Arquivos a verificar:** `electron/main.js`, `frontend/splash.html`

---

### Fix 7 — D-pad no menu de configurações (PRIORIDADE ALTA) ✅

**Problema:** Navegação via D-pad no menu de configs está incorreta. Consegue navegar verticalmente pela sidebar, mas ao tentar "entrar" nas opções de um item (clique pra direita), não entra — continua percorrendo a sidebar.

**Comportamento atual:**
- Sidebar: navega cima/baixo ✅
- Entrar nas opções do item: clique pra direita ❌ (continua na sidebar)
- Só consigo percorrer opções do item com left/right, o que é ineficiente

**Comportamento esperado:**
- Sidebar: navega cima/baixo ✅
- Entrar nas opções: clique pra direita ✅ → navega nas opções do item
- Voltar pra sidebar: clique pra esquerda ✅

**Causa provável:** A lógica de navegação do settings popup no `script.js` pode não estar tratando corretamente a transição sidebar → conteúdo.

**O que fazer:**
- Revisar `frontend/script.js` — função `showSettingsPopup()` e a lógica de navegação do D-pad
- Verificar se `navState` muda corretamente entre `'settings-sidebar'` e `'settings-content'`
- Testar com cada aba do settings (Wi-Fi, Bluetooth, Sistema, Info)

**Arquivos a verificar:** `frontend/script.js` (funções de navegação D-pad, `settingsSectionIndex`, `settingsItemIndex`)

---

### Fix 8 — Popup de input (senha Wi-Fi) não existe (PRIORIDADE ALTA) ✅

**Problema:** O popup de preencher algo solicitado pelo site ou pela homepage (ex: senha do Wi-Fi) não existe/funciona. Na v1 abria um campo de input nativo do Chromium, depois implementamos um popup estilo FIFOtv, mas na v2 não parece existir.

**Causa provável:** O popup de input era parte da extensão Chrome (`tv-override`) ou do Flask, e não foi migrado pro Electron.

**O que fazer:**
- Criar popup de input no overlay (`overlay.js`/`overlay.html`) — campo de texto + botões OK/Cancelar
- Implementar IPC pra enviar o input de volta pro frontend
- Conectar ao fluxo de Wi-Fi (quando precisa de senha) e a qualquer outro lugar que precise de input
- Garantir que o popup funciona com D-pad (navegar entre campo + botões)

**Arquivos a criar/modificar:** `electron/views/overlay.html`, `electron/views/overlay.js`, `frontend/script.js`

---

### Fix 9 — Screensaver não funciona (PRIORIDADE MÉDIA) ✅

**Problema:** O screensaver só aparece a data/hora em cima da homepage/streaming, ao invés de ser data/hora + background escuro que ocupa toda a tela.

**Causa provável:** O CSS do screensaver não está cobrindo a tela toda (pode estar com `position: fixed` mas sem `width: 100vw; height: 100vh`), ou o background preto não está sendo aplicado.

**O que fazer:**
- Revisar CSS do screensaver em `frontend/style.css`
- Garantir que `#screensaver` tem `position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: #000; z-index: 9999`
- Verificar se a classe `hidden` está sendo removida corretamente quando o screensaver ativa
- Testar com timeout curto (ex: 10s) pra facilitar teste

**Arquivos a verificar:** `frontend/style.css` (classe `.screensaver`), `frontend/script.js` (função `resetScreensaverTimers`)

---

### Status dos Fixes

| Fix | Status | Notas |
|-----|--------|-------|
| Fix 3 — Ícones cortados no loading | ✅ Resolvido | `object-fit: contain` + dimensões landscape |
| Fix 4 — Ícones pretos no loading | ✅ Resolvido | `filter: brightness(0) invert(1)` no loading |
| Fix 7 — D-pad settings | ✅ Resolvido | `tabindex="0"` + refatoração de selectors |
| Fix 8 — Popup input (senha) | ✅ Resolvido | BrowserBack check antes de INPUT/TEXTAREA |
| Fix 9 — Screensaver | ✅ Resolvido | `background: #000` adicionado |
| Fix 5 — Monitor popup no streaming | ✅ Resolvido | Popup movido pro overlay + mouse events |
| Fix 6 — Splash screen | ✅ Resolvido | Splash 3.5s antes da homepage |
| Fix 1 — Mouse nos streamings | ✅ Resolvido | Overlay atrás do streaming, z-order toggle no menu |
| Fix 2 — DRM/Widevine | ✅ Resolvido | Castlabs v42.3.3+wvcus, Netflix play funciona |

**Tempo total estimado:** 3-5 horas (dependendo do Fix 1 e Fix 2)

**Entregável:** Todos os fixes testados e funcionando. `npm run dev` roda sem bugs visíveis.

**Teste:** Testar cada fix individualmente. Testar fluxo completo: homepage → streaming → overlay → configs → voltar. Mouse funciona em tudo. D-pad navega em tudo. Splash aparece. Screensaver funciona.

---

## Sessão 5 ✅ — Teste Completo + Push

**Objetivo:** Tudo funcionando no Fedora, commit limpo, push pro GitHub.

**O que foi feito:**
1. Todos os 14 testes passaram (homepage, grid, streaming, overlay, volume, settings, screensaver, D-pad, TV identity, mouse, DRM)
2. Todos os 9 fixes da Sessão 4.7 validados
3. `update.sh` criado — script de migração v1→v2
4. `system/fifotv.service` criado — service systemd pro boot automático
5. `system/.xinitrc` atualizado — mínimo (só xset + unclutter)
6. `docs/DEPLOY-V2.md` criado — documentação completa de deploy
7. Commit `4800e55` — 42 arquivos, 4593 linhas
8. Push pro GitHub (branch `electron`)

**Commits:**
```
0c7a52b fix: BrowserWindow sizing + remote access
4800e55 v2: Electron migration complete
b31e8b5 docs: Sessão 5 concluída, Session 6 atualizada com deploy via systemd
15c9f3f docs: plano de migração v1->v2 (Electron)
8bd2896 FIFOtv v1 - Smart TV kiosk (Chromium + Flask + Openbox)
```

**Bugs corrigidos pós-deploy:**
- BrowserWindow não preenchia a tela (800x600) — fullscreen/kiosk dependiam de WM que foi removido. Fix: usar `getViewBounds()` pra definir tamanho explícito
- Botão "Ativar Acesso Remoto" não funcionava — nunca foi implementado na v2. Fix: IPC handlers `remote:status`/`remote:toggle` controlando `opencode serve`

**Entregável:** Branch `electron` no GitHub com código testado e rodando no all-in-one.

---

## Sessão 5.5 ✅ — Fix de Bugs no Hardware Real

**Objetivo:** Testar o v2 no all-in-one (Positivo Union UD3630), identificar e corrigir bugs encontrados.

**Fluxo de trabalho:**
1. Usuário testa funcionalidade no all-in-one
2. Usuário reporta bug pra IA (ou diretamente ou via prompt)
3. IA adiciona o bug em `docs/BUGS.md`
4. IA diagnostica o bug via SSH + leitura de código
5. IA corrige o bug, commita e faz push
6. Usuário atualiza o all-in-one (`git pull && sudo systemctl restart fifotv`)
7. Usuário verifica se o bug foi resolvido

**Como reportar bugs:**
> "Adiciona no BUGS.md: [descrição do bug]"

**Como atualizar after fix:**
> "Atualiza o all-in-one" (IA faz pull + restart via SSH)

**Arquivos de referência:**
- `docs/BUGS.md` — Lista de bugs e status

**Entregável:** Todos os bugs reportados corrigidos e validados no hardware real.

---

## Sessão 6 — Deploy no All-in-one

**Objetivo:** Rodar o v2 no hardware real (Positivo Union UD3630).

**Pré-requisitos:**
- All-in-one ligado e acessível via SSH (`tv@IP`, senha: `fifotv`)
- Git e Node.js 22 já instalados (do v1)

**O que acontece:**
1. Revisar scripts de deploy: `setup.sh` (remover dependências v1 como Flask, Openbox, Chromium), `update.sh` (adicionar reinstalação do service + instalação de pacotes faltantes), `deploy.sh` (remover referências v1)
2. No all-in-one: rodar `bash update.sh` (faz pull, npm install, instala pacotes, reinstala service, reinicia)
3. OU pedir pra IA: "Lê `docs/DEPLOY-V2.md` e executa todos os passos"
4. Após reboot, FIFOtv v2 inicia automaticamente via systemd
5. Testar: air mouse, D-pad, Bluetooth real, Wi-Fi real, volume real, streaming na TV
6. Corrigir bugs de hardware
7. Push das correções

**Comandos úteis no all-in-one:**
```bash
sudo systemctl status fifotv    # Ver status
journalctl -u fifotv -f         # Ver logs
sudo systemctl restart fifotv   # Reiniciar
```

**Rollback:** Seguir seção "Rollback" em `docs/DEPLOY-V2.md` (volta pro branch `main`)

**Entregável:** v2 rodando no all-in-one, todas as funcionalidades básicas funcionando.

---

## Sessão 6.5 — Refatoração Universal de Popups (2 etapas)

### Etapa A — Refatoração de Popups ✅ CONCLUÍDA

**Objetivo:** Unificar a lógica de popups/menus num sistema genérico, eliminando código duplicado e facilitando a criação de novos popups.

**O que foi feito:**

| Fase | Status | Detalhes |
|------|--------|----------|
| A.1 — Limpeza CSS | ✅ | `.monitor-popup.hidden`/`.fading-out` removidos (redundantes com `.popup`) |
| A.2 — Classe `Popup` | ✅ | `frontend/popup-manager.js` — show/hide/isVisible |
| A.3 — Container WiFi Modal | ✅ | `#wifi-modal` dedicado no HTML, parou de reusar `#add-popup` |
| A.4 — PopupNavigator | ✅ | Navegação D-pad genérica registrada por config |
| A.5 — Registry/Integração | ✅ | `closeAllPopups()`, Escape, hasPopups — tudo unificado |

**Arquivos criados/modificados:**
- `frontend/popup-manager.js` — classes `Popup` e `PopupNavigator`
- `frontend/index.html` — `#wifi-modal` + `<script src="popup-manager.js">`
- `frontend/style.css` — CSS redundante removido
- `frontend/script.js` — instâncias Popup, popupNav, handlers substituídos

**Bugs corrigidos no processo:**
- WiFi modal não abria (`handleSettingsItemNav` sem `else el.click()`)
- Context menu D-pad em streamings (`before-input-event` bloqueava setas no overlay)
- Input bloqueava navegação em popups (exceção pro PopupNavigator)
- navState leak no WiFi modal (botões cancel/confirm resetam navState)

**Entregável:** Adicionar popup novo agora = 1. elemento HTML, 2. `new Popup()`, 3. `popupNav.register()`, 4. 1 linha no switch.

---

### Etapa B — Handler de Navegação Genérico ✅ CONCLUÍDA

**Objetivo original:** Substituir as funções `handleXxxNav` por um `PopupNavigator` declarativo.

**O que foi feito:**

| Fase | Status | Detalhes |
|------|--------|----------|
| B.1 — Context Menu | ✅ | Registrado no PopupNavigator com `onHighlight` (classe CSS) e `onEnter` |
| B.2 — Settings | ⏸️ | Mantido manual — complexidade dos 2 sub-estados justifica |
| B.3 — Header pills | ✅ | Registrado no PopupNavigator, ArrowDown tratado separadamente (volta pro grid) |
| B.4 — Limpeza logs | ✅ | Todos os `[FIFOtv DBG]`, `console-message` listener, `fifotv-dbg.log` removidos |

**Mudanças em `frontend/popup-manager.js`:**
- `PopupNavigator` estendido com `onHighlight`, `onEnter`, `_indices` e `resetIndex()`

**Mudanças em `frontend/script.js`:**
- `handleContextMenuNav` + `highlightCtxItem` removidos (~40 linhas)
- `handleHeaderNav` removido (~30 linhas)
- `ctxMenuIndex` variável removida
- Context menu usa classe CSS `.fifotv-focused` em vez de `style.background` inline
- Header registrado no PopupNavigator com `onClose` que volta pro grid
- Switch do `handleKeydown` simplificado — context-menu e header usam `popupNav.handle`

**NavStates ativos:** `grid`, `header`, `context-menu`, `settings-popup`, `settings-item`, `add-popup`, `wifi-modal`

---

### Etapa C — Navegação D-pad em Streamings (em andamento)

**Objetivo:** Fazer navegação D-pad funcionar dentro dos streamings (Netflix, YouTube, etc.).

**Status atual:**

| Streaming | Navegação Browse | Player D-pad | Volume/Seek bloqueado |
|-----------|-----------------|--------------|----------------------|
| YouTube | ✅ 100% (interface TV nativa) | N/A (usa controles próprios) | N/A |
| Netflix | ✅ Funcional (polifill WICG) | ⚠️ Popup de detalhe foca mas navegação interna é do Netflix | ❌ Atalhos nativos do Chromium não bloqueáveis via JS |
| Disney+ | ⏳ Não testado | ⏳ | ⏳ |
| Max | ⏳ Não testado | ⏳ | ⏳ |
| Prime Video | ⏳ Não testado | ⏳ | ⏳ |
| Apple TV+ | ⏳ Não testado | ⏳ | ⏳ |
| Globoplay | ⏳ Não testado | ⏳ | ⏳ |

**O que foi implementado:**

| Componente | Arquivo | Status |
|------------|---------|--------|
| Polyfill WICG (spatial navigation) | `electron/views/spatial-navigation/polyfill.js` | ✅ |
| Config por streaming (enable/disable) | `electron/views/spatial-navigation/config.js` | ✅ |
| Injeção do polifill no dom-ready | `electron/main.js` | ✅ |
| Shared utilities (`FIFOtv.spatialNav()`) | `electron/views/streaming-customizations/shared.js` | ✅ |
| Config per-streaming (containers, gridRows, etc.) | `electron/views/streaming-customizations/spatial-nav.js` | ✅ |
| Auto-focus no popup de detalhe Netflix | `electron/views/streaming-customizations/netflix.js` | ✅ |
| Diagnóstico do player | `electron/views/spatial-navigation/diagnostic.js` | ✅ (temporário) |

**Descobertas técnicas:**

1. **Atalhos nativos do `<video>` no Chromium:** ArrowUp/Down (volume), ArrowLeft/Right (seek), Space (play/pause) rodam no engine C++ do Chromium, NÃO via JavaScript. `event.preventDefault()` em JS não os bloqueia. Só `before-input-event` no main process bloqueia, mas isso bloqueia TUDO (incluindo polifill e YouTube).

2. **Netflix não tem interface TV:** Mesmo com UA spoofing (Tizen Smart TV), Netflix serve a interface web desktop. A detecção é via headers HTTP (`Sec-CH-UA-Form-Factors: "TV"`) e JavaScript APIs (navigator, screen, WebGL).

3. **`stopImmediatePropagation` do Netflix:** A `preload-streaming.js` spoofa identidade TV, e o Netflix ativa handlers agressivos de tecla que chamam `stopImmediatePropagation()` em capture phase, engolindo eventos antes de handlers downstream.

4. **YouTube TV funciona nativamente:** `youtube.com/tv` tem sua própria navegação D-pad, polifill desabilitado pra YouTube.

**Bugs conhecidos (pendentes):**
- Atalhos nativos do `<video>` (volume/seek) não podem ser bloqueados via JavaScript
- `before-input-event` com `preventDefault()` bloqueia navegação em TODOS os streamings
- Re-injeção de eventos sintéticos causa problemas no YouTube
- Polyfill não navega entre botões do player Netflix (elements não são candidatos espaciais)

**Próximos passos (sessão futura):**
1. Pesquisar se Cadmium Player API (`window.netflix.cadmium.objects.videoPlayer()`) ainda existe
2. Investigar `webContents.debugger` (CDP) como alternativa de interceptação
3. Testar outros streamings (Disney+, Max, etc.)
4. Considerar `before-input-event` com detecção por streaming (IPC por streaming)

---

## Sessão 7 — Merge + Limpeza + Tag

**Objetivo:** v2 vira a versão oficial, código antigo é removido.

**O que acontece:**
1. Testar v2 no all-in-one por uns dias (estabilidade)
2. `git checkout main && git merge electron`
3. Deletar código obsoleto:
   - `backend/` (Flask inteiro)
   - `frontend/extensions/tv-override/` (extensão Chrome)
   - `system/openbox/` (config Openbox)
   - `system/scripts/bluetooth-watch.sh`, `restart.sh`, `startup.sh`
   - `system/splash/` (boot splash antigo)
4. `git tag v2.0`
5. Push final

**Entregável:** Repo limpo, v2.0 tagada, `main` com código novo.

---

## Sessão 8 — Instalador + ISO

**Objetivo:** Fresh install limpa com Electron.

**O que acontece:**
1. Atualizar `system/install/install.sh` — instalar Node.js em vez de Flask
2. Atualizar `system/.xinitrc` — rodar Electron em vez de Openbox+Chromium
3. Atualizar systemd service pra rodar Electron
4. Gerar ISO com preseed + install.sh
5. Testar ISO no all-in-one (fresh install)

**Arquivos a modificar:**
- `system/install/install.sh`
- `system/.xinitrc`

**Entregável:** ISO funcional que instala e roda o v2 do zero.

---

## Arquitetura Final (v2)

```
Debian 13 → Xorg → Electron (shell)
                     ├── Main Process (Node.js: sistema, janelas, IPC)
                     └── BrowserWindow (1, fullscreen, frame:false)
                         └── contentView
                             ├── homeView      → frontend/index.html
                             ├── loadingView   → views/loading.html (5s timer)
                             ├── streamingView → external URL
                             └── overlayView   → views/overlay.html
```

> **Nota Sessão 3:** A arquitetura original previa 2 BrowserWindows + BrowserView.
> Foi migrado para 1 BrowserWindow + 4 WebContentsViews empilhadas via `contentView.addChildView()`.
> Motivo: `BrowserView` foi deprecated no Electron 35. Além disso, 2 BrowserWindows com show()/hide() causa flash branco em X11/Linux. Uma única janela com views eliminou o flash completamente.

## O que foi eliminado

| v1 (antigo) | v2 (novo) |
|-------------|-----------|
| Flask (Python) | Electron main process (Node.js) |
| Openbox | Electron frameless window |
| Chrome extension (tv-override) | WebContentsView overlay |
| Chrome (Chromium) | Electron (Chromium embutido) |
| HTTP fetch (~50-100ms) | IPC (~1-5ms) |
| Bluetooth PTY hack | D-Bus nativo (dbus-next) |
| ~500-800MB RAM | ~210MB RAM |
| ~10s boot | ~5s boot |

---

## Notas Importantes para Sessões Futuras

### 1. Electron 35: keyCode não existe mais

No Electron 35, `input.keyCode` em `before-input-event` é **`undefined`** para todas as teclas. Usar **`input.key`** (string) em vez de `input.keyCode` (número).

```js
// ❌ NÃO funciona no Electron 35
if (input.keyCode === 166) { ... }

// ✅ Usar key string
if (input.key === 'BrowserBack') { ... }
if (input.key === 'BrowserHome') { ... }
if (input.key === 'VolumeUp') { ... }
if (input.key === 'ContextMenu') { ... }
```

Teclas mapeadas no air mouse (Linux):
| Tecla | key string | Uso |
|-------|-----------|-----|
| Botão voltar (click) | `BrowserBack` | Voltar / fechar menu |
| Botão voltar (hold) | `BrowserHome` | Ir pra home |
| Volume + | `VolumeUp` | Só via globalShortcut (before-input-event não captura) |
| Volume - | `VolumeDown` | Só via globalShortcut (before-input-event não captura) |
| Menu/contexto | `ContextMenu` | Abrir/fechar overlay menu |

### 2. WebContentsView: mouse e keyboard são tratados separadamente

- **Mouse:** Vai pro view mais alto na z-order que cobre o cursor. Overlay fica ATRÁS do streaming por padrão → mouse chega ao streaming. Quando menu abre, overlay sobe pro topo → mouse fica bloqueado (aceitável).
- **Keyboard:** vai pro `webContents` que tem `focus()` — streamingView recebe quando overlay não tem menu aberto
- **Z-order management:** `removeChildView()` + `addChildView()` reordena views. Handlers `overlay:show-menu` e `overlay:hide-menu` no main.js controlam a troca.
- **Quando menu abre:** overlay sobe pro topo via IPC + ganha foco via `webContents.focus()`
- **Quando menu fecha:** streaming volta pro topo via IPC + ganha foco

### 3. WebContentsView: focus é manual

Ao contrário de BrowserWindow, WebContentsView não herda focus automaticamente. É necessário chamar `webContents.focus()` explicitamente. Após destruir views de streaming, é necessário re-focar o `homeView`.

### 4. Arquivos criados na Sessão 3

| Arquivo | Descrição |
|---------|-----------|
| `electron/preload-overlay.js` | Bridge IPC do overlay (volume, zoom, focus, mouse events) |
| `electron/views/overlay.html` | Shell HTML do overlay |
| `electron/views/overlay.js` | Lógica: context menu, volume toast, D-pad menu, key handlers |
| `electron/views/overlay.css` | Glassmorphism CSS |
| `electron/views/loading.html` | Tela de loading (ícone + nome + spinner, 5s) |
