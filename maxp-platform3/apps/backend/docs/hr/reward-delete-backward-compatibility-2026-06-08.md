# Reward Delete Backward Compatibility Fix

Date: `2026-06-08`

## Summary

Removed the `isLocked` and `isIncludedInPayroll` guards from both backend and frontend delete logic so that ALL reward records — regardless of status, lock state, or payroll inclusion — can be deleted by authorized users. This provides full backward compatibility for records created before the delete feature was added.

## What Changed

### Backend — `services/hr/rewardManagementService.js`
- **`deleteRewardRecord()`**: Removed the two guard blocks that threw `ValidationError` when `existing.isLocked` or `existing.isIncludedInPayroll` was truthy. The only remaining guard is the `NotFoundError` check (record must exist).

### Frontend — `pages/hr/rewards/rewardRecordUtils.ts`
- **`getRewardDeleteBlockReason()`**: Simplified to always return `null`. The function no longer checks `record.isIncludedInPayroll` or `record.isLocked`.
- **`isRewardDeleteAvailable()`**: Simplified to always return `true` unconditionally.

### Frontend — `pages/hr/rewards/RewardDetails.tsx`
- Removed unused imports (`getRewardDeleteBlockReason`, `isRewardDeleteAvailable`)
- Removed `deleteBlockReason` and `isDeleteAvailable` variable declarations
- Delete button now renders based solely on `canDeleteThisReward` (role check), without requiring `isDeleteAvailable`
- Removed the muted "الحذف غير متاح" div that appeared when role allowed delete but record conditions blocked it
- Removed the `deleteBlockReason` paragraph from the status banner

### Frontend — `pages/hr/rewards/RewardsList.tsx`
- Removed unused import (`getRewardDeleteBlockReason`)
- Removed `deleteBlockReason` variable from the render loop
- Delete button `disabled` prop now only checks `deleting` (loading state), not `deleteBlockReason`
- Delete button `title` is now static "حذف المكافأة" instead of conditional on `deleteBlockReason`

### Backend — `tests/services/rewardManagementService.delete.test.js`
- Changed "rejects deleting locked rewards" → "deletes locked rewards (backward compatible)"
- Changed "rejects deleting rewards that are already linked to payroll" → "deletes payroll-linked rewards (backward compatible)"
- Both tests now assert successful deletion instead of rejection

## Why

Reward records created before the delete feature was added often have:
- `isLocked = true` (set on approval, void, or auto-approve)
- `isIncludedInPayroll = true` (set when batched in a payroll run)

These flags prevented deletion of old records even when the user had the correct role permission. The delete action should depend only on **user role permissions**, not on the record's lifecycle state.

## Backward Compatibility

- All legacy records (locked, payroll-linked, approved, voided, given) can now be deleted
- All new records can still be deleted — behavior unchanged for records with default `false` values
- Role-based access control remains: only `SUPER_ADMIN`, `COMPANY_ADMIN`, `OWNER`, `MANAGER`, `HR_MANAGER` can delete
- The `isLocked` and `isIncludedInPayroll` informational badges still display in `RewardDetails.tsx` for transparency

## Verification

- Backend tests: 4/4 passed (all reward delete scenarios including backward compatible cases)
- No regression in other reward management operations (update, approve, void — their own guards remain intact)
