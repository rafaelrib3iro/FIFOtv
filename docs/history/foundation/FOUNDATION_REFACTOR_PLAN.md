# Decisões Arquiteturais Consolidadas

> **Plano concluído e histórico.** As macroetapas descritas aqui já foram executadas. Este arquivo preserva o processo; não é backlog nem fonte de verdade atual.

As decisões abaixo são premissas desta fase. Uma sessão futura não deve reabri-las sem nova evidência concreta e aprovação explícita.

1. Electron permanece como a arquitetura oficial e como o único runtime ativo considerado neste plano.
2. A aplicação continuará usando uma única `BrowserWindow` com `WebContentsView` empilhadas.
3. A homepage continuará preservada em memória enquanto um streaming estiver aberto.
4. A `streamingView` continuará montada no compositor durante menus, toasts e overlays. O overlay deve ser adicionado ou removido sem retirar o streaming.
5. Os preloads continuarão separados por contexto. Home, overlay e conteúdo externo não devem receber capacidades além das necessárias.
6. O conteúdo externo continuará sem a bridge privilegiada `window.fifotv`.
7. Não haverá reescrita geral, troca de Electron, linguagem, framework, stack ou modelo de views.
8. Defeitos, fronteiras de confiança e contratos serão estabilizados antes de qualquer modularização ampla.
9. Modularização somente será feita quando reduzir risco, duplicação ou acoplamento já demonstrado. Quantidade de linhas, isoladamente, não justifica extração.
10. Customizações de streaming continuarão isoladas por provider. Não será criada uma customização genérica para todos os serviços.
11. Invariantes conhecidos serão preservados: YouTube em `/tv`, Prime Video sem script específico enquanto não houver validação contrária, permissões negadas por padrão e popups externos bloqueados por padrão.
12. Hipóteses dependentes de Castlabs, DRM, hardware, timing, foco, z-order ou sites externos não serão registradas como fatos sem execução no ambiente correspondente.
13. Mudanças amplas de spoofing, Client Hints ou política de identidade não fazem parte desta limpeza sem baseline e validação por provider.
14. Esta fase trata exclusivamente da fundação Electron existente. Instalação, boot, ISO, updater, empacotamento, release e limpeza física do legado pertencem ao backlog futuro.
15. OpenCode permanece como ferramenta de desenvolvimento e manutenção, invisível e inativa no fluxo normal do produto. Seu mecanismo atual deve ser preservado e condicionado de forma simples e explícita ao ambiente de desenvolvimento, sem receber arquitetura de produção nesta fase.

# Como Usar Este Plano

Durante a execução original, este documento foi a fonte oficial da limpeza da fundação Electron. Hoje ele é somente um registro histórico; `docs/README.md` define as fontes vigentes.

## Cinco Sessões Principais

O processo planejado possui exatamente cinco sessões principais de desenvolvimento:

| Sessão | Responsabilidade exclusiva |
|---|---|
| Sessão 1 | Macroetapa 1 — Fechar Fronteiras Privilegiadas |
| Sessão 2 | Macroetapa 2 — Corrigir Funcionalidade, Dados e Contratos |
| Sessão 3 | Macroetapa 3 — Estabilizar Lifecycle, Foco e Recursos Assíncronos |
| Sessão 4 | Macroetapa 4 — Corrigir Seleção de Providers e Pipeline de Injeção |
| Sessão 5 | Macroetapa 5 — Consolidar Evidência e Preparar Promoção |

Cada macroetapa corresponde a uma única sessão principal. A sessão assume responsabilidade pela macroetapa inteira e pode continuar durante várias interações com o usuário. Implementação, testes, solicitação de validação manual, interpretação do feedback, correções, revisão e organização dos commits da macroetapa devem ocorrer na mesma sessão.

Uma sessão não deve iniciar a macroetapa seguinte. Não devem ser criadas subetapas formais como 1A, 1B ou 2A, nem novas sessões obrigatórias. A ordem já descrita em “Método de Implementação” organiza blocos internos progressivos dentro da sessão. Esses blocos não são novas fases, documentos ou sessões.

Uma macroetapa pode resultar em vários commits coerentes sem se transformar em várias sessões. Mudanças de natureza ou risco diferentes devem permanecer em commits separados quando isso melhorar revisão, validação e reversão.

## Regras de Execução

- Executar uma macroetapa por vez.
- Não avançar automaticamente para a macroetapa seguinte.
- Manter cada sessão principal dedicada à macroetapa inteira correspondente.
- Trabalhar progressivamente em blocos internos pequenos, coerentes e reversíveis, sem alterar todas as áreas de uma só vez.
- Não aproveitar a sessão para melhorias oportunistas.
- Não adicionar dependências sem necessidade técnica demonstrada e aprovação.
- Preservar canais IPC, payloads e comportamentos públicos, exceto quando a própria etapa corrige um contrato defeituoso.
- Não alterar provider, identidade, DRM ou integração externa sem necessidade confirmada.
- Registrar incertezas e pedir validação quando a decisão depender de hardware, comportamento visual ou serviço externo.
- Não declarar como validado por inspeção algo que dependa de execução.
- Não fazer commit sem aprovação explícita.
- Parar ao concluir a macroetapa e apresentar os resultados.

## Fluxo Interno Obrigatório de Cada Sessão

Cada uma das cinco sessões deve executar este ciclo completo:

1. Ler integralmente a macroetapa correspondente.
2. Ler os documentos e arquivos indicados.
3. Confirmar o estado do Git e registrar a baseline.
4. Organizar internamente a ordem dos blocos de trabalho.
5. Implementar o primeiro bloco coerente.
6. Executar as validações relacionadas ao bloco.
7. Corrigir regressões causadas pela implementação.
8. Revisar o diff parcial.
9. Continuar para o próximo bloco da mesma macroetapa.
10. Executar ao final a validação completa da macroetapa.
11. Solicitar validação manual do usuário quando necessária.
12. Aplicar correções decorrentes do feedback na mesma sessão.
13. Revisar o diff completo.
14. Organizar os commits aprovados.
15. Encerrar sem iniciar a macroetapa seguinte.

A ordem de blocos deve seguir “Método de Implementação” da macroetapa. Blocos são somente uma forma de organizar a execução e não devem receber numeração formal no plano.

## Controle de Progresso na Sessão

A sessão deve manter um checklist operacional, no próprio diálogo, para cada item obrigatório ou bloco em andamento. Não é necessário criar documento adicional.

Estados permitidos:

| Estado | Uso |
|---|---|
| Não iniciado | Trabalho ainda não começou |
| Em implementação | Alteração em andamento |
| Implementação concluída | Código pronto, ainda sem todas as validações |
| Validação automática aprovada | Checks e testes aplicáveis passaram |
| Validação manual solicitada | Evidência pedida ao usuário |
| Correção após feedback | Ajuste decorrente da validação do usuário |
| Aprovado | Implementação e validações obrigatórias concluídas |
| Pendente por ambiente | Depende de hardware, serviço ou runtime indisponível |
| Bloqueado | Não é seguro continuar sem decisão ou evidência adicional |

Ao final de cada interação relevante, a sessão deve informar brevemente:

- O que foi alterado.
- O que foi validado.
- O que permanece pendente.
- Qual é o próximo bloco interno.
- Qual decisão ou teste depende do usuário.

## Validação Progressiva

Validações manuais não precisam ficar acumuladas até o fim da macroetapa. Quando um bloco depender de Wi-Fi, Bluetooth, D-pad, air mouse, Castlabs, Electron em execução, foco, z-order, DRM, login, provider, comportamento visual, desempenho ou hardware real, a sessão deve solicitar o teste assim que ele for necessário para continuar com segurança.

Depois que o usuário devolver resultados, logs ou screenshots, a mesma sessão deve:

1. Interpretar a evidência.
2. Atualizar o estado dos itens afetados.
3. Corrigir a implementação quando necessário.
4. Repetir as validações aplicáveis.
5. Continuar o próximo bloco da mesma macroetapa.

Todo resultado deve ser classificado como análise estática, teste automatizado, teste manual aprovado, teste manual pendente ou hipótese não confirmada. Nenhum comportamento dependente de ambiente pode ser declarado aprovado apenas por leitura do código.

## Tratamento de Bloqueios

Se surgir um bloqueio real que torne inseguro continuar, a sessão deve parar antes de improvisar e:

- Explicar objetivamente o bloqueio.
- Apresentar a evidência disponível.
- Registrar os itens já concluídos e seus estados.
- Registrar as validações ainda pendentes.
- Sugerir a menor decisão ou evidência necessária para continuar.
- Não iniciar trabalho fora do escopo.
- Não avançar para a macroetapa seguinte.

Um bloqueio não cria automaticamente uma sexta sessão. A mesma sessão principal deve continuar depois que a informação, decisão ou validação necessária for fornecida.

## Estado das Macroetapas

| Macroetapa | Núcleo obrigatório para `main` | Dependências | Estado inicial |
|---|---:|---|---|
| 1. Fechar fronteiras privilegiadas | Sim | Nenhuma | Não iniciada |
| 2. Corrigir funcionalidade, dados e contratos | Sim | Macroetapa 1 | Não iniciada |
| 3. Estabilizar lifecycle, foco e recursos assíncronos | Sim | Macroetapas 1 e 2 | Não iniciada |
| 4. Corrigir seleção de providers e pipeline de injeção | Sim | Macroetapas 1 a 3 | Não iniciada |
| 5. Consolidar evidência e preparar promoção | Sim | Macroetapas 1 a 4 | Não iniciada |

Uma macroetapa possui quatro marcos de conclusão, além dos estados operacionais mantidos durante a sessão:

| Marco | Significado |
|---|---|
| Implementação concluída | Alterações do escopo obrigatório estão no working tree |
| Validação automática concluída | Comandos e testes disponíveis ou criados passaram |
| Validação manual pendente | A implementação existe, mas depende de usuário/ambiente |
| Validação final aprovada | Todas as validações obrigatórias foram aprovadas pelo usuário |

Somente o último marco permite considerar a macroetapa concluída.

# Macroetapa 1 — Fechar Fronteiras Privilegiadas

## Identificação

| Campo | Definição |
|---|---|
| Objetivo principal | Impedir que dados externos executem shell ou JavaScript privilegiado e restringir capacidades IPC à view correta |
| Justificativa | São os riscos estáticos mais graves e ampliam o impacto de todos os demais defeitos |
| Problemas resolvidos | Revisão 1, 2 e 14; crítica, conclusões confirmadas 1, 2 e 3 |
| Resultado esperado | SSID, senha, catálogo e Bluetooth são tratados como dados; home/overlay não navegam para origens externas; payload e sender são validados no main |

## Rastreabilidade e Ajustes

- Mantém integralmente os dois P0 confirmados: shell injection no Wi-Fi e XSS na homepage privilegiada.
- Mantém autorização e validação IPC como P1, executada depois de remover os sinks de XSS.
- Reduz a recomendação de um adaptador genérico de comandos: nesta etapa somente comandos que recebem dados dinâmicos precisam sair do shell.
- Adia CSP até que scripts e handlers inline incompatíveis tenham sido removidos. CSP não deve ser adicionada apenas para constar.
- Não presume que `contextIsolation: false` no streaming seja explorável; essa hipótese depende do runtime Castlabs e não é escopo desta correção.

## Classificação

### Obrigatórios para promoção à `main`

- Substituir `wifi:connect` por execução de programa com argumentos separados e sem shell.
- Tratar rede aberta sem obrigar argumento de senha.
- Remover interpolação de dados externos em HTML executável nos cards, Wi-Fi, Bluetooth, listas de apps/cache e toasts.
- Substituir handlers inline dinâmicos por listeners associados aos elementos.
- Bloquear navegação não local da `homeView` e `overlayView` sem impedir que `streamingView` abra URLs válidas.
- Autorizar IPC sensível pela view/frame emissor.
- Validar tipos e formato mínimo de catálogo, ID, URL, slug, MAC, booleanos, zoom e reorder no main.
- Garantir que payload inválido falhe antes de alterar slug, power blocker, view ou persistência.

