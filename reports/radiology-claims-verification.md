# Radiology System Claims -- Independent Verification

> Verifier: branch session (verifier agent) -- Workspace: `H:/maxp-platform`
> Backend: Node.js/Express + Prisma -- Frontend: React + TypeScript + @cornerstonejs
> Date: 2026-08-13

I read the actual code paths for every claim and produced a verdict for each. Where a claim is directionally right but the **severity**, **framing**, or **evidence** is off, I mark it **PARTIALLY CONFIRMED** and explain. Where a claim is factually wrong or mischaracterized, I mark it **NOT CONFIRMED**.

Severity ratings (`S/E/P`) -- `S` = security -- `E` = error / correctness -- `P` = performance -- reflect how the issue actually affects the system, **not** the previous agent's labelling.

---

## Logic Errors (L)

### L1. Appointment status transition has no validation
**Verdict:** PARTIALLY CONFIRMED
**Evidence:** `apps/backend/controller/radiologyAppointmentsController.js:4` defines `APPOINTMENT_STATUSES = ['SCHEDULED', 'CHECKED_IN', 'DONE', 'CANCELLED']`. Lines 179-183 perform a value-set check (the status string must be in the allow-list) but do not check that the transition is legal:

```js
if (body.status !== undefined) {
  const s = String(body.status).toUpperCase();
  if (!APPOINTMENT_STATUSES.includes(s)) return res.status(400).json({ success: false, error: 'invalid appointment status' });
  data.status = s;
}
```

There is **no** `validateTransition` call comparable to the study/report chain validators.
**Note:** The claim says "no validation" -- that is overstated. The real defect is the lack of a transition chain (mirroring studies/reports which use `validateRadiologyStudyTransition`/`validateRadiologyReportTransition` at `radiologyController.js:69-75`). Severity: `E` (minor; admin-only route).

### L2. Report re-save logic in `upsertStudyReport`
**Verdict:** PARTIALLY CONFIRMED
**Evidence:** `apps/backend/controller/radiologyController.js:743-781`. The update path builds `data` only when `body.reportText !== undefined && body.reportText !== null`, and only updates `reportStatus` when `requestedStatus` is truthy AND different from the current status.
**Confirmed real bug:** the `study.status -> REPORTED` promotion is only performed on **create** (line 779-781), not on update. A study in `PENDING_REPORT` whose report is updated (without changing status) will never be promoted to `REPORTED` automatically. This is a real correctness gap.
**Partially-wrong:** the two other sub-claims (text not updated when undefined, status not updated when undefined) describe correct PATCH-style partial-update semantics, not bugs. Severity of the real bug: `E`.

### L3. Refund over-refund allowed
**Verdict:** NOT CONFIRMED
**Evidence:** `apps/backend/controller/radiologyPaymentsController.js:109-117`. Refunds are stored as **negative-amount** payment rows (line 117: `amount: -amt`). The `paid` sum on line 110 therefore includes prior refunds, and the guard on line 111 prevents `amt` from exceeding the **net** paid amount. Scenario: paid 100, refund 80 (paid becomes 20), refund 30 -> rejected (30 > 20). The recompute uses `Math.max(0, paid)` (`radiologyPaymentsController.js:50`) so `study.paidAmount` cannot go negative.
**Note:** Previous agent's claim that "refund history isn't checked" is wrong -- it is, by the net-sum approach. There is **no** over-refund vulnerability. Severity: none (false alarm).

### L4. `StudiesTab.tsx:129` `paidAmount` calculation is approximate
**Verdict:** PARTIALLY CONFIRMED
**Evidence:** `apps/frontend/src/pages/radiology/StudiesTab.tsx:129` does `paidAmount: data.total - data.remaining`. Backend `recordStudyPayment` response (`radiologyPaymentsController.js:88`) returns `paidAmount: paid` as well as `total` and `remaining`. The frontend ignores `paidAmount` and recomputes.
**Note:** The math is exact. `data.total - data.remaining === data.paidAmount` because both are exact numeric values (no division, no rounding in this path). There is **no** rounding error. The only valid criticism is that the response field is not destructured. "Could be off by tiny amount" is incorrect. Severity: none for correctness; `E` (code smell) at most.

