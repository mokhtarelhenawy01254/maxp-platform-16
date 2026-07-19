# Plan: Dev Team Performance Evaluation System

**Generated**: 2026-06-01
**Estimated Complexity**: High

## Overview

Build a comprehensive developer/team performance evaluation system in the Super Admin panel. The system calculates metrics automatically from existing data sources (`DevTask`, `DevTimeLog`, `DevGoal`) and presents them in a dedicated dashboard with per-member evaluation cards, trend charts, and configurable evaluation periods.

## Data Sources

| Source | Metrics |
|--------|---------|
| `DevTask` | Tasks completed, on-time rate, estimated vs actual hours, reopen rate, priority distribution, type distribution |
| `DevTimeLog` | Total hours worked, average session duration, active time vs logged time |
| `DevGoal` | Goal achievement rate, key result completion, OKR rating |
| `DevTaskActivity` | Status transitions (reopens), activity frequency |
| `DevTeamMember` | XP, level, daily/weekly targets |

## Evaluation Metrics

| Metric | Formula | Weight (default) |
|--------|---------|-----------------|
| **Task Completion Rate** | tasks DONE / total assigned tasks in period | 25% |
| **On-time Delivery** | tasks completed on/before dueDate / total completed | 20% |
| **Estimation Accuracy** | 1 - avg(abs(actual - estimated) / estimated) | 15% |
| **Time Efficiency** | total estimated hours / total actual hours | 15% |
| **Goal Achievement** | avg(goal progress %) across assigned goals | 15% |
| **Task Reopen Rate** | 1 - (reopened tasks / completed tasks) | 10% |

**Overall Score** = weighted sum (0-100 scale)

## Evaluation Periods

- Weekly
- Monthly
- Quarterly
- Custom range

---

## Sprint 1: Database Schema + Core Service

**Goal**: Add `DevEvaluation` model and the calculation service.

### Task 1.1: Add Prisma Schema
- **File**: `backend/prisma/schema/tasks.prisma`
- Add `DevEvaluation` model:

```prisma
model DevEvaluation {
  id              String   @id @default(cuid())
  memberId        String
  periodType      String   // WEEKLY, MONTHLY, QUARTERLY, CUSTOM
  periodStart     DateTime @db.Date
  periodEnd       DateTime @db.Date
  overallScore    Float    @default(0)
  taskCompletion  Float    @default(0)
  onTimeDelivery  Float    @default(0)
  estimationAccuracy Float @default(0)
  timeEfficiency  Float    @default(0)
  goalAchievement Float    @default(0)
  qualityScore    Float    @default(0)  // from reopen rate
  totalTasks      Int      @default(0)
  completedTasks  Int      @default(0)
  totalHours      Float    @default(0)
  estimatedHours  Float    @default(0)
  goalsAssigned   Int      @default(0)
  goalsAchieved   Int      @default(0)
  reopenedTasks   Int      @default(0)
  metadata        Json?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  member          DevTeamMember @relation(fields: [memberId], references: [id])

  @@unique([memberId, periodType, periodStart])
  @@index([memberId])
  @@index([periodType, periodStart])
  @@index([overallScore])
  @@map("dev_evaluations")
}
```

- Add `devEvaluation` relation to `DevTeamMember`
- Run `npx prisma generate`

### Task 1.2: Create Evaluation Service
- **File**: `backend/services/devEvaluationService.js` (new)
- Methods:
  - `calculateForMember(memberId, periodStart, periodEnd)` — computes all metrics
  - `getForMember(memberId, periodType)` — returns evaluations for a member
  - `getTeamEvaluations(periodType, periodStart, periodEnd)` — all members ranked
  - `recalculate(memberId, periodType, periodStart, periodEnd)` — overwrite existing
- Metric calculation logic:
  - Query `DevTask` where `assigneeId = memberId` AND status changed in period
  - Query `DevTimeLog` where `memberId` AND `startTime` in period
  - Query `DevGoal` where `ownerId = memberId` AND active in period
  - Query `DevTaskActivity` for reopen actions (status change FROM DONE)

### Task 1.3: Add API Routes
- **File**: `backend/routes/superAdminRoutes.js`
- Add routes:
  - `GET /dev/evaluations` — team overview (all members, current period)
  - `GET /dev/evaluations/member/:memberId` — member history
  - `GET /dev/evaluations/member/:memberId/period` — specific period
  - `POST /dev/evaluations/calculate` — trigger calculation for period
  - `GET /dev/evaluations/compare` — compare members side by side
- Handler in `backend/controller/superAdminController.js` (add methods)

### Task 1.4: Add Evaluation Settings to DevSystemSettings
- **File**: `backend/prisma/schema/tasks.prisma`
- Add to `DevSystemSettings`:
  ```prisma
  evaluationWeights    String?  // JSON: { taskCompletion: 25, onTimeDelivery: 20, ... }
  evaluationPeriod     String?  @default("MONTHLY")
  ```
- **File**: `backend/services/devSettingsService.js` — add getter/setter for evaluation settings

**Demo/Validation**:
- Run `npx prisma db push`
- Call `POST /super-admin/dev/evaluations/calculate` with a test member
- Verify evaluation record is created with correct metrics

---

## Sprint 2: Frontend — Evaluation Dashboard

**Goal**: Build the main evaluation page in Super Admin.

