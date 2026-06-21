#!/bin/bash
# FIFOtv update script
# Pulls latest changes, installs dependencies, reinstalls service

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR" || exit 1

echo "[FIFOtv] Atualizando..."
git pull origin electron

echo "[FIFOtv] Instalando dependências npm..."
npm install

echo "[FIFOtv] Verificando pacotes do sistema..."
if ! dpkg -l | grep -q 'libspa-0.2-bluetooth'; then
  echo "[FIFOtv] Instalando libspa-0.2-bluetooth (áudio Bluetooth)..."
  sudo apt-get install -y -qq libspa-0.2-bluetooth
fi

echo "[FIFOtv] Atualizando service do systemd..."
sudo cp system/fifotv.service /etc/systemd/system/
sudo systemctl daemon-reload

echo "[FIFOtv] Reiniciando FIFOtv..."
sudo systemctl restart fifotv

echo "[FIFOtv] Atualização concluída!"
