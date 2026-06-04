# Facebook Inbox Conversation Delete Action - 2026-05-06

## Summary

`/facebook-inbox` now exposes the existing conversation deletion capability in the active conversation toolbar and mobile action menu.

## Behavior

- Desktop users get a destructive delete icon in the active conversation action bar.
- Mobile users get `حذف المحادثة` in the overflow action menu.
- The UI asks for confirmation before deleting.
- After deletion, the selected thread is cleared, the URL `conversation` parameter is removed, and the active inbox tab reloads.

## Backend Safety

- `DELETE /api/v1/conversations/:id` now verifies the conversation belongs to the authenticated user's company before deleting.
- Related inbox data is removed in one database transaction:
  - messages
  - conversation memory
  - conversation outcomes
  - media file records
- Orders are preserved; their `conversationId` pointer is cleared before the conversation row is deleted.
- Conversation and message cache entries are invalidated after a successful delete.

## Scope Note

This deletes the local inbox conversation record and its locally stored messages. It does not delete the Messenger conversation from Facebook.
