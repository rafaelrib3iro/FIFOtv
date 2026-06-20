#!/bin/bash
# ╔══════════════════════════════════════════════════════════╗
# ║  FIFOtv — Install (instalacao completa automatizada)     ║
# ║  Rodar como root no Debian 13 recem-instalado           ║
# ╚══════════════════════════════════════════════════════════╝
set -euo pipefail

cleanup() {
    local exit_code=$?
    if [ "$exit_code" -ne 0 ]; then
        echo -e "\n${YELLOW}[WARN]${NC} Instalacao falhou (exit code: $exit_code)"
        echo -e "${YELLOW}[WARN]${NC} Service sera removido para evitar loop..."
        rm -f /etc/systemd/system/multi-user.target.wants/fifo-tv-installer.service 2>/dev/null || true
        rm -f /etc/systemd/system/fifo-tv-installer.service 2>/dev/null || true
        systemctl daemon-reload 2>/dev/null || true
    fi
}
trap cleanup EXIT

AUTO_MODE=false
for arg in "$@"; do
    if [ "$arg" = "--auto" ]; then
        AUTO_MODE=true
    fi
done

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log()  { echo -e "${CYAN}[FIFOtv]${NC} $1"; }
ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERRO]${NC} $1"; }
step() { echo -e "\n${BOLD}=== PASSO $1: $2 ===${NC}\n"; }

if [ "$(id -u)" -ne 0 ]; then
    err "Execute como root: sudo bash install.sh"
    exit 1
fi

if [ -f /etc/fifo-tv-ready ]; then
    log "FIFOtv ja esta instalado. Pulando."
    exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ -f "$SCRIPT_DIR/setup.sh" ]; then
    INSTALL_DIR="$SCRIPT_DIR"
elif [ -f "./setup.sh" ]; then
    INSTALL_DIR="."
else
    err "Scripts de instalacao nao encontrados."
    exit 1
fi

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║   FIFOtv — Instalacao Automatica                       ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$AUTO_MODE" = false ]; then
    echo -e "${YELLOW}Este script ira:${NC}"
    echo "  1. Instalar pacotes (Xorg, Openbox, Chromium, etc)"
    echo "  2. Configurar sistema (autologin, X, Openbox)"
    echo "  3. Deploy do projeto Smart TV"
    echo ""
    read -p "Continuar? (s/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        warn "Cancelado."
        exit 0
    fi
else
    log "Modo automatico"
fi

step 1 "Configuracao de Wi-Fi"
if [ -f "$INSTALL_DIR/wifi-setup.sh" ]; then
    bash "$INSTALL_DIR/wifi-setup.sh" || warn "Wi-Fi setup retornou erros"
else
    warn "wifi-setup.sh nao encontrado"
fi

step 2 "Instalacao de Pacotes"
if [ -f "$INSTALL_DIR/setup.sh" ]; then
    bash "$INSTALL_DIR/setup.sh"
else
    err "setup.sh nao encontrado"
    exit 1
fi

step 3 "Configuracao do Sistema"
if [ -f "$INSTALL_DIR/configure.sh" ]; then
    bash "$INSTALL_DIR/configure.sh"
else
    err "configure.sh nao encontrado"
    exit 1
fi

step 4 "Deploy do Projeto"
if [ -f "$INSTALL_DIR/deploy.sh" ]; then
    bash "$INSTALL_DIR/deploy.sh" || warn "Deploy retornou erros (pode ser normal)"
else
    warn "deploy.sh nao encontrado — arquivos ja devem estar no lugar"
fi

step 5 "Pos-Instalacao"

log "Limpando cache do apt..."
apt-get clean -qq 2>/dev/null || true
apt-get autoremove -y -qq 2>/dev/null || true
ok "Cache limpo"

step 6 "Finalizacao"

touch /etc/fifo-tv-ready
ok "Flag /etc/fifo-tv-ready criada"

if [ -f /etc/systemd/system/fifo-tv-installer.service ]; then
    systemctl disable fifo-tv-installer.service 2>/dev/null || true
    rm -f /etc/systemd/system/fifo-tv-installer.service
    rm -f /etc/systemd/system/multi-user.target.wants/fifo-tv-installer.service
    systemctl daemon-reload 2>/dev/null || true
    ok "Service fifo-tv-installer removido"
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         INSTALACAO CONCLUIDA!                           ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$AUTO_MODE" = true ]; then
    log "Reiniciando em 5 segundos..."
    sleep 5
    reboot
fi
