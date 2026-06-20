# FIFOtv — Scripts de Instalação

## Instalação Rápida

### Pré-requisitos
- Debian 13 (Trixie) Netinst instalado (mínimo, sem desktop)
- Repositório do projeto acessível (USB, git clone, ou copiado)

### Executar

```bash
# Copie os scripts para o Debian (via USB, scp, etc.)
# E execute:

sudo bash install.sh
```

Ou, se estiver rodando de dentro do repositório:

```bash
sudo bash system/install/install.sh
```

## Scripts Individuais

| Script | Função | Quem roda |
|---|---|---|
| `setup.sh` | Instala pacotes (apt + pip) | root |
| `configure.sh` | Configura sistema (autologin, Xorg, etc.) | root |
| `deploy.sh` | Copia projeto para /home/tv/smarttv/ | root |
| `install.sh` | Orquestra tudo (setup → configure → deploy) | root |
| `preseed.cfg` | Instalação desatendida Debian | Installer |

## Ordem de Execução

```
Debian Netinst
    ↓
preseed.cfg (opcional — automatiza partição + usuário)
    ↓
install.sh (ou setup.sh → configure.sh → deploy.sh)
    ↓
Reboot → Login automático → Smart TV pronta
```

## Usuário Padrão

| Campo | Valor |
|---|---|
| Usuário | `tv` |
| Senha | `fifotv` |
| Home | `/home/tv/` |
| Projeto | `/home/tv/smarttv/` |
| SSH | `ssh tv@<IP>` |

## O que cada script faz

### setup.sh
- Atualiza sistema
- Instala: Xorg, Openbox, Chromium, PipeWire, BlueZ, NetworkManager
- Instala: Python3, Flask, xdotool, unclutter
- Instala: openssh-server, git, imagemagick, fbi
- Habilita serviços: bluetooth, NetworkManager, SSH

### configure.sh
- Cria usuário `tv` com senha `fifotv`
- Configura autologin no TTY1
- Configura auto-startx no `.bash_profile`
- Instala `.xinitrc` (Chromium + Openbox + backend)
- Configura Openbox `rc.xml` (Chromium fullscreen)
- Configura `logind.conf` (anti-sleep)
- Instala boot splash service
- Desabilita Display Managers

### deploy.sh
- Copia backend/, frontend/, system/ para /home/tv/smarttv/
- Cria config.json com MAC Bluetooth padrão
- Inicializa repositório git (para updates)
- Verifica arquivos essenciais

## Instalação Desatendida (Preseed)

Para instalação completamente automatizada:

1. Grave a ISO do Debian 13 Netinst em USB (Ventoy ou dd)
2. Copie `preseed.cfg` para a raiz de outro USB
3. No boot do Debian, pressione Tab e adicione:
   ```
   auto url=hd:/dev/sdb1:/preseed.cfg
   ```
4. A instalação será totalmente automática

## Troubleshooting

### Xorg não inicia
```bash
# Verificar se o .xinitrc existe e tem permissão
ls -la /home/tv/.xinitrc
# Testar manualmente
su - tv
startx
```

### Chromium não abre
```bash
# Verificar se o backend está rodando
curl http://localhost:5000
# Testar Chromium manualmente
chromium --app=http://localhost:5000
```

### Bluetooth não conecta
```bash
# Verificar se o MAC está correto
cat /home/tv/smarttv/backend/config.json
# Testar conexão manual
bluetoothctl connect AA:BB:CC:DD:EE:FF
```

### SSH não funciona
```bash
# Verificar se o serviço está rodando
systemctl status ssh
# Verificar firewall
iptables -L
```
