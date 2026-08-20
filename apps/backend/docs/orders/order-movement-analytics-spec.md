# Order Movement Analytics ΓÇö Agent Build Spec

Feature: ╪¬╪¡┘ä┘è┘ä╪º╪¬ ╪¡╪▒┘â╪⌐ ╪¡╪º┘ä╪º╪¬ ╪º┘ä╪╖┘ä╪¿╪º╪¬ (order status movement analytics) ΓÇö 8 analyses, manual vs auto split, 2026-modern UI, placed in the orders-analytics section.

## Shared Backend Context

Already created ΓÇö DO NOT MODIFY these files:

- `apps/backend/services/orderMovementCore.js` (CommonJS). Exports:
  - `fetchOrderMovementData({ companyId, startDate, endDate, maxOrders?, historyTake?, historyFilter? })` ΓåÆ `{ orders, start, end }`. Each order: `{ id, orderNumber, status, total(Number), createdAt, updatedAt, customerName, customerPhone, governorate, sourceType, paymentMethod, confirmedAt, assignedTo, assignedBy, assignedAt, createdBy, createdByName, turboShipmentId, statusHistory: [{status, oldStatus, changedBy, userName, reason, createdAt}] }` sorted asc. Orders are those with a history event intersecting `[start,end]`. `historyFilter:'full'` loads each order's full history (still only orders with a movement in range).
  - `buildTransitions(order, { filterRange, start, end })` ΓåÆ transitions: `{ orderId, orderNumber, status, oldStatus, changedBy, userName, reason, createdAt, auto(boolean), orderTotal(Number), orderStatus, customerName, governorate, paymentMethod, sourceType }`.
  - `normalizeStatus(raw)`, `isAutoChange(entry)`, `normalizeDateRange({startDate,endDate})`, `calcPercentile(sortedArr, pct)`, `calcMean(arr)`, `hoursBetween(a,b)`.
  - Sets: `TERMINAL_STATUSES`, `SUCCESS_STATUSES`, `FAILURE_STATUSES`, `AUTO_ACTOR_MARKERS`. Plus `getSharedPrismaClient()`.
- `apps/backend/routes/orderMovementRoutes.js` ΓÇö wires `GET /api/v1/analytics/order-movement/<slug>` ΓåÆ your controller. `authenticateToken` already applied. DO NOT EDIT.
- server.js already mounts `/api/v1/analytics/order-movement`. DO NOT EDIT.

### Your controller (backend)
- CommonJS. `const express = require('express'); const router = express.Router();`
- Export `module.exports = router;` with EXACTLY ONE route `router.get('/', async (req, res) => {...})` for your slug.
- `const core = require('../../services/orderMovementCore');`
- Read `companyId = req.user?.companyId` ΓåÆ if missing `return res.status(403).json({ success:false, message:'╪║┘è╪▒ ┘à╪╡╪▒╪¡' })`.
- Read `startDate`, `endDate`, `mode` from `req.query`. `mode` Γêê `'all'|'manual'|'auto'`. Helper to filter transitions by mode:
  ```js
  const filterByMode = (transitions, mode) => mode === 'manual' ? transitions.filter(t => !t.auto) : mode === 'auto' ? transitions.filter(t => t.auto) : transitions;
  ```
- Response envelope: `res.json({ success:true, data: {...} })`. Errors: `res.status(500).json({ success:false, message })`.
- Wrap in try/catch. Arabic error messages. No comments in code.
- Date parsing: `const { start, end } = core.normalizeDateRange({ startDate, endDate });`

## Shared Frontend Context

Already created ΓÇö DO NOT MODIFY:
- `apps/frontend/src/pages/Analytics/orders/orderMovement/orderMovementShared.tsx`. Exports:
  - Types: `MovementFilterProps { startDate; endDate; mode: 'all'|'manual'|'auto' }`, `MovementHistoryEntry`.
  - `fetchMovement<T>(path, params)` ΓåÆ GET `/analytics/order-movement/{path}` returns `data` payload.
  - `getStatusLabel(code)`, `getStatusColorClass(code)`, `statusChartColor(code,index)`.
  - Formatters: `formatNumber`, `formatCurrency`, `formatPercent`, `formatDuration(hours)`, `formatDate`, `formatDateTime`.
  - `CHART_TOOLTIP_STYLE`.
  - Components: `MovementCard`, `KpiCard`, `StatusPill`, `AutoBadge`, `LoadingState`, `ErrorState`, `EmptyState`, `ModeToggle`.
