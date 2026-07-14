# AI Knowledge Base

_Last updated: 2026-07-14_

## Project Context

### WhatsApp Chat Right Panel (Customer Profile)
- **File**: `apps/frontend/src/pages/whatsapp/components/ChatRightPanel.tsx`
- Complete rewrite with 3 tabs (Info/Orders/Activity), stats row, order timeline, activity timeline
- Uses `useCustomerProfile` hook from `hooks/inbox/useCustomerProfile.ts`
- Avatar fallback chain: `contact.profilePicUrl` → `customer.avatar` → initials via proxy
- `pps.whatsapp.net` added to proxy allowlist in both frontend (`imageUrl.ts`) and backend (`proxyImageController.js`)

### Inbox Panel Patterns
- **FacebookInbox**: Toggleable right profile column via `PanelRightClose`/`PanelRightOpen` + localStorage
- **InstagramInbox**: Same pattern as Facebook
- **WhatsApp Chat** (old, `/whatsapp/chat`): Has right panel toggle (`PanelRightClose`/`PanelRightOpen`) + localStorage `whatsappChatRightPanelVisible`
- **WhatsApp Inbox** (new, `/whatsapp/routing`): No panel toggle (routing workspace, not a chat)

### Routing
- `/whatsapp-inbox` → renamed to `/whatsapp/routing` (commit `b7544234`)
- `/super-admin/whatsapp/companies/:companyId/inbox` → `/super-admin/whatsapp/companies/:companyId/routing`
- Old chat at `/whatsapp/chat` and `/whatsapp`
- API endpoints (`/api/v1/whatsapp-inbox`) unchanged
