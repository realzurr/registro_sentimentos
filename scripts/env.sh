#!/usr/bin/env bash
# scripts/env.sh — Configurar variáveis de ambiente no servidor
# Uso: sudo ./scripts/env.sh
#       ou interativamente: sudo ./scripts/env.sh --interactive
set -euo pipefail

APP_NAME="agenda"
APP_USER="deploy"
DATA_DIR="/var/lib/${APP_NAME}"
ENV_FILE="${DATA_DIR}/.env"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[ENV]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

if [[ $EUID -ne 0 ]]; then
  error "Execute como root: sudo ./scripts/env.sh"
fi

mkdir -p "$DATA_DIR"

if [[ "${1:-}" == "--interactive" ]]; then
  info "Configuração interativa de variáveis de ambiente"
  echo ""

  read -rp "URL do Supabase (VITE_SUPABASE_URL): " SUPABASE_URL
  read -rp "Chave Anon do Supabase (VITE_SUPABASE_ANON_KEY): " SUPABASE_KEY
  read -rp "Email admin inicial (VITE_INITIAL_ADMIN_EMAIL): " ADMIN_EMAIL

  cat > "$ENV_FILE" <<EOF
# Variáveis de ambiente — Agenda de Virtudes
# Gerado em: $(date -Iseconds)

VITE_SUPABASE_URL=${SUPABASE_URL}
VITE_SUPABASE_ANON_KEY=${SUPABASE_KEY}
VITE_INITIAL_ADMIN_EMAIL=${ADMIN_EMAIL}
EOF

  chmod 600 "$ENV_FILE"
  chown ${APP_USER}:${APP_USER} "$ENV_FILE"

  info "Arquivo .env atualizado em ${ENV_FILE}"
  echo ""
  echo "  Variáveis configuradas:"
  echo "    VITE_SUPABASE_URL:          OK"
  echo "    VITE_SUPABASE_ANON_KEY:     OK (não exibida por segurança)"
  echo "    VITE_INITIAL_ADMIN_EMAIL:   OK"
  echo ""

elif [[ -f .env ]]; then
  cp .env "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  chown ${APP_USER}:${APP_USER} "$ENV_FILE"
  info "Arquivo .env copiado de $(pwd)/.env para ${ENV_FILE}"

else
  if [[ -f "$ENV_FILE" ]]; then
    info "Arquivo .env atual:"
    cat "$ENV_FILE"
    echo ""
    warn "Nenhum .env encontrado no diretório atual ($(pwd))"
    warn "Para editar: nano ${ENV_FILE}"
    warn "Para config interativa: sudo ./scripts/env.sh --interactive"
  else
    error "Nenhum arquivo .env encontrado. Crie em $(pwd)/.env ou use: sudo ./scripts/env.sh --interactive"
  fi
fi
