# Checklist Manual de Regressão

## Uso

Este checklist cobre somente comportamentos classificados como ativos em `docs/ACTIVE_RUNTIME_SCOPE.md`. Registre cada item como:

- `[x] Aprovado`: executado e sem regressão.
- `[ ] Pendente`: ainda não executado ou ambiente indisponível.
- `[!] Reprovado`: falha reproduzida; anexar evidência.
- `[-] Não aplicável`: justificar por que a mudança não alcança o item opcional.

Testes de hardware, Castlabs, conta, DRM ou serviço externo nunca podem ser aprovados apenas por inspeção estática.

## Registro da Execução

| Campo | Valor |
|---|---|
| Data | |
| Branch/commit | |
| Modo de início | `npm run dev`, `npm start` ou systemd instalado |
| Hardware | |
| Controle/air mouse | |
| Rede | |
| Executor | |
| Log principal | `/var/log/fifotv/main.log` |

Antes de iniciar:

```bash
npm run check
```

# Testes Essenciais

## E01 — Inicialização, splash e home

Status: `[ ]`

**Preparação:** Electron parado; log aberto; nenhum popup esperado.

**Ações:** iniciar pelo modo usado no aparelho; observar splash até a home; aguardar estabilização.

**Esperado:** fundo preto sem flash branco, logo e barra do splash visíveis, transição única para home, header/grid carregados e foco inicial utilizável.

**Regressões a observar:** splash preso, home duplicada, tela branca, erro de preload, renderer encerrado ou foco ausente.

**Evidência em falha:** screenshot/vídeo, modo de início e trecho do log desde o startup.

## E02 — Header, grid e cards

Status: `[ ]`

**Preparação:** home aberta com catálogo completo.

**Ações:** navegar pelo header e por todas as linhas do grid com D-pad; clicar cards com air mouse; voltar sem abrir Settings acidentalmente.

**Esperado:** foco visual acompanha o item real; nomes/ícones corretos; nenhum card abre outro app; mouse e D-pad selecionam a mesma identidade.

**Regressões a observar:** foco invisível, salto para home após re-render, card trocado, conteúdo hostil interpretado como HTML.

**Evidência em falha:** foto/screenshot do foco, nome visual, app aberto e sequência de teclas.

## E03 — “Mais Usados” por ID estável

Status: `[ ]`

**Preparação:** anotar a ordem inicial dos recentes.

**Ações:** abrir repetidamente dois ou mais apps em ordem conhecida; retornar à home após cada abertura; selecionar cada card visual dos recentes.

**Esperado:** ranking atualiza; cada card abre exatamente o app exibido; ausência de recentes e quatro recentes continuam válidos.

**Regressões a observar:** card visual abrindo vizinho, ordem interna diferente da visual, foco perdido após retorno.

**Evidência em falha:** ordem antes/depois, contagem de aberturas e vídeo da seleção.

## E04 — Adicionar, mover e remover app

Status: `[ ]`

**Preparação:** Settings acessível; definir app de teste com nome literal `TV "Sala" <teste>`, slug válido e URL HTTP/HTTPS segura.

**Ações:** adicionar; verificar card/lista; mover para cima e para baixo; remover pelo X; confirmar o foco após cada operação.

**Esperado:** nome renderiza literalmente; catálogo permanece completo e válido; ordem persiste; foco vai para ação equivalente/adjacente ou botão adicionar.

**Regressões a observar:** HTML executado, item errado movido/removido, grade vazia, foco vazando para a home.

**Evidência em falha:** conteúdo do formulário, screenshot da lista/grid e erro do log.

## E05 — Settings, popups e fechamento global

Status: `[ ]`

**Preparação:** home sem popup aberto.

**Ações:** abrir Settings por UI e F1; percorrer seções; abrir/fechar menu de contexto e monitor; repetir rapidamente; fechar por botão, click externo, Escape e BrowserBack.

**Esperado:** um popup por vez; animação não deixa popup invisível ativo; foco retorna ao destino válido; cache, update e acesso remoto não aparecem.

**Regressões a observar:** polling após fechar, popup que reaparece por timer antigo, menu sobre monitor, ação falsa visível.

**Evidência em falha:** sequência exata, vídeo e mensagens de renderer.

## E06 — Volume, mute e estado autoritativo

Status: `[ ]`

**Preparação:** áudio ativo e volume conhecido.

**Ações:** aumentar/diminuir pela home e teclas físicas; mutar/desmutar; alcançar limites próximos de 0% e 100%; repetir dentro do streaming.

**Esperado:** UI/toast só muda após resposta válida; valor corresponde ao `wpctl`; volume fica entre 0% e 100%; mute real acompanha a indicação.

