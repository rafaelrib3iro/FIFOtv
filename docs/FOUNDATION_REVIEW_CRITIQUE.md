# Crítica da Revisão Arquitetural da Fundação Electron

> Documento histórico anterior à limpeza física. Fontes legadas citadas permanecem disponíveis na tag `electron-foundation-before-repository-cleanup`.

## Escopo e método

Esta é uma auditoria da revisão em `docs/FOUNDATION_REVIEW.md`, não uma nova revisão arquitetural. A análise foi feita sobre o estado atual da branch e por leitura estática do runtime Electron, frontend, preloads, customizações, manifestos e scripts relevantes. Não houve instalação de dependências, execução da aplicação, acesso a serviços de streaming, testes no hardware ou alteração de código de produção.

O contexto adicional muda a classificação de parte do documento original: Electron é o único runtime ativo; Flask/Python e parte dos scripts operacionais são legados históricos; ISO, boot, instalador, empacotamento e updater não pertencem à limpeza atual; e OpenCode é ferramenta local de desenvolvimento, não funcionalidade final do produto. Esse contexto não reduz os defeitos do runtime Electron, mas impede tratá-los como bloqueadores desta fundação quando pertencem a outra frente de trabalho.

# 1. Avaliação geral

A revisão original é um bom diagnóstico estático do runtime Electron. Ela encontrou os riscos mais relevantes e demonstráveis: interpolação de dados externos em renderers privilegiados, execução de Wi-Fi via shell, resolução instável de cards após mudar a lista de recentes, estados inconsistentes de overlay/modais, divergência de identidade de providers, persistência não protegida e vários contratos de UI que não executam o que anunciam.

Também foi correta ao preservar a decisão estrutural central: uma `BrowserWindow` com `WebContentsView` empilhadas é coerente com o Electron atual e não há evidência para reescrever a aplicação, trocar Electron ou introduzir um framework frontend. `BrowserView` está depreciada, enquanto o desenho atual preserva a home, mantém o streaming montado ao abrir menu/toast e já separa preloads por contexto.

O principal problema da revisão é de recorte, não de observação. Ela combina três planos distintos em uma lista de prioridades aparentemente única:

- defeitos e riscos imediatos da fundação Electron;
- hipóteses que só podem ser comprovadas em Electron/Castlabs, hardware ou serviços externos;
- instalação, atualização, build, ISO, boot, legado Flask/Chromium e OpenCode.

Os fatos sobre esses últimos itens estão em geral corretos, mas eles não descrevem duas arquiteturas ativas nem devem bloquear esta etapa. O próprio runtime ativo é explicitamente Electron: `package.json:5-10` inicia `electron/main.js`, e `system/fifotv.service:11-13` inicia Electron em kiosk. O legado ainda no repositório requer uma limpeza futura planejada, não uma refatoração incidental da fundação.

A revisão também ocasionalmente apresenta inferência como certeza. Os exemplos mais claros são o efeito efetivo de `setIgnoreMouseEvents()` no fork Castlabs, o valor real de `process.argv` no preload, a compatibilidade final do spoofing e o comportamento de DRM, login, D-pad e timing dos streamings. O documento original normalmente pede validação desses casos, mas sua redação de impacto por vezes é mais conclusiva do que a evidência estática permite.

Problemas importantes que a revisão poderia ter destacado melhor:

- `dom-ready` usa a variável global mutável `streamingView`, e não a view que emitiu o evento (`electron/main.js:721-774`). Uma transição rápida de retorno/reabertura pode atingir uma view destruída, nula ou diferente.
- O listener de Client Hints é instalado na `defaultSession` compartilhada e removido globalmente na destruição do streaming (`electron/main.js:700-712`, `643-647`). Isso torna a identidade uma preocupação de sessão, não somente da view corrente.
- `attachRendererLogging()` adiciona `onErrorOccurred` à mesma sessão para cada view sem remover listeners (`electron/main.js:247-282`). Isso pode duplicar logs, rotular a requisição com a view errada e registrar URLs com tokens.
- O monitor do overlay não apenas é escondido pela transição de menu: um clique no item Monitor também pode disparar o segundo listener de captura e fechar o popup imediatamente (`electron/views/overlay.js:350-369`).
- A home perde o fallback quando o catálogo falta: `readStreamings()` retorna sucesso com `[]` (`electron/main.js:65-70`), enquanto o fallback de `frontend/script.js:221-227` só é usado se a invocação rejeitar.