- Parent page `apps/frontend/src/pages/Analytics/orders/orderMovement/OrderMovementPage.tsx` lazy-imports `./tabs/<Name>Tab`. The tab receives `{ startDate, endDate, mode }` as props.

### Your frontend tab
- File: `apps/frontend/src/pages/Analytics/orders/orderMovement/tabs/<Name>Tab.tsx` (match filename EXACTLY as given below).
- Signature: `export default function <Name>Tab({ startDate, endDate, mode }: MovementFilterProps)`.
- Fetch via `const data = await fetchMovement('<slug>', { startDate, endDate, mode });`
- UI requirements (2026-standard):
  - Arabic RTL (`dir` inherited from app), Tailwind, `lucide-react` icons, `recharts` (v3.8.0) for charts.
  - Use the shared components above for consistency. Accent gradients indigoΓåÆviolet. `rounded-2xl` cards, soft shadows, subtle borders, hover transitions. Full dark-mode support.
  - Loading ΓåÆ `<LoadingState />`, error ΓåÆ `<ErrorState message={...} onRetry={...} />`, empty ΓåÆ `<EmptyState />`.
  - Recharts custom tooltips use `contentStyle={CHART_TOOLTIP_STYLE}`.
- TypeScript strict. NO comments. NO new dependencies. Do not touch `statusRegistry.ts`.
- Show the manual/auto split visually wherever it adds value (AutoBadge, stacked bars, legend).

## Backend tests
- File: `apps/backend/tests/controller/orderMovement/<name>.test.js` (jest, CommonJS).
- Mock the core: `jest.mock('../../services/orderMovementCore', () => ({ fetchOrderMovementData: jest.fn(), buildTransitions: jest.fn(), normalizeDateRange: jest.fn(), normalizeStatus: jest.fn((s)=>String(s||'').trim().toUpperCase()), calcPercentile: jest.fn(), calcMean: jest.fn((a)=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0), hoursBetween: jest.fn(), TERMINAL_STATUSES: new Set([...]), SUCCESS_STATUSES: new Set([...]), FAILURE_STATUSES: new Set([...]), getSharedPrismaClient: jest.fn() }))`.
  Build a fake `buildTransitions` that maps your fixture orders to transitions (mirror real logic simply). Mock `getSharedPrismaClient()` for controllers that query other models (matrix/team/aging/approvals).
- Follow the pattern in `apps/backend/tests/controller/analyticsController.cancellations.test.js` (fake `req`/`res`, `createResponse` helper).
- Cover: happy path, empty data, 403 missing companyId, mode filtering, and your analysis's core computation.
- Verify: `node --check apps/backend/controller/orderMovement/<name>Controller.js` and run `npx jest tests/controller/orderMovement/<name>.test.js --runInBand --forceExit`.

## Constraints
- Touch ONLY your 3 files: your controller, your test, your tab component.
- Do NOT edit: server.js, orderMovementRoutes.js, orderMovementCore.js, orderMovementShared.tsx, OrderMovementPage.tsx, App.tsx, sidebar.ts, index.ts, statusRegistry.ts, or any other agent's files.
- Return a concise summary: files created, `node --check` result, jest result.

---

# Per-Analysis Contracts

## 1. Status Matrix ΓÇö slug `matrix` ΓÇö controller `statusMatrixController.js` ΓÇö tab `StatusMatrixTab.tsx`

Get orders via `fetchOrderMovementData({ companyId, startDate, endDate })`, `buildTransitions(order, { start, end })`, filter by mode.

Classification of each transition (fromStatusΓåÆtoStatus), where `from = t.oldStatus` (may be null), `to = t.status`:
```js
const CANONICAL = ['PENDING','DRAFT','CONFIRMED','SCHEDULED','PENDING_PREPARATION','PREPARING','READY','QUALITY_CHECK','PACKAGED','READY_TO_SHIP','PROCESSING','SHIPPED','OUT_FOR_DELIVERY','PARTIALLY_DELIVERED','DELIVERED','REFUNDED','RETURNED','PARTIALLY_RETURNED','EXCHANGED','CANCELLED','DUPLICATE_ORDER','LOST','TRASH','NOT_SHIPPED','ON_HOLD','ON_HOLD_PREP','STOCK_SHORTAGE','SHORTAGE_FAILED','PENDING_CANCELLATION'];
```
- `from` null ΓåÆ `kind='start'`.
- `from===to` ΓåÆ `kind='same'`.
- both in CANONICAL: `idx(to)>idx(from)` ΓåÆ `kind='skip'` if `idx(to)-idx(from)>1` else `'forward'`; `idx(to)<idx(from)` ΓåÆ `'backward'`.
- else ΓåÆ `'other'`.
- Then the **invalid** check OVERRIDES kind: query the company's allowed transitions and flag as `'invalid'`:
  ```js
  const prisma = core.getSharedPrismaClient();
  const configs = await prisma.orderStatusConfig.findMany({ where: { companyId, isActive: true }, select: { code: true, allowedNextStatuses: true } });
  // build map code ΓåÆ parsed allowedNextStatuses (JSON array string or null)
  ```
  For a transition whose `from` status has a config with a non-empty allowedNextStatuses list, if `to` is not in the list ΓåÆ `'invalid'`. (If the `from` status has no config or empty list, leave the kind computed above.)

