# Documentação do FIFOtv

Este diretório separa a documentação vigente do material de pesquisa e dos registros históricos. O objetivo é deixar claro o que descreve o FIFOtv atual sem apagar o caminho que levou até ele.

## Por onde começar

| Documento | Use para |
|---|---|
| [`../README.md`](../README.md) | Conhecer o projeto, seus recursos e seu status público |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Entender o runtime Electron atual e seus contratos |
| [`DEVELOPMENT_GUIDE.md`](DEVELOPMENT_GUIDE.md) | Alterar o projeto com segurança e validar mudanças |
| [`MANUAL_TEST_CHECKLIST.md`](MANUAL_TEST_CHECKLIST.md) | Executar regressões que dependem de Electron, hardware ou providers |
| [`../AGENTS.md`](../AGENTS.md) | Consultar regras de trabalho para agentes de desenvolvimento |

## Fonte de verdade

A ordem de autoridade é:

1. Código, configuração versionada e testes da branch atual.
2. `docs/ARCHITECTURE.md` para a descrição técnica do runtime.
3. `docs/DEVELOPMENT_GUIDE.md` para práticas de manutenção.
4. `docs/MANUAL_TEST_CHECKLIST.md` para validação manual.
5. Pesquisas e documentos históricos apenas como contexto.

Se um documento divergir do código ou dos testes, o documento deve ser corrigido. Planos, revisões e relatos antigos nunca tornam um componente ativo por si só.

## Pesquisa

`research/` contém propostas que podem orientar trabalho futuro, mas que não representam funcionalidades implementadas ou aprovadas.

| Documento | Estado |
|---|---|
| [`research/WEBOS_APPS_RESEARCH.md`](research/WEBOS_APPS_RESEARCH.md) | Pesquisa futura sobre compatibilidade com apps webOS hospedados; não implementada |

## Histórico

`history/` preserva decisões, auditorias, planos concluídos e relatos da migração. Esses arquivos podem citar branches, caminhos, comandos, dependências e comportamentos que não existem mais.

Nunca execute instruções de `history/` sem validá-las novamente contra a branch atual.

| Área | Conteúdo |
|---|---|
| `history/foundation/` | Revisão, crítica, plano e inventário usados na consolidação da fundação Electron |
| `history/migration/` | Diário e bugs da migração v1 para v2 |
| `history/plans/` | Planos concluídos ou superseded que ainda registram decisões úteis |
| `history/research/` | Pesquisas e incidentes técnicos ligados a implementações anteriores |

O estado completo anterior à limpeza também permanece disponível nas tags Git `electron-before-refactor`, `electron-foundation-before-repository-cleanup` e `legacy-main-final`.

## Manutenção

Ao mudar o runtime:

- Atualize `ARCHITECTURE.md` quando mudarem componentes, views, IPC, persistência ou integrações.
- Atualize `DEVELOPMENT_GUIDE.md` quando mudar a forma segura de implementar ou validar comportamento.
- Atualize `MANUAL_TEST_CHECKLIST.md` quando surgir uma regressão manual relevante.
- Não transforme um plano concluído em documentação atual; mova-o para `history/` quando ele ainda tiver valor.
- Não registre senhas, tokens, cookies, MACs reais ou outros identificadores pessoais.
- Prefira nomes de funções, canais e testes a números de linha em documentos vigentes.

O `README.md` da raiz é a página pública do projeto e deve permanecer curto, visual e acessível. Detalhes técnicos pertencem aqui.
