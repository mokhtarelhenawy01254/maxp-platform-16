# Medical Center Manager Agent — WhatsApp Admin Routing

**Date:** 2026-07-07

## Summary

Added a new `medical-center-manager` agent that responds to the center manager via WhatsApp, distinct from the existing `medical-center-agent` (customer reception). Routing uses a virtual channel `whatsapp_admin` driven by the `companyLifecycleAdminPhones` whitelist.

## What Changed

### 1. WhatsApp Inbound Routing (`WhatsAppInboundService.js`)

Before calling `aiSdkClient.sendChatMessage`, the inbound service now checks if the sender's phone is in `whatsAppNotificationSettings.companyLifecycleAdminPhones`. If yes, `channel` becomes `WHATSAPP_ADMIN` instead of `WHATSAPP`. The existing `_resolve_channel_agent` picks the correct agent because each agent is registered on a distinct channel.

### 2. New Agent: `medical-center-manager`

Located at `apps/backend/agents/medical-center-manager/` with 4 files (agent.json, SOUL.md, TOOLS.md, AGENTS.md).

- Role: `MEDICAL_CENTER_MANAGER`
- Channels: `whatsapp_admin`, `dashboard`
- Model: deepseek-v4-flash (fallback gemini-2.5-flash)
- humanApproval: OFF (manager executes directly)
- Budget: $3/day, 15 tool calls/run

### 3. New Python Tools (17 admin tools)

- `apps/ai-service/src/tools/booking_admin_tools.py` — business logic
- `apps/ai-service/src/tools/definitions/booking_admin.py` — 17 FunctionTool instances (auto-discovered)

Tools cover: branches CRUD, doctors CRUD, services CRUD + toggle, appointments list/update-status/bulk-delete, reports summary.

### 4. New Backend REST Endpoints

- `PATCH /api/v1/booking/services/:id/toggle` — toggle service active state
- `GET /api/v1/booking/reports/summary?period=today|week|month` — aggregated appointment statistics
- Controllers: `bookingServicesController.toggleService`, `bookingReportsController.getReportsSummary`
- Routes: `bookingServicesRoutes.js`, `bookingReportsRoutes.js` (new)

### 5. BackendClient Methods (`backend_client.py`)

16 new methods for branches/doctors/services/appointments CRUD + reports, using the existing Bearer token auth pattern.

### 6. Role Tools (`role_tools.yaml`)

Added `MEDICAL_CENTER_MANAGER` role with 23 tools (4 booking query + 16 admin + toggle + reports + handoff + knowledge).

### 7. New Skill: `medical-center-management`

- `apps/ai-service/src/skills/medical_center_management/report.py`
- Registered in `register_all.py`

## How to Activate

1. Add manager phone numbers to `companyLifecycleAdminPhones` in WhatsApp notification settings (company-level).
2. Re-seed the agent template via `POST /api/v1/ai-service/seed-template` or restart the backend.
3. Send a WhatsApp message from a manager number — the `medical-center-manager` agent responds.
4. Customer messages continue to route to `medical-center-agent` as before.

## Notes

- No DB migration required — uses existing `companyLifecycleAdminPhones` TEXT field.
- The `whatsapp_admin` channel is virtual (not a real Meta channel); it only exists in the AI service's agent-channel resolution layer.
- Auth for new REST endpoints uses the existing `verifyToken.authenticateToken` middleware — Python tools call them via `BackendClient` with the service token.