**Confiança geral na revisão original: alta para os defeitos estáticos do runtime, média para a prioridade relativa e baixa a média para as afirmações dependentes de execução.** O documento é uma base útil, desde que o plano seja reduzido ao escopo Electron e que hipóteses de integração sejam tratadas como validação prática, não como regressões já provadas.

# 2. Conclusões confirmadas

As conclusões a seguir são sustentadas diretamente pelo código. A prioridade indicada é a recomendada para a fundação atual, não necessariamente a mesma do documento original.

## Fronteiras privilegiadas

1. **A conexão Wi-Fi aceita injeção de shell e expõe a senha na linha de comando. Prioridade: P0.** `run()` usa `child_process.exec()` (`electron/main.js:77-82`) e `wifi:connect` interpola SSID e senha em aspas duplas (`:360-362`). Expansões como `$()` e crases ainda são processadas pelo shell. O SSID é controlável por redes próximas e a senha integra os argumentos do processo. A correção mínima é executar apenas esse comando com programa e argumentos separados, sem shell.

2. **A homepage permite XSS com capacidades privilegiadas. Prioridade: P0.** A bridge expõe shutdown, update, rede, Bluetooth, catálogo e navegação (`electron/preload.js:3-51`). Dados controláveis por catálogo, SSID e Bluetooth são interpolados em `innerHTML` e handlers inline nos cards (`frontend/script.js:242-272`), Wi-Fi (`:1006-1016`), Bluetooth (`:1100-1140`), listas de apps/cache (`:1216-1231`, `1271-1281`) e toasts (`:1313-1316`). Não há CSP em `frontend/index.html:3-32`, e nem home nem overlay possuem bloqueio de navegação para origens externas. Trocar os caminhos externos por nós DOM, `textContent`, atributos/propriedades e listeners é uma correção de segurança, não uma preferência de estilo.

3. **Os handlers IPC não autorizam o emissor nem validam a maioria dos payloads. Prioridade: P1 após a correção de XSS.** Os handlers recebem `_` e não verificam `event.sender` ou `senderFrame` em todo o `main` relevante, por exemplo catálogo (`electron/main.js:103-125`), Wi-Fi (`:333-363`), Bluetooth (`:468-616`), navegação (`:657-983`) e remoto (`:1129-1154`). URL, slug, MAC, booleans, zoom e estrutura de reorder não têm schema. Isso amplia o impacto de XSS e deixa erros de entrada produzirem estado parcial; em `nav:open-streaming`, slug e power blocker são atualizados antes de validar/usar a URL (`:657-676`). A bridge não expõe `ipcRenderer` cru, o que reduz a superfície, mas não substitui autorização por view e validação no main.

## Funcionalidade e estado

4. **Um card pode abrir o streaming errado após a lista de recentes mudar. Prioridade: P1.** A grade grava somente a posição visual em `data-pos` e o click chama `activateCard(focusedIndex)` (`frontend/script.js:250-299`). Essa função recalcula `getMostUsed()` e usa o novo offset (`:768-793`), enquanto a home não é renderizada novamente ao retornar. O mesmo descompasso afeta navegação por setas, que recalcula recentes em `handleGridNav()` (`:446-459`). `data.index` e `data.url` existem, mas não são usados para ativação. O card precisa carregar um ID estável; a posição deve ficar limitada à geometria.

5. **O monitor do overlay é logicamente aberto e visualmente removido. Prioridade: P1.** `showMonitorPopup()` exibe o painel, pede foco e inicia intervalo (`electron/views/overlay.js:125-145`), mas a ação Monitor chama imediatamente `hideMenu()` (`:293-296`). `hideMenu()` devolve foco ao streaming e pede a remoção do overlay; o main realmente remove a view da árvore (`electron/main.js:962-968`). O intervalo continua ativo. Configurações no menu do overlay também apenas fecha o menu (`overlay.js:297-299`).

