# Reward Delete Actions Alignment

Date: `2026-05-21`

## Summary

Aligned the HR rewards UI with the existing delete API so the red trash action is shown consistently for deletable reward records without breaking permissions, filters, or other CRUD actions.

## What Changed

- Added shared reward record helpers in `frontend/src/pages/hr/rewards/rewardRecordUtils.ts` to:
  - normalize backend statuses such as `GIVEN` and `CANCELLED` into the UI states used by the HR pages
  - map the status filter back to the backend enum values
  - centralize approve/edit/delete role checks
  - centralize delete safety guards for locked, payroll-linked, and applied rewards
- Updated `frontend/src/pages/hr/rewards/RewardsList.tsx` so:
  - the actions column uses normalized statuses instead of raw values
  - the delete action renders as a professional red trash button
  - the red trash icon appears only when the record can actually be deleted
  - blocked records now show a professional non-delete indicator with the exact reason instead of a misleading disabled trash action
  - approve/edit/delete visibility now respects the real backend role matrix
  - successful deletion refreshes the list and statistics cleanly
- Updated `frontend/src/pages/hr/rewards/RewardDetails.tsx` to use the same reward status normalization and permission-aware action guards for consistency with the list view, while surfacing the precise delete-block reason directly on the page.
- Simplified the reward delete confirmation dialog for both list and details flows so it now shows only:
  - `إلغاء`
  - `تأكيد الحذف`
  instead of requiring the user to type `حذف`.

## Tests

- Frontend: added `frontend/src/pages/hr/rewards/__tests__/RewardsList.test.tsx`
  - pending reward delete flow with UI refresh
  - permission guard for `HR` users
  - blocked-action indicator for payroll-linked rewards
- Backend: added `backend/tests/services/rewardManagementService.delete.test.js`
  - safe database delete
  - locked reward rejection
  - applied reward rejection
  - payroll-linked reward rejection

## Follow-up `2026-05-23`

- Applied rewards (`GIVEN` / `مطبق`) are now deletable from the list and details views as long as they are not locked and not already linked to payroll.
- The actions cell now keeps the red trash icon directly beside the eye icon for users who have delete permission, matching the requested HR layout.
- The delete confirmation copy is simplified to:
  - `هل تريد حذف هذه المكافأة؟`
  - `تأكيد الحذف`
  - `إلغاء`
- Payroll-linked or locked rewards still keep the same action slot, but the delete button is disabled with the exact Arabic reason in the tooltip so the UI stays consistent without allowing an invalid backend action.

### Follow-up Verification

- `frontend: npm test -- --runTestsByPath src/pages/hr/rewards/__tests__/RewardsList.test.tsx --runInBand`
- `backend: npx jest tests/services/rewardManagementService.delete.test.js --runInBand`
- `backend: npm run check:syntax`
- Browser verification with mocked HR rewards APIs confirmed:
  - the red trash icon appears next to the eye icon
  - the confirmation dialog shows `تأكيد الحذف` and `إلغاء`
  - confirming delete removes the row and refreshes the empty state
