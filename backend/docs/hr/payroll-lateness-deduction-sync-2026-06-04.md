# Payroll Lateness Deduction Sync and Approval Workflow (2026-06-04)

## Scope
This release fixes incorrect salary calculations caused by duplicate lateness penalties, missing grace period enforcement, and PENDING deductions being applied before manager approval.

## Payroll Calculation Fixes
- **Grace Period Enforcement**: Fixed the `remainingGrace` variable scope bug in `latenessCalculationService.js`. The 60-minute monthly grace period is now strictly respected before any financial deduction is applied.
- **Deduction Approval Workflow**: PENDING auto-deductions no longer reduce net salary. Only APPROVED deductions are subtracted from the final payload. Pending amounts are now tracked separately in the deductions JSON (`pendingAmount`) for UI visibility.
- **Attendance-to-Payroll Sync**: Editing an attendance record now triggers automatic recalculation of related auto-deductions via `syncLatenessAndDeductionsForMonth`, regardless of their current approval status.
- **Summary Aggregation**: `getPayrollSummary` now includes `totalPendingDeductions` for accurate dashboard reporting.

## Frontend Enhancements
- Added employee search filtering in `Payroll.tsx`.
- Added an amber warning badge on the summary card to indicate pending deductions that require manager review.
- Built a tabbed details dialog featuring a day-by-day calculation log, showing grace period consumption and deduction breakdowns.

## Regression Coverage
- Created `backend/tests/sync-lateness-payroll-test.js` covering PENDING exclusion, APPROVED application, and attendance edit propagation. All stages pass.

## Release Checks
- Verified `Bugs.md`, `Structure.md`, and `TEAM_SYNC.md` are updated.
- Ran `check-arabic-strings.js` on the staged changes; no new hardcoded Arabic strings were introduced.
- Ran frontend type-check and build verification.
- Verified SSH connectivity to production host `srv974554.hstgr.cloud` over port 22.