6. **Home e overlay têm estados modais e de foco que podem divergir. Prioridade: P1, em correções pequenas antes de um coordenador.** A home mantém `navState`, índices e foco DOM separadamente (`frontend/script.js:124-140`). O monitor não muda `navState` (`:1520-1525`) e `closeAllPopups()` o esconde sem chamar `hideMonitorPopup()`, portanto não limpa o intervalo (`:1555-1560`). O modal Wi-Fi cria uma Promise que pode nunca ser resolvida se `closeAllPopups()` for usado (`:1026-1067`). `Popup.hide()` deixa timeouts de animação pendentes (`frontend/popup-manager.js:13-23`). A consequência de entrada atingir a grade ou de polling continuar é dedutível; a frequência exige teste de interação.

7. **O roteamento de teclas é divergente. Prioridade: P2, com caracterização no hardware antes de consolidação ampla.** F5/F12 têm ações diferentes em caminhos da home (`frontend/script.js:373-387`, `1671-1683`) e overlay (`electron/views/overlay.js:449-471`); `MediaPlayPause` vira mute; BrowserBack é tratado de formas distintas. O main ainda intercepta uma parte dos atalhos (`electron/main.js:1234-1243`), e ignora o retorno de `globalShortcut.register()` (`:1260-1283`). Os fatos são claros; o impacto real por remoto depende dos eventos do hardware.

8. **Há ações e APIs anunciadas sem comportamento correspondente. Prioridade: P1 para confirmação falsa ao usuário; P3 para remoção de APIs mortas.** `clearSiteCache()` apenas mostra "Cache limpo" (`frontend/script.js:1284-1286`). Subscrições de volume e Bluetooth são expostas (`electron/preload.js:47-51`), mas não há envio correspondente no main. `onHideMenu` escuta `hide-menu` (`electron/preload-overlay.js:38-42`), embora o main apenas receba o canal distinto `overlay:hide-menu`. Os handlers `logging:*` existem (`electron/main.js:285-305`), porém nenhum preload os expõe. A ação falsa deve ser removida ou desabilitada até existir um contrato real.

## Providers, injeção e integrações locais

9. **A identidade de providers está dispersa e contém aliases já divergentes. Prioridade: P1, limitada inicialmente às inconsistências comprovadas.** O catálogo usa `disneyplus` e `hbomax` (`backend/streamings.json:21-31`), enquanto o mapa espacial espera `disney` e `max` (`electron/views/spatial-navigation/config.js:4-6`). Assim, ambas recebem `{}` e não suas opções específicas em `electron/main.js:725-727`. A seleção de scripts usa `currentUrl.includes(domain)` (`:753-758`), e YouTube/Prime também usam regex/`includes` sobre a URL (`:669-680`); um hostname em query ou domínio parecido pode acionar a regra. `play.max.com` só recebe a customização depois de eventual redirect de `max.com` (`streaming-customizations/config.js:7`).

10. **O pipeline de injeção não expressa dependências e o loading não acompanha readiness. Prioridade: P2, com testes de regressão por provider.** Polyfill, helpers, slug, navegação espacial e script específico são disparados sem `await` (`electron/main.js:720-766`), e rejeições de `executeJavaScript()` são descartadas. O loading é removido após cinco segundos, independentemente de carga, erro ou aparência real (`:815-819`). Isso não prova uma falha em todos os serviços, mas prova que a ordem e a recuperação não possuem contrato.

11. **Há defeitos locais nas métricas, volume, zoom e parsing Wi-Fi. Prioridade: P2.** `free -m` já retorna MiB, mas RAM é dividida por 1024 novamente (`electron/main.js:186-193`). O parsing de `nmcli -t` usa `split(':')` sem interpretar escape (`:333-358`). Renderers atualizam o volume visual mesmo após falha de `wpctl` (`frontend/script.js:1479-1492`, `electron/views/overlay.js:95-105`). O renderer limita a barra de zoom a 50-150%, mas o main soma qualquer delta de 0,5 sem limite (`electron/main.js:925-930`).

12. **O scan Bluetooth deixa estado e recuperação frágeis. Prioridade: P2.** O scan força `Pairable` e `Discoverable` sem guardar/restaurar estado (`electron/main.js:499-510`); `StopDiscovery()` não está em `finally` (`:512-534`); adapter e agente são cacheados (`:370-372`, `417-466`) sem invalidação após falha; e as operações mutáveis não são serializadas. A correção deve ser pequena e testada com BlueZ real, pois a ordem de restauração influencia o pareamento.

