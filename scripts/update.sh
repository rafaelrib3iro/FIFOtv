#!/bin/bash
# FIFOtv v2 — Script de atualização
# Executado pelo botão "Atualizar App" no settings
# Output: linhas JSON para o frontend parsear

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR" || { echo '{"ok":false,"error":"Diretório do projeto não encontrado"}'; exit 1; }

step() { echo "{\"step\":\"$1\"}"; }
ok()   { echo "{\"ok\":true,\"message\":\"$1\"}"; }
fail() { echo "{\"ok\":false,\"error\":\"$1\"}"; exit 1; }

# ─── 1. GIT PULL ──────────────────────────────────────────
step "Baixando atualizações..."
if ! git pull origin electron 2>&1 | tail -1; then
  fail "Falha ao baixar código (verifique a conexão)"
fi

# Verificar se houve mudanças
CHANGES=$(git diff HEAD@{1} --name-only 2>/dev/null || echo "")

# ─── 2. NPM INSTALL ───────────────────────────────────────
step "Instalando dependências npm..."
if ! npm install 2>&1 | tail -1; then
  fail "Falha ao instalar dependências npm"
fi

# ─── 3. PACOTES DO SISTEMA ────────────────────────────────
step "Verificando pacotes do sistema..."

APT_PACKAGES=(
  xorg xinit x11-xserver-utils unclutter
  nodejs npm
  pipewire pipewire-pulse wireplumber
  bluez libspa-0.2-bluetooth
  network-manager
  git procps
)

MISSING=()
for pkg in "${APT_PACKAGES[@]}"; do
  if ! dpkg -l 2>/dev/null | grep -q "^ii  $pkg "; then
    # dpkg -l mostra "ii" pra pacotes instalados
    # Mas nomes podem ter variantes (ex: libasound2t64 vs libasound2)
    if ! dpkg -s "$pkg" &>/dev/null; then
      MISSING+=("$pkg")
    fi
  fi
done

if [ ${#MISSING[@]} -gt 0 ]; then
  echo "{\"step\":\"Instalando pacotes: ${MISSING[*]}\"}"
  if ! sudo apt-get install -y -qq "${MISSING[@]}" 2>&1 | tail -3; then
    fail "Falha ao instalar pacotes do sistema: ${MISSING[*]}"
  fi
fi

# ─── 4. SYSTEMD SERVICE ───────────────────────────────────
step "Verificando service do systemd..."
if ! sudo cp system/fifotv.service /etc/systemd/system/ 2>/dev/null; then
  fail "Falha ao copiar service"
fi
sudo systemctl daemon-reload 2>/dev/null
sudo systemctl enable fifotv.service 2>/dev/null

# ─── 5. XINITRC ───────────────────────────────────────────
step "Verificando .xinitrc..."
XINITRC_CONTENT='#!/bin/bash
# FIFOtv v2 — Xorg setup only (Electron starts via systemd)
xset s off
xset -dpms
xset s noblank
unclutter -idle 3 &
exec sleep infinity'

if [ "$(cat /home/tv/.xinitrc 2>/dev/null)" != "$XINITRC_CONTENT" ]; then
  echo "$XINITRC_CONTENT" > /home/tv/.xinitrc
  chmod +x /home/tv/.xinitrc
fi

# ─── 6. CURSOR THEME ──────────────────────────────────────
step "Instalando cursor theme..."
CURSOR_DIR="/home/tv/.local/share/icons/fifotv"
mkdir -p "$CURSOR_DIR/cursors"
cp system/cursors/fifotv/index.theme "$CURSOR_DIR/"
cp system/cursors/fifotv/cursors/left_ptr "$CURSOR_DIR/cursors/"

# ─── 7. SERVIÇOS V1 (desabilitar se existirem) ────────────
step "Limpando serviços v1..."
for svc in flask-fifotv openbox-fifotv fifotv-splash; do
  sudo systemctl stop "$svc" 2>/dev/null || true
  sudo systemctl disable "$svc" 2>/dev/null || true
done

ok "Atualização concluída!"
