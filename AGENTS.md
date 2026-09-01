# Project Instructions

## Git habit
- Whenever a piece of work is completed (feature, fix, refactor, config, test, doc, or file edit), immediately commit and push to the remote branch. Do not wait to be asked.
- Before pushing: check `git status` and `git diff --stat`, stage only intended files, then `git commit -m "<type: summary>"` and `git push`.
- Never commit secrets, `.env` files, credentials, build outputs, or generated artifacts. Respect `.gitignore`.
- If there is nothing to commit, skip the push and say so. If a push fails, resolve it rather than force-pushing.
