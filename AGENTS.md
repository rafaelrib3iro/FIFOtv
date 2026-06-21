# Instruções para IA

## Testes Autônomos

Quando o usuário pedir "testa isso" ou similar, use o framework de testes nesta pasta:

```
/home/rafael/Documentos/FIFOtv Testes Autônomos/
```

### Como rodar

```bash
cd "/home/rafael/Documentos/FIFOtv Testes Autônomos"

# Teste genérico (homepage)
node run.js

# Teste específico
node tests/youtube-test.js
```

### Criar um teste novo

1. Criar arquivo em `tests/nome-do-teste.js`
2. Usar a lib em `lib/` pra interagir
3. Exemplo:

```javascript
const { launch, close } = require('../lib/connection');
const { screenshot } = require('../lib/screenshot');
const { click, pressKey } = require('../lib/interact');
const { waitForHomepage, waitForPageStable } = require('../lib/navigation');

async function run() {
  const { browser, page } = await launch({ headless: true });
  try {
    await waitForHomepage(page);
    await screenshot(page, '01-homepage');

    // ... sua ação aqui ...

    await screenshot(page, '02-resultado');
  } finally {
    await close(browser);
  }
}
run();
```

### Regras

- **NUNCA** modificar arquivos em `/home/rafael/Documentos/FIFOtv/`
- Testes rodam daqui (pasta de testes)
- Screenshots ficam em `results/`
- Electron abre em headless por padrão
- Usar `waitForPageStable(page)` depois de qualquer ação que pode causar navegação

### Lib disponível

- `lib/connection.js` — launch/close do Electron
- `lib/screenshot.js` — screenshot, screenshotElement, screenshotFull
- `lib/interact.js` — click, pressKey, typeText, wait, waitForElement
- `lib/navigation.js` — waitForPageStable, waitForHomepage, waitForUrl, waitForNavigationAway
- `lib/analyze.js` — getDOM, getElementCount, getText, isVisible, getVisibleElements
