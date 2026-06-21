# FIFOtv v2 — Lista de Dependências

Referência para instalação e atualização automática.

## Pacotes do sistema (apt-get)

### Runtime

| Pacote | Categoria | Motivo |
|--------|-----------|--------|
| `xorg` | Display | Servidor X11 |
| `xinit` | Display | `startx` via `.xinitrc` |
| `x11-xserver-utils` | Display | `xset` (desabilita screensaver/DPMS) |
| `nodejs` (≥22) | Runtime | Node.js para Electron (`npm start`) |
| `npm` | Runtime | Gerenciador de pacotes Node.js |

### Áudio

| Pacote | Categoria | Motivo |
|--------|-----------|--------|
| `pipewire` | Áudio | Servidor de áudio |
| `pipewire-pulse` | Áudio | Compatibilidade PulseAudio |
| `wireplumber` | Áudio | Fornece `wpctl` (controle de volume) |

### Bluetooth

| Pacote | Categoria | Motivo |
|--------|-----------|--------|
| `bluez` | Bluetooth | Daemon BlueZ (D-Bus `org.bluez`) |
| `libspa-0.2-bluetooth` | Bluetooth/Áudio | Codecs Bluetooth para PipeWire |

### Rede

| Pacote | Categoria | Motivo |
|--------|-----------|--------|
| `network-manager` | Rede | Fornece `nmcli` (Wi-Fi) |

### Sistema

| Pacote | Categoria | Motivo |
|--------|-----------|--------|
| `git` | Sistema | Para updates (`git pull`) |
| `procps` | Sistema | `free` (stats de RAM) |
| `dpkg` | Sistema | Verificação de pacotes |
| `openssh-server` | SSH | Acesso remoto para manutenção |

### Bibliotecas compartilhadas (Electron)

| Pacote | Motivo |
|--------|--------|
| `libgtk-3-0` | GTK3 (`--gtk-version 3`) |
| `libnss3` | Network Security Services (DRM/Widevine) |
| `libasound2t64` | ALSA (necessário mesmo com PipeWire) |
| `libxss1` | X11 screensaver extension |
| `libxtst6` | X11 test extension |
| `libatk-bridge2.0-0` | ATK accessibility bridge |
| `libdrm2` | Direct Rendering Manager |
| `libgbm1` | Generic Buffer Management (GPU) |
| `libpango-1.0-0` | Renderização de texto |
| `libcairo2` | Gráficos 2D |
| `libxcomposite1` | X11 composite extension |
| `libxdamage1` | X11 damage extension |
| `libxfixes3` | X11 fixes extension |
| `libxrandr2` | X11 RandR (resolução) |
| `libxkbcommon0` | Gerenciamento de teclado |
| `libatspi2.0-0` | AT-SPI2 accessibility |
| `libcups2` | CUPS printing support |
| `libdbus-1-3` | D-Bus (dbus-next) |
| `libx11-xcb1` | X11/XCB bridge |
| `libxcb-dri3-0` | XCB DRI3 (GPU) |

## Pacotes npm

| Pacote | Tipo | Obrigatório | Motivo |
|--------|------|-------------|--------|
| `dbus-next` | dependency | sim | Bluetooth via D-Bus |
| `electron` (castlabs v42) | devDependency | sim | Runtime com Widevine/DRM |
| `electron-builder` | devDependency | não | Só para build de .deb/.AppImage |

## Serviços systemd

| Serviço | Obrigatório | Motivo |
|---------|-------------|--------|
| `fifotv` | sim | Service principal (Electron) |
| `bluetooth` | sim | Daemon BlueZ |
| `NetworkManager` | sim | Daemon nmcli |

## Ferramentas externas

| Ferramenta | Como instala | Obrigatório | Motivo |
|------------|-------------|-------------|--------|
| `opencode` | `curl -fsSL https://opencode.ai/install \| bash` | não | Acesso remoto (feature opcional) |

## Pacotes v1 NÃO necessários no v2

| Pacote | Motivo da remoção |
|--------|-------------------|
| `openbox` | WM v1, Electron gerencia janelas |
| `chromium` | Browser v1, Electron tem Chromium embutido |
| `python3`, `python3-pip`, `python3-venv` | Backend v1 |
| `flask` | Backend v1 framework |
| `imagemagick` | Splash v1, v2 usa splash.html estático |
| `fbi` | Boot splash v1, v2 tem splash Electron |
| `xdotool` | Simulação teclado v1, v2 usa `globalShortcut` nativo |
| `unclutter` | Esconder cursor v1, v2 usa CSS cursor custom |
