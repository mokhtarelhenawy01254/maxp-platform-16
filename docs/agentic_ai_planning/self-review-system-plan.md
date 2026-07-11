# Plan: Self-Review System with Log Dashboard

**Generated**: 2026-07-11
**Estimated Complexity**: Medium

## Overview

إضافة LLM-as-Judge self-review على كل رد قبل ما يخرج للعميل، مع تسجيل كل قرارات المراجعة في قاعدة البيانات ولوحة تحكم متقدمة للمراقبة وتحليل الأخطاء.

**المكونات:**
- **Self-Review Engine**: داخل `validate_reply.py` — يراجع الرد قبل الإرسال (قوانين التاجر + دقة المعلومة + النبرة)
- **Review Log DB**: جدول في `ai` schema — يسجل كل review decision
- **REST API**: 3 endpoints للـ dashboard
- **UI Dashboard**: صفحة Super Admin متكاملة مع فلترة متقدمة + إحصائيات + Export CSV

## Prerequisites

- Python 3.12+ وأدوات التطبيع
- Postgres access (ai schema)
- Flash model keys configured (Gemini Flash / DeepSeek Flash)
- Node.js 20 للـ frontend

## Objectives (الأهداف)

| الهدف | مؤشر النجاح | مؤشر الفشل |
|-------|-------------|------------|
| **منع المخالفات** | < 1% من الردود تخالف قوانين التاجر | > 5% مخالفات أو معدلات false positives عالية |
| **الشفافية** | كل review decision مسجل مع السبب كامل | بيانات مفقودة أو غير قابلة للربط بالـ conversation |
| **قابلية القياس** | dashboard يظهر الاتجاهات وأكثر الأخطاء شيوعاً | بيانات غير دقيقة إحصائياً أو فلاتر لا تعمل |
| **صفر تأثير على زمن الاستجابة** | زيادة < 500ms (بفضل Flash model) | زيادة > 2s أو توقف الخدمة عند فشل الـ reviewer |
| **صفر false negatives** | لا يمر رد مخالف بدون رصد | الـ reviewer يوافق على ردود مخالفة بانتظام |
| **صيانة منخفضة** | لا تدخل يدوي مطلوب | يحتاج تعديل برومبت الـ review كل أسبوع |

## Sprint 1: Self-Review Engine

**Goal**: بناء آلية المراجعة داخل `validate_reply.py` — LLM call واحد مع Fallback وتكامل مع آلية الـ correction الموجودة.

**Demo/Validation**:
- إرسال رسالة تخالف قوانين التاجر → الـ review يرفضها → silent escalation
- إرسال رسالة سليمة → تمر عادي
- لو الـ Flash model واقع → fail-open والرد يمر

### Task 1.1: إضافة `_get_flash_review_client()`

- **Location**: `apps/ai-service/src/pipeline/stages/validate_reply.py`
- **Description**: دالة تختار Flash model رخيص للمراجعة (Gemini 2.5 Flash → DeepSeek Flash → GPT-5.4 nano → fallback لنفس model الـ agent)
- **Dependencies**: None
- **Acceptance Criteria**:
  - تجرب models بالترتيب المحدد
  - أول model متاح مع key نشط تستخدمه
  - لو كلهم فشلوا → ترجع None والـ review يتخطى
- **Validation**: `await _get_flash_review_client(ctx)` يرجع `LLMClient` أو `None`

### Task 1.2: إضافة `_self_review()` دالة المراجعة

- **Location**: `apps/ai-service/src/pipeline/stages/validate_reply.py`
- **Description**: دالة تستقبل `ctx` و `reply`، تجيب قوانين التاجر + tool evidence، تبني برومبت review، تستدعي Flash model، ترجع `None` (الرد مقبول) أو رد مصحح (من `_correct_output`)
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
  - برومبت المراجعة يشيك على: (1) قوانين التاجر (2) دقة المعلومة (3) النبرة واللغة
  - لو الـ review وافق → ترجع None
  - لو رفض → تستخدم `_correct_output()` الموجود
  - لو فشل الـ JSON parsing → fail-open
- **Validation**: Test manually مع رسالة واضحة المخالفة

### Task 1.3: إضافة `_summarize_evidence()` لدعم دقة المعلومة

