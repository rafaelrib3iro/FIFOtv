#!/bin/bash
# ╔══════════════════════════════════════════════════════════╗
# ║  FIFOtv — Wi-Fi Setup (detecção + fallback interativo)  ║
# ║  Rodar como root antes do setup.sh                       ║
# ╚══════════════════════════════════════════════════════════╝

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}[Wi-Fi]${NC} $1"; }
ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

if [ "$(id -u)" -ne 0 ]; then
    echo "Execute como root"
    exit 1
fi

# ─── 1. VERIFICAR SE JÁ TEM INTERNET ─────────────────────
check_internet() {
    ping -c 1 -W 3 8.8.8.8 &>/dev/null
}

if check_internet; then
    ok "Internet já disponível"
    exit 0
fi

# ─── 2. DETECTAR INTERFACE WI-FI ─────────────────────────
WIFI_IF=""
for iface in /sys/class/net/wl*; do
    if [ -d "$iface" ]; then
        WIFI_IF=$(basename "$iface")
        break
    fi
done

if [ -z "$WIFI_IF" ]; then
    warn "Nenhuma interface Wi-Fi detectada"
    warn "Continuando sem Wi-Fi — connecte um cabo ethernet ou configure depois"
    exit 0
fi

log "Interface Wi-Fi: $WIFI_IF"

# ─── 3. GARANTIR FERRAMENTAS BÁSICAS ─────────────────────
if ! command -v wpa_supplicant &>/dev/null; then
    log "Instalando wpa_supplicant..."
    apt-get update -qq 2>/dev/null
    apt-get install -y -qq wpa_supplicant wpasupplicant 2>/dev/null || true
fi

if ! command -v dhclient &>/dev/null && ! command -v udhcpc &>/dev/null; then
    apt-get install -y -qq isc-dhcp-client 2>/dev/null || true
fi

# ─── 4. TENTAR CONEXÃO AUTOMÁTICA (rede salva) ───────────
WPA_CONF="/etc/wpa_supplicant/wpa_supplicant.conf"
mkdir -p /etc/wpa_supplicant

log "Tentando conexão automática..."

ip link set "$WIFI_IF" up 2>/dev/null
sleep 2

if [ -f "$WPA_CONF" ] && grep -q "network=" "$WPA_CONF" 2>/dev/null; then
    wpa_supplicant -B -i "$WIFI_IF" -c "$WPA_CONF" 2>/dev/null
    sleep 3
    if command -v dhclient &>/dev/null; then
        dhclient "$WIFI_IF" 2>/dev/null
    else
        udhcpc -i "$WIFI_IF" 2>/dev/null
    fi
    sleep 3

    if check_internet; then
        ok "Conectado automaticamente!"
        exit 0
    fi
fi

# ─── 5. MODO INTERATIVO ──────────────────────────────────
echo ""
echo -e "${YELLOW}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  Wi-Fi não configurado. Vamos conectar agora.           ║${NC}"
echo -e "${YELLOW}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Escanear redes
log "Procurando redes disponíveis..."
ip link set "$WIFI_IF" up 2>/dev/null
sleep 2

# Usar iw ou wpa_cli para listar
declare -a SSIDS=()
declare -a SIGNALS=()

if command -v iw &>/dev/null; then
    while IFS= read -r line; do
        ssid=$(echo "$line" | grep -oP 'SSID: \K.*')
        signal=$(echo "$line" | grep -oP 'signal: \K[-0-9.]+')
        if [ -n "$ssid" ]; then
            SSIDS+=("$ssid")
            SIGNALS+=("${signal:-?}")
        fi
    done < <(iw dev "$WIFI_IF" scan 2>/dev/null | grep -E 'SSID:|signal:')
fi

# Fallback: usar iwlist se iw não funcionar
if [ ${#SSIDS[@]} -eq 0 ] && command -v iwlist &>/dev/null; then
    while IFS= read -r line; do
        ssid=$(echo "$line" | grep -oP 'ESSID:"\K[^"]+')
        if [ -n "$ssid" ]; then
            SSIDS+=("$ssid")
            SIGNALS+=("?")
        fi
    done < <(iwlist "$WIFI_IF" scan 2>/dev/null | grep 'ESSID')
fi

if [ ${#SSIDS[@]} -eq 0 ]; then
    warn "Nenhuma rede Wi-Fi encontrada."
    warn "Continuando sem Wi-Fi. Configure depois via Configurações."
    exit 0
fi

echo ""
echo "Redes disponíveis:"
echo "─────────────────────────────────────"
for i in "${!SSIDS[@]}"; do
    idx=$((i + 1))
    echo -e "  ${GREEN}${idx}${NC}. ${SSIDS[$i]}"
done
echo "─────────────────────────────────────"
echo ""

read -p "Escolha o número da rede (ou 0 para pular): " choice

if [ "$choice" = "0" ] || [ -z "$choice" ]; then
    warn "Pulando configuração de Wi-Fi"
    exit 0
fi

if [ "$choice" -lt 1 ] || [ "$choice" -gt ${#SSIDS[@]} ] 2>/dev/null; then
    warn "Escolha inválida"
    exit 0
fi

SELECTED_SSID="${SSIDS[$((choice - 1))]}"
read -p "Senha para '${SELECTED_SSID}': " -s PASSWD
echo ""

if [ -z "$PASSWD" ]; then
    warn "Sem senha — pulando"
    exit 0
fi

# ─── 6. CONECTAR ─────────────────────────────────────────
log "Conectando em '${SELECTED_SSID}'..."

# Gerar config WPA
wpa_passphrase "$SELECTED_SSID" "$PASSWD" > "$WPA_CONF" 2>/dev/null || {
    # Fallback: escrever manualmente
    cat > "$WPA_CONF" << WPAEOF
network={
    ssid="$SELECTED_SSID"
    psk="$PASSWD"
}
WPAEOF
}

# Matar instâncias anteriores
killall wpa_supplicant 2>/dev/null || true
sleep 1

# Conectar
wpa_supplicant -B -i "$WIFI_IF" -c "$WPA_CONF" 2>/dev/null
sleep 4

# Obter IP
if command -v dhclient &>/dev/null; then
    dhclient "$WIFI_IF" 2>/dev/null
else
    udhcpc -i "$WIFI_IF" 2>/dev/null
fi
sleep 3

if check_internet; then
    ok "Conectado em '${SELECTED_SSID}'!"
    # Salvar para futuros boots
    log "Configuração salva em $WPA_CONF"
    exit 0
else
    warn "Falha ao conectar em '${SELECTED_SSID}'"
    warn "Verifique se a senha está correta"
    warn "Continuando sem Wi-Fi..."
    exit 0
fi
