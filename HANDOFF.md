# FIFOtv — Handoff Document

## Contexto do Projeto

Smart TV kiosk para **Positivo Union UD3630** (all-in-one Debian 13 + Openbox + Chromium + Flask backend). O projeto transforma um PC all-in-one numa Smart TV com interface de tiles de streaming, navegação por D-pad/controle remoto, e backend Flask pra gerenciar streamings, Wi-Fi, Bluetooth, e configurações.

## Status Atual

### ✅ Funcionando
- Instalação Debian via ISO customizada (preseed + auto-install)
- Frontend: Grid 6×2 de streamings, Mais Usados, D-pad navigation, context menu, settings popup (7 seções), splash screen, notificações toast, relógio/data, screen saver 15min, DPMS 30min
- Backend: Flask com endpoints de streamings CRUD, volume, system info/stats, remote access (opencode web)
- Wi-Fi: Conexão e persistência via NetworkManager funcionando
- OpenCode: Instalado e configurado (porta 3000)

### 🔴 Pendente (ver plan bugfixes-v1)

| # | Problema | Arquivos | Prioridade |
|---|----------|----------|------------|
| 1 | **Botões Sistema não funcionam** — fetch() sem method POST | `frontend/script.js` linhas 725-728 | Alta |
| 2 | **Reiniciar Chromium não reinicia Flask** — flags incompletos | `backend/app.py` linha 199-214 | Alta |
| 3 | **Bluetooth não conecta** — hcitool vs bluetoothctl, BlueZ 5.82 | `backend/app.py` linhas 247-325 | Alta |
| 4 | **Air mouse BLE não aparece** — precisa de BLE scan | `backend/app.py` bt_scan | Alta |
| 5 | **D-pad nos popups quebrado** — navegação no conteúdo | `frontend/script.js` handleSettingsNav | Alta |
| 6 | **Chromium não reinicia sozinho** — sem watch/recovery | Novo service ou thread daemon | Alta |
| 7 | **YouTube não abre modo TV** — precisa /tv ou ?app=1 | `frontend/script.js` activateCard | Média |
| 8 | **Faixa 30px inferior** — 100vh incompleto | `frontend/style.css` | Média |
| 9 | **Popup senha Wi-Fi** — substituir prompt() nativo | `frontend/script.js` connectWifi | Média |
| 10 | **Reiniciar Chromium precisa reiniciar Flask** | `backend/app.py` restart-chromium | Alta |
| 11 | **Menu de contexto FIFOtv não aparece em alguns lugares** — menu nativo do Chromium aparece ao invés do custom | `frontend/script.js` contextmenu listener | Alta |

## Arquitetura

```
/home/tv/smarttv/
├── backend/
│   ├── app.py              # Flask (porta 5000)
│   ├── streamings.json     # Dados dos streamings
│   └── requirements.txt    # flask
├── frontend/
│   ├── index.html          # Home com grid + header + context menu
│   ├── script.js           # Toda a lógica (D-pad, popups, APIs)
│   ├── style.css           # Glassmorphism, tokens, layout
│   ├── splash.html         # Tela de boot
│   └── assets/             # fonts/, icons/, sounds/
└── system/
    ├── .xinitrc             # Auto-start X + Chromium + Flask
    ├── openbox/rc.xml       # Maximize Chromium
    ├── scripts/
    │   ├── bluetooth-watch.sh
    │   ├── startup.sh
    │   └── wifi-setup.sh   # Conexão Wi-Fi interativa
    └── install/
        ├── install.sh       # Orquestrador (--auto mode)
        ├── setup.sh         # Pacotes apt + pip + opencode
        ├── configure.sh     # Autologin, xinitrc, openbox, policies
        ├── deploy.sh        # Cópia de arquivos
        └── wifi-setup.sh   # Setup Wi-Fi no primeiro boot
```

