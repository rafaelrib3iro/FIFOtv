---
plan name: bugfixes-v1
plan description: Correções pós-instalação all-in-one
plan status: archived
---

Este plano pertence à geração Flask/Chromium removida. Seu estado completo está preservado na tag `electron-foundation-before-repository-cleanup`.

## Idea
Corrigir todos os problemas encontrados após instalação no all-in-one Positivo UD3630: Bluetooth scan/conexão/status, botões do menu Sistema, D-pad navigation nos popups, watch do Chromium pra reiniciar automático, YouTube em modo TV, faixa inferior sem preencher, reiniciar Flask junto com Chromium, popup de senha Wi-Fi customizado, Air mouse BLE, e menu de contexto FIFOtv não aparecendo em alguns lugares.

## Implementation
- FIX backend: Botões do menu Sistema (shutdown/reboot/restart-chromium/update) usam fetch() sem {method:'POST'} mas os endpoints exigem POST — adicionar method:'POST' e headers Content-Type em todos os onclick do script.js
- FIX backend: restart-chromium precisa reiniciar o Flask (killall python3 + relançar) E usar os mesmos flags do .xinitrc (--noerrdialogs, --lang=pt-BR, --disable-features=Translate,TranslateUI, --user-agent CrOS). Atualizar tanto o endpoint quanto o .xinitrc
- FIX backend: Bluetooth — reescrever os 3 endpoints (status/scan/connect) do zero. Status: usar 'bluetoothctl info' listando paired-devices ou ler /var/lib/bluetooth/. Scan: usar 'bluetoothctl scan on' via pexpect com PTY pra funcionar corretamente, incluindo BLE scan. Connect: parear via bluetoothctl com scan+pair+trust+connect numa sessão pexpect. Instalar pexpect pro root
- FIX frontend: D-pad navigation nos popups — quando aperta ArrowRight na sidebar e foca no conteúdo (streamings/wifi/bt list), ArrowDown e ArrowUp precisam navegar entre os itens da lista, não voltar pra sidebar. Adicionar estado 'settings-item' no navState e handler handleSettingsItemNav com ArrowDown/ArrowUp pra navegar entre .streaming-item/.system-btn e ArrowLeft pra voltar à sidebar
- FIX frontend: Chrome watch — criar mecanismo no backend que monitora se o Chromium tá rodando (loop a cada 5s verificando 'pgrep chromium'). Se não tiver, relançar com os flags corretos. Implementar como thread daemon no Flask ou como systemd service separado
- FIX frontend: YouTube em modo TV — quando clica no card do YouTube, redirecionar pra youtube.com/tv ao invés de youtube.com. Modificar activateCard() ou adicionar campo 'tv_url' no streamings.json pro YouTube
- FIX frontend: Faixa inferior ~30px sem preencher — investigar se é gap entre body/html, se o glassmorphism tem padding, se o viewport height tá correto. Garantir que html,body{height:100%;margin:0;padding:0} e o container principal preenche 100vh
- FIX frontend: Popup de senha Wi-Fi customizado — ao invés de usar prompt() nativo do Chromium (que abre dialog feio), criar um modal FIFOtv com input de senha no estilo glassmorphism, com D-pad navigation e botão Conectar. Substituir a chamada prompt() na connectWifi()
- FIX frontend: Menu de contexto FIFOtv não aparece em alguns lugares — o listener document.addEventListener('contextmenu') com e.preventDefault() não está interceptando todos os eventos de clique da direita em certos elementos (inputs, botões, áreas específicas). Solução: usar capture:true no listener para interceptar antes de handlers internos, e garantir que nenhum elemento esteja chamando stopPropagation() no evento contextmenu
- Copiar todos os arquivos atualizados pro all-in-one via SCP, reiniciar Flask e testar cada correção
- Rebuild ISO com todas as correções pra instalação futura

## Required Specs
<!-- SPECS_START -->
<!-- SPECS_END -->
