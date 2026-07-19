# Session 2026-06-17: Migration & Deploy Fixes

## Summary
نقل المشروع من `elhenawym124-ops/maxp-platform` إلى `mokhtar1983/maxp-platform-1` وإصلاح مشاكل الـ GitHub Actions للـ deploy.

## What Was Done

### 1. Repo Migration
- **Remote change**: الريبو القديم → `origin https://github.com/mokhtar1983/maxp-platform-1.git`
- **Branches pushed**: 12 branches (main, master, 3 backup/*, 5 codex/*, 2 stash/*)
- **Missing branches migrated**: `codex/allow-hidden-products-facebook-ads`, `codex/github-upload-test-20260607`
- **Parity verified**: 7/7 refs متطابقة بين القديم والجديد

### 2. Arabic Strings Fix (AgentProfilesPage.tsx)
- تم استبدال 63 hardcoded Arabic string بـ i18n keys
- تمت إضافة قسم `agentProfiles` في `en/translation.json` و `ar/translation.json`
- **Commit**: `c42231e` (re-applied after force push conflict)

### 3. Secrets Configuration
- **Set**: `SERVER_HOST`, `SERVER_USER`, `SERVER_PORT`, `SERVER_SSH_KEY`
- **Note**: `SERVER_SSH_KEY` = private key of `github_actions_key` الموجود على السيرفر

### 4. SSH Deploy Key
- تم توليد مفتاح Ed25519 على السيرفر (`/root/.ssh/gh_deploy_key`)
- تم إضافة الـ public key لـ `~/.ssh/authorized_keys`
- **مهم**: المفتاح يجب أن يكون بدون encryption (`none` cipher) عشان يشتغل على GitHub runner
- Windows OpenSSH (`9.5`) بيولّد keys مشفرة حتى مع empty passphrase — استخدمنا `ssh-keygen` بتاع Ubuntu على السيرفر

### 5. Workflow Fix
- **Problem**: `nc` command غير متاح أو مش شغال صح على GitHub Actions runner
- **Fix**: استبدال `nc -z` بـ bash built-in `/dev/tcp` fallback
- **Commit**: `e8a0587`
- **File modified**: `.github/workflows/deploy.yml`

### 6. Firewall
- UFW rule for GitHub runner IP اللي بيتغير كل مرة → فتحنا port 22 لكل الـ Anywhere (`ufw allow ssh`)

### 7. Force Push Recovery
- الريبو القديم حصل عليه force push ما بين commit الـ pending changes و i18n fix
- العملية: cherry-pick `cdc124b` + `bbd36a5` على latest HEAD من الريبو القديم (`55451f3`)

## Secrets on mokhtar1983/maxp-platform-1
| Secret | Value |
|--------|-------|
| `SERVER_HOST` | `153.92.223.119` |
| `SERVER_USER` | `root` |
| `SERVER_PORT` | `22` |
| `SERVER_SSH_KEY` | Private key of `github_actions_key` (unencrypted OpenSSH) |

## Deploy Result
✅ **First successful deploy from new repo**: Run #27683796409

## Notes
- `SERVER_SSH_KEY` not transferable between repos via `gh secret set` (it was re-generated on the server)
- `SERVER_PORT` mapped to `SERVER_SSH_PORT` in workflow env (`${{ secrets.SERVER_PORT || '22' }}`)
- Key file won't work on Windows OpenSSH due to `publickey-hostbound-v00@openssh.com` extension issue