Response `data`:
```js
{
  totalTransitions, totalOrders,
  forwardCount, backwardCount, skipCount, invalidCount, startCount, sameCount, otherCount,
  rows: [{ fromStatus, toStatus, count, revenue, manualCount, autoCount, kind }], // fromStatus null ΓåÆ '__start__'
  statuses: [...unique status codes, ordered: first occurrence in CANONICAL, then alphabetical],
  modes: { manual, auto } // transition counts by mode
}
```
Aggregate rows by `(fromStatus||'__start__', toStatus)`; `revenue` = sum of `orderTotal`; sort by `count` desc, then kind priority invalid > backward > skip > forward > start > same > other.

## 2. Sankey ΓÇö slug `sankey` ΓÇö controller `sankeyController.js` ΓÇö tab `SankeyTab.tsx`

Transitions as above. Response `data`:
```js
{
  totalTransitions, totalOrders,
  modes: { manual, auto },
  nodes: [{ id, name }],                       // 'START' first (name '╪¿╪»╪º┘è╪⌐'), then statuses sorted by total outflow desc
  links: [{ source, target, value, manual, auto, revenue }], // source/target are node indices; value = count
  topInflows: [{ status, count }],             // by toStatus (excluding START)
  topOutflows: [{ status, count }]             // by fromStatus (excluding START)
}
```
- Entry transitions (from null) connect from the `START` node.
- Only include statuses with ΓëÑ1 link; drop isolated nodes.
- Frontend: render with recharts `<Sankey data={{ nodes, links }} nodePadding={28} linkCurvature={0.6}>` with custom node fill from `statusChartColor`, a `Tooltip` showing count / manual / auto / revenue, plus KPI cards (╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä╪¡╪▒┘â╪º╪¬╪î ╪º┘ä╪╖┘ä╪¿╪º╪¬╪î ┘è╪»┘ê┘è╪î ╪¬┘ä┘é╪º╪ª┘è) and the top inflows/outflows lists. If recharts Sankey fails to render in build, fall back to a clean custom horizontal flow visualization (CSS bars per status with colored connectors) ΓÇö keep it simple and robust.

## 3. Paths ΓÇö slug `paths` ΓÇö controller `pathsController.js` ΓÇö tab `PathsTab.tsx`

Build a path string per order from its (mode-filtered, range-filtered) transitions in asc order. Only orders with ΓëÑ1 transition are counted. `path = statuses.join('ΓåÆ')` (use the statuses AFTER filtering). If an order's filtered transitions are empty ΓåÆ skip.

Response `data`:
```js
{
  totalOrders, uniquePaths,
  stats: { maxPathLength, avgPathLength, successPathCount, failedPathCount, pendingPathCount },
  topPaths: [{ path, orderCount, percent, avgHours, medianHours, avgOrderValue, totalRevenue, terminalStatus, manualTransitions, autoTransitions }]
}
```
- `terminalStatus` = last status of path. Success if in `SUCCESS_STATUSES`, failure if in `FAILURE_STATUSES`.
- `avgHours` = mean of `hoursBetween(order.createdAt, lastTransition.createdAt)` per order in the path.
- `medianHours` via `calcPercentile` on sorted values.
- Top 15 by orderCount.
Frontend: table of top paths (path as a horizontal chain of StatusPills), progress bar for percent, plus KPI cards (╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä╪╖┘ä╪¿╪º╪¬╪î ╪╣╪»╪» ╪º┘ä┘à╪│╪º╪▒╪º╪¬╪î ╪ú╪╖┘ê┘ä ┘à╪│╪º╪▒╪î ┘à╪¬┘ê╪│╪╖ ╪º┘ä╪╖┘ê┘ä) and a success/failed/pending donut (PieChart).

## 4. Dwell Time ΓÇö slug `dwell-time` ΓÇö controller `dwellTimeController.js` ΓÇö tab `DwellTimeTab.tsx`

