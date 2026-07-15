#!/usr/bin/env bash
# Copia código compartible de eddeli/backend → store/backend
# (mantiene identidad Store: puerto, BD, API, seed, app settings Raptor).
set -euo pipefail
DST="$(cd "$(dirname "$0")/.." && pwd)"   # .../store/backend
ROOT="$(cd "$DST/../.." && pwd)"          # .../AppsWeb
SRC="$ROOT/eddeli/backend"

if [[ ! -d "$SRC/src" || ! -d "$DST/src" ]]; then
  echo "No encuentro eddeli/backend o store/backend"
  echo "  ROOT=$ROOT"
  echo "  SRC=$SRC"
  echo "  DST=$DST"
  exit 1
fi

rsync -a \
  --exclude 'img/' \
  --exclude 'files/' \
  --exclude 'node_modules/' \
  --exclude '.env' \
  --exclude '.env.example' \
  --exclude 'package.json' \
  --exclude 'package-lock.json' \
  --exclude 'index.js' \
  --exclude 'src/config/serverEnv.js' \
  --exclude 'src/database/connection.js' \
  --exclude 'src/database/backup.json' \
  --exclude 'src/database/seed.js' \
  --exclude 'src/models/AppSettings.js' \
  --exclude 'src/services/appSettingsService.js' \
  --exclude 'scripts/reset-database.js' \
  --exclude 'scripts/sync-from-eddeli.sh' \
  --exclude 'src/backups/' \
  "$SRC/" "$DST/"

if [[ -f "$DST/src/routes/SubscriptionRoutes.js" ]]; then
  sed -i 's/frontend EdDeli/frontend Store/g' \
    "$DST/src/routes/SubscriptionRoutes.js" 2>/dev/null || true
fi
if [[ -f "$DST/src/controllers/SubscriptionController.js" ]]; then
  sed -i 's/frontend EdDeli/frontend Store/g' \
    "$DST/src/controllers/SubscriptionController.js" 2>/dev/null || true
fi

echo "✅ Sync eddeli → store (sin tocar identidad Store / AppSettings Raptor / seed)."
