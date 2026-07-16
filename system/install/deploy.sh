#!/bin/bash
# ╔══════════════════════════════════════════════════════════╗
# ║  FIFOtv — Deploy (cópia do projeto)                     ║
# ║  Rodar como root após configure.sh                      ║
# ╚══════════════════════════════════════════════════════════╝
set -euo pipefail

printf '%s\n' 'ERRO: deploy legado desativado; consulte electron-foundation-before-repository-cleanup.' >&2
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
    err "Execute como root: sudo bash deploy.sh"
    exit 1
fi

TV_USER="tv"
TV_HOME="/home/$TV_USER"
DEPLOY_DIR="$TV_HOME/smarttv"

log "=== FIFOtv — Deploy do Projeto ==="
echo ""

# ─── DETECTAR FONTE DOS ARQUIVOS ────────────────────────
# Se os arquivos ja estao no destino (copiados pelo preseed), pular copia
SKIP_COPY=false

if [ -f "$DEPLOY_DIR/backend/app.py" ] && [ -f "$DEPLOY_DIR/frontend/index.html" ]; then
    log "Arquivos ja detectados no destino — pulando copia"
    SKIP_COPY=true
    REPO_DIR="$DEPLOY_DIR"
else
    # Tentar encontrar o repo subindo diretorios
    SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
    REPO_DIR=""

    # Procurar por app.py e index.html subindo 4 niveis no max
    CHECK="$SCRIPT_DIR"
    for i in 1 2 3 4; do
        if [ -f "$CHECK/backend/app.py" ] && [ -f "$CHECK/frontend/index.html" ]; then
            REPO_DIR="$CHECK"
            break
        fi
        CHECK="$(dirname "$CHECK")"
    done

    if [ -z "$REPO_DIR" ]; then
        err "Nao encontrei os arquivos do projeto."
        exit 1
    fi
fi

log "Diretorio de origem: $REPO_DIR"
log "Destino: $DEPLOY_DIR"
echo ""

# ─── CRIAR DIRETORIO DE DESTINO ─────────────────────────
mkdir -p "$DEPLOY_DIR"

if [ "$SKIP_COPY" = false ]; then
    # ─── COPIAR BACKEND ─────────────────────────────────
    log "Copiando backend..."
    mkdir -p "$DEPLOY_DIR/backend"
    cp -r "$REPO_DIR/backend/"* "$DEPLOY_DIR/backend/"
    ok "Backend copiado ($(du -sh "$DEPLOY_DIR/backend" | cut -f1))"

    # ─── COPIAR FRONTEND ────────────────────────────────
    log "Copiando frontend..."
    mkdir -p "$DEPLOY_DIR/frontend"
    cp -r "$REPO_DIR/frontend/"* "$DEPLOY_DIR/frontend/"
    ok "Frontend copiado ($(du -sh "$DEPLOY_DIR/frontend" | cut -f1))"

    # ─── COPIAR SYSTEM ──────────────────────────────────
    log "Copiando system..."
    mkdir -p "$DEPLOY_DIR/system"
    cp -r "$REPO_DIR/system/"* "$DEPLOY_DIR/system/"
    ok "System copiado ($(du -sh "$DEPLOY_DIR/system" | cut -f1))"

    # ─── COPIAR DOCUMENTOS ──────────────────────────────
    log "Copiando documentacao..."
    cp "$REPO_DIR/PROJECT.md" "$DEPLOY_DIR/" 2>/dev/null || true
    cp "$REPO_DIR/frontend-spec.md" "$DEPLOY_DIR/" 2>/dev/null || true
    cp "$REPO_DIR/README.md" "$DEPLOY_DIR/" 2>/dev/null || true
    ok "Documentacao copiada"
else
    ok "Copia pulada — arquivos ja estao no destino"
fi

# ─── CRIAR CONFIG.JSON PADRAO ──────────────────────────
log "Verificando config.json..."
if [ ! -f "$DEPLOY_DIR/backend/config.json" ]; then
    cat > "$DEPLOY_DIR/backend/config.json" << 'CFGEOF'
{
  "bluetooth_mac": "AA:BB:CC:DD:EE:FF"
}
CFGEOF
    ok "config.json criado (MAC padrao)"
else
    ok "config.json ja existe"
fi

# ─── PERMISSOES ─────────────────────────────────────────
log "Configurando permissoes..."
chown -R "$TV_USER:$TV_USER" "$DEPLOY_DIR"
chmod +x "$DEPLOY_DIR/system/scripts/"*.sh 2>/dev/null || true
chmod +x "$DEPLOY_DIR/system/splash/"*.sh 2>/dev/null || true
chmod +x "$DEPLOY_DIR/system/install/"*.sh 2>/dev/null || true
chmod +x "$DEPLOY_DIR/serve.sh" 2>/dev/null || true
ok "Permissoes configuradas"

# ─── VERIFICACAO ────────────────────────────────────────
log "Verificando arquivos essenciais..."

ERRORS=0

for f in \
    "$DEPLOY_DIR/backend/app.py" \
    "$DEPLOY_DIR/backend/streamings.json" \
    "$DEPLOY_DIR/frontend/index.html" \
    "$DEPLOY_DIR/frontend/style.css" \
    "$DEPLOY_DIR/frontend/script.js" \
    "$DEPLOY_DIR/system/.xinitrc" \
    "$DEPLOY_DIR/system/openbox/rc.xml" \
    "$DEPLOY_DIR/system/scripts/bluetooth-watch.sh" \
    "$DEPLOY_DIR/system/scripts/startup.sh"
do
    if [ -f "$f" ]; then
        ok "$(basename "$f")"
    else
        warn "FALTANDO: $f"
        ERRORS=$((ERRORS + 1))
    fi
done

echo ""

if [ "$ERRORS" -gt 0 ]; then
    warn "$ERRORS arquivo(s) nao encontrado(s) (pode ser normal no install automatizado)"
fi

# ─── RESUMO ────────────────────────────────────────────
echo ""
log "=== Deploy concluido ==="
echo ""
echo "Estrutura:"
echo "  $DEPLOY_DIR/"
echo "  ├── backend/"
echo "  ├── frontend/"
echo "  └── system/"
echo ""
echo "Tamanho total: $(du -sh "$DEPLOY_DIR" | cut -f1)"
