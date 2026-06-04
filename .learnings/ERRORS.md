# Errors

Command failures and integration errors.

---

## [ERR-20260519-003] bash-not-on-powershell-path

**Logged**: 2026-05-19T14:06:00+03:00
**Priority**: low
**Status**: observed
**Area**: script-validation

### Summary
`bash -n ...` failed in this PowerShell session because `bash` was not on `PATH`, even though Git Bash is installed.

### Error
```text
The term 'bash' is not recognized as a name of a cmdlet, function, script file, or executable program.
```

### Suggested Fix
Use the explicit Git Bash path for script validation:

```powershell
& "C:\Program Files\Git\bin\bash.exe" -n deploy.sh
& "C:\Program Files\Git\bin\bash.exe" -n backend/deploy.sh
```

### Metadata
- Reproducible: shell-dependent
- Related Files: TOOLS.md, deploy.sh, backend/deploy.sh

---

## [ERR-20260519-002] eslint-json-files-parsed-as-code

**Logged**: 2026-05-19T11:27:00+03:00
**Priority**: low
**Status**: observed
**Area**: frontend-lint

### Summary
Running `npx eslint` directly on locale `.json` files caused `@typescript-eslint/no-unused-expressions` errors because this frontend lint path parsed JSON as executable code.

### Context
- Happened while checking `frontend/src/pages/whatsapp/WhatsAppSettings.tsx` plus `frontend/src/locales/*/sections/whatsappSettings.json`.
- The useful lint target is the TSX file; JSON validity should be covered by parser/build or a JSON-specific verifier.

### Suggested Fix
For focused frontend checks, run ESLint on TS/TSX files and validate locale JSON through build/i18n scripts instead of direct ESLint.

### Metadata
- Reproducible: yes
- Related Files: frontend/src/locales/ar/sections/whatsappSettings.json, frontend/src/locales/en/sections/whatsappSettings.json

---

## [ERR-20260519-001] active-maxp-h-drive-unavailable

**Logged**: 2026-05-19T11:20:00+03:00
**Priority**: low
**Status**: observed
**Area**: workspace-paths

### Summary
The workspace memory says the active MaxP worktree is `H:\max_p_new`, but this Codex desktop session only has `C:\`, `E:\`, `S:\`, and `Temp:\` filesystem drives mounted.

### Error
```text
The directory name is invalid.
```

### Context
- Failed when trying to run `git status` and code searches in `H:\max_p_new`.
- The accessible repo for this session is `E:\max_p_new\max_p_new`.

### Suggested Fix
When `H:\max_p_new` is unavailable, verify mounted drives and fall back to `E:\max_p_new\max_p_new` before doing MaxP work.

### Metadata
- Reproducible: environment-dependent
- Related Files: MEMORY.md, AGENTS.md

---

## [ERR-20260517-003] playwright-browser-missing

**Logged**: 2026-05-17T17:17:00+03:00
**Priority**: low
**Status**: pending
**Area**: browser-qa

### Summary
Local Playwright launch failed because its bundled Chromium executable was not installed.

### Error
```text
browserType.launch: Executable doesn't exist at C:\Users\shrou\AppData\Local\ms-playwright\chromium_headless_shell-1217\...
```

### Context
- Happened during MaxP HR production browser verification after cleaning temporary recruitment smoke data.
- The API/server verification passed; browser QA needed a fallback to installed Chrome or the DevTools MCP.

### Suggested Fix
Use `chromium.launch({ channel: 'chrome' })` when system Chrome is available, or run `npx playwright install` during environment setup.

### Metadata
- Reproducible: yes
- Related Files: frontend/package.json

---

## [ERR-20260517-002] git-https-gcm-hangs

**Logged**: 2026-05-17T16:27:00+03:00
**Priority**: medium
**Status**: pending
**Area**: git/github

### Summary
`git ls-remote maxp2 refs/heads/main` and `git fetch maxp2 main` can hang in Windows Git Credential Manager instead of failing quickly.

### Error
```text
Commands timed out while child `git credential-manager get` processes remained alive.
```

### Context
- Happened while preparing a MaxP HR recruitment release from `E:\max_p_new\max_p_new`.
- The remote was the active HTTPS `mokhtar1983/maxp2` repository.
- Stale `git.exe` and `git credential-manager get` child processes had to be terminated before continuing.

### Suggested Fix
For non-interactive GitHub checks from this workspace, set `GIT_TERMINAL_PROMPT=0` and `GCM_INTERACTIVE=Never`, and kill timed-out credential-manager children before retrying.

### Metadata
- Reproducible: unknown
- Related Files: TOOLS.md

## [ERR-20260516-001] powershell-remote-command-substitution

**Logged**: 2026-05-16T14:19:00+03:00
**Priority**: low
**Status**: resolved
**Area**: infra

### Summary
PowerShell expanded `$(date ...)` locally inside an SSH command before it reached the VPS.

### Error
```text
Get-Date : Cannot bind parameter 'Date'. Cannot convert value "+%Y%m%d%H%M%S" to type "System.DateTime".
```

### Context
- Attempted to create a remote backup directory with `ssh root@153.92.223.119 "ts=$(date +%Y%m%d%H%M%S); ..."`
- PowerShell interpreted `$(date ...)` as local command substitution.
- Re-ran successfully using single quotes around the remote command.

### Suggested Fix
When running remote bash commands from PowerShell that contain `$()`, wrap the remote command in single quotes or base64-encode the script before passing it to SSH.

### Metadata
- Reproducible: yes
- Related Files: `TOOLS.md`

---

## [ERR-20260516-001] unavailable-active-worktree-drive

**Logged**: 2026-05-16T12:20:00+03:00
**Priority**: low
**Status**: pending
**Area**: local-environment

### Summary
The documented active MaxP worktree path on `H:\max_p_new_worktrees\maxp2-snapshot` was unavailable in this Codex desktop session.

### Error
```text
CreateProcess rejected: The directory name is invalid. (os error 267)
```

### Context
- `Get-PSDrive -PSProvider FileSystem` showed only `C:` mounted.
- Continued using the currently opened workspace `C:\Users\H2M\Desktop\Project\max_p_new`.

### Suggested Fix
Before assuming the active worktree path, check mounted drives. If `H:` is absent, document the fallback and avoid blocking production fixes.

### Metadata
- Reproducible: unknown
- Related Files: `TOOLS.md`, `AGENTS.md`

---

## [ERR-20260516-001] production-prisma-variant-schema-mismatch

**Logged**: 2026-05-16T12:10:00+03:00
**Priority**: medium
**Status**: resolved
**Area**: backend

### Summary
Production `ProductVariant` does not expose an `attributes` field, so ad-hoc Wofod inspection scripts must select portable fields such as `metadata`, `name`, `sku`, `price`, and `stock`.

### Error
```text
Unknown field `attributes` for select statement on model `ProductVariant`.
```

### Context
- Attempted a remote Prisma product query while preparing Wofod AI smoke tests.
- The local/older scenario runner had already seen this portability issue, but the one-off query accidentally repeated it.

### Suggested Fix
Avoid `productVariants.attributes` in production scripts unless schema validation proves the field exists; prefer `metadata` for variant details.

### Metadata
- Reproducible: yes
- Related Files: `backend/scripts/run-messenger-ai-scenarios-smoke.js`

### Resolution
- **Resolved**: 2026-05-16T12:11:00+03:00
- **Notes**: Re-ran the production query without `attributes`.

---

## [ERR-20260514-001] playwright-browser-binary-missing

**Logged**: 2026-05-14T15:10:00+03:00
**Priority**: low
**Status**: pending
**Area**: qa

### Summary
Local Playwright package was present, but Chromium headless shell was missing from the user Playwright cache during storefront visual QA.

### Error
```text
browserType.launch: Executable doesn't exist at C:\Users\shrou\AppData\Local\ms-playwright\chromium_headless_shell-1217\chrome-headless-shell-win64\chrome-headless-shell.exe
```

### Context
- Happened while capturing clean desktop/mobile screenshots for the premium butcher storefront preview.
- Avoid installing browser binaries during the task; use the installed Chrome executable path or the Codex in-app browser as a fallback.

### Suggested Fix
For local visual QA on this machine, launch Playwright with `executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"` when the bundled Playwright browser cache is absent.

### Metadata
- Reproducible: yes
- Related Files: frontend/src/storefront/themes/butcher-counter-eg.json

---

## [ERR-20260514-001] product-create-primary-save-still-draft

**Logged**: 2026-05-14T11:40:00+03:00
**Priority**: medium
**Status**: fixed
**Area**: products

### Summary
The first production hotfix made the product editor's primary save publish only when the frontend resolved the user as a workflow manager. The user reported new products were still saved as drafts, which means the role-gated frontend condition was not reliable enough for the production create flow.

### Correction
- Treat the primary save action for new non-merchant products as publish regardless of frontend workflow-manager role resolution.
- Add a backend safeguard in `productController.createProduct`: when a non-merchant create request sends `isActive=true`, force initial workflow to `PUBLISHED` so stale draft workflow metadata cannot override the publish intent.
- Also cover edit mode: primary save for an existing non-merchant draft must publish, and `productController.updateSingleProduct` must force `PUBLISHED` when `isActive=true` so old draft metadata cannot win during PATCH.
- Verify production assets include the new `ProductNewFinal` and `workflow` chunks, production backend contains both `shouldPublishOnCreate` and `shouldPublishOnUpdate`, then save an existing draft from the live UI and confirm it becomes `منشور`.

### Related Files
- `frontend/src/pages/products/ProductNewFinal.tsx`
- `frontend/src/pages/products/utils/workflow.ts`
- `backend/controller/productController.js`

---

## [ERR-20260510-001] maxp-ai-key-schema-query

**Logged**: 2026-05-10T14:04:30+03:00
**Priority**: low
**Status**: pending
**Area**: backend

### Summary
Production one-off scripts can fail when they assume optional generated Prisma fields exist; for example `ai_keys.model` and `CompanyAssistantPendingAction.metadata` are not present in the live generated schema.

### Error
```text
Raw query failed. Code: 42703. Message: column "model" does not exist

Unknown argument `metadata`. Available options are marked with ?.
```

### Context
- Happened during MaxP production Company Assistant provider verification.
- A direct `$queryRawUnsafe` query selected `model` from `ai_keys`, but the production schema does not have that column.
- A later cleanup verification also assumed pending actions had a `metadata` field; the live model stores `arguments`, `requestedByExternalUserId`, and `externalChatId` instead.
- Verification continued with code markers and live provider smoke tests.

### Suggested Fix
Before ad-hoc production schema queries, inspect table columns/generated Prisma fields or reuse the app's existing services instead of assuming column names.

### Metadata
- Reproducible: yes
- Related Files: H:/max_p_new_worktrees/maxp2-company-assistant-ai-provider/backend/services/companyAssistant/CompanyAssistantAgent.js

---

## [ERR-20260509-002] maxp-prisma-company-subdomain-assumption

**Logged**: 2026-05-09T09:55:00+03:00
**Priority**: low
**Status**: resolved
**Area**: backend

### Summary
A production Swan memory-index backfill script failed because it assumed the Prisma `Company` model exposes a `subdomain` field.

### Error
```text
Unknown argument `subdomain`. Available options are marked with ?.
```

### Context
- Attempted a one-off production script that selected `Company.subdomain`.
- Retried using only existing runtime fields (`slug`, `name`) and the Swan backfill succeeded.

### Suggested Fix
For production one-off scripts, query only fields verified in the generated Prisma runtime or use a small raw metadata query before selecting optional model fields.

### Metadata
- Reproducible: yes
- Related Files: H:/max_p_new_worktrees/maxp2-company-assistant-hybrid-memory/backend/prisma/schema

### Resolution
- **Resolved**: 2026-05-09T09:58:00+03:00
- **Commit/PR**: n/a
- **Notes**: Reran the backfill with verified fields and completed Swan indexing.

---

## [ERR-20260509-003] github-actions-ssh-timeout-rerun

**Logged**: 2026-05-09T09:55:00+03:00
**Priority**: medium
**Status**: resolved
**Area**: infra

### Summary
`Deploy to Server` failed at the SSH connection step even though tests/build had passed and local SSH was healthy.

### Error
```text
dial tcp <server>:22: connect: connection timed out
```

### Context
- Happened on GitHub Actions run `25594313461` for the Company Assistant memory-index cleanup follow-up.
- The failure happened before tarball deployment, so no partial runtime update was applied.
- A direct rerun of the same workflow succeeded.

### Suggested Fix
Treat isolated SSH connection timeouts at this step as transient after confirming local SSH/VPS health; rerun the workflow before changing code.

### Metadata
- Reproducible: unknown
- Related Files: .github/workflows/deploy.yml

### Resolution
- **Resolved**: 2026-05-09T09:52:00+03:00
- **Commit/PR**: 563b0542
- **Notes**: Reran the failed workflow and it deployed successfully.

---

## [ERR-20260508-001] powershell-parallel-read-paging-file

**Logged**: 2026-05-08T07:11:52+03:00
**Priority**: low
**Status**: pending
**Area**: tooling

### Summary
PowerShell failed to start several parallel read/diff commands because the local paging file was too small.

### Error
```text
System.IO.FileLoadException: Could not load file or assembly 'System.Management.Automation.dll'.
The paging file is too small for this operation to complete. (0x800705AF)
Failed to create CoreCLR, HRESULT: 0x8007000E
```

### Context
- Occurred while running multiple `Get-Content` and `git diff --check` commands in parallel during final backend verification.
- The focused Jest tests and backend syntax check had already passed; this was a local tooling/resource failure.
- Sequential shell commands continued to work.

### Suggested Fix
Avoid large parallel PowerShell read batches when memory is tight. Rerun final inspections sequentially or through smaller file lists.

### Metadata
- Reproducible: unknown
- Related Files: local PowerShell tooling

---

## [ERR-20260507-001] bundled-rg-access-denied

**Logged**: 2026-05-07T03:21:39+03:00
**Priority**: low
**Status**: pending
**Area**: tooling

### Summary
The bundled `rg.exe` refused to start from the Codex desktop app while searching workspace docs.

### Error
```text
Program 'rg.exe' failed to run ... Access is denied.
```

### Context
- Attempted `rg --files` and a markdown `rg -n` search from `H:\max_p_new`.
- Fallback PowerShell file listing/search worked.

### Suggested Fix
Use PowerShell `Get-ChildItem` / `Select-String` as a local fallback when the bundled ripgrep binary is blocked, or configure a trusted `rg.exe` path for this environment.

### Metadata
- Reproducible: unknown
- Related Files: tooling environment

---

## [ERR-20260505-002] clean-clone-no-space-during-release

**Logged**: 2026-05-05T11:45:00+03:00
**Priority**: medium
**Status**: resolved
**Area**: infra

### Summary
A full clean clone for release isolation failed on `H:` because the drive did not have enough free space.

### Error
```text
fatal: write error: No space left on device
fatal: fetch-pack: invalid index-pack output
```

### Context
- Attempted to clone `origin/main` into `H:\max_p_new_release_silent_fallback_...` to isolate a production push from a dirty working tree.
- The release was later verified from a lightweight git worktree after freeing space.

### Suggested Fix
Prefer `git fetch` plus `git worktree add` for release isolation in this repo, or place temporary clones/worktrees on a drive with verified free space first.

### Metadata
- Reproducible: yes
- Related Files: release workflow

### Resolution
- **Resolved**: 2026-05-05T11:45:00+03:00
- **Notes**: Used a clean worktree from `origin/main` for verification and removed it after checks.

---


## [ERR-20260504-013] remote-node-stdin-dotenv-missing

**Logged**: 2026-05-04T16:28:00+03:00
**Priority**: low
**Status**: resolved
**Area**: production-verification

### Summary
A direct production `node -` smoke over SSH failed to `require('dotenv')` even though the app process itself was healthy.

### Error
```text
Error: Cannot find module 'dotenv'
Require stack:
- /var/www/backend2/[stdin]
```

### Suggested Fix
For short production DB smoke scripts, avoid optional runtime dependencies and parse `.env.production` / `.env` manually or export the needed environment variables from shell before invoking `node -`.

### Resolution
- **Resolved**: 2026-05-04T16:28:00+03:00
- **Notes**: Re-ran the Customer Blocklist production smoke with a dependency-free `.env` parser.

---

## [ERR-20260504-012] playwright-module-not-found-from-repo-root

**Logged**: 2026-05-04T16:25:00+03:00
**Priority**: low
**Status**: resolved
**Area**: browser-verification

### Summary
Production UI smoke scripts that require `playwright` fail when run from the repository root because the dependency is installed under `frontend/node_modules`.

### Error
```text
Error: Cannot find module 'playwright'
Require stack:
- E:\max_p_new\max_p_new\[stdin]
```

### Suggested Fix
Run inline Playwright verification scripts from `frontend/`, or require Playwright through the frontend dependency path.

### Resolution
- **Resolved**: 2026-05-04T16:25:00+03:00
- **Notes**: Re-ran the production Customer Blocklist UI smoke from `frontend/`.

---

## [ERR-20260504-008] prisma-generate-windows-engine-locked

**Logged**: 2026-05-04T16:05:00+03:00
**Priority**: low
**Status**: open
**Area**: local verification

### Summary
`npm run schema:generate` can fail on Windows when a running Node/Prisma process locks the generated query engine DLL.

### Error
```text
EPERM: operation not permitted, rename 'backend\prisma\generated\postgresql_v2\query_engine-windows.dll.node.tmp...' -> 'backend\prisma\generated\postgresql_v2\query_engine-windows.dll.node'
```

### Context
- The modular Prisma schema validated successfully with `npx prisma validate --schema=prisma/schema`.
- Backend syntax and focused service tests passed without regenerating the client.

### Suggested Fix
If a new generated client is required, stop the local backend/dev Node processes that are using Prisma, then rerun `npm run schema:generate`.

### Metadata
- Reproducible: likely while local dev processes are active
- Related Files: backend/prisma/generated/postgresql_v2

### Resolution
- **Resolved**: pending
- **Notes**: Used `prisma validate` as the non-writing schema check for the current task.

---

## [ERR-20260504-011] browser-use-iab-app-server-path-missing

**Logged**: 2026-05-04T15:43:00+03:00
**Priority**: low
**Status**: open
**Area**: browser-verification