- **Location**: `apps/ai-service/src/pipeline/stages/validate_reply.py`
- **Description**: دالة تأخذ `ctx.tool_evidence` وتحوله إلى نص مختصر لبرومبت الـ review
- **Dependencies**: None
- **Acceptance Criteria**:
  - تستخرج tool name + key results
  - لو الإيفيدنس طويل → تلخصه في < 500 characters
  - لو مافيش evidence → ترجع "(لا توجد أدوات مستخدمة)"
- **Validation**: تمرير tool_evidence وهمي → تلخيص صحيح

### Task 1.4: دمج `_self_review` في `validate_reply()`

- **Location**: `apps/ai-service/src/pipeline/stages/validate_reply.py`
- **Description**: إضافة استدعاء `_self_review()` بعد output guardrails وقبل schema validation
- **Dependencies**: Task 1.2
- **Acceptance Criteria**:
  - الـ review يشتغل بعد الـ internal syntax guardrail وقبل merchant_rules validate
  - لو الـ review رفض → يدخل في دورة `_correct_output` الموجودة
  - لو استنفد retries → silent escalation (موجود)
  - ما يأثرش على الـ `early_return` flow الحالي
- **Validation**: Pipeline test مع رسالة مخالفة

### Task 1.5: إضافة structured logging للـ review

- **Location**: `apps/ai-service/src/pipeline/stages/validate_reply.py`
- **Description**: إضافة `logger.info("self_review.verdict", approved=..., agent_slug=..., company_id=..., ...)` في كل مسار
- **Dependencies**: Task 1.4
- **Acceptance Criteria**:
  - يسجل في كل حالة: approved/رفض/correction/escalation
  - يحتوي على: agent_slug, company_id, reason, violations, latency_ms
  - ما يسجلش个人信息 protected
- **Validation**: تشغيل pipeline → التحقق من `pm2 logs`

## Sprint 2: Review Log Database

**Goal**: تسجيل كل review decision في Postgres للاستعلام والتحليل.

**Demo/Validation**:
- كل review decision يكتب في DB
- الاستعلام عن logs بالـ agent, company, date range, status

### Task 2.1: إنشاء نموذج الـ Database

- **Location**: `apps/ai-service/src/db/models/self_review_log.py`
- **Description**: SQLAlchemy model لجدول `ai.self_review_logs`
- **Columns**:
  - `id` UUID PK
  - `company_id` text NOT NULL
  - `agent_slug` text NOT NULL
  - `agent_id` text (nullable — reference to ai.agents)
  - `thread_id` text NOT NULL
  - `original_reply` text
  - `review_status` text: "approved" | "corrected" | "escalated"
  - `review_reason` text (nullable — سبب الرفض)
  - `review_violations` JSONB (nullable — list of violations)
  - `reviewer_model` text (model used for review)
  - `llm_latency_ms` int (nullable)
  - `correction_attempted` bool default false
  - `correction_success` bool default false
  - `final_reply` text (nullable — الرد النهائي بعد correction)
  - `created_at` timestamptz default now()
- **Dependencies**: None
- **Acceptance Criteria**:
  - Model يطابق الـ schema
  - Indexes على: created_at, company_id, agent_slug, review_status
- **Validation**: `python -c "from src.db.models.self_review_log import SelfReviewLog; print('OK')"`

### Task 2.2: إنشاء Repository

- **Location**: `apps/ai-service/src/db/repo/self_review_repo.py`
- **Description**: class `SelfReviewRepo` مع دوال CRUD + استعلامات aggregation
- **Methods**:
  - `create_log(data: dict)` → insert
  - `list_logs(filters: dict, page, limit)` → paginated list
  - `get_stats(filters: dict)` → aggregation query (total approved/rejected/corrected, top violations, top agents)
  - `export_csv(filters: dict)` → كل logs للتزيل
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - Pagination تعمل بشكل صحيح
  - الـ filters: date_from, date_to, company_id, agent_slug, review_status
  - Stats ترجع: total, approved_count, corrected_count, escalated_count, top_violations[{reason, count}], top_agents[{slug, count}]
- **Validation**: `pytest` مع sample data أو manual test مع DB

### Task 2.3: ربط الـ logging مع الـ self-review

