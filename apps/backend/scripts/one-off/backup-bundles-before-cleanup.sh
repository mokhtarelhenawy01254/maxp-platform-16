#!/usr/bin/env bash
# نسخة احتياطية قبل أي تنضيف لباقات المنصة (Task 621f2800)
#
# ممنوع أي تعديل/حذف قبل تشغيل السكربت ده وتوثيق ناتجه في تقرير المهمة.
# بياخد نسخة من الجدولين اللي التنضيف ممكن يلمسهم + بصمة sha256 لكل ملف.
#
# التشغيل (على السيرفر، من مجلد apps/backend):
#   DATABASE_URL="postgres://..." bash scripts/one-off/backup-bundles-before-cleanup.sh
#
# الناتج: backups/621f2800-<UTC timestamp>/{app_bundles.sql,platform_subscriptions.sql,MANIFEST.txt}

set -euo pipefail

DB_URL="${DATABASE_URL:-${POSTGRES_URL:-}}"
if [ -z "$DB_URL" ]; then
  echo "❌ لازم DATABASE_URL أو POSTGRES_URL"
  exit 1
fi

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_DIR="backups/621f2800-${STAMP}"
mkdir -p "$OUT_DIR"

echo "📦 نسخة احتياطية في $OUT_DIR"

for TABLE in app_bundles platform_subscriptions; do
  echo "  → $TABLE"
  pg_dump --data-only --no-owner --no-privileges \
    --table="public.${TABLE}" \
    --dbname="$DB_URL" > "${OUT_DIR}/${TABLE}.sql"
done

{
  echo "task=621f2800"
  echo "created_at_utc=$STAMP"
  echo "source=pg_dump --data-only"
  for f in "${OUT_DIR}"/*.sql; do
    echo "file=$(basename "$f") bytes=$(wc -c < "$f") sha256=$(sha256sum "$f" | awk '{print $1}') rows=$(grep -c '^INSERT\|^COPY' "$f" || true)"
  done
} > "${OUT_DIR}/MANIFEST.txt"

echo "✅ تم. المانيفست:"
cat "${OUT_DIR}/MANIFEST.txt"