### Summary
The Browser Use `iab` runtime failed during setup because the local Codex app-server path could not be found.

### Error
```text
failed to start codex app-server: The system cannot find the path specified. (os error 3)
```

### Context
- The browser skill was loaded and the required `browser-client.mjs` setup path was used.
- The failure happened before navigation, so production verification needed a fallback.

### Suggested Fix
Use the DevTools browser MCP tools for read-only page snapshots/screenshots when the Browser Use app-server path is unavailable, and keep SSH/static asset checks as the production source of truth.

### Metadata
- Reproducible: yes
- Related Files: Browser Use plugin runtime

### Resolution
- **Workaround Used**: 2026-05-04T15:43:00+03:00
- **Notes**: Continued with DevTools/SSH verification instead of blocking production release verification.

---

## [ERR-20260504-010] gh-cli-credential-manager-bad-token

**Logged**: 2026-05-04T15:38:00+03:00
**Priority**: medium
**Status**: open
**Area**: github-actions-verification

### Summary
Git push can succeed through Git credential manager while `gh` Actions reads fail because the credential-manager token exposed to `GH_TOKEN` is invalid for the GitHub API.

### Error
```text
HTTP 401: Bad credentials
Try authenticating with: gh auth login
```

### Context
- `git push origin main` succeeded.
- `gh run list --branch main --workflow "Deploy to Server"` failed after setting `GH_TOKEN` from `git credential fill`.

### Suggested Fix
Do not assume the Git credential-manager password is a valid GitHub API token for `gh`. Prefer a properly authenticated `gh auth login`, the GitHub connector, or direct production SSH checks when Actions access is unavailable.

### Metadata
- Reproducible: yes
- Related Files: GitHub Actions verification workflow

### Resolution
- **Workaround Used**: 2026-05-04T15:38:00+03:00
- **Notes**: Continue with alternate run discovery/production verification instead of relying on the stale CLI token.

---

## [ERR-20260504-009] gh-cli-auth-missing-after-deploy-watch

**Logged**: 2026-05-04T15:24:00+03:00
**Priority**: low
**Status**: open
**Area**: github-verification

### Summary
`gh run view` can fail in this workspace if the GitHub CLI session is not authenticated, even after a previous deploy watch already completed through a token-backed environment.

### Error
```text
To get started with GitHub CLI, please run: gh auth login
Alternatively, populate the GH_TOKEN environment variable with a GitHub API authentication token.
```

### Context
- The GitHub Actions deploy watch had already succeeded.
- A later redundant status query failed because the token was not available to that fresh shell.

### Suggested Fix
When re-querying Actions from this workspace, either ensure `GH_TOKEN` is populated for that shell or rely on the already captured `gh run watch --exit-status` output plus `git rev-list HEAD...origin/main` for final push parity.

### Metadata
- Reproducible: yes
- Related Files: GitHub Actions verification workflow

### Resolution
- **Workaround Used**: 2026-05-04T15:24:00+03:00
- **Notes**: Confirmed `HEAD...origin/main` is `0 0`; production SSH checks passed after the successful deploy watch.

---

## [ERR-20260504-008] powershell-ssh-heredoc-crlf-tail

**Logged**: 2026-05-04T15:22:00+03:00
**Priority**: low
**Status**: resolved
**Area**: production-verification

### Summary
Remote SSH verification scripts piped from a PowerShell here-string can preserve CRLF line endings, which made remote bash pass `25\r` to `tail -n`.

### Error
```text
tail: invalid number of lines: '25\r'
```

### Context
- A multi-line PowerShell here-string was piped into `ssh ... bash -s`.
- Simple health, PM2, Nginx, and asset checks still completed, but the log-tail subsection failed.

### Suggested Fix
For short production checks, prefer explicit one-line SSH commands or send LF-normalized bytes instead of relying on PowerShell pipeline line endings. Keep shell loops minimal and verify they include their closing `done` before sending.

### Metadata
- Reproducible: yes
- Related Files: production SSH verification snippets

### Resolution
- **Resolved**: 2026-05-04T15:22:00+03:00
- **Notes**: Re-ran the checks as separate SSH commands; PM2 was online and recent backend log tail showed normal notification activity with no fresh deploy-time crash.

---

## [ERR-20260504-008] rg-access-denied-codex-windows

**Logged**: 2026-05-04T14:30:32+03:00
**Priority**: low
**Status**: active
**Area**: tooling

### Summary
`rg.exe` from the packaged Codex Windows app failed to start with `Access is denied` while searching the workspace.

### Error
```text
Program 'rg.exe' failed to run ... app\resources\rg.exe ... Access is denied.
```

### Context
- The failure happened before the search itself ran, so it was an environment/runtime issue rather than a bad pattern.
- PowerShell `Get-ChildItem` plus `Select-String` remains a workable fallback for targeted source and built-asset searches.

### Suggested Fix
When `rg` fails this way, switch to `Get-ChildItem ... | Select-String ...` for the current task and avoid blocking production verification on the bundled binary.

### Metadata
- Reproducible: yes
- Related Files: local Codex Windows runtime

### Resolution
- **Resolved**: pending
- **Notes**: Fallback search is being used for the current production investigation.

---

## [ERR-20260504-009] remote-deploy-heredoc-validation-failed-after-swap

**Logged**: 2026-05-04T14:44:05+03:00
**Priority**: medium
**Status**: resolved
**Area**: deploy

### Summary
A frontend production deploy script completed the archive upload, size check, backup, and dist swap, then returned non-zero during a trailing Python heredoc validation block.

### Error
```text
bash: warning: here-document at line 24 delimited by end-of-file (wanted `PY')
NameError: name 'PY' is not defined
```

### Context
- The live `/var/www/frontend2/dist` had already been moved into the timestamped backup and the new extracted dist had already been promoted.
- A separate SSH validation command confirmed the active index timestamp and expected active chunks after the swap.

### Suggested Fix
Keep production mutation and validation in separate SSH calls, or use `python3 -c` for short remote checks to avoid heredoc delimiter issues inside PowerShell here-strings.
When using `python3 -c` from PowerShell, keep that validation in its own simple command as well; nested quotes and comma-separated Python literals can fail PowerShell parsing before SSH starts.

### Metadata
- Reproducible: yes
- Related Files: direct frontend production deploy workflow

### Resolution
- **Resolved**: 2026-05-04T14:44:05+03:00
- **Notes**: Verified active production independently after the failed trailing validation; a later parse-only failure confirmed the validation should stay separated from the deploy command.

---

## [ERR-20260504-010] local-bash-missing-for-deploy-script-check

**Logged**: 2026-05-04T15:14:00+03:00
**Priority**: low
**Status**: mitigated
**Area**: tooling

### Summary
`bash -n deploy.sh` cannot run from the current Windows PowerShell environment because `bash` is not on `PATH`.

### Error
```text
The term 'bash' is not recognized as a name of a cmdlet, function, script file, or executable program.
```

### Suggested Fix
For shell-script syntax checks in this workspace, either locate Git Bash/WSL explicitly or run the syntax check on the VPS via SSH with `bash -n`.
In PowerShell, do not use `< deploy.sh` for stdin redirection; use `Get-Content deploy.sh -Raw | ssh ...` style piping instead.

### Metadata
- Reproducible: yes
- Related Files: deploy.sh

### Resolution
- **Resolved**: mitigated
- **Notes**: Remote SSH `bash -n` passed when the script content was piped through PowerShell.

---

## [ERR-20260504-003] powershell-ssh-here-string-crlf

**Logged**: 2026-05-04T12:43:00+03:00
**Priority**: low
**Status**: resolved
**Area**: deployment

### Summary
PowerShell here-strings piped to remote `bash -s` can preserve CRLF line endings, so the last Linux path may include a hidden `\r` and fail even after the main deployment steps succeed.

### Error
```text
du: cannot access '/var/www/frontend2/dist'$'\r': No such file or directory
```

### Context
- The frontend dist swap completed successfully, but the final verification line failed because `bash` received a carriage return.
- A previous streamed tar upload also timed out before the swap, leaving an incomplete staging directory.

### Suggested Fix
For production deploys from PowerShell, prefer creating a local `.tar.gz`, uploading it with `scp`, then running short `ssh "command"` checks. If piping a script to Linux, normalize line endings before the pipe and avoid putting critical verification only on the final line.

### Metadata
- Reproducible: yes
- Related Files: frontend dist direct deployment workflow

### Resolution
- **Resolved**: 2026-05-04T12:43:00+03:00
- **Notes**: Retried with a local archive plus `scp`, verified file count before swapping, and checked the deployed `dist` with a direct SSH command.

---

## [ERR-20260504-005] parallel-scp-and-remote-check-race

**Logged**: 2026-05-04T12:30:00+03:00
**Priority**: low
**Status**: resolved
**Area**: deploy

### Summary
During a direct production backend hotfix, a remote `node -c /tmp/productController.variant-fix.js` check ran in parallel with the `scp` upload that created that file, so the check briefly failed with `MODULE_NOT_FOUND`.

### Error
```text
Error: Cannot find module '/tmp/productController.variant-fix.js'
```

### Suggested Fix
Do not group dependent upload-and-verify steps in `multi_tool_use.parallel`. Upload first, then run the remote syntax check after `scp` has completed.

### Resolution
Reran the remote syntax check sequentially after upload; it passed, then the backend hotfix was deployed and verified.

---

## [ERR-20260504-003] powershell-ssh-script-crlf-and-local-variable-expansion

**Logged**: 2026-05-04T11:45:00+03:00
---

## [ERR-20260510-001] maxp-ai-key-schema-query

**Logged**: 2026-05-10T14:04:30+03:00
**Priority**: low
**Status**: pending
**Area**: backend

### Summary
Production one-off scripts can fail when they assume optional generated Prisma fields exist; for example `ai_keys.model` and `CompanyAssistantPendingAction.metadata` are not present in the live generated schema.

### Error
```text
Raw query failed. Code: 42703. Message: column "model" does not exist

Unknown argument `metadata`. Available options are marked with ?.
```

### Context
- Happened during MaxP production Company Assistant provider verification.
- A direct `$queryRawUnsafe` query selected `model` from `ai_keys`, but the production schema does not have that column.
- A later cleanup verification also assumed pending actions had a `metadata` field; the live model stores `arguments`, `requestedByExternalUserId`, and `externalChatId` instead.
- Verification continued with code markers and live provider smoke tests.

### Suggested Fix
Before ad-hoc production schema queries, inspect table columns/generated Prisma fields or reuse the app's existing services instead of assuming column names.

### Metadata
- Reproducible: yes
- Related Files: H:/max_p_new_worktrees/maxp2-company-assistant-ai-provider/backend/services/companyAssistant/CompanyAssistantAgent.js

---

## [ERR-20260509-002] maxp-prisma-company-subdomain-assumption

**Logged**: 2026-05-09T09:55:00+03:00
**Priority**: low
**Status**: resolved
**Area**: backend

### Summary
A production Swan memory-index backfill script failed because it assumed the Prisma `Company` model exposes a `subdomain` field.

### Error
```text
Unknown argument `subdomain`. Available options are marked with ?.
```

### Context
- Attempted a one-off production script that selected `Company.subdomain`.
- Retried using only existing runtime fields (`slug`, `name`) and the Swan backfill succeeded.

### Suggested Fix
For production one-off scripts, query only fields verified in the generated Prisma runtime or use a small raw metadata query before selecting optional model fields.

### Metadata
- Reproducible: yes
- Related Files: H:/max_p_new_worktrees/maxp2-company-assistant-hybrid-memory/backend/prisma/schema

### Resolution
- **Resolved**: 2026-05-09T09:58:00+03:00
- **Commit/PR**: n/a
- **Notes**: Reran the backfill with verified fields and completed Swan indexing.

---

## [ERR-20260509-003] github-actions-ssh-timeout-rerun

**Logged**: 2026-05-09T09:55:00+03:00

**Priority**: medium
**Status**: resolved
**Area**: infra

### Summary

A PowerShell-built SSH backup/extract command expanded remote shell variables locally and later passed CRLF line endings into `bash`, causing the remote `tar`/`ls` command to misread paths.

### Error
```text
tar: ./  -C: file changed as we read it
ls: cannot access '/var/www/frontend2/dist'$'\r': No such file or directory
```

### Context
- A double-quoted PowerShell SSH command expanded `$backup` before it reached the remote shell.
- A here-string piped to `ssh ... bash -s` preserved Windows `\r` characters, which became part of remote path arguments.
- The deploy was recoverable because the failing command stopped before the first attempted extract; a later corrected command completed the backup and extract.

### Suggested Fix
For remote multi-line scripts from PowerShell, pass remote values as `bash -s -- <arg>` and strip all carriage returns before piping: `$script = $script -replace "`r", ""`. Avoid writing remote `$variables` inside double-quoted PowerShell command strings unless each `$` is escaped.

### Metadata
- Reproducible: yes
- Related Files: production SSH deploy workflow

### Resolution
- **Resolved**: 2026-05-04T11:45:00+03:00
- **Notes**: Re-ran verification with simple one-line SSH commands and confirmed backup plus frontend production assets.

---

## [ERR-20260504-004] manual-frontend-deploy-quoting-and-preview-token-pitfalls

**Logged**: 2026-05-04T11:05:00+03:00
**Priority**: medium
**Status**: resolved
**Area**: deploy

### Summary
Manual production frontend verification hit avoidable SSH/PowerShell quoting and preview-token helper issues before the WhatsApp mobile deploy was verified.

### Error
```text
bash: -c: line 1: unexpected EOF while looking for matching `"'
Cannot find module 'jsonwebtoken'
SSH command timed out after printing preview auth JSON
```

### Context
- The first remote deploy command embedded a quoted `grep`/shell fragment and failed before touching `/var/www/frontend2/dist`.
- A preview-token helper run from `/root` could not resolve backend dependencies such as `jsonwebtoken`; running it from `/var/www/backend2` with absolute backend imports worked.
- The helper must call `prisma.$disconnect()` and `process.exit(0)` after writing the redacted auth JSON, otherwise the shared Prisma handles can keep SSH open.

### Suggested Fix
Keep manual deploy commands simple: upload an archive, extract to a new directory, verify `index.html`, then `mv` into place with a timestamped backup. Run temporary Node verification helpers from the backend directory, never print tokens in reports, and always disconnect Prisma before exit.

### Metadata
- Reproducible: yes
- Related Files: frontend/tmp/create-prod-preview-token.cjs, frontend/src/pages/whatsapp/WhatsAppChat.tsx

---

## [ERR-20260504-003] powershell-node-e-quote-expands-js-method

**Logged**: 2026-05-04T10:56:00+03:00
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
PowerShell treated a quoted remote `node -e` snippet as local expression text when JavaScript contained `.toString('utf8')`, so token generation failed before SSH executed.

### Error
```text
Cannot find an overload for "toString" and the argument count: "1".
Failed to generate token
```

### Context
- The failing command embedded JavaScript inside a PowerShell double-quoted SSH command.
- Backslash escaping did not protect the nested JavaScript quotes in PowerShell.

### Suggested Fix
For remote Node snippets from PowerShell, create a temporary UTF-8 script and run it with `node <script>`, or use PowerShell backtick escaping deliberately. Avoid dense nested `node -e` strings for deployment verification.

### Metadata
- Reproducible: yes
- Related Files: production browser verification workflow

---

## [ERR-20260504-004] manual-production-chunk-patch-overwritten-by-later-build

**Logged**: 2026-05-04T11:12:00+03:00
**Priority**: medium
**Status**: resolved
**Area**: deploy

### Summary
A manual production patch for the Turbo recreate button disappeared because a later frontend build replaced the active OrderDetails chunk name from `OrderDetails-QeyIrIGI.js` to `OrderDetails-BWC4-_Pl.js`, and the backend controller also reverted to a version without `replaceExisting`.

### Error
```text
User could not see "إرجاع على Turbo تاني"; old patched chunk no longer existed on production.
```

### Context
- `https://maxp.online/orders/` was serving `assets/index-Cj_wxtRR.js`, which loaded `OrderDetails-BWC4-_Pl.js`.
- The manual patch had been applied to the previous active chunk and was not in the newer deployed source.
- Static assets also had precompressed `.gz/.br` variants, so the served compressed file must be regenerated or removed after direct asset edits.

### Suggested Fix
When manually hot-patching production Vite assets, always re-trace the current `index.html -> App -> lazy chunk` chain immediately before and after patching, patch the current chunk, regenerate `.gz` and `.br` variants where applicable, verify through `maxp.online` with cache busting, and browser-test in a fresh context.

### Metadata
- Reproducible: yes
- Related Files: `/var/www/frontend2/dist/assets/OrderDetails-BWC4-_Pl.js`, `/var/www/backend2/controller/turboController.js`
=======
`Deploy to Server` failed at the SSH connection step even though tests/build had passed and local SSH was healthy.

### Error
```text
dial tcp <server>:22: connect: connection timed out
```

### Context
- Happened on GitHub Actions run `25594313461` for the Company Assistant memory-index cleanup follow-up.
- The failure happened before tarball deployment, so no partial runtime update was applied.
- A direct rerun of the same workflow succeeded.

### Suggested Fix
Treat isolated SSH connection timeouts at this step as transient after confirming local SSH/VPS health; rerun the workflow before changing code.

### Metadata
- Reproducible: unknown
- Related Files: .github/workflows/deploy.yml

### Resolution
- **Resolved**: 2026-05-09T09:52:00+03:00
- **Commit/PR**: 563b0542
- **Notes**: Reran the failed workflow and it deployed successfully.

---

## [ERR-20260508-001] powershell-parallel-read-paging-file

**Logged**: 2026-05-08T07:11:52+03:00
**Priority**: low
**Status**: pending
**Area**: tooling

### Summary
PowerShell failed to start several parallel read/diff commands because the local paging file was too small.

### Error
```text
System.IO.FileLoadException: Could not load file or assembly 'System.Management.Automation.dll'.
The paging file is too small for this operation to complete. (0x800705AF)
Failed to create CoreCLR, HRESULT: 0x8007000E
```

### Context
- Occurred while running multiple `Get-Content` and `git diff --check` commands in parallel during final backend verification.
- The focused Jest tests and backend syntax check had already passed; this was a local tooling/resource failure.
- Sequential shell commands continued to work.

