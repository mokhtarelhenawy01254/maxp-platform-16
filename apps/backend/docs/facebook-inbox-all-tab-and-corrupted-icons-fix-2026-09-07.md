# Facebook Inbox All Tab Filtering & Corrupted Icons Fix (2026-09-07)

## Summary
Resolved critical UX and data filtering defects on `/facebook-inbox`:
1. **All Tab Filtering Bug**: Previously, the `tab === 'all'` query parameter in `conversationCrudController.js` forced `status: { in: ['ACTIVE', 'PENDING'] }`, excluding `RESOLVED` and `CLOSED` conversations. This caused companies with resolved conversations (such as `ahmedfares61994@gmail.com`) to see an empty list when viewing the default/All tab.
2. **Corrupted UTF-8 Icons (`¬'ðŸ`)**: Fixed corrupted byte strings in `FacebookInbox.tsx` empty states and attachment labels by replacing them with clean Lucide React components (`MessageSquare`) and properly encoded unicode icons (`📎`).
3. **Mobile & Desktop UX Improvements**: Centered mobile toggle menu button and improved empty state responsive layout.

## Affected Files
- `apps/backend/controller/conversation/conversationCrudController.js`
- `apps/frontend/src/pages/facebook-inbox/FacebookInbox.tsx`

## Verification
- Backend unit tests (`apps/backend/tests/controller/conversationCrudController.getConversations.test.js`) passed.
- Frontend type-check & build verified.
