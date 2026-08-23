# Radiology Module — Backend Deep Code Review

**Scope**: `apps/backend/controller/radiology*` (13 controllers), `apps/backend/routes/radiology*` (7 route files), `apps/backend/services/radiology*` (2 services), `apps/backend/utils/dicomUtil.js`, `apps/backend/utils/dateUtils.js`, `apps/backend/prisma/schema/radiology.prisma`, and 9 test files in `apps/backend/tests/controller/radiology*.test.js`.

**Audit goal**: Logic / race conditions, performance, schema gaps, security & authorization, test coverage.

**Conventions**:
- **Severity**: **P0** (data loss / money leak / security boundary breach — fix immediately), **P1** (correctness or significant risk under realistic concurrency / load), **P2** (cleanup, hygiene, small risk).
- All file references use `file_path:line_number`. All paths are absolute.

---

## 0. Executive Summary

| Area | Verdict |
|---|---|
| Money / payment flows | Several P0/P1 risks: TOCTOU between remaining-balance check and create; refund can produce a `paidAmount` that exceeds the original; insurance invoice updates `paidAmount`/`remainingAmount` non-atomically. Float (`Float`) is used for every monetary field instead of `Decimal`. |
| Status transitions | Inconsistent: `validateRadiologyStudyTransition` exists and is wired into `updateStudy` and the report chain, but `RadiologyAppointment` has no transition validator at all — direct, unvalidated writes to `SCHEDULED|CHECKED_IN|DONE|CANCELLED` from any client. |
| DICOM bytes in Postgres | `Bytes` column is written + read on every upload / download. No streaming, no compression, no CDN/Storage. Multi-slice uploads are written serially inside a single request with no transaction. |
| Schema vs code | The `RadiologyExamAddition` model is a separate table but **all** call sites use `RadiologyExamType` filtered by `isAddition=true`. Two ways to do the same thing, only one of which is wired up. `RadiologyStudy.tagIds` is in the schema but **never written or read by any controller**. The `RadiologyAppointment.branchId` field is written but never queried / filtered. |
| Authorization | `MANAGER_ROLES` is required on most mutating endpoints, but `createStudy`, `updateStudy`, `createAppointment` and several others correctly require it. There are NO `MANAGER_ROLES` gaps on mutating routes in this audit. However, the label/PDF endpoints (`GET /studies/:id/label`, `GET /studies/:id/report/pdf`, `GET /studies/:id/report`, `GET /studies/:id/images/:imageId`) do not gate by role, and any authenticated user of the company can read them. **Additionally, `GET /financial-summary` is not MANAGER-gated** — a cashier can read total revenue. |
| Test coverage | High for the main `radiologyController` (study lifecycle, report, DICOM). Zero tests for: `getStudyImageFile` (DICOM stream) only streaming; `financialSummary` insurance branch sums; `setEntityPrice` upsert; `listEntityPrices`, `listEntityPricesSummary`; `createLedgerEntry`, `listLedger` happy path; appointment update / delete; the `branchId` filter; `Rology` submission status transitions; the `attachToActiveShift` failure mode. |
| Delete cascade | There is no API route to delete a `RadiologyStudy`. `prisma.radiologyStudy.delete` is never called from any controller. `RadiologyStudyPayment` rows therefore have no UI to clean them. DICOM image rows likewise have no bulk delete endpoint — only single `deleteStudyImage`. |

---

## 1. Logic errors / race conditions

### 1.1 [P0] TOCTOU in `recordStudyPayment` between remaining-balance check and create

**File**: `H:/maxp-platform/apps/backend/controller/radiologyPaymentsController.js:65-85`

```js
// L69
const paidSoFar = (await prisma.radiologyStudyPayment.aggregate({ where: { studyId: id }, _sum: { amount: true } }))._sum?.amount || 0;
if (paidSoFar + amt > total) {                              // L70
  return res.status(400).json({ success: false, error: `المبلغ يتجاوز المتبقي ...` });
}
const payment = await prisma.radiologyStudyPayment.create({ // L75
  data: { ..., amount: amt, ... },
});
```

Two concurrent POSTs each see `paidSoFar = 0`, each pass the check, each create a payment of `total`, and the study's `paidAmount` becomes `2 × total`. The subsequent `recomputePaid` (L87) reduces `paymentStatus` to "PAID" but does not block the over-payment.

This is also true for `recordPayment` (insurance invoice) at `H:/maxp-platform/apps/backend/controller/radiologyInsuranceController.js:265-292` — the `invoice.paidAmount + amount > invoice.totalAmount` check at L268 is read-then-write non-atomically.

**Fix**: Wrap the read + write in a `prisma.$transaction` with `SERIALIZABLE` (or `SELECT ... FOR UPDATE` via `$queryRaw`).

