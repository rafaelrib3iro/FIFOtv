#!/bin/bash
# update.sh — Migra FIFOtv v1 → v2 (Electron)
# Execute no all-in-one: bash update.sh
set -e

echo "========================================="
echo "  FIFOtv — Atualização v1 → v2"
echo "========================================="
echo ""

PROJ_DIR="/home/tv/smarttv"

# 1. Verifica se tá no diretório certo
if [ ! -f "$PROJ_DIR/package.json" ]; then
  echo "[ERRO] Repositório não encontrado em $PROJ_DIR"
  exit 1
fi

cd "$PROJ_DIR"

# 2. Puxa o código novo (branch electron)
echo "[1/7] Puxando branch electron..."
git fetch origin
git checkout electron
git pull origin electron
echo "  OK"

# 3. Instala dependências (Electron, dbus-next)
echo "[2/7] Instalando dependências npm..."
npm install
echo "  OK"

# 4. Atualiza .xinitrc (só xset, sem Flask/Openbox/Chromium)
echo "[3/7] Atualizando .xinitrc..."
cat > /home/tv/.xinitrc << 'XINITRC'
#!/bin/bash
# FIFOtv v2 — Xorg setup only (Electron starts via systemd)
xset s off
xset -dpms
xset s noblank
exec sleep infinity
XINITRC
chmod +x /home/tv/.xinitrc
echo "  OK"

# 5. Instala service do systemd
echo "[4/7] Instalando service systemd..."
sudo cp "$PROJ_DIR/system/fifotv.service" /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable fifotv.service
echo "  OK"

# 6. Desabilita serviços do v1
echo "[5/7] Desabilitando serviços do v1..."
sudo systemctl stop flask-fifotv 2>/dev/null || true
sudo systemctl disable flask-fifotv 2>/dev/null || true
sudo systemctl stop openbox-fifotv 2>/dev/null || true
sudo systemctl disable openbox-fifotv 2>/dev/null || true
sudo systemctl disable fifotv-splash 2>/dev/null || true
echo "  OK"

# 7. Limpa processos antigos
echo "[6/7] Limpando processos do v1..."
pkill -f "python3 app.py" 2>/dev/null || true
pkill -f "chromium" 2>/dev/null || true
pkill -f "openbox" 2>/dev/null || true
echo "  OK"

# 8. Reinicia
echo "[7/7] Reiniciando..."
echo ""
echo "========================================="
echo "  Atualização concluída!"
echo "  O PC vai reiniciar agora."
echo "  Após reiniciar, o FIFOtv v2 inicia"
echo "  automaticamente via systemd."
echo "========================================="
echo ""
sudo reboot