### Opcionais ou adiáveis

- Adicionar CSP após todos os scripts e handlers incompatíveis terem sido removidos e a home ter sido testada.
- Evitar exposição da senha em `ps` por stdin ou D-Bus, caso isso possa ser feito sem ampliar a mudança.
- Criar um helper reutilizável de validação somente se três ou mais handlers precisarem da mesma regra concreta.
- Padronizar todos os envelopes de resposta IPC. Isso não bloqueia esta etapa.

## Escopo

### Faz parte

- Fronteira renderer confiável → main.
- Construção segura do DOM para dados externos.
- Execução segura do `nmcli` no fluxo de conexão.
- Validação mínima no ponto privilegiado.
- Proteção de navegação da home e overlay.

### Não faz parte

- Migração completa do Wi-Fi para D-Bus.
- Refatoração geral de todos os comandos externos.
- CSP antes da remoção dos inline handlers.
- Alteração de `contextIsolation` da streaming view.
- Mudança de identidade, DRM ou customização de provider.
- Reorganização ampla de `main.js` ou `frontend/script.js`.

### Arquivos provavelmente envolvidos

- `electron/main.js`
- `electron/preload.js`
- `electron/preload-overlay.js`
- `frontend/index.html`
- `frontend/script.js`
- `frontend/popup-manager.js`, apenas se necessário para remover handler dinâmico

### Contratos públicos a preservar

- Nomes dos canais IPC existentes.
- Assinaturas de `window.fifotv.*`, salvo rejeição explícita de payload inválido.
- Shape de sucesso de Wi-Fi usado pela UI.
- CRUD, ordem visual, clique e navegação D-pad dos aplicativos.
- Abertura de URL externa exclusivamente na `streamingView`.

### Comportamentos obrigatórios a preservar

- Nomes Unicode e caracteres válidos em SSID, senha, app e Bluetooth.
- Fallback de ícones.
- Redes protegidas e abertas.
- Air mouse e D-pad nos itens reconstruídos.
- Home e overlay locais com `contextIsolation: true` e `nodeIntegration: false`.
- Conteúdo externo sem `window.fifotv`.

### Dependências

Nenhuma macroetapa anterior. Esta etapa deve ser concluída antes das demais.

### Riscos conhecidos

- Alterar a estrutura do DOM pode quebrar seletores de foco.
- Autorização por `webContents.id` precisa acompanhar recriação de views.
- Validação excessiva de URL pode bloquear URLs sem protocolo atualmente aceitas.
- SSIDs e senhas válidos podem conter caracteres incomuns.

## Preparação da Sessão

### Documentos a ler

- `AGENTS.md`
- Esta macroetapa em `docs/FOUNDATION_REFACTOR_PLAN.md`
- Problemas 1, 2 e 14 de `docs/FOUNDATION_REVIEW.md`
- Seções “Fronteiras privilegiadas” e “Etapas 1 e 2” de `docs/FOUNDATION_REVIEW_CRITIQUE.md`

### Arquivos e fluxos a inspecionar

- `run()`, `wifi:connect` e todos os `ipcMain.handle/on` em `electron/main.js`.
- Bridges em `electron/preload.js` e `electron/preload-overlay.js`.
- `renderGrid`, `loadWifiSection`, `loadBluetoothSection`, `renderStreamingsList`, `renderCacheList` e `showToast` em `frontend/script.js`.
- Criação de `homeView`, `overlayView` e `streamingView`.

### Comandos de inspeção recomendados

```bash
git status --short --branch
git diff -- electron/main.js electron/preload.js electron/preload-overlay.js frontend/index.html frontend/script.js
rg -n "innerHTML|onclick=|wifi:connect|ipcMain\.(handle|on)|will-navigate" electron frontend
rg -n "exec\(|spawn\(|execFile\(" electron/main.js
```

### Estado inicial esperado do Git

- Branch da fundação identificada explicitamente.
- Working tree limpo ou somente com alterações já conhecidas e não conflitantes.
- Nenhuma mudança pré-existente nos arquivos-alvo deve ser descartada.
- Se houver mudança conflitante, parar e pedir orientação antes de editar.

### Baseline antes da implementação

- Registrar a lista atual de canais e qual view os consome.
- Registrar o DOM e o foco de cards, redes e dispositivos.
- Confirmar o shape atual das respostas de Wi-Fi e CRUD.
- Registrar que URLs sem protocolo são aceitas hoje.
- Se houver ambiente Electron disponível, capturar screenshots da home, Wi-Fi, Bluetooth e lista de apps.

## Método de Implementação

Ordem recomendada:

1. Corrigir somente `wifi:connect` e seu contrato de rede aberta.
2. Converter sinks de catálogo e cards para DOM seguro.
3. Converter sinks de Wi-Fi, Bluetooth, cache e toasts.
4. Bloquear navegação externa da home e overlay.
5. Adicionar autorização por view/frame.
6. Adicionar validação mínima de payload antes de efeitos colaterais.
7. Executar validações e parar.

A sessão deve manter as mudanças separáveis. Não deve aproveitar a conversão de DOM para redesenhar componentes, alterar CSS ou reorganizar toda a homepage.

## Metodologia de Validação

### Validação estática

- Procurar interpolação restante de `name`, `url`, `ssid`, nome Bluetooth e mensagens em HTML executável.
- Confirmar ausência de string shell construída com SSID ou senha.
- Confirmar que handlers sensíveis verificam sender/frame antes do efeito.
- Confirmar que URL e catálogo são validados antes de alterar estado global.
- Confirmar que home e overlay rejeitam navegação remota e mantêm `loadFile` local.
- Revisar se todos os listeners dinâmicos continuam associados após re-render.

### Validação automatizada atualmente disponível

Não existe `npm test`, lint ou suíte versionada no repositório atual. Executar somente verificações existentes e reais:

```bash
node --check electron/main.js
node --check electron/preload.js
node --check electron/preload-overlay.js
node --check frontend/script.js
git diff --check
```

### Validação automatizada a criar

- Teste pequeno com `node:test` para validadores puros, caso sejam extraídos sem dependência nova.
- Teste de contrato do comando Wi-Fi com child process mockado ou função de argumentos pura.
- Fixture local de catálogo com strings hostis, se puder ser exercitada sem introduzir framework DOM.
- Teste de autorização IPC somente se for possível criar webContents de teste sem tornar a etapa maior que a correção.

Não adicionar `jsdom` ou framework de testes apenas para esta etapa sem aprovação.

### Validação manual pelo usuário

1. Abrir a home e adicionar um app com nome `TV "Sala" <teste>`.
2. Confirmar que o texto aparece literalmente, o card mantém o layout e nenhum elemento extra é criado.
3. Abrir Settings → Wi-Fi e confirmar scan, seleção, cancelamento e conexão de rede protegida.
4. Testar uma rede aberta e confirmar que não é solicitada senha desnecessária.
5. Em ponto de acesso controlado, testar SSID com espaços, aspas, Unicode e metacaracteres.
6. Confirmar que nenhum arquivo marcador ou comando secundário é executado no teste de metacaracteres.
7. Abrir Settings → Bluetooth e confirmar nomes, botões e foco.
8. Abrir e fechar um streaming por URL com e sem protocolo.
9. Informar à sessão: screenshots, SSID usado, resultado da conexão, erro exibido e trechos relevantes de `/var/log/fifotv/main.log` ou `journalctl -u fifotv`.

### Validação dependente de ambiente

- Conexão Wi-Fi real e comportamento do `nmcli` no Debian.
- SSID aberto, oculto ou com caracteres especiais.
- Renderização e foco no Electron/Castlabs.
- Nomes de dispositivos Bluetooth reais.
- Navegação por D-pad e air mouse após reconstrução do DOM.
- Autorização por `webContents` em runtime.

Esses itens não podem ser declarados como aprovados apenas por análise estática.

## Critério de Conclusão

### Implementação concluída

- Todos os itens obrigatórios foram implementados sem mudança fora do escopo.
- Não existe entrada externa interpolada em shell no fluxo Wi-Fi.
- Os sinks externos identificados não executam HTML.
- IPC sensível possui autorização e validação mínima.

### Validações automáticas concluídas

- Todos os `node --check` aplicáveis passaram.
- `git diff --check` passou.
- Testes específicos criados passaram.

### Validações manuais pendentes

Se Wi-Fi, Electron, D-pad ou Bluetooth não foram executados no ambiente real, a etapa permanece pendente, mesmo com implementação concluída.

### Validação final aprovada

- Usuário aprovou o checklist manual obrigatório.
- Nenhuma regressão crítica de grid, settings, Wi-Fi, Bluetooth ou abertura de streaming foi observada.
- Logs não mostram rejeições IPC inesperadas no fluxo normal.

## Granularidade de Commits Recomendada

1. `fix(security): execute wifi connection without shell`
2. `fix(security): render external home data as text`
3. `fix(security): restrict local views and privileged IPC`

Não misturar os três objetivos em um commit se puderem ser validados separadamente.

## Encerramento da Sessão

A sessão deve:

- Resumir as alterações.
- Listar todos os arquivos modificados.
- Marcar quais itens obrigatórios foram concluídos.
- Informar comandos e testes executados.
- Apresentar resultados e falhas.
- Listar validações manuais pendentes.
- Registrar hipóteses e riscos restantes.
- Revisar `git diff` e confirmar ausência de mudança fora do escopo.
- Não fazer commit sem aprovação.
- Sugerir mensagem ou sequência de commits.
- Parar sem iniciar a Macroetapa 2.

### Texto para iniciar a sessão futura

> Assuma a Sessão 1 e a Macroetapa 1 completas. Leia integralmente a macroetapa, os documentos e arquivos indicados; confirme o estado do Git e registre a baseline. Planeje internamente os blocos, trabalhe progressivamente e valide cada bloco antes de seguir. Solicite meus testes de Wi-Fi, Electron, D-pad ou hardware no momento necessário, interprete meu feedback e corrija na mesma sessão. Mantenha o estado de concluídos, pendentes e bloqueados, preserve contratos não defeituosos, separe commits coerentes, não faça commit sem aprovação explícita e não inicie a Macroetapa 2.

# Macroetapa 2 — Corrigir Funcionalidade, Dados e Contratos

## Identificação

| Campo | Definição |
|---|---|
| Objetivo principal | Corrigir comportamentos demonstravelmente errados e remover promessas de UI sem implementação |
| Justificativa | A fundação não pode ser promovida enquanto o card visual abre outro app, dados inválidos viram grade vazia ou a UI confirma ações inexistentes |
| Problemas resolvidos | Revisão 3, 8 parcial, 11 e 15; crítica, conclusões 4, 8, 11 e 14 |
| Resultado esperado | Identidade estável dos cards, dados defensivos, métricas corretas e ações visíveis correspondentes a contratos reais |

## Rastreabilidade e Ajustes

- Mantém cards por ID como correção P1 obrigatória.
- Mantém RAM, parsing Wi-Fi, volume e zoom como defeitos locais, sem criar uma camada genérica de serviços.
- Reduz persistência: não migra para `userData`; apenas impede fallback silencioso, valida formato básico e reduz divergência de defaults.
- Remove ou desabilita cache falso em vez de implementar limpeza perigosa.
- Remove Settings do overlay até existir fluxo real, conforme a crítica.
- Mantém updater fora do escopo e classifica OpenCode como ferramenta exclusiva de desenvolvimento. A UI normal não deve anunciá-lo, mas o mecanismo atual de desenvolvimento não deve ser apagado ou interrompido sem baseline, teste e aprovação.
- APIs mortas P3 são opcionais se não causarem comportamento visível ou risco.