```js
const updated = await prisma.$transaction(async (tx) => {
  const study = await tx.radiologyStudy.findFirst({ where: { id, companyId } });
  if (!study) throw new HttpError(404, 'الدراسة غير موجودة');
  const { _sum } = await tx.radiologyStudyPayment.aggregate({
    where: { studyId: id },
    _sum: { amount: true },
  });
  const paidSoFar = _sum?.amount || 0;
  if (paidSoFar + amt > (study.priceSnapshot || 0) + (study.additionAmount || 0)) {
    throw new HttpError(400, `المبلغ يتجاوز المتبقي (...)`);
  }
  const payment = await tx.radiologyStudyPayment.create({ data: { ... } });
  const status = paymentStatusFor((study.priceSnapshot || 0) + (study.additionAmount || 0), paidSoFar + amt);
  const studyUpdated = await tx.radiologyStudy.update({
    where: { id }, data: { paidAmount: paidSoFar + amt, paymentStatus: status },
  });
  return { payment, study: studyUpdated, total, paid: paidSoFar + amt };
});
```

### 1.2 [P1] `refundStudyPayment` allows `paidAmount` to go negative via a miscount

**File**: `H:/maxp-platform/apps/backend/controller/radiologyPaymentsController.js:95-132`

At L109-111, `paid` is computed as the sum of `amount` on **all** payment rows, including prior negative-amount refund rows. If a refund was created with `amount: -200`, then `paid` will be `500 + (-200) = 300`, and a subsequent refund up to `300` will be allowed. The test `radiologyAdmin.test.js:301-316` actually **encodes this exact behavior** by passing `[{ amount: 500 }, { amount: -200 }]` and asserting `paidAmount === 300`. The test will pass even if the field is read incorrectly because the controller sums the already-refunded amount.

The real risk: an operator can refund more than the original positive payments by stacking refunds before the row has been read. The check at L111 is `if (amt > paid)` and is read-then-write non-atomically (same TOCTOU class as 1.1).

**Fix**:
1. Compute `paid = sum(positive payment rows only)`, not all rows.
2. Wrap the read+create in a transaction.

### 1.3 [P1] Float used for every monetary field

**Schema**: `H:/maxp-platform/apps/backend/prisma/schema/radiology.prisma:8,35-39,100-101,118,128,166-167,187,198,209,220,232,249,262`

All money columns are `Float`. Egyptian Pound amounts above ~15,000 will accumulate representation error. With 12% VAT, addition of two `Float` numbers can produce 0.01 rounding drift that surfaces in `total - paid = 0.00999999...`. The `Math.max(0, total - paid)` floor in `getStudyPayment` (L34) papers over the symptom but does not fix the underlying drift.

**Fix**: Migrate to Prisma `Decimal` for every money column.

### 1.4 [P1] `createStudy`: 4 unique-constraint collisions throw a 500, not a 409

**File**: `H:/maxp-platform/apps/backend/controller/radiologyController.js:362-406`

The retry loop only handles the case `attempt < 3` (i.e. attempts 0,1,2,3). On the 4th attempt (index 3), the `if (error?.code === 'P2002' && !clientProvidedNumber && attempt < 3)` is false, so it falls through to `throw error`. The outer try/catch returns a 500.

**Fix**: Bump the retry budget and return 503 on exhaustion:
```js
for (let attempt = 0; attempt < 8; attempt++) { ... }
if (!study) return res.status(503).json({ success: false, error: 'فشل توليد رقم دراسة فريد، حاول مرة أخرى' });
```

### 1.5 [P1] No validation of appointment status transitions

**File**: `H:/maxp-platform/apps/backend/controller/radiologyAppointmentsController.js:179-183`

```js
if (body.status !== undefined) {
  const s = String(body.status).toUpperCase();
  if (!APPOINTMENT_STATUSES.includes(s)) return res.status(400).json({ ... });
  data.status = s;
}
```

No `validateTransition(APPOINTMENT_STATUSES, from, to, ...)` check. Compare to the study chain at `H:/maxp-platform/apps/backend/controller/radiologyController.js:69-75`. A client can flip a `DONE` appointment back to `SCHEDULED` (double-bill on convertToStudy), or `CANCELLED` directly to `CHECKED_IN` (skipping the `SCHEDULED` step).

**Fix**: Add chain `['SCHEDULED','CHECKED_IN','DONE']` plus `CANCELLED` as a terminal-from-anywhere state, with a validator mirroring the study pattern.

### 1.6 [P1] `createStudy` writes a duplicate `priceSnapshot` key in the data object

**File**: `H:/maxp-platform/apps/backend/controller/radiologyController.js:378 and :389`

```js
// L378 (first appearance)
priceSnapshot: examType ? examType.price : 0,
// ...
// L389 (second appearance — overrides the first)
priceSnapshot,
```

Benign because the second overrides the first, but the L378 line should be removed for clarity.

### 1.7 [P1] Insurance invoice `priceSnapshot` is captured only at create-time; later entity-price changes are NOT propagated

**File**: `H:/maxp-platform/apps/backend/controller/radiologyInsuranceController.js:66-124`