### Suggested Fix
Avoid large parallel PowerShell read batches when memory is tight. Rerun final inspections sequentially or through smaller file lists.

### Metadata
- Reproducible: unknown
- Related Files: local PowerShell tooling

---

## [ERR-20260507-001] bundled-rg-access-denied

**Logged**: 2026-05-07T03:21:39+03:00
**Priority**: low
**Status**: pending
**Area**: tooling

### Summary
The bundled `rg.exe` refused to start from the Codex desktop app while searching workspace docs.

### Error
```text
Program 'rg.exe' failed to run ... Access is denied.
```

### Context
- Attempted `rg --files` and a markdown `rg -n` search from `H:\max_p_new`.
- Fallback PowerShell file listing/search worked.

### Suggested Fix
Use PowerShell `Get-ChildItem` / `Select-String` as a local fallback when the bundled ripgrep binary is blocked, or configure a trusted `rg.exe` path for this environment.

### Metadata
- Reproducible: unknown
- Related Files: tooling environment

---

## [ERR-20260505-002] clean-clone-no-space-during-release

**Logged**: 2026-05-05T11:45:00+03:00
**Priority**: medium
**Status**: resolved
**Area**: infra

### Summary
A full clean clone for release isolation failed on `H:` because the drive did not have enough free space.

### Error
```text
fatal: write error: No space left on device
fatal: fetch-pack: invalid index-pack output
```

### Context
- Attempted to clone `origin/main` into `H:\max_p_new_release_silent_fallback_...` to isolate a production push from a dirty working tree.
- The release was later verified from a lightweight git worktree after freeing space.

### Suggested Fix
Prefer `git fetch` plus `git worktree add` for release isolation in this repo, or place temporary clones/worktrees on a drive with verified free space first.

### Metadata
- Reproducible: yes
- Related Files: release workflow

### Resolution
- **Resolved**: 2026-05-05T11:45:00+03:00
- **Notes**: Used a clean worktree from `origin/main` for verification and removed it after checks.


---

## [ERR-20260504-002] local_prisma_table_name_mismatch

**Logged**: 2026-05-04T00:00:00+03:00
**Priority**: medium
**Status**: resolved
**Area**: backend

### Summary
Raw SQL for the merchant payout UAT setup referenced `"merchants"` but the local Prisma model `Merchant` has no `@@map`, so the actual table is `"Merchant"`.

### Error
```text
Raw query failed. Code: 42P01. Message: relation "merchants" does not exist
```

### Context
- Command: `node scripts\uat\run-affiliate-merchant-scale-scenario.js`
- The failure happened in the idempotent merchant payout schema setup before scenario data creation.
- `safe(undefined)` also threw while serializing error details, hiding the original failure path.

### Suggested Fix
Use the model's real mapped table name when writing raw FK SQL, and make script error serialization tolerate `undefined` details.

### Metadata
- Reproducible: yes
- Related Files: backend/scripts/uat/run-affiliate-merchant-scale-scenario.js, backend/prisma/migrations/add_merchant_payouts.sql

### Resolution
- **Resolved**: 2026-05-04T00:00:00+03:00
- **Notes**: Updated the FK reference to `"Merchant"` and hardened `safe(...)`.

---

## [ERR-20260504-001] local-marketplace-diagnostics

**Logged**: 2026-05-04T15:00:00+03:00
**Priority**: low
**Status**: pending
**Area**: tooling

### Summary
Marketplace debugging from the workspace root hit stale or unavailable local tooling before the backend-local checks worked.

### Error
```text
rg.exe failed with Access denied from the bundled Codex app path.
check_apps.js imports ./backend/prisma/generated/mysql_fixed, which no longer exists.
dotenv is not resolvable from the workspace root; run Node diagnostics from backend/ instead.
```

### Context
- Attempted to search marketplace app code and count local apps while investigating why local Marketplace showed fewer applications than production.
- Backend-local Node commands using `backend/services/sharedDatabase` worked and showed the real local DB/catalog mismatch.

### Suggested Fix
Prefer backend-scoped diagnostics for Marketplace/Prisma checks, and either repair or remove the stale root `check_apps.js` helper.

### Metadata
- Reproducible: yes
- Related Files: check_apps.js, backend/controller/marketplaceController.js

---

## [ERR-20260503-004] browser-use-node-runtime-too-old

**Logged**: 2026-05-03T15:05:00+03:00
**Priority**: low
**Status**: mitigated
**Area**: tooling

### Summary
The Browser Use Node REPL helper cannot start when the bundled Node runtime is older than the plugin requirement.

### Error
```text
Node runtime too old ... found v22.16.0, requires >= v22.22.0
```

### Suggested Fix
Use direct Playwright smoke scripts from the frontend workspace until the Node runtime used by the Node REPL MCP is upgraded.

### Metadata
- Reproducible: yes
- Related Files: frontend UI smoke tests

---

## [ERR-20260503-003] frontend-build-blocked-by-conflict-markers

**Logged**: 2026-05-03T14:29:00+03:00
**Priority**: medium
**Status**: pending
**Area**: frontend

### Summary
Direct Vite build can fail before reaching touched affiliate pages when unrelated conflict markers are present in storefront code.

### Error
```text
frontend/src/storefront/StorefrontShell.tsx:463:0: ERROR: Unexpected "<<"
&lt;&lt;&lt;&lt;&lt;&lt;&lt; HEAD
```

### Suggested Fix
Resolve the `StorefrontShell.tsx` merge conflict before using full frontend build as a release gate. Use focused Jest/ESLint for isolated affiliate work until the unrelated conflict is cleaned up.

### Metadata
- Reproducible: yes
- Related Files: frontend/src/storefront/StorefrontShell.tsx

---

## [ERR-20260503-002] prisma-generate-locked-windows-engine

**Logged**: 2026-05-03T14:22:12+03:00
**Priority**: low
**Status**: mitigated
**Area**: tooling

### Summary
`npm run schema:generate` can fail on Windows when Prisma tries to rename a generated `query_engine-windows.dll.node` that is currently locked by a running Node/backend process.

### Error
```text
EPERM: operation not permitted, rename '...query_engine-windows.dll.node.tmp...' -> '...query_engine-windows.dll.node'
```

### Suggested Fix
If the engine binary is locked but schema metadata must be refreshed, run `npx prisma generate --schema=prisma/schema --no-engine`. Stop the backend process before a full engine regenerate.

### Metadata
- Reproducible: intermittent
- Related Files: backend/prisma/schema

---

## [ERR-20260503-001] rg-windows-bundled-access-denied

**Logged**: 2026-05-03T08:40:00+03:00
**Priority**: low
**Status**: pending
**Area**: tooling

### Summary
The bundled `rg.exe` path failed with `Access is denied` during CI workflow inspection on Windows.

### Error
```text
Program 'rg.exe' failed to run: An error occurred trying to start process
'C:\Program Files\WindowsApps\OpenAI.Codex_...\app\resources\rg.exe' ...
Access is denied.
```

### Context
- Attempted to search `.github` and storefront files while monitoring PR #22 checks.
- The failure appears local to the Codex bundled ripgrep executable, not the repository or GitHub Actions.
- PowerShell `Get-ChildItem` / `Select-String` remains a safe fallback when `rg` cannot launch.

### Suggested Fix
Fallback to `Select-String` for local searches if bundled `rg.exe` is blocked by Windows app permissions.

### Metadata
- Reproducible: unknown
- Related Files: .github/workflows/storefront-validation.yml, frontend/src/storefront/scripts/audit-storefront-centering.ts

---

## [ERR-20260503-001] rg-windowsapps-access-denied

**Logged**: 2026-05-03T00:00:00+02:00
**Priority**: medium
**Status**: pending
**Area**: infra

### Summary
`rg.exe` could not be launched from the Codex app bundle in this workspace because Windows returned `Access is denied`, so PowerShell-native file discovery had to be used instead.

### Error
```text
Program 'rg.exe' failed to run: An error occurred trying to start process
'C:\Program Files\WindowsApps\OpenAI.Codex_26.421.620.0_x64__2p2nqsd0c76g0\app\resources\rg.exe'
with working directory 'D:\max_p_new\max_p_new'. Access is denied.
```

### Context
- Command attempted: `rg --files -g "BOOTSTRAP.md" -g "SOUL.md" -g "USER.md" -g "MEMORY.md" -g "memory/*.md"`
- Environment: Codex desktop on Windows, workspace `D:\max_p_new\max_p_new`
- Fallback used successfully: `Get-ChildItem`, `Get-Content`, and `Select-String`

### Suggested Fix
When `rg` fails from the bundled WindowsApps path, fall back immediately to PowerShell-native search/read commands instead of retrying the same binary.

### Metadata
- Reproducible: yes
- Related Files: D:\max_p_new\max_p_new\.learnings\ERRORS.md

---

## [ERR-20260503-002] powershell-oom-during-git-push

**Logged**: 2026-05-03T05:10:00+03:00
**Priority**: medium
**Status**: resolved
**Area**: tooling

### Summary
PowerShell crashed with an OutOfMemory/security configuration error before running `git push`, while `cmd /d /c git push ...` worked.

### Error
```text
PowerShell has stopped working because of a security issue: Cannot read the configuration file:
C:\Program Files\PowerShell\7\powershell.config.json
System.OutOfMemoryException
```

### Context
- Occurred after a large frontend build left multiple high-memory Node processes.
- The Git command itself had not reached the remote yet.
- Retrying via `cmd /d /c git push ...` bypassed the PowerShell startup failure.

### Suggested Fix
When PowerShell cannot start commands due memory/config errors, retry simple Git/GitHub operations through `cmd /d /c`, then inspect heavy Node processes before running more tooling.

### Metadata
- Reproducible: unknown
- Related Files: none

---

## [ERR-20260502-008] powershell-git-stash-reflog-braces

**Logged**: 2026-05-02T17:25:00+03:00
**Priority**: low
**Status**: mitigated
**Area**: tooling

### Summary
PowerShell can misparse Git stash reflog references with braces when they are not quoted.

### Error
```text
git stash drop stash@{0}
error: unknown switch `e`
```

### Context
- The failure happened while dropping a temporary stash after resolving a pre-pull conflict.
- Quoting the reflog reference works as expected.

### Suggested Fix
Use quotes for stash references in PowerShell, for example: `git stash drop 'stash@{0}'`.

### Metadata
- Reproducible: yes
- Related Files: none

---

## [ERR-20260502-007] powershell-ssh-inline-node-quoting

**Logged**: 2026-05-02T13:35:00+03:00
**Priority**: low
**Status**: pending
**Area**: tooling

### Summary
PowerShell parsed inline JavaScript and shell pipes intended for remote SSH before they reached the Linux server.

### Error
```text
Missing expression after ','
head : The term 'head' is not recognized as the name of a cmdlet
```

### Context
- The failure happened while reading a production JSON report over SSH.
- Double-quoted remote commands with `node -e`, arrow functions, `$(...)`, or pipes can be parsed locally by PowerShell.
- A single-quoted remote command worked reliably:
  `ssh root@host 'cd /path && report=$(ls -t tmp/*.json | head -1); grep ... $report'`

### Suggested Fix
For Linux commands over SSH from PowerShell, prefer a single-quoted remote command string or upload/run a script file instead of nesting inline JavaScript inside double quotes.

### Metadata
- Reproducible: yes
- Related Files: none

---

## [ERR-20260502-006] production-whatsapp-inspection-assumptions

**Logged**: 2026-05-02T14:45:00+03:00
**Priority**: low
**Status**: mitigated
**Area**: tooling

### Summary
Production WhatsApp read-only inspection failed when assuming the app path and message schema from memory instead of reading PM2 and Prisma context first.

### Error
```text
cd: /var/www/maxp/backend: No such file or directory
Cannot find module './config/prisma'
Unknown argument `direction`
```

### Context
- PM2 reports the production backend cwd as `/var/www/backend2`.
- The production/local WhatsApp message model uses `fromMe` and `messageType`; it does not use `direction` or `type`.
- The shared Prisma client is initialized through `services/sharedDatabase`.

### Suggested Fix
For production WhatsApp checks, start with `pm2 describe maxp-backend`, then run read-only scripts from that cwd using `initializeSharedDatabase()`, `fromMe: false` for inbound, and `fromMe: true` for outbound.

### Metadata
- Reproducible: yes
- Related Files: backend/services/whatsapp/WhatsAppManager.js, backend/prisma/schema/messaging.prisma

---

## 2026-05-02 - Production `ProductVariant` Prisma delegate has no `attributes` field

- **Context**: While inspecting production AI conversations, a temporary Node script selected `productVariants.attributes`.
- **Failure**: Production Prisma returned `Unknown field attributes for select statement on model ProductVariant`.
- **Correction**: Use `metadata`, `name`, and `type` for production inspection scripts unless the generated Prisma schema is verified first. `CoreAIAgent` can still tolerate missing `variant.attributes` because `resolveVariantAttributes(...)` falls back to metadata/name parsing.
## [ERR-20260429-003] powershell-arabic-regex-corruption

**Logged**: 2026-04-29T18:38:00+03:00
**Priority**: low
**Status**: pending
**Area**: tooling

### Summary
PowerShell here-strings can corrupt Arabic text passed into `node --input-type=module`, turning Arabic regex alternatives into `?` characters and causing invalid regex syntax.

### Error
```text
SyntaxError: Invalid regular expression: /???|?????|.../: Nothing to repeat
```

### Context
- A Playwright production smoke script used Arabic words inside a JavaScript regular expression.
- The script was piped from PowerShell into Node and the Arabic pattern was replaced with question marks before Node parsed it.
- Recurred on 2026-05-03 during affiliate UI smoke testing; an Arabic regex in a PowerShell-piped Node script became `???` and failed before Playwright could run.

### Suggested Fix
Avoid Arabic literals inside regexes in PowerShell-piped Node scripts. Prefer DOM snapshots without Arabic regex filtering, Unicode escapes, or write/run a UTF-8 `.mjs` file when Arabic literals are necessary.

### Metadata
- Reproducible: yes
- Related Files: frontend production smoke scripts

---

## [ERR-20260429-002] powershell-ssh-quoting

**Logged**: 2026-04-29T18:11:00+03:00
**Priority**: low
**Status**: pending
**Area**: infra

### Summary
PowerShell expanded remote Bash variables inside a double-quoted SSH command, breaking the production verification script before it reached the VPS.

