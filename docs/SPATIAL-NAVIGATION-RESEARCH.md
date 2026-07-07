# FIFOtv — Pesquisa: Arquitetura de Navegação Espacial

> Documento central de estudo e organização. Atualizado em Sessão 6.5+.

---

## Sumário

1. [Contexto e Objetivos](#1-contexto-e-objetivos)
2. [Análise da Arquitetura Atual](#2-análise-da-arquitetura-atual)
3. [Bibliotecas Disponíveis (Aprofundamento)](#3-bibliotecas-disponíveis)
4. [Abordagem A — WICG Polyfill como Substituto Universal](#4-abordagem-a--wicg-polyfill-como-substituto-universal)
5. [Abordagem B — Camada Híbrida (Chromium + Overlay)](#5-abordagem-b--camada-híbrida)
6. [Abordagem C — Motor Customizado Leve](#6-abordagem-c--motor-customizado-leve)
7. [Análise Comparativa](#7-análise-comparativa)
8. [Recomendação e Plano de Implementação](#8-recomendação-e-plano-de-implementação)
9. [Riscos e Mitigações](#9-riscos-e-mitigações)
10. [Referências](#10-referências)

---

## 1. Contexto e Objetivos

### 1.1 O Problema

O FIFOtv é uma SmartTV para PCs de hardware fraco (Celeron N3060, 3.5GB RAM, 1280x720). O objetivo é navegar por D-pad/setas em **todos** os streamings — inclusive aqueles que **não** possuem interface TV (só o YouTube tem). Hoje, a navegação espacial depende do `--enable-spatial-navigation` do Chromium, que é ineficiente na maioria dos streamings.

### 1.2 Objetivos Claros

| Objetivo | Prioridade |
|----------|-----------|
| Navegação espacial funcional em TODOS os streamings | ALTA |
| Funcionar em hardware fraco (Celeron N3060) | ALTA |
| Arquitetura limpa e profissional | ALTA |
| Universalização onde possível, modulação por streaming quando necessário | ALTA |
| Implementação segura e incremental | ALTA |

### 1.3 Streamings Alvo

| Streaming | Interface TV? | Tem D-pad nativo? | Problema atual |
|-----------|--------------|-------------------|----------------|
| YouTube | Sim (`/tv`) | Sim | Funciona bem |
| Netflix | Sim (via TV Identity) | Parcial | Carrosséis quebram, spatial navigation falha em lazy-load |
| Disney+ | Sim (via TV Identity) | Parcial | Shadow DOM, carrosséis dinâmicos |
| Prime Video | Nao (interface desktop) | Nao | TV Identity desabilitado por DRM, spatial navigation ineficiente |
| Max | Sim (via TV Identity) | Parcial | Layout complexo, menus aninhados |
| Apple TV+ | Sim (via TV Identity) | Parcial | Customização placeholder |
| Globoplay | Sim (via TV Identity) | Nao | Sem customização de navegação |

---

## 2. Análise da Arquitetura Atual

### 2.1 Visão Geral do Sistema de Navegação

```
┌─────────────────────────────────────────────────────────────────┐
│                    BROWSERWINDOW (1, fullscreen)                 │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                     contentView                           │   │
│  │                                                          │   │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────────────┐   │   │
│  │  │  homeView   │  │streamingView│  │   overlayView    │   │   │
│  │  │ (frontend/) │  │ (ext. URL) │  │  (overlay.html)  │   │   │
│  │  │             │  │            │  │                  │   │   │
│  │  │ D-pad custom│  │ Chromium   │  │ D-pad custom     │   │   │
│  │  │ (script.js) │  │ spatial-   │  │ (overlay.js)     │   │   │
│  │  │             │  │ navigation │  │                  │   │   │
│  │  └────────────┘  └────────────┘  └──────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Três Contextos de Navegação

#### Contexto 1: Homepage (homeView)
- **Sistema:** D-pad 100% customizado (`handleGridNav` em `script.js`)
- **Problema:** `--enable-spatial-navigation` do Chromium está ATIVO e conflita
- **Bloqueio parcial:** `before-input-event` bloqueia F1/F5/F9/F12/BrowserHome, mas NÃO bloqueia setas
- **Resultado:** Dual highlight, ação dupla (Bug 20 foi parcialmente resolvido com CSS `*:focus { outline: none }`)

#### Contexto 2: Overlay Menu (overlayView)
- **Sistema:** D-pad 100% customizado (PopupNavigator em `overlay.js`)
- **Bloqueio:** `before-input-event` no streamingView encaminha setas pro overlay quando menu aberto
- **Problema:** `__fifotv_no_spatial` injetado no streamingView bloqueia setas via `stopImmediatePropagation`, mas Chromium's spatial navigation roda num nível mais baixo que JavaScript

#### Contexto 3: Streaming (streamingView)
- **Sistema:** `--enable-spatial-navigation` do Chromium (sem customização)
- **Customizações existentes:** Automatizam cliques (skip intro, skip credits, auto-fullscreen), mas NÃO modificam navegação D-pad
- **Resultado:** Navegação espacial funciona parcialmente — falha em carrosséis, lazy-load, CSS transforms

### 2.3 Fluxo de Chaves (Simplificado)

```
D-pad pressionado
  │
  ├── homeView focused?
  │   └── before-input-event: bloqueia F-keys, BrowserHome
  │       └── script.js handleKeydown:
  │           ├── navState='grid' → handleGridNav() [custom]
  │           ├── navState='header' → PopupNavigator [custom]
  │           ├── navState='context-menu' → PopupNavigator [custom]
  │           ├── navState='settings-*' → handlers manuais [custom]
  │           └── navState='add-popup'/'wifi-modal' → PopupNavigator [custom]
  │
  └── streamingView focused?
      ├── before-input-event:
      │   ├── ContextMenu → mostra overlay
      │   ├── BrowserHome → volta pra home
      │   └── overlayMenuVisible? → forward pro overlay
      └── Chromium spatial navigation (NATIVO, sem customização)
          └── Navega entre elementos focáveis da página
```

### 2.4 Por Que Chromium Nativo É Insuficiente

| Problema | Detalhe | Impacto |
|----------|---------|---------|
| **Mapeamento estático** | Calcula posições no momento do keydown, não reavalia quando DOM muda | Carrosséis lazy-load perdem elementos |
| **CSS transforms** | `translateX()` em carrosséis cria posição visual diferente da posição real | Foco "salta" pra elementos errados |
| **Sem containers** | Não pode confinar navegação a uma área específica | Foco escapa de menus modais |
| **Sem customização** | Não tem parâmetros ajustáveis | Não pode适应ar不同streaming layouts |
| **Foco preso** | Fica retido em contêineres invisíveis ou off-screen | Usuário fica travado |
| **Global** | `--enable-spatial-navigation` afeta TODOS os webContents | Conflita com D-pad custom do homepage |

---

## 3. Bibliotecas Disponíveis (Aprofundamento)

### 3.1 WICG Spatial Navigation Polyfill

| Aspecto | Detalhe |
|---------|---------|
| **Nome** | `spatial-navigation-polyfill` |
| **Versão** | 1.3.1 (npm) |
| **Última atualização** | 2019-11-27 |
| **Status** | Repositório arquivado (Mar 2026), spec migrado pra W3C CSS WG |
| **Tamanho** | ~60KB unminified |
| **Dependências** | Nenhuma (vanilla JS) |
| **Licença** | MIT |
| **Spec** | W3C CSS Spatial Navigation Level 1 (css-nav-1) |
| **Repo** | https://github.com/WICG/spatial-navigation |

**Características Técnicas:**

| Feature | Detalhe |
|---------|---------|
| **API** | `window.navigate(dir)`, `element.spatialNavigationSearch(dir)`, `element.focusableAreas()`, `element.getSpatialNavigationContainer()` |
| **CSS Custom Properties** | `--spatial-navigation-contain` (contain/delegable/auto), `--spatial-navigation-action` (focus/scroll/auto), `--spatial-navigation-function` (normal/grid) |
| **Eventos** | `navbeforefocus` (cancelable), `navnotarget` |
| **Key Modes** | `ARROW` (só setas), `SHIFTARROW` (shift+setas), `NONE` (desabilitado) |
| **Containers** | Suporta containers de navegação via CSS (`--spatial-navigation-contain: contain`) |
| **Grid Mode** | `--spatial-navigation-function: grid` — alinha navegação em grade |
| **Scroll** | Gerencia scroll automático pra manter elemento focado visível |
| **Iframes** | Suporta navegação cross-iframe |
| **Input Handling** | Ignora setas em INPUT/TEXTAREA (move cursor de texto normalmente) |

**Funcionamento Interno (Resumo):**

1. Intercepta `keydown` no `window` (fase de captura)
2. Identifica direção (ArrowUp/Down/Left/Right)
3. Encontra "search origin" (elemento atualmente focado)
4. Navega pela árvore DOM procurando containers de navegação
5. Filtra candidates (elementos focáveis na direção correta)
6. Calcula distância (Euclidiana ou absoluta) pra achar o melhor candidato
7. Move foco via `.focus({preventScroll: true})`
8. Dispara evento `navbeforefocus` (pode ser cancelado)

**Adequação ao FIFOtv:**

| Critério | Avaliação |
|----------|-----------|
| Funciona em streamings? | Sim — projetado pra interfaces TV |
| Performance em Celeron? | Sim — cálculos geométricos simples, sem DOM queries pesadas |
| Compatível com Electron? | Sim — injetável via `executeJavaScript` |
| Permite customização por streaming? | Sim — CSS custom properties + eventos canceláveis |
| Suporta containers? | Sim — pode confinar navegação a áreas específicas |
| Suporta grid? | Sim — `--spatial-navigation-function: grid` |
| Ativo/mantido? | Nao — arquivado, mas spec é W3C (estável) |

**Problemas Conhecidos:**

1. Última atualização em 2019 — pode ter bugs com DOM moderno
2. Repositório arquivado — sem suporte ativo
3. Pode ter edge cases com Shadow DOM (Disney+ usa Web Components)
4. O check inicial `if ('navigate' in window) return;` precisa ser contornado (Chromium com `--enable-spatial-navigation` já tem `window.navigate`)

### 3.2 Luke Chang's js-spatial-navigation

| Aspecto | Detalhe |
|---------|---------|
| **Nome** | `js-spatial-navigation` |
| **Versão** | 1.0.1 (npm) |
| **Última atualização** | ~2016 (9 anos atrás) |
| **Status** | Repositório original removido do GitHub |
| **Licença** | MPL-2.0 |
| **npm** | https://www.npmjs.com/package/js-spatial-navigation |

**Adequação:** Baixa. Repositório removido, sem documentação no npm, sem atualizações. A versão referenciada na pesquisa original (com `straightOnly`, `rememberSource`, etc.) parece ser de um fork que não existe mais.

### 3.3 Chromium's Built-in Spatial Navigation

| Aspecto | Detalhe |
|---------|---------|
| **Ativação** | `--enable-spatial-navigation` (switch global) |
| **Nível** | Browser engine (Blink) |
| **Customização** | Nenhuma — não tem parâmetros ajustáveis |
| **Controle por página** | Nenumo — é global pra todos os webContents |
| **Bloqueio** | `before-input-event` + `event.preventDefault()` + `sendInputEvent` (parcialmente confiável) |

**Adequação atual:** Funciona como baseline, mas insuficiente pra streaming interfaces complexas. O problema principal é que NÃO pode ser customizado por streaming.

### 3.4 Outras Alternativas

| Biblioteca | Viabilidade | Motivo |
|-----------|-------------|--------|
| **lrud-spatial** (BBC) | Média | Exige hierarquia DOM rigorosa, difícil injetar em streaming de terceiros |
| **@noriginmedia/norigin-spatial-navigation** | Baixa | Requer React, acoplamento forte |
| **Enyo Spotlight** (LG) | Baixa | Deprecated |

---

## 4. Abordagem A — WICG Polyfill como Substituto Universal

### 4.1 Conceito

Substituir o `--enable-spatial-navigation` do Chromium pelo polyfill WICG, injetado via `executeJavaScript` em cada streaming. O polyfill rodaria **no contexto da página** (não no preload), permitindo controle total sobre navegação espacial.

### 4.2 Arquitetura Proposta

```
electron/main.js
  │
  ├── REMOVE: app.commandLine.appendSwitch('enable-spatial-navigation')
  │
  ├── streamingView.webContents.on('dom-ready', () => {
  │     │
  │     ├── 1. Injetar polyfill WICG (spatial-navigation-polyfill.js)
  │     │     └── Copiar pra Electron bundle, injetar via executeJavaScript
  │     │
  │     ├── 2. Configurar key mode
  │     │     └── window.__spatialNavigation__.keyMode = 'ARROW'
  │     │
  │     ├── 3. Aplicar CSS custom properties por streaming
  │     │     └── document.documentElement.style.setProperty('--spatial-navigation-contain', 'contain')
  │     │
  │     └── 4. Injetar customização por streaming (netflix.js, disney.js, etc.)
  │           └── Adicionar config de navegação em cada arquivo
  │
  └── Streaming customizations (netflix.js, disney.js, etc.)
        │
        ├── Configuração de containers de navegação
        ├── Seletores de elementos focáveis
        ├── Bloqueio de áreas indesejadas (rodapé, popups)
        └── Event listeners para navbeforefocus (interceptação)
```

### 4.3 Mecanismo de Injeção

```javascript
// No dom-ready do streamingView:
const polyfillCode = fs.readFileSync('spatial-navigation-polyfill.js', 'utf8');
streamingView.webContents.executeJavaScript(polyfillCode);

// Configurar key mode (desabilita ativação por shift+setas)
streamingView.webContents.executeJavaScript(`
  window.__spatialNavigation__.keyMode = 'ARROW';
`);

// Configurar containers por streaming
streamingView.webContents.executeJavaScript(`
  // Exemplo: Netflix - confinar navegação ao conteúdo principal
  const mainContent = document.querySelector('.main-view');
  if (mainContent) {
    mainContent.style.setProperty('--spatial-navigation-contain', 'contain');
  }
`);
```

### 4.4 Configuração por Streaming (Exemplos)

**Netflix:**
```css
/* Containers de navegação */
.main-view { --spatial-navigation-contain: contain; }
.billboard-row { --spatial-navigation-function: grid; }

/* Bloquear áreas indesejadas */
footer, .site-exceptions, .cookie-banner { 
  --spatial-navigation-contain: contain; 
}
```

**Disney+:**
```css
/* Web Components - confinar dentro do shadow root */
/disney-hero { --spatial-navigation-contain: contain; }

/* Grid mode pra carrosséis */
.carousel { --spatial-navigation-function: grid; }
```

**Prime Video:**
```css
/* Sem TV Identity, mas polyfill pode ajudar */
.prime-video-app { --spatial-navigation-contain: contain; }

/* Grid mode prarowse rows */
.browse-row { --spatial-navigation-function: grid; }
```

### 4.5 Interceptação e Customização

O polyfill dispara eventos `navbeforefocus` que podem ser cancelados:

```javascript
// Bloquear navegação pra fora de uma área
document.addEventListener('navbeforefocus', (e) => {
  // Se o alvo é um elemento que não queremos focar
  if (e.detail.causedTarget.closest('.unwanted-area')) {
    e.preventDefault(); // Bloqueia a navegação
  }
}, true);
```

### 4.6 Tratamento do Check Inicial

O polyfill WICG tem um check: `if ('navigate' in window) return;`. Com `--enable-spatial-navigation` removido, `window.navigate` não existe nativamente, então o polyfill vai injetar corretamente. Mas se mantivermos o switch (durante fase de transição), precisamos contornar:

```javascript
// Opção 1: Remover window.navigate antes de injetar o polyfill
streamingView.webContents.executeJavaScript(`
  delete window.navigate;
  delete window.Element.prototype.spatialNavigationSearch;
  // ... depois injetar o polyfill
`);

// Opção 2: Injetar sem o check
const polyfillCode = originalPolyfill.replace(
  "if ('navigate' in window) { return; }", 
  ""
);
```

### 4.7 Vantagens

| Vantagem | Detalhe |
|----------|---------|
| **Controle total** | CSS custom properties + eventos canceláveis |
| **Por streaming** | Configuração diferente pra cada site |
| **Containers** | Pode confinar navegação a áreas específicas |
| **Grid mode** | Suporta layouts de grade nativamente |
| **Scroll automático** | Mantém elemento focado visível |
| **Spec W3C** | Padrão internacional, documentação robusta |
| **Sem dependências** | Vanilla JS, compatível com qualquer página |

### 4.8 Desvantagens

| Desvantagem | Detalhe |
|-------------|---------|
| **Repositório arquivado** | Sem suporte ativo, mas spec é estável |
| **~60KB injetados** | Negligível em Celeron (memória > tamanho) |
| **DOM moderno** | Pode ter edge cases com Web Components/Shadow DOM |
| **Manutenção** | Se encontrar bug, precisamos corrigir no código fonte |
| **Performance** | Cálculos JS vs. Blink nativo — pode ser mais lento em DOM complexo |

---

## 5. Abordagem B — Camada Híbrida (Chromium + Overlay)

### 5.1 Conceito

Manter `--enable-spatial-navigation` como base, mas adicionar uma **camada de overlay** que intercepta e melhora a navegação. A camada:
1. Escuta eventos `keydown` antes do Chromium
2. Calcula melhor alvo usando lógica customizada
3. Envia `preventDefault()` + `.focus()` manual quando necessário
4. Configuração por streaming via injeção

### 5.2 Arquitetura Proposta

```
streamingView
  │
  ├── Chromium spatial navigation (base)
  │   └── Funciona pra layouts simples
  │
  └── Overlay layer (injetado via executeJavaScript)
      │
      ├── Interceptador de teclado
      │   ├── keydown listener (fase de captura)
      │   ├── Calcula melhor alvo baseado em config
      │   └── preventDefault() + .focus() quando overlay decide
      │
      ├── Config por streaming
      │   ├── Seletores de containers
      │   ├── Regras de navegação (grid, linear, etc.)
      │   └── Bloqueio de áreas
      │
      └── MutationObserver
          └── Recalcula quando DOM muda
```

### 5.3 Mecanismo de Interceptação

```javascript
// Injetado no streaming via executeJavaScript
(function() {
  const config = getConfigForCurrentSite(); // Ex: netflix-config

  document.addEventListener('keydown', (e) => {
    if (!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) return;
    
    const current = document.activeElement;
    const bestTarget = findBestTarget(current, e.key, config);
    
    if (bestTarget && bestTarget !== current) {
      e.preventDefault(); // Bloqueia Chromium spatial nav
      e.stopPropagation();
      bestTarget.focus();
    }
  }, true); // Captura fase
})();
```

### 5.4 Vantagens

| Vantagem | Detalhe |
|----------|---------|
| **Progressivo** | Chromium funciona como fallback |
| **Simples de implementar** | Menos código que o polyfill completo |
| **Familiar** | Segue padrão já usado (shared.js + config.js) |

### 5.5 Desvantagens

| Desvantagem | Detalhe |
|-------------|---------|
| **Dual processing** | Chromium E overlay processam tecla — precisa bloquear Chromium |
| **Performance** | Lógica JS roda ANTES do Blink — overhead em DOM complexo |
| **Reimplementação** | Estamos recriando o que o polyfill já faz |
| **Sem scroll** | Precisa implementar scroll automático manualmente |
| **Sem spec** | Comportamento custom, não padronizado |

---

## 6. Abordagem C — Motor Customizado Leve

### 6.1 Conceito

Criar um motor de navegação espacial minimalista, otimizado pro FIFOtv. Não herda de nenhuma biblioteca existente. Implementa só o que é necessário:

1. Cálculo de distância entre elementos
2. Filtro por direção
3. Containers de navegação
4. Scroll automático
5. Configuração por streaming

### 6.2 Tamanho Estimado

~15-20KB minificado (vs. 60KB do WICG polyfill). Foco em:
- Zero overhead desnecessário
- Cache de posições (DOMRect)
- Throttle de MutationObserver
- Performance otimizada pra Celeron N3060

### 6.3 Vantagens

| Vantagem | Detalhe |
|----------|---------|
| **Leve** | ~15-20KB, otimizado pro hardware |
| **Controlado** | Código nosso, modificável |
| **Simples** | Só o que precisamos, sem features extras |
| **Sem dependências** | Vanilla JS puro |

### 6.4 Desvantagens

| Desvantagem | Detalhe |
|-------------|---------|
| **Esforço grande** | Reimplementar do zero é trabalhoso |
| **Manutenção** | Todo bug é nosso pra corrigir |
| **Testado** | Sem base de usuários pra encontrar edge cases |
| **Reinventing the wheel** | O WICG polyfill já resolve isso |

---

## 7. Análise Comparativa

| Critério | Abordagem A (WICG Polyfill) | Abordagem B (Híbrida) | Abordagem C (Custom) |
|----------|----------------------------|----------------------|---------------------|
| **Complexidade de implementação** | Média | Baixa | Alta |
| **Controle sobre navegação** | Alto | Médio | Total |
| **Customização por streaming** | Sim (CSS + eventos) | Sim (seletores + regras) | Sim (código completo) |
| **Performance (Celeron)** | Boa | Regular (dual) | Excelente |
| **Manutenção futura** | Média (arquivado) | Baixa (nosso código) | Alta (todo bug é nosso) |
| **Testado em produção** | Sim (milhões de users) | Nao | Nao |
| **Scroll automático** | Sim (nativo) | Nao (precisa implementar) | Precisa implementar |
| **Containers** | Sim (CSS nativo) | Parcial | Precisa implementar |
| **Grid mode** | Sim (CSS nativo) | Precisa implementar | Precisa implementar |
| **Risco** | Baixo-Médio | Médio | Alto |
| **Tempo estimado** | 2-3 sessões | 1-2 sessões | 4-6 sessões |

---

## 8. Recomendação e Plano de Implementação

### 8.1 Recomendação: Abordagem A (WICG Polyfill)

**Justificativa:**

1. **Maturidade:** Implementação battle-tested por anos, usada em Smart TVs reais (LG, Samsung)
2. **Spec W3C:** Padrão internacional, não é gambiarra
3. **Controle total:** CSS custom properties + eventos canceláveis = configuração por streaming sem código extra
4. **Performance:** Cálculos geométricos simples, sem queries DOM pesadas. O polyfill é otimizado — ~60KB é negligível
5. **Features essenciais:** Containers, grid mode, scroll automático — tudo nativo, não precisa reimplementar
6. **Risco controlado:** Se o polyfill falhar em algum streaming, podemos ter fallback pro Chromium nativo
7. **Injeção compatível:** Segue exatamente o padrão já usado (executeJavaScript no dom-ready)

**Por que NÃO as outras:**

- **Abordagem B (Híbrida):** Dual processing é problematico. Precisamos bloquear Chromium em cada tecla, o que é frágil. Além disso, reimplementamos scroll e containers do zero.
- **Abordagem C (Custom):** Muito esforço pra algo que já existe. O polyfill WICG resolve 90% dos casos. Pra剩下的10%, podemos customizar com eventos.

### 8.2 Plano de Implementação (Incremental e Seguro)

#### Fase 1 — Infraestrutura (1 sessão)

**Objetivo:** Preparar terreno sem quebrar nada.

| Passo | Descrição | Risco |
|-------|-----------|-------|
| 1.1 | Criar `electron/views/spatial-navigation/polyfill.js` com o código do WICG polyfill (cópia local) | Nenhum |
| 1.2 | Criar `electron/views/spatial-navigation/config.js` com config default pra cada streaming | Nenhum |
| 1.3 | Criar `electron/views/streaming-customizations/spatial-nav.js` — wrapper que injeta o polyfill + config | Nenhum |
| 1.4 | Adicionar `'spatial-nav.js': null` em `config.js` pra habilitar por streaming (default: desabilitado) | Nenhum |

**Nada muda no comportamento.** Apenas arquivos criados.

#### Fase 2 — Validação em 1 Streaming (1 sessão)

**Objetivo:** Provar que o polyfill funciona no Electron com 1 streaming.

| Passo | Descrição | Risco |
|-------|-----------|-------|
| 2.1 | Habilitar polyfill pro YouTube (mais simples, já tem interface TV) | Baixo |
| 2.2 | Desabilitar `--enable-spatial-navigation` temporariamente | Baixo |
| 2.3 | Testar navegação D-pad no YouTube com polyfill | Nenhum |
| 2.4 | Se funcionar: manter. Se não: reverter e investigar | Baixo |

**Critério de sucesso:** D-pad navega entre elementos do YouTube TV usando o polyfill, sem Chromium nativo.

#### Fase 3 — Expansão Gradual (2-3 sessões)

**Objetivo:** Testar em streamings progressivamente mais complexos.

| Ordem | Streaming | Complexidade | Motivo |
|-------|-----------|-------------|--------|
| 1 | YouTube | Baixa | Já tem interface TV, baseline |
| 2 | Globoplay | Baixa | Simples, auto-fullscreen só |
| 3 | Max | Média | Layout mais complexo |
| 4 | Disney+ | Média-Alta | Shadow DOM, Web Components |
| 5 | Netflix | Alta | Carrosséis, lazy-load, dynamic content |
| 6 | Apple TV+ | Média | Pouca customização |
| 7 | Prime Video | Especial | TV Identity desabilitado, testar separadamente |

**Cada streaming = 1 teste:** Habilitar polyfill, testar navegação, ajustar config CSS, validar.

#### Fase 4 — Integração com Homepage (1 sessão)

**Objetivo:** Resolver conflito com homepage.

| Passo | Descrição |
|-------|-----------|
| 4.1 | Remover `--enable-spatial-navigation` do switch global |
| 4.2 | Bloquear setas no homeView via `before-input-event` (já parcialmente feito) |
| 4.3 | Garantir que `handleGridNav` continua funcionando sem Chromium spatial nav |
| 4.4 | Testar overlay menu em streamings |

#### Fase 5 — Otimização e Hardening (1 sessão)

| Passo | Descrição |
|-------|-----------|
| 5.1 | Performance profiling no Celeron N3060 |
| 5.2 | Ajustar throttle de MutationObserver |
| 5.3 | Testar com todos os streamings simultaneamente |
| 5.4 | Documentar config por streaming |
| 5.5 | Atualizar AGENTS.md e SESSION-PLAN.md |

### 8.3 Fallback

Se o polyfill WICG falhar em algum streaming específico:

```javascript
// Em spatial-nav.js:
const SPATIAL_NAV_SKIP = ['primevideo']; // Streamings que usam Chromium nativo

if (SPATIAL_NAV_SKIP.includes(slug)) {
  // Não injeta polyfill — mantém Chromium nativo
  return;
}
```

### 8.4 Mudanças Necessárias no Código

| Arquivo | Mudança | Impacto |
|---------|---------|---------|
| `electron/main.js` | Remover `app.commandLine.appendSwitch('enable-spatial-navigation')` | Global — afeta homepage, overlay, streaming |
| `electron/main.js` | Adicionar `before-input-event` bloqueando setas no homeView | Homepage usa D-pad custom |
| `electron/main.js` | No dom-ready do streamingView, injetar polyfill | Streaming usa polyfill |
| `electron/views/streaming-customizations/spatial-nav.js` | NOVO: wrapper de injeção do polyfill | Nenhum |
| `electron/views/spatial-navigation/polyfill.js` | NOVO: cópia local do WICG polyfill | Nenhum |
| `electron/views/spatial-navigation/config.js` | NOVO: config por streaming | Nenhum |
| `electron/views/streaming-customizations/config.js` | Adicionar entrada pra spatial-nav | Nenhum |

---

## 9. Riscos e Mitigações

### 9.1 Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|-------------|---------|-----------|
| Polyfill quebra em streaming específico | Média | Alto | Fallback: não injeta polyfill, mantém Chromium |
| Performance ruim no Celeron | Baixa | Alto | Profilear antes de expandir; polyfill é leve (~60KB) |
| Polyfill não funciona com Shadow DOM (Disney+) | Média | Médio | Testar early; Disney+ já usa Web Components |
| Polyfill conflita com TV Identity spoofing | Baixa | Alto | Polyfill roda na página, spoofing no preload — não conflitam |
| Atualizações do polyfill (arquivado) | Baixa | Médio | Cópia local, podemos corrigir bugs nós mesmos |
| Navegação escapa de containers | Média | Médio | Testar `--spatial-navigation-contain` em cada streaming |

### 9.2 Perguntas Pra Validação (Teste)

1. O polyfill injeta corretamente via `executeJavaScript`?
2. `window.navigate` funciona após injeção?
3. `--spatial-navigation-contain` confina navegação corretamente?
4. `--spatial-navigation-function: grid` funciona em layouts de grade?
5. Eventos `navbeforefocus` disparam e podem ser cancelados?
6. Performance no Celeron N3060 é aceitável?
7. Polyfill funciona com pages que usam Shadow DOM (Disney+)?
8. Polyfill funciona com pages que usam muito CSS transforms (Netflix)?
9. Navegação funciona em páginas com lazy-load (Netflix, Prime Video)?
10. Polyfill pode ser desabilitado per-streaming?

---

## 10. Referências

- **WICG Spatial Navigation Polyfill:** https://github.com/WICG/spatial-navigation (arquivado)
- **Spec W3C:** https://drafts.csswg.org/css-nav-1/
- **npm:** https://www.npmjs.com/package/spatial-navigation-polyfill
- **Netflix Tech Blog:** https://medium.com/netflix-techblog/pass-the-remote-user-input-on-tv-devices-923f6920c9a8
- **MDN TV Remote Navigation:** https://developer.mozilla.org/en-US/docs/Mozilla/Firefox_OS_for_TV/TV_remote_control_navigation
- **BlinkOn 8 Slides:** https://docs.google.com/presentation/d/1x4RaJIzTYeX0-nySVuq0TThe5shfmOsjbGIMrZJLBTE/edit
- **Luke Chang's js-spatial-navigation:** https://github.com/luke-chang/js-spatial-navigation (removido)
- **Spotlight (LG):** https://github.com/enactjs/enact/tree/master/packages/spotlight