## Classificação

### Obrigatórios para promoção à `main`

- Ativar cards por `streaming.id`, nunca por posição reinterpretada.
- Re-renderizar recentes ou sincronizar identidade/foco ao retornar à home.
- Preservar foco por identidade após add, remove e reorder.
- Corrigir unidade de RAM e proteção contra divisão por zero.
- Corrigir parsing de saída `nmcli -t` para escapes e delimitadores.
- Tornar volume e zoom limitados pelo main e atualizar UI a partir do resultado real.
- Remover ou marcar indisponível “Limpar cache”; não emitir sucesso falso.
- Remover “Configurações” do overlay até existir fluxo real.
- Retirar da UI normal de produto as ações de updater e acesso remoto enquanto essas frentes estiverem fora de escopo.
- Manter OpenCode invisível e inativo no fluxo normal do usuário.
- Preservar o mecanismo atual de OpenCode usado para desenvolvimento e manutenção.
- Condicionar uso e eventual autoativação do OpenCode a uma condição explicitamente de desenvolvimento, usando preferencialmente modo, flag, variável ou configuração simples já existente.
- Registrar baseline e obter aprovação antes de qualquer alteração que possa interromper o acesso de desenvolvimento atual.
- Fazer `streamings:get` distinguir catálogo válido de arquivo ausente/inválido.
- Validar formato básico antes de add/reorder/write e impedir IDs duplicados.
- Eliminar divergência entre catálogo ativo e fallback usado pela home.

### Opcionais ou adiáveis

- Remover subscriptions sem produtor: `volume:changed`, `bt:status-changed` e `hide-menu`.
- Padronizar envelopes de erro de todos os handlers.
- Escrita atômica por temporário e rename, se puder ser feita sem iniciar migração de dados.
- Unificar formatação visual de volume e métricas entre home e overlay.
- Simplificar o controle de desenvolvimento do OpenCode somente se isso não apagar o mecanismo atual nem criar um sistema complexo de configuração.

## Escopo

### Faz parte

- Identidade estável de cards e itens reordenáveis.
- Catálogo defensivo no caminho atual do checkout.
- Correções pequenas de RAM, Wi-Fi, volume e zoom.
- Remoção de ações falsas ou fora de escopo da UI.
- Compatibilidade do catálogo existente.

### Não faz parte

- Migração para `app.getPath('userData')`.
- Schema versionado, migração ou rollback de dados.
- Implementação real de limpeza de cache.
- Correção do updater.
- Endurecimento de OpenCode como produto.
- Autenticação, TLS, exposição pública, supervisor ou sistema completo de gerenciamento para OpenCode.
- Redesign de Settings.
- Extração geral de serviços.

### Arquivos provavelmente envolvidos

- `frontend/script.js`
- `electron/main.js`
- `electron/preload.js`
- `electron/preload-overlay.js`
- `electron/views/overlay.js`
- `backend/streamings.json`, somente se for necessário alinhar o default ativo
- Configuração existente de desenvolvimento, somente se for usada para condicionar OpenCode sem criar novo sistema complexo

### Contratos públicos a preservar

- IDs existentes do catálogo e contadores em `localStorage`.
- Ordem persistida e canais CRUD.
- Passos de volume já percebidos pelo usuário.
- `window.fifotv.getVolume()` e comandos de zoom/volume, com extensão apenas do resultado se necessária.
- Shape do catálogo `{streamings: [...]}` em sucesso.

### Comportamentos obrigatórios a preservar

- “Mais Usados” e grade principal podem mostrar o mesmo app, se esse é o comportamento atual.
- Botão Adicionar permanece acessível.
- Apps existentes, URLs e slugs não são regravados desnecessariamente.
- Volume continua responsivo.
- Nenhum cache, cookie ou login é apagado.
- Acesso atual de desenvolvimento ao OpenCode é preservado e testado antes de qualquer alteração no seu gatilho.
- OpenCode permanece fora da UI e do fluxo normal do usuário.

### Dependências

Macroetapa 1 aprovada. As novas renderizações devem seguir o padrão seguro já estabelecido.

### Riscos conhecidos

- Re-render de recentes pode deslocar foco.
- Mudança de resposta de volume pode quebrar home ou overlay se aplicada parcialmente.
- Um fallback incorreto pode sobrescrever catálogo personalizado.
- Remover itens de Settings altera a geometria D-pad.
- Condicionar autoativação remota pode afetar a rotina local de desenvolvimento; registrar o comportamento anterior e não prosseguir sem teste e aprovação.

## Preparação da Sessão

### Documentos a ler

- `AGENTS.md`
- Esta macroetapa
- Problemas 3, 8, 11 e 15 de `docs/FOUNDATION_REVIEW.md`
- Seções “Funcionalidade e estado”, “Persistência” e “Etapa 3” da crítica

### Arquivos e fluxos a inspecionar

- `getMostUsed`, `renderGrid`, `handleGridNav`, `activateCard` e retorno `nav:go-home`.
- `moveStreaming`, `removeStreaming` e `loadStreamings`.
- `readStreamings`, `writeStreamings` e handlers CRUD.
- `system:stats`, Wi-Fi scan/status, volume e zoom.
- Settings de cache, update e remote.
- Menu do overlay e seus contratos.

### Comandos de inspeção recomendados

```bash
git status --short --branch
rg -n "getMostUsed|renderGrid|activateCard|moveStreaming|readStreamings|writeStreamings" frontend electron
rg -n "clearSiteCache|updateApp|remote|settings|volume:changed|bt:status-changed|hide-menu" frontend electron
rg -n "free -m|nmcli|volume:|overlay:zoom" electron/main.js frontend/script.js electron/views/overlay.js
```

### Estado inicial esperado do Git

- Macroetapa 1 aprovada e registrada.
- Working tree sem alterações conflitantes.
- Catálogo real preservado e copiado para backup fora de qualquer teste destrutivo.

### Baseline antes da implementação

- Registrar ordem atual do catálogo e `localStorage` de mais usados.
- Reproduzir a sequência que abre app errado após alterar recentes.
- Registrar foco antes/depois de add, remove e reorder.
- Capturar saída de `free -m`, `wpctl get-volume` e valores exibidos.
- Registrar itens visíveis em Settings e menu do overlay.
- Registrar como o OpenCode é iniciado, acessado e encerrado no desenvolvimento atual, incluindo configuração, gatilho e expectativa de autoativação.
- Confirmar com o usuário qual condição simples de desenvolvimento pode ser usada sem interromper seu acesso.

## Método de Implementação

Ordem recomendada:

1. Corrigir identidade de cards e restauração de foco.
2. Corrigir leitura e validação defensiva do catálogo.
3. Corrigir RAM e parsing Wi-Fi.
4. Tornar volume e zoom autoritativos no main.
5. Remover ações falsas e recursos fora de escopo da UI normal, preservando OpenCode sob condição simples e explícita de desenvolvimento.
6. Limpar APIs mortas apenas se isso permanecer pequeno e isolado.
7. Validar e parar.

Não misturar correção de catálogo com migração de persistência. Não implementar cache, updater ou arquitetura de produção para OpenCode nesta etapa. Não apagar o mecanismo de desenvolvimento existente.

## Metodologia de Validação

### Validação estática

- Confirmar que ativação usa ID estável.
- Confirmar que geometria usa posição apenas para foco.
- Verificar tratamento explícito de catálogo ausente, JSON inválido e shape inválido.
- Confirmar que writes rejeitam documento inválido antes de tocar o arquivo.
- Verificar unidade e denominadores de métricas.
- Confirmar limites de volume e zoom no main.
- Confirmar que nenhuma ação visível anuncia sucesso sem operação real.
- Confirmar que updater e OpenCode não são expostos como produto.
- Confirmar que OpenCode só pode ser ativado sob condição explícita de desenvolvimento e que seu mecanismo atual permanece disponível.

### Validação automatizada atualmente disponível

```bash
node --check electron/main.js
node --check electron/preload.js
node --check electron/preload-overlay.js
node --check frontend/script.js
node --check electron/views/overlay.js
git diff --check
```

Não existe suíte automatizada versionada para esses fluxos.

### Validação automatizada a criar

- Teste puro para resolver card por ID com 0, 1 e 4 recentes.
- Teste puro para reorder mantendo identidade.
- Testes de parser `nmcli` com `:`, escape, Unicode e campos vazios.
- Testes de validação do catálogo com JSON ausente, inválido, duplicado e válido.
- Teste de clamp de volume/zoom.

Preferir `node:test` sem dependência adicional e extrair somente funções realmente testadas.

### Validação manual pelo usuário

1. Limpar ou registrar os contadores de uso atuais.
2. Abrir um app, voltar e selecionar visualmente outro app.
3. Repetir até alterar a ordem dos quatro mais usados.
4. Confirmar que cada card sempre abre exatamente o app exibido.
5. Reordenar o mesmo app várias vezes por D-pad e confirmar que o mesmo item continua selecionado.
6. Adicionar e remover um app e confirmar foco previsível.
7. Comparar monitor com `free -m` e `wpctl get-volume`.
8. Pressionar volume e zoom repetidamente até os limites e confirmar que UI e estado real não divergem.
9. Confirmar que cache, update, remote e Settings do overlay não prometem funcionalidades fora de escopo ao usuário comum.
10. Ativar OpenCode pela condição de desenvolvimento aprovada e confirmar que o acesso atual continua funcional.
11. Desativar a condição e confirmar que OpenCode fica invisível e inativo no fluxo normal.
12. Informar à sessão: sequência de teclas, app esperado/aberto, valores de RAM/volume, condição de desenvolvimento testada, screenshots e logs de erro.

### Validação dependente de ambiente

- Retorno real da `homeView` após streaming.
- Persistência do catálogo no checkout do aparelho.
- Saída da versão instalada de `nmcli`, `free` e `wpctl`.
- Volume e zoom reais no Electron.
- D-pad após remoção de itens da UI.
- Rotina local de OpenCode usada para desenvolvimento e manutenção.

## Critério de Conclusão

### Implementação concluída

- Cards, catálogo, RAM, Wi-Fi, volume/zoom e ações falsas obrigatórias foram tratados.
- Updater não foi redesenhado e OpenCode permaneceu uma ferramenta de desenvolvimento sob condição simples e explícita.
- O acesso de desenvolvimento existente foi preservado ou qualquer mudança foi aprovada após teste.
- Catálogo existente não foi perdido nem reidentificado.

### Validações automáticas concluídas

- Syntax checks e `git diff --check` passaram.
- Testes puros criados passaram.

### Validações manuais pendentes

Sem teste de retorno da home, foco, volume e catálogo real, a etapa permanece pendente.

### Validação final aprovada

- Ranking de recentes e CRUD foram aprovados pelo usuário.
- Métricas e controles correspondem ao estado real.
- Nenhuma ação visível confirma operação inexistente.
- Nenhum dado existente foi perdido.
- OpenCode não aparece no fluxo normal e continua disponível no modo de desenvolvimento aprovado.

## Granularidade de Commits Recomendada

1. `fix(home): resolve streaming cards by stable id`
2. `fix(data): validate catalog and preserve fallback behavior`
3. `fix(system-ui): synchronize metrics volume and zoom`
4. `fix(ui): remove unavailable product actions`

## Encerramento da Sessão

- Resumir alterações e arquivos.
- Informar quais contratos mudaram e por quê.
- Mostrar resultados de casos de recentes e catálogo.
- Listar validações manuais ainda necessárias.
- Confirmar que updater, OpenCode como produto e persistência completa ficaram fora do escopo.
- Informar como a condição de desenvolvimento do OpenCode foi validada sem criar configuração complexa.
- Revisar o diff e sugerir commits.
- Não fazer commit sem aprovação.
- Parar sem iniciar a Macroetapa 3.

