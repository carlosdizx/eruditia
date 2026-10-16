#!/usr/bin/env bash
set -e

# Directorios relativos
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/apps/api/.env"
BACKUP_DIR="${PROJECT_ROOT}/backups"

# Cargar variables de entorno si existe .env
if [ -f "$ENV_FILE" ]; then
  # export variables ignoring comments
  export $(grep -v '^#' "$ENV_FILE" | xargs -0) 2>/dev/null || true
fi

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
DB_NAME="${DB_NAME:-eruditia}"
DOCKER_CONTAINER="${DB_DOCKER_CONTAINER:-ops_postgres}"

mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
OUTPUT_FILE="${BACKUP_DIR}/${DB_NAME}_backup_${TIMESTAMP}.sql"

echo "============================================="
echo "       ERUDITIA - DATABASE BACKUP (SH)       "
echo "============================================="
echo "Base de datos:  $DB_NAME"
echo "Usuario:        $DB_USERNAME"
echo "Host:           $DB_HOST:$DB_PORT"
echo "Destino:        $OUTPUT_FILE"
echo "---------------------------------------------"

if command -v pg_dump >/dev/null 2>&1; then
  echo "[INFO] Usando herramienta nativa pg_dump."
  PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_NAME" -f "$OUTPUT_FILE"
elif command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -q "^${DOCKER_CONTAINER}$"; then
  echo "[INFO] Usando contenedor Docker: '$DOCKER_CONTAINER'."
  docker exec -i -e PGPASSWORD="$DB_PASSWORD" "$DOCKER_CONTAINER" pg_dump -U "$DB_USERNAME" -d "$DB_NAME" > "$OUTPUT_FILE"
else
  echo "[ERROR] No se encontró pg_dump ni el contenedor Docker '$DOCKER_CONTAINER' activo." >&2
  exit 1
fi

echo "============================================="
echo "       BACKUP COMPLETADO CON EXITO           "
echo "============================================="
echo "Archivo: $OUTPUT_FILE"
echo "Tamaño:  $(du -h "$OUTPUT_FILE" | cut -f1)"
echo "============================================="