- **Location**: `apps/ai-service/src/pipeline/stages/validate_reply.py` + `apps/ai-service/src/db/repo/self_review_repo.py`
- **Description**: بعد كل review decision, استدعاء `SelfReviewRepo.create_log()` بشكل async (fire-and-forget أو في task queue)
- **Dependencies**: Task 1.4, Task 2.2
- **Acceptance Criteria**:
  - كل review decision يكتب في DB
  - لو فشل كتابة DB → يسجل warning فقط (لا يعطل الـ response)
  - Performance: الكتابة تكون async ولا تزود latency
- **Validation**: تشغيل agent → التحقق من وجود records في DB

## Sprint 3: REST API Endpoints

**Goal**: 3 endpoints لخدمة dashboard.

**Demo/Validation**:
- `curl /admin/self-review/logs?page=1&limit=20` → JSON paginated
- `curl /admin/self-review/stats?days=7` → stats
- `curl /admin/self-review/logs/export?date_from=...` → CSV

### Task 3.1: إضافة Endpoint قائمة logs

- **Location**: `apps/ai-service/src/api/admin/self_review.py`
- **Description**: `GET /admin/self-review/logs` مع pagination, filtering (date_from, date_to, company_id, agent_slug, status), sorting
- **Response**: `{ success: true, data: { logs: [...], total, page, limit, total_pages } }`
- **Dependencies**: Task 2.2
- **Acceptance Criteria**:
  - Paginated
  - Filters: date range, company, agent slug, status (approved/corrected/escalated)
  - Sort: newest first (default)
  - Company auto-scoped لـ super admin
- **Validation**: curl مع فلاتر مختلفة

### Task 3.2: إضافة Endpoint الإحصائيات

- **Location**: `apps/ai-service/src/api/admin/self_review.py`
- **Description**: `GET /admin/self-review/stats` — إحصائيات مجمّعة
- **Response**: `{ total, approved_count, corrected_count, escalated_count, top_violations: [{reason, count}], top_agents: [{slug, count}], daily_trend: [{date, total, approved, corrected, escalated}] }`
- **Dependencies**: Task 2.2
- **Acceptance Criteria**:
  - توزيع الحالات (approved/corrected/escalated) بالنسبة المئوية
  - أكثر الانتهاكات شيوعاً (top 10)
  - أكثر الـ agents مخالفة (top 10)
  - الاتجاه اليومي (آخر 30 يوم)
- **Validation**: curl والتحقق من الأرقام مع known data

### Task 3.3: إضافة Endpoint Export CSV

- **Location**: `apps/ai-service/src/api/admin/self_review.py`
- **Description**: `GET /admin/self-review/logs/export` — يعيد CSV مع headers
- **Response**: `Content-Type: text/csv` مع header `Content-Disposition: attachment`
- **Dependencies**: Task 3.1
- **Acceptance Criteria**:
  - CSV headers: timestamp, company_id, agent_slug, thread_id, review_status, reason, violations, reviewer_model, latency_ms
  - يقبل نفس filters الـ logs
- **Validation**: curl → يفتح في Excel

### Task 3.4: تسجيل الـ API routes

- **Location**: `apps/ai-service/src/api/admin/__init__.py`
- **Description**: إضافة router prefix `/admin/self-review` وتسجيله في التطبيق
- **Dependencies**: Task 3.1
- **Acceptance Criteria**:
  - الـ endpoints متاحة تحت `/api/v1/ai-admin/self-review/*`
- **Validation**: curl تحت الـ URL الصحيح

## Sprint 4: Log Dashboard UI

**Goal**: صفحة Super Admin متكاملة لعرض logs المراجعة مع فلترة متقدمة وإحصائيات

**Demo/Validation**:
- التصفح مع فلاتر (تاريخ, agent, status, شركة)
- عرض الإحصائيات (نسبة القبول/الرفض, أكثر الانتهاكات, اتجاهات)
- Export CSV
- تفاصيل كل log

### Task 4.1: إضافة i18n strings

- **Location**: `apps/frontend/src/locales/ar/sections/superAdmin.json`, `.../en/...`
- **Description**: إضافة keys لصفحة self-review logs
- **Keys**:
  - `selfReview.title`, `selfReview.description`
  - `selfReview.sidebar`
  - `selfReview.filters.*`, `selfReview.table.*`
  - `selfReview.stats.*`, `selfReview.statusLabels.*`
  - `selfReview.export`, `selfReview.detail.*`
- **Dependencies**: None
- **Acceptance Criteria**:
  - Arabic strings مضافة ومتدققة
  - English strings صحيحة
