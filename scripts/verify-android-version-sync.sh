#!/usr/bin/env bash
# verify-android-version-sync.sh
# Ensures build.gradle, latest-android.json, and appUpdateService.ts
# all agree on the current Android version. Exits non-zero on mismatch.

set -euo pipefail

GRADLE="apps/frontend/android/app/build.gradle"
JSON_PUB="apps/frontend/public/latest-android.json"
JSON_DL="apps/frontend/public/download/latest-android.json"
SERVICE="apps/frontend/src/services/appUpdateService.ts"
BACKEND="apps/backend/routes/appVersionRoutes.js"

# Extract versions
GRADLE_NAME=$(grep -E "versionName\s+\"" "$GRADLE" | head -1 | sed -E 's/.*"([^"]+)".*/\1/')
GRADLE_CODE=$(grep -E "versionCode\s+[0-9]+" "$GRADLE" | head -1 | awk '{print $2}')

JSON_NAME=$(grep -oP '"latestVersion":\s*"\K[^"]+' "$JSON_PUB")
JSON_CODE=$(grep -oP '"latestVersionCode":\s*\K[0-9]+' "$JSON_PUB")

SVC_NAME=$(grep -oP "DEFAULT_CURRENT_VERSION\s*=\s*'\K[^']+" "$SERVICE")
SVC_CODE=$(grep -oP "DEFAULT_CURRENT_BUILD\s*=\s*\K[0-9]+" "$SERVICE")

ERRORS=0

echo "=== Android Version Sync Check ==="
echo "  build.gradle:        $GRADLE_NAME (code $GRADLE_CODE)"
echo "  latest-android.json: $JSON_NAME (code $JSON_CODE)"
echo "  appUpdateService.ts: $SVC_NAME (code $SVC_CODE)"

if [ "$GRADLE_NAME" != "$JSON_NAME" ]; then
  echo "MISMATCH: build.gradle ($GRADLE_NAME) != latest-android.json ($JSON_NAME)"
  ERRORS=$((ERRORS + 1))
fi

if [ "$GRADLE_CODE" != "$JSON_CODE" ]; then
  echo "MISMATCH: build.gradle code ($GRADLE_CODE) != latest-android.json code ($JSON_CODE)"
  ERRORS=$((ERRORS + 1))
fi

if [ "$GRADLE_NAME" != "$SVC_NAME" ]; then
  echo "MISMATCH: build.gradle ($GRADLE_NAME) != appUpdateService.ts DEFAULT ($SVC_NAME)"
  ERRORS=$((ERRORS + 1))
fi

if [ "$GRADLE_CODE" != "$SVC_CODE" ]; then
  echo "MISMATCH: build.gradle code ($GRADLE_CODE) != appUpdateService.ts DEFAULT_BUILD ($SVC_CODE)"
  ERRORS=$((ERRORS + 1))
fi

# Also check the download copy
DL_NAME=$(grep -oP '"latestVersion":\s*"\K[^"]+' "$JSON_DL" 2>/dev/null || echo "MISSING")
if [ "$GRADLE_NAME" != "$DL_NAME" ]; then
  echo "MISMATCH: build.gradle ($GRADLE_NAME) != download/latest-android.json ($DL_NAME)"
  ERRORS=$((ERRORS + 1))
fi

# Check backend route hardcoded default (primary API source)
if [ -f "$BACKEND" ]; then
  BE_NAME=$(grep -oP "latestVersion:\s*'\K[^']+" "$BACKEND" | head -1)
  BE_CODE=$(grep -oP "latestVersionCode:\s*\K[0-9]+" "$BACKEND" | head -1)
  echo "  backend route:       $BE_NAME (code $BE_CODE)"

  if [ "$GRADLE_NAME" != "$BE_NAME" ]; then
    echo "MISMATCH: build.gradle ($GRADLE_NAME) != backend appVersionRoutes.js ($BE_NAME)"
    ERRORS=$((ERRORS + 1))
  fi
  if [ "$GRADLE_CODE" != "$BE_CODE" ]; then
    echo "MISMATCH: build.gradle code ($GRADLE_CODE) != backend appVersionRoutes.js code ($BE_CODE)"
    ERRORS=$((ERRORS + 1))
  fi
fi

if [ $ERRORS -gt 0 ]; then
  echo ""
  echo "FAILED: $ERRORS version mismatch(es) detected."
  echo "All four sources must agree: build.gradle, latest-android.json, appUpdateService.ts, appVersionRoutes.js"
  exit 1
fi

echo "ALL SYNCED"