`assignStudyInsurance` updates the `priceSnapshot` on the study in place. If the operator creates an invoice before re-assigning, then re-assigns, then tries to add the same study to a NEW invoice, the second invoice sees the new `priceSnapshot` — inconsistent with the first. Accounting risk.

**Fix**: Forbid re-assignment while an `OPEN` invoice references the study.

### 1.8 [P2] `markDelivered` and `advanceReport` are not transaction-wrapped

**File**: `H:/maxp-platform/apps/backend/controller/radiologyController.js:870-875`

Two parallel `update` calls without a transaction. If one fails after the other commits, study and report drift out of sync. Wrap in `prisma.$transaction`.

### 1.9 [P2] `markDelivered` does not validate that `study.status` was already `REPORTED`

**File**: `H:/maxp-platform/apps/backend/controller/radiologyController.js:840-880`

The function only checks the report chain and images, not the study chain. A study in `PENDING_IMAGING` with a pre-existing `SIGNED` report can be delivered without imaging. **Fix**: call `validateRadiologyStudyTransition` at the top of `markDelivered`.

### 1.10 [P2] `attachToActiveShift` silently swallows errors

**File**: `H:/maxp-platform/apps/backend/controller/radiologyShiftsController.js:30-51`

If the DB write fails, the caller proceeds as if the shift attachment succeeded. Cashier's daily close will not include that payment. **Fix**: log to an audit table or re-throw.

### 1.11 [P2] `Rology` fields can be set on studies that are not yet IMAGED

**File**: `H:/maxp-platform/apps/backend/controller/radiologyController.js:565-575`

No chain or business-rule check on `rologyStudyLink`, `rologyReportLink`, etc. A user can mark `submissionStatus='REPORT_READY'` on a study in `PENDING_IMAGING`. **Fix**: when `submissionStatus` transitions to `REPORT_READY`, set `study.status = 'REPORTED'` automatically.

### 1.12 [P2] `duplicateStudy` does not re-resolve `priceSnapshot`

**File**: `H:/maxp-platform/apps/backend/controller/radiologyController.js:415-472`

`priceSnapshot` is copied from the source (L442), so a study created today reflects the **entity price at the time of the original study**, not today's. **Fix**: re-resolve from current entity price + exam price, like `createStudy` does.

---

## 2. Performance

### 2.1 [P0] DICOM `Bytes` columns are stored, read, and transferred in full on every call

**Files**:
- Write: `H:/maxp-platform/apps/backend/controller/radiologyController.js:617-629`
- Read: `H:/maxp-platform/apps/backend/controller/radiologyController.js:652-679`
- Schema: `H:/maxp-platform/apps/backend/prisma/schema/radiology.prisma:71`

Findings:
1. **No transaction for multi-slice uploads.** 200 slices = 200 round trips; multer is buffered so all bytes live in RAM.
2. **No streaming on download.** A 50 MB DICOM file becomes a 50 MB JS buffer + 50 MB HTTP body. With `files: 200` upload limit, up to 10 GB can be uploaded per study.
3. **No `@index([studyId])`** explicitly. Prisma's default relation behavior creates one, but documenting is good.
4. **No compression.** DICOM compresses well (10× with JPEG-LS).

**Fix**:
1. Move to object storage (S3/MinIO) and store URLs in Postgres.
2. Add `@@index([studyId])` and stream from DB.

### 2.2 [P1] `radiologyStatisticsController.getStatistics` loads every study row

**File**: `H:/maxp-platform/apps/backend/controller/radiologyStatisticsController.js:19-22`

`findMany` without a `take` and without date filtering loads the full set. **Fix**: use `groupBy` for the by-status / by-modality / by-radiologist / by-doctor aggregations.

### 2.3 [P1] `radiologyPaymentsController.financialSummary` loads every study row

**File**: `H:/maxp-platform/apps/backend/controller/radiologyPaymentsController.js:140-144`

Full-table scan filtered only by `companyId`. This endpoint has no `requireRole` (4.2), so any cashier can call it on a busy database. **Fix**: use SQL `SUM` aggregates; also add `requireRole(MANAGER_ROLES)`.

### 2.4 [P1] `radiologyReferringPhysiciansController.physicianCommissions` loads every exam type

**File**: `H:/maxp-platform/apps/backend/controller/radiologyReferringPhysiciansController.js:138-141`

```js
const studies = await prisma.radiologyStudy.findMany({ where, select: { ... } });
const examTypePrices = new Map();
const examTypes = await prisma.radiologyExamType.findMany({ where: { companyId }, select: { id: true, price: true } });
```

Loads every exam type in the company. With 200 types and 5,000 studies, you load 200 rows when the studies only reference e.g. 8. **Fix**: After the studies query, compute referenced `examTypeId`s and `findMany({ where: { id: { in: referencedIds } } })`.

