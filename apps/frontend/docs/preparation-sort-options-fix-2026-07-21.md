# Preparation Queue Sort Options Fix (2026-07-21)

## Problem

The sort dropdown on `/orders/preparation` was broken — changing the sort option had no effect on the order of displayed orders.

## Root Cause

A signature mismatch between `PreparationFilters` and `usePreparationQueueUiState`:

- `PreparationFilters` declared `onSortChange: (sortBy: SortBy, sortOrder: SortOrder) => void` and called it with **two separate arguments**.
- `uiActions.setSort` expects a **single object** `{ sortBy, sortOrder }`.

Passing `onSortChange={uiActions.setSort}` directly meant the reducer received the raw `sortBy` string as the entire `value`, so `action.value.sortBy` and `action.value.sortOrder` were both `undefined`. The sort state never actually changed.

## Fix

`PreparationQueue.tsx`: wrapped `setSort` in an arrow function to bridge the two signatures:

```tsx
// Before (broken)
onSortChange={uiActions.setSort}

// After (fixed)
onSortChange={(sortBy, sortOrder) => uiActions.setSort({ sortBy, sortOrder })}
```

## Affected File

- `apps/frontend/src/pages/orders/PreparationQueue.tsx`

## Sort Options Now Working

| Option value | Label |
|---|---|
| `createdAt_desc` | الأحدث أولاً |
| `createdAt_asc` | الأقدم أولاً |
| `totalUnits_desc` | عدد القطع - الأكثر أولاً |
| `totalUnits_asc` | عدد القطع - الأقل أولاً |
| `totalValue_desc` | القيمة - الأعلى أولاً |
| `totalValue_asc` | القيمة - الأقل أولاً |
