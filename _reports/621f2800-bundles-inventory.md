# 621f2800 — حصر قراءات الباقات (AppBundle)

تم التوليد: 2026-11-01 · المصدر: `grep -rn "appBundle" apps/backend --include=*.js`

إجمالي المراجع: **47** في **18** ملف.

## قراءات وقت التشغيل (خطر 500) — 10 مرجع

### `controller/marketplaceController.js`
- `:760` — `return await getSharedPrismaClient().appBundle.findUnique({`
- `:1579` — `const allBundles = await getSharedPrismaClient().appBundle.findMany({`
- `:2137` — `const dbBundle = await getSharedPrismaClient().appBundle.findFirst({`

### `controller/marketplaceManagementController.js`
- `:861` — `const allBundles = await getSharedPrismaClient().appBundle.findMany({`
- `:934` — `return await getSharedPrismaClient().appBundle.create({`
- `:974` — `return await getSharedPrismaClient().appBundle.update({`
- `:1004` — `return await getSharedPrismaClient().appBundle.delete({`

### `controller/marketplaceMigrationController.js`
- `:12` — `prisma.appBundle.findMany(),`
- `:93` — `await prisma.appBundle.upsert({`

### `services/catalog/marketplaceCatalogDiffService.js`
- `:282` — `prisma.appBundle.findMany({`

## سكربتات وسيدر (تشغيل يدوي) — 14 مرجع

### `prisma/seeds/deleteBundlesExceptKept.js`
- `:7` — `const deleted = await prisma.appBundle.deleteMany({`

### `prisma/seeds/deleteMarketplace.js`
- `:7` — `await prisma.appBundle.deleteMany({});`

### `prisma/seeds/marketplaceCompleteSeed.js`
- `:1152` — `await prisma.appBundle.upsert({`

### `prisma/seeds/marketplaceSeed.js`
- `:1669` — `await prisma.appBundle.upsert({`

### `prisma/seeds/marketplaceSeed_simple.js`
- `:178` — `await prisma.appBundle.upsert({`

### `scripts/catalog/remove_store_pro_app.js`
- `:35` — `const bundles = await prisma.appBundle.findMany();`
- `:41` — `await prisma.appBundle.update({`

### `scripts/delete_ecommerce_pro_app.js`
- `:37` — `const bundles = await prisma.appBundle.findMany();`
- `:43` — `await prisma.appBundle.update({`

### `scripts/export_apps_to_seed.js`
- `:12` — `return await getSharedPrismaClient().appBundle.findMany();`
- `:59` — `await prisma.appBundle.upsert({`

### `scripts/sync_hr_marketplace_catalog.js`
- `:194` — `return await prisma.appBundle.upsert({`

### `scripts/sync_target_marketplace_catalog_entries.js`
- `:345` — `() => prisma.appBundle.findMany({`
- `:443` — `() => prisma.appBundle.create({ data: payload }),`

## تستات (مش بتأثر على برود) — 23 مرجع

### `tests/controller/marketplaceController.hybrid.test.js`
- `:30` — `appBundle: {`
- `:467` — `mockPrisma.appBundle.findMany.mockResolvedValue([`
- `:837` — `mockPrisma.appBundle.findUnique.mockResolvedValue(null);`
- `:978` — `mockPrisma.appBundle.findUnique.mockResolvedValue({`
- `:1016` — `expect(mockPrisma.appBundle.findUnique).not.toHaveBeenCalled();`

### `tests/controller/marketplaceManagementController.crud.test.js`
- `:38` — `appBundle: {`
- `:397` — `mockPrisma.appBundle.findMany.mockResolvedValue(savedBundles);`
- `:421` — `mockPrisma.appBundle.findMany.mockResolvedValue([`
- `:444` — `mockPrisma.appBundle.create.mockResolvedValue(savedBundle);`
- `:450` — `expect(mockPrisma.appBundle.create).toHaveBeenCalledWith({`
- `:465` — `mockPrisma.appBundle.create.mockResolvedValue({ id: "bundle-1", ...inputData });`
- `:471` — `expect(mockPrisma.appBundle.create).toHaveBeenCalledWith({`
- `:482` — `mockPrisma.appBundle.create.mockResolvedValue({ id: "bundle-1", name: "String Bundle" });`
- `:488` — `expect(mockPrisma.appBundle.create).toHaveBeenCalledWith({`
- `:494` — `mockPrisma.appBundle.update.mockResolvedValue({ id: "bundle-1", name: "Updated" });`
- `:503` — `expect(mockPrisma.appBundle.update).toHaveBeenCalledWith({`
- `:510` — `mockPrisma.appBundle.delete.mockResolvedValue({ id: "bundle-1" });`

### `tests/scripts/syncTargetMarketplaceCatalogEntries.test.js`
- `:67` — `appBundle: {`
- `:87` — `expect(prisma.appBundle.create).toHaveBeenCalledWith({`
- `:121` — `appBundle: {`
- `:173` — `appBundle: {`
- `:187` — `expect(prisma.appBundle.create).not.toHaveBeenCalled();`

### `tests/services/marketplaceCatalogDiffService.test.js`
- `:108` — `appBundle: {`

## الخلاصة

- **مصدر الحقيقة:** `prisma db push` / migrations. أي تنضيف لازم يمر من هناك — ممنوع DDL يدوي على برود.
- **نقاط الخطر:** قراءات `appBundle.findUnique/findFirst` في `marketplaceController.js` لازم تتعامل مع `null` بحالة مفهومة (`BUNDLE_NOT_FOUND`) مش 500.
- **مراجع ثابتة في الكود:** `routes/lpAdminRoutes.js` فيها 4 `bundleSlug` ثابتة (messaging-bundle · ai-inbox-bundle · medical-bundle · store-complete-bundle).
- **أداة الفحص:** `scripts/one-off/audit-bundles-dry-run.js` — قراءة فقط، بتطلع عدد قبل/بعد وبتحدد المفقود واليتيم.