**Regressões a observar:** valor otimista incorreto, acima de 100%, toast tomando foco ou comandos parando após overlay.

**Evidência em falha:** saída de `wpctl get-volume @DEFAULT_AUDIO_SINK@`, screenshot do toast e log.

## E07 — Monitor e zoom

Status: `[ ]`

**Preparação:** home aberta e um streaming disponível.

**Ações:** abrir monitor na home; observar duas atualizações; fechar; abrir streaming e repetir pelo overlay; testar zoom até 50% e 150% e tentar ultrapassar os limites.

**Esperado:** métricas plausíveis; monitor fecha por Back/Escape/ContextMenu/click externo; nenhum intervalo continua visível; zoom é limitado e mostra valor real.

**Regressões a observar:** menu na frente do monitor, monitor instantaneamente fechado, flash do streaming, polling órfão, zoom divergente.

**Evidência em falha:** vídeo, valores exibidos, saída de `free -m` e trecho do log.

## E08 — Overlay, toast e foco

Status: `[ ]`

**Preparação:** streaming aberto e reproduzível.

**Ações:** abrir ContextMenu uma vez; navegar e fechar; gerar toasts consecutivos de volume; abrir monitor; alternar menu/monitor/Back.

**Esperado:** menu abre com uma pressão; streaming permanece montado sem flash; toast não toma teclado; fechamento devolve foco e mouse ao streaming.

**Regressões a observar:** necessidade de múltiplas pressões, overlay preso, click bloqueado, streaming removido do compositor, erro de sender IPC.

**Evidência em falha:** vídeo contínuo e log do período.

## E09 — BrowserBack, Home e troca rápida

Status: `[ ]`

**Preparação:** home e pelo menos dois streamings funcionais.

**Ações:** abrir streaming A; usar navegação interna; testar BrowserBack; retornar por BrowserHome/menu Início; abrir B imediatamente; repetir A/B rapidamente.

**Esperado:** BrowserBack respeita o provider; Home destrói somente views de streaming; home preserva estado; nenhuma callback/tela de A afeta B.

**Regressões a observar:** loading antigo removendo view nova, injeção no provider errado, crash por view destruída, power blocker/foco preso.

**Evidência em falha:** sequência temporal, URLs sem dados sensíveis, vídeo e log de lifecycle.

## E10 — Screensaver e atividade

Status: `[ ]`

**Preparação:** home aberta; tempo disponível para o timeout real de 15 minutos.

**Ações:** deixar inativo até o screensaver; pressionar tecla/mover controle; abrir streaming e verificar que atividade reseta timers; retornar à home.

**Esperado:** relógio do screensaver aparece após inatividade; qualquer atividade válida o fecha; streaming evita sleep de display; retorno reinicia timers.

**Regressões a observar:** screensaver sobre streaming, não fechar, DPMS precoce ou timer não reiniciado.

**Evidência em falha:** horário inicial/final, vídeo e estado da tela.

## E11 — Recuperação e redaction de logs

Status: `[ ]`

**Preparação:** criar temporariamente app com URL `https://nao-existe.invalid/teste?fifotv_token=SEGREDO#fragmento`; abrir o log.

**Ações:** abrir o app; aguardar falha/retorno; procurar labels de renderer/rede e o marcador `SEGREDO`; remover o app de teste.

**Esperado:** falha do frame principal retorna à home uma vez; label corresponde à view; log pode mostrar `https://nao-existe.invalid/teste`, mas nunca credenciais, query, fragment ou `SEGREDO`.

**Regressões a observar:** loop de reload, tela presa, label `overlay` para toda falha, URL completa ou token no log.

**Evidência em falha:** linhas relevantes do log com segredo censurado na comunicação externa.

## E12 — OpenCode fora da UI normal

Status: `[ ]`

**Preparação:** anotar o valor local de `config/settings.json`; abrir home e Settings.

**Ações:** iniciar `opencode serve --port 3000` manualmente; confirmar ausência de acesso remoto na UI; com `remoteEnabled: true` nesta máquina de desenvolvimento, abrir e fechar o FIFOtv e confirmar que o processo manual continua acessível; não alterar o valor durante a regressão.

**Esperado:** nenhuma ação normal da TV expõe OpenCode; o comportamento local aprovado por `remoteEnabled` continua funcional somente como ferramenta de desenvolvimento e não encerra processo externo na porta 3000.

**Regressões a observar:** botão remoto reaparecer, API adicionada ao preload, processo externo encerrado, falha de startup do Electron por causa do processo ou OpenCode descrito como produto.

**Evidência em falha:** screenshot da UI, estado local sem segredos, processo e log `[Remote]`.

# Testes Dependentes de Hardware

## H01 — Wi-Fi protegido e dados especiais

Status: `[ ]`