13. **O lifecycle dos helpers de customização é insuficiente para vários cenários SPA. Prioridade: P2, sempre isolada por provider.** `watchAndClick()` desestrutura `interval` mas nunca o usa; com `once: false` pode clicar novamente a cada mutação (`electron/views/streaming-customizations/shared.js:6-28`). `autoFullscreen()` e `removeElements()` só observam mutações, sem passagem inicial (`:39-69`). Isso demonstra uma semântica incompleta, mas não autoriza alterar seletor ou comportamento de streaming sem ensaio por provider.

14. **Persistência ativa está no checkout e escrita de catálogo não é robusta. Prioridade: P2 nesta etapa.** Catálogo, logging e settings usam caminhos relativos ao repositório (`electron/main.js:10-18`, `45-47`, `65-75`, `989-1006`) e escrevem JSON diretamente. Falha de leitura do catálogo devolve silenciosamente `[]`. Isso é relevante para manutenção da branch e para evitar corrupção, embora migração completa para `userData`, schema e backup não seja pré-requisito da estabilização atual.

# 3. Conclusões parcialmente corretas

## Spoofing de Smart TV

A conclusão de que o spoofing está parcialmente inoperante é correta, mas sua descrição precisa ser ajustada. O loop combina getter com `writable`, o que é inválido para descriptor accessor e tem exceções suprimidas (`electron/preload-streaming.js:37-42`); a entrada `screen` é dirigida a `navigator` porque apenas `window` recebe target especial (`:37-40`). O parse de slug também é frágil (`:4-7`), e referências diretas a `WebGLRenderingContext`/`WebGL2RenderingContext` podem abortar o preload caso uma não exista (`:85-94`).

Por outro lado, `navigator.userAgentData` não passa por esse loop e possui sua própria tentativa de definição (`:48-83`); `navigator.connection.rtt` também é tratado separadamente (`:44-46`). Logo, não é correto afirmar que todo o conjunto de UA Data provavelmente falha pelo mesmo motivo. Além disso, o main pula o User-Agent e Client Hints HTTP para Netflix e Prime (`electron/main.js:695-713`), mas o preload só retorna cedo para Prime; Netflix ainda tenta os overrides JavaScript. A política é inconsistente, mas não equivale a "main pula toda identidade de Netflix".

A correção deve primeiro medir o que cada página enxerga e o que cada requisição envia. Alterar a identidade pode mudar seleção de interface, DRM, autenticação ou mitigação antiabuso de terceiros; não deve ser priorizado sobre falhas internas demonstradas.

## Segurança do conteúdo externo

A conclusão de que streaming externo não recebe a bridge FIFOtv é parcialmente correta. Não há `contextBridge`, `ipcRenderer` exposto ou `window.fifotv` no preload de streaming, e `nodeIntegration` é `false` (`electron/main.js:681-689`, `preload-streaming.js`). Isso é uma barreira útil. Porém, `contextIsolation: false` coloca preload e conteúdo remoto no mesmo mundo; a fronteira não é tão forte quanto a descrição positiva sugere. O acesso efetivo do serviço aos globais e aos efeitos do preload deve ser verificado no runtime Castlabs.

## Overlay e mouse

O estado paralelo de main e renderer é comprovado, e `WebContents.setIgnoreMouseEvents()` não faz parte da API padrão conhecida de Electron. A chamada existe sem proteção (`electron/main.js:933-937`). Contudo, afirmar que ela inevitavelmente rejeita exige conferir a versão Castlabs empacotada. A correção de arquitetura deve evitar depender dessa chamada, mas o diagnóstico final de air mouse precisa de execução.

## Contratos de sistema

Shutdown, reboot e `screen-off` respondem sucesso antes do término dos comandos (`electron/main.js:128-135`, `230-233`), mas isso não é necessariamente um defeito de UX: essas operações deliberadamente encerram ou escurecem a sessão. O problema é o contrato não deixar claro se "aceito para execução" ou "concluído" foi retornado. Já a divergência de volume é concreta, porém ela está nos renderers, não no main como sugerido em parte da revisão original.

## Persistência, build e pacote

