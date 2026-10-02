# MaxP Telephony Phase 1 — Fixes & Review Report

## Summary of Fixes Applied

### 1. Blocker 1: Regenerated Prisma Client
- Ran `npm run schema:generate` (`prisma generate --schema=prisma/schema`).
- Prisma generated the updated client to `apps/backend/prisma/generated/postgresql_v2` and mirrored to `apps/backend/generated/postgresql_v2`.
- Verified that `EmployeeDevice` is present with 2273 definitions across types, scalar enums, and operations.
- Verified that `sessionId` is present with 1090 occurrences in the generated definitions for `CallAttemptLog`.

### 2. Blocker 2: Database Migration Created
- Created new migration: `apps/backend/prisma/schema/migrations/20261002120000_add_employee_devices_and_telephony_session/migration.sql`.
- Migration actions:
  - Creates table `employee_devices` with all columns (`id`, `companyId`, `userId`, `deviceId`, `deviceName`, `socketId`, `fcmToken`, `isOnline`, `lastSeenAt`, `appVersion`, `createdAt`, `updatedAt`).
  - Sets unique index on `deviceId`.
  - Sets performance indexes on `("companyId", "userId")`, `deviceId`, and `isOnline`.
  - Sets foreign keys with `ON DELETE CASCADE` to `companies` and `users`.
  - Adds nullable unique column `sessionId` and `session_id` to `call_attempt_logs`.

### 3. Bug A: Honest Socket-Aware Presence & Reconnect Resilience
- Updated `apps/frontend/src/services/telephonyService.ts`:
  - `sendHeartbeat` now passes `socketConnected: socketService.isConnected()` along with device metadata.
  - Replaced the permanent `isAgentInitialized` registration guard with a reusable `registerSocketDialListener()` that registers immediately and re-registers on every Socket.IO `connect` event.
  - Automatically triggers an immediate heartbeat on socket reconnect to recover device presence instantly.
- Updated `apps/backend/services/telephonyService.js`:
  - `registerOrHeartbeatDevice` accepts `socketConnected` parameter and updates `isOnline: Boolean(socketConnected)` (refreshing `lastSeenAt` regardless).
- Updated `apps/backend/routes/telephonyRoutes.js`:
  - Extracts and passes `socketConnected` from the request body to `registerOrHeartbeatDevice`.

### 4. Bug B: Eliminated Presence Polling Storm (Shared Singleton Store)
- Created `apps/frontend/src/hooks/useDevicePresence.ts`:
  - Single module-level pub/sub store with in-flight promise deduplication.
  - Exactly one interval timer (30s) shared across all components and order queue rows.
  - Immediate refresh on window `focus` if stale (>5s).
  - Automatically starts polling on first subscriber and stops when all subscribers unmount.
- Refactored `apps/frontend/src/components/telephony/OrderCallButton.tsx`:
  - Removed local 30s interval polling.
  - Consumes `useDevicePresence()`.

### 5. Bug C: Corrected `callerPhone` Semantics
- In `apps/frontend/src/services/telephonyService.ts`:
  - In `callEnded` listener, passed `callerPhone: undefined` into `completeCall()` to prevent customer's phone number from being stored as the employee's SIM line.
  - Added unit test in backend verifying `callerPhone` stays null when omitted.

### 6. Verification Status
- Backend test suite: `npx jest tests/services/telephonyService.test.js` → **8/8 PASSED** (including both new tests for socketConnected presence and callerPhone semantics).
- Frontend compilation: verified via Vite build.

### 7. Clarifications & Deviations
- **Prisma Client Tracking:** The brief noted "Include the regenerated client files in the commit (they are tracked in git)". In this repository, `apps/backend/generated/` and `apps/backend/prisma/generated/` are explicitly ignored via `.gitignore` because they include platform-dependent binary engines (`query_engine-windows.dll.node`, `libquery_engine-debian-*.so.node`, totaling >100MB). In production, the build pipeline runs `npm run schema:generate` during deploy/prestart, generating the fresh engine for Debian Linux on the target server.
- **Untracked brief:** `TELEPHONY_FIX_BRIEF.md` and `.zcodeignore` were left in place as instructed.

