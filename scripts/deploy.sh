#!/usr/bin/env bash
# scripts/deploy.sh — Build de produção + deploy no servidor
# Uso: sudo ./scripts/deploy.sh
set -euo pipefail

APP_NAME="agenda"
APP_USER="deploy"
APP_DIR="/home/${APP_USER}/agenda-virtudes"
DATA_DIR="/var/lib/${APP_NAME}"
PORT=5003

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[DEPLOY]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

if [[ $EUID -ne 0 ]]; then
  error "Execute como root: sudo ./scripts/deploy.sh"
fi

info "=== Iniciando deploy — ${APP_NAME} ==="

cd "$APP_DIR"

info "1/5 — Verificando dependências..."
if ! command -v node &>/dev/null; then
  error "Node.js não encontrado. Instale: apt install nodejs"
fi

if ! command -v npm &>/dev/null; then
  error "npm não encontrado. Instale o Node.js (que inclui npm): apt install nodejs npm"
fi

NODE_MAJOR=$(node -v | cut -d. -f1 | tr -d v)
if [[ $NODE_MAJOR -lt 22 ]]; then
  error "Node.js 22+ necessário (atual: $(node -v)) — requisito do node:sqlite"
fi

info "2/5 — Instalando dependências..."
npm install 2>/dev/null || npm install

info "3/5 — Rodando verificações..."
if npm run typecheck 2>&1 | grep -q "error"; then
  warn "Typecheck encontrou erros — continuando mesmo assim"
fi

info "4/5 — Build de produção..."
npm run build

if [[ ! -d .output ]]; then
  error "Build falhou — diretório .output não encontrado"
fi

info "5/5 — Copiando build para ${DATA_DIR}/current..."
mkdir -p "${DATA_DIR}/current"
rm -rf "${DATA_DIR}/current/.output"
cp -r .output "${DATA_DIR}/current/.output"

chown -R ${APP_USER}:${APP_USER} "${DATA_DIR}/current"

info "Reiniciando serviço ${APP_NAME}..."
systemctl restart "${APP_NAME}"

# Verificar se o serviço subiu
sleep 2
if systemctl is-active --quiet "${APP_NAME}"; then
  info "=== Deploy concluído com sucesso! ==="
  echo ""
  echo "  Status:      $(systemctl is-active ${APP_NAME})"
  echo "  URL:         http://localhost:${PORT}"
  echo "  Logs:        journalctl -u ${APP_NAME} -f"
  echo ""
else
  error "Serviço não iniciou. Verifique: journalctl -u ${APP_NAME} -n 50"
fi