#!/usr/bin/env bash
# scripts/backup.sh — Backup do SQLite (virtudes.db)
# Uso: sudo ./scripts/backup.sh
# Cron: 0 3 * * * /home/deploy/agenda-virtudes/scripts/backup.sh >> /var/log/agenda-backup.log 2>&1
set -euo pipefail

APP_NAME="agenda"
DATA_DIR="/var/lib/${APP_NAME}"
DB_FILE="${DATA_DIR}/virtudes.db"
BACKUP_DIR="/var/backups/${APP_NAME}"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[BACKUP]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

if [[ ! -f "$DB_FILE" ]]; then
  error "Banco de dados não encontrado: ${DB_FILE}"
fi

mkdir -p "$BACKUP_DIR"

BACKUP_FILE="${BACKUP_DIR}/${APP_NAME}_${TIMESTAMP}.db"

# Backup usando .backup do SQLite (seguro para WAL mode)
if command -v sqlite3 &>/dev/null; then
  sqlite3 "$DB_FILE" ".backup '${BACKUP_FILE}'"
else
  cp "$DB_FILE" "$BACKUP_FILE"
  cp "${DB_FILE}-shm" "${BACKUP_FILE}-shm" 2>/dev/null || true
  cp "${DB_FILE}-wal" "${BACKUP_FILE}-wal" 2>/dev/null || true
fi

chmod 644 "$BACKUP_FILE"

DB_SIZE=$(du -h "$DB_FILE" | cut -f1)
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
info "Backup criado: ${BACKUP_FILE} (${BACKUP_SIZE})"

# Limpar backups antigos
DELETED=$(find "$BACKUP_DIR" -name "${APP_NAME}_*.db" -mtime +${RETENTION_DAYS} -delete -print | wc -l)
if [[ $DELETED -gt 0 ]]; then
  info "Backups antigos removidos: ${DELETED} (>${RETENTION_DAYS} dias)"
fi

TOTAL=$(ls -1 "${BACKUP_DIR}/${APP_NAME}_"*.db 2>/dev/null | wc -l)
info "Total de backups: ${TOTAL}"
