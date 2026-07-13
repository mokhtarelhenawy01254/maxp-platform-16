# WhatsApp Session Connection Overhaul (2026-06-01)

## Overview
Comprehensive overhaul of the WhatsApp session connection lifecycle covering: platform-specific browser identification, auth state race condition prevention, multi-layer health checks with stale connection detection, exponential backoff reconnect, QR lifecycle scoping, and the new AUTHENTICATING connection state.

## Changes

### 1. Platform-Aware Browser ID (`WhatsAppManager.js:getSocketBrowser`)
- **Before**: Always used `Browsers.macOS('Desktop')` regardless of OS → WhatsApp flagged Windows/Linux sessions as suspicious
- **After**: Detects `process.platform`:
  - `win32` → `Browsers.windows('Chrome')`
  - `linux` → `Browsers.linux('Chrome')`  
  - `darwin` → `Browsers.macOS('Desktop')`
  - Fallback → `[osName, 'Chrome', '125.0.0']`
- Chrome version pinned to `125.0.0` for consistency

### 2. Auth State Save Race Prevention (`DatabaseAuthState.js:saveAuthState`)
- **Problem**: Concurrent mutations to `state.creds` and `keysData` during rapid auth updates produced corrupted JSON in the database
- **Fix**:
  - Dual debounce timers: 50ms for immediate saves (`SAVE_IMMEDIATE_DEBOUNCE_MS`), 1000ms for regular debounce
  - Deep-clones `state.creds` and per-category keys before serialization
  - Direct `authStateCache.set()` instead of intermediary `setCachedAuthState()`
  - Improved logging with byte count and key category count

### 3. Multi-Layer Health Check (`WhatsAppManager.js:verifySessionHealth`)
- **Layer 1**: WebSocket `readyState === 1` (OPEN)
- **Layer 2**: `lastReceivedMessageTimestamp` recency check — no messages for 120s = stale
- **Stale Action**: Returns `{ alive: true, stale: true }` → health check terminates socket via `endSocketQuietly()` and schedules reconnect
- **Impact**: Eliminates ghost connections that stay in `connected` state after network drops

### 4. Exponential Backoff Reconnect (`WhatsAppManager.js:scheduleReconnectSession / reconnectSession`)
- **Formula**: `baseDelay × 1.5^attempt` (e.g., 1000ms → 1500ms → 2250ms → 3375ms → 5062ms)
- **Jitter**: Random 0-30% of base delay (max 3000ms jitter)
- **Ceiling**: 60 seconds max delay
- **Retries**: Up to 5 automatic retry attempts on reconnect failure
- **Cleanup**: Deletes health check timers, untracks company, cleans socket listeners before reconnect

### 5. AUTHENTICATING State Machine (`WhatsAppManager.js`)
- New transient status: `qr_pending` → **`authenticating`** → `connected`
- Triggered in `handleConnectionUpdate` when Baileys emits a `connection` update with no QR and previous status was `qr_pending`
- DB persisted as `CONNECTING` (existing enum value reused)
- Frontend can display "authenticating" status via `getLiveStatusFromDbStatus()`

### 6. QR Lifecycle Scoping (`WhatsAppManager.js:handleConnectionUpdate`)
- **Scoped Emission**: QR codes emitted only to `company_{companyId}` Socket.IO room, not globally
- **Expiry Detection**: Tracks `lastQRTimestamp` per session; different QR string = `qr_refreshed` event
- **Refresh Logging**: Separate events for `qr_generated` (first) vs `qr_refreshed` (subsequent)

### 7. Extended Link State Wait (`whatsappController.js:waitForSessionLinkState`)
- **Timeout**: Increased from 10s (20 × 500ms) to 120s (240 × 500ms)
- **Background Polling**: After timeout, continues polling at 1s intervals for up to 120s
- **Late Emission**: When link data arrives after initial timeout, re-emits QR/pairing code via Socket.IO

## Files Changed
- `backend/controller/whatsappController.js` — Socket.IO integration, extended wait, background polling
- `backend/services/whatsapp/DatabaseAuthState.js` — Dual debounce, deep-clone snapshots, cache fix
- `backend/services/whatsapp/WhatsAppManager.js` — All core changes (browser, health, backoff, state machine, QR)
- `frontend/src/locales/ar/sections/whatsappSettings.json` — Arabic locale updates
- `frontend/src/locales/en/sections/whatsappSettings.json` — English locale updates
- `frontend/src/pages/whatsapp/WhatsAppSettings.tsx` — UI updates for new states
- `frontend/src/services/socketService.ts` — Socket.IO service integration
