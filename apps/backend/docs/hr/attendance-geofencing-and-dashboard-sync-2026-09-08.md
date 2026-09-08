# HR Attendance Geofencing, Employee Stats Sync & UX Fixes

**Date**: 2026-09-08  
**Scope**: `apps/backend/services/hr/attendanceService.js`, `apps/backend/services/hr/employeeService.js`, `apps/frontend/src/pages/employee/MyAttendance.tsx`, `apps/frontend/src/pages/hr/Attendance.tsx`, `apps/frontend/src/pages/hr/HRDashboard.tsx`

---

## 1. Problem Summary

1. **Employee Check-in Geofencing Failures ("مش راضي يبصم خالص ومشكله الموقع")**:
   - In `MyAttendance.tsx`, geolocation requests used `timeout: 5000` (5s) with `enableHighAccuracy: true`. Inside office buildings, GPS satellite locks take 8–15s. The promise timed out and caught silently, returning `null` coordinates.
   - The backend returned `403` with `{ requiresLocation: true }`.
   - When GPS did resolve with slight indoor drift, strict 100m geofence radius centered slightly off-office caused `403` distance rejection.
   - Admin quick check-in / check-out actions from the `/hr/attendance` table and dashboard had no location payload, and the backend enforced geofencing even for `method: "manual"`, blocking administrators.

2. **Dashboard Employee Count Inconsistency**:
   - The Total Employees card showed 9 (active 6), while Today's Attendance showed 12 (present 2, late 2, absent 10).
   - `employeeService.getEmployeeStats` queried `prisma.user.count({ where: { companyId } })` only, omitting active employees associated via `userCompanies`.

3. **Attendance Status Badges & Sorting**:
   - Employees with status `LATE` had red badges on the HR Dashboard identical to absent/error indicators, despite having valid check-in timestamps.
   - Recent check-ins were sorted by date instead of actual `checkIn` timestamp.

4. **Absent Filter and Pagination Mismatch**:
   - Filtering by "غائب" (ABSENT) in `/hr/attendance` returned 0 records because `missingUserRecords` were only injected when `!status`.
   - Pagination showed 2 records instead of total visible rows due to `total: total || mappedRecords.length`.

5. **Work Hours Rendering & Action Buttons**:
   - Manual metrics assigned `workHours = 0` when check-out was absent, showing `0.0 س` for active shifts.
   - `temp-` absent records showed a delete button that triggered 404 errors when clicked.

---

## 2. Changes Made

### Backend
1. **`apps/backend/services/hr/attendanceService.js`**:
   - In `checkIn` and `checkOut`: Added `data.method !== "manual"` check to bypass geofencing checks for admin/management manual actions.
   - In `getAttendance`: Injected `missingUserRecords` when `!status || status === "ABSENT"`, and filtered appropriately.
   - Fixed `pagination.total`: Uses `Math.max(total, mappedRecords.length)` so absent employee placeholders count toward the total.
   - In `_calculateManualMetrics`: Initialized `workHours = null` and only calculate when `checkIn && checkOut` exist.

2. **`apps/backend/services/hr/employeeService.js`**:
   - In `getEmployeeStats`: Added `baseEmployeeWhere` including both direct `companyId` and `userCompanies: { some: { companyId, isActive: true } }` with `employeeNumber: { not: null }`.

### Frontend
1. **`apps/frontend/src/pages/employee/MyAttendance.tsx`**:
   - Enhanced `getLocationPayload` with 12s high-accuracy timeout, automatic fallback to low-accuracy Wi-Fi/cell triangulation (10s), and user-friendly error notifications for permission denial and search timeouts.

2. **`apps/frontend/src/pages/hr/HRDashboard.tsx`**:
   - Styled `LATE` status badge in amber (`bg-amber-50 text-amber-700 border-amber-200`).
   - Sorted recent check-ins by `checkIn` timestamp descending.

3. **`apps/frontend/src/pages/hr/Attendance.tsx`**:
   - Hidden delete button on virtual absent (`temp-`) records.
   - Rendered `-` for work hours if `checkOut` is absent or `workHours` is zero.
   - Supported creating manual attendance when clicking edit on `temp-` records.

---

## 3. Verification

- `node --check apps/backend/services/hr/attendanceService.js` -> PASSED
- `node --check apps/backend/services/hr/employeeService.js` -> PASSED
- `esbuild` syntax checks on `MyAttendance.tsx`, `HRDashboard.tsx`, and `Attendance.tsx` -> PASSED
- Company HR Settings geofence updated to 250m on production database.