### Texto para iniciar a sessão futura

> Assuma a Sessão 2 e a Macroetapa 2 completas. Leia integralmente a macroetapa, os documentos e arquivos indicados; confirme o Git e registre a baseline, inclusive do acesso atual ao OpenCode. Planeje internamente os blocos, trabalhe progressivamente e valide cada bloco antes de seguir. Solicite meus testes quando necessário, interprete meu feedback e corrija na mesma sessão. Preserve OpenCode como ferramenta condicionada ao desenvolvimento, invisível no fluxo normal, sem transformá-lo em produto. Mantenha o estado de concluídos, pendentes e bloqueados, separe commits coerentes, não faça commit sem aprovação explícita e não inicie a Macroetapa 3.

# Macroetapa 3 — Estabilizar Lifecycle, Foco e Recursos Assíncronos

## Identificação

| Campo | Definição |
|---|---|
| Objetivo principal | Eliminar views, timers, Promises e estados de foco que sobrevivem ou mudam de forma incoerente |
| Justificativa | Monitor invisível, polling órfão e callbacks sobre view obsoleta são falhas demonstráveis de lifecycle |
| Problemas resolvidos | Revisão 4, 7 parcial, 9, 10 e 12; crítica, conclusões 5, 6, 7 e 12; lacunas adicionais de `dom-ready` e clique do monitor |
| Resultado esperado | Menu, toast, monitor, popups e recursos assíncronos possuem fechamento determinístico e não atuam sobre estado substituído |

## Rastreabilidade e Ajustes

- Corrige primeiro o monitor e os cleanups locais, como recomendado pela crítica.
- Não exige uma máquina de estados global de overlay nem coordenador modal completo antes de provar necessidade.
- Trata `setIgnoreMouseEvents()` como comportamento dependente do fork Castlabs, não como falha runtime já confirmada.
- Mantém normalização ampla de teclas como opcional após caracterização no hardware.
- Inclui a lacuna destacada pela crítica: callbacks `dom-ready` não podem usar cegamente a variável global mutável `streamingView`.
- Inclui Bluetooth por ser lifecycle de recurso assíncrono ativo, mas exige validação BlueZ real.

## Classificação

### Obrigatórios para promoção à `main`

- Corrigir transição menu → monitor sem remover o overlay.
- Impedir que o mesmo clique que abre o monitor também o feche.
- Limpar intervalo do monitor em todas as rotas de fechamento.
- Fazer `closeAllPopups()` usar fechamentos semânticos e idempotentes.
- Resolver a Promise do modal Wi-Fi exatamente uma vez em cancelar, Escape, BrowserBack ou fechamento global.
- Cancelar timers antigos de `Popup.hide()` ao reabrir e tornar show/hide idempotentes.
- Capturar a view ou geração local em `dom-ready`, loading timer e callbacks atrasados.
- Impedir callback de injeção/foco em view destruída ou substituída.
- Definir recuperação mínima para `did-fail-load` do main frame e renderer destruído, sem criar loop de reload.
- Garantir `StopDiscovery()` em `finally` no Bluetooth.
- Restaurar `Pairable`/`Discoverable` somente após registrar baseline e validar a ordem com o usuário.
- Invalidar cache de adapter/agent em falha D-Bus recuperável.

### Opcionais ou adiáveis

- Criar modo único `hidden/toast/menu/monitor` se as correções locais ainda deixarem estados duplicados.
- Criar coordenador modal geral da home se os fechamentos locais continuarem divergentes.
- Normalizar todas as teclas em ações semânticas.
- Serializar todas as operações Bluetooth; fazer se concorrência for reproduzida ou a mudança permanecer pequena.
- Implementar readiness visual genérica. O loading deve conservar timeout de segurança.

## Escopo

### Faz parte

- Lifecycle de overlay, monitor, modal Wi-Fi e `Popup`.
- Foco e z-order estritamente necessários aos fluxos corrigidos.
- Timers e callbacks associados às views.
- Recuperação mínima de falha da view.
- Cleanup de discovery Bluetooth.
- Caracterização de teclas antes de consolidação.

### Não faz parte

- Redesign visual de overlays e modais.
- Máquina de estados transversal obrigatória.
- Refatoração completa de input.
- Alteração de provider, spoofing ou DRM.
- Refatoração geral do serviço Bluetooth.
- Revisão de systemd, PipeWire ou Xorg.

### Arquivos provavelmente envolvidos

- `electron/main.js`
- `electron/preload-overlay.js`
- `electron/views/overlay.js`
- `frontend/script.js`
- `frontend/popup-manager.js`
- `scripts/keytest.js`, apenas para diagnóstico, sem mudar sua finalidade salvo necessidade

### Contratos públicos a preservar

- Canais atuais de menu, toast, foco, reload e home.
- Ordem composicional: home, streaming e overlay.
- `nav:go-home` e destruição postergada do renderer chamador.
- API Bluetooth e shapes usados pela UI.
- D-pad nativo do streaming quando o overlay está fechado.

### Comportamentos obrigatórios a preservar

- Streaming nunca é removido para mostrar overlay.
- Fechar menu/monitor devolve foco ao streaming.
- Toast de volume não rouba teclado.
- BrowserBack especial do YouTube permanece.
- Home continua preservada em memória.
- Pareamento `NoInputNoOutput`, trust e conexão Bluetooth permanecem.

### Dependências

Macroetapas 1 e 2 aprovadas. Sinks DOM, payloads e contratos funcionais já devem estar estabilizados.

### Riscos conhecidos

- Z-order e foco dependem do Electron/Castlabs real.
- Alterar captura de click pode afetar air mouse.
- Recuperação automática mal limitada pode criar loop.
- Restaurar flags Bluetooth cedo demais pode interromper pareamento.
- Controles físicos podem emitir `app-command`, DOM key ou global shortcut diferentes.

## Preparação da Sessão

### Documentos a ler

- `AGENTS.md`
- Esta macroetapa
- Problemas 4, 7, 9, 10 e 12 da revisão
- Seções “Funcionalidade e estado”, “Overlay e mouse”, “Itens que dependem de validação prática” e “Etapa 4” da crítica
- `docs/BUGS.md:193-206` para preservar a correção de compositor

### Arquivos e fluxos a inspecionar

- `showMenu`, `hideMenu`, `showMonitorPopup`, `hideMonitorPopup` e listeners de click no overlay.
- Handlers `overlay:*`, `destroyStreamingViews`, `nav:go-home`, `dom-ready` e loading timer no main.
- `closeAllPopups`, monitor, modal Wi-Fi e `Popup` na home.
- `bt:scan`, adapter cache e tratamento de falhas D-Bus.
- Caminhos de input em main, home e overlay.

### Comandos de inspeção recomendados

```bash
git status --short --branch
rg -n "showMonitorPopup|hideMonitorPopup|showMenu|hideMenu|toastVisible|overlayMenuVisible" electron frontend
rg -n "setTimeout|setInterval|clearTimeout|clearInterval|dom-ready|did-fail-load|render-process-gone" electron/main.js electron/views/overlay.js frontend/script.js frontend/popup-manager.js
rg -n "StartDiscovery|StopDiscovery|Pairable|Discoverable|btAdapter|btAgentRegistered" electron/main.js
rg -n "before-input-event|app-command|globalShortcut|keydown|BrowserBack|ContextMenu" electron frontend scripts/keytest.js
```

### Estado inicial esperado do Git

- Macroetapas 1 e 2 aprovadas.
- Nenhuma alteração pendente de UI ou IPC nos mesmos fluxos.
- Logs disponíveis quando a validação no aparelho começar.

### Baseline antes da implementação

- Gravar vídeo ou screenshots de menu → monitor → fechar.
- Registrar se o clique do item fecha o monitor imediatamente.
- Registrar foco após menu, toast e monitor.
- Abrir/fechar monitor da home repetidamente e observar polling.
- Abrir modal Wi-Fi e fechar por todas as rotas.
- Executar `node scripts/keytest.js` no ambiente gráfico, se disponível, e registrar eventos físicos.
- Registrar `Pairable`, `Discoverable` e discovery antes/depois de scan Bluetooth.
- Reproduzir retorno rápido home → streaming → home → outro streaming.

## Método de Implementação

Ordem recomendada:

1. Corrigir monitor do overlay e propagação de click.
2. Corrigir cleanups de home, Promise Wi-Fi e timers de `Popup`.
3. Proteger callbacks e timers por referência/generation da view.
4. Adicionar recuperação mínima de falha de view.
5. Corrigir cleanup Bluetooth com baseline validado.
6. Caracterizar teclas; corrigir apenas divergências aprovadas.
7. Avaliar modo único/coordenador somente se ainda houver estado impossível reproduzido.
8. Validar e parar.

Não combinar correção visual do overlay com provider ou identidade. Não criar abstração geral antes dos fluxos locais passarem.

## Metodologia de Validação

### Validação estática

- Toda criação de intervalo deve ter cleanup em todas as saídas.
- Toda Promise modal deve resolver no máximo uma vez e em todas as saídas.
- Timers devem capturar a view correspondente e verificar destruição/generation.
- `dom-ready` não deve operar sobre variável global substituída.
- Recovery não deve recarregar indefinidamente.
- `StopDiscovery()` deve estar garantido por `finally`.
- Verificar se qualquer dependência de `setIgnoreMouseEvents()` possui fallback coerente.

### Validação automatizada atualmente disponível

```bash
node --check electron/main.js
node --check electron/preload-overlay.js
node --check electron/views/overlay.js
node --check frontend/script.js
node --check frontend/popup-manager.js
git diff --check
```

`node scripts/keytest.js` existe, mas é diagnóstico interativo dependente de Electron/display, não teste automatizado com assertions.

### Validação automatizada a criar

- Teste com timers falsos ou controlados para `Popup.show/hide`.
- Teste de resolução única do modal Wi-Fi se a lógica puder ser isolada sem framework novo.
- Teste de generation token/view stale como função pura ou mock pequeno.
- Teste de cleanup Bluetooth com interfaces D-Bus mockadas somente se a extração for pequena.

### Validação manual pelo usuário

1. Abrir um streaming e abrir o menu por ContextMenu e air mouse.
2. Selecionar Monitor e confirmar que permanece visível, focado e atualizando.
3. Fechar por Escape, BrowserBack e clique externo.
4. Confirmar que streaming volta a receber D-pad e mouse sem flash.
5. Alterar volume repetidamente com menu fechado e aberto; confirmar toast e foco.
6. Abrir/fechar monitor da home dez vezes e confirmar ausência de polling duplicado.
7. Abrir modal Wi-Fi e cancelar por botão, Escape, BrowserBack e fechamento global.
8. Fazer sequência rápida abrir streaming → home → outro streaming e observar erro, foco e loading.
9. Executar scan Bluetooth, conectar quando possível e verificar flags após sucesso e falha.
10. Fornecer eventos capturados por `scripts/keytest.js`, vídeo do z-order e logs de renderer/main.

### Validação dependente de ambiente

- API efetiva de mouse no fork Castlabs.
- Foco e z-order reais.
- D-pad, air mouse e media keys físicos.
- Timing de views e compositor no Celeron.
- Renderer crash e erro de carregamento.
- BlueZ, adapter real, pareamento e restart de `bluetoothd`.

Nenhum desses itens pode ser aprovado apenas com mocks.

## Critério de Conclusão

### Implementação concluída

- Monitor, popups, view callbacks e cleanup Bluetooth obrigatório foram corrigidos.
- Não há intervalo ou Promise órfã nos fluxos tratados.
- Streaming permanece no compositor.

### Validações automáticas concluídas

- Syntax checks, diff check e testes locais passaram.

### Validações manuais pendentes

