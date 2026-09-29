# Repository Migration to maxp-platform-13

## Date: 2026-09-28

### 1. Repository Migration Summary
- **Target Repository**: `https://github.com/mokhtar-el7/maxp-platform-13.git`
- **Remote Configuration**: Primary remote `origin` set to `https://github.com/mokhtar-el7/maxp-platform-13.git`.
- **Previous Repository**: `https://github.com/mokhtarelhenawy091-crypto/maxp-platform-12.git`
- **GitHub Secrets Migrated**:
  - `SERVER_HOST`: `srv974554.hstgr.cloud`
  - `SERVER_USER`: `root`
  - `SERVER_PORT`: `22`
  - `SERVER_SSH_KEY`: Configured from active production SSH key (`~/.ssh/id_ed25519`).
- **Configuration & Rules Updated**:
  - `AGENTS.md`
  - `MEMORY.md`
  - `TOOLS.md`
  - `TEAM_GUIDE.md`
  - `.agents/skills/auto-task-push/SKILL.md`
  - `.agents/skills/gh-deploy-ssh-verify/SKILL.md`
  - `.agents/skills/gh-deploy-ssh-verify/references/maxp-release-playbook.md`
  - `.github/workflows/mirror-to-maxp4.yml`
  - `scripts/server-deploy.sh`
- **Commit History**: Full git commit history and all release tags preserved and pushed directly to `mokhtar-el7/maxp-platform-13`.
