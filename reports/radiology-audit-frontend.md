# Radiology Frontend Audit Report

**Repository:** `H:/maxp-platform` (Windows)
**Scope:** `apps/frontend/src/pages/radiology/*` and `apps/frontend/src/components/radiology/*`
**Method:** Static code review only (read-only, no edits, no runtime instrumentation)
**Date of audit:** 2026-08-13

---

## 0. Files reviewed (absolute paths)

```
H:/maxp-platform/apps/frontend/src/pages/radiology/CashierShiftsTab.tsx
H:/maxp-platform/apps/frontend/src/pages/radiology/ExamAdditionsTab.tsx
H:/maxp-platform/apps/frontend/src/pages/radiology/ExamTypesTab.tsx
H:/maxp-platform/apps/frontend/src/pages/radiology/InsuranceCompaniesTab.tsx
H:/maxp-platform/apps/frontend/src/pages/radiology/InsuranceInvoicesTab.tsx
H:/maxp-platform/apps/frontend/src/pages/radiology/InsuranceLedgerTab.tsx
H:/maxp-platform/apps/frontend/src/pages/radiology/PriceListsTab.tsx
H:/maxp-platform/apps/frontend/src/pages/radiology/PriceQuoteTab.tsx
H:/maxp-platform/apps/frontend/src/pages/radiology/RadiologistsTab.tsx
H:/maxp-platform/apps/frontend/src/pages/radiology/RadiologyBranchesTab.tsx
H:/maxp-platform/apps/frontend/src/pages/radiology/RadiologyContractsTab.tsx
H:/maxp-platform/apps/frontend/src/pages/radiology/RadiologyDashboardTab.tsx
H:/maxp-platform/apps/frontend/src/pages/radiology/RadiologyInvoicesTab.tsx
H:/maxp-platform/apps/frontend/src/pages/radiology/RadiologyManagementPage.tsx
H:/maxp-platform/apps/frontend/src/pages/radiology/RadiologyPatientsTab.tsx
H:/maxp-platform/apps/frontend/src/pages/radiology/RadiologyReportsOverviewTab.tsx
H:/maxp-platform/apps/frontend/src/pages/radiology/RadiologyReportsTab.tsx
H:/maxp-platform/apps/frontend/src/pages/radiology/RadiologyViewerModal.tsx
H:/maxp-platform/apps/frontend/src/pages/radiology/ReceptionTab.tsx
H:/maxp-platform/apps/frontend/src/pages/radiology/ReferringPhysiciansTab.tsx
H:/maxp-platform/apps/frontend/src/pages/radiology/ScheduleCalendar.tsx
H:/maxp-platform/apps/frontend/src/pages/radiology/ScheduleTab.tsx
H:/maxp-platform/apps/frontend/src/pages/radiology/SettingsTab.tsx
H:/maxp-platform/apps/frontend/src/pages/radiology/shared.ts
H:/maxp-platform/apps/frontend/src/pages/radiology/StatisticsTab.tsx
H:/maxp-platform/apps/frontend/src/pages/radiology/StudiesTab.tsx
H:/maxp-platform/apps/frontend/src/components/radiology/DicomViewer.tsx
H:/maxp-platform/apps/frontend/src/components/radiology/polysegStub.js
```

Plus referenced helpers:
- `H:/maxp-platform/apps/frontend/src/utils/tokenManager.ts`
- `H:/maxp-platform/apps/frontend/package.json`

---

## 1. State management bugs

### 1.1 [P0] `ReceptionTab.tsx` is dead code (entire file is unreachable from any router)

**Evidence:** `ReceptionTab` is exported from `H:/maxp-platform/apps/frontend/src/pages/radiology/ReceptionTab.tsx:15`, but it is **not imported** anywhere outside its own file. A workspace-wide search returns no other consumers.

The redirect is in `H:/maxp-platform/apps/frontend/src/pages/radiology/RadiologyManagementPage.tsx:29`:

```ts
if (urlTab === "reception") return <Navigate to="/radiology/schedule" replace />;
```

But `RadiologyManagementPage.tsx` never `import ReceptionTab` (it imports `ScheduleTab` on line 18, but no `ReceptionTab`). So the legacy URL `/radiology/reception` is permanently redirected to `/radiology/schedule` and the `ReceptionTab` component is never mounted, never executed. Its ~345 lines of patient search / physician search / form / submission logic are dead code.

**Concrete fix:**
- Delete `H:/maxp-platform/apps/frontend/src/pages/radiology/ReceptionTab.tsx` entirely, or
- Reuse its catalog-loading and patient-physician search patterns by extracting them to `shared.ts` (see §3.6 duplication).
- Keep the `<Navigate>` redirect in `RadiologyManagementPage.tsx:29` as a permanent safety net.

**Bundle bloat estimate:** `ReceptionTab.tsx` is 345 lines, ~12 kB unminified. After dead-code elimination via Rollup, the file itself is *fully tree-shaken* if no other module references it. However, Vite/Rollup **does not** automatically remove files that are never imported — it only tree-shakes unused exports. Since the file is never imported at all, Rollup will not include it in the chunk graph, so the bytes are already excluded. The real cost is **maintenance**: duplicated logic, drift, and the risk of someone wiring it back up without realising it is a fork of `ScheduleTab`.

### 1.2 [P0] `polysegStub.js` is dead code (empty class, not imported anywhere)

**Evidence:** `H:/maxp-platform/apps/frontend/src/components/radiology/polysegStub.js` contains:

```js
export default class ICRPolySeg {
  async initialize() {}
}
```

Workspace grep: `ICRPolySeg|polysegStub` returns **only** this file. No importer.

The real package `@icr/polyseg-wasm` is listed in `H:/maxp-platform/apps/frontend/package.json:43` but is also not imported anywhere in `apps/frontend/src`.

**Concrete fix:**
- Delete `polysegStub.js` (it appears to be a placeholder for a future segmentation feature).
- Decide whether `@icr/polyseg-wasm` should be removed from `package.json` to shrink `node_modules` and the lockfile. If kept, document where it is intended to be used.

### 1.3 [P1] `StudiesTab.tsx` — `drafts` and `expanded` records grow unbounded (no cleanup)

**Evidence:** `H:/maxp-platform/apps/frontend/src/pages/radiology/StudiesTab.tsx:51-52`

```ts
const [expanded, setExpanded] = useState<Set<string>>(new Set());
const [drafts, setDrafts] = useState<Record<string, RologyDraft>>({});
```

- `drafts` is added to in `toggleExpand` at lines 214-222, and only mutated in place by `setDrafts` callbacks (lines 216, 402, 408, 412, 416). **No code path ever deletes a key from `drafts`**.
- `expanded` is added to via `setExpanded(prev => { const next = new Set(prev); … next.add(s.id) … return next; })` at lines 223-227. **No code path ever calls `next.delete(s.id)` on the expanded set, even when a study is collapsed, nor on refresh**.