Sem validação de z-order/foco no Electron e Bluetooth no ambiente aplicável, a etapa permanece pendente.

### Validação final aprovada

- Usuário aprovou menu, monitor, toast, popups, retorno rápido e Bluetooth obrigatório.
- Não há flash, painel invisível, input preso ou callback em view errada nos cenários testados.

## Granularidade de Commits Recomendada

1. `fix(overlay): preserve monitor lifecycle and focus`
2. `fix(home): close modals and timers deterministically`
3. `fix(navigation): ignore stale streaming view callbacks`
4. `fix(bluetooth): guarantee discovery cleanup`

## Encerramento da Sessão

- Listar fluxos de lifecycle alterados.
- Informar timers, Promises e listeners adicionados/removidos.
- Anexar resultados do keytest e validação visual disponível.
- Separar claramente validação estática de hardware pendente.
- Confirmar que providers e identidade não foram alterados.
- Revisar diff, sugerir commits e parar.

### Texto para iniciar a sessão futura

> Assuma a Sessão 3 e a Macroetapa 3 completas. Leia integralmente a macroetapa, os documentos e arquivos indicados; confirme o Git e registre a baseline de lifecycle, foco, z-order, input e Bluetooth. Planeje internamente os blocos, trabalhe progressivamente e valide cada bloco antes de seguir. Solicite meus testes de Electron, D-pad, air mouse, foco, z-order, timing ou hardware quando necessários, interprete o feedback e corrija na mesma sessão. Mantenha concluídos, pendentes e bloqueados, preserve o streaming no compositor, não altere providers/identidade, separe commits coerentes, não faça commit sem aprovação explícita e não inicie a Macroetapa 4.

# Macroetapa 4 — Corrigir Seleção de Providers e Pipeline de Injeção

## Identificação

| Campo | Definição |
|---|---|
| Objetivo principal | Eliminar divergências comprovadas de slug/hostname e tornar a injeção observável sem alterar identidade não validada |
| Justificativa | Disney+/Max usam aliases incompatíveis e matching por substring pode selecionar regras indevidas; o pipeline apaga falhas e usa efeitos de sessão compartilhada |
| Problemas resolvidos | Revisão 5 e 7; revisão 6 apenas caracterizada; crítica, conclusões 9 e 10 e lacunas de sessão/Client Hints |
| Resultado esperado | Provider correto é selecionado por hostname e alias mínimo; injeções dependentes têm ordem explícita e logs; identidade permanece inalterada até validação específica |

## Rastreabilidade e Ajustes

- Reduz o “registro canônico completo” da revisão para uma tabela mínima de aliases e hosts, somente se eliminar duplicação real.
- Corrige `disneyplus`/`hbomax` versus `disney`/`max` e matching por `hostname` como fatos estáticos.
- Torna ordem e erros da injeção explícitos, sem afirmar que a ordem atual sempre falha.
- Trata listener de Client Hints como efeito da `defaultSession`; a correção deve escopar lifecycle sem mudar valores de identidade.
- Não corrige descriptors, UA, WebGL, exceções Netflix/Prime ou spoofing nesta macroetapa sem baseline e autorização separada.
- Não refatora genericamente `shared.js` nem todos os providers.
- Não substitui o timeout de loading por readiness visual genérica.

## Classificação

### Obrigatórios para promoção à `main`

- Corrigir aliases `disneyplus` e `hbomax` nas configurações espaciais.
- Selecionar provider e script por hostname/subdomínio válido, não por `includes()` na URL completa.
- Preservar redirects e hosts auxiliares já necessários, registrados explicitamente.
- Tornar a ordem dependente `polyfill → shared → slug → spatial config → script específico` sequencial ou contratualmente garantida.
- Registrar falha de cada estágio com provider e URL redigida, sem `.catch(() => {})` silencioso.
- Escopar callbacks à view/generation corrente, aproveitando a proteção da Macroetapa 3.
- Impedir que instalação/remoção do listener de Client Hints apague globalmente outro consumidor da sessão.
- Confirmar que requests de outras views não recebem identidade do streaming quando for possível distingui-los sem quebrar DRM.
- Preservar Prime Video com script específico `null` e YouTube `/tv` até validação contrária.

### Opcionais ou adiáveis

- Criar tabela mínima compartilhada de aliases/hosts se dois mapas ainda permanecerem divergentes.
- Adicionar estado visual simples de erro de carregamento, desde que não altere readiness de providers.
- Coletar baseline de spoofing, `process.argv`, UA Data e Client Hints.
- Manter defeitos locais de spoofing no backlog futuro até existir baseline e autorização específica; eles não integram as cinco sessões atuais.
- Alterar lifecycle de helpers de um provider específico após reprodução real.

## Escopo

### Faz parte

- Resolução mínima de provider.
- Matching seguro de hostname.
- Ordem, logging e lifecycle da injeção.
- Escopo do listener de Client Hints na sessão compartilhada, sem mudar os headers.
- Regressão prática dos providers afetados.

### Não faz parte

- Política abrangente de identidade.
- Correção geral de spoofing.
- Alteração de UA/Client Hints/WebGL.
- Refatoração genérica de customizações.
- Atualização de seletores externos sem reprodução.
- Suporte novo a provider.
- Readiness visual universal.

### Arquivos provavelmente envolvidos

- `electron/main.js`
- `electron/views/spatial-navigation/config.js`
- `electron/views/streaming-customizations/config.js`
- `electron/views/streaming-customizations/spatial-nav.js`
- `electron/views/streaming-customizations/shared.js`, somente se necessário para contrato de ordem
- Scripts individuais apenas se um teste provar necessidade
- `electron/preload-streaming.js`, somente para instrumentação aprovada, não para alteração ampla de identidade

### Contratos públicos a preservar

- Slugs persistidos e nomes dos ícones.
- URLs atuais do catálogo.
- YouTube `/tv` e Back via Escape.
- Prime Video sem customização específica.
- Cookies e sessão compartilhada.
- Permissão `mediaKeySystem`.
- Bloqueio de popups por padrão.

### Comportamentos obrigatórios a preservar

- Login e playback dos providers já funcionais.
- Widevine/DRM.
- D-pad próprio do YouTube.
- Reaplicação após reload/navegação completa.
- Home e overlay sem headers de streaming quando tecnicamente separáveis.
- Loading nunca permanece indefinidamente.

### Dependências

Macroetapas 1 a 3 aprovadas. Especialmente a proteção contra callbacks de view obsoleta deve existir antes de reorganizar injeção.

### Riscos conhecidos

- Redirects e autenticação podem usar hosts auxiliares.
- Requests de DRM/service worker podem ter identificação de `webContents` diferente.
- Sequenciar scripts pode revelar dependências antes mascaradas.
- Qualquer mudança de identidade pode alterar interface, login ou DRM.
- Os sites externos podem ter mudado desde as auditorias.

## Preparação da Sessão

### Documentos a ler

- `AGENTS.md`
- Esta macroetapa
- Problemas 5, 6, 7 e 13 da revisão, apenas como referência
- Seções “Providers, injeção”, “Spoofing”, “Itens que dependem de validação prática” e “Etapas 5, 6 e 11” da crítica
- `docs/BUGS.md` nas entradas de Prime e YouTube

### Arquivos e fluxos a inspecionar

- Catálogo e slugs ativos.
- `SPA_DOMAINS`, normalização de URL e detecção Prime/YouTube.
- Mapas de spatial navigation e scripts por domínio.
- Handler `dom-ready` e chamadas `executeJavaScript`.
- Registro/remoção de `onBeforeSendHeaders`.
- Logging de falhas de injeção.

### Comandos de inspeção recomendados

```bash
git status --short --branch
rg -n "disney|disneyplus|hbomax|max|youtube|primevideo|globoplay" backend electron frontend
rg -n "includes\(|new URL|hostname|onBeforeSendHeaders|executeJavaScript|dom-ready" electron/main.js electron/views
rg -n "catch\(\(\) => \{\}\)|catch\(\(\) => \{ \}\)" electron
```

### Estado inicial esperado do Git

- Macroetapas 1 a 3 aprovadas.
- Working tree sem alterações não validadas de provider ou identidade.
- Contas e ambiente de teste disponíveis para qualquer provider que terá comportamento alterado.

### Baseline antes da implementação

- Registrar para cada provider ativo: slug, URL inicial, hostname final, polyfill ativo, script selecionado e comportamento de Back.
- Registrar login e playback ao menos nos providers que serão afetados.
- Capturar logs atuais de injeção e falha.
- Se houver instrumentação aprovada, registrar headers e valores JS sem alterar identidade.
- Registrar loading em rede normal, lenta e offline.

## Método de Implementação

Ordem recomendada:

1. Adicionar testes puros de hostname e alias.
2. Corrigir aliases e matching por hostname.
3. Sequenciar e nomear os estágios de injeção.
4. Adicionar logging redigido de falhas.
5. Escopar lifecycle do listener de Client Hints sem mudar seus valores.
6. Executar regressão por provider afetado.
7. Não corrigir spoofing na mesma sessão; registrar o baseline e parar.

Cada provider deve ser validado antes de seguir se a mudança afetar seu caminho. Não usar sucesso de um provider como evidência para outro.

## Metodologia de Validação

### Validação estática

- Comparar todos os slugs ativos com chaves de configuração.
- Testar hostname exato, subdomínio válido, lookalike e domínio apenas na query.
- Confirmar sequência explícita dos scripts.
- Confirmar logs de erro não silenciosos e sem query/token.
- Confirmar que cleanup de Client Hints não remove listener alheio.
- Confirmar ausência de mudança nos valores de UA, Client Hints e spoofing.

### Validação automatizada atualmente disponível

```bash
node --check electron/main.js
node --check electron/preload-streaming.js
node --check electron/views/spatial-navigation/config.js
node --check electron/views/streaming-customizations/config.js
node --check electron/views/streaming-customizations/spatial-nav.js
node --check electron/views/streaming-customizations/shared.js
git diff --check
```

Não há teste automatizado versionado de provider, DRM ou streaming.

### Validação automatizada a criar

- Testes `node:test` para matching de hostname/subdomínio e aliases.
- Teste da ordem de injeção com `webContents` mockado ou função de plano de estágios.
- Teste de redaction de URL em logs.
- Teste de generation/view stale já criado na Macroetapa 3 deve continuar passando.

### Validação manual pelo usuário

Para cada provider afetado:

1. Abrir a partir da home e confirmar ícone/nome/URL corretos.
2. Confirmar primeiro foco e navegação D-pad.
3. Abrir detalhe e voltar.
4. Fazer login se necessário.
5. Iniciar reprodução e confirmar DRM.
6. Abrir/fechar overlay e retornar ao provider.
7. Recarregar o streaming.
8. Voltar à home e abrir outro provider.
9. Informar URL final, falhas visuais, comportamento D-pad, playback e logs dos estágios de injeção.

Matriz mínima desta etapa:

| Provider | Motivo |
|---|---|
| Disney+ | Alias corrigido |
| Max | Alias e possível redirect de hostname |
| YouTube | Invariante `/tv` e navegação própria |
| Prime Video | Invariante sem script específico |
| Netflix | Regressão do pipeline compartilhado e DRM |

### Validação dependente de ambiente

- Electron/Castlabs e Widevine.
- Login e DRM.
- Redirects reais e hosts auxiliares.
- Service workers e requests de licença.
- D-pad e foco em DOM externo.
- Timing de carregamento.
- Valores efetivos de spoofing e Client Hints.

Esses itens não podem ser marcados como aprovados por teste puro ou leitura de código.

## Critério de Conclusão

### Implementação concluída

- Aliases, hostname, ordem e lifecycle de injeção obrigatórios foram corrigidos.
- Valores de identidade não foram alterados.
- Invariantes de YouTube e Prime foram preservados.

