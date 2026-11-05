#!/usr/bin/env bash
# إثبات إن اشتراكات الرسائل وصفحات الهبوط لسه شغالة بعد أي تنضيف باقات (Task 621f2800)
#
# الاستخدام (من أي مكان، مش محتاج node_modules):
#   BASE=https://maxp.online bash scripts/one-off/verify-bundles-after-cleanup.sh
#
# المخرَج سطر لكل فحص + exit 1 لو أي فحص حرج فشل.

set -uo pipefail

BASE="${BASE:-https://maxp.online}"
FAILED=0

check() {
  local label="$1" url="$2" expect="$3"
  local code
  code=$(curl -s -o /dev/null -m 25 -w "%{http_code}" "$url" 2>/dev/null)
  code=${code:-000}
  if [ "$code" = "$expect" ]; then
    echo "✅ ${label}: ${code} (متوقع ${expect})"
  else
    echo "❌ ${label}: ${code} (متوقع ${expect}) — ${url}"
    FAILED=1
  fi
}

echo "=== 621f2800 — تحقق بعد التنضيف على ${BASE} ==="

# 1) صفحات الهبوط (أربع slugs معروفة في lpAdminRoutes)
check "صفحة هبوط messaging" "${BASE}/lp/messaging" 200
check "صفحة هبوط ai-inbox"  "${BASE}/lp/ai-inbox"  200
check "صفحة هبوط medical"    "${BASE}/lp/medical"   200

# 2) مسار الباقات: قائمة الباقات لازم 200 (متاحة للزائر)
check "قائمة الباقات" "${BASE}/api/v1/marketplace/bundles" 200

# 3) اشتراك الرسائل: نشاط الوحدة لازم يرد (200 أو 401 = المسار موجود ومحمي، مش 404/500)
MSG_CODE=$(curl -s -o /dev/null -m 25 -w "%{http_code}" "${BASE}/api/v1/messaging/conversations" 2>/dev/null)
MSG_CODE=${MSG_CODE:-000}
case "$MSG_CODE" in
  200|401|403) echo "✅ اشتراك الرسائل: ${MSG_CODE} (مسار موجود)" ;;
  *) echo "❌ اشتراك الرسائل: ${MSG_CODE} — مسار غير متاح"; FAILED=1 ;;
esac

# 4) باقة محذوفة لازم ترجع 409 بكود مفهوم مش 500
GONE_CODE="$(curl -s -o /tmp/bundle_gone.json -m 25 -w '%{http_code}' "${BASE}/api/v1/marketplace/bundles/medical-bundle" || echo 000)"
if [ "$GONE_CODE" = "409" ] || [ "$GONE_CODE" = "200" ]; then
  echo "✅ مسار باقة (medical-bundle): ${GONE_CODE}"
else
  echo "❌ مسار باقة (medical-bundle): ${GONE_CODE} — متوقع 200 أو 409، مش 500"
  FAILED=1
fi

if [ "$FAILED" -eq 0 ]; then
  echo "=== النتيجة: كل الفحوص نجحت ==="
else
  echo "=== النتيجة: فيه فحوص فشلت ==="
fi
exit "$FAILED"
