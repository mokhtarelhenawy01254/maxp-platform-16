#!/usr/bin/env bash
# verify-android-version-sync.sh
# Ensures build.gradle, appUpdateService.ts, and appVersionRoutes.js
# all agree on the current Android version. Exits non-zero on mismatch.

set -euo pipefail
export LC_ALL=C.UTF-8

GRADLE="apps/frontend/android/app/build.gradle"
JSON_PUB="apps/frontend/public/latest-android.json"
JSON_DL="apps/frontend/public/download/latest-android.json"
SERVICE="apps/frontend/src/services/appUpdateService.ts"
BACKEND="apps/backend/routes/appVersionRoutes.js"

# Extract versions from mandatory sources
GRADLE_NAME=$(grep -E "versionName\s+\"" "$GRADLE" | head -1 | sed -E 's/.*"([^"]+)".*/\1/')
GRADLE_CODE=$(grep -E "versionCode\s+[0-9]+" "$GRADLE" | head -1 | awk '{print $2}')

SVC_NAME=$(grep -oP "DEFAULT_CURRENT_VERSION\s*=\s*'\K[^']+" "$SERVICE")
SVC_CODE=$(grep -oP "DEFAULT_CURRENT_BUILD\s*=\s*\K[0-9]+" "$SERVICE")

BE_NAME=$(grep -oP "latestVersion:\s*'\K[^']+" "$BACKEND" | head -1)
BE_CODE=$(grep -oP "latestVersionCode:\s*\K[0-9]+" "$BACKEND" | head -1)

ERRORS=0

echo "=== Android Version Sync Check ==="
echo "  build.gradle:        $GRADLE_NAME (code $GRADLE_CODE)"
echo "  appUpdateService.ts: $SVC_NAME (code $SVC_CODE)"
echo "  backend route:       $BE_NAME (code $BE_CODE)"

# Check latest-android.json if present
if [ -f "$JSON_PUB" ]; then
  JSON_NAME=$(grep -oP '"latestVersion":\s*"\K[^"]+' "$JSON_PUB")
  JSON_CODE=$(grep -oP '"latestVersionCode":\s*\K[0-9]+' "$JSON_PUB")
  echo "  latest-android.json: $JSON_NAME (code $JSON_CODE)"
  if [ "$GRADLE_NAME" != "$JSON_NAME" ]; then
    echo "MISMATCH: build.gradle ($GRADLE_NAME) != latest-android.json ($JSON_NAME)"
    ERRORS=$((ERRORS + 1))
  fi
  if [ "$GRADLE_CODE" != "$JSON_CODE" ]; then
    echo "MISMATCH: build.gradle code ($GRADLE_CODE) != latest-android.json code ($JSON_CODE)"
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "skip: $JSON_PUB not present (manifests decoupled in b133d0e5d)"
fi

# Check download/latest-android.json if present
if [ -f "$JSON_DL" ]; then
  DL_NAME=$(grep -oP '"latestVersion":\s*"\K[^"]+' "$JSON_DL")
  DL_CODE=$(grep -oP '"latestVersionCode":\s*\K[0-9]+' "$JSON_DL")
  echo "  download/latest:     $DL_NAME (code $DL_CODE)"
  if [ "$GRADLE_NAME" != "$DL_NAME" ]; then
    echo "MISMATCH: build.gradle ($GRADLE_NAME) != download/latest-android.json ($DL_NAME)"
    ERRORS=$((ERRORS + 1))
  fi
  if [ "$GRADLE_CODE" != "$DL_CODE" ]; then
    echo "MISMATCH: build.gradle code ($GRADLE_CODE) != download/latest-android.json code ($DL_CODE)"
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "skip: $JSON_DL not present (manifests decoupled in b133d0e5d)"
fi

# Compare build.gradle vs appUpdateService.ts
if [ "$GRADLE_NAME" != "$SVC_NAME" ]; then
  echo "MISMATCH: build.gradle versionName ($GRADLE_NAME) != appUpdateService.ts DEFAULT_CURRENT_VERSION ($SVC_NAME)"
  ERRORS=$((ERRORS + 1))
fi

if [ "$GRADLE_CODE" != "$SVC_CODE" ]; then
  echo "MISMATCH: build.gradle versionCode ($GRADLE_CODE) != appUpdateService.ts DEFAULT_CURRENT_BUILD ($SVC_CODE)"
  ERRORS=$((ERRORS + 1))
fi

# Compare build.gradle vs backend appVersionRoutes.js
if [ "$GRADLE_NAME" != "$BE_NAME" ]; then
  echo "MISMATCH: build.gradle versionName ($GRADLE_NAME) != backend appVersionRoutes.js latestVersion ($BE_NAME)"
  ERRORS=$((ERRORS + 1))
fi

if [ "$GRADLE_CODE" != "$BE_CODE" ]; then
  echo "MISMATCH: build.gradle versionCode ($GRADLE_CODE) != backend appVersionRoutes.js latestVersionCode ($BE_CODE)"
  ERRORS=$((ERRORS + 1))
fi

if [ $ERRORS -gt 0 ]; then
  echo ""
  echo "FAILED: $ERRORS version mismatch(es) detected."
  echo "All in-repo sources must agree: build.gradle, appUpdateService.ts, appVersionRoutes.js"
  exit 1
fi

echo "ALL SYNCED"
