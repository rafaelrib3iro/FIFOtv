# Fix 2 — Widevine/DRM via Castlabs Electron

## Contexto

O FIFOtv é um Smart TV kiosk que precisa rodar streaming com DRM (Netflix, Disney+, etc.) no all-in-one Positivo Union UD3630 (Debian 13, display 1280x720).

**Problema:** Netflix mostra erro **M7701-1003** ao dar play. O Electron oficial (v35) não vem com Widevine CDM (Content Decryption Module), que é necessário pra decodificar vídeo protegido por DRM.

## O que já tentamos

### Opção A — `--widevine-cdm-path` (FALHOU)

Tentamos apontar o Electron pro `libwidevinecdm.so` do sistema via:
```js
app.commandLine.appendSwitch('widevine-cdm-path', '/path/to/WidevineCdm/...');
session.defaultSession.setPermissionCheckHandler(...);
session.defaultSession.setPermissionRequestHandler(...);
```

**Por que falhou:** O `--widevine-cdm-path` é um switch do Chromium, mas o código que o lê (`chrome_key_systems.cc`) foi **removido do build do Electron desde a versão 8** (2019). O switch existe, é aceito, mas nada no binário do Electron o processa. Não é bug — é decisão de design.

**Evidências:**
- Commit `c388f79` (2019): "FIXME: disable widevine" — removeu o patch
- Issue #20211: fechada como "not planned"  
- PR #35980 (2022): "Widevine has been disabled since Electron 8... may never make sense to re-enable"
- Docs atuais do Electron: zero referências a Widevine

## Solução — Castlabs Electron (ECS)

O [castlabs/electron-releases](https://github.com/castlabs/electron-releases) é um fork do Electron compilado com Widevine embutido + VMP (Verified Media Path). É a solução padrão da comunidade pra DRM em Electron.

**O que muda:**
- Binário do Electron compilado com `enable_widevine = true`
- API `components.whenReady()` — espera o CDM ser instalado antes de abrir janela
- VMP assinado pra desenvolvimento (produção precisa de [EVS](https://castlabs.com/security/widevine-certification/))
- Suporte parcial no Linux (sem persistent licenses devido a limitações VMP)

## Versão disponível

**Não existe castlabs v35.** As versões disponíveis começam na v39:

| Versão castlabs | Chromium base | Status |
|----------------|---------------|--------|
| v39.8.10+wvcus | Chromium ~132 | Estável |
| v40.10.2+wvcus | Chromium ~134 | Estável |
| v41.7.1+wvcus | Chromium ~136 | Estável |
| **v42.3.3+wvcus** | **Chromium ~138** | **Latest estable** |
| v43.0.0-beta.1+wvcus | Chromium ~140 | Beta |

**Versão atual do FIFOtv:** Electron 35.0.0 (Chromium ~134)

**Versão alvo:** v42.3.3+wvcus (Electron 42, Chromium ~138)

**Salto:** 35 → 42 (7 versões principais). Potencial de breaking changes.

## Riscos do upgrade 35 → 42

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Breaking changes na API do Electron | Médio | Verificar changelog entre v35 e v42 |
| `electron-builder` pode não suportar castlabs | Baixo | Castlabs é drop-in, mesmo package.json |
| Compatibilidade com módulos nativos (dbus-next) | Médio | Rebuild com `npm rebuild` |
| WebContentsView API mudou | Baixo | APIs estáveis entre v35-v42 |
| Performance/memory | Baixo | Chromium 138 mais otimizado que 134 |

## Plano de implementação

### Passo 1 — Trocar o package.json

```bash
# Remover electron stock
npm uninstall electron

# Instalar castlabs
npm install "https://github.com/castlabs/electron-releases#v42.3.3+wvcus" --save-dev
```

### Passo 2 — Adicionar `components.whenReady()` no main.js

O castlabs precisa que o Widevine CDM seja instalado antes de criar o BrowserWindow:

```js
const { app, components, BrowserWindow, ... } = require('electron');

app.whenReady().then(async () => {
  // Esperar Widevine CDM ficar pronto (castlabs)
  if (components && components.whenReady) {
    await components.whenReady();
    console.log('[FIFOtv] Widevine CDM ready:', components.status());
  }

  // ... resto do código existente (criar BrowserWindow, splash, etc.)
});
```

### Passo 3 — Adicionar permission handlers

Pra autorizar `mediaKeySystem` (DRM):

```js
const { session } = require('electron');

// Dentro de app.whenReady(), após components.whenReady():
session.defaultSession.setPermissionCheckHandler((wc, perm) => {
  if (perm === 'mediaKeySystem') return true;
  return false;
});
session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => {
  if (perm === 'mediaKeySystem') cb(true);
  else cb(false);
});
```

### Passo 4 — Testar

```bash
npm run dev
# Abrir Netflix → tentar dar play
# Verificar console: "[FIFOtv] Widevine CDM ready: 1"
# Verificar se erro M7701-1003 sumiu
```

## Como reverter

Se o castlabs quebrar algo:

```bash
# Remover castlabs
npm uninstall electron

# Voltar pra versão stock
npm install electron@^35.0.0 --save-dev
```

Remover do `main.js`:
- `components` do import
- `components.whenReady()` do `app.whenReady()`
- Permission handlers de `mediaKeySystem`

## Arquivos a modificar

| Arquivo | Mudança |
|---------|---------|
| `package.json` | Trocar `electron` por castlabs URL |
| `electron/main.js` | Adicionar `components` no import, `components.whenReady()`, permission handlers |
| `electron/main.js` | RemoverWidevine switch code (já revertido) |

## Produção (all-in-one)

Para deploy no all-in-one, o castlabs tem VMP assinado pra desenvolvimento. Em produção, precisa de assinatura EVS (custo). Para o FIFOtv (kiosk interno), a assinatura de desenvolvimento pode ser suficiente — Netflix aceita clientes de desenvolvimento em DRM L3 (720p).

## Referências

- [castlabs/electron-releases](https://github.com/castlabs/electron-releases)
- [Widevine CDM wiki](https://github.com/castlabs/electron-releases/wiki/CDM)
- [VMP wiki](https://github.com/castlabs/electron-releases/wiki/VMP)
- [components API](https://github.com/castlabs/electron-releases/blob/master/docs/api/components.md)
- [Electron Issue #20211](https://github.com/electron/electron/issues/20211) — "Enable widevine support"
- [Electron PR #35980](https://github.com/electron/electron/pull/35980) — removed Widevine docs