### Validações automáticas concluídas

- Syntax checks, testes de matching/ordem e diff check passaram.

### Validações manuais pendentes

Sem regressão prática dos providers afetados, a macroetapa permanece pendente.

### Validação final aprovada

- Usuário aprovou a matriz mínima.
- Login/playback/DRM não regrediram nos providers testados.
- Logs mostram seleção e estágios esperados sem dados sensíveis.

## Granularidade de Commits Recomendada

1. `fix(providers): match aliases and hostnames deterministically`
2. `fix(streaming): sequence and report injection stages`
3. `fix(session): scope streaming client hints lifecycle`

Não incluir correção de spoofing nesses commits.

## Encerramento da Sessão

- Listar providers e hosts alterados.
- Declarar explicitamente que identidade foi ou não foi modificada.
- Apresentar matriz executada e pendências por provider.
- Separar resultado estático de DRM/login/hardware.
- Revisar diff e confirmar ausência de refatoração genérica de customizações.
- Sugerir commits e parar sem iniciar a Macroetapa 5.

### Texto para iniciar a sessão futura

> Assuma a Sessão 4 e a Macroetapa 4 completas. Leia integralmente a macroetapa, os documentos e arquivos indicados; confirme o Git e registre a baseline por provider. Planeje internamente os blocos, trabalhe progressivamente e valide cada bloco antes de seguir. Solicite meus testes de Castlabs, provider, login, DRM, playback, D-pad e redirects quando necessários, interprete o feedback e corrija na mesma sessão. Mantenha concluídos, pendentes e bloqueados, não altere spoofing, UA, DRM ou script específico sem reprodução e aprovação, separe commits coerentes, não faça commit sem aprovação explícita e não inicie a Macroetapa 5.

# Macroetapa 5 — Consolidar Evidência e Preparar Promoção

## Identificação

| Campo | Definição |
|---|---|
| Objetivo principal | Consolidar proteções específicas, observabilidade correta e evidência suficiente para promover a branch sem modularização artificial |
| Justificativa | A branch precisa demonstrar que os contratos estabilizados continuam preservados e que não restaram efeitos de sessão ou documentação enganosa |
| Problemas resolvidos | Fragilidades de evolução da revisão; logging/session destacados pela crítica; concentração tratada somente quando concreta |
| Resultado esperado | Checks repetíveis, logging atribuível e redigido, inventário ativo aprovado, documentação final derivada do código e branch pronta para revisão final |

## Rastreabilidade e Ajustes

- Substitui a etapa original de extração de todos os serviços por modularização pontual e opcional.
- Não cria suíte extensa como pré-requisito retroativo.
- Consolida os testes pequenos criados nas etapas anteriores.
- Corrige `attachRendererLogging()` na sessão compartilhada, problema destacado pela crítica.
- Mantém build, pacote, updater, operação, `userData` e legado fora desta promoção.
- Não usa a promoção como oportunidade para remover todo código morto ou reorganizar diretórios.
- Usa `ACTIVE_RUNTIME_SCOPE.md` como filtro obrigatório para impedir que legado, ferramentas de desenvolvimento, itens futuros ou componentes incertos sejam descritos como arquitetura ativa.
- Classifica OpenCode como ferramenta exclusiva de desenvolvimento, não como componente do produto no fluxo normal.

## Classificação

### Obrigatórios para promoção à `main`

- Garantir um único listener de erro de rede por sessão ou gerenciamento equivalente sem sobrescrita/duplicação por view.
- Atribuir logs à view correta quando `webContentsId` estiver disponível.
- Redigir query e fragment de URLs registradas.
- Corrigir assinaturas/eventos de logging comprovadamente incorretos apenas onde necessário para diagnóstico da fundação.
- Consolidar comandos de syntax check e testes `node:test` criados em um comando documentado e executável, sem dependência nova desnecessária.
- Criar e obter aprovação de `docs/ACTIVE_RUNTIME_SCOPE.md` antes dos demais documentos finais.
- Criar `docs/ARCHITECTURE.md` a partir do inventário ativo aprovado.
- Criar `docs/DEVELOPMENT_GUIDE.md` a partir do inventário ativo aprovado e do código final.
- Criar `docs/MANUAL_TEST_CHECKLIST.md` a partir do inventário ativo aprovado e dos comportamentos validados.
- Conferir cada API de preload contra handler, emissor e consumidor.
- Remover ou documentar como inativa qualquer API morta que ainda induza uso incorreto.
- Atualizar documentação afetada para corresponder ao runtime Electron real.
- Executar regressão final da home, settings, streaming, overlay e providers alterados.
- Revisar todo o diff acumulado da branch contra a base de promoção.

### Opcionais ou adiáveis

- Extrair um módulo tocado se a extração reduzir duplicação concreta e tiver teste de contrato.
- Criar script agregador para testes, caso mais de um teste `node:test` tenha sido adicionado.
- Remover imports e funções comprovadamente sem consumidor.
- Melhorar estrutura de logs além do necessário para atribuição e redaction.
- Adicionar mais cobertura para funções puras já isoladas.

## Entregáveis Documentais Obrigatórios

Os quatro documentos abaixo são criados somente na Sessão 5. Nenhum deles deve ser criado antecipadamente por outra sessão.

### `docs/ACTIVE_RUNTIME_SCOPE.md`

Este é o primeiro entregável documental e o filtro oficial para os outros três. Deve classificar arquivos, diretórios e subsistemas sem assumir que existência no repositório significa participação no runtime.

Categorias obrigatórias:

| Categoria | Critério |
|---|---|
| Ativo no runtime Electron atual | Componente comprovadamente carregado, chamado ou utilizado pelo runtime atual |
| Ferramenta exclusiva de desenvolvimento | Desenvolvimento, diagnóstico ou manutenção fora do fluxo normal do produto, incluindo OpenCode quando aplicável |
| Legado histórico | Geração Flask, Python, Chromium ou arquitetura anterior sem participação comprovada no runtime Electron atual |
| Futuro ou fora do escopo atual | ISO, instalador, boot, Plymouth, updater, pacote, release, migração completa de dados e integrações operacionais futuras |
| Incerto — requer confirmação | Participação não comprovada com segurança |

A classificação não pode se basear somente em nome, diretório, extensão, data, tamanho ou presença no repositório. Um diretório não deve ser classificado em bloco sem verificar seus componentes. Exemplo obrigatório: partes de `backend/` podem ser legado, enquanto `backend/streamings.json` permanece ativo se o Electron ainda o ler.

Evidências aceitas para classificar algo como ativo:

- `import` ou `require`.
- Referência em `package.json`.
- Carregamento por `BrowserWindow` ou `WebContentsView`.
- `loadFile`, `loadURL` ou preload.
- Chamada IPC comprovada.
- Execução por `spawn`, `execFile` ou mecanismo equivalente.
- Leitura de arquivo em runtime.
- Importação dinâmica.
- Recurso carregado por main, preload ou renderer.
- Chamada indireta demonstrada.
- Referência em script realmente usado para iniciar o runtime Electron.
- Evidência obtida e aprovada nas Macroetapas 1 a 4.

Fonte de verdade obrigatória:

- Branch atual de refatoração e runtime Electron efetivamente utilizado.
- Código resultante após as Macroetapas 1 a 4 e correções de runtime da Macroetapa 5.
- Referências reais entre arquivos.
- `package.json`.
- Scripts efetivamente usados para iniciar o Electron.
- Resultados das validações.
- Documentação anterior apenas como pista, nunca como prova isolada.
- Confirmação do usuário quando a evidência de runtime for insuficiente.

A branch `main` antiga não é fonte automática de verdade. Se a participação não puder ser provada, o item deve ser classificado como “Incerto — requer confirmação”, acompanhado da evidência encontrada e de uma pergunta objetiva ao usuário. Componentes incertos não entram na arquitetura ativa antes da confirmação.

### `docs/ARCHITECTURE.md`

Só pode ser criado após aprovação de `ACTIVE_RUNTIME_SCOPE.md`. Deve descrever apenas a arquitetura comprovadamente ativa após a limpeza.

Conteúdo obrigatório:

- Bootstrap e inicialização.
- Processo main.
- Preloads e renderers.
- `BrowserWindow` e `WebContentsView`.
- Composição e lifecycle das views.
- Homepage preservada, streaming e overlay.
- IPC e fronteiras de privilégio.
- Validação de sender, frame e payload.
- Catálogo e persistência atual.
- Navegação, foco, popups e modais.
- Providers, hostname, aliases e pipeline de injeção.
- Integrações locais comprovadamente ativas.
- Logging.
- Ferramentas de desenvolvimento relevantes, com OpenCode classificado fora do fluxo normal do produto.
- Decisões arquiteturais consolidadas.
- Limitações conhecidas e relação com o backlog futuro.

Não deve descrever arquitetura futura como implementada, misturar ISO/instalador/boot/updater com o runtime, documentar Flask/Python como arquitetura atual, presumir scripts de sistema ativos, virar inventário de todos os arquivos ou documentar função por função. Legado e futuro podem ser mencionados brevemente apenas para delimitação.

### `docs/DEVELOPMENT_GUIDE.md`

Só pode ser criado após aprovação de `ACTIVE_RUNTIME_SCOPE.md`. Deve orientar humanos e agentes de IA a modificar a fundação Electron comprovadamente ativa.

Conteúdo obrigatório:

- Como iniciar e inspecionar o runtime atual.
- Como localizar a origem real de um comportamento.
- Como criar ou alterar popup, modal e configuração.
- Como criar ou alterar IPC e validar sender, frame e payload.
- Como tratar dados externos no DOM sem `innerHTML` ou handlers inseguros.
- Como executar comandos externos sem shell quando houver dados dinâmicos.
- Como adicionar ou alterar provider, hostname, alias e redirect.
- Como trabalhar com pipeline de injeção.
- Como lidar com lifecycle de views, timers, intervalos e Promises.
- Como preservar foco e z-order.
- Como trabalhar com Wi-Fi e Bluetooth sem presumir hardware.
- Como usar OpenCode somente sob a condição explícita de desenvolvimento aprovada.
- Como registrar logs sem token, query ou dado sensível.
- Práticas proibidas ou desencorajadas.
- Comandos reais de inspeção, syntax check e testes disponíveis.
- Como atualizar o checklist manual quando um comportamento ativo for adicionado.

Não deve orientar a arquitetura antiga, catalogar todo o repositório, ensinar ISO/boot/installer/updater/empacotamento, documentar função por função ou criar convenções abstratas sem relação com o código.

### `docs/MANUAL_TEST_CHECKLIST.md`

Só pode ser criado após aprovação de `ACTIVE_RUNTIME_SCOPE.md`. Deve consolidar o checklist reutilizável de regressão dos comportamentos comprovadamente ativos.

Cobertura obrigatória quando o item estiver classificado como ativo:

- Inicialização e splash.
- Homepage, header, grid, cards e “Mais Usados”.
- Adicionar, remover, reordenar e foco.
- Settings, popups e modais.
- Wi-Fi e Bluetooth.
- Volume, mute, zoom e monitor.
- Overlay e toast.
- D-pad, air mouse, BrowserBack e Home.
- Screensaver.
- Abertura de streaming, retorno à home e troca rápida.
- Providers da matriz, login, DRM e playback.
- Logs, redaction e recuperação de erros relevantes.

Categorias de teste obrigatórias:

| Categoria | Aplicação |
|---|---|
| Testes essenciais | Executados em toda regressão candidata à promoção |
| Testes dependentes de hardware | Wi-Fi, Bluetooth, controle remoto, air mouse, áudio e aparelho específico |
| Testes dependentes de Debian/Castlabs | Foco, z-order, compositor, permissões, processos e integrações locais |
| Testes por provider | Executados quando o provider ou pipeline compartilhado mudar |
| Testes de login, DRM e playback | Dependem de conta, rede e serviço externo |
| Testes opcionais | Não bloqueiam quando não forem relevantes à mudança |