É correto que `package.json` só inclua `electron`, `frontend` e `package.json` (`package.json:30-34`) apesar de o main depender de `backend/streamings.json`, `config/logging.json` e `scripts/update.sh`. Isso é um defeito real de artefato distribuído. A prioridade P1 atribuída no documento original, contudo, mistura uma futura entrega `.deb`/AppImage com a fundação Electron em checkout, que é o escopo desta etapa. A persistência no checkout merece tratamento incremental; build, pacote e migração total para `userData` devem ser backlog separado.

## Responsabilidades concentradas

`electron/main.js` e `frontend/script.js` concentram muitas responsabilidades, como a revisão descreve. A lista de módulos proposta é uma possibilidade válida, não uma necessidade arquitetural demonstrada. Extrair todos os serviços antes de estabilizar contratos, estados e testes apenas redistribuiria acoplamento. As extrações devem ocorrer quando uma correção concreta exigir uma fronteira ou quando houver caracterização suficiente para preservar comportamento.

# 4. Conclusões contestadas

## "Runtime v2 e instalação representam arquiteturas diferentes" como bloqueio atual

Os arquivos citados existem e o instalador legado de fato ainda usa Flask/Chromium/Openbox. Isso não sustenta a interpretação de que há duas arquiteturas ativas ou que esta seja uma prioridade P1 da fundação Electron. O runtime ativo é unívoco em `package.json:5-10` e `system/fifotv.service:11-13`. A existência de `backend/app.py`, `frontend/extensions/tv-override/` e `system/install/` deve ser tratada como dívida histórica e futura limpeza de repositório. A exceção é `backend/streamings.json`, que é consumido pelo Electron (`electron/main.js:45`, `65-75`) e não pode ser removido com o restante do diretório.

## Acesso remoto OpenCode como requisito de produto

O código confirma fatos técnicos preocupantes: `fuser -k 3000/tcp` pode matar processo alheio (`electron/main.js:1051-1057`), status é marcado antes de readiness (`:1061-1086`) e o processo destacado não é encerrado em `will-quit` (`:1296-1298`). A classificação como P1/P0 de produto é contestada pelo escopo informado: OpenCode é ferramenta local de desenvolvimento, não recurso final exposto da TV. A resposta apropriada nesta fase é retirar/ocultar essa integração do fluxo de produto ou deixá-la explicitamente fora da fundação, não investir em autenticação, TLS, política LAN, ownership e supervisor de um recurso que não será entregue agora.

## Causa documental para exceções de streaming

É possível provar que Prime está mapeado para `null` e que YouTube recebe endpoint `/tv` (`electron/views/streaming-customizations/config.js:3-4`, `electron/main.js:669-672`). Não é possível provar estaticamente que a razão atual é uma regressão de reprodução, nem que esses comportamentos continuam corretos para os serviços atuais. Essa justificativa deve migrar para validação prática por provider.

## Diagnósticos específicos de Netflix e customizações externas

O lifecycle genérico é frágil, mas afirmações específicas como "o seletor de restauração é provavelmente incompatível" não foram demonstradas. O código Netflix grava `el.dataset._fifoOrigTi` e procura `[data-_fifoOrigTi]` (`electron/views/streaming-customizations/netflix.js:109-128`); se essa conversão de `dataset` é ou não serializada exatamente assim pelo DOM e se os seletores atuais da Netflix permanecem válidos exigem execução contra o serviço. Também não há base estática para declarar que uma sequência particular de auto-skip falha em todos os episódios.

## Refatoração antecipada para registro completo de providers

Há um bug real em `disneyplus`/`hbomax` versus `disney`/`max`, mas criar já um registro total com aliases, hostnames, estratégia de navegação, política de identidade e script para todos os providers é potencialmente overengineering. O registro canônico é apropriado somente se começar como uma tabela mínima de aliases e hosts que elimina inconsistências observadas, preservando a customização individual. Ele não deve ser pré-requisito para corrigir XSS, Wi-Fi, cards, overlay ou contratos falsos.

# 5. Itens que dependem de validação prática

Nenhum dos itens abaixo deve ser concluído apenas por inspeção estática. Eles precisam de uma matriz de testes no Electron Castlabs e, quando aplicável, no hardware alvo.

