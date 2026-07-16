---
plan name: session45-tv-mode
plan description: Customização de interface dos streamings para modo TV
plan status: done
---

## Idea
O script específico do Prime Video foi posteriormente desabilitado por regressão de playback e removido na limpeza física; o provider continua explicitamente mapeado para `null`.

Sessão 4.5: Customizar a interface dos streamings para layout TV — maior, menos poluído, melhor para D-pad. Abordagem: usar webContents.on('dom-ready') + executeJavaScript() para injetar CSS/JS customizado em cada streaming. Scripts ficam em electron/views/streaming-customizations/. Usar seletores do projeto open-source Streaming Enhanced (Dreamlinerm/Netflix-Prime-Auto-Skip, 566 stars, 40k usuários) como base, adaptando-os de TypeScript/com extensão para vanilla JS/executeJavaScript. Ordem de prioridade: Netflix → Prime Video → Apple TV/Music → Max → Disney+ → Globoplay. Cada fase é testada individualmente antes de avançar. Streaming Enhanced não tem suporte a Globoplay, Apple TV nem Apple Music — esses precisam de seletores customizados. A extensão é Manifest V3 (service worker), então não pode ser carregada diretamente no Electron — vamos extrair só a lógica dos content scripts e adaptar para executeJavaScript.

## Implementation
- Fase 0 — Infraestrutura de Injeção: Criar diretório electron/views/streaming-customizations/, criar config.js com mapeamento domínio→script, criar shared.js com utilitários comuns (MutationObserver genérico, auto-fullscreen via media-started-playing), modificar nav:open-streaming no main.js para detectar domínio via URL e injetar script após dom-ready do streamingView
- Fase 1 — Netflix (prioridade alta): Criar netflix.js baseado em src/content-script/netflix.ts do Streaming Enhanced. Seletores: skip intro [data-uia='player-skip-intro'], skip recap [data-uia='player-skip-recap']/[data-uia='player-skip-preplay'], skip credits [data-uia='next-episode-seamless-button-draining'], block 'Are you still watching?' [data-uia='interrupt-autoplay-continue']. Testar no Electron com npm run dev.
- Fase 2 — Prime Video (prioridade alta): Criar primevideo.js baseado em src/content-script/amazon.ts do Streaming Enhanced. Seletores: skip intro [class*=skipelement], skip credits [class*=nextupcard-button], hide X-Ray .xrayVodHeaderTitle.expanded .arrow.show, filter paid article[data-card-entitlement='Unentitled']. Testar.
- Fase 3 — Apple TV+ e Apple Music (prioridade média): Criar appletv.js e applemusic.js. Streaming Enhanced NÃO cobre esses — precisam inspeção manual do DOM. Foco: remover elementos desktop poluídos, garantir foco visível com spatial navigation, testar navegação D-pad. Testar.
- Fase 4 — Max/HBO (prioridade média): Criar max.js baseado em src/content-script/max.ts do Streaming Enhanced. Seletores: skip intro button[class*='SkipButton-'], skip credits button[class*='UpNextButton-'], watch credits button[class*='DismissButton-']. Testar.
- Fase 5 — Disney+ (prioridade média): Criar disney.js baseado em src/content-script/disney.ts do Streaming Enhanced. Seletores via shadow DOM: skip-overlay → skip-button → button, self-ad .overlay_interstitials__promo_skip_button. Testar.
- Fase 6 — Globoplay (prioridade baixa): Criar globoplay.js. Streaming Enhanced NÃO cobre — precisa inspeção manual. Foco: elementos poluidores, foco, D-pad. Testar.
- Fase 7 — Focus Indicator: Testar foco nativo do spatial-navigation em cada streaming. Se insuficiente → implementar focus overlay compartilhado em shared.js (div fixo que segue elemento focado com borda branca). Se suficiente → pular.
- Fase 8 — Teste e Decisão Streaming Enhanced: Testar se session.defaultSession.extensions.loadExtension() funciona com a extensão unpacked. Se funcionar → incorporar como Camada 2. Se não → injeções próprias (Camada 1) são suficientes.
- Teste final: Testar TODOS os streamings com npm run dev no Fedora. Verificar que customizações não quebram funcionalidades essenciais (play, pause, busca, login). Verificar que overlay continua funcionando sobre interfaces customizadas. Syntax check em todos os arquivos.

## Required Specs
<!-- SPECS_START -->
<!-- SPECS_END -->