### Error
```text
bash: -c: line 1: syntax error near unexpected token `done'
http://127.0.0.1:/api/v1/health
```

### Context
- Command attempted: SSH production health/log verification from PowerShell.
- `$p` and `$(cat ...)` were interpolated locally by PowerShell instead of being preserved for Bash on the server.
- The SSH connection itself worked; only command quoting failed.

### Suggested Fix
For multi-line remote Bash from PowerShell, pass a single-quoted here-string or escape every `$` that belongs to the remote shell.

### Metadata
- Reproducible: yes
- Related Files: TOOLS.md

---

## [ERR-20260430-003] production-smoke-script-hanging-handles

**Logged**: 2026-04-30T18:45:00+03:00
**Priority**: low
**Status**: resolved
**Area**: backend

### Summary
A temporary production smoke script that required `CoreAIAgent` hung because loaded services kept Node handles open.

### Error
```text
command timed out after 124062 milliseconds
```

### Context
- Occurred while validating the Swan wrong-size support-intent fix on `/var/www/backend2`.
- The script printed no final result because it did not call `process.exit(0)` after synchronous helper checks.
- A related production-context smoke also exposed schema assumptions: `Conversation.pageId` and `Customer.name` are not fields in the generated production Prisma client.

### Suggested Fix
For temporary production Node smoke scripts that import backend services, always end with explicit `process.exit(...)` and select only verified Prisma fields.

### Metadata
- Reproducible: yes
- Related Files: backend/services/CoreAIAgent.js
- See Also: ERR-20260429-005

### Resolution
- **Resolved**: 2026-04-30T18:49:00+03:00
- **Notes**: Killed the hanging temp process, added `process.exit(0)`, removed invalid schema fields, reran the production context smoke successfully, and deleted temp scripts locally/remotely.

---

## [ERR-20260430-002] overly-broad-support-special-case

**Logged**: 2026-04-30T18:35:00+03:00
**Priority**: medium
**Status**: resolved
**Area**: backend

### Summary
A new wrong-size support reply branch accidentally handled every message whose detected intent was already `support`.

### Error
```text
Expected substring: "سياسة الإرجاع"
Received string: "بنعتذر لك جداً يا فندم، حقك علينا. ممكن تبعتلنا رقم الأوردر والمقاس اللي وصلك والمقاس المطلوب عشان نراجع الاستبدال بسرعة؟"
```

### Context
- Occurred while adding post-purchase wrong-size intent handling in `CoreAIAgent`.
- The helper `isPostPurchaseIssueIntentMessage(...)` returned true for `detectedIntent === 'support'`, which was too broad for deterministic wrong-size replies.
- This would have overridden normal RAG/policy answers such as return-policy fee questions.

### Suggested Fix
Keep generic `support` detection in `isSupportIntentMessage(...)`; make post-purchase issue helpers depend on the actual message wording.

### Metadata
- Reproducible: yes
- Related Files: backend/services/CoreAIAgent.js, backend/tests/services/CoreAIAgent.catalogVariantContext.test.js

### Resolution
- **Resolved**: 2026-04-30T18:36:00+03:00
- **Notes**: Removed the `detectedIntent === 'support'` shortcut from the post-purchase issue helper so policy support remains RAG-driven.

---

## [ERR-20260430-001] local-verification-tooling

**Logged**: 2026-04-30T10:18:00+03:00
**Priority**: low
**Status**: pending
**Area**: tests

### Summary
Local verification hit two tooling limits while testing the order-confirmation settings changes.

### Error
```text
rg.exe failed to start from the bundled WindowsApps path with "Access is denied".
npm run type-check exceeded the 120s timeout without producing a scoped result.
```

### Context
- Occurred while validating the order-confirmation settings page rules UI.
- Falling back to PowerShell `Select-String` worked for targeted schema searches.
- Targeted `esbuild`, `node --check`, and the order-confirmation integration Jest suite completed successfully.
- A quick Prisma preview-seed probe also failed when selecting `user.name`; this schema uses `firstName` and `lastName` instead.

### Suggested Fix
For this workspace on Windows, use `Select-String` as a fallback when bundled `rg.exe` is blocked, prefer scoped TypeScript/build checks for fast feedback before attempting a full project `tsc`, and select `firstName`/`lastName` for users rather than `name`.

### Metadata
- Reproducible: unknown
- Related Files: frontend/src/pages/settings/OrderConfirmationSettings.tsx

---

## [ERR-20260430-001] codex-rg-access-denied-and-wide-select-string-timeout

**Logged**: 2026-04-30T06:45:00+03:00
**Priority**: low
**Status**: pending
**Area**: infra

### Summary
Local code search using the bundled `rg.exe` failed with Access Denied, and a broad PowerShell `Select-String` fallback timed out on generated/large files.

### Error
```text
Program 'rg.exe' failed to run: Access is denied.
command timed out after 120052 milliseconds
```

### Context
- Occurred while reviewing the order confirmation system in `H:\max_p_new`.
- The reliable fallback was `git grep` for tracked files, plus narrow line-range reads for specific files.

### Suggested Fix
Prefer `git grep` in this workspace when bundled `rg.exe` is blocked. Avoid broad recursive `Select-String` over `backend`, `frontend`, `prisma`, and generated files without a strict file list.

### Metadata
- Reproducible: unknown
- Related Files: backend/services/CoreAIAgent.js, backend/services/orderConfirmationService.js

---

## [ERR-20260426-001] rg-execution-denied

**Logged**: 2026-04-26T00:00:00+03:00
**Priority**: low
**Status**: pending
**Area**: config

### Summary
`rg.exe` could not be executed in this Windows Codex session because the shell returned `Access is denied`.

### Error
```text
Program 'rg.exe' failed to run: Access is denied
```

### Context
- Command attempted: `rg --files ...` and `rg -n --hidden -S ...`
- Environment: Codex desktop session on Windows / PowerShell in `F:\max_p_new\max_p_new`
- Workaround used successfully: `Get-ChildItem` and `Select-String`

### Suggested Fix
Check local Windows execution permissions or security policy for `rg.exe`, and default to PowerShell-native search in this workspace until that is resolved.

### Metadata
- Reproducible: yes
- Related Files: F:\max_p_new\max_p_new\AGENTS.md, F:\max_p_new\max_p_new\.learnings\ERRORS.md

---

## [ERR-20260425-002] skill-installer-python-path

**Logged**: 2026-04-25T17:13:01.1613994+03:00
**Priority**: medium
**Status**: pending
**Area**: config

### Summary
The skill installer scripts cannot be invoked with bare `python` in this Codex Windows setup because Python is not on `PATH`.

### Error
```text
Python was not found; run without arguments to install from the Microsoft Store, or disable this shortcut from Settings > Apps > Advanced app settings > App execution aliases.
```

### Context
- Command attempted: `python .../skill-installer/scripts/list-skills.py --format json`
- Task context: install requested Codex skills from the official skill-installer workflow
- Successful workaround: use the bundled runtime path from Codex workspace dependencies at `C:\Users\shrou\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe`

### Suggested Fix
When running Codex skill helper scripts in this environment, default to the bundled Python executable instead of assuming `python` exists on `PATH`.

### Metadata
- Reproducible: yes
- Related Files: E:\max_p_new\max_p_new\.learnings\ERRORS.md, E:\max_p_new\max_p_new\TOOLS.md

---

## [ERR-20260425-003] skill-creator-quick-validate-missing-pyyaml

**Logged**: 2026-04-25T17:13:01.1613994+03:00
**Priority**: medium
**Status**: pending
**Area**: config

### Summary
`skill-creator/scripts/quick_validate.py` is not usable in this environment because the bundled Python runtime does not include the `yaml` module.

### Error
```text
ModuleNotFoundError: No module named 'yaml'
```

### Context
- Command attempted: `quick_validate.py` against newly installed local skills under `C:\Users\shrou\.codex\skills`
- Task context: validate the newly created `self-improving`, `ui-generator`, `e-commerce-builder`, `prompt-optimizer`, and `data-feedback` skills
- Successful workaround: run manual structural checks for `SKILL.md`, `agents/openai.yaml`, TODO removal, frontmatter `name` matching the folder name, and prompt metadata sanity

### Suggested Fix
Either add `PyYAML` to the bundled Python runtime used by Codex skill tooling or keep a manual validation fallback script for local skill authoring.

### Metadata
- Reproducible: yes
- Related Files: E:\max_p_new\max_p_new\.learnings\ERRORS.md, E:\max_p_new\max_p_new\TOOLS.md

---

## [ERR-20260425-001] codex-apply-patch-changelog-mojibake-context

**Logged**: 2026-04-25T12:48:00+03:00
**Priority**: low
**Status**: pending
**Area**: docs

### Summary
`apply_patch` failed when targeting `CHANGELOG.md` using nearby Arabic headings because the terminal-rendered text was mojibake and did not match the file context reliably.

### Error
```text
apply_patch verification failed: Failed to find expected lines in CHANGELOG.md
```

### Context
- Task context: document the Facebook Messenger token repair and AI image-reply fail-fast fix.
- Failed operation: patching `CHANGELOG.md` using the next Arabic section header as context.
- Successful workaround: patch the first `---` separator directly with an insertion block, and avoid using mojibake-rendered Arabic lines as patch anchors.

### Suggested Fix
When a markdown file renders Arabic headings incorrectly in this shell, anchor `apply_patch` on stable ASCII separators or code fences instead of the corrupted text lines.

### Metadata
- Reproducible: yes
- Related Files: C:\Users\H2M\Desktop\Project\max_p_new\CHANGELOG.md, C:\Users\H2M\Desktop\Project\max_p_new\.learnings\ERRORS.md

---

## [ERR-20260421-001] rg-exe-launch

**Logged**: 2026-04-21T00:00:00Z
**Priority**: medium
**Status**: pending
**Area**: config

### Summary
Bundled `rg.exe` could not launch from this Codex desktop environment, so repo searches needed a PowerShell fallback.

### Error
```
Program 'rg.exe' failed to run ... with working directory 'H:\max_p_new'. Access is denied.
```

### Context
- Command attempted: `rg -n ...`
- Environment: Codex desktop app on Windows, workspace `H:\max_p_new`
- Impact: file/content search still worked via `Get-ChildItem` + `Select-String`, but `rg` could not be used

### Suggested Fix
Prefer a PowerShell-native search fallback in this environment when `rg` launch fails with access denied.

### Metadata
- Reproducible: yes
- Related Files: H:/max_p_new/.learnings/ERRORS.md
## [ERR-20260424-001] browser-use-node-repl-runtime

**Logged**: 2026-04-24T17:38:52.3720958+03:00
**Priority**: medium
**Status**: pending
**Area**: tools

### Summary
Browser Use could not start through the Node REPL because the configured local Node runtime was too old for `node_repl`, so localhost UI QA had to fall back to shell-driven Playwright.

### Error
```text
Node runtime too old for node_repl (resolved C:\Program Files\nodejs\node.exe): found v22.16.0, requires >= v22.22.0.
```

### Context
- Operation attempted: initialize the in-app browser runtime for `http://localhost:3000/settings/storefront/theme`
- Environment: Codex desktop session on Windows / workspace `F:\max_p_new\max_p_new`
- Successful workaround: authenticate through the local API, inject session storage in a Playwright shell script, then capture desktop/mobile screenshots from the authenticated page.

### Suggested Fix
Update the Node runtime used by `node_repl` or point `NODE_REPL_NODE_PATH` to a newer installation so Browser Use can work normally for local visual QA.

### Metadata
- Reproducible: yes
- Related Files: F:\max_p_new\max_p_new\frontend\src\pages\settings\StorefrontSettingsPage.tsx

---

## [ERR-20260423-001] powershell-ssh-expansion

**Logged**: 2026-04-23T03:55:00+03:00
**Priority**: low
**Status**: pending
**Area**: tools

### Summary
PowerShell expands `$()` and `$variable` fragments inside double-quoted `ssh ...` commands before they reach the remote shell.

### Error
```text
Get-Date : Cannot bind parameter 'Date'. Cannot convert value "+%Y%m%d-%H%M%S" to type "System.DateTime".
```

### Context
- Command attempted: remote backup command using `ssh ... "ts=$(date +%Y%m%d-%H%M%S) ..."`
- Working directory: `F:\max_p_new\max_p_new`
- The local PowerShell parser evaluated the subshell syntax before SSH transmitted it.

### Suggested Fix
For multiline remote scripts in this workspace, prefer a single-quoted here-string piped into `ssh ... 'bash -s'`, or generate values locally and escape remote `$` usage explicitly.

### Metadata
- Reproducible: yes
- Related Files: F:\max_p_new\max_p_new\.learnings\ERRORS.md

---

## [ERR-20260421-001] powershell-select-string-denied-node-modules

**Logged**: 2026-04-21T00:00:00+03:00
**Priority**: low
**Status**: pending
**Area**: tools

### Summary
Broad `Select-String` glob searches can fail in this Windows workspace when they descend into protected `node_modules` paths.

### Error
```text
Select-String : The file F:\max_p_new\max_p_new\backend\node_modules\ipaddr.js cannot be read: Access to the path ... is denied.
```

### Context
- Command attempted: broad `Select-String -Path 'backend/**/*.js','frontend/src/**/*.ts*' ...`
- Working directory: `F:\max_p_new\max_p_new`
- The failure happened while tracing campaign attribution flow. Narrowing the search to explicit app files worked immediately.

### Suggested Fix
Prefer explicit file paths or exclude `node_modules` when using PowerShell glob searches in this environment.

### Metadata
- Reproducible: yes
- Related Files: F:\max_p_new\max_p_new\.learnings\ERRORS.md

---

## [ERR-20260420-001] frontend-build-missing-rollup-visualizer

**Logged**: 2026-04-20T20:20:00+03:00
**Priority**: medium
**Status**: pending
**Area**: config

### Summary
`npm run build` in `frontend/` failed before bundling because Vite could not resolve `rollup-plugin-visualizer` from `vite.config.ts`.

### Error
```text
failed to load config from C:\Users\H2M\Desktop\Project\max_p_new\frontend\vite.config.ts
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'rollup-plugin-visualizer'
```

### Context
- Command attempted: `npm run build`
- Working directory: `C:\Users\H2M\Desktop\Project\max_p_new\frontend`
- `package.json` already lists `rollup-plugin-visualizer` in `devDependencies`, so the current environment likely has an incomplete/misaligned `node_modules` install rather than a code regression from the inbox-summary UI change

### Suggested Fix
Reinstall or repair frontend dependencies so `rollup-plugin-visualizer` exists in `frontend/node_modules`, then rerun the Vite build.

### Metadata
- Reproducible: yes
- Related Files: C:\Users\H2M\Desktop\Project\max_p_new\frontend\vite.config.ts

---

## [ERR-20260419-001] rg-exe-access-denied-in-codex-windows

**Logged**: 2026-04-19T15:58:00+03:00
**Priority**: low
**Status**: pending
**Area**: docs

### Summary
`rg` was unavailable in this Codex Windows session because the packaged executable could not be started, so PowerShell file enumeration had to be used as the fallback.

### Error
```text
Program 'rg.exe' failed to run ... Access is denied.
```

### Context
- Command attempted: `rg --files frontend backend shared prisma docs`
- Working directory: `D:\max_p_new\max_p_new`
- The failure happened before the documentation inventory pass for frontend/backend modules
- Fallback used successfully: `Get-ChildItem ... -Recurse -File`

### Suggested Fix
When `rg` fails in this Windows Codex environment with an access error, switch immediately to PowerShell-native search commands instead of retrying the same binary.

### Metadata
- Reproducible: yes
- Related Files: D:\max_p_new\max_p_new\.learnings\ERRORS.md

---

## [ERR-20260419-002] python-launcher-no-output-in-shell-command

**Logged**: 2026-04-19T16:01:00+03:00
**Priority**: low
**Status**: pending
**Area**: docs

### Summary
Direct `python`, `py`, and full-path Python invocations returned exit code 1 with no captured stdout in this shell-command context, so the `.docx` export had to be generated with pure PowerShell/OpenXML instead.

### Error
```text
Exit code: 1
No captured output
```

### Context
- Commands attempted: `python --version`, `py -3 --version`, full-path `python.exe -c "..."`
- Workspace: `D:\max_p_new\max_p_new`
- Objective: convert the generated Arabic markdown document into a Word file
- Fallback that worked: build a minimal DOCX package with PowerShell and `System.IO.Compression.ZipFile`

### Suggested Fix
When Python invocations fail silently in this environment, prefer PowerShell-native generation for document export tasks instead of spending time retrying different launch forms.

### Metadata
- Reproducible: yes
- Related Files: D:\max_p_new\max_p_new\.learnings\ERRORS.md

---

## [ERR-20260415-001] rg-windows-access-denied

**Logged**: 2026-04-15T19:36:26.8851530+02:00
**Priority**: low
**Status**: pending
**Area**: config

### Summary
`rg.exe` failed with `Access is denied` in this Windows workspace, so repository search needed a PowerShell fallback.

### Error
```text
Program 'rg.exe' failed to run: Access is denied
```

### Context
- Command attempted: `rg -n "companyId|previewTheme|StorefrontShell|buildStorefrontPath|storefront" frontend/src/App.tsx frontend/src/storefront -g '!**/*.map'`
- Environment: PowerShell on Windows in `F:\max_p_new\max_p_new`
- The failure happened before the storefront browser-test setup, so I switched to `Select-String` and targeted file reads instead of relying on `rg`

### Suggested Fix
If this recurs, verify execution permissions for `rg.exe` in the current environment and keep a PowerShell search fallback for Windows sessions.

### Metadata
- Reproducible: unknown
- Related Files: F:\max_p_new\max_p_new\.learnings\ERRORS.md

---

## [ERR-20260330-001] rg.exe

**Logged**: 2026-03-30T12:47:29.8200252+02:00
**Priority**: medium
**Status**: pending
**Area**: tools

### Summary
The packaged `rg.exe` binary could not be launched from the workspace on Windows.

### Error
```text
Program 'rg.exe' failed to run ... Access is denied.
```

### Context
- Command attempted: `rg -n "shipping-zones|handleSaveShipping|ShippingModalV2|StoreSettings" -S .`
- Working directory: `H:\max_p_new`
- Fallback used successfully: `git grep` and PowerShell `Select-String`

### Suggested Fix
Prefer `git grep` or PowerShell search in this environment when the packaged `rg.exe` is blocked by Windows app execution permissions.

### Metadata
- Reproducible: yes
- Related Files: H:\max_p_new\backend\controller\shippingZoneController.js

---

## [ERR-20260330-002] powershell-ssh-quoting

**Logged**: 2026-03-30T14:47:52.8375112+02:00
**Priority**: medium
**Status**: pending
**Area**: infra

### Summary
PowerShell mangled several SSH commands that contained JavaScript fragments, `$(...)`, commas, or nested quotes.

### Error
```text
ParserError / local command substitution happened before the remote shell saw the intended command.
```

### Context
- Command pattern attempted: inline `ssh myserver "node -e \"...\""` and remote commands containing `$(date ...)`
- Environment: Windows PowerShell driving Linux commands over SSH
- Reliable fallback: pipe raw scripts to `ssh ... bash -s` or `ssh ... node -`, and avoid inline JavaScript inside double-quoted PowerShell command strings

### Suggested Fix
When sending complex remote commands from PowerShell, prefer stdin-based scripts over nested inline quoting.

### Metadata
- Reproducible: yes
- Related Files: H:\max_p_new\.learnings\ERRORS.md

---

## [ERR-20260402-001] ripgrep-exec-blocked

**Logged**: 2026-04-02T02:07:19.1795813+02:00
**Priority**: low
**Status**: pending
**Area**: infra

### Summary
The packaged `rg.exe` could not be launched in this Codex Windows environment because execution was denied.

### Error
```text
Program 'rg.exe' failed to run ... Access is denied.
```

### Context
- Command attempted: `rg -n "admin/companies|SuperAdminCompanies|companies" -S .`
- Working directory: `H:\max_p_new`
- Environment: Codex desktop app on Windows / PowerShell
- Successful fallback: PowerShell `Get-ChildItem ... | Select-String ...`

### Suggested Fix
When `rg.exe` is blocked here, switch directly to `Select-String` or `git grep` instead of retrying ripgrep.

### Metadata
- Reproducible: yes
- Related Files: H:\max_p_new\.learnings\ERRORS.md

---

## [ERR-20260408-002] storefront-flow-vitest-jsdom-navigation

**Logged**: 2026-04-08T01:37:00+02:00
**Priority**: medium
**Status**: pending
**Area**: tests

### Summary
Targeted Vitest run for the storefront browser flow currently has one passing checkout-page suite and one failing end-to-end-like flow due to navigation behavior under JSDOM.

### Error
```text
Error: Not implemented: navigation (except hash changes)
TestingLibraryElementError: Unable to find role="heading" and name "Atlas Tee"
```

### Context
- Command: `npx vitest run src/storefront/__tests__/storefrontFlow.test.tsx src/storefront/__tests__/checkoutPageCart.test.tsx`
- `checkoutPageCart.test.tsx` passed
- `storefrontFlow.test.tsx` failed after clicking the product link, which suggests the test currently relies on browser navigation behavior that JSDOM is not emulating as expected

### Suggested Fix
Stabilize the storefront flow test by preventing native anchor navigation in JSDOM or updating the router/test harness so product-page transitions stay inside React Router during the test.

### Metadata
- Reproducible: yes
- Related Files: H:\max_p_new\frontend\src\storefront\__tests__\storefrontFlow.test.tsx, H:\max_p_new\.learnings\ERRORS.md

---

## [ERR-20260408-001] rg-exe-access-denied

**Logged**: 2026-04-08T01:35:00+02:00
**Priority**: low
**Status**: pending
**Area**: infra

### Summary
Bundled `rg.exe` could not start from this Codex Windows session, so repository search had to fall back to PowerShell `Select-String`.

### Error
```text
Program 'rg.exe' failed to run ... Access is denied.
```

### Context
- Command attempted from workspace root before repo inspection
- Failure happened in the Codex Windows app session on 2026-04-08
- Fallback search with `Get-ChildItem` + `Select-String` worked

