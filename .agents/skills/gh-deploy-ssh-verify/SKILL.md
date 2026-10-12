---
name: gh-deploy-ssh-verify
description: Publish code changes to GitHub, watch the resulting GitHub Actions workflow to completion, verify the deployed server over SSH, inspect PM2 and app logs, confirm health checks, and add or run missing regression tests before sign-off. Use when the user asks to push, publish, deploy, release, monitor Actions, check CI, validate production or staging after deploy, inspect remote logs over SSH, or make sure a change has the right tests before shipping.
---

# GH Deploy SSH Verify

Use this skill for the full ship loop: quality gate, GitHub publish, Actions follow-up, remote verification, and test backfill.

## Workflow

1. Build repo context first
- Run `git status --short`, inspect the diff, and identify whether the user wants a branch push, a `main` deploy, a `staging` deploy, or a PR validation loop.
- If the user's wording is ambiguous (`push it`, `upload to GitHub`, `ارفعه`, `ship it`) and the repo has auto-deploy workflows, explicitly resolve whether they want PR validation only or the branch/event that actually reaches a server. Do not silently default to a PR branch when `main` push is the production release path.
- Read `TOOLS.md` first for SSH aliases or environment notes.
- Read the repo deploy map before acting: `.github/workflows/*.yml`, `DEPLOYMENT.md`, deploy scripts, relevant `package.json` files, and `backend/ecosystem.config.js`.
- Do not assume the SSH host, remote path, PM2 names, or health port. Infer them from `TOOLS.md`, repo scripts, and workflow files.

2. Prepare a safe release
- Never stage unrelated user changes.
- If code changes are being shipped, satisfy `scripts/verify-docs.js` by updating a matching doc file under `backend/docs/`, `frontend/docs/`, or `apps/ai-service/docs/` unless the user explicitly wants a `[no-doc]` bypass.
- Review whether the diff changes behavior. If it does, run focused tests and add regression coverage when no nearby test already protects that behavior.
- Prefer the narrowest reliable test set first, then widen only when risk or failures require it.

3. Choose and run tests
- Frontend defaults: `npm run type-check`, targeted Jest/Vitest tests, and `npm run build` when the diff touches deployment-sensitive UI, routing, storefront, or shared settings code.
- Backend defaults: `npm run check:syntax`, targeted Jest tests, and `npm run templates:validate -- --fail-on-critical-warnings` when template or storefront behavior changes.
- When a fix or new behavior would otherwise ship uncovered, add the smallest meaningful regression test instead of only noting the gap.
- If the diff is purely documentation or non-runtime config, say so explicitly and skip unnecessary test cost.

4. Publish to GitHub
- Stage only intended files.
- Use a clear commit message that matches the shipped behavior and doc updates.
- Push to the correct branch with `git push origin <branch>` after tests and docs pass. (Mandatory repo: https://github.com/shroukmagdi74-source/maxperformance14 - remote `origin`).
- When production deploys are tied to `main`, treat a user request to deploy/publish as incomplete until the production branch is updated or the user explicitly chooses a PR-only loop.
- If the user also asked for a PR, create or update it after the push.

5. Watch GitHub Actions to completion
- Identify the relevant workflow from the branch and event before waiting.
- Use `gh run list` to find the newest run for that branch and workflow.
- Use `gh run watch <run-id> --exit-status`.
- PR validation runs are not a substitute for production deploy verification when the server is only updated from a different branch/event. Follow the workflow that actually reaches the target environment.
- If a run fails, inspect `gh run view <run-id> --log-failed`, fix the issue, and re-push unless the user asked to stop at diagnosis.
- Do not stop at "push completed" when the user asked for deploy follow-up.

6. Verify the deployed server over SSH
- Prefer SSH coordinates from `TOOLS.md`; otherwise infer the likely host, remote directories, PM2 process names, log files, and health endpoints from repo references.
- Check process health first with `pm2 list` or `pm2 status`.
- Check remote logs next with PM2 and then file-based logs if PM2 output is insufficient.
- Resolve the runtime port from `.env.production`, then `.env`, then the known fallback ports from deploy scripts.
- Verify the health endpoint with `curl`.
- If infra files changed, also run the matching Nginx or storefront smoke checks.
- Do not declare success while logs show fresh exceptions, crash loops, failed workers, or unhealthy endpoints.

7. Report the ship result
- Summarize the branch, commit, workflows watched, tests run or added, SSH checks performed, and any remaining risk.
- If deployment could not be verified, say exactly which step failed and what evidence was collected.

## MaxP Conventions

- Branch-to-workflow mapping, test commands, remote paths, PM2 names, and health-check conventions for this repo are documented in [references/maxp-release-playbook.md](references/maxp-release-playbook.md).
- Read that file whenever this skill is used inside `H:\max_p_new`.