Cada teste deve declarar preparação, ações, comportamento esperado, regressões a observar e evidência útil em caso de falha. O checklist não pode incluir componente classificado como legado ou futuro no inventário ativo.

## Ordem Obrigatória da Documentação na Sessão 5

1. Revisar o runtime resultante e concluir as correções obrigatórias de logging/contratos da Macroetapa 5.
2. Criar `docs/ACTIVE_RUNTIME_SCOPE.md` usando evidência do código final.
3. Apresentar o inventário, evidências e incertezas ao usuário.
4. Obter aprovação explícita do escopo ativo.
5. Somente depois criar `docs/ARCHITECTURE.md`.
6. Criar `docs/DEVELOPMENT_GUIDE.md`.
7. Criar `docs/MANUAL_TEST_CHECKLIST.md`.
8. Verificar consistência entre os quatro documentos e o código.
9. Executar a regressão final usando o checklist produzido.
10. Revisar o diff completo da branch.
11. Avaliar a promoção à `main`.

Se qualquer mudança de código posterior alterar o inventário, `ACTIVE_RUNTIME_SCOPE.md` deve ser atualizado e reaprovado antes de continuar os documentos derivados.

## Escopo

### Faz parte

- Observabilidade do runtime Electron.
- Testes e checks específicos já justificados pelas mudanças.
- Inventário final de IPC/preload.
- Inventário comprovado do runtime ativo e documentação final correspondente ao estado resultante.
- Regressão e revisão para promoção.
- Extração pontual opcional com benefício demonstrado.

### Não faz parte

- Extrair todos os serviços de `main.js`.
- Dividir `frontend/script.js` apenas por tamanho.
- Criar framework de testes completo.
- CI, release, empacotamento ou instalador.
- Limpeza física de todo legado.
- Mudanças novas de produto.
- Correção adicional de provider não afetado.

### Arquivos provavelmente envolvidos

- `electron/main.js`
- Preloads e módulos tocados nas etapas anteriores
- Testes locais criados nas etapas anteriores
- `package.json`, somente se for adicionado script para testes já existentes, sem nova dependência
- `AGENTS.md`, `docs/BUGS.md` ou documentação diretamente desatualizada
- Este plano para registrar resultado final, se aprovado
- `docs/ACTIVE_RUNTIME_SCOPE.md`
- `docs/ARCHITECTURE.md`
- `docs/DEVELOPMENT_GUIDE.md`
- `docs/MANUAL_TEST_CHECKLIST.md`

### Contratos públicos a preservar

- Todos os canais e shapes aprovados nas macroetapas anteriores.
- Local e nível de logging, salvo redaction de dados sensíveis.
- Modelo de views e lifecycle validado.
- Comportamento aprovado dos providers.

### Comportamentos obrigatórios a preservar

- Ausência de regressão nos P0 corrigidos.
- Cards por ID estável.
- Overlay e monitor sem flash/polling órfão.
- D-pad, air mouse e volume aprovados.
- Login e playback dos providers da matriz.
- Nenhum item futuro se torna bloqueador retroativamente.

### Dependências

Macroetapas 1 a 4 com validação final aprovada.

### Riscos conhecidos

- Uma “limpeza final” pode crescer para refatoração ampla.
- Alterar logging pode esconder informação necessária ou vazar tokens se redaction for incompleta.
- Testes agregados podem depender acidentalmente de hardware.
- Documentação pode descrever intenção em vez de estado real.
- Arquivos legados, futuros ou incertos podem contaminar os documentos derivados se o inventário não for aprovado primeiro.
- Classificação por diretório pode ocultar exceções ativas como `backend/streamings.json`.

## Preparação da Sessão

### Documentos a ler

- `AGENTS.md`
- Este plano completo, com resultados das Macroetapas 1 a 4
- Seções “Fragilidades de Evolução” da revisão e lacunas adicionais da crítica
- Documentação modificada nas etapas anteriores
- Documentação histórica somente como pista para o inventário, nunca como prova isolada de runtime

### Arquivos e fluxos a inspecionar

- `attachRendererLogging()` e listeners `webRequest`.
- Todos os preloads e canais IPC.
- Testes criados.
- `package.json` e comandos realmente disponíveis.
- Grafo real de `require`, imports, preloads, `loadFile`, `loadURL`, IPC, leituras de arquivo e processos iniciados.
- Scripts efetivamente usados para iniciar o Electron na branch atual.
- Participação individual de arquivos em diretórios mistos, especialmente `backend/`.
- Condição de desenvolvimento e fluxo atual do OpenCode.
- Diff completo da branch em relação à base de promoção.

### Comandos de inspeção recomendados

```bash
git status --short --branch
git log --oneline --decorate -15
git diff --stat <base>...HEAD
git diff <base>...HEAD -- electron frontend backend package.json docs
rg -n "ipcMain\.(handle|on)|ipcRenderer\.(invoke|send|on)|exposeInMainWorld" electron frontend
rg -n "onErrorOccurred|console-message|did-fail-load|render-process-gone|preload-error" electron/main.js
rg -n "require\(|import |loadFile|loadURL|preload:|readFile|spawn\(|execFile\(" electron frontend package.json
rg -n "opencode|remote:|remoteEnabled" electron frontend config package.json
rg -n "TODO|FIXME|catch\(\(\) => \{\}\)" electron frontend
```

Substituir `<base>` pela branch/tag explicitamente escolhida para comparação. Não assumir `main` sem confirmar.

### Estado inicial esperado do Git

- Quatro macroetapas anteriores aprovadas.
- Commits organizados ou alterações claramente separáveis.
- Nenhuma validação manual obrigatória pendente das etapas anteriores.
- Base de promoção e ponto de preservação identificados.

### Baseline antes da implementação

- Listar testes e checks que realmente existem.
- Mapear canais IPC e subscriptions ativos.
- Produzir amostra de erro de rede com URL contendo query fictícia para validar redaction.
- Registrar diff total e arquivos fora do escopo, se houver.
- Consolidar resultados manuais já aprovados sem repeti-los como nova auditoria.
- Listar candidatos iniciais às cinco categorias de `ACTIVE_RUNTIME_SCOPE.md`, com evidência por item e sem classificar diretórios em bloco.
- Registrar itens incertos e as perguntas mínimas que precisarão de confirmação do usuário.
- Confirmar que OpenCode está acessível apenas pela condição de desenvolvimento aprovada e ausente do fluxo normal.

## Método de Implementação

Ordem recomendada:

1. Revisar o runtime resultante e concluir listener de rede, redaction, contratos e checks obrigatórios desta macroetapa.
2. Criar `docs/ACTIVE_RUNTIME_SCOPE.md` por evidência concreta.
3. Apresentar inventário, evidências e itens incertos.
4. Aguardar aprovação explícita do usuário para o escopo ativo.
5. Somente após a aprovação, criar `docs/ARCHITECTURE.md`.
6. Criar `docs/DEVELOPMENT_GUIDE.md`.
7. Criar `docs/MANUAL_TEST_CHECKLIST.md`.
8. Verificar consistência entre os quatro documentos, o código e a classificação do OpenCode.
9. Executar a regressão final usando `docs/MANUAL_TEST_CHECKLIST.md`.
10. Revisar o diff completo da branch.
11. Apresentar a avaliação de promoção e parar.

Os blocos acima permanecem dentro da mesma Sessão 5. A aprovação intermediária do inventário não cria subsessão. Não introduzir mudança funcional nova durante a regressão final. Qualquer novo defeito deve ser registrado e triado: crítico volta ao bloco correspondente da mesma sessão; opcional vai ao backlog.

## Metodologia de Validação

### Validação estática

- Um listener de sessão não deve ser registrado repetidamente por view.
- Logs não devem conter query ou fragment sensível.
- Cada método exposto por preload deve ter produtor/consumidor coerente ou estar documentado como inativo.
- Imports e módulos extraídos não podem criar ciclos.
- Diff completo não deve conter installer, updater, boot, package ou legado fora do escopo.
- Documentação deve descrever comportamento implementado, não intenção futura.
- Cada item ativo deve possuir evidência concreta de carregamento, chamada ou uso.
- Itens incertos relevantes devem permanecer fora de `ARCHITECTURE.md` até confirmação.
- `ARCHITECTURE.md` deve conter apenas componentes aprovados no inventário.
- `DEVELOPMENT_GUIDE.md` deve orientar somente a fundação Electron atual.
- `MANUAL_TEST_CHECKLIST.md` deve conter somente comportamentos ativos e classificados.
- OpenCode deve aparecer como ferramenta exclusiva de desenvolvimento, condicionada e fora do fluxo normal.
- Os quatro documentos não podem divergir entre si ou do código final.

### Validação automatizada atualmente disponível

Executar todos os checks aplicáveis já existentes:

```bash
node --check electron/main.js
node --check electron/preload.js
node --check electron/preload-overlay.js
node --check electron/preload-streaming.js
node --check frontend/script.js
node --check frontend/popup-manager.js
node --check electron/views/overlay.js
git diff --check
```

Executar também cada teste `node:test` criado nas etapas anteriores pelo comando efetivamente adicionado. Não declarar `npm test` disponível se ele não tiver sido criado.

### Validação automatizada a criar

- Teste de classificação de log por `webContentsId`.
- Teste de redaction de URL.
- Teste de inventário de canais, se puder ser estático e simples.
- Teste ou script de apoio que encontre referências reais usadas no inventário, sem classificar automaticamente os resultados.
- Script agregador sem dependências para os testes já existentes, se útil.

Não criar CI ou suíte end-to-end extensa nesta macroetapa.

### Validação manual pelo usuário

Primeiro, o usuário deve revisar `ACTIVE_RUNTIME_SCOPE.md` e confirmar ou corrigir cada item relevante marcado como incerto. Os documentos derivados não podem ser iniciados antes dessa aprovação.

Depois da aprovação e criação dos documentos, executar os itens essenciais de `docs/MANUAL_TEST_CHECKLIST.md`, incluindo no mínimo:

1. Iniciar Electron no modo usado no aparelho.
2. Confirmar splash e home sem erro visual.
3. Navegar por header, grid e Settings com D-pad e air mouse.
4. Adicionar, reordenar e remover um app de teste.
5. Repetir a sequência de “Mais Usados”.
6. Escanear/conectar Wi-Fi quando disponível.
7. Escanear/conectar/desconectar Bluetooth quando disponível.
8. Testar volume, mute, zoom, monitor e screensaver.
9. Abrir e fechar os providers da matriz da Macroetapa 4.
10. Testar menu, toast, Monitor, BrowserBack e Home em streaming.
11. Verificar logs por erros, labels incorretos ou dados sensíveis.
12. Confirmar que OpenCode não aparece no fluxo normal e continua acessível na condição de desenvolvimento aprovada.
13. Informar à sessão todos os itens aprovados, não executados e reprovados, com logs e screenshots relevantes.

### Validação dependente de ambiente

- Toda execução Electron/Castlabs.
- Wi-Fi, Bluetooth, PipeWire e Debian.
- Controle remoto e air mouse.
- Foco, z-order, timing e desempenho visual.
- Login, DRM e serviços externos.
- Permissões e logs do aparelho.
- Confirmação de participação de subsistemas cuja referência estática permaneça inconclusiva.

Itens não executados devem permanecer explicitamente pendentes; não podem ser convertidos em “aprovado por inspeção”.

## Critério de Conclusão

### Implementação concluída

