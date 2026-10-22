---
name: auto-task-push
description: Automatically commit and push updates to https://github.com/mokhtarelhenawy01254/maxp-platform-16 with descriptive commit messages after completing any task.
---

# Auto Task Push Skill

This skill defines the mandatory post-task workflow for the MaxP platform workspace.

## Trigger

Automatically triggered upon completing **ANY** task, feature implementation, bug fix, refactoring, or rule/documentation update.

## Mandatory Prerequisite Gate (بوابة الجودة الإلزامية قبل الرفع)

> [!IMPORTANT]
> **NO PUSH WITHOUT LIVE PROOF (ممنوع الرفع بدون إثبات عملي)**:
> Before running any git commands in this skill, the agent MUST have strictly satisfied the `task-scenario-browser-verify` skill:
> 1. Formulated the pre-flight test scenario.
> 2. Implemented the task cleanly with zero blast-radius.
> 3. Opened the live browser (via `chrome-devtools` or dev environment), executed the test scenario hands-on, confirmed zero console errors (`list_console_messages`), and verified proper UI/API responses.
> *(For backend/script tasks without UI: executed a verifiable test script or API curl call confirming 200 OK).*
> **If this prerequisite is not met, executing Git Push is STRICTLY FORBIDDEN.**



- **Repository URL:** `https://github.com/mokhtarelhenawy01254/maxp-platform-16`
- **Git Remote Name:** `origin`
- **Branch:** `main` (or current active branch)

## 🧭 Cross-Agent Coordination Gate (بوابة تنسيق الوكلاء — إلزامية قبل أي رفع)

> [!IMPORTANT]
> نفس الـ workspace يشتغل عليه أكثر من إيجينت (Antigravity + Hermes + غيرهم)، وأجهزة أخرى ترفع إلى `origin` في نفس الوقت. قبل أي `git commit` / `git push`:

0. لو التاسك لسه محصلش claim: `python scripts/agent-coord/coord.py claim --agent antigravity --task "<ملخص التاسك>"`
   - لو مرفوض → فيه إيجينت آخر شغال — **قف وابلغ المستخدم** (ممنوع العمل بالتوازي على نفس الشجرة).
1. ارفع حصريًا عبر البوابة (fetch + pull --rebase + push مع إعادة محاولة تلقائية):
   ```bash
   python scripts/agent-coord/coord.py guard --agent antigravity --push
   ```
2. بعد نجاح الرفع، حرّر القفل وسجّل الإنجاز:
   ```bash
   python scripts/agent-coord/coord.py release --agent antigravity --commit <hash> --note "<ملخص>"
   ```
3. لو البوابة رفضت أو فشل الـ rebase → أوقف وابلغ المستخدم. **force push ممنوع نهائيًا** (انظر أسفل).

التفاصيل الكاملة: `docs/agent-coordination.md` — الحالة: `~/.agent-coordination/`.

## Protocol & Steps

1. **Review Changed Files:**
   Check modified and untracked files:
   ```bash
   git status
   ```

2. **Stage Changes:**
   Stage relevant changed files, preserving `.gitignore` exclusions:
   ```bash
   git add <modified-and-new-files>
   ```

3. **Craft Descriptive Commit Message:**
   Write a descriptive commit message that clearly states what was accomplished in the completed task:
   - Example: `feat(mindmap): add execution node validation and state machine`
   - Example: `fix(auth): resolve JWT token expiration refresh race condition`
   - Example: `docs(skill): add auto-task-push skill for automatic post-task commits`

   ```bash
   git commit -m "<descriptive message identifying the task changes>"
   ```

4. **Push to Remote (عبر بوابة التنسيق):**
   Push commits through the coordination guard (fetch + pull --rebase + push بأمان):
   ```bash
   python scripts/agent-coord/coord.py guard --agent antigravity --push
   ```

   > [!CAUTION]
   > ## 🚫 ABSOLUTE BAN: `git push --force` & `git push --force-with-lease`
   > **NEVER use force push under ANY circumstances. This is a permanent, non-negotiable rule.**
   > - `git push --force` → **BANNED**
   > - `git push --force-with-lease` → **BANNED**
   > - `git push -f` → **BANNED**
   >
   > Force pushing rewrites remote history, destroys teammates' work, and corrupts the repository.
   > If a push is rejected due to a non-fast-forward conflict, the correct fix is:
   > ```bash
   > git pull --rebase origin main   # rebase local commits on top of remote
   > git push origin main            # then push normally — NO force flag
   > ```
   > If you ever feel tempted to force push, **STOP and ask the user first.**

5. **Report to User:**
   Provide the commit message, commit hash, and confirmation that updates were pushed to `https://github.com/mokhtarelhenawy01254/maxp-platform-16`.
