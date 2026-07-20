# Guia de Desenvolvimento da Fundação Electron

## Escopo

Este guia orienta mudanças no runtime descrito em `docs/ARCHITECTURE.md`. O mapa e a ordem de autoridade estão em `docs/README.md`. Não use documentos de `docs/history/` ou `docs/research/` como prova de comportamento implementado.

Antes de alterar um componente, prove que ele participa do grafo atual por `require`, preload, `loadFile`, `loadURL`, IPC, leitura de arquivo, recurso carregado ou processo iniciado.

## Iniciar e Inspecionar

### Contextos de execução

O FIFOtv mantém uma única implementação Electron para o produto. Os contextos com diferenças técnicas reais são desenvolvimento no macOS, desenvolvimento no Linux/Debian e visualização local da home no navegador. Homologação no all-in-one e uso como appliance compartilham o runtime Linux; o que muda é o procedimento operacional e a validação física.

| Contexto | Comando ou entrada | Papel |
|---|---|---|
| Desenvolvimento no macOS | `npm run dev:mac` | Perfil macOS para trabalhar na interface e no runtime sem depender de BlueZ. |
| Desenvolvimento no Linux | `npm run dev` | Electron direto com o runtime Linux atual. |
| Homologação no all-in-one | `npm run appliance` ou systemd externo | Mesmo runtime Debian, validado pelo checklist manual e pelo hardware real. |
| Appliance Debian | systemd externo; `npm run appliance` para início manual | Execução normal no aparelho. |
| Visual em navegador | `npm run visual` | Home em URL local, sem hardware, DRM ou streaming integrado. |

`npm run appliance` e `npm start` encaminham hoje o mesmo argumento `--kiosk`; não há um segundo modo de janela implementado no main.

### Visualizar a home no navegador

```bash
npm run visual
```

Abra `http://127.0.0.1:4173/frontend/`. O servidor atende somente a home e o catálogo necessário para sua visualização; ele não grava `backend/streamings.json` e não fica acessível pela rede local. O modo visual preserva a mesma interface, mas não abre providers, não reproduz DRM, não controla Wi-Fi/Bluetooth/volume/energia e não mede o appliance. Alterações de catálogo feitas nessa página existem somente até recarregar.

### Desenvolvimento local no macOS

Pré-requisitos: Node.js/npm e os demais requisitos já descritos na documentação do projeto. No macOS, instale as dependências usando o `package-lock.json`; o `postinstall` materializa automaticamente o binário Castlabs compatível usando o checksum do pacote. Valide o ambiente com:

```bash
npm install
npm ls --depth=0
npm test
npm run check
npm run dev:mac
```

Início direto do Electron:

```bash
npm run dev
```

No macOS, use o perfil explícito que mantém o runtime principal e grava o log em `.runtime-logs/main.log`:

```bash
npm run dev:mac
```

O diretório `.runtime-logs/` é criado quando o logging está habilitado. O nível, ativação, tamanho máximo, saída de console e demais opções continuam sendo lidos de `config/logging.json`; somente o caminho do arquivo é substituído no perfil macOS. O perfil padrão/Linux mantém o caminho configurado, normalmente `/var/log/fifotv/main.log`.

No macOS, o perfil também evita a inicialização de BlueZ/D-Bus; o polling Bluetooth retorna estado neutro. Desligar ou reiniciar a máquina retorna indisponibilidade, enquanto reiniciar o próprio FIFOtv permanece possível. Os controles continuam visíveis e as integrações Linux restantes devem ser validadas no hardware principal.

Execução manual no Debian/all-in-one, com o argumento `--kiosk` encaminhado:

```bash
npm run appliance
```

`npm start` permanece como alias de compatibilidade desse comando. O main não implementa atualmente um segundo modo de janela para esse argumento.

Testes puros:

```bash
npm test
```

Syntax checks do runtime ativo e testes:

```bash
npm run check
```

Validação de whitespace do diff:

```bash
git diff --check
```

Status e histórico antes de qualquer commit autorizado:

```bash
git status --short --branch
git diff --check
git log --oneline --decorate -10
```

Logging local, quando habilitado:

```bash
tail -f /var/log/fifotv/main.log
journalctl -u fifotv -f
```

No macOS:

```bash
tail -f .runtime-logs/main.log
```

`/var/log/fifotv/main.log` é a fonte mais completa quando `config/logging.json` está habilitado. `journalctl` depende da unidade externa instalada em `/etc/systemd/system/fifotv.service`.