- **Spoofing e Client Hints:** valor real de `process.argv` no preload, descriptors que a versão Chromium permite sobrescrever, valores vistos no main world, cabeçalhos efetivamente enviados e efeito da sessão compartilhada.
- **DRM e serviços externos:** Widevine, login, reprodução, seleção de interface, popups de autenticação, redirects, `window.open`, comportamento de Netflix, Prime, Disney+, Max, Apple, Globoplay e YouTube após qualquer alteração de identidade ou injeção.
- **D-pad, air mouse e mídia:** eventos físicos emitidos pelos controles, resultado de `globalShortcut.register()`, BrowserBack, Home, ContextMenu, volume e mídia em cada view e estado modal.
- **Overlay e `setIgnoreMouseEvents`:** presença ou ausência dessa API no fork Castlabs, z-order real, foco, passagem de ponteiro, clicks externos, toasts consecutivos e ausência de flash.
- **Pipeline de navegação:** páginas rápidas, lentas, offline, redirects, reload, `did-fail-load`, renderer crash e retorno à home durante `dom-ready`.
- **Bluetooth:** comportamento de `Pairable`/`Discoverable`, timeout de scan, pareamento, adaptador desligado, reinício de `bluetoothd`, hotplug e concorrência entre scan/connect/disconnect/unpair.
- **Wi-Fi:** SSIDs abertos, ocultos, com espaços, aspas, Unicode, `:`, `$()`, crases e ponto e vírgula; conexão protegida e sem senha; parsing real de `nmcli` na versão instalada.
- **Desempenho:** custo dos observers das customizações, polling de monitor, memória com home preservada, streaming e overlay em hardware Celeron N3060.
- **Dados persistentes:** interrupção no meio da escrita, permissões do diretório, catálogo inválido, upgrade de checkout e eventual migração para `userData`.
- **Permissões e sistema:** Polkit, shutdown/reboot, acesso a `/var/log/fifotv`, DPMS e unidade systemd realmente instalada.

# 6. Itens fora do escopo desta limpeza

As recomendações abaixo podem ser úteis em uma futura frente operacional, mas não devem entrar no plano de estabilização da fundação Electron.

1. **Instalador, deploy, ISO, Plymouth, boot e autologin.** `system/install/`, `system/build/`, splash legado e a cadeia de boot precisam de uma revisão operacional dedicada. O fato de instaladores históricos apontarem para Flask não torna o Electron menos ativo hoje.

2. **Empacotamento `.deb`/AppImage e reprodutibilidade de release.** Incluir arquivos faltantes no `build.files`, versionar lockfile, testar `npm ci`, smoke test de artefatos, instalação limpa e rollback são necessários antes de distribuição, mas foram explicitamente excluídos desta etapa.

3. **Unificação de updater e branch/canal de atualização.** O updater do root é uma migração v1 para v2 (`update.sh:1-80`) e o de `scripts/` é chamado pela UI (`scripts/update.sh:18-28`). Ambos apontam para `electron`, o que é inadequado para a branch atual, mas não deve ser corrigido acidentalmente enquanto update estiver fora de escopo. A ação de UI pode ser removida/ocultada para não prometer uma atualização segura.

4. **Remoção física do legado Flask/Python/Chromium/Openbox.** Deve ocorrer só depois de inventário explícito. Não apagar `backend/` em bloco, pois `backend/streamings.json` é dado ativo do Electron.

5. **Endurecimento do OpenCode como serviço remoto.** Autenticação, TLS, bind, firewall, readiness, PID ownership e persistência do processo seriam trabalho para um produto de acesso remoto. Com o contexto atual, OpenCode deve sair da UI e dos objetivos da fundação, não ganhar uma arquitetura de produção.

6. **Migração completa de persistência para `app.getPath('userData')`.** É uma evolução válida, mas schema versionado, backup, escrita atômica e migração/rollback devem ser desenhados com dados reais em uma etapa específica. Nesta etapa basta impedir perda silenciosa e reduzir a divergência entre catálogo ativo e fallback.

# 7. Revisão do plano de refatoração

## Etapa 0: Caracterização

**Alteraria e dividiria.** Manter uma caracterização curta de contratos internos antes das correções de risco: catálogo/cards, IPC de navegação, Wi-Fi, modais e overlay. Não exigir testes de todos os parsers, todos os controles e todos os sites antes de corrigir P0. Criar uma matriz manual versionada para hardware/streaming e testes pequenos para funções puras ou DOM local quando a infraestrutura permitir.

