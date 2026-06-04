# Frontend Dynamic Import Recovery - 2026-05-07

## Context

Production admin sessions can keep an older Vite entry chunk alive while a deploy replaces the hashed lazy-loaded chunks under `/assets`. When the active session later opens a lazy route, the browser may request deleted files such as `SuperAdminUsersManagement-*.js`, `dialog-*.js`, `dropdown-menu-*.js`, or `select-*.js` and React reports `Failed to fetch dynamically imported module`.

## Change

- Added `frontend/src/utils/chunkLoadRecovery.ts` to detect Vite preload, dynamic import, and chunk load failures.
- Installed the recovery listener during frontend bootstrap before admin/storefront lazy imports run.
- Wired `ErrorBoundary` and the bootstrap catch path to trigger the same recovery for React.lazy failures.
- Recovery reloads the page once per 15 seconds using a `sessionStorage` guard so the browser fetches the latest no-cache `index.html` and matching chunk graph without looping.

## Verification

- Confirmed the reported production chunk URLs currently return HTTP 200 with `application/javascript`.
- Reproduced the browser-only failure against `https://maxp.online/super-admin/users`: Cloudflare served stale cached 404 HTML for `dialog-BcGfN6fr.js`, `dropdown-menu-N0rno0ax.js`, and `select-DhGsGac6.js` from one edge variant while the origin had the files.
- Forced a no-cache refresh for those exact URLs from the affected browser edge; the route then loaded all three chunks with HTTP 200 and rendered the Super Admin Users page. Remaining 403s were route authorization, not asset loading.
- The VPS Cloudflare credential available at `/root/.secrets/cloudflare.ini` was not accepted for cache purge API access. If this recurs in another Cloudflare POP, purge these exact asset URLs from the Cloudflare dashboard or with a valid Cache Purge token.
- Added focused Jest coverage for the chunk-load error matcher.
