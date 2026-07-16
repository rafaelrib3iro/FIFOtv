# FIFOtv — Deploy v2 (Electron) no All-in-one

## Contexto

O all-in-one (Positivo Union UD3630) está rodando FIFOtv v1 (Chromium + Flask + Openbox).
Este documento instrui a migração para a v2 (Electron).

### O que muda

| v1 (antigo) | v2 (novo) |
|-------------|-----------|
| Flask (Python, porta 5000) | Electron main process (Node.js) |
| Openbox (gerenciador de janelas) | Electron frameless window |
| Chromium (navegador) | Electron (Chromium embutido) |
| Extensão Chrome (tv-override) | WebContentsView overlay |
| bluetooth-watch.sh (PTY hack) | D-Bus nativo (dbus-next) |
| Boot via .xinitrc | Boot via systemd |
| ~500-800MB RAM | ~210MB RAM |

## Pré-requisitos

- All-in-one ligado e acessível via SSH (`tv@IP_DA_MAQUINA`, senha: `fifotv`)
- Git instalado (já vem no v1)
- Node.js 22+ instalado (já vem no v1)
- Repositório FIFOtv clonado em `/home/tv/smarttv`

## Fluxo de Atualização

### Passo 1: Acessar o servidor

```bash
ssh tv@IP_DA_MAQUINA
```

### Passo 2: Entrar na pasta do projeto

```bash
cd /home/tv/smarttv
```

### Passo 3: Trocar pro branch v2

```bash
git fetch origin
git checkout electron
git pull origin electron
```

### Passo 4: Instalar dependências

```bash
npm install
```

Isso baixa o Electron (castlabs com Widevine/DRM) e o dbus-next.

### Passo 5: Atualizar .xinitrc

O `.xinitrc` agora é mínimo — só prepara o Xorg. O Electron é iniciado pelo systemd.

```bash
cat > /home/tv/.xinitrc << 'EOF'
#!/bin/bash
# FIFOtv v2 — Xorg setup only (Electron starts via systemd)
xset s off
xset -dpms
xset s noblank
unclutter -idle 0 &
wait
EOF
chmod +x /home/tv/.xinitrc
```

### Passo 6: Instalar service do systemd

```bash
sudo cp /home/tv/smarttv/system/fifotv.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable fifotv.service
```

### Passo 7: Desabilitar serviços do v1

```bash
# Flask (não existe mais)
sudo systemctl stop flask-fifotv 2>/dev/null || true
sudo systemctl disable flask-fifotv 2>/dev/null || true

# Openbox (não existe mais)
sudo systemctl stop openbox-fifotv 2>/dev/null || true
sudo systemctl disable openbox-fifotv 2>/dev/null || true

# Splash antigo (Electron tem splash próprio)
sudo systemctl disable fifotv-splash 2>/dev/null || true
```

### Passo 8: Reiniciar

```bash
sudo reboot
```

## Verificação

Após reiniciar:

1. O FIFOtv v2 deve iniciar automaticamente
2. A homepage deve mostrar o grid de streamings
3. Mouse e teclado devem funcionar
4. Clicar em streaming deve abrir com overlay

### Comandos úteis

```bash
# Ver status do serviço
sudo systemctl status fifotv

# Ver logs
journalctl -u fifotv -f

# Reiniciar manualmente
sudo systemctl restart fifotv

# Parar
sudo systemctl stop fifotv

# Testar sem systemd (debug)
cd /home/tv/smarttv && npm start
```

## Rollback (voltar pra v1)

Se algo der errado:

```bash
cd /home/tv/smarttv
git checkout main

# Restaurar .xinitrc antigo
cat > /home/tv/.xinitrc << 'EOF'
#!/bin/bash
xset s off
xset -dpms
xset s noblank
unclutter -idle 1 &
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
EOF
chmod +x /home/tv/.xinitrc

# Desabilitar v2
sudo systemctl disable fifotv.service
sudo systemctl stop fifotv.service

# Reiniciar
sudo reboot
```
