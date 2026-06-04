# MaxP2 Nginx Backend Port Alignment - 2026-05-08

## Context

The MaxP production PM2 ecosystem starts `maxp-backend` with `PORT=3008` in both development and production environments. The deployed Nginx configs were still proxying API, upload, socket, and storefront SSR traffic to `127.0.0.1:3007`, which caused the production deploy storefront smoke test to fail with a `502` from Nginx while the backend health check passed on `3008`.

## Decision

The MaxP2 continuation repo now treats `3008` as the production backend port for the Nginx configs that are packaged by `.github/workflows/deploy.yml`.

Updated configs:

- `nginx_configs/maxp.online.conf`
- `nginx_configs/mokhtarelhenawy.online.conf`
- `nginx_configs/maxp-ai.pro.conf`
- `mokhtarelhenawy.online.conf`

The deploy workflow also strips CR/whitespace from `PORT=` values before using them in health URLs, and it detects legacy enabled Nginx files that claim the MaxP or Mokhtar domains even when the `server_name` line only contains a wildcard token.

## Verification

Before committing this change, the live server was checked directly:

- PM2 showed `maxp-backend` and `maxp-webhook-worker` online.
- `ss` showed the backend listening on `0.0.0.0:3008`.
- `curl http://127.0.0.1:3008/api/v1/health` returned `status: OK`.
- `curl --resolve swan.maxp.online:443:127.0.0.1 https://swan.maxp.online/shop` returned `200` and storefront HTML.

Future production deploys should keep the repo Nginx configs and PM2 ecosystem port aligned instead of relying on server-side hotfixes.
