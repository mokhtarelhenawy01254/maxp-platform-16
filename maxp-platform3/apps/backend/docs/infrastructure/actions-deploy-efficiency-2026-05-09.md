# GitHub Actions Deploy Efficiency - 2026-05-09

## Summary

Reviewed the `Deploy to Server` GitHub Actions workflow for repeated time sinks after recent production runs averaged about seven minutes.

## Changes

- Skipped production deploys for documentation-only pushes by adding `paths-ignore` for Markdown and docs directories.
- Removed the runner-side backend production dependency install because `backend/node_modules` is excluded from the deployment archive and production dependencies are installed again on the server.
- Changed the server-side `sharp` fix from unconditional install to a runtime check that installs `sharp` only when the current Linux binary cannot load.
- Added changed-file detection so backend-only deploys skip frontend dependency install, frontend build, frontend archive upload, and storefront theme archive upload.
- Limited the Tasks production regression to manual runs and task-related file changes, instead of running it after every unrelated production deploy.
- Replaced the server staging-directory `ls | head` diagnostic with a plain `find -maxdepth` listing, so pipe handling cannot stop a deploy before any application sync starts.
- Disabled `appleboy/ssh-action` command injection for the main deployment script (`script_stop: false`) and kept the script-level `set -euo pipefail` guard. The injected checks were fragile around complex shell blocks, while Bash still exits the action on real deployment failures.

## Expected Impact

- Documentation-only updates no longer consume a full production deploy.
- Normal deploys avoid about 40 seconds of redundant runner work.
- Deploys with a healthy `sharp` install avoid another roughly 20 seconds of server-side package work.
- Backend-only deploys avoid the frontend install/build/archive path, which typically saved about 90-100 seconds in the reviewed runs.
- Non-task deploys avoid the Tasks production regression path, which typically saved about 50-60 seconds in the reviewed runs.

The production safety checks remain in place when their scope applies: documentation compliance for code changes, Facebook Ads regression tests, frontend build, server dependency install, Prisma sync, marketplace catalog sync, backend health checks, Nginx validation, storefront SEO smoke, and Tasks production regression.

Frontend build and Tasks regression still run automatically when their matching files change, and both run during `workflow_dispatch`.