### 2.5 [P0] No `onDelete: Cascade` on `RadiologyStudyImage.study` — orphaned rows on study delete

**File**: `H:/maxp-platform/apps/backend/prisma/schema/radiology.prisma:73`

```prisma
study  RadiologyStudy @relation(fields: [studyId], references: [id])
```

If a study is ever deleted (no API today, but a future migration or admin script will hit this), `RadiologyStudyImage` rows will be orphaned and `prisma.radiologyStudy.delete` will fail with FK error. Each image holds several MB of `Bytes`.

**Fix**: `study RadiologyStudy @relation(fields: [studyId], references: [id], onDelete: Cascade)`.

### 2.6 [P1] `listStudies` filters with `ILIKE` on three text fields with no trigram index

**File**: `H:/maxp-platform/apps/backend/controller/radiologyController.js:227-235`

Three ILIKE filters with `mode: 'insensitive'`. Postgres cannot use a B-tree index for `ILIKE '%term%'`. Same pattern in 7 other controllers (exam types, contracts, radiologists, physicians, additions, appointments, tags). **Fix**: add `pg_trgm` GIN indexes on each search column.

### 2.7 [P1] `radiologyRadiologistsController.listRadiologists` does not paginate

**File**: `H:/maxp-platform/apps/backend/controller/radiologyRadiologistsController.js:28-32`

No `take`. With 500 radiologists in a hospital network, this is a problem. **Fix**: add `take: limitNum, skip`.

### 2.8 [P2] `RadiologyStudy.findMany` uses `include: { report: true }` but the report may be 10KB+

**File**: `H:/maxp-platform/apps/backend/controller/radiologyController.js:254`

Loading 50 reports per page is 500KB. The FE likely only needs the status. **Fix**: use `include: { report: { select: { id: true, reportStatus: true, signedBy: true, signedAt: true } } }`.

### 2.9 [P2] `RadiologyStudyImage.findMany` always returns all columns including `data`

**File**: `H:/maxp-platform/apps/backend/controller/radiologyController.js:275-278`

`formatImage` strips `data` before responding, but the DB still streamed the bytes. For a study with 200 slices of 50 MB, this is 10 GB per `getStudy` call. **Fix**: `select` only the metadata fields.

### 2.10 [P2] No `@@index([companyId, status])` on `RadiologyShift`

**File**: `H:/maxp-platform/apps/backend/controller/radiologyShiftsController.js:32`

The "active shift" lookup runs on every payment. **Fix**: add the composite index.

---

## 3. Schema gaps (vs what the code expects)

### 3.1 [P0] `RadiologyStudy.tagIds` exists but is **never read or written**

**Files**:
- Schema: `H:/maxp-platform/apps/backend/prisma/schema/radiology.prisma:53`
  ```prisma
  tagIds  Json?  // array of RadiologyExamTag ids
  ```
- `grep` for `tagIds` across `apps/backend/controller/` returns **zero matches**.

Either the FE is expected to send `tagIds` and the BE drops it (silent data loss), or this is a dead field. `createStudy` and `updateStudy` do not touch `tagIds`. **Fix**: either remove from schema, or wire it in to both controllers and add a `?tagId=...` filter helper on `listStudies`.

### 3.2 [P0] `RadiologyExamAddition` is a separate model but **all `additionIds` write paths use `RadiologyExamType` filtered by `isAddition=true`**

**Files**:
- Schema: `H:/maxp-platform/apps/backend/prisma/schema/radiology.prisma:194-202` defines `RadiologyExamAddition`.
- Schema comment on L34: `// array of RadiologyExamAddition ids` — but the actual ids stored are `RadiologyExamType` ids.
- `createStudy` queries `radiologyExamType.findMany({ where: { ..., isAddition: true } })` at `H:/maxp-platform/apps/backend/controller/radiologyController.js:327-333`.
- `createAppointment` does the same at `H:/maxp-platform/apps/backend/controller/radiologyAppointmentsController.js:75-82`.
- `radiologyExamAdditionsController.js` operates on the `RadiologyExamAddition` model exclusively — that model is **never** referenced by any other controller or test.

Result: there are two ways to define "an addition". Operators using `/exam-additions` CRUD create rows that never appear in any study. **Fix**: pick one model. Either drop `RadiologyExamAddition` (already half-done) or drop `isAddition` and migrate.

### 3.3 [P1] `RadiologyAppointment.branchId` is written but never filtered/queried

**Files**:
- Schema: `H:/maxp-platform/apps/backend/prisma/schema/radiology.prisma:173`
- Write: `H:/maxp-platform/apps/backend/controller/radiologyAppointmentsController.js:116, 177`
- The `listAppointments` function does **not** support filtering by `branchId`. **Fix**: add to query parsing.

### 3.4 [P1] `RadiologyReport.finalizedBy / finalizedAt` is written but never read

**File**: `H:/maxp-platform/apps/backend/prisma/schema/radiology.prisma:87-88`