### Suggested Fix
If `rg.exe` is blocked in this environment, use PowerShell-native search commands for the rest of the session and investigate Windows execution permissions separately.

### Metadata
- Reproducible: yes
- Related Files: H:\max_p_new\.learnings\ERRORS.md

---

## [ERR-20260405-001] prisma-generate-powershell-profile

**Logged**: 2026-04-05T00:00:00+02:00
**Priority**: medium
**Status**: pending
**Area**: infra

### Summary
`npm run schema:generate` failed in PowerShell due to the interactive profile, not due to Prisma schema errors.

### Error
```text
Set-PSReadLineKeyHandler ... OutOfMemoryException
```

### Context
- Command attempted: `npm run schema:generate`
- Working directory: `backend`
- The same generate step succeeded when re-run with `powershell -NoProfile -Command "npm run schema:generate"`
- `npx prisma validate --schema=prisma/schema` had already passed before the retry

### Suggested Fix
For scripted Prisma commands on this machine, prefer `powershell -NoProfile` to avoid loading the interactive PSReadLine profile.

### Metadata
- Reproducible: yes

---

## [ERR-20260408-001] powershell-large-read-commands

**Logged**: 2026-04-08T01:15:54.8544808+02:00
**Priority**: medium
**Status**: pending
**Area**: tools

### Summary
Some large PowerShell file-read/search commands aborted or crashed while inspecting marketplace files in this workspace.

### Error
```text
OutOfMemoryException / Stack overflow / command aborted
```

### Context
- Commands attempted: broad `Get-Content`, `Get-ChildItem ... | Select-String`, and wildcard reads like `Marketplace.*`
- Working directory: `H:\max_p_new`
- Reliable fallback: smaller `Get-Content -First ... | Out-String` reads and narrower `Select-String` scopes

### Suggested Fix
Prefer bounded file reads and narrow searches in this environment instead of broad wildcard content loads.

### Metadata
- Reproducible: unknown
- Related Files: H:\max_p_new\frontend\src\pages\marketplace\Marketplace.tsx, H:\max_p_new\backend\catalog\marketplace\apps.json
- Related Files: backend/package.json

---

## [ERR-20260404-001] ripgrep-exec-blocked

**Logged**: 2026-04-04T20:56:00+02:00
**Priority**: low
**Status**: pending
**Area**: infra

### Summary
The packaged `rg.exe` was blocked again in this Codex Windows environment while tracing the product slug bug.

### Error
```text
Program 'rg.exe' failed to run ... Access is denied.
```

### Context
- Command attempted: `rg -n --hidden -S "slug|product link|products/|استنساخ|clone|duplicate|copy product|slug" .`
- Working directory: `H:\max_p_new`
- Successful fallback: `git grep` and PowerShell `Select-String`

### Suggested Fix
Default to `git grep` or `Select-String` in this environment when search is needed quickly.

### Metadata
- Reproducible: yes
- Related Files: H:\max_p_new\.learnings\ERRORS.md
- See Also: ERR-20260402-001

---

## [ERR-20260404-002] ripgrep-exec-blocked-storefront

**Logged**: 2026-04-04T21:03:00+02:00
**Priority**: low
**Status**: pending
**Area**: infra

### Summary
The packaged `rg.exe` was blocked again while tracing the storefront checkout/cart implementation.

### Error
```text
Program 'rg.exe' failed to run ... Access is denied.
```

### Context
- Command attempted: `rg --files`
- Working directory: `H:\max_p_new`
- Successful fallback: PowerShell `Get-ChildItem` and `Select-String`

### Suggested Fix
When this Codex Windows environment blocks `rg.exe`, switch immediately to native PowerShell search commands instead of retrying ripgrep.

### Metadata
- Reproducible: yes
- Related Files: H:\max_p_new\.learnings\ERRORS.md
- See Also: ERR-20260404-001

---

## [ERR-20260404-003] chrome-devtools-transport-closed

**Logged**: 2026-04-04T22:15:00+02:00
**Priority**: low
**Status**: pending
**Area**: infra

### Summary
Chrome DevTools MCP transport dropped after page reloads during storefront/admin verification.

### Error
```text
tool call failed ... Caused by: Transport closed
```

### Context
- Operations attempted: `new_page`, `click`
- Current task: re-open the exact admin edit URL after multiple reloads
- Workaround used: continue verification through existing snapshots and automated tests

### Suggested Fix
After repeated reloads, re-establish the browser session before relying on more DevTools actions.

### Metadata
- Reproducible: unknown
- Related Files: H:\max_p_new\.learnings\ERRORS.md

---

## [ERR-20260404-004] chrome-devtools-mcp-profile-lock-and-transport-loss

**Logged**: 2026-04-04T22:15:37.5936092+02:00
**Priority**: medium
**Status**: pending
**Area**: infra

### Summary
Chrome DevTools MCP could not be reused for the requested open Chrome page because the automation profile was locked by stale `chrome-devtools-mcp` processes, and after cleaning them the MCP transport stayed closed for this session.

### Error
```text
The browser is already running for C:\Users\mokhtar\.cache\chrome-devtools-mcp\chrome-profile.
tool call failed for `chrome-devtools/list_pages`
Caused by: Transport closed
```

### Context
- User explicitly requested testing through the already open Chrome page at `http://localhost:3000/products/cmnkpq10r00aevpoo0b0mo1w0/edit`
- Attempted operations: `list_pages`, `new_page`
- Confirmed stale `chrome-devtools-mcp` Node/Chrome processes were holding `C:\Users\mokhtar\.cache\chrome-devtools-mcp\chrome-profile`
- Stopped only MCP-related Chrome/Node/CMD processes, not the user's regular Edge session
- After cleanup, DevTools tool transport remained unavailable in the current Codex session

### Suggested Fix
If MCP reports a locked automation profile and then `Transport closed`, restart or reinitialize the Chrome DevTools MCP integration before retrying browser actions from this session.

### Metadata
- Reproducible: yes
- Related Files: H:\max_p_new\.learnings\ERRORS.md
- See Also: ERR-20260404-003

---

## [ERR-20260405-001] vite-build-windows-public-assets-scandir

**Logged**: 2026-04-05T10:39:00+02:00
**Priority**: medium
**Status**: pending
**Area**: frontend

### Summary
Local Windows production build hit environment-specific filesystem failures unrelated to the chunk-recovery code change.

### Error
```text
[vite:esbuild] The service was stopped: write ENOMEM
UNKNOWN: unknown error, scandir 'H:\\max_p_new\\frontend\\public\\assets\\files'
```

### Context
- Command attempted: `npm run build` in `H:\max_p_new\frontend`
- First failure was `esbuild` memory exhaustion; retrying with `NODE_OPTIONS=--max-old-space-size=8192` moved past that point
- Second failure happened during Vite's public asset copy step while scanning `frontend/public/assets/files`
- The target directory and contained font files were still readable through PowerShell, which suggests a Windows-specific Vite/filesystem issue rather than a missing asset

### Suggested Fix
When local Windows builds fail in this pattern, prefer validating the change in a Linux build environment or investigate why Vite's public asset copy step intermittently fails on `frontend/public/assets/files`.

### Metadata
- Reproducible: yes
- Related Files: H:\max_p_new\.learnings\ERRORS.md, H:\max_p_new\frontend\public\assets\files

---
## [ERR-20260418-001] rg_access_denied

**Logged**: 2026-04-18T13:15:00+02:00
**Priority**: medium
**Status**: pending
**Area**: backend

### Summary

g.exe is not executable in this environment and fails with Access is denied.

### Error
`
Program 'rg.exe' failed to run: Access is denied
`

### Context
- Command attempted: 
g -n ...
- Workspace: F:\max_p_new\max_p_new
- Fallback: use PowerShell Select-String instead of ripgrep in this environment.

### Suggested Fix
Check local ripgrep installation/permissions, or prefer Select-String on this machine.

### Metadata
- Reproducible: yes
- Related Files: backend/services/CoreAIAgent.js

---

## [ERR-20260330-002] powershell-ssh-quoting

**Logged**: 2026-03-30T14:47:52.8375112+02:00
**Priority**: medium
**Status**: pending
**Area**: infra

### Summary
PowerShell mangled several SSH commands that contained JavaScript fragments, `$(...)`, commas, or nested quotes.

### Error
```text
ParserError / local command substitution happened before the remote shell saw the intended command.
```

### Context
- Command pattern attempted: inline `ssh myserver "node -e \"...\""` and remote commands containing `$(date ...)`
- Environment: Windows PowerShell driving Linux commands over SSH
- Reliable fallback: pipe raw scripts to `ssh ... bash -s` or `ssh ... node -`, and avoid inline JavaScript inside double-quoted PowerShell command strings

### Suggested Fix
When sending complex remote commands from PowerShell, prefer stdin-based scripts over nested inline quoting.

### Metadata
- Reproducible: yes
- Related Files: H:\max_p_new\.learnings\ERRORS.md

---

## [ERR-20260402-001] ripgrep-exec-blocked

**Logged**: 2026-04-02T02:07:19.1795813+02:00
**Priority**: low
**Status**: pending
**Area**: infra

### Summary
The packaged `rg.exe` could not be launched in this Codex Windows environment because execution was denied.

### Error
```text
Program 'rg.exe' failed to run ... Access is denied.
```

### Context
- Command attempted: `rg -n "admin/companies|SuperAdminCompanies|companies" -S .`
- Working directory: `H:\max_p_new`
- Environment: Codex desktop app on Windows / PowerShell
- Successful fallback: PowerShell `Get-ChildItem ... | Select-String ...`

### Suggested Fix
When `rg.exe` is blocked here, switch directly to `Select-String` or `git grep` instead of retrying ripgrep.

### Metadata
- Reproducible: yes
- Related Files: H:\max_p_new\.learnings\ERRORS.md

---

## [ERR-20260408-002] storefront-flow-vitest-jsdom-navigation

**Logged**: 2026-04-08T01:37:00+02:00
**Priority**: medium
**Status**: pending
**Area**: tests

### Summary
Targeted Vitest run for the storefront browser flow currently has one passing checkout-page suite and one failing end-to-end-like flow due to navigation behavior under JSDOM.

### Error
```text
Error: Not implemented: navigation (except hash changes)
TestingLibraryElementError: Unable to find role="heading" and name "Atlas Tee"
```

### Context
- Command: `npx vitest run src/storefront/__tests__/storefrontFlow.test.tsx src/storefront/__tests__/checkoutPageCart.test.tsx`
- `checkoutPageCart.test.tsx` passed
- `storefrontFlow.test.tsx` failed after clicking the product link, which suggests the test currently relies on browser navigation behavior that JSDOM is not emulating as expected

### Suggested Fix
Stabilize the storefront flow test by preventing native anchor navigation in JSDOM or updating the router/test harness so product-page transitions stay inside React Router during the test.

### Metadata
- Reproducible: yes
- Related Files: H:\max_p_new\frontend\src\storefront\__tests__\storefrontFlow.test.tsx, H:\max_p_new\.learnings\ERRORS.md

---

## [ERR-20260408-001] rg-exe-access-denied

**Logged**: 2026-04-08T01:35:00+02:00
**Priority**: low
**Status**: pending
**Area**: infra

### Summary
Bundled `rg.exe` could not start from this Codex Windows session, so repository search had to fall back to PowerShell `Select-String`.

### Error
```text
Program 'rg.exe' failed to run ... Access is denied.
```

### Context
- Command attempted from workspace root before repo inspection
- Failure happened in the Codex Windows app session on 2026-04-08
- Fallback search with `Get-ChildItem` + `Select-String` worked

### Suggested Fix
If `rg.exe` is blocked in this environment, use PowerShell-native search commands for the rest of the session and investigate Windows execution permissions separately.

### Metadata
- Reproducible: yes
- Related Files: H:\max_p_new\.learnings\ERRORS.md

---

## [ERR-20260405-001] prisma-generate-powershell-profile

**Logged**: 2026-04-05T00:00:00+02:00
**Priority**: medium
**Status**: pending
**Area**: infra

### Summary
`npm run schema:generate` failed in PowerShell due to the interactive profile, not due to Prisma schema errors.

### Error
```text
Set-PSReadLineKeyHandler ... OutOfMemoryException
```

### Context
- Command attempted: `npm run schema:generate`
- Working directory: `backend`
- The same generate step succeeded when re-run with `powershell -NoProfile -Command "npm run schema:generate"`
- `npx prisma validate --schema=prisma/schema` had already passed before the retry

### Suggested Fix
For scripted Prisma commands on this machine, prefer `powershell -NoProfile` to avoid loading the interactive PSReadLine profile.

### Metadata
- Reproducible: yes

---

## [ERR-20260408-001] powershell-large-read-commands

**Logged**: 2026-04-08T01:15:54.8544808+02:00
**Priority**: medium
**Status**: pending
**Area**: tools

### Summary
Some large PowerShell file-read/search commands aborted or crashed while inspecting marketplace files in this workspace.

### Error
```text
OutOfMemoryException / Stack overflow / command aborted
```

### Context
- Commands attempted: broad `Get-Content`, `Get-ChildItem ... | Select-String`, and wildcard reads like `Marketplace.*`
- Working directory: `H:\max_p_new`
- Reliable fallback: smaller `Get-Content -First ... | Out-String` reads and narrower `Select-String` scopes

### Suggested Fix
Prefer bounded file reads and narrow searches in this environment instead of broad wildcard content loads.

### Metadata
- Reproducible: unknown
- Related Files: H:\max_p_new\frontend\src\pages\marketplace\Marketplace.tsx, H:\max_p_new\backend\catalog\marketplace\apps.json
- Related Files: backend/package.json

---

## [ERR-20260404-001] ripgrep-exec-blocked

**Logged**: 2026-04-04T20:56:00+02:00
**Priority**: low
**Status**: pending
**Area**: infra

### Summary
The packaged `rg.exe` was blocked again in this Codex Windows environment while tracing the product slug bug.

### Error
```text
Program 'rg.exe' failed to run ... Access is denied.
```

### Context
- Command attempted: `rg -n --hidden -S "slug|product link|products/|استنساخ|clone|duplicate|copy product|slug" .`
- Working directory: `H:\max_p_new`
- Successful fallback: `git grep` and PowerShell `Select-String`

### Suggested Fix
Default to `git grep` or `Select-String` in this environment when search is needed quickly.

### Metadata
- Reproducible: yes
- Related Files: H:\max_p_new\.learnings\ERRORS.md
- See Also: ERR-20260402-001

---

## [ERR-20260404-002] ripgrep-exec-blocked-storefront

**Logged**: 2026-04-04T21:03:00+02:00
**Priority**: low
**Status**: pending
**Area**: infra

### Summary
The packaged `rg.exe` was blocked again while tracing the storefront checkout/cart implementation.

### Error
```text
Program 'rg.exe' failed to run ... Access is denied.
```

### Context
- Command attempted: `rg --files`
- Working directory: `H:\max_p_new`
- Successful fallback: PowerShell `Get-ChildItem` and `Select-String`

### Suggested Fix
When this Codex Windows environment blocks `rg.exe`, switch immediately to native PowerShell search commands instead of retrying ripgrep.

### Metadata
- Reproducible: yes
- Related Files: H:\max_p_new\.learnings\ERRORS.md
- See Also: ERR-20260404-001

---

## [ERR-20260404-003] chrome-devtools-transport-closed

**Logged**: 2026-04-04T22:15:00+02:00
**Priority**: low
**Status**: pending
**Area**: infra

### Summary
Chrome DevTools MCP transport dropped after page reloads during storefront/admin verification.

### Error
```text
tool call failed ... Caused by: Transport closed
```

### Context
- Operations attempted: `new_page`, `click`
- Current task: re-open the exact admin edit URL after multiple reloads
- Workaround used: continue verification through existing snapshots and automated tests

### Suggested Fix
After repeated reloads, re-establish the browser session before relying on more DevTools actions.

### Metadata
- Reproducible: unknown
- Related Files: H:\max_p_new\.learnings\ERRORS.md

---

## [ERR-20260404-004] chrome-devtools-mcp-profile-lock-and-transport-loss

**Logged**: 2026-04-04T22:15:37.5936092+02:00
**Priority**: medium
**Status**: pending
**Area**: infra

### Summary
Chrome DevTools MCP could not be reused for the requested open Chrome page because the automation profile was locked by stale `chrome-devtools-mcp` processes, and after cleaning them the MCP transport stayed closed for this session.

### Error
```text
The browser is already running for C:\Users\mokhtar\.cache\chrome-devtools-mcp\chrome-profile.
tool call failed for `chrome-devtools/list_pages`
Caused by: Transport closed
```

### Context
- User explicitly requested testing through the already open Chrome page at `http://localhost:3000/products/cmnkpq10r00aevpoo0b0mo1w0/edit`
- Attempted operations: `list_pages`, `new_page`
- Confirmed stale `chrome-devtools-mcp` Node/Chrome processes were holding `C:\Users\mokhtar\.cache\chrome-devtools-mcp\chrome-profile`
- Stopped only MCP-related Chrome/Node/CMD processes, not the user's regular Edge session
- After cleanup, DevTools tool transport remained unavailable in the current Codex session

### Suggested Fix
If MCP reports a locked automation profile and then `Transport closed`, restart or reinitialize the Chrome DevTools MCP integration before retrying browser actions from this session.

### Metadata
- Reproducible: yes
- Related Files: H:\max_p_new\.learnings\ERRORS.md
- See Also: ERR-20260404-003

---

## [ERR-20260405-001] vite-build-windows-public-assets-scandir

**Logged**: 2026-04-05T10:39:00+02:00
**Priority**: medium
**Status**: pending
**Area**: frontend

### Summary
Local Windows production build hit environment-specific filesystem failures unrelated to the chunk-recovery code change.

### Error
```text
[vite:esbuild] The service was stopped: write ENOMEM
UNKNOWN: unknown error, scandir 'H:\\max_p_new\\frontend\\public\\assets\\files'
```

### Context
- Command attempted: `npm run build` in `H:\max_p_new\frontend`
- First failure was `esbuild` memory exhaustion; retrying with `NODE_OPTIONS=--max-old-space-size=8192` moved past that point
- Second failure happened during Vite's public asset copy step while scanning `frontend/public/assets/files`
- The target directory and contained font files were still readable through PowerShell, which suggests a Windows-specific Vite/filesystem issue rather than a missing asset

