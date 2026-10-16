#!/usr/bin/env bash
# scripts/update.sh — Atalho: git pull + deploy
# Uso: sudo ./scripts/update.sh
set -euo pipefail

APP_NAME="agenda"
APP_USER="deploy"
APP_DIR="/home/${APP_USER}/agenda-virtudes"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

info()  { echo -e "${GREEN}[UPDATE]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

if [[ $EUID -ne 0 ]]; then
  error "Execute como root: sudo ./scripts/update.sh"
fi

cd "$APP_DIR"

info "=== Atualização — ${APP_NAME} ==="

info "1/3 — Pull do repositório..."
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
git fetch origin "$BRANCH"
BEFORE=$(git rev-parse HEAD)
git pull origin "$BRANCH"
AFTER=$(git rev-parse HEAD)

if [[ "$BEFORE" == "$AFTER" ]]; then
  info "Nenhuma mudança detectada. Último commit: $(git log -1 --oneline)"
else
  info "Mudanças detectadas:"
  git log --oneline "${BEFORE}..${AFTER}" | head -10
fi

info "2/3 — Limpando diretório de build antigo..."
rm -rf .output
rm -rf node_modules/.cache

info "3/3 — Executando deploy..."
bash ./scripts/deploy.sh
