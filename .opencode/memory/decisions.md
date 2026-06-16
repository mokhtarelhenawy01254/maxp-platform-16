# Decisions

## 2024-06-14: Long-term memory setup
- Activated `.opencode/memory/` directory for cross-session persistence
- Created categorized files: project-context, user-preferences, decisions, session-logs
- Goal: remember work context across sessions

## 2026-06-16: Strict CI/CD Compliance & Pre-Push Rules
- **TypeScript & ESLint**: NEVER push frontend code without running `npm run build` or `npx tsc --noEmit` and `npx eslint <changed_files>` to ensure zero strict typing (`any`) errors or hook dependency warnings.
- **Documentation Compliance**: The CI enforces a strict `verify-docs.js` check. If any source code files are modified, a corresponding `.md` file must be updated/created in the relevant `docs/` folder (e.g. `apps/frontend/docs/`), OR the commit message must contain `[no-doc]`.
- **Translations/i18n**: Whenever translation files or components using translations change, `npm run build` runs `i18n:merge`. These generated `translation.json` files must be staged and committed alongside the original code.
- **Git Workflow**: Always adhere to the `git add && git commit && git pull --rebase && git push` workflow to prevent stash data loss.
