# Timeout Remediation and Incident Batch Protection (2026 Standards)

## Overview
This document covers the architectural fixes implemented to eliminate frontend 30-second timeouts, prevent external API blocking, protect Super Admin permission lookups, and throttle batch incident storms.

## Changes Implemented

### 1. Turbo Shipping API Client & Caching
- **Fast-fail Timeout**: Reduced `TurboApiClient.timeout` from `30000ms` (30s) to `5000ms` (5s) in `apps/backend/services/turbo/apiClient.js`.
- **In-Memory Resilient Cache**: Added a 90-second TTL cache in `apps/backend/controller/turbo/ticketHandlers.js` for `getUnreadTicketsCount`.
  - Cache hits return in `< 1ms` with `{ fromCache: true }`.
  - On Turbo timeout or failure, the handler returns cached counts or zeroes gracefully (`fallback: true`) without blocking client navigation.

### 2. Super Admin Permission Safeguard
- Guarded `getUserPermissions(userId, companyId)` in `apps/backend/services/permissionService.js`.
- If `companyId` is null/undefined (typical for `SUPER_ADMIN` platform accounts), it resolves platform permissions without throwing Prisma `Argument companyId must not be null`.

### 3. Batch Incident Storm Protection
- Added reason-based cooldown in `apps/backend/services/systemIncidentAlertService.js`.
- When automated loops (e.g. `WhatsAppJourneyService`) process multiple journeys that fail with the same reason (e.g. `meta_template_not_approved`), subsequent failures are throttled under a 10-minute sliding window.
- Prevents flooding Telegram, FCM, and WebSockets, preserving Node.js event-loop throughput.

### 4. Frontend Resiliency
- In `apps/frontend/src/services/apiClient.ts`, suppressed disruptive error toasts on background counter and poll endpoints (`/unread`, `/new-count`, `/messages/read`) during transient network timeouts.
