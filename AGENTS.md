# FIFOtv

## Projeto

FIFOtv é uma interface de TV em Electron para PCs de hardware limitado. O runtime atual oferece catálogo de streamings, navegação por D-pad, overlay, volume, Wi-Fi, Bluetooth e integrações locais sem desktop environment completo.

O projeto está em beta. Sites externos, DRM, hardware e controles físicos exigem validação prática.

## Fontes De Verdade

Consulte nesta ordem:

1. Código, configuração e testes da branch atual.
2. `docs/README.md` para o mapa da documentação.
3. `docs/ARCHITECTURE.md` para o runtime e seus contratos.
4. `docs/DEVELOPMENT_GUIDE.md` para práticas de implementação.
5. `docs/MANUAL_TEST_CHECKLIST.md` para regressão manual.

`docs/history/` preserva planos, auditorias e comportamentos antigos. `docs/research/` contém propostas não implementadas. Nenhum dos dois é prova do runtime atual.

## Arquitetura Resumida

```text
Entrada externa ou npm script
  -> Electron main (`electron/main.js`)
     -> BrowserWindow sem frame
        -> splashView
        -> homeView      (`frontend/index.html`)
        -> streamingView (URL externa)
        -> loadingView   (`electron/views/loading.html`)
        -> overlayView   (`electron/views/overlay.html`)
```

A aplicação usa uma `BrowserWindow` com `WebContentsView` empilhadas. A home permanece montada durante o streaming. O overlay é anexado apenas quando menu, monitor ou toast precisam aparecer; o streaming não deve ser removido do compositor para exibir o overlay.

Preloads são específicos por contexto:

- `electron/preload.js`: bridge da home.
- `electron/preload-overlay.js`: bridge mínima do overlay.
- `electron/preload-streaming.js`: identidade da página externa, sem bridge FIFOtv.

O catálogo persistido ativo é `backend/streamings.json`. Não classifique `backend/` inteiro como legado.

## Invariantes

- Autorize IPC pela view permitida e pelo frame principal.
- Valide payloads no main antes de efeitos colaterais.
- Nunca exponha IPC privilegiado ao streaming externo.
- Trate catálogo, SSID, nomes Bluetooth e mensagens como texto, não HTML.
- Não interpole dados externos em comandos shell; use `execFile` com argumentos.
- Resolva cards por ID estável, não por posição visual.
- Resolva providers por hostname válido, não substring da URL completa.
- Preserve a ordem explícita do pipeline de injeção.
- Associe timers, listeners, Promises e callbacks à view ou ao estado que os possui.
- Preserve foco e z-order aprovados ao alterar home, streaming ou overlay.
- Não altere identidade, DRM ou customizações de provider sem reprodução e teste manual correspondente.
- Não modularize somente para reduzir tamanho de arquivo.

## Providers

Customizações ficam em `electron/views/streaming-customizations/`. O mapeamento hostname -> script está em `config.js`; `null` significa ausência intencional de script específico.

O pipeline atual é:

1. Polyfill espacial opcional.
2. Helpers compartilhados.
3. Slug corrente.
4. Configuração espacial.
5. Script específico opcional.

O polyfill é habilitado por padrão e pode ser desabilitado explicitamente por slug. YouTube e Prime Video permanecem sem script específico. Redirects de Max e Globoplay fazem parte da resolução por hostname corrente.

## OpenCode

OpenCode permanece uma ferramenta de desenvolvimento fora da UI normal. O comportamento atual condicionado por `config/settings.json` e `remoteEnabled` foi aprovado e não deve ser alterado incidentalmente.

Os handlers `remote:*`, `logging:*` e `system:update` não possuem bridge atual. Não os documente como APIs da interface.

## Comandos

```bash
npm run dev        # desenvolvimento Electron no Linux
npm run dev:mac    # desenvolvimento Electron com perfil macOS
npm run visual     # home em http://127.0.0.1:4173/frontend/
npm run appliance  # início manual no Debian/all-in-one, encaminha --kiosk
npm start          # alias de compatibilidade de npm run appliance
npm test           # testes node:test
npm run check      # syntax checks e testes
git diff --check   # whitespace do diff
```

O argumento `--kiosk` não produz atualmente um segundo modo de janela no main. Não descreva `npm run dev` como janela comum nem `npm run appliance`/`npm start` como fullscreen garantido. Homologação no all-in-one e appliance compartilham o runtime Linux; o que muda é o procedimento e a validação física.

`npm run visual` é somente uma ferramenta local de inspeção da home. Ele não abre providers, não valida DRM, D-pad físico, composição de `WebContentsView` ou integrações Debian e não grava o catálogo persistido.

Diagnóstico físico de teclas:

```bash
npx electron scripts/keytest.js
```

Logging local, quando habilitado por `config/logging.json`:

```bash
tail -f /var/log/fifotv/main.log
journalctl -u fifotv -f
```

A unidade systemd instalada é uma fronteira externa ao repositório. O único arquivo versionado em `system/` é `.xinitrc`, mantido como helper local de Xorg.

## Validação

- Funções puras e contratos estáticos devem receber testes em `test/` quando viável.
- Mudanças em Electron, hardware, providers, DRM, foco ou z-order exigem validação manual apropriada.
- Nunca aprove comportamento de hardware ou serviço externo apenas por inspeção de código.
- Use `docs/MANUAL_TEST_CHECKLIST.md` de forma proporcional ao alcance da mudança.

## Segurança E Logging

- Não registre senha, token, cookie, credencial ou corpo sensível.
- Redija credenciais, query e fragment de URLs controladas pelo main.
- Mensagens de console de páginas externas são não confiáveis e não possuem garantia geral de redaction.
- Não coloque credenciais, MACs reais ou identificadores pessoais na documentação.

## Git E Edição

- Use a branch atual como fonte de verdade.
- Nunca faça commit, push, merge, tag ou reescrita de histórico sem autorização explícita do usuário.
- Preserve mudanças existentes que não pertençam à tarefa.
- Não reverta arquivos de outro autor sem autorização.
- Prefira a menor mudança correta.
- Não adicione comentários no código sem necessidade concreta.
- Antes de commit autorizado, revise status, diff, whitespace, testes e histórico recente.

## Escopo Documental

- `README.md` é a página pública e visual do GitHub.
- `docs/README.md` organiza as fontes técnicas.
- Documentos vigentes devem citar funções, canais e testes em vez de linhas frágeis.
- Planos concluídos com valor permanente pertencem a `docs/history/`.
- Pesquisa futura pertence a `docs/research/` e deve declarar que não está implementada.
