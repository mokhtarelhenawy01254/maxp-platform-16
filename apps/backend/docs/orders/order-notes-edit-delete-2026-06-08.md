# Order Notes Edit & Delete - 2026-06-08

## Problem

Order notes could only be created and viewed — there was no way to edit or delete a note after creation. Users had no recourse for fixing typos or removing incorrect notes.

## Solution

Added edit and delete functionality for order notes in both the backend API and the order details frontend.

### Backend — Two new endpoints in `routes/orders.js`

- `PATCH /simple/notes/:noteId` — Update note content
  - Validates company ownership through the related order/guestOrder
  - Permission check: only the note author, COMPANY_ADMIN, or SUPER_ADMIN can edit
  - Returns the updated note with user relation

- `DELETE /simple/notes/:noteId` — Delete a note
  - Same company ownership and permission validation as PATCH
  - Hard-deletes the note record
  - Returns success message

### Frontend — Three files changed

- `OrderActivityLog.tsx`: Added inline edit mode (textarea + save/cancel buttons) triggered by a pencil icon, and a delete button (trash icon) that opens a confirmation dialog. Edit/delete buttons only appear for the note's author.
- `useOrderDetails.ts`: Added `updateNote(noteId, content)` and `deleteNote(noteId)` functions that call the new PATCH/DELETE endpoints and update local state optimistically.
- `OrderDetails.tsx`: Wired the new props through to the `OrderActivityLog` component.
- `types.ts`: Added `authorId` and `updatedAt` fields to the `OrderNote` interface.

### Permission Model

- Regular users can only edit/delete their own notes
- `COMPANY_ADMIN` and `SUPER_ADMIN` roles can edit/delete any note within their company
- Company isolation is enforced by joining through the note's parent order/guestOrder

## Files Changed

- `apps/backend/routes/orders.js` (+107 lines)
- `apps/frontend/src/pages/orders/OrderDetails.tsx`
- `apps/frontend/src/pages/orders/components/OrderActivityLog.tsx`
- `apps/frontend/src/pages/orders/hooks/useOrderDetails.ts`
- `apps/frontend/src/pages/orders/types.ts`
