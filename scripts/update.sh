#!/bin/bash
# FIFOtv update script
# Pulls latest changes and reinstalls dependencies

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR" || exit 1

echo "[FIFOtv] Atualizando..."
git pull origin electron

echo "[FIFOtv] Instalando dependências..."
npm install

echo "[FIFOtv] Atualização concluída!"
