#!/bin/bash
# ╔══════════════════════════════════════════════════════════╗
# ║  FIFOtv — Setup (instalação de pacotes)                 ║
# ║  Rodar como root após instalação mínima do Debian 13    ║
# ╚══════════════════════════════════════════════════════════╝
set -euo pipefail

printf '%s\n' 'ERRO: setup legado desativado; consulte electron-foundation-before-repository-cleanup.' >&2
exit 1

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}[FIFOtv]${NC} $1"; }
ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERRO]${NC} $1"; }

if [ "$(id -u)" -ne 0 ]; then
    err "Execute como root: sudo bash setup.sh"
    exit 1
fi

log "=== FIFOtv — Instalação de Pacotes ==="
echo ""

# ─── 1. ATUALIZAR SISTEMA ───────────────────────────────
log "Atualizando listas de pacotes..."
apt-get update -qq
ok "Listas atualizadas"

log "Atualizando pacotes instalados..."
apt-get upgrade -y -qq
ok "Sistema atualizado"

# ─── 2. XORG + WINDOW MANAGER ──────────────────────────
log "Instalando Xorg + Openbox..."
apt-get install -y -qq xorg xinit openbox
ok "Xorg + Openbox instalados"

# ─── 3. NAVEGADOR ──────────────────────────────────────
log "Instalando Chromium..."
apt-get install -y -qq chromium
ok "Chromium instalado"

# ─── 4. ÁUDIO (PipeWire) ───────────────────────────────
log "Instalando PipeWire (áudio)..."
apt-get install -y -qq pipewire pipewire-pulse wireplumber
ok "PipeWire instalado"

# ─── 5. BLUETOOTH ──────────────────────────────────────
log "Instalando Bluetooth..."
apt-get install -y -qq bluez bluez-tools libspa-0.2-bluetooth
ok "Bluetooth instalado"

# ─── 6. WI-FI ──────────────────────────────────────────
log "Instalando NetworkManager + Wi-Fi..."
apt-get install -y -qq network-manager iw
ok "NetworkManager instalado"

# ─── 7. PYTHON ─────────────────────────────────────────
log "Instalando Python3 + pip..."
apt-get install -y -qq python3 python3-pip python3-venv
ok "Python3 instalado"

log "Instalando Flask..."
pip3 install --break-system-packages flask
ok "Flask instalado"

# ─── 8. UTILITÁRIOS ────────────────────────────────────
log "Instalando utilitários..."
    apt-get install -y -qq xdotool unclutter curl wget
ok "Utilitários instalados"

# ─── 9. SISTEMA ────────────────────────────────────────
log "Instalando SSH + git + monitoramento..."
apt-get install -y -qq openssh-server git procps
ok "Sistema instalado"

# ─── 10. BOOT SPLASH ───────────────────────────────────
log "Instalando ferramentas de boot splash..."
apt-get install -y -qq imagemagick fbi
ok "Boot splash tools instalados"

# ─── 11. OPENCODE ──────────────────────────────────────
log "Instalando OpenCode..."

# Instalar Node.js (necessário para opencode)
if ! command -v node &>/dev/null; then
    log "Instalando Node.js..."
    apt-get install -y -qq curl nodejs npm
    ok "Node.js instalado"
fi

# Instalar opencode via script oficial
if ! command -v opencode &>/dev/null; then
    log "Baixando e instalando opencode..."
    curl -fsSL https://opencode.ai/install | bash
    ok "OpenCode instalado"
else
    ok "OpenCode já instalado"
fi

# ─── 12. HABILITAR SERVIÇOS ────────────────────────────
log "Habilitando serviços..."

systemctl enable bluetooth 2>/dev/null && ok "Bluetooth habilitado" || warn "Falha ao habilitar bluetooth"

systemctl enable NetworkManager 2>/dev/null && ok "NetworkManager habilitado" || warn "Falha ao habilitar NetworkManager"

systemctl enable ssh 2>/dev/null && ok "SSH habilitado" || warn "Falha ao habilitar SSH"

# ─── RESUMO ────────────────────────────────────────────
echo ""
log "=== Instalação de pacotes concluída ==="
echo ""
echo "Pacotes instalados:"
echo "  • Xorg + Openbox"
echo "  • Chromium"
echo "  • PipeWire (áudio)"
echo "  • BlueZ (Bluetooth)"
echo "  • NetworkManager (Wi-Fi)"
echo "  • Python3 + Flask"
echo "  • xdotool"
echo "  • OpenSSH + git"
echo "  • ImageMagick + fbi (boot splash)"
echo "  • OpenCode (AI coding agent)"
echo ""
log "Próximo passo: sudo bash configure.sh"