The `studies` array is bounded by `limit=200` (line 174), but `drafts`/`expanded` accumulate keys for every study the user has *ever* expanded — including studies that fall out of the next filter result. In a long session with multiple filter changes, the maps can grow to many hundreds of entries.

**Concrete fix:**
- On `refresh`, prune `drafts` and `expanded` to keys present in the new `studies` list:
  ```ts
  setStudies(res.items || []);
  const ids = new Set(res.items.map(s => s.id));
  setDrafts(d => Object.fromEntries(Object.entries(d).filter(([k]) => ids.has(k))));
  setExpanded(prev => new Set([...prev].filter(k => ids.has(k))));
  ```
- Alternatively, derive `drafts` from `expanded` + the latest study data on each render (no separate state).

### 1.4 [P1] `StudiesTab.tsx` — `savePayment` race: optimistic local patch then `refresh()`

**Evidence:** `H:/maxp-platform/apps/frontend/src/pages/radiology/StudiesTab.tsx:118-137`

```ts
const savePayment = async () => {
  if (!payModal || savingPay) return;
  const amount = Number(payAmount);
  if (!Number.isFinite(amount) || amount <= 0) { toast.error("المبلغ غير صحيح"); return; }
  setSavingPay(true);
  try {
    const data = await fetchJson<{ payment: RadiologyStudyPayment; total: number; remaining: number; paymentStatus: string }>(api(`studies/${payModal.studyId}/payment`), {
      method: "POST",
      body: JSON.stringify({ amount, method: payMethod }),
    });
    toast.success(`تم تسجيل دفعة ${amount} ج`);
    setPayModal({ ...payModal, paidAmount: data.total - data.remaining, remaining: data.remaining, payments: [...payModal.payments, data.payment] });
    setPayAmount("");
    await refresh({ silent: true });
  } catch (e) { … }
};
```