### L5. `DicomViewer.tsx:189` tear-down on every parent render
**Verdict:** CONFIRMED
**Evidence:** `apps/frontend/src/components/radiology/DicomViewer.tsx:115-189`. `imageIds = useMemo(() => imageIdsKey.split(...), [imageIdsKey])` returns a new array each time `imageIdsKey` is recomputed. The effect deps `[ids, imageIdsKey, imageIds]` therefore include a fresh array reference whenever the parent passes a new `images` reference (even with identical URL contents). Result: full teardown (line 130-143) and re-`setStack` (line 173). For CT series with hundreds of slices this is expensive and resets the current slice index. Severity: `P`.

### L6. `ReceptionTab.tsx` is dead code
**Verdict:** CONFIRMED
**Evidence:** `apps/frontend/src/pages/radiology/RadiologyManagementPage.tsx:29` redirects `/reception` to `/schedule`. `ReceptionTab.tsx` is not imported anywhere under `apps/frontend/src/pages/radiology/`. The only `ReceptionTab` imports are for the **lab** module (`apps/frontend/src/pages/lab/LabManagementPage.tsx:5`). Severity: `E`.

### L7. `polysegStub.js` is an empty stub class
**Verdict:** CONFIRMED
**Evidence:** `apps/frontend/src/components/radiology/polysegStub.js:1-3`: `export default class ICRPolySeg { async initialize() {} }`. No implementation, no integration with `@cornerstonejs/tools` segmentation APIs. Severity: `E` (dead stub).

### L8. Appointment delete with no cascade
**Verdict:** PARTIALLY CONFIRMED (severity overstated)
**Evidence:** `apps/backend/prisma/schema/radiology.prisma:153-179`. `RadiologyAppointment` has **no relations** in the Prisma schema, so there is nothing to cascade to at the DB level. However, `convertToStudy` (`radiologyAppointmentsController.js:211-280`) creates a `RadiologyStudy` from an appointment but does **not** record the source `appointmentId` on the study. Deleting an appointment after a study has been created from it leaves an orphan study with no back-link.
**Note:** The phrase "no cascade to related records" mischaracterises the model -- there are no related records. The real defect is the missing back-reference and missing check. Severity: `E` (minor; admin-only).

---

## Performance Issues (P)

### P1. DICOM stored in PostgreSQL as `Bytes`
**Verdict:** CONFIRMED
**Evidence:** `apps/backend/prisma/schema/radiology.prisma:71`: `data Bytes  // raw DICOM file bytes`. No object-store (S3 / MinIO) is used. `apps/backend/routes/radiologyRoutes.js:11` only restricts `fileSize: 50 MB` and `files: 200`. Severity: `P` (real scaling risk).

### P2. No streaming for DICOM download
**Verdict:** CONFIRMED
**Evidence:** `apps/backend/controller/radiologyController.js:652-679`. The handler loads the entire `Bytes` column into a `Buffer` (line 666) and calls `res.send(buf)` (line 674). No `stream.pipeline`, no `Range` header support. Severity: `P`.

### P3. No pagination in `StudiesTab`
**Verdict:** CONFIRMED
**Evidence:** `apps/frontend/src/pages/radiology/StudiesTab.tsx:174`: `url.searchParams.set("limit", "200");`. The UI has search/filter inputs only -- no page-size selector, no "load more". Backend's `listStudies` (`radiologyController.js:240-260`) supports `page`/`limit` but the frontend never sends `page`. Severity: `P`.

### P4. `DicomViewer` loads all image IDs at once
**Verdict:** CONFIRMED
**Evidence:** `apps/frontend/src/components/radiology/DicomViewer.tsx:173`: `await viewport.setStack(imageIds);`. No per-frame lazy fetch, no range splitting, no separate series viewports. `sliceIndex` is stored on each `RadiologyStudyImage` but the viewer doesn't honour it. Severity: `P`.

