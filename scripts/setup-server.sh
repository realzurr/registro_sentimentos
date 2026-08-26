#!/usr/bin/env bash
# scripts/setup-server.sh — Setup inicial do servidor Ubuntu 24.04
# Uso: sudo ./scripts/setup-server.sh
set -euo pipefail

APP_NAME="agenda"
APP_USER="deploy"
APP_DIR="/home/${APP_USER}/agenda-virtudes"
DATA_DIR="/var/lib/${APP_NAME}"
PORT=3000
NODE_VERSION="20"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

if [[ $EUID -ne 0 ]]; then
  error "Execute como root: sudo ./scripts/setup-server.sh"
fi

if ! command -v bun &>/dev/null; then
  warn "Bun não encontrado. Instalando..."
  sudo -u "$APP_USER" bash -c 'curl -fsSL https://bun.sh/install | bash'
  export PATH="/home/${APP_USER}/.bun/bin:$PATH"
fi

info "=== Setup do servidor — ${APP_NAME} ==="

info "1/7 — Verificando dependências..."
for cmd in git node nginx certbot; do
  if ! command -v "$cmd" &>/dev/null; then
    warn "$cmd não encontrado. Instalando..."
    apt install -y "$cmd"
  fi
done

if ! command -v node &>/dev/null || [[ $(node -v | cut -d. -f1 | tr -d v) -lt $NODE_VERSION ]]; then
  warn "Node.js ${NODE_VERSION}+ não encontrado. Instalando via NodeSource..."
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
  apt install -y nodejs
fi

info "2/7 — Criando diretórios..."
mkdir -p "$DATA_DIR"
mkdir -p /var/backups/${APP_NAME}
mkdir -p /etc/nginx/sites-available
mkdir -p /etc/nginx/sites-enabled

info "3/7 — Configurando variáveis de ambiente..."
if [[ -f "${APP_DIR}/.env" ]]; then
  cp "${APP_DIR}/.env" "${DATA_DIR}/.env"
  chmod 600 "${DATA_DIR}/.env"
  info "Arquivo .env copiado para ${DATA_DIR}/.env"
else
  warn "Arquivo .env não encontrado em ${APP_DIR}/.env"
  warn "Copie manualmente: cp .env.example .env && nano .env"
fi

info "4/7 — Configurando firewall UFW..."
if command -v ufw &>/dev/null; then
  ufw allow 22/tcp   # SSH
  ufw allow 80/tcp   # HTTP
  ufw allow 443/tcp  # HTTPS
  ufw --force enable
  info "UFW configurado: SSH(22), HTTP(80), HTTPS(443)"
else
  warn "UFW não encontrado — pulando configuração de firewall"
fi

info "5/7 — Configurando nginx..."
cat > /etc/nginx/sites-available/${APP_NAME} <<NGINX_CONF
server {
    listen 80;
    server_name _;

    # Proxy reverso para o Node.js
    location / {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    # Cache de assets estáticos (CSS, JS, imagens)
    location /assets/ {
        proxy_pass http://127.0.0.1:${PORT}/assets/;
        proxy_cache_valid 200 30d;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Desabilitar upload de arquivos grandes (proteção)
    client_max_body_size 1m;
}
NGINX_CONF

ln -sf /etc/nginx/sites-available/${APP_NAME} /etc/nginx/sites-enabled/${APP_NAME}
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
info "nginx configurado"

info "6/7 — Criando serviço systemd..."
cat > /etc/systemd/system/${APP_NAME}.service <<SYSTEMD_CONF
[Unit]
Description=Agenda de Virtudes — Servidor
After=network.target

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}
ExecStart=/usr/bin/node .output/server/index.mjs
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=${APP_NAME}

# Variáveis de ambiente
EnvironmentFile=${DATA_DIR}/.env

# Porta do servidor (Node.js)
PORT=${PORT}
NITRO_PORT=${PORT}

# Segurança
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=${DATA_DIR} ${APP_DIR}/.output

# SQLite precisa de acesso de escrita ao diretório de dados
Environment=SQLITE_DB_PATH=${DATA_DIR}/virtudes.db

[Install]
WantedBy=multi-user.target
SYSTEMD_CONF

systemctl daemon-reload
systemctl enable ${APP_NAME}
info "Serviço systemd criado: ${APP_NAME}.service"

info "7/7 — Fazendo build inicial..."
cd "$APP_DIR"

# Garantir que o .env existe no diretório da app
if [[ ! -f .env ]]; then
  cp "${DATA_DIR}/.env" .env
fi

bun install
bun run build

# Copiar build para o diretório de dados
mkdir -p "${DATA_DIR}/current"
rm -rf "${DATA_DIR}/current/.output"
cp -r .output "${DATA_DIR}/current/.output"

systemctl start ${APP_NAME}

info "=== Setup concluído! ==="
echo ""
echo "  App:         http://localhost:${PORT}"
echo "  Dados:       ${DATA_DIR}/"
echo "  Backups:     /var/backups/${APP_NAME}/"
echo "  Logs:        journalctl -u ${APP_NAME} -f"
echo "  Serviço:     systemctl status ${APP_NAME}"
echo ""
echo "  Próximo passo:"
echo "  sudo certbot --nginx -d SEUDOMINIO.com.br"
echo ""
