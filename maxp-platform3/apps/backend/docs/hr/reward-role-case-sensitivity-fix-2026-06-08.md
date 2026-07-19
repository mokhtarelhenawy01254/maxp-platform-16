# Reward Delete Role Case-Sensitivity Fix

Date: `2026-06-08`

## Summary

Fixed a case-sensitivity bug in the HR rewards delete permission checks that could cause the delete icon to be hidden for authorized users when the role string from the backend did not exactly match the uppercase role enum in the frontend permission sets.

## What Changed

- `frontend/src/pages/hr/rewards/rewardRecordUtils.ts`:
  - Added `normalizeRole()` helper that calls `.toUpperCase()` on the role before checking membership in `APPROVE_REWARD_ROLES`, `EDIT_REWARD_ROLES`, and `DELETE_REWARD_ROLES` sets
  - Updated `canUserApproveReward()`, `canUserEditReward()`, `canUserDeleteReward()` to use `normalizeRole()`
- `frontend/src/pages/hr/rewards/RewardsLayout.tsx`:
  - Normalized `user?.role` to uppercase in the `isManager` array `.includes()` check

## Root Cause

The permission-checking functions passed `role || ""` directly to `Set.prototype.has()`. If the JWT or backend response returned a role in a different case (e.g., `"hr_manager"` instead of `"HR_MANAGER"`), the check would fail even though the user had the correct permission. This caused the delete button and other role-gated UI elements to be hidden.

## Verification

- Backend tests: `rewardManagementService.delete.test.js` — 4/4 passed
- Arabic strings check: no new violations
- Customer-intent architecture guard: passed
- Documentation compliance: this file satisfies the doc check