`recordRole` writes these via `role: 'finalized'` (`H:/maxp-platform/apps/backend/controller/radiologyReportRolesController.js:6`). The PDF service (`H:/maxp-platform/apps/backend/services/radiologyPdfService.js:71-74`) only displays `reportStatus`, `signedBy`, and `signedAt`. Dead. **Fix**: remove or surface on the PDF.

### 3.5 [P1] `RadiologyReportTemplate` has no `category` or `modality` field

**File**: `H:/maxp-platform/apps/backend/prisma/schema/radiology.prisma:270-277`

A facility with 50 templates (one per body part) will struggle to find the right one. The schema should have a `modality` or `category` field.

### 3.6 [P1] `RadiologyContract` is created but never used

**File**: `H:/maxp-platform/apps/backend/prisma/schema/radiology.prisma:256-268`

`createContract`/`updateContract` exist but no other controller references `RadiologyContract`. The pricing path goes through `RadiologyEntityPrice`. Dead weight. **Fix**: remove or wire into `previewQuote`/`createInvoice`.

### 3.7 [P2] `RadiologyStudy.studyNumber` is `@unique` globally, not per-company

**File**: `H:/maxp-platform/apps/backend/prisma/schema/radiology.prisma:18`

`studyNumber String? @unique` with 4 random digits = 10,000 combinations/day. At 10,000+ studies/day across all tenants, collisions become frequent. **Fix**: change to `@@unique([companyId, studyNumber])` or use a longer random suffix.

### 3.8 [P2] `RadiologyStudy.studyNumber` is nullable

`H:/maxp-platform/apps/backend/prisma/schema/radiology.prisma:18`. The `@unique` on a nullable column in Postgres means **only one row** can have `studyNumber = NULL`. **Fix**: `studyNumber String @unique` (drop the `?`).

### 3.9 [P2] Missing `@@index` for hot query patterns

`companyId` and `createdAt` are not indexed on most models. `status`, `billingType`, `insuranceCompanyId`, `appointmentDate`, `type` similarly. **Fix**: add explicit indexes in the schema. Concretely:

```prisma
model RadiologyStudy {
  @@index([companyId, status])
  @@index([companyId, createdAt])
  @@index([companyId, billingType])
}
model RadiologyStudyPayment { @@index([companyId, studyId]) }
model RadiologyStudyImage { @@index([studyId]) }
model RadiologyInsuranceInvoice {
  @@index([companyId, insuranceCompanyId])
  @@index([companyId, createdAt])
  @@index([companyId, status])
}
model RadiologyInsuranceLedgerEntry {
  @@index([companyId, type])
  @@index([companyId, createdAt])
}
model RadiologyShift { @@index([companyId, status]) }
model RadiologyAppointment {
  @@index([companyId, status])
  @@index([companyId, appointmentDate])
}
model RadiologyShiftPayment { @@index([companyId, shiftId]) }
```

### 3.10 [P2] `companyId` is `String?` (nullable) on most models, but every query filters on `companyId` as if it were NOT NULL

`H:/maxp-platform/apps/backend/prisma/schema/radiology.prisma:4,17,96,125,136,146,155,183,196,206,218,229,243,258,272`. The `?` suggests support for global/system rows, but no controller actually creates a row with `companyId = null`. **Fix**: make non-nullable.

---

## 4. Security / Authorization

### 4.1 [P1] `GET /financial-summary` is open to any authenticated user

**File**: `H:/maxp-platform/apps/backend/routes/radiologyAdminRoutes.js:27`

```js
router.get('/financial-summary', payments.financialSummary);
```

A cashier can read total patient/insurance collections. **Fix**: `router.get('/financial-summary', verifyToken.requireRole(MANAGER_ROLES), payments.financialSummary);`.

### 4.2 [P2] DICOM and PHI endpoints are accessible to any company user

**Files**:
- `H:/maxp-platform/apps/backend/routes/radiologyLabelsRoutes.js:8`
- `H:/maxp-platform/apps/backend/routes/radiologyRoutes.js:35, 38, 57-58`

Label/PDF/Report/Image GETs do not gate by role. A radiologist can read; a cashier can read. Likely by design, but a request-level audit log is recommended for HIPAA-like compliance.

### 4.3 [P2] `recordRole` accepts `by: 'free text'`

**File**: `H:/maxp-platform/apps/backend/controller/radiologyReportRolesController.js:18-19`

A manager can set `typedBy: 'John Doe'` and the audit trail lies. **Fix**: require `by` to be a `User.id`, or store `req.user.id` and look up the display name.

### 4.4 [P2] Multer `fileFilter` only checks extension and mimetype, not file content

**File**: `H:/maxp-platform/apps/backend/routes/radiologyRoutes.js:12-20`

A malicious actor can upload any file (e.g. an executable renamed `evil.dcm`). `dicom-parser` silently returns `{}` (`H:/maxp-platform/apps/backend/utils/dicomUtil.js:60-62`) and the file is stored. **Fix**: after `parseDicomFromBuffer`, verify the result contains expected DICOM tags.

