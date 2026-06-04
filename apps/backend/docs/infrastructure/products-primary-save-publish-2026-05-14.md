# Products Primary Save Publishing

## 2026-05-14

- The product editor primary save action now publishes non-merchant products instead of preserving draft workflow state.
- This covers both create and edit flows: a new product saved with the main save button is published, and an existing draft opened for editing becomes published after the main save button.
- `حفظ كمسودة` remains the draft path and merchant-scoped saves keep their existing workflow behavior.
- `backend/controller/productController.js` treats `isActive=true` from non-merchant create/update requests as an explicit publish intent so stale `metadata.workflow.status=DRAFT` cannot override the requested active state.
- Frontend regression coverage lives in `frontend/src/pages/products/utils/__tests__/workflowPermissions.test.ts`.
- Production was verified by saving an existing Swan draft from `https://maxp.online/products`; the row changed from `مسودة` to `منشور` and the published count increased.
