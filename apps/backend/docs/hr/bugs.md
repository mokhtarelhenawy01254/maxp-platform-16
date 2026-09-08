# HR & Employee Management Bugs

> Domain-specific bug tracker for HR assets, recruitment, payroll, and attendance.

### [FIX] HR Attendance — Geofencing Check-in Failures, Dashboard Employee Stats Sync & Absent Filters
- **Date**: 2026-09-08
- **Description**: Employees were unable to clock in due to 5s GPS timeouts indoors and narrow 100m geofence. Admin manual check-ins were blocked with 403 location errors. Dashboard employee cards showed 9 (active 6) vs today attendance 12. Absent filter in attendance table returned 0 rows, and absent rows showed invalid delete buttons.
- **Root Cause**:
    1. Geolocation in `MyAttendance.tsx` used `timeout: 5000` with `enableHighAccuracy: true` only, failing indoors and sending `location: null`.
    2. Backend `attendanceService.checkIn` and `checkOut` enforced geofencing without excluding `method: "manual"`.
    3. `employeeService.getEmployeeStats` queried direct `companyId` only, ignoring users mapped via `userCompanies` with `employeeNumber`.
    4. `attendanceService.getAttendance` only injected absent placeholders if `!status`, returning 0 when filtering by `ABSENT`.
- **Resolution**:
    1. Added indoor fallback (Wi-Fi/cell) and 12s timeout with user-friendly error toasts in `MyAttendance.tsx`.
    2. Bypassed geofence check in `attendanceService` when `method === "manual"`.
    3. Aligned `getEmployeeStats` with `getEmployees` using `baseEmployeeWhere` (`companyId` OR active `userCompanies` with `employeeNumber`).
    4. Supported `status === "ABSENT"` in `attendanceService.getAttendance` and fixed `pagination.total`.
    5. Cleaned up work hours display (hide `0.0 س` on active shifts) and removed delete action on temp absent rows.
- **Files Modified**: `apps/backend/services/hr/attendanceService.js`, `apps/backend/services/hr/employeeService.js`, `apps/frontend/src/pages/employee/MyAttendance.tsx`, `apps/frontend/src/pages/hr/Attendance.tsx`, `apps/frontend/src/pages/hr/HRDashboard.tsx`
- **Status**: ✅ Resolved.

### [FIX] Recruitment — Pipeline Applicant Deletion & Full Stage Loading
- **Date**: 2026-05-17
- **Description**: Hiring pipeline cards had no delete action for old/test applicants, and the selected pipeline stage rendered only a limited subset instead of every applicant in that status.
- **Root Cause**:
    1. Recruitment applicants had create, list, and status update endpoints, but no company-scoped delete endpoint exposed to the UI.
    2. `HiringPipelineSection.tsx` requested a hard-coded limited page of applicants for each stage.
    3. The main applicants screen also relied on the default backend page size, so larger applicant lists could be truncated.
- **Resolution**:
    1. Added `DELETE /api/v1/hr/recruitment/applicants/:id` with company-scoped `deleteMany` protection.
    2. Added delete actions in both the hiring pipeline cards and applicants list.
    3. Added `limit=all` support to the applicants API and updated recruitment screens to request all rows where the UI needs a complete list.
    4. Added backend and frontend regression tests for full pipeline loading and applicant deletion.
- **Files Modified**: `backend/controller/recruitmentController.js`, `backend/routes/hrRoutes.js`, `backend/tests/controller/recruitmentController.applicants.test.js`, `frontend/src/pages/hr/recruitment/sections/HiringPipelineSection.tsx`, `frontend/src/pages/hr/recruitment/sections/ApplicantsSection.tsx`, `frontend/src/pages/hr/recruitment/__tests__/HiringPipelineSection.test.tsx`, `frontend/src/pages/hr/recruitment/__tests__/ApplicantsSection.test.tsx`
- **Status**: ✅ Resolved.

### [FIX] Recruitment — Deleted Form Responses Stayed In Applicants & Pipeline
- **Date**: 2026-05-17
- **Description**: Test submissions deleted from the recruitment application form responses list still appeared as applicants and inside the hiring pipeline. Opening some applicants created from lightweight form submissions could also crash the frontend details view.
- **Root Cause**:
    1. `deleteResponse` removed only the `RecruitmentFormResponse`; the linked `Applicant` was preserved because the Prisma relation uses `onDelete: SetNull`.
    2. `deleteForm` cascaded form responses but did not remove applicants created from those responses first.
    3. `ApplicantsSection.tsx` assumed optional fields such as email, phone, job title, and `skills` were always populated and that `skills` was always an array.
