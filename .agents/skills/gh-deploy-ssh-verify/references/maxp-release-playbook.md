# MaxP Release Playbook

Use this reference when `gh-deploy-ssh-verify` is executed inside `H:\max_p_new`.

## Branch And Workflow Map

- `main` push: GitHub Actions workflow `Deploy to Server`
- `staging` push: GitHub Actions workflow `Deploy to Staging (maxp.online)`
- Pull requests to `main` or `staging`: workflow `Storefront Validation`

Important release rule for `max_p_new`:

- `Storefront Validation` is a safety-net workflow only. It does not deploy to any server.
- Production is reached only by `push` to `main` through `Deploy to Server`.
- If the user says "push/upload to GitHub" after shipping runtime code, do not assume a PR branch is enough. Resolve whether they want PR validation only or a real production deploy to `main`.

Useful commands:

```powershell
gh run list --branch main --workflow "Deploy to Server" --limit 5
gh run list --branch staging --workflow "Deploy to Staging (maxp.online)" --limit 5
gh run list --workflow "Storefront Validation" --limit 5
gh run watch <run-id> --exit-status
gh run view <run-id> --log-failed
```

## Pre-Push Quality Gates

- The repo uses HTTPS Git remote by default.
- Target Repository: When asked "ارفع الابديت" or pushing updates, ONLY push to remote `origin` (`https://github.com/mokhtar-el7/maxp-platform-13`). Do not push to other remotes.
- `gh auth status` should pass before relying on `gh run ...` or PR operations.
- Production workflow runs `node scripts/verify-docs.js` before deployment.
- If shipped changes touch runtime code, update docs in one of:
  - `backend/docs/storefront/`, `backend/docs/orders/`, `backend/docs/whatsapp/`, `backend/docs/hr/`, `backend/docs/infrastructure/`
  - `frontend/docs/`
  - `apps/ai-service/docs/`
- Only use the `[no-doc]` commit-message bypass when the user explicitly wants that tradeoff.

## Test Commands

### Frontend

Run from `frontend/`:

```powershell
npm run type-check
npm test -- --runInBand
npm run test:storefront-routing
npm run test:storefront-themes
npm run build
```

Targeted frontend tests already exist in nearby areas, for example:

- `src/pages/orders/__tests__/OrderItemsCard.test.tsx`
- `src/pages/settings/__tests__/StorefrontClaritySettings.test.tsx`
- `src/storefront/__tests__/storefrontSettingsService.test.ts`
- `src/storefront/__tests__/storefrontPreview.test.tsx`

When changing `frontend/src/components/store/**`, `frontend/src/pages/settings/**`, or shared storefront settings helpers, prefer a nearby settings/storefront test or add a new one beside the touched code.

### Backend

Run from `backend/`:

```powershell
npm run check:syntax
npx jest tests/<path>.test.js --runInBand
npm test -- --runInBand
npm run templates:validate -- --fail-on-critical-warnings
```

Useful backend test areas:

- `tests/services/*.test.js`
- `tests/integration/*.test.js`
- `tests/controller/*.test.js`
- `tests/services/storefrontSeoService.test.js`
- `tests/services/CoreAIAgent.catalogVariantContext.test.js`

## Remote Server Conventions

These values are inferred from the current repo and should be re-verified against `TOOLS.md` if that file later gains environment-specific notes.

### Production

- Backend directory: `/var/www/backend2`
- Frontend build directory: `/var/www/frontend2/dist`
- Shared directory: `/var/www/shared`
- PM2 apps:
  - `maxp-backend`
  - `maxp-webhook-worker`
- Backend log files:
  - `logs/err.log`
  - `logs/out.log`
  - `logs/webhook-worker-err.log`
  - `logs/webhook-worker-out.log`
- Health endpoint: `http://127.0.0.1:<port>/api/v1/health`
- Port resolution order:
  1. `/var/www/backend2/.env.production`
  2. `/var/www/backend2/.env`
  3. fallback ports `3008`, then `3007`

Useful production SSH checks:

```bash
cd /var/www/backend2
pm2 list
pm2 logs maxp-backend --lines 50 --nostream
pm2 logs maxp-webhook-worker --lines 50 --nostream
grep '^PORT=' .env.production .env 2>/dev/null
curl -fsS http://127.0.0.1:3008/api/v1/health
curl -fsS http://127.0.0.1:3007/api/v1/health
tail -n 50 logs/err.log
tail -n 50 logs/webhook-worker-err.log
sudo nginx -t
```

### Staging

- Backend directory: `/var/www/backend-stage`
- Frontend build directory: `/var/www/frontend-stage/dist`
- PM2 app: `maxp-staging`

Useful staging SSH checks:

```bash
cd /var/www/backend-stage
pm2 status maxp-staging
pm2 logs maxp-staging --lines 50 --nostream
```

## Storefront And Infra Notes

- Production deploy additionally syncs Nginx configs from:
  - `nginx_configs/maxp.online.conf`
  - `mokhtarelhenawy.online.conf`
- Deploy health checks also verify storefront HTML and SEO smoke behavior for `swan.maxp.online`.
- If a deploy passes the SSH step but later fails the workflow, inspect the post-reload health and storefront smoke-test section before assuming an SSH problem.
