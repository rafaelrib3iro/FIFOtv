#!/bin/bash
# ╔══════════════════════════════════════════════════════════╗
# ║  FIFOtv — Configure (configuração do sistema)           ║
# ║  Rodar como root após setup.sh                          ║
# ╚══════════════════════════════════════════════════════════╝
set -euo pipefail

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
    err "Execute como root: sudo bash configure.sh"
    exit 1
fi

TV_USER="tv"
TV_HOME="/home/$TV_USER"
PROJECT_DIR="$TV_HOME/smarttv"

log "=== FIFOtv — Configuração do Sistema ==="
echo ""

# ─── 1. CRIAR USUÁRIO TV ───────────────────────────────
log "Configurando usuário '$TV_USER'..."

if id "$TV_USER" &>/dev/null; then
    ok "Usuário '$TV_USER' já existe"
else
    useradd -m -s /bin/bash "$TV_USER"
    echo "$TV_USER:fifotv" | chpasswd
    ok "Usuário '$TV_USER' criado (senha: fifotv)"
fi

# ─── 2. AUTOLOGIN NO TTY1 ─────────────────────────────
log "Configurando autologin no TTY1..."

AUTOLDIR="/etc/systemd/system/getty@tty1.service.d"
mkdir -p "$AUTOLDIR"

cat > "$AUTOLDIR/autologin.conf" << 'EOF'
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin tv --noclear %I $TERM
EOF

ok "Autologin TTY1 configurado"

# ─── 3. AUTO-STARTX NO LOGIN ───────────────────────────
log "Configurando auto-startx..."

cat > "$TV_HOME/.bash_profile" << 'BASHEOF'
# Inicia o Xorg automaticamente se estiver no TTY1
if [ -z "$DISPLAY" ] && [ "$(tty)" = "/dev/tty1" ]; then
    startx
fi
BASHEOF

chown "$TV_USER:$TV_USER" "$TV_HOME/.bash_profile"
ok "Auto-startx configurado"

# ─── 4. XINITRC ────────────────────────────────────────
log "Copiando .xinitrc..."

cat > "$TV_HOME/.xinitrc" << 'XINEOF'
#!/bin/bash

xset s off
xset +dpms
xset dpms 0 0 3600
xset s noblank

feh --bg-scale /home/tv/smarttv/frontend/assets/splash-bg.png &

/home/tv/smarttv/system/scripts/bluetooth-watch.sh &

cd /home/tv/smarttv/backend && python3 app.py &

sleep 3

openbox-session &

sleep 1

chromium \
  --app=http://localhost:5000 \
  --kiosk \
  --no-first-run \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --autoplay-policy=no-user-gesture-required \
  --enable-spatial-navigation \
  --lang=pt-BR \
  --disable-features=Translate,TranslateUI,AutomationControlled \
  --disable-blink-features=AutomationControlled \
  --load-extension=/home/tv/smarttv/frontend/extensions/tv-override \
  --user-agent="Mozilla/5.0 (SMART-TV; Linux; Tizen 6.5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36" &

wait
XINEOF

chmod +x "$TV_HOME/.xinitrc"
chown "$TV_USER:$TV_USER" "$TV_HOME/.xinitrc"
ok ".xinitrc configurado"

# ─── 5. OPENBOX RC.XML ────────────────────────────────
log "Configurando Openbox rc.xml..."

OB_DIR="$TV_HOME/.config/openbox"
mkdir -p "$OB_DIR"

cat > "$OB_DIR/rc.xml" << 'OBEOF'
<?xml version="1.0" encoding="UTF-8"?>
<openbox_config xmlns="http://openbox.org/3.4/rc">
  <applications>
    <application class="Chromium">
      <maximized>yes</maximized>
      <decor>no</decor>
      <focus>yes</focus>
    </application>
  </applications>
</openbox_config>
OBEOF

chown -R "$TV_USER:$TV_USER" "$TV_HOME/.config"
ok "Openbox rc.xml configurado"

# ─── 5b. CHROMIUM POLICIES ────────────────────────────────
log "Configurando políticas do Chromium..."

CHROMIUM_POLICY_DIR="/etc/chromium/policies/managed"
mkdir -p "$CHROMIUM_POLICY_DIR"

cat > "$CHROMIUM_POLICY_DIR/no-context-menu.json" << 'CHREOF'
{
  "ContextMenuEnabled": false
}
CHREOF

ok "Chromium context menu desabilitado via policy"

# ─── 6. ANTI-SLEEP (LOGIND) ────────────────────────────
log "Configurando logind anti-sleep..."