- **Resolution**:
    1. Delete linked applicants in the same transaction before deleting a recruitment form response or the whole form.
    2. Normalize applicant payloads from the recruitment API before rendering, including safe fallbacks for missing contact fields, job title, education, experience, and skills.
    3. Added backend and frontend regression tests covering deletion propagation and applicant details rendering for form-created applicants with missing optional fields.
- **Files Modified**: `backend/controller/applicationFormController.js`, `backend/tests/controller/applicationFormController.delete.test.js`, `frontend/src/pages/hr/recruitment/sections/ApplicantsSection.tsx`, `frontend/src/pages/hr/recruitment/__tests__/ApplicantsSection.test.tsx`
- **Status**: ✅ Resolved.

### [FIX] Recruitment — Response Conversion & Pipeline Resilience
- **Date**: 2026-04-09
- **Description**: 
    1. Converting a recruitment form response to an applicant record could fail if certain metadata fields were malformed.
    2. Admin routes for recruitment stats were vulnerable to scope drift.
- **Root Cause**:
    1. `convertResponseToApplicant` lacked explicit validation for nested JSON answers before mapping to the `Applicant` model.
    2. Missing scope checks in some recruitment analytics endpoints.
- **Resolution**:
    1. Hardened `applicationFormController.js` with deep validation for response answers during the conversion lifecycle.
    2. Updated `hrRoutes.js` and `recruitmentController.js` to enforce company-scoped access for all pipeline analytics.
- **Files Modified**: `backend/controller/applicationFormController.js`, `backend/routes/hrRoutes.js`, `backend/controller/recruitmentController.js`
- **Status**: ✅ Resolved.


### [FIX] HR Attendance — Calendar Day Drift & Prisma Enum 500 Error
- **Date**: 2026-04-04
- **Description**: 
    1. Attendance records were stored with the wrong calendar day (e.g., April 3 instead of April 4) due to UTC timezone offsets stored in PostgreSQL DATE columns.
    2. Check-out operation failed with a 500 error when querying for 'DELETED' status.
- **Root Cause**:
    1. `checkIn()` used `getStartOfDayInTimezone()`, which provided a UTC time with an offset (e.g., 22:00Z). PostgreSQL's `@db.Date` truncated this to the previous day in UTC+ zones.
    2. The Prisma query used a non-existent enum value `DELETED` for `HrAttendanceStatus`.
- **Resolution**:
    1. Standardized on `normalizeDateForDb()` (YYYY-MM-DDT00:00:00Z) for all database storage/queries to ensure consistent date truncation.
    2. Removed the invalid `DELETED` status filter from `checkOut` logic.
    3. Added a migration script `fix-attendance-dates.js` to correct legacy records.
- **Files Modified**: `backend/services/hr/attendanceService.js`, `frontend/src/pages/hr/Attendance.tsx`, `backend/scripts/fix-attendance-dates.js`
- **Status**: ✅ Resolved.


### [FIX] Deleted Employees Still Appearing in Owner Users Management (/my-companies/users)
- **Date**: 2026-03-16
- **Description**: Employees deleted from `hr/employees` continued to appear in the `/my-companies/users` list after deletion. Refreshing the page did not remove them.
- **Root Cause**: `getOwnerUsers` in `ownerController.js` fetched ALL `UserCompany` rows for the owner's companies without filtering by `isActive`. The `deleteEmployee` flow performs a **soft-delete** — it sets `UserCompany.isActive = false` rather than deleting the row — so the user remained visible in the query.
- **Resolution**: Added `isActive: true` filter to the `prisma.userCompany.findMany` query inside `getOwnerUsers`. This ensures only employees with active company memberships are returned, correctly excluding those who were removed via the HR delete flow.
- **Files Modified**: `backend/controller/ownerController.js`
- **Status**: ✅ Resolved — backend restarted; change takes effect immediately.



### [FIX] HR Assets Add-Asset Modal Showing Blank Screen
- **Date**: 2026-03-15
- **Description**: Clicking “إضافة أصل جديد” rendered a dim overlay with no form, blocking the page.
- **Root Cause**:
    1. Modal always rendered via a portal with a lower z-index than the surrounding gradient background, hiding the form.
    2. Scroll-lock ran even when the portal failed to mount (embedded layouts/iframes), leaving only the backdrop.
