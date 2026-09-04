---
name: github-actions-workflow-guard
description: Enforce GitHub Actions workflow security standards, incremental build performance, zero-downtime deployment hygiene, safe variable passing (no script injection), and secret protection for the MaxP platform. Use whenever reviewing, writing, modifying, or debugging GitHub Actions (.github/workflows/*.yml) or deployment scripts (scripts/deploy-remote.sh).
---

# GitHub Actions Workflow Guard (MaxP CI/CD Standard)

This skill governs the architecture, security, performance, and operational safety of all GitHub Actions workflows (`.github/workflows/*.yml`) and deploy scripts (`scripts/*.sh`) across the MaxP platform.

Follow this standard whenever creating, reviewing, editing, or auditing workflows.

---

## 🛡️ The 7 Golden Security & Hygiene Rules

### Rule 1: Zero Command Injection (Strict Variable Passing)
**NEVER** directly interpolate GitHub context expressions (e.g. `${{ github.event.inputs.* }}`, `${{ github.ref }}`, `${{ github.head_ref }}`) inside `run:` shell scripts or `appleboy/ssh-action` `script:` blocks.
- **Why**: Attackers or malicious inputs containing semicolons, backticks, or `$(...)` execute arbitrary shell commands inside the runner or server.
- **The Only Safe Pattern**: Map inputs to step environment variables (`env:`) and refer to them via standard shell parameters (`"$VAR"`).

```yaml
# ❌ VULNERABLE (Command Injection Risk):
- name: Run Script
  run: python script.py --param "${{ github.event.inputs.user_input }}"

# ✅ SECURE (Environment Variable Mapping):
- name: Run Script
  env:
    USER_INPUT: ${{ github.event.inputs.user_input }}
  run: python script.py --param "$USER_INPUT"
```

In `appleboy/ssh-action`:
```yaml
# ✅ SECURE in SSH Action:
- name: Run on Remote Server
  uses: appleboy/ssh-action@v1.2.0
  env:
    RUN_ID: ${{ github.run_id }}
    COMMIT_HASH: ${{ github.sha }}
  with:
    host: ${{ secrets.SERVER_HOST }}
    username: ${{ secrets.SERVER_USER }}
    key: ${{ secrets.SERVER_SSH_KEY }}
    envs: RUN_ID,COMMIT_HASH
    script: |
      echo "Deploying commit: $COMMIT_HASH for run: $RUN_ID"
```

---

### Rule 2: Least Privilege (Explicit Workflow Permissions)
Workflows default to broad read/write access unless restricted. Every workflow MUST explicitly declare minimal permissions at the top level:

```yaml
permissions:
  contents: read
```

Elevate permissions only within specific jobs that require them (e.g., `pull-requests: write` or `packages: write`).

---

### Rule 3: Zero Credential & Secret Exposure
1. **No Hardcoded Credentials**: Never commit plaintext passwords, test database credentials, or PATs in YAML files. Always read from `secrets.*`.
2. **No Fallback Hardcoded Secrets in Shell Scripts**: Never use fallbacks like `API_KEY="${DEPLOY_KEY:-fallback_secret_123}"`. Fail immediately if required secrets are unset.
3. **Appleboy SSH `debug: false`**: Never set `debug: true` in `appleboy/ssh-action` when secrets or environment variables pass through SSH, as it dumps environment state to runner logs.
4. **Environment Protection**: Always bind deploy jobs to the appropriate environment (`environment: production` or `staging`) to take advantage of GitHub Secrets isolation and approval gates.

---

### Rule 4: Explicit Triggers & Branch Isolation
1. **Never use wildcard branch triggers** on production or diagnostic workflows:
   ```yaml
   # ❌ DANGEROUS:
   on:
     push:
       branches: ['*']

   # ✅ SECURE:
   on:
     push:
       branches: [main]
     workflow_dispatch:
   ```
2. **No Accidental Production Triggers in Diagnostic Scripts**: Workflows meant for debugging, backfilling, or database testing must ONLY trigger via `workflow_dispatch`.

---

### Rule 5: Incremental Gating & Diff-Check (Speed Standard)
Full builds and migrations must never run blindly when unrelated files change. Deploy pipelines must implement multi-commit diff checking:

1. **Compare against previous commit**: In push events, use `github.event.before` (with a safe fallback to `HEAD~1` if `before` is all zeros `0000000000000000000000000000000000000000`).
2. **Conditionally Gate Expensive Steps**:
   - `fe-needed`: Only build frontend, validate i18n, and chunk pure check if `apps/frontend/` or `shared/` changed.
   - `ai-needed`: Only sync `uv` / python dependencies if `apps/ai-service/` changed.
   - `db-needed`: Only push schema changes or run seed scripts if `schema.prisma` changed.
3. **Hash-Guarded Remote Actions**: Server-side deployment scripts must compare MD5/SHA256 hashes of `package-lock.json` and `schema.prisma` against cached `.last_*_hash` files before triggering slow rebuilds or database pushes.

---

### Rule 6: Parallel Asset Packaging, Exclusions & Checksums
Asset tarballs must not run sequentially or include useless artifacts:
- **Parallel Execution**: Package frontend, backend, shared, ai-service, and nginx configs in parallel using subshells (`(...) &` followed by `wait`).
- **Targeted Exclusions**:
  Always exclude non-runtime directories from `backend.tar.gz`:
  ```bash
  --exclude="backend/node_modules" \
  --exclude="backend/prisma/generated" \
  --exclude="backend/legacy_mysql" \
  --exclude="backend/uploads" \
  --exclude="backend/*.tar.gz" \
  --exclude="backend/__tests__" \
  --exclude="backend/tests" \
  --exclude="backend/testsprite_tests" \
  --exclude="backend/docs" \
  --exclude="backend/coverage" \
  --exclude="backend/*.log"
  ```
- **Cryptographic Checksum Verification**:
  Always generate `sha256sum *.tar.gz > SHA256SUMS` on the runner and verify `sha256sum -c SHA256SUMS` on the server before extracting, ensuring network truncation or corrupted SCP transfers are caught before touching server files.

---

### Rule 7: Zero-Downtime Deployment & Automated Trap Rollback
Remote deployment scripts (`scripts/deploy-remote.sh`) must guarantee:
1. **Snapshot Before Modification**: Copy existing `dist/index.html` and current server state to `.snapshots/` before unpacking new assets.
2. **ERR Signal Trapping**:
   ```bash
   trap 'on_deploy_error $LINENO' ERR
   ```
3. **Zero-Downtime PM2 Reload**: Use `pm2 reload <app> --update-env` instead of `pm2 restart` or `kill`.
4. **Health Check Verification**: Test `curl -sf http://localhost:<port>/health` up to 5 times.
5. **Immediate Rollback on Failure**: If health check fails or an error occurs, the trap must restore the snapshot, reload PM2 to previous state, and exit with code 1.
6. **Wait-Based Server Flock**: Always use `flock -w 180 9` rather than `flock -n 9` so overlapping deployments gracefully wait up to 3 minutes instead of immediately erroring out.

---

### Rule 8: Job Timeouts & PR Concurrency Hygiene
1. **Always Set `timeout-minutes`**: Never allow jobs to run with GitHub's default 6-hour timeout. Bound `build` jobs to <= 30 minutes and `deploy` jobs to <= 45 minutes to prevent hung processes from blocking runners.
2. **PR Concurrency Cancellation**: Workflows testing PRs must include:
   ```yaml
   concurrency:
     group: ${{ github.workflow }}-${{ github.head_ref || github.ref }}
     cancel-in-progress: true
   ```
   This automatically cancels outdated builds when new commits are pushed, saving CI runner quota.

---

## 📋 Quick Pre-Commit Workflow Audit Checklist

When reviewing or creating a workflow, check off each item:

| Gate | Check | Status |
|---|---|---|
| **1. Injection** | No `${{ ... }}` directly inside `run:` or `script:` | [ ] |
| **2. Permissions** | Workflow has top-level `permissions: contents: read` | [ ] |
| **3. Secrets** | No hardcoded tokens, passwords, or `debug: true` | [ ] |
| **4. Triggers** | Triggered only on `main` or `workflow_dispatch` (no wildcard push) | [ ] |
| **5. Integrity** | SHA-256 checksums verified before archive extraction | [ ] |
| **6. Gating & Timeout** | Steps gated by diffs, jobs have bounded `timeout-minutes` | [ ] |
| **7. Concurrency** | Non-blocking waits (`flock -w 180`) on server; PRs cancel in-progress | [ ] |
| **8. Actions Versions** | Official actions used with pinned versions (`@v4`, `@v5`) | [ ] |
| **9. Syntax** | Validated with YAML parser and `bash -n` | [ ] |

---

## 🛠️ Verification Commands

Run these locally before pushing workflow changes:

```powershell
# 1. Validate YAML syntax for all workflows:
& "apps\ai-service\.venv\Scripts\python.exe" -c "
import os, yaml
for f in os.listdir('.github/workflows'):
    if f.endswith('.yml'):
        with open('.github/workflows/' + f, 'r', encoding='utf-8') as s:
            yaml.safe_load(s)
print('✅ All GitHub Actions workflows are valid YAML')
"

# 2. Validate Bash syntax for remote deployment scripts:
& "C:\Program Files\Git\bin\bash.exe" -n scripts/deploy-remote.sh
```