- Logging/session, contratos e documentação obrigatórios foram consolidados.
- Nenhuma modularização opcional ampliou o escopo.
- Diff completo corresponde às cinco macroetapas.
- `docs/ACTIVE_RUNTIME_SCOPE.md` foi criado e aprovado.
- Componentes incertos relevantes foram confirmados ou explicitamente excluídos da arquitetura ativa.
- `docs/ARCHITECTURE.md` corresponde ao runtime real aprovado.
- `docs/DEVELOPMENT_GUIDE.md` orienta somente a fundação Electron atual.
- `docs/MANUAL_TEST_CHECKLIST.md` contém somente comportamentos comprovadamente ativos.
- OpenCode está classificado como ferramenta exclusiva de desenvolvimento.
- Legado e futuro não são descritos como arquitetura atual.
- Nenhum documento apresenta intenção futura como implementação existente.

### Validações automáticas concluídas

- Todos os syntax checks, testes criados e `git diff --check` passaram.
- Nenhuma falha foi omitida.

### Validações manuais pendentes

Qualquer item essencial da regressão final ainda não executado mantém a branch sem aprovação para promoção.

### Validação final aprovada

- Usuário aprovou o checklist essencial.
- Não há regressão P0/P1 aberta.
- Pendências P2/P3 aceitas estão registradas como opcionais ou backlog.
- Critérios finais de promoção deste documento foram atendidos.
- Os quatro documentos foram revisados entre si e contra o código final.
- A regressão final foi executada usando `docs/MANUAL_TEST_CHECKLIST.md`.

## Granularidade de Commits Recomendada

1. `fix(logging): scope network errors and redact urls`
2. `test(foundation): consolidate targeted regression checks`
3. `docs: classify active electron runtime scope`
4. `docs: document electron architecture and development`
5. `docs: add reusable manual regression checklist`

Extração opcional deve ter commit próprio e teste próprio.

## Resultado Registrado da Sessão 5

Registro em 16 de julho de 2026, na branch `refactor/electron-foundation`:

- Macroetapas 1 a 4 confirmadas pelos commits `5fe1cdb`, `1bd1502`, `c56a50d` e `112f886`.
- Logging de rede passou a usar um listener por sessão, com atribuição por `webContentsId` e redaction de credenciais, query e fragment.
- Contratos incorretos de `preload-error` e GPU foram corrigidos; APIs mortas do preload do overlay foram removidas.
- `npm test` e `npm run check` foram adicionados para os testes `node:test` e syntax checks existentes.
- `docs/ACTIVE_RUNTIME_SCOPE.md` foi criado, apresentado e aprovado pelo usuário antes dos documentos derivados.
- `docs/ARCHITECTURE.md`, `docs/DEVELOPMENT_GUIDE.md` e `docs/MANUAL_TEST_CHECKLIST.md` foram criados a partir do inventário aprovado.
- OpenCode foi confirmado como ferramenta exclusiva de desenvolvimento, sem bridge/UI normal. Por decisão explícita, permanece condicionado por `remoteEnabled` no estado local; `FIFOTV_DEV` não foi introduzido.
- A movimentação pré-existente de documentos para `docs/old/` foi confirmada como intencional e permanece separada desta macroetapa.
- Validação automática final: `npm run check` com 31 testes aprovados e `git diff --check` aprovado.
- Regressão manual completa do checklist, incluindo hardware, Castlabs e providers, foi aprovada pelo usuário.
- Sem commit ou promoção automática: a aprovação de commit e a resolução separada das mudanças pré-existentes no worktree permanecem necessárias antes de promover para `main`.

## Encerramento da Sessão

- Resumir o estado final da fundação.
- Listar todos os arquivos modificados na macroetapa e no diff acumulado.
- Informar itens obrigatórios concluídos e opcionais adiados.
- Listar comandos/testes com resultado.
- Apresentar checklist manual aprovado e pendências.
- Registrar a aprovação de `ACTIVE_RUNTIME_SCOPE.md` e as decisões sobre itens incertos.
- Confirmar consistência dos quatro documentos finais com o código.
- Confirmar OpenCode como ferramenta de desenvolvimento e fora do fluxo normal.
- Registrar riscos residuais e backlog.
- Confirmar ausência de mudanças fora do escopo.
- Sugerir sequência final de commits.
- Não fazer commit ou promover branch sem aprovação explícita.
- Parar após apresentar a prontidão.

### Texto para iniciar a sessão futura

> Assuma a Sessão 5 e a Macroetapa 5 completas. Leia integralmente a macroetapa, os documentos e arquivos indicados; confirme o Git, registre a baseline e planeje internamente os blocos. Trabalhe progressivamente, valide cada bloco, solicite meus testes e corrija o feedback na mesma sessão. Primeiro revise o runtime, crie `docs/ACTIVE_RUNTIME_SCOPE.md`, apresente evidências e incertezas e aguarde minha aprovação. Somente depois crie `docs/ARCHITECTURE.md`, `docs/DEVELOPMENT_GUIDE.md` e `docs/MANUAL_TEST_CHECKLIST.md`. Não permita que legado, futuro ou itens incertos contaminem a arquitetura ativa; classifique OpenCode como ferramenta de desenvolvimento. Mantenha concluídos, pendentes e bloqueados, separe commits coerentes, não faça commit sem aprovação explícita e não inicie trabalho fora desta macroetapa.

# Backlog Futuro — Fora da Limpeza Atual

| Item | Por que foi adiado | Evento que justifica retomada |
|---|---|---|
| ISO e instalação limpa | Exigem frente operacional própria e não alteram a validade do runtime Electron atual | Preparação de imagem instalável ou novo hardware sem sistema configurado |
| Boot, Plymouth, systemd e Xorg | Dependem do Debian, ordem de serviços e hardware; não são necessários para estabilizar contratos internos | Ciclo dedicado de boot/deploy ou falha reproduzida no aparelho |
| Updater e canal de atualização | Os scripts atuais pertencem a gerações distintas; corrigir exige estratégia de release, rollback e branch | Definição do fluxo oficial de distribuição e rollback |
| Empacotamento `.deb`/AppImage | Requer recursos no pacote, lockfile, paths graváveis e smoke test de artefato | Primeiro release instalável fora do checkout |
| Migração completa para `app.getPath('userData')` | Exige schema, migração idempotente, backup, rollback e testes com dados reais | Empacotamento, múltiplos aparelhos ou primeiro upgrade de dados versionado |
| Limpeza física do legado Flask/Python/Chromium/Openbox | Concluída em branch dedicada, preservando `backend/streamings.json` | Estado anterior preservado pela tag `electron-foundation-before-repository-cleanup` |
| OpenCode como produto | Nesta fase ele permanece preservado como ferramenta condicionada ao desenvolvimento; autenticação, bind público, TLS, ownership e supervisor de produto não pertencem à fundação atual | Decisão explícita de transformar o acesso remoto em funcionalidade suportada para usuários finais |
| Spoofing e identidade por provider | Efeitos em UI, login, DRM e antiabuso não podem ser inferidos estaticamente | Baseline por provider, contas de teste e necessidade funcional reproduzida |
| Endurecimento amplo das customizações externas | Seletores e lifecycle são específicos e mudam com terceiros | Falha reproduzida em um provider ou ciclo dedicado de compatibilidade |
| Modularização adicional de `main.js` e frontend | Tamanho de arquivo não justifica risco; contratos precisam permanecer estáveis | Nova funcionalidade encontra duplicação/acoplamento concreto ou testes tornam extração segura |
| Suíte completa de hardware e distribuição | Requer aparelhos, contas, rede, DRM e infraestrutura ainda não versionada | Preparação de release candidate ou expansão para mais hardware |
| CI e automação de release | Dependem de build reproduzível e estratégia de distribuição | Primeiro pipeline oficial de release |

O backlog não bloqueia a promoção da fundação, salvo se um item revelar uma regressão P0/P1 diretamente causada pelas macroetapas.

# Critérios para promover esta branch para a nova main

A promoção somente pode ocorrer quando todos os critérios abaixo forem atendidos.

## Macroetapas

- As cinco sessões principais planejadas foram concluídas, uma por macroetapa, sem sessão adicional obrigatória.
- Macroetapas 1 a 5 com núcleo obrigatório implementado.
- Validação final de cada macroetapa aprovada pelo usuário.
- Itens opcionais não concluídos explicitamente registrados e não confundidos com falhas obrigatórias.

## Segurança

- Wi-Fi não executa SSID ou senha por shell.
- Dados de catálogo, Wi-Fi e Bluetooth não executam HTML/JavaScript privilegiado.
- Home e overlay não navegam para origens externas.
- IPC sensível valida sender/frame e payload antes de efeitos colaterais.
- Nenhuma regressão P0 conhecida permanece aberta.

## Funcionalidade

- Card visual sempre abre o app exibido após mudanças em “Mais Usados”.
- Add, remove e reorder preservam catálogo e foco aceitável.
- Catálogo ausente/inválido não vira silenciosamente grade vazia nem sobrescreve dados.
- RAM, volume, zoom e parsing Wi-Fi correspondem ao estado real nos cenários testados.
- UI normal não anuncia cache, update, acesso remoto ou Settings sem contrato funcional aprovado.
- OpenCode permanece invisível e inativo no fluxo normal, mas acessível pela condição de desenvolvimento validada.

## Lifecycle e Navegação

- Menu, toast e monitor não removem o streaming do compositor.
- Não há monitor invisível, polling órfão, Promise modal pendente ou callback em view substituída nos cenários aprovados.
- Foco retorna ao destino correto após fechar overlay/modal.
- D-pad, BrowserBack, Home, volume e air mouse passaram no checklist essencial do hardware disponível.
- Bluetooth cleanup obrigatório foi validado no ambiente aplicável.

## Providers

- Aliases e hostnames selecionam as configurações esperadas.
- Pipeline de injeção registra e preserva sua ordem.
- Matriz mínima de Disney+, Max, YouTube, Prime Video e Netflix foi executada ou cada impossibilidade foi explicitamente avaliada pelo usuário antes da promoção.
- Nenhuma alteração de identidade/DRM não validada está presente.

## Testes e Evidência

- Todos os testes e scripts automatizados realmente disponíveis passaram.
- Todos os testes específicos criados nas macroetapas passaram.
- `node --check` passou para todos os JavaScript modificados.
- `git diff --check` passou.
- Os itens essenciais de `docs/MANUAL_TEST_CHECKLIST.md` foram executados e aprovados.
- Itens dependentes de ambiente não foram declarados aprovados sem execução.
- Não existe regressão crítica conhecida em home, settings, streaming, overlay, Wi-Fi, Bluetooth ou volume.

## Documentação e Git

- Documentação corresponde ao estado real da branch.
- `docs/ACTIVE_RUNTIME_SCOPE.md` foi aprovado pelo usuário.
- `docs/ARCHITECTURE.md` descreve somente o runtime ativo aprovado.
- `docs/DEVELOPMENT_GUIDE.md` orienta somente a fundação Electron atual.
- `docs/MANUAL_TEST_CHECKLIST.md` está atualizado e foi usado na regressão final.
- Os quatro documentos finais são consistentes entre si e com o código da branch promovida.
- Nenhum componente legado é descrito como ativo.
- Nenhum componente futuro ou de backlog é descrito como implementado.
- OpenCode está classificado como ferramenta exclusiva de desenvolvimento, não como funcionalidade normal do produto.
- Este plano registra obrigatórios concluídos, opcionais adiados e backlog futuro.
- Working tree está limpo antes da promoção.
- Commits têm objetivo único, são testáveis e não misturam segurança, correção funcional e reorganização sem relação.
- O diff final não contém ISO, installer, boot, updater, empacotamento, migração completa de persistência ou limpeza incidental do legado.
- A versão anterior está preservada por branch ou tag identificada antes de mover a nova `main`.
- A promoção foi explicitamente aprovada pelo usuário.

Não é necessário concluir nenhum item da seção “Backlog Futuro — Fora da Limpeza Atual” para promover a branch.