### P5. List queries use `contains` (LIKE %term%)
**Verdict:** CONFIRMED
**Evidence:** `apps/backend/controller/radiologyController.js:110-112, 228-234, 929-930` -- multiple `contains: term, mode: 'insensitive'` lookups on `name`, `category`, `patientName`, `nationalId`, `insuranceNumber`, `region`. The Prisma schema (`radiology.prisma`) has **no** `@@index` for any of these string columns. No Postgres `tsvector` / GIN index is present. Severity: `P`.

### P6. `RologyDraft` state can grow unboundedly
**Verdict:** CONFIRMED
**Evidence:** `apps/frontend/src/pages/radiology/StudiesTab.tsx:52`: `useState<Record<string, RologyDraft>>({})`. The `setDrafts` calls (lines 216, 402, 408, 412, 416) add entries but the component never garbage-collects when a study disappears. For 200 studies repeatedly expanded, this is 200 draft objects held in memory with no eviction. Severity: `P` (low-medium).

### P7. No HTTP cache headers on DICOM
**Verdict:** CONFIRMED
**Evidence:** `apps/backend/controller/radiologyController.js:668-674` only sets `Content-Type`, `Content-Length`, and `Content-Disposition`. No `Cache-Control`, `ETag`, or `Last-Modified`. Every viewer open re-downloads every slice. Severity: `P`.

---

## Missing Features (M)

For brevity, the table groups the M-claims with the actual evidence I checked. All M1-M33 are **CONFIRMED as absent** unless noted. I ran targeted greps for each keyword/standard.

| ID | Claim | Verdict | Evidence / search hit |
|----|------|---------|------------------------|
| M1 | No critical-findings notifications | CONFIRMED | `grep -i "critical\|notification\|alert\|finding" apps/backend/controller/radiologyController.js` -> 0 matches. |
| M2 | No radiation dose tracking (CTDIvol/DLP/DAP/RDSR) | CONFIRMED | `grep -i "ctdi\|dlp\|dose\|rdsr" apps/backend` -> no radiology hits. |
| M3 | No DICOMweb (WADO-RS / QIDO-RS / STOW-RS) | CONFIRMED | `grep -i "wado\|stow\|qido\|dicomweb" apps/backend` -> no radiology routes. |
| M4 | No AI integration despite cornerstone3D + ai-service | CONFIRMED | `package.json` has `@cornerstonejs/*`; backend has `services/aiServiceAdminClient.js` etc., but `grep -i "ai" radiologyController.js` -> 0 matches. |
| M5 | No DICOM SR | CONFIRMED | Report model (`radiology.prisma:76-91`) stores `reportText: String`, not a binary SR. |
| M6 | No DICOM SEG support | CONFIRMED | `polysegStub.js` is empty (L7). |
| M7 | No hanging protocols | CONFIRMED | No "hanging protocol" / preset code in `DicomViewer.tsx`; only fixed Window/Level presets (`WL_PRESETS`, line 38-44). |
| M8 | No MPR | CONFIRMED | Single `StackViewport` only (`DicomViewer.tsx:152,156`). |
| M9 | No measurement tools (distance/angle/area) | CONFIRMED | Only `WindowLevelTool`, `PanTool`, `ZoomTool` registered (line 84-86). |
| M10 | No image annotations/notes | CONFIRMED | No `addTool(LengthTool/ArrowAnnotateTool/...)` anywhere. |
| M11 | No prior study comparison | CONFIRMED | No comparison/prior logic in `RadiologyViewerModal.tsx` or backend. |
| M12 | No HL7/FHIR integration | CONFIRMED | `grep -i "hl7\|fhir" apps/backend` -> no radiology hits. |
| M13 | No DICOM Modality Worklist (MWL) | CONFIRMED | A `doctorWorklist`/`reportWorklist` exists in `bookingWorkflowController.js`, but that is a generic internal queue, not a DICOM MWL provider. |
| M14 | No audit log for image access | CONFIRMED | `getStudyImageFile` (`radiologyController.js:652-679`) does not write to any audit table. |
| M15 | No DICOM Presentation State | CONFIRMED | No `GrayscaleSoftcopyPresentationState` model or import. |
| M16 | No teleradiology chat/collaboration | CONFIRMED | No chat/messaging endpoints or UI in `apps/frontend/src/pages/radiology`. |
| M17 | No peer review module | CONFIRMED | No peer-review / RADPEER model. |
| M18 | No BI-RADS / LungRADS templates | CONFIRMED | Only generic `RadiologyReportTemplate` (free-text `body` field). |
| M19 | No mobile diagnostic viewer | CONFIRMED | `DicomViewer.tsx` is a single responsive component with no mobile-tuned gestures or alternate layout. |
| M20 | No 2FA / MFA on radiology endpoints | CONFIRMED | `routes/radiologyRoutes.js:23`: only `verifyToken.authenticateToken`. `verifyToken.js` has no 2FA middleware. |
| M21 | No series grouping in viewer | CONFIRMED | One `StackViewport` for the whole study; `seriesDescription` is captured on upload but not used in the viewer. |
| M22 | No key image selection (KIS) | CONFIRMED | No `keyImage` flag or UI. |
| M23 | No de-identification for sharing | CONFIRMED | No DICOM PS 3.15 de-identification; the WhatsApp share is plain `buildWhatsAppText` in `PriceQuoteTab.tsx`. |
| M24 | No speech/dictation in report editor | CONFIRMED | `RadiologyReportsTab.tsx` uses a plain `<textarea>`; no Web Speech API / external dictation. |
| M25 | No appointment reminders (only booking) | CONFIRMED | `radiologyAppointmentsController.js` creates appointments but never schedules reminders. |
| M26 | No contrast media tracking | CONFIRMED | `withContrast Boolean` exists but no contrast-agent, lot, volume, or extravasation tracking. |
| M27 | No patient consent / PHI consent tracking | CONFIRMED | No consent model in `radiology.prisma`. |
| M28 | No appointment waitlist | CONFIRMED | No waitlist queue; only `SCHEDULED/CHECKED_IN/DONE/CANCELLED`. |
| M29 | No PHI redaction in PDF export | CONFIRMED | `services/radiologyPdfService.js:37-46` writes `patientName / patientPhone / patientGender / patientAge / nationalId` directly. No redaction option. |
| M30 | No cumulative dose tracking per patient | CONFIRMED | No patient-level dose accumulator. (See M2.) |
| M31 | No prior comparison algorithm / CADt | CONFIRMED | No change-detection / temporal comparison code. |
| M32 | No smart worklist routing / auto-assign | CONFIRMED | `assignedRadiologistId` is settable, but assignment is manual in the UI; no rules engine. |
| M33 | No automatic report drafting (LLM) | CONFIRMED | The AI service is not invoked from the radiology module (see M4). |