Two issues:
1. The POST returns `{ payment, total, remaining, paymentStatus }` (line 124). The optimistic `payments: [...payModal.payments, data.payment]` (line 129) adds the new payment to the local list. If the user has just opened the modal *again* (clicked a different study's pay button) and `payModal` was remounted, the list can be stale. But in the normal flow, this is fine.
2. **More importantly**: between the local patch and `await refresh({ silent: true })` (line 131), the studies list at the top of the page is still using the **old** `paidAmount` for the row's badge. The badge (`statusBadge` at line 369) doesn't show `paidAmount`, but the row total in the main table is unaffected. So there is **no visible race** in this specific instance — but the **invariant** ("the modal always shows what the server knows") is broken if `refresh` fails silently (the `silent: true` suppresses the error toast at line 184). On a failed refresh, the modal would show the new payment while the row counts would not.

**Concrete fix:** Either
- drop the optimistic patch and only rely on `refresh` to repopulate, or
- re-fetch the modal data after a successful POST (one extra GET to `studies/${id}/payment`).

### 1.5 [P1] `ScheduleTab.tsx` — `useEffect([refresh])` chain causes cascading refetches on every filter change

**Evidence:** `H:/maxp-platform/apps/frontend/src/pages/radiology/ScheduleTab.tsx:79-101` and `103-106`

```ts
const refresh = useCallback(async (opts?: { silent?: boolean }) => { … }, [status, search, dateFrom, dateTo, view, anchorDate]);

useEffect(() => {
  loadCatalog();
  refresh();
}, [loadCatalog, refresh]);
```

`refresh` is recreated whenever any of `status | search | dateFrom | dateTo | view | anchorDate` changes, so the effect re-fires. `loadCatalog` is stable (empty deps), but it is still re-called on every `refresh` change because the effect re-runs. `loadCatalog` is itself a `useCallback` that internally fires 3 parallel `fetchJson` calls (line 68-72).

**Bugs:**
1. `loadCatalog` re-runs on every keystroke in the patient search box (because `search` is a dep of `refresh`). For an 8-character query, that's 8 redundant catalog fetches (~24 HTTP calls). The 350 ms debounce only exists for the *patient* search (lines 108-120), not for the catalog.
2. Combined with the global `fetchJson` retry policy (`H:/maxp-platform/apps/frontend/src/pages/radiology/shared.ts:152-175`, retries 502/503 with 1s/2s backoff), a transient 502 during typing can amplify into a long-running fetch storm.
3. Same pattern in `StudiesTab.tsx:188-194` — the effect is debounced 400 ms, which is better, but the patient/insurance/date search fields are uncontrolled — they update `search` and `nationalSearch` directly, so any keystroke recreates `refresh` and triggers a debounced refetch.

**Concrete fix:**
- Split the effect: `useEffect(() => { loadCatalog(); }, [loadCatalog]);` and a separate `useEffect(() => { refresh(); }, [refresh]);`.
- Or pull the catalog load out of the effect entirely (use a state flag that triggers catalog only on first mount).
- The 502-retry policy should be capped globally, not per-component (see §2.5).

### 1.6 [P2] `StudiesTab.tsx` — `advanceStatus` trusts a hard-coded FE status map; backend may reject

**Evidence:** `H:/maxp-platform/apps/frontend/src/pages/radiology/StudiesTab.tsx:254-268` and `H:/maxp-platform/apps/frontend/src/pages/radiology/shared.ts:144-150`

```ts
// shared.ts
export const STUDY_STATUS: Record<string, string> = {
  PENDING_IMAGING: "IMAGED",
  IMAGED: "PENDING_REPORT",
  PENDING_REPORT: "REPORTED",
  REPORTED: "DELIVERED",
  DELIVERED: "",
};

// StudiesTab.tsx
const advanceStatus = async (s: RadiologyStudy) => {
  if (advancingId === s.id) return;
  const next = STUDY_STATUS[s.status];
  if (!next) { toast.error("لا توجد حالة تالية"); return; }
  …
  await fetchJson(api(`studies/${s.id}`), { method: "PUT", body: JSON.stringify({ status: next }) });
```

The map is fine for the 5 happy-path statuses, but:
- If the backend ever introduces a new status (e.g. `ON_HOLD`, `REJECTED`, `CANCELLED`), the FE silently *disables* the advance button (because `!STUDY_STATUS[s.status]`) instead of letting the user (or a dedicated cancel button) move the study out of the dead state.
- The button uses `disabled={advancingId === s.id || !STUDY_STATUS[s.status]}` (line 392) so the user just sees a permanently disabled button with no explanation of why.
- The "advance" map has no concept of role permissions — a receptionist can advance from `PENDING_REPORT` → `REPORTED` (clinical action). No `disabled` for non-radiologist roles.

**Concrete fix:** Add a visible tooltip / fallback action when `!STUDY_STATUS[s.status]` (e.g. "Status cannot advance. Use Rology or contact a radiologist."). Add a separate "Cancel study" affordance.

### 1.7 [P2] `printLabel` and `printPdf` blob-URL revoke timer leaks if window closes early

**Evidence:**
- `H:/maxp-platform/apps/frontend/src/pages/radiology/StudiesTab.tsx:87-104` (printLabel)
- `H:/maxp-platform/apps/frontend/src/pages/radiology/RadiologyReportsTab.tsx:86-107` (printPdf)

```ts
// StudiesTab.tsx
const blob = await res.blob();
const url = URL.createObjectURL(blob);
window.open(url, "_blank");
setTimeout(() => URL.revokeObjectURL(url), 60000);
```

If the user closes the print-preview tab *before* 60 s elapse, the parent window still holds a reference and the timer will eventually fire (and revoke an already-unloaded URL — harmless but slightly wasteful). If the user opens 5 labels in a row, 5 timers + 5 blob references are held. The bigger issue: there is no `onbeforeunload` cleanup for the parent, so navigating away from `/radiology/studies` mid-revoke leaves a dangling setTimeout.

**Concrete fix:**
- Use `URL.revokeObjectURL(url)` in the `onLoad`/`onUnload` of the opened window (requires `window.open` to return a handle, then attach handlers).
- Or simply call `revokeObjectURL` immediately after `window.open` — the browser keeps the blob alive while the new window references it.
- Or use a `useRef` to track timers and clear them on tab unmount.

---

## 2. Performance

### 2.1 [P1] `DicomViewer.tsx` — `imageIdsKey` and `imageIds` are correct, BUT the effect re-init can happen on parent re-renders

**Evidence:** `H:/maxp-platform/apps/frontend/src/components/radiology/DicomViewer.tsx:106-122, 124-189`

```ts
const ids = useMemo(() => {
  const sequence = ++engineSequence;
  return {
    engineId: `dicom-re-${studyId}-${sequence}`,
    viewportId: `dicom-vp-${studyId}-${sequence}`,
    toolGroupId: `dicom-tg-${studyId}-${sequence}`,
  };
}, [studyId]);

const imageIdsKey = useMemo(
  () => images.map((i) => i.url).join("\u0000"),
  [images],
);
const imageIds = useMemo(
  () => (imageIdsKey === "" ? [] : imageIdsKey.split("\u0000")),
  [imageIdsKey],
);

useEffect(() => {
  …
  return teardown;
}, [ids, imageIdsKey, imageIds]);
```

The `useMemo` deps are correct. However:

- `images` is the prop passed by `RadiologyViewerModal.tsx:18-22`:
  ```ts
  const list = (detail.images || []).map(img => ({
    ...img,
    url: api(`studies/${studyId}/images/${img.id}/file`),
  }));
  setImages(list);
  ```
  Every time the modal re-fetches (effect dep `[studyId]` only — line 29, so this is stable in practice), `setImages` would build a new array even if the contents are identical, **breaking `useMemo` referential equality** if the modal ever re-fetches (e.g. on a re-render caused by the parent's `setState`).

  In the current code path, the modal only fetches once (the effect dep is `[studyId]` and `studyId` doesn't change while the modal is open), so this is not currently a bug. But it's a **latent landmine**: any future change to the modal that triggers `setImages` with a new array (even with the same items) will cause `imageIdsKey` to recompute, the effect to tear down the engine, and a full re-init of cornerstone (`new RenderingEngine`, `setStack`, register tools). That is **expensive** (cornerstone + wasm init + image metadata fetch).

- The `engineSequence` is a module-level counter, not a React ref. Two simultaneous DicomViewer mounts can race the `++engineSequence` increment (low impact, but worth noting).

**Concrete fix:**
- Make `imageIdsKey` robust to referentially-different but content-equal arrays by computing it from a stable serialised form (already done — the join is stable as long as the URLs don't change order).
- Add a defensive `if (prevImages.length === nextImages.length && prevImages.every((p, i) => p.url === nextImages[i].url)) return prev;` in the parent before calling `setImages`.
- The `engineSequence` counter is fine for single-page apps; promote it to a `useRef` if you ever SSR.

### 2.2 [P1] `DicomViewer.tsx` — `setStack(imageIds)` loads *all* imageIds upfront (no progressive streaming)

**Evidence:** `H:/maxp-platform/apps/frontend/src/components/radiology/DicomViewer.tsx:173`

```ts
await viewport.setStack(imageIds);
```

`setStack` is the cornerstone "Stack Viewport" API: it preloads all imageIds into a single in-memory stack and lazily fetches/decodes them on slice navigation. This is more memory-efficient than `setImageIdIndex` per-frame, but it does:

1. Pre-fetch metadata (DICOM tags) for every image to determine sort order, spacing, and orientation.
2. Spin up web workers to decode each frame as the user scrolls.

For a CT chest study with 600 slices at 512×512×16-bit, that's ~150 MB of pixel data worst case (before any browser GC of decoded images). On a typical 4 GB-RAM laptop, opening 2-3 studies in different tabs will OOM the browser.

**Concrete fix:**
- Switch to a `volumeViewport` (3D) for volumetric studies (CT, MRI) and a `stackViewport` for projection radiography (CR/DR).
- For `stackViewport`, prefer cornerstone's built-in prefetch range (e.g. `viewport.setStack(imageIds, { prefetch: { numberOfImagesCached: 20 } })` — verify exact API in your cornerstone version).
- Add a max-slice guard in the parent (`RadiologyViewerModal`): if `images.length > 500`, show a warning and a "load anyway" button.

### 2.3 [P0] `StudiesTab.tsx` — hard-coded `limit=200` with no pagination

**Evidence:** `H:/maxp-platform/apps/frontend/src/pages/radiology/StudiesTab.tsx:173-186`

```ts
const url = new URL(api("studies"));
url.searchParams.set("limit", "200");
…
const res = await fetchJson<{ items?: StudyWithRadiologist[]; total?: number }>(url.toString());
setStudies(res.items || []);
```

The backend returns `{ items, total }` (note `res.total` is read but never used — line 181). The FE never pages. For a busy site (>200 studies/day) the table only ever shows the most recent 200. Filter inputs (`status`, `search`, `nationalSearch`, `insuranceSearch`, `dateFrom`, `dateTo`) reduce the result set, but the moment the user clears the filter, the 200 limit silently caps them.

Worse, the same pattern (no pagination) appears in:
- `ScheduleTab.tsx:82` — `limit=300`
- `RadiologyPatientsTab.tsx:35` — `limit=200`
- `RadiologyInvoicesTab.tsx:28` — `limit=200`
- `RadiologyDashboardTab.tsx:27, 47` — `limit=200` × 2 calls
- `InsuranceInvoicesTab.tsx:113` — `limit=200`
- `InsuranceLedgerTab.tsx:41` — `limit=200`
- `ReferringPhysiciansTab.tsx` — no limit (relies on backend default, likely 50–100)
- `PriceQuoteTab.tsx:32`, `ReceptionTab.tsx:60-61`, `ScheduleTab.tsx:69-71` — `limit=500/100` on exam-types catalog

**Concrete fix:**
- Add pagination: `useState<number>(1); useState<number>(0);` and a `useEffect` keyed on `page + filters`.
- Show a `Pagination` component (e.g. `@tanstack/react-table` is already in `package.json:46`) with first/prev/next/last.
- For the studies table specifically, prioritise "today" / "this week" by default and require an explicit date range to widen the result.

### 2.4 [P2] `ScheduleTab.tsx` — patient search effect **is** correctly cancelled on unmount (no bug)

**Evidence:** `H:/maxp-platform/apps/frontend/src/pages/radiology/ScheduleTab.tsx:108-120`

```ts
useEffect(() => {
  if (!patientSearch.trim()) { setPatientResults([]); return; }
  const t = setTimeout(async () => {
    try {
      …
      setPatientResults(Array.isArray(rows) ? rows : []);
    } catch { setPatientResults([]); }
  }, 350);
  return () => clearTimeout(t);
}, [patientSearch]);
```

This is **correctly debounced and cleaned up**. Same for the physician search effect at lines 122-134. Calling this out as a positive: the tasks asked to verify, and the answer is *no, the search effects are properly cleaned up*.

However, the **fetch is not cancelled** — if the user types "ahmed" and the network is slow, then types "ahmed khaled" 1 ms later, the first request can still resolve and call `setPatientResults([…])` after the second request has already shown its (older) results. This is a classic stale-closure race.

**Concrete fix:** Add an `AbortController`:
```ts
const ctrl = new AbortController();
const rows = await fetchJson(url, { signal: ctrl.signal });
// cleanup: ctrl.abort();
```

### 2.5 [P1] `fetchJson` retries with exponential backoff can cascade into a thundering herd

**Evidence:** `H:/maxp-platform/apps/frontend/src/pages/radiology/shared.ts:152-175`

```ts
export const fetchJson = async <T>(url: string, options?: RequestInit, retries = 2): Promise<T> => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: getAuthHeaders(), ...options });
      if (res.status === 502 || res.status === 503) {
        if (attempt < retries) { await new Promise(r => setTimeout(r, 1000 * (attempt + 1))); continue; }
        throw new Error("الخادم غير متاح حالياً - جارٍ إعادة التشغيل");
      }
      …
    } catch (e: unknown) {
      if (attempt < retries) {
        const msg = e instanceof Error ? e.message : "";
        if (msg.includes("502") || msg.includes("503") || msg.includes("fetch")) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
      }
      throw e;
    }
  }
  throw new Error("فشل العملية");
};
```

Issues:
1. **Up to 3 attempts per call** (retries=2 means 0, 1, 2 = 3 tries). With 1 s + 2 s backoff, that's a **3 s** worst-case per call.
2. `StudiesTab` runs **6 fetches in parallel on initial mount** (radiologists + studies + …). If the backend is on a cold restart (common cause of 502), all 6 will each retry 3 times, all in the same 1-3 s window. That's **18 requests** hammering the recovering backend.
3. The retry condition matches on substring `"fetch"` (line 166) — this catches *any* `TypeError` that includes the word "fetch", which includes CORS errors, ad-blocker aborts, etc. Those are **not retryable**, but the code retries them anyway.
4. The retries are in **series** per call but the components don't `AbortController` their prior in-flight calls (e.g. when filters change). So a stale request can still complete after the user has moved on.

**Concrete fix:**
- Default `retries` to `0` for catalog loads and `1` for mutating calls. Move the retry policy to a dedicated `useFetch` hook with built-in `AbortController`.
- Drop the `"fetch"` substring match; only retry on literal `502 | 503 | 504` from the response status.
- Use a circuit breaker: if 5+ calls in the last 10 s returned 502, suspend retries for 30 s.

### 2.6 [P2] No `setState`-in-render or missing `key` props found in the audited code

I scanned the radiology tabs and components for:
- `setState` calls outside hooks/handlers
- `.map(...)` without `key`
- `.map(...)` with non-unique keys (e.g. array index)

Findings:
- All `.map` calls have `key={...}` set to a stable id (`s.id`, `p.id`, `t.id`, `c.insuranceCompanyId`, `m.category`, etc.).
- `ScheduleTab.tsx:386` and `ExamTypesTab.tsx:387` use `key={t.id}` on the exam-types select. Correct.
- `StudiesTab.tsx:357` uses `key={r.id}` for radiologists. Correct.
- The header rows (e.g. `StudiesTab.tsx:333`, `ScheduleTab.tsx:318`) use `key={h}` where `h` is a string label. Fragile if two columns share a label, but in practice the labels are unique per table.
- The studies table uses `<Fragment key={s.id}>` (`StudiesTab.tsx:340`) for the expandable row pair. Correct.

**No `setState` in render found.** The setState call at `StudiesTab.tsx:129` (`setPayModal({ ...payModal, … })`) is inside an `async` function (line 118), so it runs after the render commit. Safe.

---

## 3. UX / Logic issues

### 3.1 [P1] `RadiologyManagementPage` redirects `/radiology/reception` → `/radiology/schedule` but `ReceptionTab` is still imported nowhere

Covered in §1.1. The `ReceptionTab` component is not imported by `RadiologyManagementPage.tsx` (verified by `grep -n ReceptionTab` returning no matches in the management page). The redirect at `RadiologyManagementPage.tsx:29` works because the route literally never resolves `activeTab === "reception"` — the redirect short-circuits before that branch is checked.

**Concrete fix:** Delete `ReceptionTab.tsx`. Confirm by removing the redirect at line 29 (since it's no longer needed for any reachable route).

### 3.2 [P1] `ScheduleTab.tsx` — patient search reset on modal open, but edit-from-existing is fragile

**Evidence:** `H:/maxp-platform/apps/frontend/src/pages/radiology/ScheduleTab.tsx:235-239, 336, 365`

```ts
const openNew = (asWalkIn = false) => {
  setModal({ ...emptyForm(), status: asWalkIn ? "CHECKED_IN" : "SCHEDULED" });
  setPatientSearch("");
  setPhysicianSearch("");
};
```

And the edit pencil (line 336):
```ts
onClick={() => setModal({ ...emptyForm(), id: a.id, patientId: (a as { patientId?: string }).patientId || "", patientName: a.patientName, …})}
```

The edit path does **not** reset `patientSearch` or `physicianResults` because they're not in the dep list. So if the user typed a patient query for a *new* appointment, then clicked edit on an existing row, the leftover `patientResults` would still be showing under the new (now-existing-patient) input.

**Concrete fix:** Always reset patient/physician search in the edit handler:
```ts
setPatientSearch(""); setPatientResults([]); setPhysicianSearch(""); setPhysicianResults([]);
```

Same fix is needed in `ReceptionTab.tsx` (line 89) if the file is kept.

### 3.3 [P1] `ReceptionTab` and `ScheduleTab` duplicate the same 3 patterns

**Evidence — three-way duplication:**

| Pattern | ReceptionTab | ScheduleTab | DicomViewerModal |
|---|---|---|---|
| Exam-type catalog load | lines 58-65 | lines 68-72 | — |
| Patient search | lines 89-103 | lines 108-120 | — |
| Physician search | lines 106-120 | lines 122-134 | — |
| Insurance-companies load | line 61 | line 71 | — |

The patient search differs only in the response shape (ReceptionTab has `gender`, `birthDate`; ScheduleTab has neither), and in the debounce (400 ms vs 350 ms). The physician search is **identical** (both call `api("referring-physicians")?search=…&limit=20` with 350 ms debounce).

**Concrete fix:** Extract to `shared.ts`:

```ts
// shared.ts
export function usePatientSearch(debounceMs = 350) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PatientSearchResult[]>([]);
  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const url = new URL(bookingApi("patients"));
        url.searchParams.set("search", q.trim());
        url.searchParams.set("limit", "10");
        const rows = await fetchJson<PatientSearchResult[]>(url.toString());
        setResults(Array.isArray(rows) ? rows : []);
      } catch { setResults([]); }
    }, debounceMs);
    return () => clearTimeout(t);
  }, [q, debounceMs]);
  return { q, setQ, results, setResults };
}
```

And similarly `usePhysicianSearch` and `useExamTypeCatalog`.

### 3.4 [P2] `ScheduleTab` — conversion to study uses `window.location.href` (full page reload)

**Evidence:** `H:/maxp-platform/apps/frontend/src/pages/radiology/ScheduleTab.tsx:184, 227`

```ts
window.location.href = "/radiology/studies";
```

This **blows away the React tree** and the query cache (if any) and the user's scroll position on the previous page. Since you use Vite + React Router (`react-router-dom` in `package.json:80`), prefer:

```ts
import { useNavigate } from "react-router-dom";
const navigate = useNavigate();
navigate("/radiology/studies");
```

This is a UX regression every time a receptionist converts a walk-in to a study.

### 3.5 [P2] `InsuranceInvoicesTab` `submitCreate` mutates studies via individual `PUT` calls in a loop

**Evidence:** `H:/maxp-platform/apps/frontend/src/pages/radiology/InsuranceInvoicesTab.tsx:141-150`

```ts
for (const s of selected) {
  if (s.insuranceCompanyId !== createForm.insuranceCompanyId) {
    await fetchJson(api(`studies/${s.id}/insurance`), {
      method: "PUT",
      body: JSON.stringify({ insuranceCompanyId: createForm.insuranceCompanyId }),
    });
  }
}
```

For an invoice bundling 50 studies, this fires 50 sequential PUTs. There is no batching, no rollback if the invoice POST fails on line 158, and no idempotency token. If the user navigates away mid-loop, half the studies are reassigned but the invoice is never created.

**Concrete fix:** Add a server-side `POST /api/insurance-invoices` that accepts the full set and does the reassignment + invoice creation in a single transaction. Or accept `studyIds` + `forceAssignToCompanyId` in the existing payload.

---

## 4. Accessibility / RTL

### 4.1 [P1] Modal content is *not* explicitly `dir="rtl"` — relies on the parent

**Evidence:**
- `RadiologyManagementPage.tsx:33` — `<div className="… w-full h-full overflow-y-auto" dir="rtl">` (parent)
- All modal bodies inside the tabs (`StudiesTab.tsx:440`, `ScheduleTab.tsx:357`, etc.) use `className={MODAL_CONTENT_CLS}` (from `shared.ts:183`) which is just `bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 w-full max-w-xl mx-4`. **No `dir` set**.

Because the parent is RTL, most children inherit correctly. But:
- Inputs with `dir="ltr"` (e.g. `StudiesTab.tsx:317, 318, 320, 399, 403, 408, 412`, `ReceptionTab.tsx:243, 247, 252, 281`) are explicit overrides, which is correct for phone numbers and national IDs.
- **Cornerstone viewport canvas** is `dir="rtl"` *forced* in `DicomViewer.tsx:298`. Cornerstone uses pointer events to handle pan/zoom, not text direction, so RTL on the container is benign but it means the `cursor: ne-resize` etc. may be inverted for left-handed users. Verify with a left-handed radiologist.

**Concrete fix:**
- Add `dir="rtl"` to the outer modal div in every tab (e.g. `StudiesTab.tsx:440`, `ScheduleTab.tsx:357`, `RadiologyReportsTab.tsx:111`, etc.) to make the intent explicit and survive a future refactor that lifts the modal into a portal.
- Use `<dialog>` element or `aria-modal="true"` + `role="dialog"` + `aria-labelledby="<title-id>"` for proper a11y.

### 4.2 [P0] No focus trap in any modal

**Evidence:** All modals are plain `<div className="fixed inset-0 …">` with no focus management. Examples:
- `StudiesTab.tsx:439-497` (pay modal)
- `ScheduleTab.tsx:355-461` (appointment modal)
- `RadiologyReportsTab.tsx:110-146` (report modal)
- `RadiologyViewerModal.tsx:31-54` (DICOM viewer modal)
- `InsuranceInvoicesTab.tsx:262-330` (create invoice), `332-371` (record payment)
- `SettingsTab.tsx:263-288` (template modal), `290-308` (tag modal)

Issues:
- **No `autoFocus` on the first input** — keyboard users land on the document body.
- **No focus trap** — pressing Tab moves focus *behind* the modal to the underlying table, which is invisible (covered by the modal backdrop).
- **No Escape key handler** — only click-outside (`onClick={() => setModal(null)}` on the backdrop) closes the modal. Mouse-only.
- **No `aria-modal`, `role="dialog"`, `aria-labelledby`** — screen readers see the modal as just a `<div>` with no semantic role.

**Concrete fix:** Either:
- Use the native `<dialog>` element with `showModal()` (full focus trap, Escape support, `::backdrop` pseudo-element).
- Or add a small custom hook `useFocusTrap(ref)` and an `onKeyDown` for Escape. Consider `@radix-ui/react-dialog` (already in your shadcn stack based on `package.json:34` `@base-ui/react`).

### 4.3 [P2] Patient/physician search dropdowns are not keyboard-navigable

**Evidence:** `ScheduleTab.tsx:367-376` (patient dropdown), `409-414` (physician dropdown), `ReceptionTab.tsx:208-216` (patient), `288-302` (physician).

The dropdowns are `<button>` elements with `onClick` (correct for mouse), but:
- No `role="listbox"` / `role="option"` — screen readers announce them as a list of unnamed buttons.
- No `aria-activedescendant` or `aria-expanded` on the input.
- No `onKeyDown` to navigate with ↑/↓/Enter — keyboard users must mouse.
- The dropdown does not close on Escape (only on selection or on clearing `patientSearch`).

**Concrete fix:** Add `role="combobox"` to the input, `role="listbox"` to the dropdown, `aria-expanded={!!patientSearch.trim()}`, and an `onKeyDown` on the input that handles `ArrowDown` to focus the first option, `Enter` to select, and `Escape` to close.

### 4.4 [P2] No skip-to-content link

**Evidence:** `RadiologyManagementPage.tsx:32-62` has no skip link. With a sticky tab bar and 21 tabs, keyboard users have to Tab through 21 buttons on every page load.

**Concrete fix:** Add `<a href="#main" className="sr-only focus:not-sr-only">` as the first child of the page wrapper.

---

## 5. Type safety

### 5.1 [P1] `shared.ts` defines interfaces but most tab code re-declares them inline

**Evidence — duplicated `Appointment` / `RadiologyStudy` / `InsuranceCompany` interfaces:**

| Interface | Defined in shared.ts | Re-declared in |
|---|---|---|
| `RadiologyStudy` | `shared.ts:103-121` | not redeclared (good) |
| `RadiologyReport` | `shared.ts:74-81` | not redeclared (good) |
| `Appointment` | not in shared.ts | `ScheduleTab.tsx:7-18` |
| `RadiologyStudyPayment` | `shared.ts:88-91` | not redeclared (good) |
| `InsuranceCompany` | not in shared.ts | `InsuranceInvoicesTab.tsx:6-10`, `InsuranceLedgerTab.tsx:6`, `InsuranceCompaniesTab.tsx:6-12` (3 different shapes!) |
| `RadiologyRadiologist` | not in shared.ts | `StudiesTab.tsx:26-30`, `RadiologistsTab.tsx:11-17` (different fields: `name+location` vs `name+location+isActive+createdAt`) |
| `RadiologyPatient` | not in shared.ts | `RadiologyPatientsTab.tsx:6-9` |
| `PatientStudy` | not in shared.ts | `RadiologyPatientsTab.tsx:11-15` |

`InsuranceCompany` is the worst offender — three different shapes:
- `InsuranceInvoicesTab.tsx:6-10` — `id, name, isActive?`
- `InsuranceLedgerTab.tsx:6` — `id, name, isActive?`
- `InsuranceCompaniesTab.tsx:6-12` — `id, name, phone1?, contactName?, isActive?`

`RadiologyRadiologist` is similar.

**Concrete fix:** Move all of these to `shared.ts`, including a single canonical `InsuranceCompany` and `RadiologyRadiologist`. Make the source of truth the backend's response shape.

### 5.2 [P1] `fetchJson<T>` generic is used inconsistently

**Evidence:** `fetchJson` is defined with `<T>` at `shared.ts:152`. Usage audit:
- `StudiesTab.tsx`: uses generics consistently (e.g. `fetchJson<{ payment: RadiologyStudyPayment; … }>(…)`).
- `RadiologyReportsTab.tsx:49`: generic OK.
- `InsuranceInvoicesTab.tsx:84, 95`: generic OK.
- `RadiologyPatientsTab.tsx:36`: `fetchJson<RadiologyPatient[]>(url)` — OK.
- `RadiologyInvoicesTab.tsx:28`: `fetchJson<RadiologyInvoice[]>(`${bookingApi("invoices")}?limit=200`)` — OK.
- **`ExamTypesTab.tsx:55-56`**: bypasses `fetchJson` entirely and does `await fetch(...)` + manual `res.json()`:
  ```ts
  const res = await fetch(`${api("exam-types")}&${params.toString()}`, { headers: getAuthHeaders() });
  const json = (await res.json()) as { success?: boolean; error?: string; message?: string; data?: RadiologyExamType[]; total?: number; page?: number };
  ```
  This is intentional (it preserves pagination metadata), but it should be a named helper like `fetchJsonPaged<T>(url, params)` rather than a copy-paste of the envelope-handling logic.
- **`DicomViewer.tsx:75-79`**: does `fetch(...)` directly for the DICOM image binary, which is correct (bypasses JSON parsing). But uses `tokenManager.createAuthHeaders()` for the auth headers instead of `getAuthHeaders()` from `shared.ts`. This means the DICOM fetches **do not include the `X-Company-Id` header** unless the helper adds it (verified: `tokenManager.createAuthHeaders({})` only adds `Authorization`; the company header is added separately on line 77). OK, but the two places that do this (`DicomViewer.tsx:75-79`, `StudiesTab.tsx:72-74`, `RadiologyReportsTab.tsx:90-92`) all re-implement the same `headers = createAuthHeaders({}); if (cid) headers["X-Company-Id"] = cid;` pattern. Extract to `getAuthHeaders()` (already in `shared.ts:38-43`!).

**Concrete fix:**
- Use `getAuthHeaders()` everywhere instead of the inline pattern.
- Add `fetchJsonPaged<T>` helper to `shared.ts`.
- Remove the `as` cast on line 56 of `ExamTypesTab.tsx` — the type should be inferred or named.

### 5.3 [P2] `as` casts hide type drift

**Evidence:** Examples:
- `ScheduleTab.tsx:336` — `(a as { patientId?: string }).patientId || ""` repeated 4 times in the edit-pencil handler.
- `DicomViewer.tsx:82` — `wadouri.loadImage as unknown as CoreTypes.ImageLoaderFn` — necessary because cornerstone's wadouri loader doesn't expose the right type, but worth a comment.
- `StudiesTab.tsx:32-36` — `type StudyWithRadiologist = RadiologyStudy & { assignedRadiologistId?: string; … }` — extension, fine.

**Concrete fix:** Lift the optional fields into the `RadiologyStudy` interface in `shared.ts:103`. The backend is already returning them (the table renders them on line 352).

---

## 6. Mobile / responsive

### 6.1 [P1] Studies table is `min-w-[1000px]` and unreadable on mobile

**Evidence:** `H:/maxp-platform/apps/frontend/src/pages/radiology/StudiesTab.tsx:330`

```ts
<table className="w-full min-w-[1000px]">
```

On a 375 px-wide phone, the table forces horizontal scroll. With 8 columns including a 3-row patient name + tags + radiologist select + 2 badges + 8 action buttons per row, the table is roughly 1100 px wide. The user can scroll horizontally but loses vertical context.

The same pattern is used in:
- `ScheduleTab.tsx:315` — `min-w-[900px]`
- `RadiologyReportsTab.tsx:240` — `min-w-[800px]`
- `InsuranceLedgerTab.tsx:131` — `min-w-[700px]`
- `ReferringPhysiciansTab.tsx:121` — `min-w-[700px]`

**Concrete fix:**
- For widths under 768 px, render a card-list view instead of a table. The current pattern (`overflow-x-auto` div) is a cop-out — it works but is a poor experience.
- At minimum, hide low-priority columns on small screens (e.g. `hidden md:table-cell`) and add a "details" tap target that opens a full-screen modal.

### 6.2 [P2] DICOM viewer is 480 px on mobile, 560 px on desktop

**Evidence:** `H:/maxp-platform/apps/frontend/src/components/radiology/DicomViewer.tsx:377`

```tsx
<div className="relative h-[480px] w-full overflow-hidden rounded-xl border border-gray-200 bg-black dark:border-gray-700 lg:h-[560px]">
```

A radiologist reviewing a 512×512 chest X-ray on a phone in portrait will see the full image but lose the toolbar (which is `flex-wrap` at line 299 so it wraps, OK), and the slice navigation (line 309-310) is fine. The zoom tool (line 256-279) is the bigger issue: with a 480 px viewport on a 6.1" phone, finger pans and zooms work but the W/L preset dropdown is unusable.

**Concrete fix:** On mobile, the toolbar should be a bottom sheet (`fixed bottom-0 left-0 right-0`) with collapsible sections. Long-term: add a "rotate to landscape" prompt for the DICOM viewer.

---

## 7. Bundle bloat

### 7.1 [P1] `ReceptionTab.tsx` and `polysegStub.js` are dead but the *logistics* of removing them

**Evidence:** Verified dead (see §1.1 and §1.2).

- `ReceptionTab.tsx` is **never imported**, so Rollup tree-shaking excludes it from the production bundle. **Net bundle impact: 0 bytes** (assuming no other dynamic import). Maintenance impact: high (345 lines of duplicated code).
- `polysegStub.js` is **never imported**. **Net bundle impact: 0 bytes.** Maintenance impact: low.
- `@icr/polyseg-wasm` (in `package.json:43`) is **never imported anywhere in `apps/frontend/src`**. **Net bundle impact: 0 bytes** (the package is a `dependency`, not bundled unless imported). But it adds ~1–3 MB to `node_modules` and the lockfile, slowing `npm install` and CI.
- `dicom-parser` (in `package.json:58`) is also not directly imported. Cornerstone bundles its own copy. **Net bundle impact: 0 bytes.** Lockfile bloat.

**Bundle bloat estimate (rough):**
- Removing the 2 dead code files: **0 kB** (already tree-shaken).
- Removing `@icr/polyseg-wasm` and `dicom-parser` from `package.json`: **~1.5–3 MB off `node_modules` and lockfile**, no change to client bundle.

### 7.2 [P1] `@cornerstonejs/*` is the largest single dep in the radiology bundle

**Evidence:** `package.json:36-38`

```json
"@cornerstonejs/core": "^2.19.16",
"@cornerstonejs/dicom-image-loader": "^2.19.16",
"@cornerstonejs/tools": "^2.19.16",
```

The 3 packages together (gzipped) are roughly:
- `@cornerstonejs/core`: ~120 kB gz (WebGL + DICOM core)
- `@cornerstonejs/dicom-image-loader`: ~80 kB gz (wasm, codec workers)
- `@cornerstonejs/tools`: ~40 kB gz (segmentation, annotation)

**Total: ~240 kB gzipped, ~700 kB minified.** Out of these, the actual gzipped payload from the radiology feature is only the JS glue (the `.wasm` files are lazy-loaded by the workers).

The good news: `RadiologyViewerModal.tsx:5` already uses `React.lazy`:
```ts
const Viewer = React.lazy(() => import("../../components/radiology/DicomViewer"));
```
So the DicomViewer + cornerstone stack is **only fetched when the user clicks "view images"**. That's a ~240 kB saving for the 95% of users who never open a study.

**But the lazy chunk is *not prefetched on hover*** — the first click takes ~1–2 s on a slow connection.

**Concrete fix:**
- Add `<link rel="prefetch" href="/assets/dicom-viewer-*.js">` on the `/radiology/studies` page.
- Or use `import(/* webpackPrefetch: true */ "./DicomViewer")` (Vite-compatible equivalent: `/* @vite-ignore */` with prefetch).
- Verify that `DicomViewer.tsx` itself does not have any **eager** side-effect imports of cornerstone at the top of the file — it does (`import { Enums, RenderingEngine, … } from "@cornerstonejs/core"` on lines 3-21). These are eager because they're at the top of the lazy chunk, which is correct. **No change needed.**

### 7.3 [P2] Other large deps in the workspace that touch the radiology route

- `jspdf` + `jspdf-autotable` (used in `RadiologyReportsTab.tsx` for the PDF print, indirectly — the printPdf at line 86-107 is a `window.open(blob)` so jspdf is *not* imported here, good).
- `xlsx` (no radiology import found, good).
- `framer-motion` (no radiology import found, good).

---

## 8. Test coverage gap

**Findings:**
- `apps/frontend/src/pages/radiology/` has **0 test files** (`*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`).
- `apps/frontend/src/components/radiology/` has **0 test files**.
- A grep for `radiology.*test|test.*radiology` across the entire frontend returns **no matches**.

This is in stark contrast to `apps/frontend/src/pages/lab/`, which has 6 test files (`ReceptionTab.test.tsx`, `TestsTab.test.tsx`, `OrdersTab.test.tsx`, `LabPatientsTab.test.tsx`, `LabInvoicesTab.test.tsx`, `LabDashboardTab.test.tsx`).

**Critical untested paths:**
1. `ReceptionTab.tsx` — patient search race conditions, payment flow edge cases.
2. `ScheduleTab.tsx` — patient search effects (the abortable use case), `convert` flow.
3. `StudiesTab.tsx` — `drafts`/`expanded` lifecycle, `advanceStatus` transition validity, payment race.
4. `DicomViewer.tsx` — cornerstone init teardown (critical for memory leaks).
5. `RadiologyReportsTab.tsx` — `runAction` state machine, `nextAction` switch.
6. `shared.ts:fetchJson` — retry/backoff behavior.

**Concrete fix:** Add at minimum:
- `apps/frontend/src/pages/radiology/__tests__/StudiesTab.test.tsx` — render the table, simulate `toggleExpand`, verify draft pruning on refresh.
- `apps/frontend/src/pages/radiology/__tests__/ScheduleTab.test.tsx` — mock `fetchJson`, verify patient search debouncing.
- `apps/frontend/src/utils/__tests__/fetchJson.test.ts` — verify 502 retry, 4xx no-retry, abortable.

---

## 9. Cross-cutting recommendations (small fixes worth doing together)

1. **Extract a `useEntitySearch<T>(endpoint, debounceMs)` hook** in `shared.ts` to consolidate the 4 duplicated search effects (StudiesTab, ScheduleTab, ReceptionTab, PatientSearch in `RadiologyPatientsTab`).
2. **Add a `getAuthHeaders()` export** that includes `X-Company-Id` (already at `shared.ts:38-43`!) and use it from `DicomViewer.tsx:75-79`, `StudiesTab.tsx:72-74`, `RadiologyReportsTab.tsx:90-92`.
3. **Make every modal a `<dialog>`** — focus trap, Escape, backdrop all free.
4. **Add an `AbortController`-aware `fetchJson<T>(url, { signal })`** in `shared.ts` and update all `useEffect`-triggered fetches to pass `signal: ctrl.signal`.
5. **Add pagination** to the 4 largest tables (Studies, Schedule, Patients, Insurance Invoices).
6. **Cap the global retry policy at 1 attempt** for catalog loads, and 0 for mutating calls. Move the policy to a global `useApi` hook.

---

## 10. Severity index (sorted)

| # | Severity | Title | File |
|---|---|---|---|
| 1.1 | P0 | `ReceptionTab.tsx` is dead code | `apps/frontend/src/pages/radiology/ReceptionTab.tsx` |
| 1.2 | P0 | `polysegStub.js` + `@icr/polyseg-wasm` dead deps | `apps/frontend/src/components/radiology/polysegStub.js`, `apps/frontend/package.json:43` |
| 1.3 | P1 | `drafts`/`expanded` grow unbounded | `apps/frontend/src/pages/radiology/StudiesTab.tsx:51-52` |
| 1.4 | P1 | `savePayment` silent-refresh race | `apps/frontend/src/pages/radiology/StudiesTab.tsx:118-137` |
| 1.5 | P1 | `useEffect([refresh])` cascade | `apps/frontend/src/pages/radiology/ScheduleTab.tsx:103-106` |
| 1.6 | P2 | `advanceStatus` hard-coded map | `apps/frontend/src/pages/radiology/StudiesTab.tsx:254-268` |
| 1.7 | P2 | Blob URL revoke timer leak | `apps/frontend/src/pages/radiology/StudiesTab.tsx:100`, `RadiologyReportsTab.tsx:101` |
| 2.1 | P1 | `DicomViewer` engine re-init risk | `apps/frontend/src/components/radiology/DicomViewer.tsx:106-189` |
| 2.2 | P1 | `setStack` loads all images upfront | `apps/frontend/src/components/radiology/DicomViewer.tsx:173` |
| 2.3 | P0 | Hard-coded `limit=200`, no pagination | `apps/frontend/src/pages/radiology/StudiesTab.tsx:174` (and 6 other files) |
| 2.4 | P2 | Patient search fetch not abortable | `apps/frontend/src/pages/radiology/ScheduleTab.tsx:108-120` |
| 2.5 | P1 | `fetchJson` retry thundering herd | `apps/frontend/src/pages/radiology/shared.ts:152-175` |
| 3.2 | P1 | Patient search reset on edit | `apps/frontend/src/pages/radiology/ScheduleTab.tsx:336` |
| 3.3 | P1 | 3-way patient/physician search duplication | multiple files |
| 3.4 | P2 | `window.location.href` full reload | `apps/frontend/src/pages/radiology/ScheduleTab.tsx:184, 227` |
| 3.5 | P2 | `submitCreate` loops PUTs without batching | `apps/frontend/src/pages/radiology/InsuranceInvoicesTab.tsx:141-150` |
| 4.2 | P0 | No focus trap / Escape in modals | every modal in scope |
| 4.3 | P2 | Search dropdowns not keyboard-navigable | `ScheduleTab.tsx:367-376`, `ReceptionTab.tsx:208-216` |
| 4.4 | P2 | No skip-to-content link | `apps/frontend/src/pages/radiology/RadiologyManagementPage.tsx:32` |
| 5.1 | P1 | `InsuranceCompany`/`RadiologyRadiologist` declared 3× | `InsuranceInvoicesTab.tsx:6`, `InsuranceLedgerTab.tsx:6`, `InsuranceCompaniesTab.tsx:6`, `StudiesTab.tsx:26`, `RadiologistsTab.tsx:11` |
| 5.2 | P1 | `fetchJson<T>` bypassed in `ExamTypesTab.tsx:55` | `apps/frontend/src/pages/radiology/ExamTypesTab.tsx:55-56` |
| 5.3 | P2 | `as` casts hide drift | `ScheduleTab.tsx:336`, etc. |
| 6.1 | P1 | Tables unreadable on mobile (`min-w-[1000px]`) | `StudiesTab.tsx:330`, `ScheduleTab.tsx:315`, etc. |
| 6.2 | P2 | DICOM viewer too tall for phones | `DicomViewer.tsx:377` |
| 7.1 | P1 | Dead deps in `package.json` (`@icr/polyseg-wasm`, `dicom-parser`) | `apps/frontend/package.json:43, 58` |
| 7.2 | P1 | Cornerstone chunk not prefetched | `RadiologyViewerModal.tsx:5` |
| 8.0 | P0 | 0 tests for radiology FE | `apps/frontend/src/pages/radiology/` |

---

## 11. Notes on what I could NOT verify (limits of static review)

- **Runtime memory profile of `setStack`** for studies with 600+ slices — needs Chrome DevTools heap snapshot.
- **Actual `cornerstonejs` bundle size on the production build** — needs `npm run build` + `rollup-plugin-visualizer` (already in dev deps at `package.json:126`); run `npm run analyze` to get the treemap.
- **Whether the backend's `studies` endpoint actually returns `{ items, total }` with the `total` field populated** — the FE reads `res.total` but never uses it (`StudiesTab.tsx:181`), so a backend bug here would be silent.
- **Whether the `STUDY_STATUS` map matches the backend's transition rules** — if the backend allows `CANCELLED` from any state, the FE doesn't expose it (see §1.6).

---

## Suggested next step

Pick **2 P0s** to fix first:

1. **§1.1** — Delete `ReceptionTab.tsx` (5 minutes).
2. **§1.2** — Delete `polysegStub.js` + remove `@icr/polyseg-wasm` from `package.json` (5 minutes).
3. **§2.3** — Add a `Pagination` component and thread `page/limit` through `StudiesTab.refresh` (1 hour).
4. **§4.2** — Wrap the 7 modal sites in a shared `<Modal>` component using native `<dialog>` (2 hours).
5. **§8.0** — Add at least one smoke test per tab (1 day).

Then tackle the §3.3 extraction (3-way search hook) which unlocks the cleanest path to writing the missing tests.

---

**End of report.**
