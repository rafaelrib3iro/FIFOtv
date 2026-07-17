# Pesquisa de Compatibilidade com Apps webOS Hospedados

> **Status: pesquisa futura, não implementada.** Nenhum preload, IPC, sessão ou fluxo de autenticação webOS descrito aqui faz parte do runtime atual. A arquitetura vigente está em `docs/ARCHITECTURE.md`.

## Objetivo

Investigar se o Electron do FIFOtv pode executar aplicações web hospedadas originalmente destinadas a TVs webOS. Esta pesquisa não cobre aplicações nativas empacotadas, instalação de IPK nem emulação completa do sistema operacional da LG.

O cenário de interesse é uma aplicação HTML/CSS/JavaScript remota que espera algumas APIs de TV no navegador, por exemplo identidade de dispositivo, lifecycle e chamadas ao Luna Service Bus.

## Estado Atual

O FIFOtv atual:

- Abre URLs HTTP/HTTPS em uma `WebContentsView` de streaming.
- Usa somente `electron/preload-streaming.js` para páginas externas.
- Não possui `preload-webos.js`.
- Não seleciona runtime pelo campo `type` do catálogo.
- Não expõe `PalmSystem`, `PalmServiceBridge`, `WebOSServiceBridge` ou mocks Luna.
- Não possui IPC de autenticação Spotify ou persistência específica por app webOS.
- Não intercepta tokens por Chrome DevTools Protocol.

Qualquer suporte webOS exige uma implementação futura isolada e uma revisão de segurança própria.

## Hipótese Técnica

Apps webOS hospedados continuam sendo aplicações web, mas podem depender de APIs fornecidas pelo televisor. Uma camada de compatibilidade mínima talvez precise representar:

| Área | Exemplos a investigar |
|---|---|
| Identidade | User-Agent, Client Hints, resolução e informações de dispositivo |
| Lifecycle | Aplicação ativada, desativada e pronta |
| APIs globais | `PalmSystem`, `PalmServiceBridge` ou `WebOSServiceBridge` |
| Serviços Luna | Áudio, rede, locale, device ID e screensaver |
| Entrada | D-pad, Back, teclas de mídia e foco |
| Persistência | Cookies e armazenamento da sessão do app |

Essas necessidades variam por aplicação. Não se deve criar uma emulação ampla antes de observar chamadas reais em um protótipo controlado.

## Limites De Segurança

Uma futura prova de conceito deve seguir estas restrições:

- Não desabilitar `webSecurity` globalmente.
- Não desabilitar sandbox ou isolamento sem justificativa reproduzível e revisão específica.
- Não capturar, imprimir ou persistir tokens, cookies, senhas ou corpos de autenticação em logs.
- Não extrair credenciais de aplicações de terceiros por CDP.
- Não expor IPC privilegiado diretamente a páginas externas.
- Não reutilizar a bridge da home no streaming.
- Validar origem, frame, payload e lifecycle de qualquer nova capacidade.
- Armazenar dados persistentes fora do checkout e com permissões adequadas.
- Considerar termos de uso, políticas do provider e requisitos legais antes de integrar uma aplicação.

## Estratégia Recomendada Para Uma Prova De Conceito

1. Escolher uma aplicação hospedada sem autenticação sensível.
2. Registrar somente quais APIs globais estão ausentes, sem coletar segredos.
3. Criar um preload experimental separado e sem IPC privilegiado.
4. Implementar apenas os mocks comprovadamente necessários.
5. Manter a experiência atual de streaming como fallback.
6. Testar navegação, lifecycle, memória e fechamento repetido.
7. Revisar a fronteira de segurança antes de adicionar rede, autenticação ou persistência.
8. Só promover a experiência depois de testes no hardware e de documentação da compatibilidade real.

## Questões Em Aberto

- Quais aplicações hospedadas continuam acessíveis fora de uma TV webOS real?
- Quais APIs Luna são realmente exigidas por cada aplicação?
- A identidade do FIFOtv atual é suficiente ou precisa ser isolada por tipo de app?
- Como separar cookies e armazenamento sem quebrar a sessão compartilhada dos streamings atuais?
- Como representar device ID sem imitar identificadores reais de fabricantes?
- Como oferecer áudio e lifecycle sem ampliar a superfície IPC da página externa?
- Qual é o custo de memória de uma camada adicional no hardware alvo?
- Quais providers permitem esse tipo de integração?

## Critério Para Sair De Pesquisa

Esta pesquisa só deve virar plano de implementação quando existirem:

- Um app candidato e URL reproduzível.
- Evidência das APIs ausentes.
- Escopo mínimo da camada de compatibilidade.
- Modelo de segurança aprovado.
- Estratégia de persistência sem segredos no checkout.
- Checklist de navegação, fechamento, autenticação quando aplicável e uso de recursos.
- Decisão explícita de produto.

## Referências

- [webOS TV Developer](https://webostv.developer.lge.com/)
- [OAuth 2.0 Device Authorization Grant](https://www.rfc-editor.org/rfc/rfc8628)
- [Electron WebContentsView](https://www.electronjs.org/docs/latest/api/web-contents-view)
- [Electron Debugger](https://www.electronjs.org/docs/latest/api/debugger)
- [WICG Spatial Navigation](https://github.com/WICG/spatial-navigation)