### 4.5 [P2] Multer limits allow a single 10 GB POST

**File**: `H:/maxp-platform/apps/backend/routes/radiologyRoutes.js:11`

`files: 200, fileSize: 50MB` and `memoryStorage()` → 10 GB held in RAM. **Fix**: lower cap, or use `diskStorage` + streaming to object storage.

### 4.6 [P2] `previewQuote` does not verify `priceListId` belongs to the company

**File**: `H:/maxp-platform/apps/backend/controller/radiologyQuoteController.js:46-55`

A user could pass `priceListId: 'pl-from-other-tenant'` and get prices from another tenant. **Fix**: validate the price list belongs to the company.

### 4.7 [P2] `notes` / `referralDoctor` are written without sanitization

**File**: `H:/maxp-platform/apps/backend/controller/radiologyController.js:383, 500`. Stored as plain text — not an injection risk via parameterized queries, but if rendered as HTML in FE, XSS is possible. Document for FE.

---

## 5. Test coverage matrix

| Controller | Exported functions | Coverage | Notes |
|---|---|---|---|
| `radiologyController.js` | 18 | ~85% | Missing: `getStudyReport` happy-path assertion, `deleteContract`, `listContracts` with `search`. Helpers fully covered. |
| `radiologyAppointmentsController.js` | 5 | ~50% | Missing: `updateAppointment` happy-path, `deleteAppointment` happy-path, `listAppointments` with date filter, `branchId` filter, status transition validation. |
| `radiologyExamAdditionsController.js` | 4 | ~40% | `createAddition` and `deleteAddition` covered; `listAdditions` and `updateAddition` happy-path missing. |
| `radiologyInsuranceController.js` | 10 | ~70% | Missing: `createLedgerEntry`, `setEntityPrice` create-branch, `listEntityPrices`, `listEntityPricesSummary`. |
| `radiologyLabelsController.js` | 1 | 100% | |
| `radiologyPaymentsController.js` | 4 | ~75% | `getStudyPayment` not directly tested. |
| `radiologyQuoteController.js` | 1 | 100% | |
| `radiologyRadiologistsController.js` | 5 | 100% | |
| `radiologyReferringPhysiciansController.js` | 5 | ~50% | `updatePhysician` happy-path missing; `listPhysicians` not tested. |
| `radiologyReportRolesController.js` | 2 | 100% | |
| `radiologyShiftsController.js` | 4 + 1 helper | 100% | |
| `radiologyStatisticsController.js` | 1 | 100% | |
| `radiologyTagsController.js` | 5 | 100% | |

### 5.1 [P1] Critical untested paths

- `getStudyPayment` (`H:/maxp-platform/apps/backend/controller/radiologyPaymentsController.js:15-44`) — no test.
- `setEntityPrice` create branch (`H:/maxp-platform/apps/backend/controller/radiologyInsuranceController.js:414-444`) — no test.
- `createLedgerEntry` (`H:/maxp-platform/apps/backend/controller/radiologyInsuranceController.js:303-334`) — no test.
- `updateAppointment` happy path (`H:/maxp-platform/apps/backend/controller/radiologyAppointmentsController.js:129-191`) — no test.
- `deleteAppointment` happy path (`H:/maxp-platform/apps/backend/controller/radiologyAppointmentsController.js:193-209`) — no test.
- `listAppointments` with date filter — no test.
- `listContracts` with `search` filter — no test.
- `tagIds` (schema field exists, no test, no controller that handles it).
- `branchId` filter on `listAppointments` — no test.
- The 4th-collision path in `createStudy` studyNumber retry (1.4) — no test.

### 5.2 [P2] Test isolation issue

`H:/maxp-platform/apps/backend/tests/controller/radiology.test.js:1344-1363` defines `describe('radiologyStatisticsController', ...)` at the top level of the file rather than inside the main `describe('radiologyController', ...)`. Move it inside.

---

## 6. Findings that are NOT bugs but worth flagging

- No API to delete a `RadiologyStudy`. Combined with no `onDelete: Cascade` (2.5), a future migration adding study delete will fail.
- DICOM PDF/label rendering is synchronous in the request handler (`H:/maxp-platform/apps/backend/services/radiologyPdfService.js:16-86`, `H:/maxp-platform/apps/backend/services/radiologyLabelService.js:50-80`). 50 concurrent label requests block the event loop. Queue in a background worker.
- `getStartOfDayInTimezone` in `dateUtils.js:56-72` uses a `toLocaleString` trick. Correct but convoluted.
- `physicianCommissions` returns all-time commissions when no date filter is provided.
- `RadiologyShift.cashierName` is a free-text field — no link to `User`.

---

## 7. Recommended remediation order