## Localizar a Origem de um Comportamento

Use o fluxo abaixo, sem começar por documentação antiga:

1. Confirme a entrada em `package.json`.
2. Localize a criação da view em `electron/main.js`.
3. Identifique preload e HTML carregados por essa view.
4. Encontre o método `window.fifotv` no renderer, se houver.
5. Associe o canal ao `handleFrom`, `onFrom` ou `webContents.send` do main.
6. Siga leituras de arquivo, comandos externos e módulos requeridos.
7. Consulte `docs/README.md` para não misturar runtime, pesquisa e histórico.

Mapa rápido:

| Comportamento | Origem principal |
|---|---|
| Home, grid, Settings, popups, modal, screensaver | `frontend/index.html`, `frontend/script.js`, `frontend/style.css` |
| Bridge da home | `electron/preload.js` |
| Overlay, menu, toast, monitor | `electron/views/overlay.*`, `electron/preload-overlay.js` |
| Views, IPC e integrações locais | `electron/main.js` |
| Identidade do streaming | `electron/preload-streaming.js` e constantes do main |
| Seleção de provider | `electron/provider-resolution.js` e customizations `config.js` |
| Injeção | `electron/streaming-injection.js` e scripts em `streaming-customizations/` |
| Catálogo | `backend/streamings.json`, `electron/catalog.js` |
| Logging de rede | `electron/runtime-logging.js` |

## Alterar Popup, Modal ou Settings

Popups existentes devem usar `Popup` e, quando houver navegação interna, `PopupNavigator` de `frontend/popup-manager.js`.

Ao criar ou alterar um popup:

1. Mantenha um único estado de visibilidade.
2. Cancele timer de hide anterior ao reabrir.
3. Defina o primeiro foco válido ao abrir.
4. Restaure foco e `navState` ao fechar.
5. Faça `closeAllPopups()` chamar o fechamento semântico, não apenas adicionar `hidden`.
6. Limpe intervalos e Promises antes de descartar a UI.
7. Teste mouse, D-pad, Enter, Escape e BrowserBack.

Modais assíncronos devem possuir um único finalizador idempotente. O modal Wi-Fi usa essa regra para resolver sua Promise no máximo uma vez em confirmação, cancelamento ou fechamento global.

Ao adicionar uma seção em Settings:

1. Só exponha uma ação com contrato funcional completo.
2. Construa dados externos por DOM seguro.
3. Preserve a navegação de sidebar, conteúdo e ações.
4. Após reorder/remove, foque uma ação equivalente ou fallback válido.
5. Não anuncie updater, cache ou acesso remoto sem produto aprovado.

## Criar ou Alterar IPC

Um IPC só está completo quando existem origem, bridge, autorização, validação, efeito e consumidor.

Para uma chamada renderer para main:

1. Adicione o método ao preload correto.
2. Use `ipcRenderer.invoke` para resposta assíncrona ou `ipcRenderer.send` somente para evento sem resposta.
3. Registre com `handleFrom` ou `onFrom`; não use `ipcMain.handle/on` diretamente fora dos wrappers.
4. Informe somente as views que precisam da capacidade.
5. Valide sender, frame principal e payload antes do efeito.
6. Retorne um shape explícito e mantenha contratos já aprovados.
7. Adicione o consumidor real no renderer.
8. Atualize ou estenda `test/ipc-contracts.test.js` quando a forma estática mudar.

Para evento main para renderer:

1. Emita com `webContents.send` somente para uma view viva.
2. Exponha subscription apenas no preload daquela view.
3. Garanta consumidor real e lifecycle de remoção quando necessário.
4. Não deixe subscriptions sem emissor.

Validação mínima depende do efeito:

- IDs: inteiro seguro e identidade existente quando aplicável.
- URL: HTTP/HTTPS e normalização antes do uso.
- Slug: formato restrito.
- MAC: seis octetos válidos.
- Catálogo: shape completo, IDs únicos e entradas válidas.
- Booleanos: tipo estrito.
- Zoom/números: finitos e clamp no main.
- Enums: allowlist explícita.

Não amplie um preload por conveniência. O streaming externo não recebe bridge FIFOtv.

## Dados Externos no DOM

Catálogo, SSID, nome de Bluetooth, hostname e mensagens podem conter caracteres hostis. Trate esses valores como texto.

Use:

