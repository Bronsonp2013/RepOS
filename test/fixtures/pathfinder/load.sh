#!/usr/bin/env bash
# load.sh — apply the vendored Pathfinder migrations to a local Postgres
# database, the same way Pathfinder's own scripts/db-migrate.ts does: each
# migration file in its own transaction (lexicographic order), tracked in
# schema_migrations. Migrations 0006-0009 carry their own BEGIN/COMMIT, so
# they are run plainly (not wrapped in `psql --single-transaction`).
#
# Usage:
#   load.sh <db_name> <owner_role> [--host H] [--port P] [--superuser-role R]
#   load.sh --check                 # verify repos_test_lexington is loaded
#
# Env overrides: PGHOST (default localhost), PGPORT (default 5432),
# PSQL_SUPERUSER (default postgres, used to create roles/databases).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/migrations"

PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
SUPERUSER="${PSQL_SUPERUSER:-postgres}"

run_check() {
  local db="repos_test_lexington"
  local user="${CHECK_USER:-$SUPERUSER}"
  local count
  count="$(psql -h "$PGHOST" -p "$PGPORT" -U "$user" -d "$db" -tAc \
    "SELECT count(*) FROM schema_migrations;" 2>/dev/null || true)"
  if [[ "$count" != "29" ]]; then
    echo "FAIL: schema_migrations has '${count:-<error>}' rows, expected 29" >&2
    exit 1
  fi
  local acct
  acct="$(psql -h "$PGHOST" -p "$PGPORT" -U "$user" -d "$db" -tAc \
    "SELECT count(*) FROM accounts WHERE id = 48;" 2>/dev/null || true)"
  if [[ "$acct" != "1" ]]; then
    echo "FAIL: accounts.id=48 not found (got '${acct:-<error>}')" >&2
    exit 1
  fi
  echo "OK: schema_migrations=29 rows, account 48 present"
  exit 0
}

if [[ "${1:-}" == "--check" ]]; then
  run_check
fi

if [[ $# -lt 2 ]]; then
  echo "Usage: load.sh <db_name> <owner_role>  (or: load.sh --check)" >&2
  exit 1
fi

DB_NAME="$1"
OWNER_ROLE="$2"
shift 2

PSQL_SU=(psql -h "$PGHOST" -p "$PGPORT" -U "$SUPERUSER")

echo "== creating role/database: $OWNER_ROLE / $DB_NAME =="

"${PSQL_SU[@]}" -d postgres -v ON_ERROR_STOP=1 -tAc \
  "SELECT 1 FROM pg_roles WHERE rolname = '$OWNER_ROLE'" | grep -q 1 || \
  "${PSQL_SU[@]}" -d postgres -v ON_ERROR_STOP=1 -c \
    "CREATE ROLE \"$OWNER_ROLE\" LOGIN;"

"${PSQL_SU[@]}" -d postgres -v ON_ERROR_STOP=1 -tAc \
  "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
  "${PSQL_SU[@]}" -d postgres -v ON_ERROR_STOP=1 -c \
    "CREATE DATABASE \"$DB_NAME\" OWNER \"$OWNER_ROLE\";"

PSQL_DB=(psql -h "$PGHOST" -p "$PGPORT" -U "$SUPERUSER" -d "$DB_NAME")

"${PSQL_DB[@]}" -v ON_ERROR_STOP=1 -c \
  "CREATE TABLE IF NOT EXISTS schema_migrations (
     filename TEXT PRIMARY KEY,
     applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   );"

# Migrations that contain their own BEGIN/COMMIT — run plainly, not wrapped.
SELF_TRANSACTING=(0006 0007 0008 0009)

is_self_transacting() {
  local base
  base="$(basename "$1")"
  for n in "${SELF_TRANSACTING[@]}"; do
    [[ "$base" == "$n"_* ]] && return 0
  done
  return 1
}

for f in $(ls "$MIGRATIONS_DIR"/*.sql | sort); do
  name="$(basename "$f")"

  already="$("${PSQL_DB[@]}" -tAc \
    "SELECT 1 FROM schema_migrations WHERE filename = '$name'")"
  if [[ "$already" == "1" ]]; then
    echo "skip (already applied): $name"
    continue
  fi

  echo "applying: $name"
  if is_self_transacting "$f"; then
    # File manages its own BEGIN/COMMIT; run plainly, then record separately.
    "${PSQL_DB[@]}" -v ON_ERROR_STOP=1 -f "$f"
    "${PSQL_DB[@]}" -v ON_ERROR_STOP=1 -c \
      "INSERT INTO schema_migrations (filename) VALUES ('$name');"
  else
    # Wrap the file + its tracking insert in one transaction.
    "${PSQL_DB[@]}" -v ON_ERROR_STOP=1 --single-transaction \
      -c "$(cat "$f")" \
      -c "INSERT INTO schema_migrations (filename) VALUES ('$name');"
  fi
done

echo "== done: $DB_NAME has $(${PSQL_DB[@]} -tAc 'SELECT count(*) FROM schema_migrations;') migrations applied =="
