---
name: auto-push-on-complete
description: Use whenever any work, task, edit, feature, fix, or change is completed. Ensures the finished work is immediately committed and pushed to the remote branch without waiting. Trigger on "خلصت", "finished", "done", "push", "رفع", "commit and push", or after any change is delivered.
---

# Auto-Push on Complete

Rule: whenever a piece of work is finished, push it to the remote immediately. Do not wait for the user to ask.

## When to run

Right after completing ANY deliverable — a feature, fix, refactor, config change, test, doc, or file edit — run the push sequence before reporting done.

## Steps

1. Preview the changes:
   - `git status`
   - `git diff --stat`
2. Stage only intended files (never secrets, build artifacts, or node_modules):
   - `git add -A` (or stage specific files/paths when the change is narrowly scoped)
3. Commit with a concise message describing the work, matching the repo's style:
   - `git commit -m "<type: concise summary>"`
4. Push to the remote branch:
   - `git push`

## Guardrails

- Never commit secrets, `.env` files, API keys, or credentials.
- Never commit build outputs, `node_modules/`, `dist/`, or generated artifacts. Respect `.gitignore`.
- If there is nothing to commit (`nothing to commit` / clean tree), skip the push and state that clearly.
- If the branch has no upstream yet, set it with `git push -u origin <branch>` and note it.
- If a commit/push fails (hooks, conflicts, rejected due to non-fast-forward), report the failure and resolve rather than force-pushing.

## Reporting

After pushing, confirm in one short line: branch name, commit subject, and that the push succeeded (or why it was skipped).