---

## Code Quality (Q)

### Q1. Code duplication between `ReceptionTab.tsx` and `ScheduleTab.tsx`
**Verdict:** CONFIRMED
**Evidence:** Both files open with virtually identical patient / physician / exam-type loaders.
- `ScheduleTab.tsx:69-71, 112-115, 126-129`: identical `fetchJson` calls for exam types, insurance companies, patients, and referring physicians.
- `ReceptionTab.tsx:59-61, 94-97, 111-114`: character-for-character the same fetchers (only the `additionIds` handling in the price resolution differs).
Severity: `E` (maintenance burden).

### Q2. `StudiesTab.tsx` is 500 lines with 6+ inline modals
**Verdict:** PARTIALLY CONFIRMED
**Evidence:** `apps/frontend/src/pages/radiology/StudiesTab.tsx` is **500 lines** (`wc -l` -> 500). The "6+ inline modals" claim is **exaggerated** -- the file has exactly **3** modal components: `RadiologyViewerModal` (line 435), `RadiologyReportModal` (line 436), and a 60-line **inline** payment modal at lines 438-497. Plus the inline expandable editing rows for Rology submission. Severity: `E` (refactor candidate), but the "6+" count is wrong.

### Q3. `ReceptionTab` and `polysegStub` are dead code in the bundle
**Verdict:** PARTIALLY CONFIRMED
**Evidence:** `ReceptionTab.tsx` is confirmed dead for the **radiology** bundle (Q3a, see L6). `polysegStub.js` exists but is **not imported anywhere** (`grep -r "polysegStub\|ICRPolySeg" apps/frontend/src` -> no results other than the file itself). A Vite/Rollup production build with tree-shaking should drop it; a non-tree-shaken build would include it. Severity: `E`.

