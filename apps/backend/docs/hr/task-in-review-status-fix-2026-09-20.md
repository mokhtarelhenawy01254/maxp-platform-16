# Task IN_REVIEW Status & Review Submission Fix - 2026-09-20

## Context

When users clicked "تسليم للمراجعة" (Send for Review) in the Desktop app or Web interface, the task status update reverted back to its previous status (Pending/In Progress) and failed to update.
The root cause was that PostgreSQL's `"Task_status"` enum and the Prisma `TasksStatus` enum were missing the `IN_REVIEW` value. When the backend attempted to save `status = 'IN_REVIEW'`, PostgreSQL rejected the query with `invalid input value for enum "Task_status": "IN_REVIEW"` and Prisma rejected the update with `PrismaClientValidationError`. The desktop UI subsequently caught the error and rolled back the optimistic update.

## Changes

1. **Database Enum (`Task_status`)**:
   - Added `IN_REVIEW` value to PostgreSQL enum `"Task_status"` via `ALTER TYPE "Task_status" ADD VALUE IF NOT EXISTS 'IN_REVIEW';`.

2. **Prisma Schema (`TasksStatus`)**:
   - Updated `apps/backend/prisma/schema/enums.prisma` to include `IN_REVIEW` in `enum TasksStatus`.
   - Updated `apps/backend/prisma/verify_schema/enums.prisma` to include `IN_REVIEW` in `enum TasksStatus` and `enum TaskStatus`.
   - Updated `apps/backend/prisma/schema.prisma.legacy` to include `IN_REVIEW` in `enum TasksStatus`.
   - Regenerated Prisma Client (`npx prisma generate --schema=prisma/schema`).

3. **Backend Controllers**:
   - Updated `apps/backend/controller/taskExternalController.js` to include `'IN_REVIEW'` in `VALID_TASK_STATUSES`.
   - Updated `apps/backend/controller/taskController.js` `getDashboardStats` to aggregate `inReview` in `tasksByStatus` and `myTasksByStatus`.

4. **Frontend & Desktop App**:
   - Updated `apps/frontend/src/pages/tasks/types.ts` to include `"in_review"` in `TaskStatus` type union.
   - Updated `apps/desktop/src/renderer/pages/TasksTab.tsx` to eliminate race condition between timer stopping and status updating, automatically switching the view to the "قيد الاعتماد" (In Review) filter upon submitting for review.
   - Bumped `apps/desktop/package.json` to `1.0.17`.

## Validation

- Verified PostgreSQL `Task_status` contains `IN_REVIEW` and accepts updates.
- Verified Prisma Client update to `status: 'IN_REVIEW'` succeeds in Node runtime.
- Verified `taskController.updateTaskStatus` returns HTTP 200 with success message "تم تسليم المهمة بنجاح وهي الآن بانتظار مراجعة واعتماد الإدارة / المكلّف".
- Verified PM2 reload on production server (`srv974554.hstgr.cloud`) is online and healthy.
- Verified `npm run build` in `apps/desktop` succeeds with 0 errors.
