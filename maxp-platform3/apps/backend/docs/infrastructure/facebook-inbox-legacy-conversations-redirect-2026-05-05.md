# Facebook Inbox Legacy Conversations Redirect - 2026-05-05

## Summary

The legacy `/conversations` and `/conversations-improved` frontend entry points now redirect to `/facebook-inbox`.

## Why

`/facebook-inbox` is the maintained Facebook/Messenger inbox surface. Keeping the old conversations page visible beside it created duplicate navigation and split operator attention across two UIs backed by the same conversation APIs.

## Changed

- `/conversations` redirects to `/facebook-inbox`.
- `/conversations-improved` redirects to `/facebook-inbox` in both authenticated and unauthenticated route tables.
- The legacy conversations link was removed from the Facebook sidebar section.
- The unused `sidebar.conversationsImproved` translation key was removed from Arabic and English locale files.
- Marketplace feature mapping now lists `/facebook-inbox` as the primary conversation route.
- The legacy `ConversationsRouter` fallback also redirects both old paths to `/facebook-inbox`.
- Super Admin project map details now reference `/facebook-inbox` for communications.
- Login fallback redirects now use `/facebook-inbox` instead of `/conversations-improved`.
- Removed unused legacy frontend files:
  - `frontend/src/pages/conversations/ConversationsImprovedFixed.tsx`
  - `frontend/src/pages/conversations/ConversationsImproved.tsx`
  - `frontend/src/pages/conversations/ConversationsImprovedSimple.tsx`
  - `frontend/src/pages/conversations/ConversationsDashboard.tsx`
  - `frontend/src/styles/conversations-improved.css`

## Not Changed

- Backend `/api/v1/conversations` APIs remain active because Facebook Inbox still depends on them.
- Historical docs may still mention `ConversationsImprovedFixed.tsx` as part of older bug-fix records.
