# FIFOtv v2 — TV Mode Enhancement: Brainstorming Consolidado

## Contexto

FIFOtv v2 é um app Electron que funciona como launcher de streamings. Cada streaming abre numa **BrowserView separada** na mesma janela. Já existe um **preload script** que injeta User-Agent (Android TV) e ativa `--enable-spatial-navigation`.

**Objetivo:** tornar as interfaces web dos streamings navegáveis por D-pad/Air Mouse sem precisar do modo ponteiro — experiência "boa o suficiente" para usuário leigo.

**Streamings alvo (prioritários):** Netflix, Prime Video, Disney+, Max, Globoplay, Apple TV, Apple Music.

**Nota:** YouTube já tem interface TV nativa (`youtube.com/tv`), não precisa de intervenção.

---

## O Problema

Streamings (exceto YouTube) não têm interface TV para browser. Com spatial navigation ativo, o D-pad navega por TODOS os elementos focáveis da página — footer, links de "Sobre", banners de cookie, redes sociais, copyright — antes de chegar no conteúdo relevante. Além disso:

- Cards e fontes pequenos demais para visualização a 3 metros
- Sem auto-fullscreen ao iniciar reprodução
- Botões de "Pular intro", "Ainda assistindo?", créditos exigem interação manual
- Indicador de foco (`:focus` CSS) varia por site e costuma ser invisível
- Prime Video: overlay X-Ray polui a tela durante reprodução

---

## Arquitetura da Solução: 3 Camadas

### Camada 1 — Injeções próprias via webContents (núcleo)

Executadas no `dom-ready` de cada BrowserView, baseadas em perfis por domínio.

**Sistema de perfis JSON:**
Um arquivo por streaming com os seletores e configs específicos:
```json
{
  "domain": "netflix.com",
  "focusBlocklist": ["footer", "nav", "[data-uia='main-menu']"],
  "playerAllowlist": ["[data-uia='player-skip-intro']", ".player-controls"],
  "autoSkipSelectors": ["[data-uia='player-skip-intro']", "[data-uia='continue-watching']"],
  "autoFullscreen": true,
  "css": "netflix.css"
}
```

**A) Focus cleanup**

Abordagem dupla:
- **Blocklist semântica** (fora do player): `tabindex="-1"` em footer, nav, banners de cookie — usando seletores `data-*` e `role=` que são mais estáveis que class names
- **Allowlist agressiva** (durante playback): desabilita tabindex de tudo, reabilita apenas nos controles do player

**B) Custom focus overlay (agnóstico de site)**

Em vez de depender do `:focus` CSS de cada streaming, injetar um `<div>` fixo que segue o elemento focado:
```javascript
document.addEventListener('focusin', (e) => {
  const r = e.target.getBoundingClientRect();
  overlay.style = `position:fixed; pointer-events:none; z-index:2147483647;
    top:${r.top-4}px; left:${r.left-4}px;
    width:${r.width+8}px; height:${r.height+8}px;
    border:3px solid rgba(255,255,255,0.9); border-radius:10px;
    box-shadow:0 0 30px rgba(255,255,255,0.2);
    transition:all 0.12s ease;`;
});
```
Funciona em qualquer site sem depender do CSS deles.

**C) Auto-skip via MutationObserver**

Observa o DOM para clicar automaticamente em botões que aparecem dinamicamente:
```javascript
const observer = new MutationObserver(() => {
  SKIP_SELECTORS[domain].forEach(sel =>
    document.querySelector(sel)?.click()
  );
});
observer.observe(document.body, { childList: true, subtree: true });
```
Seletores conhecidos:
- Netflix: `[data-uia="player-skip-intro"]`, `[data-uia="continue-watching"]`
- Prime: `.skipelement`
- Disney+: `[data-testid="skip-intro"]`
- Max, Globoplay: a descobrir via inspeção

**D) Auto-fullscreen**
```javascript
webContents.on('media-started-playing', () => {
  webContents.executeJavaScript(
    `document.querySelector('video')?.requestFullscreen()`
  );
});
```

**E) CSS injection por streaming**

Via `webContents.insertCSS()`. Scope limitado ao que é estável e impactante:
- Aumentar área de foco dos cards principais
- Ocultar elementos que poluem (X-Ray do Prime, banners, footer durante playback)
- Aumentar tamanho de fonte onde for crítico para leitura a distância

Considerado **secundário** dado o objetivo "bom o suficiente" — priorizar só se A+B+C+D não resolverem.

---

### Camada 2 — Streaming Enhanced (a testar)

Extensão open source que cobre Netflix, Prime, Disney+, Max com: auto-skip, speed control, ocultar elementos desnecessários.

Electron suporta extensões unpacked via `session.defaultSession.extensions.loadExtension(path)` (deve ser chamado a cada boot).

**Status: incógnita** — nunca foi testado na v2. Pode conflitar com as injeções próprias ou usar APIs Chrome não suportadas pelo Electron. Testar antes de depender.

Se funcionar → ganho grátis em cobertura de streamings sem manter seletores manualmente.

---

### Camada 3 — UA spoofing + spatial navigation (já implementado)

Preload existente continua como está.

---

## Incógnitas / A Descobrir

| Item | Status |
|---|---|
| Streaming Enhanced funciona no Electron? | Nunca testado |
| Seletores de skip do Globoplay | Nunca inspecionado |
| Apple Music — navegável por D-pad? | Nunca testado |
| Apple TV — spatial nav funciona razoavelmente? | Parcialmente testado, parece ok |
| Globoplay — spatial nav funciona? | Nunca testado |

---

## Manutenibilidade

Sites mudam HTML com frequência. Mitigações:
- Preferir `data-*`, `role=`, seletores semânticos sobre class names
- Fallback gracioso: se seletor não encontra nada, silencia sem quebrar
- Perfis JSON versionados — fácil de atualizar quando um streaming muda

---

## Prioridade Sugerida de Implementação

1. **Custom focus overlay** — maior impacto imediato, zero dependência de seletores por site
2. **Focus cleanup** (blocklist semântica) — remove ruído de navegação
3. **Auto-skip via MutationObserver** — QoL grande para uso real
4. **Auto-fullscreen** — fácil, impacto alto
5. **Testar Streaming Enhanced** — se funcionar, integrar; se não, ignorar
6. **CSS injection** — refinamento posterior, se necessário