### Task 2.1: Create Page Component
- **File**: `frontend/src/pages/super-admin/DevEvaluation.tsx` (new)
- Layout:
  - Period selector (weekly/monthly/quarterly/custom date range)
  - Team overview table (sortable by any metric)
  - Overall score column with color coding (green > 80, yellow > 60, red < 60)
  - Link to member detail

### Task 2.2: Create Member Evaluation Card
- **File**: `frontend/src/pages/super-admin/DevEvaluationMember.tsx` (new)
- Shows:
  - Member info (name, avatar, level, XP)
  - Current period score breakdown (radar chart or bar chart)
  - Historical trend (line chart, last 6 months)
  - Task stats: completed, on-time, reopened
  - Time stats: total hours, estimated vs actual
  - Goal stats: assigned vs achieved

### Task 2.3: Create Evaluation Comparison View
- **File**: `frontend/src/pages/super-admin/DevEvaluationCompare.tsx` (new)
- Side-by-side comparison of 2-3 members
- Bar charts comparing each metric

### Task 2.4: Add Routes to App.tsx
- **File**: `frontend/src/App.tsx`
- Add lazy import and routes:
  - `/super-admin/dev-evaluations` → `DevEvaluation`
  - `/super-admin/dev-evaluations/member/:memberId` → `DevEvaluationMember`
  - `/super-admin/dev-evaluations/compare` → `DevEvaluationCompare`

### Task 2.5: Add Navigation Link
- **File**: Find the super admin sidebar/nav component
- Add "Performance" or "Evaluations" link with appropriate icon

### Task 2.6: Add i18n Keys
- **File**: `frontend/src/locales/en/sections/superAdmin.json`
- **File**: `frontend/src/locales/ar/sections/superAdmin.json`
- Add evaluation-related translation keys

**Demo/Validation**:
- Navigate to `/super-admin/dev-evaluations`
- See team table with scores
- Click member to see detail card
- Change period and verify data updates

---

## Sprint 3: Evaluation Settings + Auto-calculation

**Goal**: Let admins configure weights and enable automatic evaluation.

### Task 3.1: Evaluation Settings UI
- **File**: `frontend/src/pages/super-admin/DevTaskSettings.tsx` (extend existing)
- Add "Evaluation" tab/section:
  - Weight sliders for each metric (must sum to 100)
  - Default evaluation period selector
  - Auto-calculate toggle

### Task 3.2: Auto-calculation on Task Completion
- **File**: `backend/controller/superAdminController.js`
- When task status changes to DONE:
  - After awarding XP, also update the current period's evaluation
  - Use `upsert` to incrementally update metrics (don't recalculate from scratch)

### Task 3.3: Scheduled Evaluation (Cron)
- **File**: `backend/workers/evaluationWorker.js` (new)
- Weekly cron job to:
  - Auto-close any open evaluation periods
  - Generate evaluations for all active members
  - Send notifications for notable scores

### Task 3.4: Evaluation Export
- **File**: `backend/services/devEvaluationService.js`
- Add `exportToCSV(memberId, periodType, periodStart, periodEnd)`
- **File**: `frontend/src/pages/super-admin/DevEvaluation.tsx`
- Add "Export" button

**Demo/Validation**:
- Complete a task → verify evaluation updates in real-time
- Change weights in settings → verify scores recalculate
- Export CSV → verify data is correct

---

## Sprint 4: Polish + Notifications

**Goal**: Add notifications, badges, and polish the UX.

### Task 4.1: Evaluation Notifications
- When evaluation is calculated, notify members with their score
- Highlight improvements or declines vs previous period

### Task 4.2: Badges for Performance Levels
- Add evaluation-based badges to `DevMemberBadge`
- Levels: "Top Performer" (>90), "Strong" (>75), "Needs Improvement" (<50)

### Task 4.3: Integrate with Leaderboard
- **File**: `frontend/src/pages/super-admin/DevLeaderboard.tsx`
- Add evaluation score column alongside XP

### Task 4.4: Mobile Responsive
- Ensure evaluation pages work on mobile/tablet

**Demo/Validation**:
- Full flow: create tasks → assign → complete → evaluate → see scores → export

---

## Testing Strategy

- Backend: Unit tests for metric calculations in `backend/tests/devEvaluation.test.js`
- Frontend: Component tests for evaluation card rendering
- Integration: Test evaluation recalculation after task status changes

## Potential Risks & Gotchas

1. **Performance**: Evaluations query across multiple tables. Use proper indexes and consider caching.
2. **Data integrity**: `DevTask.completedDate` may be null for tasks completed before field was added. Handle gracefully.
3. **Period boundaries**: Tasks completed exactly at period boundary — use inclusive start, exclusive end.
4. **Weight migration**: When weights change, existing evaluations keep old scores. Only new calculations use new weights.
5. **Reopen detection**: Must track `DevTaskActivity` where `oldValue = 'DONE'` AND `newValue != 'DONE'` AND `action = 'STATUS_CHANGE'`.
6. **Missing data**: Members with no tasks/goals in a period should show "N/A" not 0.

## Rollback Plan

1. Remove `DevEvaluation` model from schema
2. Drop `dev_evaluations` table
3. Remove evaluation routes from `superAdminRoutes.js`
4. Remove evaluation service file
5. Remove frontend pages and routes
