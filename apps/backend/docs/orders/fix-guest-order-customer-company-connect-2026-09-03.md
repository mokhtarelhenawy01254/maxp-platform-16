# Fix Guest Order Customer Creation Company Relation & Base UI Chunk Isolation

**Date:** 2026-09-03  
**Status:** Completed  
**Components:**
- `apps/backend/routes/publicOrdersRoutes.js`
- `apps/backend/utils/customerIdentity.js`
- `apps/frontend/vite.config.ts`

---

## 1. Problem Description
1. When a guest customer attempts to submit an order on storefronts (e.g. `https://ameerelle.maxp.online`), the backend crashed with a 500 error:
   `Argument 'company' is missing.`
   The customer saw a toast: `⚠️ حدث خطأ غير متوقع`.
2. In addition, single-word names resulted in `lastName: null`, which violates the non-null constraint on the `Customer` model.
3. On storefront pages, `@base-ui/react` was lumped into `vendor-mui`, forcing public storefront visitors to download 1.3 MB of unused Material UI & Emotion code.

---

## 2. Root Cause & Solution
1. **Prisma Relation Connect:** Prisma schema requires `company: { connect: { id: companyId } }` when creating a Customer. Passing scalar `companyId` caused Prisma to reject with `Argument company is missing`.
   - Updated `safeCreateCustomer` in `utils/customerIdentity.js` to automatically normalize `companyId` to `company: { connect: { id: companyId } }` and default `lastName` to `''`.
   - Updated `publicOrdersRoutes.js` at line 2195 and line 1633 to explicitly use `company: { connect: { id: company.id } }` and `lastName: lastName || ''`.
2. **Bundle Optimization:** In `vite.config.ts`, separated `@base-ui/react` into `vendor-base-ui` so storefront components do not pull the heavy admin `vendor-mui` chunk.
