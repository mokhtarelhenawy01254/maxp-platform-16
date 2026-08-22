# Deploy Workflow Reliability Fixes + Stale HTML Investigation

**Date:** 2026-08-22
**Author:** DevOps (via ZCode session)
**Tags:** `deploy`, `github-actions`, `ssh`, `fail2ban`, `stale-html`, `race-condition`

---

## Part 1 — Why deploys kept failing (evidence-based)

Failure breakdown of the last 50 `deploy.yml` runs (29 success / 9 failure / 11 cancelled):

| # failures | Cause | Evidence |
|---|---|---|
| 6 | **SSH connection from runner → server timed out** | `dial tcp 153.92.x.x: connect: connection timed out`, `Network is unreachable` (runs 32534116201, 32527133910, 32519650640, 32518998211, 32439906430, 32435967107) |
| 1 | i18n validation gate (worked as designed) | 32518566831 — blocked a bad commit |
| 1 | Frontend build error (worked as designed) | 32439555548 — rollup parse error |
| 1 | Storefront smoke test 500 (ambiguous, see Part 3) | 32513754082 |

The 11 cancelled runs are **by design** (`cancel-in-progress` superseded builds).

### SSH timeouts root cause

Failures and successes interleave minutes apart (21:13 ✅ / 21:14 ❌ / 22:40 ✅ / 22:43 ❌ / 22:58 ✅),
which fingerprints **per-IP blocking**, not server downtime: some GitHub runner IPs are banned,
others aren't. This machine's own IP got temporarily blocked during this investigation after a
handful of rapid SSH probes — confirming an active fail2ban-style jail (plus the documented
Hostinger cloud firewall history in `github-actions-ssh-firewall-2026-05-25.md`).

### Changes shipped (this commit)

1. **`deploy.yml` — deploy job now probes SSH with 6 retries (~3 min backoff)** before the
   `appleboy/ssh-action` step, so a single dropped SYN no longer kills the deploy.
   Also added `checkout` + `setup-ssh` steps the probe needs.
2. **`deploy.yml` — `Test SSH Connection` (build job) retries 5×30s** instead of failing the
   finished build on the first timeout.
3. **`deploy.yml` — `fb-check` / `cat-check` now diff `github.event.before..github.sha`**
   instead of `HEAD~1..HEAD`. Multi-commit pushes previously only diffed the *last* commit,
   silently skipping Facebook-Ads regression tests or catalog sync when earlier commits in the
   push touched those paths. Unknown/absent base → conservative `changed=true`.
4. **`deploy-remote.sh` — staging cleanup is now age-guarded (`-mmin +360`)**. The old
   `find ... -exec rm -rf` at deploy start deleted **every other run's staging dir**,
   including dirs belonging to runs whose build job was still SCP-ing tarballs —
   mid-transfer deletion → that run's deploy later finds a missing/partial tarball and
   silently skips the frontend/backend sync. The flock never protected against this
   because the build-job SCP does not hold the flock.

---

## Part 2 — Stale HTML serving old chunks → 404s (OPEN investigation)

**User-visible symptom:** `https://maxp.online/default-sidebar` console shows
`GET /assets/vendor-icons-YjJhKRRq.js 404` (+ 7 more chunks).

**Facts gathered so far (2026-08-22 ~09:00–09:30 UTC):**

1. The live `/` HTML references `index-B7ISSXdp.js` + chunks (`vendor-icons-YjJhKRRq.js` etc.)
   — those chunks return **404** while `index-B7ISSXdp.js` itself returns 200.
2. `index.html` at `/var/www/frontend2/dist/` was synced at 09:08:25 and 09:15:07 by two
   successful deploys (entries `index-BapDjTKM.js` / newer) — those new chunks return 200.
3. Yet `/` kept serving a **Last-Modified of 08:52:54** — a timestamp matching **no deploy's
   frontend sync** (the 08:37 run synced at 08:39:44). An earlier check showed 08:07:23 —
   also matching no deploy.
4. `Cache-Control: no-cache, no-store, must-revalidate` + `cf-cache-status: DYNAMIC` —
   Cloudflare is NOT caching; the stale file comes from the origin.

**Implication:** something on the server writes/serves an `index.html` that the deploy does
not produce, from a path the deploy does not update (mtime semantics point at a real file
with mtime 08:52:54, e.g. `sendFile`/static — while `frontend2/dist/index.html` has mtime
09:15:07). Suspects: a leftover nginx server block/root from an older config era, nginx
`open_file_cache`, or an external writer (old webhook deployer at `/opt/deploy-webhook`,
cron). → Read-only diagnostics workflow **`.github/workflows/diag-stale-html.yml`** added;
delete it once the case is closed.

**Related prior incident:** run 32513754082 (Aug 21) failed its storefront smoke test with
`Unable to find storefront index.html` at a moment the file should have existed — possibly
the same unknown writer interfering.
