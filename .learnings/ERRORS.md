# Errors

Command failures and integration errors.

---

## [ERR-20260728-001] baileys_module_probe

**Logged**: 2026-07-28T00:00:00+03:00
**Priority**: low
**Status**: pending
**Area**: tests

### Summary
Direct standalone ESM import of Baileys history utilities failed before the module namespace mutability probe could run.

### Error
`TypeError: Cannot read properties of undefined (reading 'connectionReplaced')` from Baileys `generics.js` during direct `node --input-type=module` import.

### Context
- The production service loads Baileys through its normal socket initialization path.
- The failed command was a read-only review probe; no project code or dependency state changed.

### Suggested Fix
Verify the history-mapping integration through an application-level test or a version-pinned patch test, not a standalone direct import.

### Metadata
- Reproducible: yes
- Related Files: apps/backend/services/whatsapp/WhatsAppManager.js

---

## [ERR-20260702-001] schedule_job_tool

**Logged**: 2026-07-02T12:00:00Z
**Priority**: high
**Status**: resolved
**Area**: config

### Summary
`schedule_job` tool failed when `opencode` is not on system PATH.

### Error
```
Failed to schedule job: Command failed: schtasks /Create ... /TR opencode run ...
```

### Context
- Tool: `schedule_job`
- Environment: Windows, PowerShell 7
- The `schedule_job` tool constructs `schtasks /TR opencode ...` but the binary is not on PATH
- Binary location: `C:\Users\mokhtar\AppData\Local\OpenCode\opencode-cli.exe`

### Suggested Fix
- Create a wrapper script with the full binary path and use direct `schtasks` call
- Or add the OpenCode directory to the system PATH

### Resolution
- **Resolved**: 2026-07-02T12:00:00Z
- **Notes**: `.opencode/scripts/refresh-ai-knowledge.ps1` created with full path. Task scheduled via `schtasks` pointing to the script.

---