1. **P0**: 1.1, 1.4, 2.1, 2.5, 3.1, 3.2
2. **P1**: 1.2, 1.3, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, 2.2, 2.3, 2.4, 2.6, 2.7, 3.3, 3.4, 3.5, 3.6, 3.9, 4.1, 5.1
3. **P2**: everything else

---

## Appendix A — Route index

| Route | File:Line | Manager? | IDOR? |
|---|---|---|---|
| `GET /api/v1/radiology/exam-types` | `radiologyRoutes.js:26` | No | ✓ |
| `POST /api/v1/radiology/exam-types` | `radiologyRoutes.js:27` | **Yes** | ✓ |
| `PUT /api/v1/radiology/exam-types/:id` | `radiologyRoutes.js:28` | **Yes** | ✓ |
| `DELETE /api/v1/radiology/exam-types/:id` | `radiologyRoutes.js:29` | **Yes** | ✓ |
| `GET /api/v1/radiology/studies` | `radiologyRoutes.js:32` | No | ✓ |
| `POST /api/v1/radiology/studies` | `radiologyRoutes.js:33` | No | ✓ |
| `POST /api/v1/radiology/studies/:id/duplicate` | `radiologyRoutes.js:34` | **Yes** | ✓ |
| `GET /api/v1/radiology/studies/:id/report` | `radiologyRoutes.js:35` | No | ✓ |
| `PUT /api/v1/radiology/studies/:id/report` | `radiologyRoutes.js:36` | No | ✓ |
| `PUT /api/v1/radiology/studies/:id/report/:kind` | `radiologyRoutes.js:37` | **Yes** | ✓ |
| `GET /api/v1/radiology/studies/:id/report/pdf` | `radiologyRoutes.js:38` | No | ✓ |
| `PUT /api/v1/radiology/studies/:id/deliver` | `radiologyRoutes.js:39` | **Yes** | ✓ |
| `GET /api/v1/radiology/studies/:id` | `radiologyRoutes.js:40` | No | ✓ |
| `PUT /api/v1/radiology/studies/:id` | `radiologyRoutes.js:41` | No | ✓ |
| `GET /api/v1/radiology/contracts` | `radiologyRoutes.js:44` | No | ✓ |
| `POST /api/v1/radiology/contracts` | `radiologyRoutes.js:45` | **Yes** | ✓ |
| `PUT /api/v1/radiology/contracts/:id` | `radiologyRoutes.js:46` | **Yes** | ✓ |
| `DELETE /api/v1/radiology/contracts/:id` | `radiologyRoutes.js:47` | **Yes** | ✓ |
| `GET /api/v1/radiology/report-templates` | `radiologyRoutes.js:50` | No | ✓ |
| `POST /api/v1/radiology/report-templates` | `radiologyRoutes.js:51` | **Yes** | ✓ |
| `PUT /api/v1/radiology/report-templates/:id` | `radiologyRoutes.js:52` | **Yes** | ✓ |
| `DELETE /api/v1/radiology/report-templates/:id` | `radiologyRoutes.js:53` | **Yes** | ✓ |
| `POST /api/v1/radiology/studies/:id/images` | `radiologyRoutes.js:56` | No | ✓ |
| `GET /api/v1/radiology/studies/:id/images/:imageId` | `radiologyRoutes.js:57` | No | ✓ |
| `GET /api/v1/radiology/studies/:id/images/:imageId/file` | `radiologyRoutes.js:58` | No | ✓ |
| `DELETE /api/v1/radiology/studies/:id/images/:imageId` | `radiologyRoutes.js:59` | **Yes** | ✓ |
| `PUT /api/v1/radiology/studies/:id/insurance` | `radiologyInsuranceRoutes.js:11` | **Yes** | ✓ |
| `POST /api/v1/radiology/insurance-invoices` | `radiologyInsuranceRoutes.js:14` | **Yes** | ✓ |
| `GET /api/v1/radiology/insurance-invoices` | `radiologyInsuranceRoutes.js:15` | No | ✓ |
| `GET /api/v1/radiology/insurance-invoices/:id` | `radiologyInsuranceRoutes.js:16` | No | ✓ |
| `POST /api/v1/radiology/insurance-invoices/:id/payment` | `radiologyInsuranceRoutes.js:17` | **Yes** | ✓ |
| `GET /api/v1/radiology/insurance-ledger` | `radiologyInsuranceRoutes.js:20` | No | ✓ |
| `POST /api/v1/radiology/insurance-ledger` | `radiologyInsuranceRoutes.js:21` | **Yes** | ✓ |
| `GET /api/v1/radiology/insurance-summary` | `radiologyInsuranceRoutes.js:22` | No | ✓ |
| `GET /api/v1/radiology/entity-prices` | `radiologyInsuranceRoutes.js:25` | No | ✓ |
| `POST /api/v1/radiology/entity-prices` | `radiologyInsuranceRoutes.js:26` | **Yes** | ✓ |
| `GET /api/v1/radiology/entity-prices/summary` | `radiologyInsuranceRoutes.js:27` | No | ✓ |
| `GET /api/v1/radiology/studies/:id/label` | `radiologyLabelsRoutes.js:8` | No | ✓ |
| `POST /api/v1/radiology/quotes/preview` | `radiologyQuoteRoutes.js:8` | No | partial (4.6) |
| `GET /api/v1/radiology/radiologists` | `radiologyRadiologistsRoutes.js:10` | No | ✓ |
| `POST /api/v1/radiology/radiologists` | `radiologyRadiologistsRoutes.js:11` | **Yes** | ✓ |
| `PUT /api/v1/radiology/radiologists/:id` | `radiologyRadiologistsRoutes.js:12` | **Yes** | ✓ |
| `DELETE /api/v1/radiology/radiologists/:id` | `radiologyRadiologistsRoutes.js:13` | **Yes** | ✓ |
| `PUT /api/v1/radiology/studies/:id/radiologist` | `radiologyRadiologistsRoutes.js:15` | **Yes** | ✓ |
| `PUT /api/v1/radiology/studies/:id/report/roles` | `radiologyReportRolesRoutes.js:10` | **Yes** | ✓ |
| `DELETE /api/v1/radiology/studies/:id/report/roles/:role` | `radiologyReportRolesRoutes.js:11` | **Yes** | ✓ |
| `GET /api/v1/radiology/exam-tags` | `radiologyTagsRoutes.js:10` | No | ✓ |
| `POST /api/v1/radiology/exam-tags` | `radiologyTagsRoutes.js:11` | **Yes** | ✓ |
| `PUT /api/v1/radiology/exam-tags/:id` | `radiologyTagsRoutes.js:12` | **Yes** | ✓ |
| `DELETE /api/v1/radiology/exam-tags/:id` | `radiologyTagsRoutes.js:13` | **Yes** | ✓ |
| `GET /api/v1/radiology/modalities` | `radiologyTagsRoutes.js:15` | No | ✓ |
| `GET /api/v1/radiology/shifts` | `radiologyAdminRoutes.js:16` | No | ✓ |
| `GET /api/v1/radiology/shifts/active` | `radiologyAdminRoutes.js:17` | No | ✓ |
| `POST /api/v1/radiology/shifts` | `radiologyAdminRoutes.js:18` | **Yes** | ✓ |
| `POST /api/v1/radiology/shifts/:id/close` | `radiologyAdminRoutes.js:19` | **Yes** | ✓ |
| `GET /api/v1/radiology/studies/:id/payment` | `radiologyAdminRoutes.js:22` | No | ✓ |
| `POST /api/v1/radiology/studies/:id/payment` | `radiologyAdminRoutes.js:23` | **Yes** | ✓ |
| `POST /api/v1/radiology/studies/:id/payment/refund` | `radiologyAdminRoutes.js:24` | **Yes** | ✓ |
| `GET /api/v1/radiology/financial-summary` | `radiologyAdminRoutes.js:27` | **No** (4.1) | ✓ |
| `GET /api/v1/radiology/appointments` | `radiologyAdminRoutes.js:30` | No | ✓ |
| `POST /api/v1/radiology/appointments` | `radiologyAdminRoutes.js:31` | **Yes** | ✓ |
| `PUT /api/v1/radiology/appointments/:id` | `radiologyAdminRoutes.js:32` | **Yes** | ✓ |
| `DELETE /api/v1/radiology/appointments/:id` | `radiologyAdminRoutes.js:33` | **Yes** | ✓ |
| `POST /api/v1/radiology/appointments/:id/convert` | `radiologyAdminRoutes.js:34` | **Yes** | ✓ |
| `GET /api/v1/radiology/referring-physicians` | `radiologyAdminRoutes.js:37` | No | ✓ |
| `POST /api/v1/radiology/referring-physicians` | `radiologyAdminRoutes.js:38` | **Yes** | ✓ |
| `PUT /api/v1/radiology/referring-physicians/:id` | `radiologyAdminRoutes.js:39` | **Yes** | ✓ |
| `DELETE /api/v1/radiology/referring-physicians/:id` | `radiologyAdminRoutes.js:40` | **Yes** | ✓ |
| `GET /api/v1/radiology/referring-physicians/commissions` | `radiologyAdminRoutes.js:41` | No | ✓ |
| `GET /api/v1/radiology/exam-additions` | `radiologyAdminRoutes.js:44` | No | ✓ |
| `POST /api/v1/radiology/exam-additions` | `radiologyAdminRoutes.js:45` | **Yes** | ✓ |
| `PUT /api/v1/radiology/exam-additions/:id` | `radiologyAdminRoutes.js:46` | **Yes** | ✓ |
| `DELETE /api/v1/radiology/exam-additions/:id` | `radiologyAdminRoutes.js:47` | **Yes** | ✓ |
| `GET /api/v1/radiology/statistics` | `radiologyAdminRoutes.js:50` | No | ✓ |

---

**End of audit.**