**Preparação:** rede protegida disponível; conhecer senha; preferir SSID com espaço, Unicode ou `:` quando houver.

**Ações:** scan; selecionar rede; cancelar senha uma vez; reconectar com senha correta; verificar status.

**Esperado:** lista mostra SSID literal; cancelamento não deixa Promise pendente; conexão ocorre sem shell injection; status corresponde ao NetworkManager.

**Regressões a observar:** modal preso, SSID truncado em `:`, senha em log, comando interpretando metacaracteres.

**Evidência em falha:** SSID, resultado do `nmcli`, screenshot e log sem senha.

## H02 — Wi-Fi aberto

Status: `[ ]`

**Preparação:** rede aberta disponível. Se não existir, manter pendente.

**Ações:** scan; selecionar a rede; confirmar conexão e status.

**Esperado:** não abre modal de senha; `nmcli` recebe conexão sem argumento `password`.

**Regressões a observar:** exigir senha, enviar string vazia como senha ou indicar sucesso sem conexão.

**Evidência em falha:** SSID, screenshot e saída do NetworkManager.

## H03 — Bluetooth scan e restauração

Status: `[ ]`

**Preparação:** registrar `Pairable`, `Discoverable` e `Discovering` antes do teste; ter dispositivo disponível.

**Ações:** scan; aguardar conclusão; verificar flags; repetir scan; testar adaptador sem dispositivo quando aplicável.

**Esperado:** descoberta termina; flags retornam aos valores anteriores inclusive após falha; lista não duplica indefinidamente.

**Regressões a observar:** `Discovering: yes` permanente, adaptador deixado público ou cache quebrado no segundo scan.

**Evidência em falha:** `bluetoothctl show` antes/depois e log Bluetooth.

## H04 — Bluetooth connect, múltiplos dispositivos e unpair

Status: `[ ]`

**Preparação:** um ou dois dispositivos pareáveis; anotar conexões existentes.

**Ações:** conectar; verificar Settings; conectar segundo dispositivo quando possível; desconectar; reconectar; desparear somente o dispositivo de teste.

**Esperado:** todos os conectados aparecem; ações usam MAC correto; trust/pairing preservam comportamento aprovado; lista próxima exclui conectados.

**Regressões a observar:** mostrar apenas o primeiro, agir no MAC errado, timeout sem recuperação ou remover outro aparelho.

**Evidência em falha:** nomes/MACs, `bluetoothctl devices Connected` e log.

## H05 — Controle remoto e air mouse

Status: `[ ]`

**Preparação:** controle físico usado no aparelho.

**Ações:** testar setas, Enter, ContextMenu, BrowserBack, BrowserHome, volume e MediaPlayPause na home e no streaming; testar click/movimento do air mouse.

**Esperado:** eventos mantêm o mapeamento já caracterizado; nenhuma tecla é processada duas vezes; mouse não fica bloqueado pelo overlay.

**Regressões a observar:** menu abrindo/fechando na mesma pressão, foco duplicado, tecla perdida ou evento global atuando na view errada.

**Evidência em falha:** saída de `npx electron scripts/keytest.js`, vídeo e modelo do controle.

# Testes Dependentes de Debian/Castlabs

## D01 — Composição e desempenho no aparelho

Status: `[ ]`

**Preparação:** hardware alvo, resolução normal e logging ativo.

**Ações:** repetir abertura/fechamento de streaming, menu, monitor e toast por dez ciclos; observar CPU/RAM e fluidez.

**Esperado:** sem flash, view preta, foco perdido, crescimento evidente por polling ou degradação progressiva.

**Regressões a observar:** render-process-gone, unresponsive, callback obsoleta ou compositor mostrando home sobre streaming.

**Evidência em falha:** vídeo, métricas antes/depois e log.

## D02 — DPMS e permissões locais

Status: `[ ]`

**Preparação:** aparelho pode ter a tela apagada sem interromper trabalho crítico.

**Ações:** acionar o fluxo de screen-off pelo timeout aplicável; reativar por input; testar stats e volume.

**Esperado:** `xset`, `wpctl`, `/proc`, `free` e `df` funcionam com o usuário atual; tela retorna por atividade.

**Regressões a observar:** permissão negada, tela não retornar ou métricas zeradas sem erro visível.

**Evidência em falha:** comando/erro do log e estado do serviço/sessão gráfica.

## D03 — Ações destrutivas opcionais

Status: `[ ]`

**Preparação:** janela autorizada para reiniciar app, sistema ou desligar aparelho; salvar trabalho externo.

**Ações:** testar restart do Electron; testar reboot/shutdown somente quando operacionalmente seguro.

**Esperado:** restart retorna ao splash/home; reboot/shutdown executam uma vez conforme permissão do aparelho.