### Suggested Fix
When local Windows builds fail in this pattern, prefer validating the change in a Linux build environment or investigate why Vite's public asset copy step intermittently fails on `frontend/public/assets/files`.

### Metadata
- Reproducible: yes
- Related Files: H:\max_p_new\.learnings\ERRORS.md, H:\max_p_new\frontend\public\assets\files

---

## [ERR-20260417-001] codex-windows-rg-and-user-ssh-access

**Logged**: 2026-04-17T23:47:11.0289836+02:00
**Priority**: medium
**Status**: pending
**Area**: infra

### Summary
The Codex desktop Windows environment failed on fast repo search with `rg` and denied direct filesystem listing of `%USERPROFILE%\.ssh`, even though `ssh` itself could still connect successfully.

### Error
```text
Program 'rg.exe' failed to run: Access is denied.
Program 'rg.exe' failed to run: StandardErrorEncoding is only supported when standard error is redirected.
Get-ChildItem: Access to the path 'C:\Users\mokhtar\.ssh' is denied.
```

### Context
- Task context: inspect workspace for SSH/server instructions, then connect to the production server and seed a demo store
- Failed operations: PowerShell `rg` search across the workspace and `Get-ChildItem $HOME\.ssh -Force`
- Successful workaround: use PowerShell `Get-ChildItem` / `Select-String` for targeted searches and test SSH access directly with `ssh -o BatchMode=yes ...`
- Confirmed impact scope: filesystem enumeration was blocked, but outbound SSH authentication still worked from the same session

### Suggested Fix
On this Codex Windows setup, treat `rg` and direct `.ssh` listing as potentially unavailable; fall back to targeted PowerShell search and verify SSH by running `ssh` directly instead of inspecting key files.

### Metadata
- Reproducible: yes
- Related Files: H:\max_p_new\.learnings\ERRORS.md, H:\max_p_new\AGENTS.md, H:\max_p_new\TOOLS.md

---

## [ERR-20260420-001] codex-windows-rg-access-denied-in-workspace

**Logged**: 2026-04-20T16:55:00+03:00
**Priority**: medium
**Status**: pending
**Area**: infra

### Summary
`rg.exe` was not executable in this Codex Windows workspace session, so repo search had to fall back to native PowerShell discovery commands.

### Error
```text
Program 'rg.exe' failed to run: Access is denied.
```

### Context
- Task context: inspect workspace startup files and locate `CoreAIAgent.js` before implementing structured JSON conversation summaries.
- Failed operation: `rg --files -g "BOOTSTRAP.md" -g "SOUL.md" -g "USER.md" -g "MEMORY.md" -g "memory/*.md"`
- Successful workaround: use `Get-ChildItem` to locate files and `Get-Content` / `Select-String` for targeted inspection.

### Suggested Fix
In this Codex Windows environment, assume `rg` may be blocked and prefer PowerShell-native search commands as the first fallback.

### Metadata
- Reproducible: yes
- Related Files: C:\Users\H2M\Desktop\Project\max_p_new\.learnings\ERRORS.md, C:\Users\H2M\Desktop\Project\max_p_new\AGENTS.md

---

## [ERR-20260421-001] storefront-analytics-track-routes-blocked-by-global-security

**Logged**: 2026-04-21T05:33:00+03:00
**Priority**: high
**Status**: pending
**Area**: analytics

### Summary
Storefront analytics tracking routes existed in `backend/routes/analyticsRoutes.js` as public handlers, but production still returned `401` because `globalSecurity` did not whitelist `POST /api/v1/analytics/track/*`.

### Error
```text
POST /api/v1/analytics/track/store-visit 401 Unauthorized
POST /api/v1/analytics/track/product-view 401 Unauthorized
Frontend follow-up error: No refresh token
```

### Context
- Task context: Swan storefront analytics page showed no visit/product-view data even though the store had live traffic.
- Root cause: `globalSecurity` ran before `/api/v1/analytics` routes and treated tracking endpoints as protected admin analytics paths.
- Verified fix: after adding `POST /api/v1/analytics/track/*` to `PUBLIC_ROUTES` and restarting `maxp-backend`, live probes to `https://swan.maxp.online/api/v1/analytics/track/store-visit` and `/track/product-view` returned `200`.
- Extra deployment finding: the frontend source tree on `/var/www/frontend2` is older than the currently served `dist/` bundle, so rebuilding on the server can fail on missing source files/dependencies even when the live bundle still works.

### Suggested Fix
Whenever a route under `/api/v1/analytics/track/*` is meant for storefront guests, whitelist it in `globalSecurity` and add an integration test that mounts `globalSecurity` plus `analyticsRoutes` and verifies `200` without auth.

### Metadata
- Reproducible: yes
- Related Files: F:\max_p_new\max_p_new\backend\middleware\globalSecurity.js, F:\max_p_new\max_p_new\backend\routes\analyticsRoutes.js, F:\max_p_new\max_p_new\backend\tests\integration\storefrontPublicRoutes.test.js

---

## [ERR-20260422-001] skill-creator-init-script-import-path

**Logged**: 2026-04-22T17:29:27.8674867+02:00
**Priority**: medium
**Status**: pending
**Area**: tools

### Summary
`init_skill.py` from the global `skill-creator` package failed to import its sibling module in this Windows session unless Python was launched through `runpy` with the script directory inserted into `sys.path`.

### Error
```text
ModuleNotFoundError: No module named 'generate_openai_yaml'
```

### Context
- Command attempted: direct execution of `C:\Users\mo1\.codex\skills\.system\skill-creator\scripts\init_skill.py`
- Working directory: `F:\max_p_new\max_p_new`
- Python executable used successfully afterward: `C:\Program Files\PostgreSQL\18\pgAdmin 4\python\python.exe`
- Reliable workaround: launch Python with `-c`, insert `C:\Users\mo1\.codex\skills\.system\skill-creator\scripts` into `sys.path`, then call `runpy.run_path(..., run_name='__main__')`

### Suggested Fix
When this packaged skill-creator script fails on import, invoke it through `runpy` with the script directory manually added to `sys.path`, or patch the script/package so sibling imports resolve without that workaround.

### Metadata
- Reproducible: yes
- Related Files: C:\Users\mo1\.codex\skills\.system\skill-creator\scripts\init_skill.py

---

## [ERR-20260422-002] powershell-interface-dollar-expansion

**Logged**: 2026-04-22T17:29:27.8674867+02:00
**Priority**: low
**Status**: pending
**Area**: tools

### Summary
PowerShell expanded `$business-page-redesigner` inside the `--interface default_prompt=...` argument, which stripped the skill name from the generated `agents/openai.yaml`.

### Error
```text
Generated prompt became: "Use -page-redesigner ..."
```

### Context
- Command attempted: `init_skill.py ... --interface 'default_prompt=Use $business-page-redesigner ...'`
- Working directory: `F:\max_p_new\max_p_new`
- The generated `agents/openai.yaml` had to be corrected manually after skill initialization.

### Suggested Fix
When passing literal `$skill-name` text through PowerShell, escape the `$` or patch the generated file afterward instead of relying on the shell string to survive unchanged.

### Metadata
- Reproducible: yes
- Related Files: F:\max_p_new\max_p_new\.agents\skills\business-page-redesigner\agents\openai.yaml

---

## [ERR-20260422-003] powershell-rg-access-denied

**Logged**: 2026-04-22T18:05:00+02:00
**Priority**: low
**Status**: pending
**Area**: tools

### Summary
`rg --files` failed with `Access is denied` in this Windows workspace, so repository searches had to fall back to PowerShell `Get-ChildItem` and `Select-String`.

### Error
```text
Program 'rg.exe' failed to run: Access is denied
```

### Context
- Command attempted from workspace root: `rg --files -g "*orders*" -g "!node_modules" -g "!dist" -g "!build"`
- Environment: Windows PowerShell session in `F:\max_p_new\max_p_new`
- Workaround used successfully: switch to PowerShell-native file discovery and text search for the rest of the investigation.

### Suggested Fix
If `rg.exe` keeps failing on this machine, verify the executable permissions/path or prefer a documented PowerShell fallback for workspace searches.

### Metadata
- Reproducible: yes
- Related Files: F:\max_p_new\max_p_new\AGENTS.md

---
## [ERR-20260423-001] rg.exe

**Logged**: 2026-04-23T01:05:00+02:00
**Priority**: medium
**Status**: pending
**Area**: tests

### Summary

g.exe failed with Access is denied in this Windows workspace, so PowerShell-native search was needed as a fallback.

### Error
`
Program 'rg.exe' failed to run: Access is denied
`

### Context
- Command attempted: 
g -n ... frontend/src/pages/tasks/Tasks.tsx
- Environment: Codex desktop session on Windows / PowerShell in F:\max_p_new\max_p_new
- Impact: blocked fast code search during test setup until replaced with Select-String

### Suggested Fix
Check whether 
g.exe is blocked by Windows permissions or execution policy in this environment. Until then, prefer Select-String fallback for this workspace.

### Metadata
- Reproducible: yes
- Related Files: frontend/src/pages/tasks/Tasks.tsx

---

## [ERR-20260424-002] localhost-auth-smoke-login

**Logged**: 2026-04-24T17:56:45.4342908+03:00
**Priority**: low
**Status**: pending
**Area**: tests

### Summary
Local storefront smoke tests initially failed because an older documented localhost login no longer works in this dataset.

### Error
```text
Login failed: 401 {"success":false,"message":"البريد الإلكتروني أو كلمة المرور غير صحيحة"}
```

### Context
- Operation attempted: authenticate a Playwright QA session against `http://localhost:3007/api/v1/auth/login`
- Stale references were still present in repo helpers like `test-api.js` and `capture-ad.js`
- Verified workaround: use the currently reset localhost super-admin account referenced by the backend recovery scripts instead of the stale helper credential

### Suggested Fix
Update or annotate the old helper scripts so local QA automation does not default to outdated credentials.

### Metadata
- Reproducible: yes
- Related Files: F:\max_p_new\max_p_new\test-api.js, F:\max_p_new\max_p_new\capture-ad.js, F:\max_p_new\max_p_new\backend\reset-pass.js

---

## [ERR-20260425-001] rg.exe

**Logged**: 2026-04-25T00:00:00+03:00
**Priority**: medium
**Status**: pending
**Area**: config

### Summary
`rg.exe` still fails with `Access is denied` in this Windows workspace, so PowerShell fallback is required for repo discovery.

### Error
```text
Program 'rg.exe' failed to run: Access is denied
```

### Context
- Command attempted from workspace root: `rg --files -g "BOOTSTRAP.md" -g "SOUL.md" -g "USER.md" -g "MEMORY.md" -g "memory/2026-04-25.md" -g "memory/2026-04-24.md"`
- Environment: Codex desktop session on Windows / PowerShell in `F:\max_p_new\max_p_new`
- Workaround used successfully: switch to PowerShell-native file discovery and file reads

### Suggested Fix
Check whether `rg.exe` is blocked by Windows permissions or security policy on this machine and document `Get-ChildItem` / `Select-String` as the local fallback.

### Metadata
- Reproducible: yes
- Related Files: F:\max_p_new\max_p_new\AGENTS.md

---

## [ERR-20260425-002] frontend-build-blocker

**Logged**: 2026-04-25T17:35:00+03:00
**Priority**: medium
**Status**: pending
**Area**: frontend

### Summary
Frontend production build is currently blocked by an unrelated icon import error in the WhatsApp chat window, which prevents full-page verification after UI changes elsewhere.

### Error
```text
src/pages/whatsapp/components/ChatWindow.tsx (16:2): "SquareMenu" is not exported by "lucide-react"
```

### Context
- Command attempted: `npm run build` from `frontend/`
- The super-admin companies page changes lint cleanly, but the global build stops in `src/pages/whatsapp/components/ChatWindow.tsx`
- This blocked end-to-end build verification for the companies page task even though the modified file itself did not surface lint errors

### Suggested Fix
Replace `SquareMenu` with a lucide icon that exists in the installed package version, then rerun the frontend build.

### Metadata
- Reproducible: yes
- Related Files: F:\max_p_new\max_p_new\frontend\src\pages\whatsapp\components\ChatWindow.tsx, F:\max_p_new\max_p_new\frontend\src\pages\SuperAdminCompanies.jsx

---
## [ERR-20260429-001] local-frontend-node-modules

**Logged**: 2026-04-29T17:20:00+03:00
**Priority**: medium
**Status**: pending
**Area**: frontend

### Summary
Local frontend verification can fail before app compilation because `frontend/node_modules` is incomplete or partially renamed by an interrupted npm install.

### Error
```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'rollup-plugin-visualizer'
'vite' is not recognized as an internal or external command
```

### Context
- Command attempted: `npm run build` from `frontend/`
- `rollup-plugin-visualizer` was present in `package-lock.json` but absent from `node_modules`.
- Installing the missing package timed out but left the package present and the `vite` binary entries in `node_modules/.bin` renamed as temporary files.
- GitHub Actions is less affected because the deploy workflow performs `npm ci || npm install` before `npm run build`.

### Suggested Fix
Repair the local frontend dependency tree with a clean dependency install before relying on local production builds; avoid treating this environment issue as a source-code build failure.

### Metadata
- Reproducible: yes
- Related Files: frontend/package.json, frontend/package-lock.json, .github/workflows/deploy.yml

---
## [ERR-20260429-003] powershell-command-chaining

**Logged**: 2026-04-29T18:36:03+03:00
**Priority**: low
**Status**: pending
**Area**: infra

### Summary
PowerShell in this workspace rejected Bash-style `&&` command chaining during a deploy upload/check step.

### Error
```text
The token '&&' is not a valid statement separator in this version.
```

### Context
- Attempted to combine `scp` and remote `ssh` verification in one PowerShell command.
- The command failed before any upload/check ran.

### Suggested Fix
Run deploy steps as separate PowerShell tool calls, or use PowerShell-compatible separators and explicit error checks instead of Bash `&&`.

### Metadata
- Reproducible: yes
- Related Files: TOOLS.md

---
## [ERR-20260429-002] remote-core-service-script-timeout

**Logged**: 2026-04-29T18:12:00+03:00
**Priority**: medium
**Status**: pending
**Area**: backend

### Summary
One-off production maintenance scripts can hang if they `require('./services/CoreAIAgent')` because that loads backend services with long-lived handles.

### Error
```text
command timed out after 34040 milliseconds
node tmp-repair-order-name.js remained running after the DB update had already completed
```

### Context
- Command attempted over SSH in `/var/www/backend2` to repair an order customer name.
- The script imported `CoreAIAgent` only to reuse profile-name normalization, but loading the service initialized other backend modules/timers.
- A simpler Prisma-only verification script exited cleanly when it avoided loading the full Core service.

### Suggested Fix
For one-off DB repair scripts, avoid importing broad runtime services unless necessary. Prefer small local helper logic or add `process.exit(0)` after cleanup when a service import is unavoidable.

### Metadata
- Reproducible: unknown
- Related Files: backend/services/CoreAIAgent.js

---

## [ERR-20260429-006] production-prisma-client-warmup-after-restart

**Logged**: 2026-04-29T19:23:13+03:00
**Priority**: medium
**Status**: pending
**Area**: infra

### Summary
Immediate health checks after restarting the production backend briefly failed while the generated Prisma client directory was being rebuilt/loaded.

### Error
```text
Cannot find module '.prisma/client/default'
curl http://127.0.0.1:3007/api/v1/health failed immediately after pm2 restart
```

### Context
- Occurred after deploying `backend/services/CoreAIAgent.js` directly to `/var/www/backend2` for the `شكرا` gratitude-routing fix.
- PM2 initially logged transient Prisma generated-client load errors, then stabilized after the runtime finished startup.
- A later PM2/health check showed both `maxp-backend` and `maxp-webhook-worker` online and `GET /api/v1/health` returning `OK`.

### Suggested Fix
After PM2 restarts on this VPS, wait a few seconds before declaring health failure, then re-check PM2 status and health. Treat fresh repeated Prisma client errors after the warmup window as real deploy failures.

### Metadata
- Reproducible: unknown
- Related Files: backend/services/CoreAIAgent.js, backend/ecosystem.config.js

---

## [ERR-20260429-007] production-log-file-name-drift

**Logged**: 2026-04-29T19:26:40+03:00
**Priority**: low
**Status**: pending
**Area**: infra

### Summary
The production log check failed when it tried to tail `logs/err.log`, because the live PM2 log files are currently suffixed by process id/name.

### Error
```text
tail: cannot open 'logs/err.log' for reading: No such file or directory
```

### Context
- Occurred during post-deploy verification for the Core AI gratitude fix.
- `/var/www/backend2/logs` contains files such as `err-2.log`, `out-2.log`, `webhook-worker-err-2.log`, and `webhook-worker-out-2.log`.
- `pm2 logs maxp-backend --lines N --nostream` correctly resolved the active file paths.

### Suggested Fix
Prefer `pm2 logs <app> --lines N --nostream` for production verification, or discover the current `logs/err-*.log` file before tailing directly.

### Metadata
- Reproducible: yes
- Related Files: .agents/skills/gh-deploy-ssh-verify/references/maxp-release-playbook.md

---

## [ERR-20260430-001] ripgrep-access-denied-on-windows

**Logged**: 2026-04-30T17:05:00+03:00
**Priority**: low
**Status**: pending
**Area**: infra

### Summary
`rg --files` failed with `Access is denied` in the Windows workspace while searching for temporary inspection scripts.

### Error
```text
Program 'rg.exe' failed to run: Access is denied
```

### Context
- Occurred during the production log investigation for conversation `cmoljjkw60b6mju38ir05kuw6`.
- The failure did not block the investigation because schema and temp script context were available through PowerShell and direct file reads.

### Suggested Fix
If `rg.exe` is denied in this workspace, fall back to `Get-ChildItem -Recurse` or targeted `Select-String` for local discovery.

### Metadata
- Reproducible: unknown
- Related Files: none

---

## [ERR-20260430-006] production-health-check-too-early-after-pm2-restart

**Logged**: 2026-04-30T17:46:00+03:00
**Priority**: low
**Status**: pending
**Area**: infra