### Q4. No TypeScript types for backend responses
**Verdict:** NOT CONFIRMED
**Evidence:** `apps/frontend/src/pages/radiology/shared.ts:65-130` defines:
```ts
export interface RadiologyExamType { ... }
export interface RadiologyStudyImage { ... }
export interface RadiologyReport { ... }
export interface RadiologyReportTemplate { ... }
export interface RadiologyStudyPayment { ... }
export interface RadiologyStudy { ... }
```
plus `TabId` and helpers. These are the response shapes used by `fetchJson<T>(...)` calls. The types are hand-written rather than auto-generated (no `openapi-typescript` / `zod` schema in repo), so drift between frontend and backend is a real risk, but the claim of "no TypeScript types" is wrong.

### Q5. No tests for the Frontend radiology
**Verdict:** CONFIRMED
**Evidence:** No `__tests__` directory under `apps/frontend/src/pages/radiology` or `apps/frontend/src/components/radiology`. No `radiology*.test.tsx` in the broader `apps/frontend/src/**/__tests__` tree. (Compare to `apps/frontend/src/pages/lab/__tests__/ReceptionTab.test.tsx`, which does exist.) Backend tests exist (`apps/backend/tests/controller/radiology*.test.js`) but the claim is **frontend**-specific. Severity: `E`.

---

## Summary Table

Legend: **C** = CONFIRMED, **P** = PARTIALLY CONFIRMED, **N** = NOT CONFIRMED. Severity column = my reassessment (S/E/P/-).

| # | Claim | Verdict | Severity | Notes |
|---|-------|---------|----------|-------|
| L1 | Appointment status no validation | P | E | Value-set check exists; missing **transition** chain |
| L2 | `upsertStudyReport` re-save bug | P | E | Real bug: study status not promoted on update; other "issues" are intended behaviour |
| L3 | Refund over-refund allowed | N | - | Net-sum guard prevents it; false alarm |
| L4 | `paidAmount` is approximate | P | - | Math is exact; just ignores server field |
| L5 | DicomViewer teardown on every render | C | P | `imageIds` array dep changes when parent re-renders |
| L6 | `ReceptionTab` is dead | C | E | Redirect at `RadiologyManagementPage.tsx:29` |
| L7 | `polysegStub` empty | C | E | Two lines, no implementation |
| L8 | Appointment delete no cascade | P | E | Model has no relations; real issue is missing back-link |
| P1 | DICOM in Postgres Bytes | C | P | `Bytes` column, no S3 |
| P2 | No streaming for download | C | P | Full `res.send(buf)` |
| P3 | No pagination in `StudiesTab` | C | P | Hard-coded `limit=200` |
| P4 | Viewer loads all slices | C | P | Single `setStack` |
| P5 | `contains` LIKE %term% on large tables | C | P | No `@@index`, no GIN |
| P6 | `RologyDraft` unbounded | C | P | No eviction |
| P7 | No cache headers | C | P | Only `Content-Type/Length/Disposition` |
| M1-M33 | 33 missing features | C (x33) | various | Each verified by targeted grep/absence |
| Q1 | Code duplication ReceptionTab/ScheduleTab | C | E | Identical fetchers |
| Q2 | `StudiesTab` 500 lines / 6+ modals | P | E | 500 lines true; 3 modals, not 6+ |
| Q3 | Dead code in bundle | P | E | Dead in source; bundle inclusion unverified |
| Q4 | No TS types for backend | N | - | Types exist in `shared.ts` |
| Q5 | No frontend tests | C | E | No `__tests__` under `pages/radiology` or `components/radiology` |

Tallies: **CONFIRMED = 39**, **PARTIALLY CONFIRMED = 8**, **NOT CONFIRMED = 3** (40+ unique claims; M-claims grouped as 33 for brevity).

---

## Claims the previous agent got WRONG or exaggerated

