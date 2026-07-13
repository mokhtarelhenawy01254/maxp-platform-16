# Cancellation analytics customer schema fix

## Context

Production logs on 2026-05-07 showed `getCancellationAnalytics` failing with a
Prisma validation error:

`Unknown field name for select statement on model Customer`

The current `Customer` model stores names as `firstName` and `lastName`, while
the cancellation analytics query still selected a legacy `name` field.

## Change

`backend/controller/analyticsController.js` now selects only current `Customer`
fields for cancellation analytics customer snapshots and builds a display name
from `firstName` and `lastName`. Region data now comes from the order rows,
where `city` and `governorate` are actually stored. Customer quality analytics
uses the same display-name helper so it no longer returns an undefined
`customerName` when rows are based on the current schema.

## Verification

Run:

```bash
npx jest tests/controller/analyticsController.cancellations.test.js --runInBand --testTimeout=30000
```