Use `fetchOrderMovementData({ companyId, startDate, endDate, historyFilter: 'full', maxOrders: 15000 })`. For each order, iterate its full history asc: for `i` in `[0..history.length-2]`, dwell sample for `history[i].status` = `hoursBetween(history[i].createdAt, history[i+1].createdAt)`, classified manual/auto by `history[i+1].auto`. Ignore samples `> 2160` hours (90 days) as outliers. Also skip the "open" last dwell.

Response `data`:
```js
{
  totalOrders,
  statuses: [{ status, entries, avgHours, p50Hours, p90Hours, maxHours, manualEntries, autoEntries }],
  cycleTime: { avgHours, p50Hours, p90Hours, sampleSize, manualAvgHours, autoAvgHours }
}
```
- `cycleTime`: per order reaching a TERMINAL status (last history status in TERMINAL_STATUSES), hours = `hoursBetween(order.createdAt, lastHistory.createdAt)`; sampleSize = orders counted.
Frontend: horizontal bar list per status (avg with p90 marker), KPI cards (╪ú╪¿╪╖╪ú ╪¡╪º┘ä╪⌐╪î ╪ú╪│╪▒╪╣ ╪¡╪º┘ä╪⌐╪î ┘à╪¬┘ê╪│╪╖ ╪▓┘à┘å ╪º┘ä╪»┘ê╪▒╪⌐╪î ╪╣┘è┘å╪º╪¬)╪î and a bar chart of avg by status. Highlight statuses with high p90.

## 5. Outcomes ΓÇö slug `outcomes` ΓÇö controller `outcomesController.js` ΓÇö tab `OutcomesTab.tsx`

Outcome = current `order.status` (last known). Response `data`:
```js
{
  summary: { totalOrders, delivered, failed, pending, successRate, deliveredRevenue, lostRevenue, failedRevenue },
  outcomes: [{ status, count, percent, revenue, avgOrderValue, isTerminal }],
  reasons: [{ reason, count, revenue, status }],
  modeSplit: { manual, auto }
}
```
- `delivered` = count where status in SUCCESS_STATUSES; `failed` = FAILURE_STATUSES; `pending` = the rest. `lostRevenue` = sum total of orders whose status is in FAILURE_STATUSES; `failedRevenue` same value; `deliveredRevenue` = sum for SUCCESS.
- `reasons`: from the LAST history entry of each order whose status is a failure status ΓÇö group by `reason` (normalize whitespace, skip empty), with status = that order's status.
- `modeSplit`: classify each order by its LAST history entry `auto`.
Frontend: KPI cards (╪Ñ╪¼┘à╪º┘ä┘è╪î ┘à┘Å╪│┘ä┘Ä┘æ┘à╪î ┘ü╪º╪┤┘ä╪î ┘å╪│╪¿╪⌐ ╪º┘ä┘å╪¼╪º╪¡╪î ╪º┘ä╪Ñ┘è╪▒╪º╪» ╪º┘ä╪╢╪º╪ª╪╣), donut of outcomes, bar chart of outcomes vs revenue, and a reasons table with counts.

## 6. Team ΓÇö slug `team` ΓÇö controller `teamController.js` ΓÇö tab `TeamTab.tsx`

Group transitions by actor = `userName || changedBy`. Manual actors from manual transitions; the auto transitions form a synthetic member `{ name: '╪º┘ä┘å╪╕╪º┘à (╪¬┘ä┘é╪º╪ª┘è)', changedBy: 'SYSTEM_AUTO', isSystem: true }` when count > 0. Response `data`:
```js
{
  summary: { totalTransitions, manualTransitions, autoTransitions, activeMembers },
  members: [{ name, changedBy, transitions, manualTransitions, autoTransitions, confirms, cancels, deliveries, invalidTransitions, avgHoursToConfirm, avgHoursToCancel, revenue, isSystem }]
}
```
- `confirms` = transitions to `CONFIRMED`; `cancels` = to a status in FAILURE_STATUSES; `deliveries` = to `DELIVERED`.
- `avgHoursToConfirm`: per member, across orders, `hoursBetween(order.createdAt, firstTransitionToCONFIRMED.createdAt)`.
- `avgHoursToCancel`: same for the first transition to a failure status.
- `revenue` = sum of `orderTotal` of orders touched by the member (unique orders).
- `invalidTransitions`: reuse the allowedNextStatuses config check (same as matrix) counting violations per member.
- Sort members by `transitions` desc.
Frontend: leaderboard table with rank, name, AutoBadge, KPIs per row; KPI cards (╪¡╪▒┘â╪º╪¬ ┘è╪»┘ê┘è╪⌐/╪¬┘ä┘é╪º╪ª┘è╪⌐/╪╣╪»╪» ╪º┘ä╪ú╪╣╪╢╪º╪í); bar chart of transitions by member; highlight confirms vs cancels ratio.