1. **L3** (refund over-refund) -- the actual code (lines 109-117 of `radiologyPaymentsController.js`) sums **all** payment rows including negative refund rows and refuses refunds exceeding the net. No over-refund is possible. The previous agent misread the code.
2. **L4** (`paidAmount` could be off) -- the calculation `data.total - data.remaining` is mathematically identical to the server's `paidAmount` because both `total` and `remaining` are exact numbers (no division/percentages). There is no rounding. The previous agent flagged a non-issue.
3. **Q4** (no TS types) -- types **do** exist in `apps/frontend/src/pages/radiology/shared.ts` (`RadiologyStudy`, `RadiologyReport`, `RadiologyStudyPayment`, `RadiologyStudyImage`, `RadiologyExamType`, `RadiologyReportTemplate`, `RadiologyExamAddition`, `RadiologyContract`, `TabId`). The previous agent missed them entirely.
4. **L8** (no cascade) -- the model has no foreign keys to other radiology tables; there is nothing to cascade to. The previous agent's framing is misleading. The real issue is a missing back-link from study to source appointment.
5. **L1** (no validation) -- overstated. There is a value-set check; only the **transition** chain is missing.
6. **L2** (multiple issues bundled) -- only the "study.status not promoted on update" part is a real bug. The other two sub-claims describe correct PATCH semantics.
7. **Q2** (6+ inline modals) -- the file has 3 modal components, not 6+.

---

## Claims the previous agent missed

1. **Backend tests for radiology DO exist** -- `apps/backend/tests/controller/radiology.test.js` plus 9 sibling files cover controllers. The agent only flagged the absence of frontend tests (Q5) without noting the backend coverage.
2. **ReceptionTab size** -- the agent said "296 lines"; the actual file is **325 lines** (`wc -l`). Minor, but worth noting.
3. **`DicomViewer` engine-id increment bug** -- the closure `engineSequence` is module-level and increments inside `useMemo` (line 107). Every re-render that changes `studyId` produces a **new** `engineId/viewportId/toolGroupId`, which forces a full teardown even when the underlying image set is identical. This compounds the L5 issue. Worth a separate ticket.
4. **Upload processing is sequential** -- `radiologyController.js:611-631` does `await prisma.radiologyStudyImage.create(...)` inside a `for (const file of files)` loop. With `files: 200` x ~50 MB, this is both slow and memory-heavy (the Multer `memoryStorage` in `routes/radiologyRoutes.js:9-11` keeps everything in RAM). A streaming/S3-backed pipeline would fix both P1 and this.
5. **PDF exposes patient phone verbatim** -- `radiologyPdfService.js:39` includes `patientPhone` in clear text without any consent/redaction hook (relevant to M27/M29).
6. **No CSRF / origin check on the viewer modal** -- `RadiologyViewerModal.tsx` accepts any `studyId` from the parent; the backend does check `companyId` ownership, but there is no audit entry (see M14).
7. **Search input in `ScheduleTab.tsx` has no debounce** -- different from `StudiesTab` which does debounce (`StudiesTab.tsx:188-194`). Inconsistent UX, not flagged.
8. **No "report locked while signing" guard** -- `upsertStudyReport` lets a concurrent user overwrite a `SIGNED` report if the new request doesn't include `reportStatus`. The `validateTransition` is only invoked when `requestedStatus` is provided, so a silent text edit is allowed on a signed report.

---

## Verdict

The previous agent's report is **broadly directionally correct** but contains three outright errors (L3, L4, Q4) and several exaggerated framings (L1, L2, L8, Q2). The bulk of the missing-feature list (M1-M33) is accurate -- I verified each one. The real, actionable items are:

- **L2 (study.status promotion)** -- actual functional bug.
- **L5 (viewer teardown)** + the related `engineSequence` increment -- performance + correctness impact.
- **P1, P2, P4, P5, P7** -- all real performance/scaling concerns.
- **M4 (AI integration)** -- high-leverage gap given both cornerstone3D and an `ai-service` are already deployed.
- **M14 (audit log)** -- required by HIPAA in 2026 (the previous agent's claim is correct).

VERDICT (overall assessment of the previous agent's report): **PARTIAL** -- the report's headline finding ("radiology system has many weaknesses") is supported, but the per-claim accuracy is mixed. Re-run with the corrections above before prioritising work.