## Etapa 1: Fechar execução de comandos

**Manteria, ampliando minimamente o contrato.** É uma mudança independente e de alto valor. Além de eliminar shell para SSID/senha, deve preservar redes abertas, que hoje passam pelo fluxo de senha. O armazenamento/entrada de segredo fora de `ps` pode ser trabalho posterior se `nmcli` não oferecer a via adequada de forma simples.

## Etapa 2: Fechar a fronteira da homepage

**Manteria, dividida em duas entregas.** Primeiro substituir todos os sinks de dados externos por construção segura de DOM e remover handlers inline dinâmicos. Depois bloquear navegação de home/overlay e autorizar IPC por webContents/view, com validação mínima dos payloads sensíveis. CSP só deve entrar depois de remover scripts/handlers inline incompatíveis; não deve ser aplicado como cabeçalho decorativo que quebra a home.

## Etapa 3: Corrigir defeitos funcionais isolados

**Manteria e ampliaria com correções pequenas de lifecycle.** Cards por ID, RAM correta e remoção/indisponibilização de cache falso são apropriados. A opção Settings do overlay deve ser removida até existir fluxo real, não conectada a uma nova arquitetura. Incluir: `closeAllPopups()` chamando o fechamento real do monitor, resolução da Promise de Wi-Fi ao cancelar globalmente, cleanup/reuso de timers de popup e defesa de `dom-ready` contra view obsoleta.

## Etapa 4: Consolidar estados de modal e overlay

**Alteraria e adiaria parcialmente.** Corrigir primeiro o monitor invisível, o clique que o fecha e o intervalo órfão com transições pequenas. Só depois de caracterizar foco/z-order no hardware avaliar um modo único de overlay. Um coordenador modal completo para toda a home é justificável se as correções locais não bastarem, mas é uma mudança transversal e não precisa preceder os demais itens.

## Etapa 5: Canonicalizar providers

**Alteraria e reduziria.** Corrigir primeiro os aliases Disney+/Max e matching por `hostname`, preservando os scripts existentes. Um registro canônico mínimo pode vir na mesma mudança se substituir duplicação direta. Adiar uma política abrangente de identidade/navegação/DRM até testes por provider comprovarem que é necessária.

## Etapa 6: Corrigir spoofing e pipeline de injeção

**Dividiria e condicionaria a testes.** A sequência de injeção pode ser tornada explícita com logging e guards sem mudar identidade. Mudanças de descriptor, UA, Client Hints e exceções Netflix/Prime devem ser uma segunda entrega por provider, depois de coletar baseline de UI e playback. Não usar readiness visual genérica: loading deve manter timeout de segurança e adotar apenas sinais que sejam confiáveis para cada caso.

## Etapa 7: Extrair serviços do main

**Adiaria.** Fazer extrações oportunistas somente depois das correções e da caracterização de contratos. Não há valor em mover todos os serviços para a árvore sugerida enquanto os limites, estados e respostas ainda são instáveis.

## Etapa 8: Migrar persistência

**Adiaria, com uma correção defensiva agora.** Não incluir schema, migração e rollback nesta fundação. Agora, tratar erro de leitura como erro explícito ou fallback seguro, validar o formato básico antes de escrever e eliminar a divergência entre catálogo principal e fallback. A migração para `userData` precisa de plano de dados e testes de upgrade separados.

## Etapa 9: Tornar build reproduzível

**Adiar.** É correto para o ciclo de release, mas explicitamente fora do escopo atual.

## Etapa 10: Consolidar operação v2

**Remover deste plano e manter em backlog operacional.** Instalador, updater, service readiness, `.xinitrc`, boot e rollback não devem concorrer com a estabilização do runtime.

## Etapa 11: Endurecer customizações externas

**Manter como backlog isolado por provider.** Não fazer uma refatoração genérica dos scripts. Medir observers e validar dois episódios, player, modal e retorno de foco para o provider alterado antes de seguir para o próximo.

# 8. Plano final recomendado

O plano abaixo é enxuto e prepara a branch Electron para se tornar a base principal sem reescrita ou troca de stack.

## 1. Fechar fronteiras de execução e renderer privilegiado

