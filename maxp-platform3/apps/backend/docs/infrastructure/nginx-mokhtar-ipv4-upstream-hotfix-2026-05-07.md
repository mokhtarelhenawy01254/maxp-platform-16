# Nginx Mokhtar IPv4 Upstream Hotfix - 2026-05-07

## Context

Production users saw intermittent `502` responses and repeated Socket.IO reconnects on
`mokhtarelhenawy.online` and related MaxP admin sessions. Browser logs showed
`transport close`, failed `/api/v1/errors/log` requests, and one dashboard request to
`/api/v1/facebook-ads/reports/performance-summary` returning `502`.

## Findings

- `maxp-backend` briefly entered a restart loop after a deployment window because
  `node_modules/.prisma/client/default.js` was missing while startup code loaded
  `@prisma/client/default.js`.
- The generated Prisma compatibility client was restored on the server and both
  `@prisma/client` and `@prisma/client/default.js` became importable again.
- Nginx continued to log intermittent upstream failures for `mokhtarelhenawy.online`
  because the enabled site config used `proxy_pass http://localhost:3007`.
- On this VPS, `localhost` can resolve to IPv6 `::1`; the backend is reachable on
  `127.0.0.1:3007`, so nginx intermittently attempted `http://[::1]:3007` and got
  `connection refused`.

## Live Mitigation

The live file `/etc/nginx/sites-enabled/mokhtarelhenawy.online.conf` was backed up to:

`/etc/nginx/sites-enabled/mokhtarelhenawy.online.conf.bak.20260507145733`

Then every `proxy_pass http://localhost:3007...` entry was changed to
`proxy_pass http://127.0.0.1:3007...`, `nginx -t` passed, and nginx was reloaded.

A deployment at `2026-05-07T15:02Z` re-linked `sites-enabled` to
`/etc/nginx/sites-available/mokhtarelhenawy.online.conf`, which still contained the
stale `localhost` upstreams. The symlink target was then backed up to:

`/etc/nginx/sites-available/mokhtarelhenawy.online.conf.bak.20260507150457`

The same IPv4 replacement was applied to the `sites-available` target and nginx was
reloaded again.

## Repo Prevention

- Updated the root `mokhtarelhenawy.online.conf` to use `127.0.0.1`.
- Updated `.github/workflows/deploy.yml` to package
  `nginx_configs/mokhtarelhenawy.online.conf`, which was already the canonical
  IPv4-safe version.

## Related Facebook Ads 400

The same console report also included `400` responses from
`/api/v1/facebook-ads/full-ad`. Server-side checks showed no Meta campaign was created
around those failed attempts, so the request most likely failed during campaign
creation before any partial Meta objects existed. The Swan EGP account's successful
campaigns that day used a 200 EGP daily budget, while the product-launch wizard can
fall back to 10 when no budget is supplied.

The full-ad controller now rejects under-minimum EGP budgets before calling Meta and
returns a structured `BUDGET_BELOW_ACCOUNT_MINIMUM` error with the required amount.
This controller change was also hotpatched on production with backup:

`/var/www/backend2/controller/facebookAdsController.js.bak.20260507150800`
