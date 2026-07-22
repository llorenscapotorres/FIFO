#!/bin/sh
# Dumps the production Neon database and restores it into a dedicated
# local database (BACKUP_DB_NAME) inside the existing local Postgres
# container, as a nightly safety-net copy. Never touches the local dev
# database (POSTGRES_DB) used for day-to-day development.
set -eu

: "${NEON_DATABASE_URL:?NEON_DATABASE_URL no está definido}"
: "${POSTGRES_USER:?POSTGRES_USER no está definido}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD no está definido}"
BACKUP_DB_NAME="${BACKUP_DB_NAME:-fifo_db_backup}"
DUMP_FILE="/tmp/neon_backup.dump"

export PGPASSWORD="$POSTGRES_PASSWORD"

echo "[$(date -Iseconds)] Volcando datos desde Neon..."
pg_dump "$NEON_DATABASE_URL" --format=custom --no-owner --no-acl --file="$DUMP_FILE"

echo "[$(date -Iseconds)] Recreando base de datos de backup local (${BACKUP_DB_NAME})..."
psql -h postgres -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 \
  -c "DROP DATABASE IF EXISTS ${BACKUP_DB_NAME} WITH (FORCE);"
psql -h postgres -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 \
  -c "CREATE DATABASE ${BACKUP_DB_NAME};"

echo "[$(date -Iseconds)] Restaurando en ${BACKUP_DB_NAME}..."
pg_restore -h postgres -U "$POSTGRES_USER" -d "${BACKUP_DB_NAME}" --no-owner --no-acl "$DUMP_FILE"

rm -f "$DUMP_FILE"
echo "[$(date -Iseconds)] Backup completado."
