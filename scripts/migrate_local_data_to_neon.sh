#!/bin/sh
# One-time data migration: copies your real portfolio data (assets,
# purchase_lots, sales, sale_consumptions) from the local dev database
# into Neon (production). Does NOT touch users/sessions -- both sides
# already have the same seeded account (same id, same email) via the
# Alembic migrations, so this only needs to carry over the portfolio
# rows and re-point the sequences so future inserts don't collide.
set -eu

: "${NEON_DATABASE_URL:?NEON_DATABASE_URL no está definido}"
: "${POSTGRES_USER:?POSTGRES_USER no está definido}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD no está definido}"
LOCAL_DB="${POSTGRES_DB:-fifo_db}"
DUMP_FILE="/tmp/local_data.dump"

export PGPASSWORD="$POSTGRES_PASSWORD"

echo "[$(date -Iseconds)] Volcando datos locales (assets, purchase_lots, sales, sale_consumptions)..."
pg_dump -h postgres -U "$POSTGRES_USER" -d "$LOCAL_DB" \
  --data-only --format=custom \
  --table=assets --table=purchase_lots --table=sales --table=sale_consumptions \
  --file="$DUMP_FILE"

echo "[$(date -Iseconds)] Restaurando en Neon..."
pg_restore --dbname="$NEON_DATABASE_URL" --data-only "$DUMP_FILE"

echo "[$(date -Iseconds)] Resincronizando secuencias en Neon..."
psql "$NEON_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
SELECT setval(pg_get_serial_sequence('assets', 'id'), COALESCE((SELECT MAX(id) FROM assets), 1));
SELECT setval(pg_get_serial_sequence('purchase_lots', 'id'), COALESCE((SELECT MAX(id) FROM purchase_lots), 1));
SELECT setval(pg_get_serial_sequence('sales', 'id'), COALESCE((SELECT MAX(id) FROM sales), 1));
SELECT setval(pg_get_serial_sequence('sale_consumptions', 'id'), COALESCE((SELECT MAX(id) FROM sale_consumptions), 1));
SQL

rm -f "$DUMP_FILE"
echo "[$(date -Iseconds)] Migración completada."