- **Validation**: فتح الصفحة مع تغيير اللغة

### Task 4.2: إنشاء صفحة الـ Dashboard

- **Location**: `apps/frontend/src/pages/super-admin/SuperAdminSelfReviewLogs.tsx`
- **Description**: صفحة رئيسية تنقسم إلى:
  - **Stats Section**: 4 كروت علوية:
    - إجمالي المراجعات
    - % القبول
    - % التصحيح
    - % الإسكليشن
  - **Chart Section**: رسم بياني للاتجاه اليومي (recharts AreaChart)
  - **Violations Section**: قائمة بأكثر الانتهاكات (مرتبة)
  - **Filter Bar**: تاريخ (date picker × 2)، agent slug (dropdown)، status (dropdown)، شركة (dropdown / search)
  - **Logs Table**: عمود timestamp، agent، status (badge ملون)، سبب الرفض (مختصر)، عرض التفاصيل
- **Dependencies**: Task 4.1, Task 4.4 (api client)
- **Acceptance Criteria**:
  - Stats تظهر بشكل صحيح
  - الفلاتر تحدث الجدول والإحصائيات معاً
  - الرسوم البيانية تظهر
  - الجدول مع pagination
  - متوافق مع الـ RTL والtheme
  - Status badges: approved (أخضر), corrected (برتقالي), escalated (أحمر)
- **Validation**: فتح الصفحة مع بيانات حقيقية أو mock

### Task 4.3: إضافة صفحة تفاصيل الـ Log

- **Location**: `apps/frontend/src/pages/super-admin/SuperAdminSelfReviewLogDetail.tsx`
- **Description**: صفحة تفاصيل مراجعة واحدة:
  - رسالة العميل الأصلية
  - رد الـ agent
  - نتيجة المراجعة (approved/corrected/escalated)
  - سبب الرفض
  - الانتهاكات الكاملة
  - الرد المصحح (إن وجد)
  - الـ model المستخدم للمراجعة + زمن الاستجابة
  - رابط للـ conversation
- **Dependencies**: Task 4.2
- **Acceptance Criteria**:
  - عرض كل حقول الـ log
  - تنسيق مناسب للعرض
  - رابط للـ thread (إن أمكن)
- **Validation**: فتح صفحة تفاصيل log

### Task 4.4: إنشاء API Service

- **Location**: `apps/frontend/src/services/selfReviewService.ts`
- **Description**: Service module مع دوال:
  - `getLogs(filters: SelfReviewFilters): Promise<PaginatedResult>`
  - `getStats(filters: Partial<SelfReviewFilters>): Promise<StatsResult>`
  - `getLogDetail(id: string): Promise<LogDetail>`
  - `exportCsv(filters: SelfReviewFilters): Promise<Blob>`
- **Dependencies**: None
- **Acceptance Criteria**:
  - Axios calls مع correct endpoints
  - Error handling
  - TypeScript types
- **Validation**: Integration test مع mock API

### Task 4.5: إضافة Route + Sidebar

- **Location**: `apps/frontend/src/App.tsx` (route), `apps/frontend/src/components/layout/SuperAdminSidebar.tsx` (sidebar)
- **Description**: تسجيل route `/super-admin/self-review` وإضافة sidebar link
- **Dependencies**: Tasks 4.2, 4.3
- **Acceptance Criteria**:
  - Route يعمل تحت `/super-admin/self-review`
  - Sidebar link في قسم "AI Models" أو قسم جديد مناسب
  - Lazy loading مع `React.lazy`
- **Validation**: فتح الرابط من الـ sidebar

## Sprint 5: Polish & Deploy

**Goal**: اختبار متكامل + نشر + مراقبة.

**Demo/Validation**:
- End-to-end flow: رسالة → self-review → log → dashboard
- Performance metrics
- All edge cases tested

### Task 5.1: اختبار End-to-End

- **Description**: اختبار manual للـ flow الكامل
- **Checklist**:
  - إرسال رسالة عادية → approved في DB
  - إرسال رسالة تخالف قوانين التاجر → corrected أو escalated في DB
  - التحقق من الـ dashboard يعرض البيانات
  - Export CSV يعمل
  - الفلاتر تشتغل
- **Dependencies**: Sprint 4 completes
- **Acceptance Criteria**: All checklist items pass