## 7. Aging ΓÇö slug `aging` ΓÇö controller `agingController.js` ΓÇö tab `AgingTab.tsx`

Stuck orders: current status NOT in `TERMINAL_STATUSES`, and the order's LAST history entry is older than `minAgeHours` (query param, default 24). Orders still limited to those with movement in `[startDate,endDate]`. Response `data`:
```js
{
  summary: { totalAged, oldestHours, totalRevenue, stuckOver7d },
  buckets: [{ key, label, count, revenue }],
  orders: [{ orderId, orderNumber, status, ageHours, total, customerName, governorate, lastTransitionAt, lastTransitionBy, lastTransitionAuto, updatedAt }]  // limit 100, sorted by ageHours desc
}
```
- `ageHours` = `hoursBetween(lastHistoryEntry.createdAt, now)`. `lastTransitionBy` = that entry's `userName||changedBy`; `lastTransitionAuto` = entry.auto.
- Buckets: `['<1d','1-3d','3-7d','7-30d','>30d']` labels `╪ú┘é┘ä ┘à┘å ┘è┘ê┘à / 1-3 ╪ú┘è╪º┘à / 3-7 ╪ú┘è╪º┘à / 7-30 ┘è┘ê┘à / ╪ú┘â╪½╪▒ ┘à┘å 30 ┘è┘ê┘à`.
- `stuckOver7d` = count in buckets `7-30d` + `>30d`.
Frontend: KPI cards (╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä┘à╪╣┘ä┘é╪î ╪º┘ä╪ú┘é╪»┘à╪î ┘é┘è┘à╪⌐ ╪º┘ä┘ü┘ä┘ê╪│ ╪º┘ä┘à╪¡╪¿┘ê╪│╪⌐╪î ╪ú┘â╪½╪▒ ┘à┘å ╪ú╪│╪¿┘ê╪╣), bucket bars, and the orders table (StatusPill, AutoBadge, formatDuration, formatCurrency).

## 8. Approvals ΓÇö slug `approvals` ΓÇö controller `approvalsController.js` ΓÇö tab `ApprovalsTab.tsx`

Query `prisma.orderStatusChangeRequest` scoped to companyId with `createdAt` in range, include: `order: { select: { orderNumber: true } }`, `fromStatus: { select: { name: true, code: true } }`, `toStatus: { select: { name: true, code: true } }`, `requestor: { select: { firstName: true, lastName: true } }`, `reviewer: { select: { firstName: true, lastName: true } }`. Order by `createdAt` asc, `take: 200`.

Overrides: `prisma.orderWorkflowAuditLog.count({ where: { companyId, createdAt: rangeWhere, changeType: 'override' } })` ΓÇö use `core.buildHistoryRangeWhere({ start, end })`.

Response `data`:
```js
{
  summary: { totalRequests, pending, approved, rejected, approvalRate, avgReviewHours, totalOverrides },
  requests: [{ id, orderId, orderNumber, requestedBy, requestedByName, fromStatus, toStatus, reason, status, reviewedBy, reviewedByName, reviewedAt, createdAt }],
  reviewers: [{ name, reviewedCount, approved, rejected, avgReviewHours }]
}
```
- `requestedByName` = `${firstName} ${lastName}` (fallback requestedBy id). `avgReviewHours` = mean of `hoursBetween(createdAt, reviewedAt)` over reviewed requests.
- `reviewers` grouped by reviewer name.
Frontend: KPI cards (╪╖┘ä╪¿╪º╪¬╪î ╪¿╪º┘å╪¬╪╕╪º╪▒╪î ┘à┘ê╪º┘ü┘é ╪╣┘ä┘è┘ç╪º╪î ┘à╪▒┘ü┘ê╪╢╪⌐╪î ┘à╪╣╪»┘ä ╪º┘ä┘à┘ê╪º┘ü┘é╪⌐╪î ┘à╪¬┘ê╪│╪╖ ╪▓┘à┘å ╪º┘ä┘à╪▒╪º╪¼╪╣╪⌐╪î ╪¬╪¼╪º┘ê╪▓╪º╪¬)╪î a status-donut, and the requests table (StatusPill for fromΓåÆto, reason, reviewer, dates). Highlight pending rows.