## Endpoints do Backend

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/streamings` | Lista streamings |
| POST | `/api/streamings` | Adicionar streaming |
| PUT | `/api/streamings/<id>` | Editar streaming |
| DELETE | `/api/streamings/<id>` | Remover streaming |
| POST | `/api/streamings/reorder` | Reordenar |
| GET | `/api/system/volume` | Volume atual |
| POST | `/api/system/volume` | Setar volume |
| GET | `/api/system/info` | IP + hostname |
| GET | `/api/system/stats` | CPU/RAM/disk/temp |
| POST | `/api/system/shutdown` | Desligar |
| POST | `/api/system/reboot` | Reiniciar |
| POST | `/api/system/restart-chromium` | Reiniciar Chromium |
| POST | `/api/system/update` | Git pull |
| GET | `/api/bluetooth/status` | Status BT |
| GET | `/api/bluetooth/scan` | Scan dispositivos |
| POST | `/api/bluetooth/connect` | Conectar device |
| POST | `/api/bluetooth/disconnect` | Desconectar device |
| GET | `/api/wifi/status` | Status Wi-Fi |
| GET | `/api/wifi/scan` | Scan redes |
| POST | `/api/wifi/connect` | Conectar rede |
| GET/POST | `/api/remote/status` | Status opencode |
| GET/POST | `/api/remote/toggle` | Toggle opencode |
| POST | `/api/browser/clear-cache` | Limpar cache |

## Configurações Importantes

- **Usuário:** tv / fifotv
- **SSH:** tv@IP_DA_MAQUINA / senha fifotv
- **IP atual:** 192.168.1.7 (muda com DHCP)
- **Wi-Fi:** Jackeline_5G / abracadabra
- **Flask:** http://localhost:5000
- **OpenCode web:** porta 3000
- **User-Agent:** CrOS Chrome/132

## Bugs Conhecidos Detalhados

### Botões do Menu Sistema
Os botões usam `onclick="fetch('${BASE_URL}/api/system/shutdown')"` sem `{method: 'POST'}`. O fetch() por padrão faz GET, mas os endpoints são `methods=['POST']`. Solução: adicionar `{method:'POST', headers:{'Content-Type':'application/json'}}` em todos.

### Bluetooth (BlueZ 5.82)
- `bluetoothctl paired-devices` **não existe** nesta versão
- `hcitool scan` descobre dispositivos mas `bluetoothctl` não os conhece (databases separados)
- `bluetoothctl pair <mac>` retorna "Device not available" se o device não foi descoberto pelo scan do bluetoothctl
- Solução: usar `pexpect` com PTY pra rodar `bluetoothctl` interativamente, fazendo scan on → wait → scan off → pair → trust → connect numa sessão
- Air mouse provavelmente usa BLE — `hcitool scan` não detecta. Usar `bluetoothctl scan on` que pega BLE também

### D-pad nos Popups
`handleSettingsNav` só gerencia sidebar (ArrowUp/ArrowDown = trocar seção, ArrowRight = focar conteúdo). Quando foca no conteúdo, ArrowDown/ArrowUp não tem handler e o event não é prevenido — o foco vai pro body e a sidebar reativa.

### Chromium Watch
Não existe mecanismo de recovery. Se o Chromium crashar ou for fechado, o usuário fica no desktop do Openbox sem Smart TV. Opções: systemd service que monitora, ou thread daemon no Flask.

### YouTube Mode TV
URL correta: `https://youtube.com/tv` força interface de TV com navegação por controles.

### Faixa Inferior
Possíveis causas: body com margin/padding, glassmorphism com overflow:hidden incompleto, ou viewport height não preenchendo. Investigar no style.css se html,body e .home-container estão com height:100vh correto.

### Menu de Contexto Customizado
O listener `document.addEventListener('contextmenu')` com `e.preventDefault()` deveria capturar todos os cliques da direita e mostrar o menu customizado do FIFOtv. Em alguns cenários, o menu nativo do Chromium aparece ao invés do custom. Possíveis causas: elementos que capturam o evento antes de propagar (como `<input>`, `<textarea>`, `<a>`, `<button>`), iframes com contexto próprio, ou o Chromium em modo kiosk ignorando `preventDefault` em certos contexts. Solução: garantir que o listener seja o mais externo possível, usar `pointer-events` adequados, e considerar um `capture:true` no listener para interceptar antes de qualquer handler interno.

## Senha do Host

- **sudo password:** 9632
- **User:** rafael

## ISO

- Localização: `/home/rafael/Documentos/Custom SmartTV/fifo-tv-installer.iso` (942M)
- Cópia no Ventoy: `/run/media/rafael/Ventoy/fifo-tv-installer.iso`
- Source ISO: `/run/media/rafael/Ventoy/debian-13.5.0-amd64-netinst.iso`