- `document.createElement()`.
- `textContent`.
- Propriedades DOM como `src`, `alt`, `dataset` e `className`.
- `addEventListener()` com dados capturados em closure.
- `replaceChildren()` para substituir conteúdo controlado.

Evite:

- `innerHTML` com qualquer valor externo.
- `onclick` ou outro handler inline construído com string.
- Atributos HTML concatenados.
- URLs externas interpoladas em markup.
- Mensagem de toast inserida como HTML.

SVG estático constante pode ser inserido como markup quando nenhuma parte vem de dados externos. Não transforme essa exceção em API genérica.

## Executar Comandos Externos

Dados dinâmicos nunca devem atravessar um shell.

Use `execFile(command, args)` para argumentos como SSID, senha, MAC, caminho ou valor fornecido pelo renderer:

```js
execFile('nmcli', ['dev', 'wifi', 'connect', ssid, 'password', password], callback);
```

Não use:

```js
exec(`nmcli dev wifi connect "${ssid}" password "${password}"`, callback);
```

Comandos estáticos já existentes podem usar o helper atual quando não incorporam dados externos. Ao tocar um deles, avalie se `execFile` ou APIs Node eliminam parsing de shell sem mudar o contrato.

Sempre:

1. Valide dados antes da execução.
2. Defina timeout.
3. Retorne falha real ao renderer.
4. Não atualize estado visual antes da confirmação autoritativa.
5. Não registre senha, token ou query sensível.

## Adicionar ou Alterar Provider

Não selecione provider por `url.includes()` ou regex ampla sobre a URL completa.

Fluxo correto:

1. Garanta slug estável no catálogo.
2. Adicione configuração espacial pelo slug somente quando necessário.
3. Adicione hostname mínimo em `electron/views/streaming-customizations/config.js`.
4. Use domínio base ou host específico conforme a evidência real.
5. Preserve `null` quando o provider deve ficar sem script específico.
6. Deixe `resolveCustomScript()` escolher host exato/subdomínio e configuração mais específica.
7. Teste redirects e host final observado em `dom-ready`.
8. Adicione teste em `test/provider-resolution.test.js` ou `test/provider-config.test.js`.
9. Execute login, D-pad, BrowserBack, overlay, reload, DRM e playback no Castlabs.

Aliases são do slug persistido; hostnames são da URL corrente. Não confunda os dois. Disney+ usa `disneyplus`; Max usa `hbomax`, embora o script se chame `max.js`.

Não altere UA, Client Hints, WebGL, descriptors ou exceções Netflix/Prime junto de uma simples correção de hostname. Identidade exige baseline e aprovação por provider.

## Pipeline de Injeção

O pipeline deve permanecer explícito e sequencial:

1. Polyfill opcional.
2. Helpers compartilhados.
3. Slug.
4. Configuração espacial.
5. Script específico opcional.

Cada estágio deve possuir nome para logging. Leitura de arquivo e execução podem falhar; a pipeline deve parar no estágio com falha e não continuar em estado parcial.

Toda operação deve verificar a view e geração corrente antes e depois de `executeJavaScript`. Logs devem usar URL redigida.

Não crie um framework universal para providers. Helpers compartilhados só devem receber comportamento realmente comum e validado.

## Lifecycle de Views e Recursos Assíncronos

Ao criar callback, timer, intervalo, listener ou Promise, defina no mesmo bloco:

- Quem é o proprietário.
- Quando começa.
- Como saber se ainda é corrente.
- Como é cancelado.
- Qual foco ou estado deve ser restaurado.

Para streaming, capture a view local e a geração. Não leia apenas a variável global dentro de callbacks tardios.

Para timers e intervalos:

- Limpe o handle anterior antes de criar outro.
- Zere a referência após cleanup.
- Não deixe polling rodar para popup oculto.

Para Promises de modal:

- Use um finalizador único.
- Resolva cancelamentos globais.
- Ignore segunda conclusão.

Para listeners de sessão compartilhada:

- Instale uma vez por sessão.
- Atribua por `webContentsId`.
- Remova somente o consumidor da view.
- Não use `onBeforeSendHeaders(null)` ou equivalente para limpar todo o estado compartilhado.

## Preservar Foco e Z-Order

Regras consolidadas:

