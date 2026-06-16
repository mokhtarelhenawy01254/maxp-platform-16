# Unified Inbox — Bug Fixes (2026-06-16)

## Summary

Fixed 8 bugs discovered during a full QA audit of the `/unified-inbox` page.

## Frontend Changes — `UnifiedInbox.tsx`

### 1. Three-Dots Button (⋮) Now Works
The `EllipsisVerticalIcon` button previously had no `onClick` handler and did nothing.
It now opens a dropdown menu with the following actions:
- **Mark as Resolved** — calls `PUT /api/v1/conversations/:id` with `status: resolved`, removes conversation from list.
- **Show/Hide Profile Panel** — toggles the customer profile sidebar.
- **Delete Conversation** — calls `DELETE /api/v1/conversations/:id` with a confirmation dialog.

New state: `showActionsMenu`, `actionsMenuRef`. Menu closes on click-outside.

### 2. WhatsApp Conversations Now Load Customer Profile
Previously, conversations whose `id` started with `wa_` were always skipped when loading the customer profile panel, leaving it permanently empty for WhatsApp.

Fixed by removing the `!conv.id.startsWith("wa_")` guard — profile now loads for any platform if `contactId` is present.

### 3. Visible Error Feedback on Send Failure
Previously, message send errors were only logged to the console (`console.error`). Users had no way to know a message failed.

Now shows a dismissable error banner below the message area with the server error message (or a fallback string). Auto-dismisses after 5 seconds.

New state: `sendError`.

### 4. Quick Replies Empty State
When the Quick Replies panel was opened but no quick replies were defined, nothing happened and no feedback was given to the user.

Now shows an informational message: _"No quick replies defined yet"_ / _"لا توجد قوالب ردود سريعة بعد"_.

### 5. RTL Margin Fix in Quick Replies
The preview span inside Quick Replies items had a hardcoded `mr-2` class (LTR-only).

Fixed to `isRtl ? "ml-2" : "mr-2"` for proper bidirectional layout.

### 6. `useEffect` Dependency Array Fixed
The main load effect `useEffect(() => { loadConversations(); loadQuickReplies(); }, [...])` was missing `loadConversations` and `loadQuickReplies` from its dependency array.

Updated to `[loadConversations, loadQuickReplies]` — both are stable `useCallback` refs so this is safe and eliminates the React exhaustive-deps warning.

### 7. Actions Menu Clears on Conversation Switch
`selectConversation()` now calls `setShowActionsMenu(false)` and `setSendError(null)` when switching conversations, preventing stale UI state.
