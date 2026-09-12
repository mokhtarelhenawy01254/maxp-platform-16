# Fix: ReferenceError: sourceType is not defined in OrderSourceCard

## Problem
Visiting an order details page (such as `/orders/ORD-653982-495`) caused an unhandled runtime error:
`ReferenceError: sourceType is not defined`
which crashed the entire page via the React ErrorBoundary.

## Root Cause
In `apps/frontend/src/pages/orders/components/OrderSourceCard.tsx`, the `getSourceTypeInfo()` helper function assigned to and evaluated `sourceType` (e.g., `sourceType = "storefront"`) without declaring the variable (`let sourceType = order.sourceType || "";`). Under ES module strict mode, accessing or assigning to an undeclared identifier throws an immediate `ReferenceError`.

## Solution
1. Explicitly declared `let sourceType = order.sourceType || "";` at the top of `getSourceTypeInfo()`.
2. Added comprehensive unit tests in `apps/frontend/src/pages/orders/components/OrderSourceCard.test.tsx` verifying storefront, manual, ai_conversation, and unknown sources.
3. Hotfixed the bundle on production server and verified the live URL.
