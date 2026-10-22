# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- maxp-server → Host: `srv974554.hstgr.cloud` (or `153.92.223.119`), User: `root`, IdentityFile: `~/.ssh/maxp_server`
  Command: `ssh -i ~/.ssh/maxp_server -o StrictHostKeyChecking=no root@srv974554.hstgr.cloud`

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.

## Git & Deployment

### Mandatory Target Repository ("ارفع الابديت")
- **URL**: `https://github.com/mokhtarelhenawy01254/maxp-platform-16`
- **Remote Name**: `origin`
- **Rule**: When the user requests to push or deploy updates ("ارفع الابديت"), push **strictly** to this repository (`origin main`). No other remote exists in the local config — every legacy remote has been removed. If any note or command references a different repository, it is outdated: ignore it and push to `origin` only.


## Related

- [Agent workspace](/concepts/agent-workspace)
