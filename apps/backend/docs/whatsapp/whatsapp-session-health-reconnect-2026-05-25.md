# WhatsApp Session Health Check & Reconnection System - 2026-05-25

## Summary

Added a proactive session health monitoring system that detects stale WhatsApp connections, auto-reconnects stuck sessions, and accurately reports session status to the frontend so users no longer see false "needs reconnection" errors for sessions that have valid auth but are briefly reconnecting.

## Architecture

### Health Check Loop (`WhatsAppManager.js`)
```
setInterval (25s)
  → for each active session:
    → verifySessionHealth(sessionId)
      → if socket exists & ws.readyState === 'open' → status 'connected'
      → if socket missing OR not open → try pingServer()
        → ping succeeds → status 'connected' (socket was stale, baileys closed it)
        → ping fails → trigger doReconnect(sessionId) → status 'connecting'/'reconnecting'
      → if session stuck in 'connecting' > 120s → force reconnect
```

### Session Status Lifecycle
| Status | Meaning |
|--------|---------|
| `connected` | Socket is open and authenticated |
| `connecting` | Baileys is starting up / reconnecting |
| `reconnecting` | Valid auth exists but socket is being re-established (new) |
| `qr_pending` | Waiting for QR scan |
| `disconnected` | No auth / logged out |

### Session Status Emission Flow
1. User joins company room via socket → `emitSessionStatusesForCompany(companyId)`
2. Health check detects change → `emitAllSessionStatuses()`
3. Frontend polls every 30s → `GET /api/whatsapp/sessions`
4. `mapSessionForResponse()` uses `verifySessionHealth()` for live status

### Key Files
- `backend/services/whatsapp/WhatsAppManager.js`: `verifySessionHealth()`, `runHealthCheck()`, `startSessionHealthCheck()`, `doReconnect()` with jitter, `handleConnectionUpdate()`, `restoreAllSessions()` with staggered delays
- `backend/services/whatsapp/DatabaseAuthState.js`: `isValidAuthState()` validator, corrupted data fallback, debounced writes
- `backend/controller/whatsappController.js`: `mapSessionForResponse()` enhanced with health check, `reconnecting` status for sessions with valid auth but no in-memory socket
- `backend/services/socketService.js`: `emitSessionStatusesForCompany()` on room join
- `frontend/src/pages/whatsapp/WhatsAppSettings.tsx`: 30s polling, `reconnecting` status UI, socket listeners for live updates
- `frontend/src/services/socketService.ts`: WhatsApp event type definitions