- Trocar `wifi:connect` para execução sem shell e tratar rede aberta explicitamente.
- Remover interpolação de conteúdo externo em HTML/handlers da home, incluindo catálogo, SSID, Bluetooth e toasts.
- Bloquear navegação não local em home/overlay.
- Validar dados de catálogo, URL, slug, MAC, zoom e reorder no main; autorizar canais sensíveis somente às views que os precisam.

Resultado esperado: dados de rede, Bluetooth e catálogo não executam JavaScript ou shell e um renderer não autorizado não consegue operar capacidades administrativas.

## 2. Corrigir inconsistências funcionais e contratos falsos

- Resolver cards por ID estável e renderizar/restaurar foco de forma consistente ao retornar da home.
- Corrigir unidades de RAM e parsing de Wi-Fi; fazer volume/zoom refletirem o resultado autoritativo do main.
- Remover ou marcar como indisponível cache, Settings do overlay e APIs de subscrição sem produtor.
- Tratar leitura inválida/ausente do catálogo sem apresentar grade vazia silenciosa.

Resultado esperado: ações visíveis fazem o que anunciam, e erros de dados não mudam o app ou a grade de modo enganoso.

## 3. Estabilizar lifecycle de views, monitor e modais

- Corrigir o fluxo do monitor do overlay para mantê-lo montado, visível e focado; corrigir seu fechamento por mouse e limpar intervalos antes de abrir outros.
- Corrigir cleanup de monitor e modal Wi-Fi na home, cancelando timers/Promises pendentes.
- Guardar callbacks `dom-ready` contra a substituição/destruição da streamingView e registrar falhas de injeção.
- Caracterizar menu, toast, monitor, D-pad e air mouse no hardware antes de uma consolidação mais ampla de modos.

Resultado esperado: não há painel invisível, polling órfão, Promise pendente ou callback atuando sobre view errada.

## 4. Reduzir divergência comprovada entre providers

- Corrigir aliases `disneyplus`/`hbomax` e matching de domínio por hostname/subdomínio.
- Manter scripts por provider; criar somente uma tabela mínima compartilhada se ela substituir os mapas duplicados sem alterar a política de identidade.
- Tornar a ordem de injeção observável e sequencial onde houver dependência real.
- Medir spoofing, login e DRM por provider antes de mudar identidade HTTP ou JavaScript.

Resultado esperado: as configurações existentes são selecionadas de maneira previsível, sem transformar hipótese de streaming em refatoração global.

## 5. Consolidar evidência e preparar manutenção

- Versionar uma matriz de caracterização para IPC, cards, modais, overlay, controles e cada provider alterado.
- Adicionar testes locais de contrato onde não dependerem de sites externos ou hardware.
- Extrair do `main.js` apenas as partes tocadas e estabilizadas quando a extração reduzir duplicação concreta; manter IPCs e payloads compatíveis durante cada extração.
- Mover para backlog separado: pacote, instalador, ISO/boot, updater, limpeza física do legado, migração completa de `userData` e OpenCode remoto.

Resultado esperado: a branch tem fronteiras mais seguras, comportamento caracterizado e uma base de manutenção sem transformar a limpeza em projeto de release ou replatforming.

## Síntese final

**Nível de confiança na revisão original:** alto para os riscos estáticos de segurança e estado; médio para sua priorização global; baixo a médio para os efeitos que dependem de Castlabs, hardware, DRM e serviços externos.

**Cinco problemas mais importantes encontrados:**

1. Injeção de shell por SSID/senha em `wifi:connect`.
2. XSS na homepage privilegiada por catálogo, Wi-Fi, Bluetooth e toasts.
3. Card visual podendo abrir outro streaming após mudar "Mais Usados".
4. Lifecycle do overlay/monitor que remove o painel visível e deixa estado/timers ativos.
5. Ausência de autorização/validação IPC, que amplia XSS e permite estado parcial.

**Recomendações a remover, alterar ou adiar:** remover do plano atual consolidação de instalador/boot/ISO e endurecimento de OpenCode como produto; alterar a canonicalização de providers para uma correção mínima guiada por aliases/hostname; adiar build, updater, lockfile, release, migração completa de persistência, modularização ampla e mudanças de spoofing até validação prática.

Esta auditoria modificou somente `docs/FOUNDATION_REVIEW_CRITIQUE.md`.
