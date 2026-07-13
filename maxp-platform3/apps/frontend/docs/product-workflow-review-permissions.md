# Product Workflow Review Permissions

## 2026-05-07 Update

- `إرسال للمراجعة` is an employee-side workflow action only.
- Admin/owner/manager roles keep approval, rejection, publishing, and unpublishing actions.
- Frontend role helpers live in `src/pages/products/utils/workflow.ts` so product form and product table use the same permission split.
- `AGENT` is the current employee role value; `EMPLOYEE` remains accepted as a compatibility alias.

## Affected Surfaces

- `ProductNewFinal.tsx` uses the shared role helpers before showing the submit-review button on the product form.
- `Products.tsx`, `ProductsTable.tsx`, and `ProductTableRow.tsx` pass separate flags for workflow management versus submit-review visibility.
- `useProducts.ts` allows employee-style roles to create draft products without granting them approval or publishing controls.

## Verification

- `npx vitest run src/pages/products/utils/__tests__/workflowPermissions.test.ts`
- `npm run build`