### Summary
Health check can fail immediately after `pm2 restart` even when the process is online because the backend has not finished booting and opening port `3007`.

### Error
```text
curl: (7) Failed to connect to 127.0.0.1 port 3007 after 0 ms: Couldn't connect to server
```

### Context
- Occurred while deploying the `cmolkqgsw0namju9qkxsmhawf` image-match fix.
- `pm2 status` showed `maxp-backend` online seconds later, and logs showed server startup completing on port `3007`.
- A delayed health check then returned `{"status":"OK"}`.

### Suggested Fix
After `pm2 restart`, wait for startup logs or retry health with a short loop/backoff instead of a single immediate curl.

### Metadata
- Reproducible: yes
- Related Files: backend/services/CoreAIAgent.js

---

## [ERR-20260430-007] powershell-does-not-support-bash-heredoc

**Logged**: 2026-04-30T17:20:00+03:00
**Priority**: low
**Status**: pending
**Area**: infra

### Summary
Using Bash heredoc syntax (`node - <<'NODE'`) directly in PowerShell fails before Node runs.

### Error
```text
Missing file specification after redirection operator.
The '<' operator is reserved for future use.
```

### Context
- Occurred during a quick local CoreAIAgent scoring smoke.
- PowerShell parsed `<` as its own redirection operator.

### Suggested Fix
Use a PowerShell here-string piped into Node instead: `@' ... '@ | node -`, or create a temporary script with `apply_patch` when quoting is non-trivial.

### Metadata
- Reproducible: yes
- Related Files: backend/services/CoreAIAgent.js

---

## [ERR-20260430-001] powershell-rg-access-denied

**Logged**: 2026-04-30T19:20:00+03:00
**Priority**: low
**Status**: pending
**Area**: tooling

### Summary
Running `rg.exe` from PowerShell failed with `Access is denied` in the workspace.

### Error
```text
Program 'rg.exe' failed to run: Access is denied
```

### Context
- Occurred while searching `backend/services/CoreAIAgent.js` and backend tests during the Facebook conversation `cmolnmdk29qxhjucmpr1bwjf1` investigation.
- `Select-String` worked as a reliable fallback.

### Suggested Fix
Use PowerShell `Select-String` when `rg.exe` is blocked on this Windows environment; investigate local executable permissions separately if fast search becomes important.

### Metadata
- Reproducible: unknown
- Related Files: backend/services/CoreAIAgent.js

---

## [ERR-20260429-005] production-prisma-product-status-field

**Logged**: 2026-04-29T19:01:00+03:00
**Priority**: low
**Status**: pending
**Area**: backend

### Summary
A temporary production Prisma query failed because the generated `Product` model does not expose a `status` field.

### Error
```text
Unknown field `status` for select statement on model `Product`.
```

### Context
- A read-only helper script was querying product details for conversation `cmok8a07000kzjub7f7nt66vo`.
- The schema exposes `isActive`, `isFeatured`, `isHidden`, etc., but not `status`.

### Suggested Fix
When writing quick production Prisma probes for products, select known fields from the generated client or use `isActive`/`isHidden` instead of `status`.

### Metadata
- Reproducible: yes
- Related Files: prisma/schema.prisma

---

## [ERR-20260429-004] powershell-ssh-heredoc-quoting

**Logged**: 2026-04-29T18:58:00+03:00
**Priority**: low
**Status**: pending
**Area**: infra

### Summary
Piping a PowerShell here-string into an SSH command that also contained nested shell quoting failed before the remote smoke script was created.

