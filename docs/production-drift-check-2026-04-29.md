# Production Drift Check

This repo can reach production without a Git push because runtime files are sometimes copied directly to the VPS:

- backend runtime: `/var/www/backend2`
- frontend build: `/var/www/frontend2/dist`
- storefront theme presets: `/var/www/frontend2/src/storefront/themes`
- shared runtime assets: `/var/www/shared`

To check whether your current local changes are already on production before any push, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\compare-production.ps1
```

What the script does:

- reads the current `git status`
- ignores docs, memory, and test-only changes
- compares changed `backend/` and `shared/` files directly against the VPS copy
- compares changed theme JSON files against `/var/www/frontend2/src/storefront/themes`
- if runtime `frontend/src` files changed, it builds local `frontend/dist` and compares that build against `/var/www/frontend2/dist`

How to read the result:

- `[OK]` means the checked file or build output matches production
- `[DIFF]` means production is different or missing that change
- exit code `0` means production already reflects the checked runtime changes
- exit code `1` means production is missing at least one checked runtime change

Notes:

- frontend source files are not stored on production; only the built `dist` output is. That is why frontend checks compare build artifacts, not source files.
- theme presets are checked separately because they are synced to `/var/www/frontend2/src/storefront/themes`.