- A home permanece montada atrás do streaming.
- O streaming permanece no compositor enquanto menu, monitor ou toast aparece.
- Overlay só é anexado quando necessário.
- Toast não toma foco.
- Menu/monitor focam overlay depois que o renderer está pronto.
- Fechamento remove overlay e devolve foco ao streaming.
- Retorno à home destrói views de streaming e foca home.
- Re-render de cards/listas restaura foco por identidade, não por índice antigo.

Qualquer mudança de composição precisa ser testada no Castlabs com mouse, D-pad e fechamento repetido. Inspeção DOM não demonstra z-order real.

## Wi-Fi e Bluetooth

Wi-Fi e Bluetooth são dependentes de hardware. Mocks/testes puros cobrem parsing e validação, não conectividade.

Wi-Fi:

- Preserve redes abertas sem modal de senha.
- Preserve SSID Unicode, espaços, `:`, aspas e metacaracteres como dados.
- Use o parser terse para campos escapados.
- Use `execFile` para connect.
- Não registre senha.

Bluetooth:

- Preserve o uso de `dbus-next`, sem fallback Python.
- Restaure `Pairable` e `Discoverable` após scan, inclusive em falha.
- Sempre tente `StopDiscovery()` no cleanup.
- Invalide caches em erros recuperáveis.
- Preserve múltiplos dispositivos conectados na resposta e UI.
- Não mude pairing/trust sem teste físico.

Se hardware não estiver disponível, registre o teste como pendente. Não marque como aprovado por inspeção.

## OpenCode em Desenvolvimento

OpenCode não é funcionalidade normal do produto e não deve voltar à UI ou aos preloads.

Condição aprovada e preservada:

- O arquivo versionado `config/settings.json` contém `remoteEnabled: true`, portanto o checkout atual tenta garantir o serviço em todo startup.
- Ausência do arquivo, arquivo inválido ou valor `false` usa o fallback desativado.
- Não foi aprovada uma condição `FIFOTV_DEV`.

Não transforme o subsistema em produto durante manutenção da fundação. Autenticação, TLS, bind, firewall, PID ownership e supervisor pertencem a uma decisão futura separada.

Se a porta 3000 já estiver ocupada, preserve o processo existente: não use `fuser`, `pkill` ou outro comando para liberar a porta. Um processo iniciado pelo Electron usa sessão destacada com `stdio: 'ignore'`, portanto deve sobreviver ao encerramento da TV. Ao testar, inicie `opencode serve --port 3000` manualmente, abra e feche o FIFOtv e confirme que o processo continua acessível.

## Logging Seguro

Use labels estáveis e dados mínimos para diagnóstico. URLs devem passar por `redactUrl()` ou helper equivalente antes do log.

Não registre:

- Query string.
- Fragment.
- Credenciais embutidas na URL.
- Senha Wi-Fi.
- Token, cookie ou license request sensível.
- HTML externo completo.

Falhas de rede devem ser atribuídas pelo `webContentsId`. Não instale um `onErrorOccurred` por view na mesma sessão.

Ao adicionar uma nova view, chame `attachRendererLogging()` antes de `loadFile`/`loadURL` e garanta cleanup no evento `destroyed`.

## Práticas Proibidas ou Desencorajadas

- Usar a antiga `main` como fonte automática de verdade.
- Classificar diretório inteiro sem verificar exceções.
- Reintroduzir Flask/Python/Chromium no fluxo Electron.
- Expor IPC privilegiado ao streaming externo.
- Registrar handler sem consumidor e anunciar capacidade inexistente.
- Interpolar dados externos em HTML ou comando shell.
- Resolver card por posição visual.
- Selecionar provider por substring da URL completa.
- Remover streaming do compositor para abrir overlay.
- Criar timer, listener ou Promise sem cleanup.
- Alterar spoofing/DRM sem reprodução e matriz manual.
- Modularizar apenas para reduzir tamanho de arquivo.
- Corrigir installer, ISO, build ou updater dentro de uma mudança da fundação.

## Atualizar Testes e Checklist

Toda mudança em função pura deve ganhar teste em `test/` quando o contrato puder ser isolado sem Electron/hardware.

Toda mudança de comportamento ativo deve atualizar `docs/MANUAL_TEST_CHECKLIST.md` com:

- Preparação.
- Ações.
- Resultado esperado.
- Regressões a observar.
- Evidência útil em falha.

Depois execute:

```bash
npm run check
```

Testes dependentes de Castlabs, hardware, conta ou serviço externo permanecem manuais e precisam de resultado explícito do usuário.