cat > /etc/systemd/logind.conf << 'LOGEOF'
[Login]
HandleLidSwitch=ignore
HandleSuspendKey=ignore
HandleHibernateKey=ignore
HandleLidSwitchExternalPower=ignore
IdleAction=ignore
IdleActionSec=infinity
LOGEOF

ok "logind.conf configurado (anti-sleep)"

# ─── 7. DISPLAY MANAGER DESABILITADO ──────────────────
log "Garantindo que nenhum Display Manager interfere..."

for dm in gdm3 lightdm lxdm sddm nodm; do
    systemctl disable "$dm" 2>/dev/null && ok "DM '$dm' desabilitado" || true
done

ok "Nenhum Display Manager ativo (Xorg via .xinitrc)"

# ─── 7b. GRUB — BOOT RÁPIDO ─────────────────────────────
log "Configurando GRUB para boot rápido..."

GRUB_FILE="/etc/default/grub"
if [ -f "$GRUB_FILE" ]; then
    sed -i 's/^GRUB_TIMEOUT=.*/GRUB_TIMEOUT=0/' "$GRUB_FILE"
    grep -q '^GRUB_HIDDEN_TIMEOUT=' "$GRUB_FILE" && \
        sed -i 's/^GRUB_HIDDEN_TIMEOUT=.*/GRUB_HIDDEN_TIMEOUT=0/' "$GRUB_FILE" || \
        echo 'GRUB_HIDDEN_TIMEOUT=0' >> "$GRUB_FILE"
    sed -i 's/^GRUB_CMDLINE_LINUX_DEFAULT=.*/GRUB_CMDLINE_LINUX_DEFAULT="quiet loglevel=0 rd.systemd.show_status=false"/' "$GRUB_FILE"
    update-grub 2>/dev/null && ok "GRUB configurado (timeout=0, sem mensagens de boot)" || warn "Falha ao atualizar GRUB"
else
    warn "Arquivo /etc/default/grub não encontrado"
fi

# ─── 8. BOOT SPLASH SERVICE ───────────────────────────
log "Instalando serviço de boot splash..."

SPLASH_SERVICE="/etc/systemd/system/fifotv-splash.service"
cat > "$SPLASH_SERVICE" << 'SPLEOF'
[Unit]
Description=FIFOtv Boot Splash
After=sysinit.target
Before=display-manager.service

[Service]
Type=oneshot
ExecStart=/home/tv/smarttv/system/splash/boot-splash.sh
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
SPLEOF

chmod 644 "$SPLASH_SERVICE"
systemctl daemon-reload
systemctl enable fifotv-splash 2>/dev/null && ok "Boot splash service habilitado" || warn "Falha ao habilitar boot splash"

# ─── 9. PERMISSÕES ─────────────────────────────────────
log "Configurando permissões..."

chown -R "$TV_USER:$TV_USER" "$TV_HOME"
chmod +x "$TV_HOME/smarttv/system/scripts/"*.sh 2>/dev/null || true
chmod +x "$TV_HOME/smarttv/system/splash/"*.sh 2>/dev/null || true

ok "Permissões configuradas"

# ─── 10. OPENCODE CONFIG ───────────────────────────────
log "Configurando OpenCode..."

OPENCODE_DIR="$TV_HOME/.config/opencode"
mkdir -p "$OPENCODE_DIR"

# Criar config básico do opencode
cat > "$OPENCODE_DIR/config.json" << 'OCEOF'
{
  "server": {
    "port": 3000,
    "hostname": "0.0.0.0"
  }
}
OCEOF

chown -R "$TV_USER:$TV_USER" "$TV_HOME/.config"
ok "OpenCode configurado (porta 3000)"

# ─── 11. HIDE MOUSE CURSOR GLOBALMENTE ─────────────────
log "Configurando ocultação do cursor..."

mkdir -p /etc/X11/xorg.conf.d
cat > /etc/X11/xorg.conf.d/10-no-cursor.conf << 'CURSEOF'
Section "InputClass"
    Identifier "cursor"
    MatchIsPointer "on"
    Option "ZAxisMapping" "4 5"
EndSection
CURSEOF

ok "Cursor configurado"

# ─── RESUMO ────────────────────────────────────────────
echo ""
log "=== Configuração do sistema concluída ==="
echo ""
echo "Configurações aplicadas:"
echo "  • Usuário '$TV_USER' (senha: fifotv)"
echo "  • Autologin TTY1"
echo "  • Auto-startx no login"
echo "  • .xinitrc com Chromium + Openbox"
echo "  • Openbox rc.xml (Chromium fullscreen)"
echo "  • logind.conf (anti-sleep)"
echo "  • Boot splash service"
echo "  • OpenCode config (porta 3000)"
echo "  • Nenhum Display Manager"
echo ""
log "Próximo passo: sudo bash deploy.sh"