### Error
```text
bash: -c: line 1: unexpected EOF while looking for matching `"'
```

### Context
- Attempted to create and run a temporary `/var/www/backend2/tmp-vector-code-smoke.js` over a single SSH command.
- The combination of PowerShell here-string piping and remote `bash -c` quote escaping was fragile.
- Recurred on 2026-04-29 when trying to run an Arabic `node -e` smoke check over nested PowerShell/SSH quoting; uploading a temporary script and removing it afterward worked cleanly.
- Recurred on 2026-04-30 when a remote `grep -E "a|b"` expression lost quoting through PowerShell/SSH and Bash tried to run the pipe-separated tokens as commands.

### Suggested Fix
Create temporary smoke scripts with `apply_patch` locally, upload them with `scp`, run them over SSH, then remove both local and remote temp files.

### Metadata
- Reproducible: yes
- Related Files: backend/services/CoreAIAgent.js

---

## [ERR-20260429-005] rg-access-denied-and-repo-mismatch-during-prod-verification

**Logged**: 2026-04-29T19:25:00+03:00
**Priority**: low
**Status**: pending
**Area**: tooling

### Summary
During Flora production verification, `rg.exe` failed with `Access is denied`, and an initial `gh run view` used the wrong repository owner before checking the Git remote.

### Error
```text
Program 'rg.exe' failed to run: Access is denied
failed to get run: HTTP 404: Not Found
```

### Context
- The workspace remote was `elhenawym124-ops/max_p_new`, not the guessed owner.
- PowerShell `Select-String` worked as a fallback when `rg` was blocked.
- Recurred on 2026-05-01 in the `facebook-ads-prod-20260501` worktree; `Select-String` again worked as the safe fallback.
- Recurred on 2026-05-02 in `H:\max_p_new` while searching procurement/auth files; `Select-String` again worked.

### Suggested Fix
Check `git remote -v` before querying GitHub Actions by repo name, and fall back to `Select-String` when `rg.exe` is unavailable or blocked on Windows.

### Metadata
- Reproducible: unknown
- Related Files: none

---

## [ERR-20260502-004] root-npx-prisma-version-drift

**Logged**: 2026-05-02T03:35:00+03:00
**Priority**: low
**Status**: pending
**Area**: tooling

### Summary
Running `npx prisma generate --schema=backend/prisma/schema` from the repository root installed Prisma 7 transiently instead of using the backend's pinned Prisma 6.12 dependency.

### Error
```text
Prisma schema validation P1012: The datasource property `url` is no longer supported in schema files.
Prisma CLI Version : 7.8.0
```

### Context
- `backend/package.json` pins `prisma`/`@prisma/client` to `^6.12.0`.
- The correct command for this workspace is `npm run schema:generate` from `backend`, or an explicit Prisma 6 CLI.

### Suggested Fix
Run Prisma commands through the backend package scripts to avoid CLI version drift.

### Metadata
- Reproducible: yes
- Related Files: backend/package.json, backend/prisma/schema/main.prisma

---

## [ERR-20260502-003] bundled-rg-access-denied

**Logged**: 2026-05-02T03:20:00+03:00
**Priority**: low
**Status**: pending
**Area**: tooling

### Summary
The bundled `rg.exe` inside the Codex WindowsApp package failed to launch with Access denied during repository searches.

### Error
```text
Program 'rg.exe' failed to run: ... WindowsApps\OpenAI.Codex_...\rg.exe ... Access is denied.
```

### Context
- The failure happened when searching Prisma migrations from PowerShell in `H:\max_p_new`.
- `Select-String` is a workable fallback for this Windows desktop environment.

### Suggested Fix
Use `Select-String` or an explicitly installed `rg` binary when the bundled WindowsApp `rg.exe` cannot be executed.

### Metadata
- Reproducible: unknown
- Related Files: none

---

## [ERR-20260502-005] powershell-ssh-node-dollar-expansion

**Logged**: 2026-05-02T14:35:00+03:00
**Priority**: low
**Status**: mitigated
**Area**: tooling

### Summary
PowerShell and the remote shell can mutate inline Node snippets sent through SSH, especially around `$` properties and heredoc delimiters.

### Error
```text
Unexpected token '(' after getSharedPrismaClient().()
ReferenceError: NODE is not defined
```

### Context
- The first production WhatsApp DB check used an inline Node script with `$disconnect`, which was expanded before Node received it.
- A second attempt used a nested heredoc whose terminator was quoted incorrectly and became part of stdin.

### Suggested Fix
For remote Node one-liners from PowerShell, prefer a PowerShell single-quoted SSH command with remote `node -e '...'`, keep the JS snippet free of single quotes, and avoid `$` property access or use `process.exit()` for short read-only checks.

### Metadata
- Reproducible: yes
- Related Files: none

---

## [ERR-20260503-001] bundled-rg-access-denied

**Logged**: 2026-05-03T04:33:40+03:00
**Priority**: low
**Status**: pending
**Area**: tooling

### Summary
## [ERR-20260503-002] prisma-db-push-template-dataloss-warning

**Logged**: 2026-05-03T08:55:00+03:00
**Priority**: medium
**Status**: pending
**Area**: backend

### Summary
Local `prisma db push` cannot currently be used casually because the generated schema wants to drop non-empty template tables.

### Error
```text
You are about to drop the `company_template_drafts`, `company_template_releases`,
`factory_templates`, and `template_library_items` tables.
Error: Use the --accept-data-loss flag to ignore the data loss warnings.
```

### Context
- Hit while testing product landing page order creation locally.
- The real missing field was only `warehouses.merchantId`, so the safe fix was a targeted non-destructive `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` instead of accepting data loss.

### Suggested Fix
Avoid `--accept-data-loss` on the shared local DB. Prefer targeted additive SQL for local backfills, or reconcile the template schema/table ownership before using `db push` broadly.

### Metadata
- Reproducible: yes
- Related Files: backend/prisma/schema, backend/prisma/schema/inventory.prisma

---

## [ERR-20260503-001] powershell-variable-colon-interpolation

**Logged**: 2026-05-03T16:02:00+03:00
**Priority**: low
**Status**: fixed
**Area**: tooling

### Summary
PowerShell treated `$f:` inside a double-quoted status string as an invalid scoped variable reference.

### Error
```text
Variable reference is not valid. ':' was not followed by a valid variable name character.
```

### Context
- Occurred while printing per-file conflict-marker verification output.
- The command was immediately fixed by changing `"$f: no conflict markers"` to `"${f}: no conflict markers"`.

### Suggested Fix
When interpolating a PowerShell variable directly before punctuation like `:`, wrap the variable name in braces: `"${name}: value"`.

### Metadata
- Reproducible: yes
- Related Files: none

---

Bundled `rg.exe` failed to launch from the Codex Windows app with Access denied during a workspace search.

### Error
```text
Program 'rg.exe' failed to run: An error occurred trying to start process ... Access is denied.
```

### Context
- Attempted to search frontend/backend/docs for landing-page and storefront terms from `H:\max_p_new`.
- The failure came from the bundled app path, not the repository code.

### Suggested Fix
Use PowerShell `Select-String`/`Get-ChildItem` fallback when bundled `rg.exe` cannot execute, or install a separately accessible ripgrep binary on PATH.

### Metadata
- Reproducible: unknown
- Related Files: none

---

## [ERR-20260502-002] procurement-payment-status-enum-mismatch

**Logged**: 2026-05-02T02:59:00+03:00
**Priority**: medium
**Status**: fixed
**Area**: backend

### Summary
Creating a supplier payment failed after inserting payment data because the controller attempted to set a purchase invoice status that is not in the Prisma enum.

### Error
```text
Invalid value for argument `status`. Expected PurchaseInvoicesStatus.
status: "PARTIALLY_PAID"
```

### Context
- Mobile procurement smoke testing created supplier/order/invoice data, then `POST /api/v1/procurement/supplier-payments` returned 500.
- The generated Prisma enum currently supports `PENDING`, `PAID`, and `CANCELLED` only.
- The controller also used invalid `PARTIALLY_PAID`/`OVERDUE` status filters in supplier stats.

### Suggested Fix
Keep partially paid purchase invoices as `PENDING` while using `paidAmount` and `remainingAmount` as the source of truth, unless a schema migration formally adds `PARTIALLY_PAID`.

### Metadata
- Reproducible: yes
- Related Files: backend/controller/supplierPaymentController.js, backend/controller/supplierController.js

---

## [ERR-20260502-001] windows-node-tooling-gotchas

**Logged**: 2026-05-02T02:47:00+03:00
**Priority**: low
**Status**: pending
**Area**: tooling

### Summary
Several Windows-specific command wrappers failed or behaved differently during frontend verification.

### Error
```text
Cannot overwrite variable PID because it is read-only or constant.
Start-Process ... npm: %1 is not a valid Win32 application.
npm run build:safe returned non-zero even though direct Vite build returned LASTEXITCODE=0.
```

### Context
- PowerShell reserves `$PID`, so loop variables should use names like `$procId`.
- `Start-Process` should call `npm.cmd` on Windows, not `npm`.
- For this repo, direct `npx vite build` with `NODE_OPTIONS=--max-old-space-size=8192` and `VITE_DISABLE_COMPRESSION=true` produced a clean zero exit code after stale `tsc` processes were stopped.

### Suggested Fix
Use explicit Windows-safe command names and avoid reserved PowerShell variables. If `npm run build:safe` is noisy on this workspace, verify with the direct Vite command and record `LASTEXITCODE`.

### Metadata
- Reproducible: yes
- Related Files: frontend/package.json, frontend/vite.config.ts

---

## [ERR-20260503-001] browser-use-node-runtime-too-old

**Logged**: 2026-05-03T16:46:30+03:00
**Priority**: medium
**Status**: pending
**Area**: tooling

### Summary
The Browser Use in-app browser workflow could not initialize because the Node runtime resolved by `node_repl` is older than the plugin requires.

### Error
```text
Node runtime too old for node_repl: found v22.16.0, requires >= v22.22.0.
```

### Context
- Attempted to run the Browser Use `iab` bootstrap for local `localhost:3000` UI verification.
- The fallback was direct Playwright from the frontend workspace, with tokens generated locally and redacted from reports.

### Suggested Fix
Upgrade the Node runtime used by `node_repl` or set `NODE_REPL_NODE_PATH` to a compatible Node >= 22.22.0. Until then, use Playwright shell smoke tests for local browser verification.

### Metadata
- Reproducible: yes
- Related Files: none

---

## [ERR-20260503-002] powershell-node-stdin-arabic-literals

**Logged**: 2026-05-03T16:46:30+03:00
**Priority**: low
**Status**: pending
**Area**: tests

### Summary
Arabic string literals passed through a PowerShell here-string into `node -` were received as question marks, causing false-negative UI smoke expectations.

### Error
```text
Expected text became "???? ?????" while the browser body contained the correct Arabic text.
```

### Context
- The smoke test itself was valid, but inline Arabic expected strings were mangled before Node executed the script.
- Replacing inline Arabic literals with Unicode escape strings fixed the false negative.

### Suggested Fix
For PowerShell inline Node scripts, use Unicode escapes for non-ASCII expected strings or put the script in a UTF-8 file before executing it.

### Metadata
- Reproducible: yes
- Related Files: frontend/tmp/ui-real-smoke-after-storefront-fix/full-smoke-report.json

---

## [ERR-20260506-003] frontend-worktree-missing-local-tsc

**Logged**: 2026-05-06T13:35:00+03:00
**Priority**: low
**Status**: open
**Area**: frontend-tooling

### Summary
Running a targeted TypeScript syntax check through `npx tsc ...` in the frontend worktree failed because the local TypeScript CLI was not available from that worktree environment.

### Error
```text
This is not the tsc command you are looking for
```

### Context
- Backend/runtime verification succeeded.
- The frontend files were still updated, but a targeted TypeScript compile check could not be completed from this worktree as-is.
- The frontend `package.json` declares `typescript`, so this appears to be a local dependency/runtime availability issue in the current worktree rather than an application-code failure.

### Suggested Fix
Before relying on targeted `tsc` checks inside a fresh worktree, confirm that frontend dependencies are installed locally or invoke the compiler from an existing workspace node_modules path.

### Metadata
- Reproducible: yes
- Related Files: frontend/package.json

---

## [ERR-20260506-006] npx-prisma-validate-pulled-prisma-7

**Logged**: 2026-05-06T07:10:00+03:00
**Priority**: low
**Status**: pending
**Area**: backend

### Summary
`npx prisma validate --schema=prisma/schema` used Prisma CLI 7 in this clean worktree and failed on the existing Prisma 6-style datasource URL configuration.

### Error
```text
The datasource property `url` is no longer supported in schema files.
```

### Context
- Command attempted from `backend`: `npx prisma validate --schema=prisma/schema`
- `backend/package.json` pins Prisma `^6.12.0`, but the clean worktree did not have a local Prisma binary available through that `npx` invocation.
- This is a tool-version mismatch, not evidence that the new `AiRuntimeLedger` model is invalid.

### Suggested Fix
Use the locally installed Prisma 6 binary after dependencies are installed, or run `npm exec -- prisma validate --schema=prisma/schema` only when it resolves to the project version.

### Metadata
- Reproducible: yes
- Related Files: backend/package.json, backend/prisma/schema/main.prisma

---

## [ERR-20260506-007] frontend-worktree-eslint-parser-resolution

**Logged**: 2026-05-06T16:35:00+03:00
**Priority**: low
**Status**: open
**Area**: frontend-tooling

### Summary
Running focused ESLint checks against frontend files from this clean worktree failed before linting because the worktree-local config could not resolve `@typescript-eslint/parser` / React plugin packages.

### Error
```text
Failed to load parser '@typescript-eslint/parser' declared in '...frontend/.eslintrc.cjs'
ESLint couldn't find the plugin 'eslint-plugin-react'
```

### Context
- The changed frontend files still passed syntax parsing through `typescript.transpileModule`.
- Invoking ESLint from either the worktree frontend or the main workspace binary still made ESLint load the worktree `.eslintrc.cjs`, which expects local parser/plugin resolution from the worktree environment.
- This is a dependency-resolution limitation of the current worktree, not direct evidence of a lint error in the edited files.

### Suggested Fix
Before using focused ESLint as a gate inside a fresh worktree, install frontend dependencies in that worktree or run linting in an environment where the parser/plugins resolve relative to the same config directory.

### Metadata
- Reproducible: yes
- Related Files: frontend/.eslintrc.cjs, frontend/package.json

---

## [ERR-20260506-005] queue-service-eager-bullmq-import

**Logged**: 2026-05-06T06:02:00+03:00
**Priority**: medium
**Status**: resolved
**Area**: tests

### Summary
Focused queue tests failed because `queueService` imported `bullmq` eagerly even when Redis queues were disabled for the test path.

### Error
```text
Cannot find module 'bullmq' from 'services/queueService.js'
```

### Context
- Command attempted: `npm run test:ai:queue`
- The test only needed pure `buildJobOptions` behavior.
- Importing the service required BullMQ before the constructor could decide queues were disabled.

### Suggested Fix
Lazy-load optional runtime dependencies after configuration proves they are needed.

### Metadata
- Reproducible: yes
- Related Files: backend/services/queueService.js
- See Also: ERR-20260506-002

### Resolution
- **Resolved**: 2026-05-06T06:02:00+03:00
- **Notes**: Moved BullMQ loading behind `getDefaultQueue()` and only call it after Redis is configured.

---

## [ERR-20260506-004] verify-docs-wrong-working-directory

**Logged**: 2026-05-06T05:42:00+03:00
**Priority**: low
**Status**: resolved
**Area**: docs

### Summary
`node scripts\verify-docs.js` was run from `backend\`, but the script lives at the repository root.

### Error
```text
Error: Cannot find module '...\backend\scripts\verify-docs.js'
```

### Context
- Command attempted: `node scripts\verify-docs.js`
- Working directory used: `backend`
- The correct working directory is the repository root for this docs verifier.

### Suggested Fix
Run repository-level scripts from the repository root, and backend package scripts from `backend\`.

### Metadata
- Reproducible: yes
- Related Files: scripts/verify-docs.js

### Resolution
- **Resolved**: 2026-05-06T05:42:00+03:00
- **Notes**: Re-ran the docs verifier from the repository root.

---

## [ERR-20260506-003] focused-core-test-missing-project-dependencies

**Logged**: 2026-05-06T05:22:00+03:00
**Priority**: medium
**Status**: pending
**Area**: tests

### Summary
Running the large CoreAIAgent Jest test with `npx jest` in the clean worktree failed before executing tests because project dependencies are not installed/resolvable there.

### Error
```text
Cannot find module '@google/generative-ai' from 'tests/services/CoreAIAgent.catalogVariantContext.test.js'
```

### Context
- Command attempted: `npx jest tests\services\CoreAIAgent.catalogVariantContext.test.js --runInBand --testTimeout=30000`
- Smaller tests that avoid external project dependencies passed.
- This is an environment/dependency availability issue, not an assertion failure from the AgentRun trace changes.

### Suggested Fix
Run this suite in an environment with backend dependencies installed, or make the test's provider mocks virtual where appropriate.

### Metadata
- Reproducible: yes
- Related Files: backend/tests/services/CoreAIAgent.catalogVariantContext.test.js

---

## [ERR-20260506-002] trace-service-eager-shared-database-import

**Logged**: 2026-05-06T05:18:00+03:00
**Priority**: medium
**Status**: resolved
**Area**: tests

### Summary
The new AI trace service test failed because the service imported `sharedDatabase` at module load time, which required `dotenv` before local dependencies were available in the clean worktree.

### Error
```text
Cannot find module 'dotenv' from 'services/sharedDatabase.js'
```

### Context
- Command attempted: `npx jest tests\services\aiAgentRunTraceService.test.js --runInBand --testTimeout=30000`
- Existing tests often mock DB modules before requiring service modules.
- The trace service should not initialize or require DB infrastructure just because it was imported.

### Suggested Fix
Lazy-load `sharedDatabase` inside the default `getPrisma` and `safeQuery` functions, while allowing tests to inject mocks.

### Metadata
- Reproducible: yes
- Related Files: backend/services/aiAgentRunTraceService.js

### Resolution
- **Resolved**: 2026-05-06T05:18:00+03:00
- **Notes**: Replaced eager `sharedDatabase` import with lazy `require` in default injected functions.

---

## [ERR-20260506-001] npm-script-jest-not-on-path

**Logged**: 2026-05-06T05:13:00+03:00
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
A new npm script that called `jest` directly failed in the clean worktree because the Jest binary was not available on PATH, while `npx jest` worked.

### Error
```text
'jest' is not recognized as an internal or external command,
operable program or batch file.
```

### Context
- Command attempted: `npm run test:ai:runtime-inventory`
- Direct command that had already worked: `npx jest tests\scripts\aiRuntimeInventory.test.js --runInBand --testTimeout=30000`
- The backend has existing scripts that call `jest` directly, but this worktree currently needs `npx jest` for focused test execution.

### Suggested Fix
Use `npx jest ...` for the new focused npm script so it matches the verified local command in this workspace.

### Metadata
- Reproducible: yes
- Related Files: backend/package.json

### Resolution
- **Resolved**: 2026-05-06T05:13:00+03:00
- **Notes**: Updated the new focused npm script to call `npx jest`, matching the verified local command.

---

## [ERR-20260504-001] git-push-guard-wrong-full-sha

**Logged**: 2026-05-04T01:17:31+03:00
**Priority**: low
**Status**: resolved
**Area**: infra

### Summary
Push guard aborted a safe merge push because the expected full SHA was typed incorrectly while the short SHA matched.

### Error
```text
origin/main moved to 7ba41aa86f31c3bccd83afc3940cdb8a6e0fb4f4; aborting push
```

### Context
- Command attempted to verify `origin/main` before pushing a merge branch to `main`.
- The guard used a manually written full commit hash instead of deriving the expected parent from the merge commit.
- No remote change was made because the command exited before `git push`.

### Suggested Fix
For future guarded pushes, compare `git rev-parse origin/main` with `git rev-parse HEAD^1` or another locally derived expected value instead of manually typing a full SHA.

### Metadata
- Reproducible: yes
- Related Files: git workflow

### Resolution
- **Resolved**: 2026-05-04T01:17:31+03:00
- **Notes**: Retried with a derived parent comparison.

---

## [ERR-20260505-001] bundled-rg-access-denied

**Logged**: 2026-05-05T00:00:00+03:00
**Priority**: low
**Status**: pending
**Area**: infra

### Summary
Running `rg` from the Codex WindowsApps bundle failed with access denied in this workspace.

### Error
```text
Program 'rg.exe' failed to run: Access is denied.
```

### Context
- Attempted to search fallback/conversation code from `H:\max_p_new`.
- The executable path was under the Codex packaged WindowsApps directory.
- Workaround is to use PowerShell `Select-String`/`Get-ChildItem` until `rg` is accessible.

### Suggested Fix
Prefer a locally installed ripgrep on PATH, or keep the PowerShell search fallback documented for this environment.

### Metadata
- Reproducible: unknown
- Related Files: local toolchain

---

## [ERR-20260504-002] repeated-apply-patch-context-hit-wrong-route

**Logged**: 2026-05-04T07:55:00+03:00
**Priority**: medium
**Status**: resolved
**Area**: backend

### Summary
An `apply_patch` hunk that only matched `const companyId = req.user?.companyId;` changed a later route instead of the intended `/orders-new/simple` handler because the same line appeared many times in `backend/routes/orders.js`.

### Error
```text
GET /api/v1/orders-new/simple returned 500: "merchant is not defined"
```

### Context
- The first patch reported success but did not affect the intended route.
- The runtime error proved `merchant` was still referenced before definition.
- The fix was to include unique nearby route context such as `router.get('/simple'...)` or `ORDER-DETAIL` comments, then verify the exact line window after patching.

### Suggested Fix
When patching large route files with repeated authorization boilerplate, include route-specific context in the hunk and immediately re-read the affected 20-30 lines before restarting the server.

### Metadata
- Reproducible: yes
- Related Files: backend/routes/orders.js

### Resolution
- **Resolved**: 2026-05-04T07:55:00+03:00
- **Notes**: Repatched with route-specific context and added direct API regression checks for merchant list/detail/viewed/status routes.

---

## [ERR-20260504-006] frontend-scp-timeout-left-partial-archive

**Logged**: 2026-05-04T13:33:35+03:00
**Priority**: medium
**Status**: resolved
**Area**: deploy

### Summary
A large frontend `scp` upload timed out locally and left a partial archive on the VPS.

### Error
```text
command timed out after 304050 milliseconds
/root/maxp-deploy-backups/frontend-dist-20260504131459.tar.gz was only 91M instead of 139M
```

### Context
- The production `/var/www/frontend2/dist` directory had not been swapped yet, so the live site was still safe.
- Retrying the same `scp` with `ServerAliveInterval` and a longer local timeout completed successfully.

### Suggested Fix
Upload large frontend archives with:

```text
scp -o ServerAliveInterval=15 -o ServerAliveCountMax=40 ...
```

Then verify remote size before extracting or swapping.

### Metadata
- Reproducible: yes
- Related Files: frontend deploy workflow

### Resolution
- **Resolved**: 2026-05-04T13:33:35+03:00
- **Notes**: Reuploaded the archive, verified the full 139M file, then swapped production dist.

---

## [ERR-20260504-007] dotenv-log-polluted-auth-json

**Logged**: 2026-05-04T13:33:35+03:00
**Priority**: low
**Status**: resolved
**Area**: verification

### Summary
Remote Node auth-token generation failed because `dotenv` wrote an informational log to stdout before the JSON payload.

### Error
```text
SyntaxError: Unexpected token 'd', "[dotenv@17."... is not valid JSON
```

### Context
- The PowerShell verification script captured stdout from `ssh ... node` and passed it to `JSON.parse`.
- `dotenv@17` printed its startup tip on stdout, making the captured output invalid JSON.

### Suggested Fix
Set `process.env.DOTENV_CONFIG_QUIET = 'true'` and call `require('dotenv').config({ quiet: true })` before emitting machine-readable JSON.

### Metadata
- Reproducible: yes
- Related Files: production browser verification scripts

### Resolution
- **Resolved**: 2026-05-04T13:33:35+03:00
- **Notes**: Regenerated auth JSON quietly and completed Playwright verification.

## [ERR-20260507-001] recursive-search-corrupted-temp-dir

**Logged**: 2026-05-07T14:10:18+03:00
**Priority**: low
**Status**: pending
**Area**: infra

### Summary
Recursive PowerShell search across the workspace hit a corrupted temporary frontend repair directory and timed out.

### Error
```text
The file or directory is corrupted and unreadable: frontend\.tmp\node-modules-repair-20260504-030154
```

### Context
- Command attempted to enumerate Facebook/Meta/Ads files with `Get-ChildItem -Recurse`.
- The noisy scan also traversed dependency and temporary directories.
- Workaround was to inspect `git ls-files` and known source directories instead of scanning the whole workspace.

### Suggested Fix
Prefer git-tracked file lists or source-root searches for workspace audits; avoid `frontend/.tmp` and dependency trees unless specifically investigating them.

### Metadata
- Reproducible: yes
- Related Files: frontend/.tmp/node-modules-repair-20260504-030154

---
## [ERR-20260507-003] browser-use-app-server-path

**Logged**: 2026-05-07T00:00:00+02:00
**Priority**: medium
**Status**: pending
**Area**: infra

### Summary
Browser Use in-app browser bootstrap failed because the local Codex app server path could not be found.

### Error
```text
failed to start codex app-server: The system cannot find the path specified. (os error 3)
```

### Context
- Attempted to initialize Browser Use with the bundled `browser-client.mjs` and `iab` backend for a public page QA pass.
- Continued with DevTools/HTTP based verification instead of blocking the user's requested test.

### Suggested Fix
Check the Browser Use plugin runtime installation and the Codex app-server path expected by the `iab` backend.

### Metadata
- Reproducible: unknown
- Related Files: C:/Users/mokhtar/.codex/plugins/cache/openai-bundled/browser-use/0.1.0-alpha1/scripts/browser-client.mjs

---

## [ERR-20260507-004] powershell-get-content-report-oom

**Logged**: 2026-05-07T00:00:00+02:00
**Priority**: low
**Status**: pending
**Area**: infra

### Summary
PowerShell failed with an out-of-memory exception while trying to read a generated JSON QA report.

### Error
```text
System.OutOfMemoryException during PowerShell startup/config initialization after Get-Content on product-landing-auth-report.json
```

### Context
- Attempted to read a Playwright QA report with `Get-Content -Raw`.
- Continued by parsing selected report fields through the Node REPL, which avoided the PowerShell startup failure.

### Suggested Fix
For generated browser QA reports, prefer Node-based JSON parsing and targeted summaries instead of dumping the whole file through PowerShell.

### Metadata
- Reproducible: unknown
- Related Files: H:/max_p_new/artifacts/page-tests/product-landing-auth-report.json

---

## [ERR-20260509-001] powershell-ssh-heredoc-crlf-quoting

**Logged**: 2026-05-09T07:20:14.7508182+03:00
**Priority**: low
**Status**: pending
**Area**: infra

### Summary
PowerShell-interpolated SSH bash commands can corrupt `$()` and JSON quoting; here-strings can also pass CRLF into remote `bash`.

### Error
```text
Remote bash script failed after local PowerShell interpreted command substitution and later passed CRLF as `true\r`.
```

### Context
- Happened during MaxP production SSH verification for Facebook Ads decision actions.
- A direct quoted SSH command mangled `$()` before it reached the VPS.
- A PowerShell here-string reached bash with CRLF endings; piping through `tr -d "\r"` fixed the authenticated smoke check.

### Suggested Fix
For multi-line SSH verification from PowerShell, pipe a single-quoted here-string through `ssh ... 'tr -d "\r" | bash -s'`, or avoid `$()` in the remote command.

### Metadata
- Reproducible: yes
- Related Files: H:/max_p_new/TOOLS.md

---

### 2026-05-17 - Jest Windows path pattern mismatch
- Context: Running targeted backend Jest from PowerShell with backslash paths returned 'No tests found'.
- Workaround: Pass test paths with forward slashes or use explicit quoted POSIX-style paths, e.g. 
px jest tests/services/DatabaseAuthState.test.js --runInBand.


### 2026-05-18 - SSH heredoc quoting for production Node snippets
- Context: A remote Node inspection script sent through PowerShell/SSH heredoc appended the delimiter into stdin, then a /tmp script could not resolve project modules.
- Workaround: Base64-encode the snippet and write it inside the target project root, or use require paths relative to the script location. Clean up the temporary script afterward.

### 2026-05-18 - PM2 jlist stdout can include daemon warnings
- Context: Parsing `pm2 jlist` directly as JSON over SSH failed because PM2 printed an "In-memory PM2 is out-of-date" warning before the JSON payload.
- Workaround: Prefer `pm2 status --no-color` for quick health summaries, or strip any leading text before the first `[` when a JSON parse is required.

### 2026-05-18 - Avoid guessed Prisma enum filters in production smoke scripts
- Context: A production WhatsApp smoke script filtered `userCompany.role` with guessed values (`ADMIN`, `MANAGER`) and Prisma rejected them because they are not valid `UserCompaniesRole` enum members.
- Workaround: For smoke-test user selection, fetch active memberships first and filter roles in JavaScript only after inspecting returned values, or omit the role filter entirely.

### 2026-05-18 - Browser plugin Playwright proxy has no direct url method
- Context: Calling `tab.playwright.url()` failed while checking MaxP production because the Browser plugin exposes a proxy, not a full Playwright `Page` object.
- Workaround: Use `tab.playwright.evaluate(() => window.location.href)` for the current URL and DOM-derived state checks.

### 2026-05-18 - PowerShell quoting breaks Arabic grep and remote template strings
- Context: While preparing a direct SSH production deploy, a PowerShell command with Arabic grep alternation was split locally, and a remote Node heredoc using JavaScript template literals was interpolated before reaching the VPS.
- Workaround: Use single-quoted SSH command strings and avoid backtick template literals in remote snippets; prefer `path.join(...)` and JSON/Node checks over shell grep when matching Arabic text.

### 2026-05-18 - PowerShell can expand remote bash command substitution before SSH
- Context: During a direct production deploy, `ssh "... ts=$(date ...) ..."` was evaluated by local PowerShell, and a later PowerShell here-string sent CRLF into remote bash so `curl` received a malformed URL.
- Workaround: For remote bash scripts from PowerShell, either use a fixed simple remote command with no `$()`/`${}` or pipe the script through a CRLF scrubber, e.g. `ssh host 'tr -d "\r" | bash -s'`. For remote Node smoke scripts, prefer `node -` with explicit `process.exit(0)` after output so open handles do not make the shell command time out.

### 2026-05-19 - Active H drive worktree unavailable in desktop session
- Context: The workspace instructions name `H:\max_p_new` as the active MaxP continuation repo, but this Codex desktop session returned `The directory name is invalid` for `H:\max_p_new`.
- Workaround: Use the mounted repo at `C:\Users\H2M\Desktop\Project\max_p_new` when `H:` is unavailable, and mention the fallback in final status if it matters for deployment or pushing.

### 2026-05-19 - Docs verifier path depends on repo root
- Context: Running `node scripts\verify-docs.js` from `H:\max_p_new\backend` failed because the verifier script lives under the repository root `scripts/` directory, not under `backend/scripts/`.
- Workaround: Run docs verification from `H:\max_p_new` with `node scripts\verify-docs.js`, or use an explicit root-relative path when working from a subdirectory.

### 2026-05-29 - Start-Process needs npm.cmd on Windows
- Context: Starting the Vite dev server with `Start-Process -FilePath npm` failed on Windows with `%1 is not a valid Win32 application`.
- Workaround: Resolve and launch `npm.cmd` instead, e.g. `$npm = (Get-Command npm.cmd).Source; Start-Process -FilePath $npm ...`.

### 2026-06-03 - MaxP production 502 from missing backend dependencies and port mismatch
- Context: Production returned Cloudflare 502 for backend-backed routes after deploy. PM2 showed `maxp-backend` and `maxp-webhook-worker` in restart/waiting states.
- Evidence: Manual `node server.js` on `/var/www/backend2` failed with `Cannot find module 'dotenv'`; worker logs failed with `Cannot find module 'bullmq'`; after reinstalling dependencies, backend listened on `3008` while Nginx production configs proxy to `3007`.
- Workaround: On the VPS, reinstall backend dependencies with Puppeteer downloads disabled, generate Prisma with `./node_modules/.bin/prisma generate --schema=prisma/schema`, sync `prisma/generated/postgresql_v2` to `node_modules/.prisma/client`, and ensure `backend/ecosystem.config.js` runs production on `PORT=3007` before PM2 reload.
- Verification: `curl https://maxp.online/api/v1/health` returned `status: OK`, `swan.maxp.online/shop` returned HTTP 200, and PM2 stayed online.
