# Meta App Review — status 2026-11-11 (MAXP · App ID 1121885177390870)

## 1. Shipped to production

| # | Change | Commit |
|---|---|---|
| 1 | Default signup app = MAXP (`growth`); `ads-authorize` + `authorize` now return `client_id=1121885177390870` | 406a8bb10 |
| 2 | All 19 review scopes are requested by a real login dialog (page flow + ads flow) | 311477f96 |
| 3 | OAuth `/callback` no longer blocks: page import moved to a background queue (concurrency 6, 3 retries), `/status` exposes `importProgress`, new `POST /facebook-oauth/import-pages` | 311477f96 |
| 4 | Page Insights feature (read_insights) — `GET /api/v1/pages/insights[...]` + `/facebook/insights` screen | 311477f96 |
| 5 | Instagram module — media list, media insights, comments (list/reply/hide/delete), publish (image/reel/video/carousel) + `/instagram-studio/{media,comments,publish}` | 311477f96 |
| 6 | Lead forms — real Graph-backed list + Page selector by name (was an empty stub) | 311477f96 |
| 7 | Page Insights metrics corrected to the Graph v23 valid set | 0e1165dce |

### Safety
`companies` with a NULL `facebookAppKey`: **0** (verified). All 137 existing companies stay on `primary`;
only new signups resolve to MAXP. The `primary` credential chain was never modified.

### Tenant used for filming
`Swan Demo Store` (`cmwbe1jly00objugi7zaf30p9`) was switched to `facebookAppKey='growth'` so it connects
through the MAXP app. It started with 0 pages and is safe to wipe.

## 2. Recording pipeline (rebuilt)

| File | Purpose |
|---|---|
| `%TEMP%\opencode\rec.mjs` | CDP recorder: ~4 fps `Page.captureScreenshot` loop → H.264 1920×1080, no audio, English caption bar, cursor + click ripples, same-tab or popup following, file upload, tab isolation |
| `%TEMP%\opencode\lib-meta.mjs` | shared scenario helpers: `login`, `oauthUrl`, `consent` (stepped Meta dialog incl. asset selection), `approve`, `connectFlow` |
| `%TEMP%\opencode\sc-*.mjs` | one scenario per permission |
| `/root/tools/revoke.cjs` (server) | `DELETE /me/permissions` so each recording gets the **full** consent flow, not the abbreviated one |

Run a video:

```powershell
ssh maxp 'node /root/tools/revoke.cjs'
cd %TEMP%\opencode
node rec.mjs sc-01-pages-show-list.mjs --out 01-pages_show_list --new "about:blank"
```

Output: `%TEMP%\opencode\video\<name>.mp4`

**Lessons baked into the tooling**
- `Page.startScreencast` returns 0 frames on Chrome 157 → screenshot loop only.
- Background tabs return the wrong surface → `Target.activateTarget` + `Emulation.setFocusEmulationEnabled`.
- Stale MaxP tabs overwrite `localStorage.user` across tabs → the recorder closes every other `maxp.online` tab first.
- Meta's dialog hydrates late; coordinate clicks silently do nothing → `clickUntil()` retries and falls back to a DOM `.click()`.
- Meta's buttons/labels can be wrapped in `role=button` divs → text lookup prefers real `<button>`s.

## 3. Videos produced

| Permission | File | Duration | Shows |
|---|---|---|---|
| `pages_show_list` | `video/01-pages_show_list.mp4` | 1:29 | MaxP login → connect screen → Meta login → **two Pages selected by name** → permission review screen → approve → both Pages listed with ids |
| `pages_read_engagement` | `video/02-pages_read_engagement.mp4` | 3:24 | connect → `/facebook/engagement-stats` → page name + followers/fans + post engagement loaded from Graph |
| `read_insights` | `video/03-read_insights.mp4` | 1:21 | connect → `/facebook/insights` → assets by name → KPIs + date range from the insights API |

## 4. Remaining permissions — what each needs

| Permission | Status | Blocker / next step |
|---|---|---|
| `pages_manage_metadata` | ready to film | show page card + reconnect/disconnect; add a Messenger message to prove `subscribed_apps` |
| `pages_manage_posts` | needs UI fix | `/facebook/create-post` renders only "Schedule post for later" for this tenant — the composer body does not render; inspect `FacebookPostCreator` gating (connected pages / media upload) |
| `publish_video` | same as above | same composer, video branch |
| `pages_read_user_content` | needs a live comment | post a comment from a personal profile on a connected Page post, then film `/unified-comments` |
| `pages_manage_engagement` | needs a live comment | same comment, then reply/hide from MaxP and show it on Facebook |
| `pages_messaging` | needs an inbound DM | send a Messenger message to the Page from the owner account, then film `/facebook-inbox` reply + the message in Messenger |
| `instagram_basic` | blocked | **no Instagram professional account is linked to any Page** (Graph + DB both 0) |
| `instagram_manage_messages` | blocked | same |
| `instagram_manage_comments` | blocked | same |
| `instagram_content_publish` | blocked | same |
| `ads_read` | ready to film | ads connect flow → account selector → KPIs + campaign insights |
| `ads_management` | ready to film | wizard → create/pause campaign, verify in Ads Manager |
| `pages_manage_ads` | ready to film | wizard step 5 — Page identity on the creative |
| `business_management` | ready to film | account dropdown grouped by Business portfolio |
| `catalog_management` | needs a catalog | no product catalog exists in any portfolio — create one, then `/advertising/facebook-ads/catalogs` + sync |
| `leads_retrieval` | needs a lead form | create a lead form on a connected Page, then `/advertising/facebook-ads/lead-forms` |

## 5. Submission checklist (per permission)

1. One dedicated video — a permission without its own video is rejected.
2. Show: MaxP login → Meta login → granting the permission → asset chosen **by name** → data fetched → result rendered with the asset name visible.
3. Messaging permissions must show the message in the **native client** (Messenger / Instagram), not only in MaxP.
4. English or English captions (the recorder burns English captions).
5. 1080p, no audio, ≤1440 px CSS width — all satisfied (1280×720 @1.5 = 1920×1080).
6. Never film the Instagram screens while `InstagramSettings` is showing its mock fallback accounts.

## 6. Open follow-ups

- PM2 runs the backend in cluster mode: `importProgress` is per-process, so `/status` can hit a worker that never ran the job. Move progress to Redis/DB before onboarding large accounts.
- `/super-admin/meta-apps` still renders empty in production (frontend rendering bug, API is fine).
- `sidebar.facebookPageInsights` renders as a raw key on some cached clients — hard refresh; the locale key ships in the same commit as the screen.
