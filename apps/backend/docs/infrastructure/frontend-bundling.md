# Frontend Bundling Guardrails

## 2026-04-05 - React runtime chunk split incident

### Incident
- Production frontend rendered a blank screen after deployment.
- Browser console showed a runtime error similar to:
  - `Cannot read properties of undefined (reading 'useState')`
- Root cause was a circular initialization path created by custom Vite `manualChunks` rules.

### Root Cause
- The previous bundling strategy sent uncategorized packages into fallback chunks like `vendor-misc-*`.
- React-adjacent runtime packages such as `react-router`, `@remix-run/router`, `use-sync-external-store`, and `react-redux` were allowed to land outside `vendor-react`.
- That split created cross-chunk dependency cycles during production bundle evaluation, so React exports were not fully initialized when dependent chunks executed.

### Resolution
- Removed the generic fallback vendor bucketing from `frontend/vite.config.ts`.
- Grouped the React runtime and its routing/store synchronization dependencies into a single `vendor-react` chunk:
  - `react`
  - `react-dom`
  - `scheduler`
  - `react-router`
  - `react-router-dom`
  - `@remix-run/router`
  - `use-sync-external-store`
  - `react-redux`
- Removed automatic chunk-recovery reload behavior from the frontend bootstrap and error boundary so real production failures remain visible.

### Guardrails
- Do not reintroduce `vendor-misc-*` or any alphabetical fallback chunking for `node_modules`.
- Keep React runtime packages in one chunk unless a future change is validated against a real production build.
- Prefer surfacing bootstrap failures in the UI and console instead of silent reload loops.
- If a deployment shows a blank screen, inspect the built asset graph first before adding recovery logic.

## 2026-05-04 - Dynamic import chunk 404 during frontend deploy

### Incident
- Production route `/company-dashboard` showed Vite dynamic import failures for hashed chunks such as `CompanyDashboard-*.js`, `BusinessMetrics-*.js`, and `BusinessSurface-*.js`.
- Direct checks after the deploy showed the assets existed and returned `200`, indicating users could hit a short deploy window or keep a tab with a partially published asset graph.

### Root Cause
- The production workflow extracted `frontend.tar.gz` directly into `/var/www/frontend2/dist`.
- During extraction, `index.html` or entry chunks could become visible before every lazy-loaded hashed chunk was present.
- Because Vite chunks are immutable and content-hashed, the safe publish order is: copy all non-HTML assets first, then replace `index.html` last.

### Resolution
- The GitHub Actions production deploy now extracts frontend builds into staging, syncs all files except `index.html` into the live dist, and copies `index.html` only after the chunks are present.
- The manual `deploy.sh` path follows the same staging and `index.html`-last publish order.
- Old hashed assets are retained so already-open browser tabs can still load their previous chunks.

### Guardrails
- Do not deploy frontend builds by extracting or copying the whole `dist` directory over the live path in one pass.
- Keep `index.html` as the final published file for every non-atomic frontend deploy.
- If chunk 404s appear right after a deploy, verify the exact hashed files on disk and test a fresh browser session before changing route code.