**Regressões a observar:** múltiplas instâncias, loop de restart ou ação sem efeito anunciada como sucesso.

**Evidência em falha:** journal, horário e estado da unidade externa.

# Testes por Provider

## Procedimento Comum

Para cada provider marcado abaixo:

**Preparação:** conta válida quando necessária, rede estável, log aberto e sessão conhecida.

**Ações:** abrir pela home; navegar com D-pad/air mouse; entrar em detalhe; voltar; abrir overlay e monitor; recarregar; autenticar quando aplicável; iniciar playback; retornar à home e reabrir.

**Esperado:** hostname/script selecionados corretamente; pipeline completa em ordem; UI, login, DRM e playback mantêm o baseline do provider; URL registrada sem query/token.

**Regressões a observar:** script errado, lookalike/query selecionando provider, login preso por popup, DRM falhando, overlay quebrando playback, redirect sem customização ou callback após fechar.

**Evidência em falha:** provider, URL redigida, etapa da pipeline, screenshot/vídeo e linhas de log sem token.

## Matriz Principal

| Provider | Status | Host/script esperado | Login/DRM/playback |
|---|---|---|---|
| Netflix | `[ ]` | `netflix.com` → `netflix.js`; identidade de rede preserva exceção atual | Obrigatório quando houver conta |
| YouTube | `[ ]` | `youtube.com`/`youtu.be` → `/tv`; script específico `none` | Playback obrigatório |
| Prime Video | `[ ]` | `primevideo.com`; script específico `none`; identidade preserva exceção atual | Login/DRM/playback obrigatórios quando houver conta |
| Disney+ | `[ ]` | slug `disneyplus`; `disneyplus.com` → `disney.js` | Login/DRM/playback obrigatórios quando houver conta |
| Max | `[ ]` | slug `hbomax`; redirect `play.max.com` → `max.js` | Login/DRM/playback obrigatórios quando houver conta |

## Providers Condicionais Ativos

| Provider | Status | Host/script esperado | Quando executar |
|---|---|---|---|
| Apple TV | `[ ]` | `tv.apple.com` → `appletv.js` | Mudança em pipeline compartilhada ou Apple |
| Apple Music | `[ ]` | `music.apple.com` → `applemusic.js` | Mudança em pipeline compartilhada ou Apple |
| Globoplay | `[ ]` | redirect `globoplay.globo.com` → `globoplay.js` | Mudança em pipeline compartilhada ou Globoplay |
| Google | `[ ]` | sem script específico | Mudança em pipeline/navegação compartilhada |
| Nuvio | `[ ]` | sem script específico | Mudança em pipeline/navegação compartilhada |

# Testes Opcionais

## O01 — Catálogo ausente ou inválido

Status: `[ ]`

**Preparação:** cópia segura do catálogo; ambiente de desenvolvimento isolado.

**Ações:** simular arquivo ausente, JSON inválido, shape inválido e IDs duplicados; restaurar exatamente o arquivo original.

**Esperado:** erro explícito; frontend não inventa catálogo alternativo; escrita inválida não sobrescreve dados.

**Regressões a observar:** grade vazia silenciosa, perda de catálogo ou fallback divergente.

**Evidência em falha:** cenário, erro e diff do arquivo restaurado.

## O02 — Renderer ou rede interrompidos

Status: `[ ]`

**Preparação:** ambiente onde seja seguro desligar rede ou encerrar renderer de teste.

**Ações:** interromper conexão durante load; quando viável, provocar encerramento do renderer; retornar e abrir outro provider.

**Esperado:** recuperação única para home; nenhuma geração antiga atua depois; nova abertura funciona.

**Regressões a observar:** reload infinito, app preso, loading órfão ou label de log incorreto.

**Evidência em falha:** método de interrupção, timeline e log.

# Resultado Final

| Categoria | Aprovados | Pendentes | Reprovados | Não aplicáveis |
|---|---:|---:|---:|---:|
| Essenciais | | | | |
| Hardware | | | | |
| Debian/Castlabs | | | | |
| Matriz principal de providers | | | | |
| Providers condicionais | | | | |
| Opcionais | | | | |

## Critério de Aprovação

A regressão candidata à promoção exige:

- Todos os testes essenciais aprovados.
- Nenhuma regressão P0/P1 aberta.
- Itens de hardware/ambiente executados quando o recurso estiver disponível; impossibilidades registradas como pendentes.
- Matriz principal de providers executada com resultado explícito.
- Login, DRM e playback não declarados aprovados sem conta/execução real.
- Logs sem query, fragment, credencial, senha ou token.
- OpenCode ausente da UI normal e preservado somente pelo comportamento de desenvolvimento aprovado.
- `npm run check` e `git diff --check` aprovados no mesmo estado de código testado.
