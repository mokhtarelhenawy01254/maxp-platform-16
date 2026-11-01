# WhatsApp Labels 404 & Messages Send Missing "to" Fix (2026-11-01)

## Summary of Issues Resolved

1. **Labels 404 Error (`GET /api/v1/whatsapp/labels?sessionId=...`)**:
   - **Root Cause**: `getLabels` and `getLabelContacts` in `whatsappController.js` performed strict lookup `where: { id: sessionId, companyId }`. When the client requested labels with a stale cached session ID from IndexedDB, with `sessionId === 'all'`, or when a session was disconnected/deleted, the controller returned a hard HTTP 404. This caused Axios to log `Error loading labels: AxiosError: Request failed with status code 404` in the browser console.
   - **Resolution**:
     - `getLabels` now gracefully falls back to the company's active connected session if the requested `sessionId` is not found or is `'all'`.
     - If no session exists at all for the company, it returns `{ success: true, labels: [] }` (HTTP 200) instead of throwing an unhandled 404.
     - `getLabelContacts` follows the same fallback and returns `{ success: true, contacts: [], total: 0 }` gracefully.
     - Frontend `useWhatsAppChatData.ts` handles label retrieval errors gracefully without dumping noisy console errors.

2. **Send Message 500 Error (`POST /api/v1/whatsapp/messages/send` - "The parameter to is required.")**:
   - **Root Cause**:
     - When sending to Meta Cloud API (`provider === 'META_CLOUD'`), `MetaCloudProvider` constructs a payload with `to: normalizePhone(to)`.
     - When `to` was an object (e.g. `{ jid: ... }`), missing, or lacked numeric digits (such as `"undefined"` or unresolvable identity), `normalizePhone(to)` returned `""` (empty string).
     - Meta Graph API rejected the request with `(#100) The parameter to is required.`.
     - In `MetaCloudProvider.js`, `apiCall` mapped the error without setting `error.statusCode`, causing `whatsappController.sendMessage` to default to HTTP 500 instead of a client validation status (400).
   - **Resolution**:
     - `whatsappController.sendMessage` now defensively extracts `recipient` if `to` is passed as an object (`to.jid || to.phoneNumber || to.phone || ...`) and trims strings. If `to` is empty, `"undefined"`, or `"null"`, it responds immediately with HTTP 400 (`WA_INVALID_RECIPIENT`).
     - `MetaCloudProvider.postMessage` and `sendText` validate that `recipient` has a valid normalized phone number (>= 6 digits) before making an external Graph API call, throwing a descriptive 400 error (`WA_INVALID_RECIPIENT`).
     - `apiCall` in `MetaCloudProvider.js` now maps `error.statusCode = mapped.httpStatus || (mapped.code === 100 ? 400 : 500)`.
     - `WhatsAppMessageHandler.sendText` guards `provider === 'META_CLOUD'` against sending without valid recipient digits.
     - `useWhatsAppChatActions.ts` falls back to `selectedContact.phoneNumber` if `selectedContact.jid` is empty, and prevents mutating with an empty recipient.
     - `useWorkspaceWhatsAppController.ts` guards both `handleSendMessage` and `handleSendTemplate` against empty `standardPhone`.
