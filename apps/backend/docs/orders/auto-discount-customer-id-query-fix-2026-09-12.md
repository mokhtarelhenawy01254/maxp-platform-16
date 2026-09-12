# Fix: Auto-discount voucher cron customerId Prisma query error

## Problem
The backend error log reported:
`Argument not must not be null.`
in `prisma.order.findMany()` under `autoDiscountService.js`.

## Root Cause
In `apps/backend/services/autoDiscountService.js` line 678, the query used:
`customerId: { not: null }`
However, the `customerId` column on `Order` is a non-nullable `String` (`customerId String`), causing Prisma schema validation to reject `null`.

## Solution
Changed the condition to `customerId: { not: '' }`, matching non-empty customer IDs.