- **Resolution**:
    1. Added a `usePortal` flag and conditional scroll-lock to `AssetForm`.
    2. In the إدارة الأصول tab, render the creation form inline (no portal) with its own container; keep edit modals portal-based.
    3. Raised stacking context and added ARIA/close - **HR Assets UI Resilience & Cloning (FEATURE/FIX)**:
    - `backend/routes/hr/assetRoutes.js`: Added `POST /:id/clone` to support asset duplication.
    - `backend/controller/hr/assetController.js`: Implemented `cloneAsset` with deep copy logic (Name, Code, Depreciation, Category, etc.). Asset listing now supports pagination (`page`/`limit`) with totals, and asset creation normalizes optional fields.
    - `frontend/src/pages/hr/assets/AssetList.tsx`: Added "Clone" action with `DocumentDuplicateIcon`. Refactored fetching logic to prevent duplicate key warnings using ID-based Map deduplication.
    - `backend/server.js`: Corrected route mounting order to ensure asset-specific endpoints are prioritized over catch-all HR routes.
s/hr/assets/AssetsOverviewDashboard.tsx`
- **Status**: ✅ Resolved (frontend build passed).


### [FIX] Public Recruitment Form — Unavailable Despite Being Active
- **Date**: 2026-03-14
- **Description**: Public users were seeing "الاستبيان غير موجود أو غير نشط" for active recruitment forms.
- **Root Cause**: `PublicApplicationForm.tsx` was using raw `axios` calls with a hardcoded `/api/v1/` prefix. In some environments, relative paths didn't resolve correctly without the configured `baseURL`, causing 404 errors that were interpreted as "form not found".
- **Resolution**:
    1. Replaced all direct `axios` calls with `apiClient.client.get/post` to leverage the centralized base URL and interceptors.
    2. Fixed import path for `apiClient` (`../../../services/apiClient` → `../../services/apiClient`).
    3. Improved error message display to show backend-specific messages (`err.response?.data?.message`).
- **Files Modified**: `frontend/src/pages/public/PublicApplicationForm.tsx`


### [FEATURE] Recruitment Form — Real File Upload for Applicants
- **Date**: 2026-03-14
- **Description**: The FILE question type in public application forms was only saving the file name as a string — the actual file was never uploaded to the server.
- **Resolution**:
    1. **Backend**: Added a new public endpoint `POST /api/v1/hr/recruitment/forms/public/upload-file` in `hrRoutes.js` using `multer` (diskStorage). Accepts PDF, Word, images, TXT up to 10MB. Stores files in `uploads/hr/applications/`. No auth required.
    2. **Backend**: Public endpoint is covered by the existing `POST /api/v1/hr/recruitment/forms/public/*` wildcard in `globalSecurity.js` PUBLIC_ROUTES.
    3. **Frontend**: `PublicApplicationForm.tsx` fully rewritten to upload files immediately on file selection (before form submission), display upload progress spinner, show success state with file name + size, allow file removal, and send the returned server URL in the submission payload as `answerFile`.
- **Files Modified**: `backend/routes/hrRoutes.js`, `frontend/src/pages/public/PublicApplicationForm.tsx`


### [FIX] Recruitment Form — Input Validation Gaps
- **Date**: 2026-03-14
- **Description**: Phone number field had no format validation (any string was accepted). Text/Textarea required answers with only spaces (e.g., "   ") passed validation.
- **Resolution**:
    1. Added regex validation (`/^[+]?[\d\s\-().]{7,20}$/`) for the optional phone field.
    2. Applied `.trim()` to all text answers before validation and submission.
    3. Added email format validation (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`).
    4. Submit button is now disabled while any file is still uploading to prevent incomplete submissions.
- **Files Modified**: `frontend/src/pages/public/PublicApplicationForm.tsx`



### [FEATURE] Advance Request Management (HR)
- **Date**: 2026-03-11
- **Description**: Implemented a complete management system for employee advances (سلفيات).
- **Resolution**:
    1. Created `advanceService.js` to handle request creation, validation (limits, existing advances), and approval/rejection logic.
    2. Created `advanceController.js` with endpoints for both employees (requests, my advances) and admins (all advances, approve/reject).
    3. Integrated with the HR sidebar and dashboard.
- **Files Added**: `backend/services/hr/advanceService.js`, `backend/controller/advanceController.js`
- **Files Modified**: `backend/routes/hrRoutes.js`


### [FIX] Employee Payroll Visibility & Data Discrepancy
- **Date**: 2026-03-01
- **Description**: Some employees were missing from the Payroll module, and payroll records were not appearing in individual accounts.
- **Root Cause**:
    1. Strict filtering on `employeeNumber` in `getEmployees` excluded users missing that field.
    2. Payroll generation/retrieval only checked the `userCompanies` relationship, omitting users directly linked via `User.companyId`.
- **Resolution**: Relaxed filters in `employeeService.js` and `payrollService.js` to use `OR` logic (checking both direct `companyId` and `userCompanies` table). Broadened `getMyPayrollHistory` to handle fallbacks correctly. Improved deduction/reward inclusion logic for `PENDING` states.
- **Files Modified**: `backend/services/hr/employeeService.js`, `backend/services/hr/payrollService.js`, `frontend/src/pages/hr/Payroll.tsx`, `backend/controller/hrController.js`, `backend/services/hr/rewardPayrollIntegrationService.js`


### [UI] Modal Responsiveness & Scrollbars (Payroll/Deductions)
- **Date**: 2026-03-01
- **Description**: Large forms/details in modals were overflowing off laptop screens.
- **Resolution**: Enforced `max-h-[75vh]` or `max-h-[80vh]` with `overflow-y-auto` across all HR management modals. Added custom scrollbar styling for a premium feel.
- **Files Modified**: `frontend/src/pages/hr/Payroll.tsx`, `frontend/src/pages/hr/Deductions.tsx`


### [FIX] Warning Message Display (Preview Modal)
- **Date**: 2026-02-24
- **Description**: Long warning messages were being cut off in the mobile/list view, making them difficult to read.
- **Root Cause**: Use of `line-clamp` and lack of a detail view for individual warnings in the list.
- **Resolution**: Implemented a "Quick Preview" (Eye icon) functionality using a Dialog/Modal in both `MyWarnings.tsx` and `hr/Warnings.tsx`. Added `whitespace-pre-wrap` to ensure multi-line messages are preserved.
- **Files Modified**: `frontend/src/pages/employee/MyWarnings.tsx`, `frontend/src/pages/hr/Warnings.tsx`

- **Date**: 2026-02-24
- **Description**: Production build was failing with multiple JSX syntax errors in `Shop.tsx` (`character "}" is not valid`, `unterminated regular expression`, etc.).
- **Root Cause**: Junk code fragments and unbalanced closing tags were left in the file during a previous session's manual edit/merge of the product grid.
- **Resolution**: Cleaned up `Shop.tsx` by removing stray code fragments in the `products.map` loop, balancing div tags, and correcting the return statement structure.
- **Files Modified**: `frontend/src/pages/storefront/Shop.tsx`

- **Date**: 2026-02-24
- **Description**: Return-related endpoints (`/categories`, `/reasons`, `/requests`) were throwing 500 Internal Server Errors or returning data in formats incompatible with the frontend.
- **Root Cause**:
    1.prisma queries were using legacy relation names (`reasons` instead of `returnReasons`, `category` instead of `returnReasonCategory`).
    2. Missing data mapping in the controller resulted in field names (like `returnReasons`) that didn't match what the frontend expected (`reasons`).
- **Resolution**:
    - Updated `returnController.js` to use correct Prisma relation names.
    - Added manual mapping in catch blocks to ensure JSON responses are backward-compatible with the frontend TypeScript interfaces.
    - Enhanced error logging with full stack traces in the backend console.
- **Files Modified**: `backend/controller/returnController.js`



### [FIX] HR Permission Compensation Logic Integration
- **Date**: 2026-02-24
- **Description**: Clarified the flow for compensatory leave and work-from-home (Remote) status.
- **Root Cause**: Confusion regarding how "isCompensated" flag interacts with payroll.
- **Resolution**: Verified that `permissionService.js` handles `COMPENSATORY` types and `payrollService.js` excludes these from deductions if marked as compensated.
- **Files Involved**: `backend/services/hr/permissionService.js`, `backend/services/hr/payrollService.js`, `frontend/src/pages/hr/Permissions.tsx`


### ?? ???? (11 ????? 2026 - ??? ????????) 
1. ??? ??????? ???????? ?????? ?????? ????? (Ghost Records) ??? ??? ???. 
2. ????? ???? ??? ???????? ???? ???????? ?? ???? ??????? ??????. 
3. ???? ??? ???????? ???????? ???? ????? (????? ??? Deletion). 
4. ????? ???????? ?????? ??? ??????? (LatenessDeduction) ????? ???????? ???????? (DEDUCTIBLE).
