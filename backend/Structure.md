# System Structure & Architecture

### API Endpoints
No API endpoints were modified or added, but:
1. The backend query logic for `/api/v1/whatsapp-inbox/sessions` was updated inside `getUserAccessibleSessionIds` helper to restrict returned sessions to those with active assignments.
2. The workspace query logic `/api/v1/admin/whatsapp-numbers/workspace` was updated inside `numberAssignmentService.js` to ensure Meta Cloud provider sessions resolve to `CONNECTED` and to filter out soft-deleted sessions (where `isDeleted: true` is in metadata) to align with the Settings page.

### Database Schema Models
No database models or Prisma schemas were modified.

### System Architecture
No changes to the system architecture.