### Task 5.2: نشر (Deploy)

- **Description**: commit + push + deploy
- **Steps**:
  1. `git add` ملفات ai-service (validate_reply.py, db/models, db/repo, api/admin)
  2. `git add` ملفات frontend (page, service, i18n, route, sidebar)
  3. Commit و push
  4. مراقبة الـ PM2 logs بعد الـ deploy
  5. مراقبة الـ self-review logs عبر dashboard
- **Dependencies**: Task 5.1
- **Acceptance Criteria**: AI service يعيد التشغيل بنجاح

### Task 5.3: مراقبة (Monitoring)

- **Description**: متابعة الـ self-review performance بعد النشر
- **Checklist**:
  - PM2 logs خالية من الأخطاء
  - الـ review latency < 500ms في المتوسط
  - لو ظهرت مشاكل، fail-open يحمي العميل
- **Dependencies**: Task 5.2
- **Acceptance Criteria**: أسبوع من التشغيل المستقر

## Testing Strategy

| Sprint | نوع | ماذا نختبر |
|--------|------|-----------|
| 1 | Unit/Pipeline | LLM call وهمي → التحقق من مسار approved/corrected/escalated |
| 1 | Manual | إرسال رسالة مخالفة → silent escalation |
| 2 | Unit/Python | CRUD الـ DB مع test DB |
| 2 | Integration | كتابة log + استعلام مع pagination |
| 3 | Integration | curl endpoints مع فلاتر |
| 4 | Manual | فتح dashboard مع بيانات حقيقية |
| 5 | E2E | Full flow + PM2 logs |

## Potential Risks & Gotchas

| الخطر | التأثير | التعامل |
|-------|---------|---------|
| **False positives** (الـ review يرفض ردود سليمة) | إزعاج للعملاء | fail-open: لو الـ review مش واثق، يمرر الرد. مراقبة الـ false positive rate في الـ dashboard |
| **Latency زيادة** | تجربة العميل تتأثر | استخدام Flash model رخيص وسريع. مراقبة latency في الـ logs. لو زادت > 1s → تعطيل الـ review |
| **Flash model key غير متاح** | الـ review لا يعمل | Fallback chain (3 models) → أخيراً fail-open |
| **JSON parsing failure** | مقاطعة الـ flow | try/except → logger.warning → fail-open |
| **DB مليان logs** | أداء الاستعلامات | الـ index على created_at. خطة: retention policy بعد 90 يوم (YAGNI حالياً) |
| **الـ review يظن الـ correction أسوأ** | جودة الرد تنخفض | الـ correction الثاني لو أسوأ → silent escalation |

## Rollback Plan

| المستوى | الإجراء |
|---------|---------|
| **تعطيل self-review** | Feature flag في ai_settings: `selfReviewEnabled` |
| **إزالة الـ DB table** | `DROP TABLE IF EXISTS ai.self_review_logs` |
| **إزالة UI** | git revert للـ commit |
| **كامل** | `git revert <commit-sha>` |

## Files to Create/Modify

### Create:
| ملف | Sprint |
|-----|--------|
| `apps/ai-service/src/db/models/self_review_log.py` | 2 |
| `apps/ai-service/src/db/repo/self_review_repo.py` | 2 |
| `apps/ai-service/src/api/admin/self_review.py` | 3 |
| `apps/frontend/src/pages/super-admin/SuperAdminSelfReviewLogs.tsx` | 4 |
| `apps/frontend/src/pages/super-admin/SuperAdminSelfReviewLogDetail.tsx` | 4 |
| `apps/frontend/src/services/selfReviewService.ts` | 4 |

### Modify:
| ملف | Sprint | التغيير |
|-----|--------|---------|
| `apps/ai-service/src/pipeline/stages/validate_reply.py` | 1 | إضافة _self_review, _get_flash_review_client, _summarize_evidence |
| `apps/ai-service/src/api/admin/__init__.py` | 3 | إضافة router |
| `apps/frontend/src/locales/ar/sections/superAdmin.json` | 4 | i18n strings |
| `apps/frontend/src/locales/en/sections/superAdmin.json` | 4 | i18n strings |
| `apps/frontend/src/App.tsx` | 4 | Lazy route |
| `apps/frontend/src/components/layout/SuperAdminSidebar.tsx` | 4 | Sidebar item |
