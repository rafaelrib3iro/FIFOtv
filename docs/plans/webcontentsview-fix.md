---
plan name: webcontentsview-fix
plan description: Fix migration bugs: IPC crash, flash, homeView
plan status: active
---

## Idea
Corrigir 5 bugs críticos da migração 2-window → 1-window+WebContentsViews: (1) Crash ao destruir overlay.webContents dentro do handler IPC nav:go-home — defer com setImmediate; (2) Flash branco causado pelo webContents about:blank do BrowserWindow — homeView nunca sai do contentView; (3) webContents.close() → .destroy() para destruição forçada; (4) Icon path vazio no loading.html; (5) homeView removido/re-adicionado causa flash —改为 nunca remover, streaming views ficam por cima.

## Implementation
- main.js nav:go-home — usar setImmediate() para defer destroyStreamingViews() e addView(homeView), evitando destruir overlay.webContents durante IPC handler
- main.js nav:open-streaming — NÃO chamar removeView(homeView). HomeView permanece como base no contentView. Streaming/loading/overlay views são adicionadas por cima
- main.js destroyStreamingViews() — trocar .webContents.close() por .webContents.destroy() em overlayView, streamingView e loadingView para destruição forçada e confiável
- main.js nav:open-streaming — passar slug do streaming para loading.html via query param (ícone). Passar o nome do streaming e o slug do card
- main.js win BrowserWindow — carregar dark background no win.webContents via loadURL('data:text/html,...') para evitar flash branco caso alguma view seja removida
- main.js app-command listener — usar flag para não acumular listeners se nav:open-streaming for chamado múltiplas vezes (defesa)
- Syntax check + npm run dev + testar checklist completo

## Required Specs
<!-- SPECS_START -->
<!-- SPECS_END -->