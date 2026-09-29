---
name: auto-task-push
description: Automatically commit and push updates to https://github.com/mokhtar-el7/maxp-platform-13 with descriptive commit messages after completing any task.
---

# Auto Task Push Skill

This skill defines the mandatory post-task workflow for the MaxP platform workspace.

## Trigger

Automatically triggered upon completing **ANY** task, feature implementation, bug fix, refactoring, or rule/documentation update.

## Target Repository

- **Repository URL:** `https://github.com/mokhtar-el7/maxp-platform-13`
- **Git Remote Name:** `origin`
- **Branch:** `main` (or current active branch)

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

4. **Push to Remote:**
   Push commits to the `origin` remote:
   ```bash
   git push origin main
   ```

5. **Report to User:**
   Provide the commit message, commit hash, and confirmation that updates were pushed to `https://github.com/mokhtar-el7/maxp-platform-13`.
