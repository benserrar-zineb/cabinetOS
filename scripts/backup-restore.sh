#!/usr/bin/env bash
# TASK-012 : sauvegarde et restauration de la base, en preservant l'isolation RLS.
#
# IMPORTANT : ce script doit toujours etre execute avec un compte superutilisateur
# (ex: postgres), jamais avec le role applicatif (cabinetos_app). RLS empecherait
# pg_dump de voir les donnees des autres organisations, produisant une sauvegarde
# silencieusement incomplete (voir docs/adr/spike-drizzle-rls.md, section pieges).
#
# Usage :
#   ./scripts/backup-restore.sh backup  <ADMIN_DATABASE_URL> <fichier_sortie.sql> [options pg_dump]
#   ./scripts/backup-restore.sh restore <ADMIN_DATABASE_URL> <fichier_entree.sql>
#
# Variables optionnelles : PG_DUMP_BIN, PSQL_BIN (chemins explicites si PATH ne suffit pas).

set -euo pipefail

PG_DUMP_BIN="${PG_DUMP_BIN:-pg_dump}"
PSQL_BIN="${PSQL_BIN:-psql}"

ACTION="${1:-}"
DB_URL="${2:-}"
FILE="${3:-}"
shift 3 2>/dev/null || true

if [[ -z "$ACTION" || -z "$DB_URL" || -z "$FILE" ]]; then
  echo "Usage: $0 <backup|restore> <ADMIN_DATABASE_URL> <fichier.sql> [options supplementaires]" >&2
  exit 1
fi

case "$ACTION" in
  backup)
    echo "Sauvegarde de la base vers $FILE..."
    "$PG_DUMP_BIN" "$DB_URL" "$@" > "$FILE"
    echo "Sauvegarde terminee."
    ;;
  restore)
    echo "Restauration depuis $FILE..."
    "$PSQL_BIN" "$DB_URL" -v ON_ERROR_STOP=1 -f "$FILE" > /dev/null
    echo "Restauration terminee."
    ;;
  *)
    echo "Action inconnue : $ACTION (attendu : backup ou restore)" >&2
    exit 1
    ;;
esac