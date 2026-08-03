# خطة الإصلاح الشامل — إشعارات واتساب للطلبات وحالات الطلب

**تاريخ الإنشاء**: 2026-08-03
**المؤلف**: AI Audit (مراجعة شاملة)
**الحالة**: مسودة معتمدة للتنفيذ — مخصصة لـ agent تنفيذي
**آخر تحديث**: 2026-08-03

---

## 0. اقرأ هذا أولاً (للـ agent المنفّذ)

> ⚠️ **لا تخلط بين هذه الخطة وخطة الذاكرة.** هذه الوثيقة معنية بإصلاح **إشعارات واتساب للطلبات** (إرسال/إعادة/تكرار/قوالب). خطة الذاكرة المنفصلة (`docs/infrastructure/production-memory-queue-remediation-plan.md`) معنية بـ **تسريب ذاكرة Baileys + طابور مزامنة الطلبات بين الشركات** (`OrderSyncQueue`/`syncQueueService`) — وهي طابور **مختلف تماماً** عن `WhatsAppNotificationQueue` الذي تعالجه هذه الوثيقة.

### 0.1 كيف تستخدم هذه الوثيقة
- كل مرحلة مستقلة ويمكن تنفيذها على حدة (راجع "ترتيب التنفيذ الموصى به" في §6).
- كل مهمة لها: الملف/السطر الدقيق، الكود الحالي، الكود المقترح، معايير النجاح، خطة التراجع.
- **قبل أي تعديل**، شغّل `node --check <file>` على الملف بعد كل تغيير، واختبر محلياً.
- **بعد كل مرحلة**، حدّث §8 (سجل التقدم) بتاريخ/نتيجة المهام المنجزة.
- 🟡 **مراجعة ثانية (2026-08-03)**: صحّحت أخطاءً تقنية في النسخة الأولى (توقيع `updateOrderStatus`، حقول `Company`، mapping الـ enum، اسم الجدول، منطق retry، guard التداخل) وأضافت §5.2 + §5.3. ابحث عن علامة "🟡 تصحيح من مراجعة ثانية" في النص لرؤية كل تصحيح. **الأكواد قبل المراجعة الثانية كانت ستكسر الإنتاج — استخدم الأكواد الحالية فقط.**
- 🔴 **مراجعة ثالثة (2026-08-03)**: أضافت **§1.1-pre** — مشكلة حاجزة حرجة: `status: 'COMPLETED'` قيمة enum غير صالحة تسبب فيروس مزدوج عند تفعيل الطابور. **يجب تنفيذ §1.1-pre قبل §1.1 وإلا العميل يستلم إشعارات مكررة.** ابحث عن علامة "🔴 تصحيح من مراجعة ثالثة".

### 0.2 حقائق مؤكدة (لا تعتمد على افتراضات — تحققنا منها)
- ✅ **BullMQ + ioredis مثبتان فعلاً** في `apps/backend/package.json` (`bullmq@^5.66.2`, `ioredis@^5.8.2`). نمط الاستخدام موجود في `services/queueService.js`.
- ✅ **Redis مُعد** عبر `config/redis.js` (يدعم `REDIS_URL` أو `REDIS_HOST/PORT/PASSWORD`).
- ❌ **`processNotificationQueue()` غير مستدعى من أي مكان** في الإنتاج — verified (لا `setInterval`، لا cron، لا route).
- ✅ **`orderStatusAutoChangeCron` مسجّل** في `server.js:1112-1113` لكنه يتجاوز `orderService.updateOrderStatus`.
- ✅ **خريطة الحالات** (`getWhatsAppOrderEventType` في `orderService.js:26`) ترسم **8 حالات فقط** من أصل 31 (enum `OrderStatus`).
- 🔴 **(مراجعة ثالثة)** `WhatsAppNotificationQueueStatus` enum (`schema.prisma:3625`) = `PENDING, PROCESSING, SENT, FAILED, CANCELLED` — **لا `COMPLETED`**. لكن `processNotificationQueue:3509` يكتب `'COMPLETED'` → يرمي enum error عند التفعيل → فيروس مزدوج. (انظر §1.1-pre.)
- ✅ **(مراجعة ثالثة)** `orderService` هو **singleton** (`module.exports = orderService` في `:1717`)؛ النمط الصحيح للاستدعاء هو `orderService.setCompanyId(companyId).updateOrderStatus(...)` (كما في `routes/orders.js:3031`).
- ✅ **(مراجعة ثالثة)** `ORDER_RETURNED`/`ORDER_REFUNDED`/`RETURNED_TO_SENDER`/`PARTIAL_REFUND`/`REFUND_PROCESSING` **موجودة** في الـ enums الثلاثة (Templates/Logs/Queue) ضمن قسم "New Order Statuses" — لا migration مطلوب؛ يكفي mapping في `getPersistedNotificationEventType`.

---

## 1. الملخص التنفيذي

اكتُشفت **8 مشاكل** في نظام إشعارات واتساب للطلبات، أربع منها حرجة. الأخطر أن **طابور الإشعارات (`WhatsAppNotificationQueue`) مكتوب بالكامل لكنه معطّل (dead code)** — أي إشعار يدخل الطابور (أبرزها: كل إشعارات **quiet-hours / ساعات الهدوء**) **لا يُرسل أبداً**. وبالإضافة لذلك، تفعيل الطابور بدون إصلاح **§1.1-pre** يحوله إلى فيروس مزدوج (إشعارات مكررة للعميل).

| # | المشكلة | الخطورة | المرحلة |
|---|---------|---------|---------|
| 1-pre | 🆕 `status: 'COMPLETED'` قيمة enum غير صالحة في `processNotificationQueue:3509` → فيروس مزدوج عند التفعيل | 🔴 حرجة (حاجز) | 1 |
| 1 | طابور الإشعارات ميت (quiet-hours تضيع للأبد) | 🔴 حرجة | 1 |
| 2 | `orderStatusAutoChangeCron` يتجاوز `updateOrderStatus` | 🔴 حرجة | 1 |
| 3 | خريطة الحالات ناقصة (`RETURNED`/`REFUNDED`/`EXCHANGED` تُتخطى بصمت) | 🔴 حرجة | 2 |
| 4 | هاردكود علامة "Mokhtar Elhenawy" + الروابط (multi-tenant) | 🔴 حرجة | 2 |
| 5 | مسار إشعار مزدوج يعتمد على نافذة 10ث فقط | 🟠 عالية | 3 |
| 6 | الـ dedup منسوخ في 4 أماكن بمنطق متناقض | 🟠 عالية | 3 |
| 7 | لا retry للإرسال الفوري | 🟠 عالية | 4 |
| 8 | قوالب عربية فقط + 3 طبقات + ملف 4206 سطر | 🟡 صيانة | 5 |

---

## 2. خريطة النظام (مرجع سريع)

### 2.1 الملفات الأساسية
| الملف | الدور |
|------|------|
| `services/whatsapp/WhatsAppNotificationService.js` (4206 سطر) | المنسّق الرئيسي: قوالب + إرسال + موازنة جلسات + quiet-hours + طابور + كل domain senders |
| `services/orderService.js` | `updateOrderStatus` (L859) + `updateGuestOrderStatus` (L1284) — يحويان الـ fire-and-forget send |
| `services/orderWorkflowService.js` | مسار الشغّالة المتقدمة البديل (`sendWorkflowNotification` L529) |
| `services/whatsapp/WhatsAppInteractionService.js` | ردود أزرار العميل (`confirm_order_`, `set_status_...`) → إعادة دخول لـ `updateOrderStatus` |
| `cron/orderStatusAutoChangeCron.js` | تغيير حالة تلقائي (يتجاوز الخدمة) |
| `controller/orderStatusController.js` | زرع قوالب الحالات الافتراضية (`seedDefaultOrderTemplates` L928) |

### 2.2 نقاط دخول تغيير الحالة (كلها يجب أن تمرّ بـ `updateOrderStatus`)
- `POST /order-workflow/change-status` → `routes/orderWorkflowRoutes.js:207`
- `PATCH /api/.../orders-enhanced/:id/status` → `routes/enhancedOrders.js:697`
- `PATCH /:orderNumber/status` → `routes/orders.js:4574`
- `POST /simple/:orderNumber/status` → `routes/orders.js:2822`
- `POST /bulk/status` → `routes/orders.js:5103` و `/bulk/status/by-filters` → `:5172`

### 2.3 نماذج قاعدة البيانات ذات الصلة
- `WhatsAppNotificationQueue` (`schema.prisma:7138`) — الطابور المعطّل
- `WhatsAppNotificationLog` (`schema.prisma:7090`) — سجل الإرسال (مصدر الـ dedup)
- `WhatsAppNotificationTemplate` (`schema.prisma:7317`) — القوالب لكل شركة
- `WhatsAppNotificationSettings` (`schema.prisma:~7200`) — مُعلّم عليها `UNUSED - Planned feature` لكن `scheduleNotification` يقرؤها فعلاً
- `OrderStatusConfig` (`schema.prisma:8740`) — حقل `notifyCustomer Boolean @default(false)`

---

## 3. المرحلة 1: الإصلاحات الحرجة (أعلى أولوية)

### 🔴 1.1-pre إصلاح قيمة enum غير صالحة في `processNotificationQueue` (شرط حاجز)

> 🆕 **أُضيف من مراجعة ثالثة (2026-08-03)** — **يجب تنفيذه قبل §1.1**، وإلا يتحول تفعيل الطابور إلى **فيروس مزدوج** (إشعار + تكرار للعميل).

**الجذر**: `processNotificationQueue` في `WhatsAppNotificationService.js:3509` يكتب `status: 'COMPLETED'` عند نجاح الإرسال:
```js
// تحديث الطابور
await prisma.whatsAppNotificationQueue.update({
  where: { id: notification.id },
  data: { status: 'COMPLETED', processedAt: new Date() }   // ← :3509
});
```

لكن `WhatsAppNotificationQueueStatus` enum (`schema.prisma:3625`) يحتوي فقط على:
```
PENDING, PROCESSING, SENT, FAILED, CANCELLED   ← لا يوجد COMPLETED
```

**النتيجة الكارثية عند تفعيل §1.1**:
1. ينجح الإرسال → يُكتب صف الـ log بـ `status: 'SENT'` (`:3500`) بنجاح.
2. تحديث الطابور إلى `'COMPLETED'` **يرمي enum error** (Prisma validation).
3. الخطأ يُلتقط في الـ catch (`:3514`) كفشل → `retryCount++` + إعادة جدولة `PENDING` بعد 5 دقائق.
4. الـ worker يعيد المعالجة بعد 5 دقائق → **الرسالة تُعاد للعميل فعليًا** (السجل الـ log مكتوب SENT لكن الطابور لا يعرف).
5. تتكرر الدائرة حتى `maxRetries` (3) → العميل يستلم **حتى 4 نسخ** من نفس الإشعار.

**الإصلاح** (سطر واحد، بدون migration):

**الملف**: `apps/backend/services/whatsapp/WhatsAppNotificationService.js:3509`

**الكود الحالي**:
```js
data: { status: 'COMPLETED', processedAt: new Date() }
```

**الكود بعد الإصلاح**:
```js
// 🚨 PRODUCTION-FIX (notifications-fix-plan §1.1-pre):
// 'COMPLETED' ليست قيمة في WhatsAppNotificationQueueStatus enum (PENDING/PROCESSING/SENT/FAILED/CANCELLED).
// استخدم 'SENT' لتطابق دلالة الـ log row (:3500) ولتفادي enum error → retry لانهائي → إعادة إرسال مكرر.
data: { status: 'SENT', processedAt: new Date() }
```

#### ⚠️ تنبيهات
- **راجع القراءات الأخرى لـ `status` في الطابور** للتأكد من اتساقها مع الـ enum: `:3433` (PENDING)، `:3449` (PROCESSING)، `:3521` (FAILED)، `:3528` (PENDING). كلها صالحة — فقط `:3509` خاطئة.
- **ابحث عن أي ظهور آخر لـ `'COMPLETED'`** على `whatsAppNotificationQueue`:
  ```bash
  grep -rn "status: 'COMPLETED'" apps/backend/services/whatsapp/ apps/backend/controller/
  ```

**معايير النجاح §1.1-pre**:
- [ ] `node --check` على الملف سليم.
- [ ] بعد §1.1: إشعار عبر الطابور يُرسل **مرة واحدة فقط** (لا تكرار حتى بعد `maxRetries`).
- [ ] `whatsapp_notification_queue` لا يبقى صفوف `PENDING` للإشعارات المُرسلة فعلاً.
- [ ] `processNotificationQueue` لا يرمي `PrismaClientValidationError` بشأن enum.

**خطة التراجع §1.1-pre**: `git checkout -- services/whatsapp/WhatsAppNotificationService.js` (لكن هذا يعيد الفيروس، لذا التراجع يعني **عدم تفعيل §1.1** أيضًا).

---

### 🔴 1.1 تفعيل طابور الإشعارات (`processNotificationQueue`)

**الجذر**: `processNotificationQueue()` في `WhatsAppNotificationService.js:3413` مكتوبة بالكامل لكن **لا تُستدعى**. `scheduleNotification()` (L2460) يكتب صفوفاً في `WhatsAppNotificationQueue`، لكن لا شيء يعالجها. النتيجة: كل إشعار يدخل الطابور (خاصة **quiet-hours deferral** في `:2035-2049`) **يُنسى للأبد**.

**الحل المقترح**: استخدم BullMQ الموجود بالفعل (نفس نمط `services/queueService.js`) لتجنّب `setInterval` الهش.

**الملف الجديد**: `apps/backend/services/whatsapp/notificationQueueWorker.js`

```js
/**
 * 🚨 PRODUCTION-FIX (notifications-fix-plan §1.1):
 * طابور إشعارات واتساب — معالجة WhatsAppNotificationQueue عبر BullMQ.
 * يحل مشكلة processNotificationQueue() الميتة → quiet-hours + المجدولة تُرسل الآن.
 *
 * مرجع النمط: services/queueService.js (BullMQ + ioredis مثبتان بالفعل).
 */
const { Worker, QueueEvents } = require('bullmq');
const redisConfig = require('../../config/redis');
const { processNotificationQueue } = require('./WhatsAppNotificationService');

const QUEUE_NAME = 'whatsapp-notifications';

let worker = null;
let started = false;

function isRedisConfigured() {
  const env = process.env;
  return Boolean(
    env.REDIS_URL ||
    (env.REDIS_HOST && env.REDIS_HOST !== 'production-redis-host')
  );
}

/**
 * محفّز (trigger) BullMQ — الـ Worker هنا فقط "يوقظ" المعالج الدوري
 * الذي يلتقط PENDING من WhatsAppNotificationQueue.
 * أبقينا processNotificationQueue كمصدر الحقيقة الوحيد (لا تكرار منطق).
 */
function startNotificationQueueWorker() {
  if (started || !isRedisConfigured()) {
    if (!isRedisConfigured()) {
      console.warn('⚠️ [NOTIF-QUEUE] Redis غير مُعد — الطابور سيعمل بـ fallback polling');
      startFallbackPolling();
    }
    return;
  }

  worker = new Worker(
    QUEUE_NAME,
    async (_job) => {
      await processNotificationQueue();
    },
    {
      connection: redisConfig,
      concurrency: 1,
      // المهمة متكررة كل دقيقة (repeat) — تعالج PENDING المستحقة فقط.
    }
  );

  worker.on('failed', (job, err) =>
    console.error(`❌ [NOTIF-QUEUE] Job ${job?.id} failed:`, err.message)
  );
  worker.on('error', (err) =>
    console.error(`❌ [NOTIF-QUEUE] Worker error:`, err.message)
  );

  // جدولة تكرارية: دفعة كل 60 ثانية
  const { Queue } = require('bullmq');
  const queue = new Queue(QUEUE_NAME, { connection: redisConfig });
  queue.add(
    'process-pending',
    {},
    {
      repeat: { pattern: '* * * * *' }, // كل دقيقة
      removeOnComplete: 100,
      removeOnFail: 500
    }
  ).catch((e) => console.error('[NOTIF-QUEUE] schedule failed:', e.message));

  started = true;
  console.log('✅ [NOTIF-QUEUE] WhatsApp notification queue worker started');
}

/**
 * fallback: polling بسيط بدون Redis (يحاكي السلوك القديم المقصود).
 * استخدم في البيئات بدون Redis فقط.
 */
function startFallbackPolling() {
  if (started) return;
  const id = setInterval(async () => {
    try {
      await processNotificationQueue();
    } catch (e) {
      console.error('[NOTIF-QUEUE] fallback tick failed:', e.message);
    }
  }, 60000);
  id.unref?.();
  started = true;
  console.log('✅ [NOTIF-QUEUE] Fallback polling started (60s)');
}

async function stopNotificationQueueWorker() {
  if (worker) await worker.close();
  started = false;
}

module.exports = {
  startNotificationQueueWorker,
  stopNotificationQueueWorker
};
```

**التسجيل في** `apps/backend/server.js` (بعد ~L1113، قرب بقية الـ crons):

```js
// 🚨 PRODUCTION-FIX (notifications-fix-plan §1.1): فعّل طابور إشعارات واتساب
try {
  const { startNotificationQueueWorker } = require('./services/whatsapp/notificationQueueWorker');
  startNotificationQueueWorker();
  console.log('✅ [NOTIF-QUEUE] WhatsApp notification queue worker registered');
} catch (err) {
  console.error('❌ [NOTIF-QUEUE] Failed to start notification queue worker:', err.message);
}
```

#### ⚠️ تنبيه أمني للمعالج الحالي (عيب يجب إصلاحه أثناء التفعيل)
`processNotificationQueue` الحالي (`WhatsAppNotificationService.js:3413-3545`) **لا يدعم META_CLOUD** — يفترض Baileys فقط (`WhatsAppManager.getSession` + `WhatsAppMessageHandler.sendText`). إصلاح:
- استبدل منطق الإرسال داخل المعالج باستدعاء `sendNotification({...})` الرئيسي (الذي فيه DB fallback + META_CLOUD) بدلاً من `sendText` المباشر، **أو** أضف فرع META_CLOUD صراحةً قبل كتلة `sendText`.
- راجع `sendNotification` (L~2010) للنمط الكامل (sticky session + Meta special-casing).
- 🟡 **تصحيح من مراجعة ثانية**: هذا الإصلاح هو نفسه "الجزء أ" من §4.1 (فصل حل الجلسة عن الجدولة). ينصح بدمجهما في مهمة واحدة.

#### ⚠️ تنبيه: حماية من التداخل (re-entrancy guard)
🟡 **من مراجعة ثانية**: لو جولة `processNotificationQueue` تجاوزت 60ث (fallback polling كل 60ث، أو BullMQ repeat job)، قد تتداخل جولتان على نفس الصفوف. أضف guard داخل `processNotificationQueue` نفسها:
```js
// 🛡️ notifications-fix-plan §1.1: منع التداخل
let processingQueue = false;
async function processNotificationQueue() {
  if (processingQueue) {
    console.log('[WHATSAPP-QUEUE] Already processing, skipping tick');
    return;
  }
  processingQueue = true;
  try {
    // ... المنطق الحالي ...
  } finally {
    processingQueue = false;
  }
}
```
ملاحظة: الحارس الحالي `isRunning` في الكرون (§1.2) لا يغطي هذا — هذا حارس على مستوى المعالج نفسه.

**معايير النجاح §1.1**:
- [ ] بعد تفعيل `quietHoursEnabled` مع نافذة ليلية، إشعار مُجدول في الطابور يُرسل **خلال 60 ثانية** بعد انتهاء نافذة الهدوء.
- [ ] جدول `whatsapp_notification_queue` لا يتراكم صفوف `PENDING` مستحقة (`scheduledAt <= now()`) لأكثر من دقيقتين.
- [ ] لا تأثير على الإرسال الفوري (sync) خارج الـ quiet-hours.
- [ ] سحب Redis: لو Redis مُطفأ، fallback polling يعمل ويسجّل تحذير.
- [ ] 🟡 لا تداخل: لو جولة > 60ث، الجولة التالية تتخطى بناءً على `processingQueue`.

**خطة التراجع §1.1**: علّق كتلة الـ require في `server.js` + احذف `notificationQueueWorker.js`. لا تأثير على الإنتاج (الطابور كان ميتاً أصلاً).

---

### 🔴 1.2 إصلاح `orderStatusAutoChangeCron` ليمرّ بـ `updateOrderStatus`

**الجذر**: `cron/orderStatusAutoChangeCron.js:95` يستخدم `prisma.order.updateMany` خام → يتجاوز كل شيء: لا إشعارات، لا `metadata.preparationStatus` sync، لا commission/loyalty/invoice.

**الحل**: استبدل الـ `updateMany` الجماعي بحلقة تنادي `orderService.updateOrderStatus` لكل طلب.

**الملف**: `apps/backend/cron/orderStatusAutoChangeCron.js` — استبدل كتلة `// Batch update` (L82-100).

**الكود الحالي** (L82-100):
```js
// Batch update
await prisma.order.updateMany({
  where: {
    id: { in: orders.map(o => o.id) },
    status: rule.fromStatus,
  },
  data: {
    status: rule.toStatus,
    updatedAt: now,
  },
});

// Log status history for each order
const historyEntries = orders.map(order => ({ ... }));
await prisma.orderStatusHistory.createMany({ data: historyEntries, skipDuplicates: true });
```

#### 🔴 التوقيع الصحيح (تصحيح من مراجعة ثانية)

> ⚠️ **تحذير**: التوقيع الفعلي لـ `updateOrderStatus` (`orderService.js:870`) هو:
> ```js
> updateOrderStatus(orderNumber, companyId, status, notes = null, userId = null,
>                   userName = null, existingOrderObject = null, isOverride = false,
>                   options = null)
> ```
> حيث `options` يدعم **فقط** `{ skipCallAttemptGuard, skipTransitionValidation }`. لا توجد خيارات `changedBy`/`reason`/`skipNotifications`. النسخة الأولى من هذه الخطة استخدمت توقيعًا ثلاثيًا خاطئًا (`updateOrderStatus(order.id, rule.toStatus, {...})`) — **لا تستخدمه**.
>
> كذلك `orderService` هو **class instance method** (يستخدم `this.getPrisma()`)، لذا يجب تمرير `companyId` أو ضبطه عبر `orderService.setCompanyId(companyId)` قبل الاستدعاء. تحقق من كيف يستدعيه المتصلون الحاليون (مثل `services/codDepositService.js:227`).

**الكود بعد الإصلاح** (مطابق للتنفيذ الفعلي في `cron/orderStatusAutoChangeCron.js`):
```js
// 🚨 PRODUCTION-FIX (notifications-fix-plan §1.2):
// مرّ عبر updateOrderStatus لضمان: إشعارات واتساب + metadata.preparationStatus +
// commission/loyalty/invoice side-effects.
// ملاحظة (تصحيح §3.1): updateOrderStatus يكتب OrderStatusHistory متداخلاً
// (statusHistory.create داخل order.update — orderService.js) — لذا لا createMany منفصل
// لتجنّب صفّي history مكررين. changedBy = 'SYSTEM_AUTO' عبر userId.
const orderService = require('../services/orderService');   // singleton (module.exports = orderService)
const reason = `Auto-changed by rule: after ${rule.waitTime} ${rule.timeUnit}`;

let updated = 0;
let failed = 0;

for (const order of orders) {
  try {
    await orderService.setCompanyId(companyId).updateOrderStatus(
      order.id,           // orderNumber (يقبل id أو orderNumber)
      companyId,          // companyId
      rule.toStatus,      // status
      reason,             // notes
      'SYSTEM_AUTO',      // userId → changedBy في OrderStatusHistory
      'System Automation',// userName
      null,               // existingOrderObject
      false,              // isOverride
      {                   // options
        skipTransitionValidation: true, // القاعدة موثوقة؛ تجاوز فحص allowedNextStatuses
        skipCallAttemptGuard: true,     // لا يوجد مكالمة عميل في الأتمتة
      }
    );
    updated++;
  } catch (err) {
    failed++;
    console.error(`[ORDER-STATUS-AUTO-CHANGE-CRON] Order ${order.id} failed:`, err.message);
  }
}

console.log(`[ORDER-STATUS-AUTO-CHANGE-CRON] Rule ${rule.fromStatus}→${rule.toStatus}: ${updated} ok, ${failed} failed`);
```

> 🚨 **تنبيه (تصحيح من التنفيذ — مهم جداً)**: `updateOrderStatus` يكتب `OrderStatusHistory` **متداخلاً** عبر `statusHistory: { create: {...} }` داخل `prisma.order.update` (انظر `orderService.js` ~L1065-1073). **لا تستخدم `createMany` منفصل** وإلا ستنتج صفوف history مكررة. مرّر هوية المنفّذ عبر المعامل `userId` (يظهر كـ `changedBy` في الـ history) — يستخدم الـ cron `'SYSTEM_AUTO'` لهذا الغرض. النسخة الأولى من هذه الخطة اقترحت createMany منفصل بناءً على افتراض خاطئ ("updateOrderStatus لا يكتب history") — اُكتشف أثناء التنفيذ وأُزيل.

#### ⚠️ تنبيهات هامة
1. 🟡 **نمط الاستدعاء (مراجعة ثالثة)**: استخدم `orderService.setCompanyId(companyId).updateOrderStatus(...)` — نفس نمط `routes/orders.js:3031`. `orderService` هو **singleton** (`module.exports = orderService` في `:1717`)، والـ constructor الافتراضي يترك `companyId = null`. تمرير `companyId` كمعامل وحده لا يكفي لأن بعض الاستعلامات الداخلية تعتمد على `this.companyId`؛ لذا اضبط السياق صراحةً قبل كل استدعاء لتجنب تسريب بيانات tenant.
2. **`order.id` vs `orderNumber`**: `updateOrderStatus` يقبل كليهما داخليًا (OR query)، لكن `order.id` أسرع. استخدم ما يطلبه الـ API.
3. **الأداء**: لو القاعدة تطابق مئات الطلبات دفعة، استدعاء `updateOrderStatus` لكل طلب يصبح أبطأ من `updateMany`. حلول:
   - حدّ `findMany` الأولي بـ `take: 50` لكل دفعة (الكرون يعمل كل دقيقة، فسيلحق).
4. **الـ mutex/re-entrancy**: `isRunning` guard الحالي كافٍ. لكن `updateOrderStatus` الداخلي قد يكون أبطأ — تأكد أن الكرون التالي لا يتداخل (استمر بفحص `isRunning`).

**معايير النجاح §1.2**:
- [ ] طلب يطابق قاعدة auto-change → يتلقى العميل إشعار واتساب (لو الحالة في خريطة §3، ومع §2.1-pre mapping).
- [ ] `metadata.preparationStatus` يُحدّث للطلبات التي في `PREPARATION_PIPELINE_STATUSES`.
- [ ] `OrderStatusHistory` تُسجّل بـ `changedBy: 'SYSTEM_AUTO'` (عبر `userId` المُمرَّر لـ `updateOrderStatus` — يكتب الـ history متداخلاً).
- [ ] لا انحدار في زمن الكرون (يبقى < 30ث لكل دفعة 50 طلب).

**خطة التراجع §1.2**: `git checkout -- cron/orderStatusAutoChangeCron.js`.

---

## 4. المرحلة 2: إصلاحات صحيحة عالية الأولوية

### 🔴 2.1 توسيع خريطة الحالات (`getWhatsAppOrderEventType`)

**الجذر**: `services/orderService.js:26` ترسم **8 حالات فقط**. باقي الحالات (RETURNED, REFUNDED, PARTIALLY_RETURNED, EXCHANGED, READY, QUALITY_CHECK...) ترجع `null` → الـ guard في `orderService.js:1227` يتخطى الإشعار **بصمت**. والمفارقة أن `sendOrderStatusNotification` (`WhatsAppNotificationService.js:2714`) عندها خريطة أوسع + DB fallback لكنها **لا تُصل إليها**.

**الحل الأنظف (بدل تكرار القوائم)**: احذف الـ guard في `orderService.js` واترك `sendOrderStatusNotification` يقرر (لديها DB `orderStatusConfig.notifyCustomer` + fallback `isFallback:true`).

**الملف**: `apps/backend/services/orderService.js` — الكتلة عند L1220-1249 (updateOrderStatus) و L1451-1484 (updateGuestOrderStatus).

**الكود الحالي** (L1224-1249 تقريباً):
```js
const notificationStatus = normalizeWhatsAppOrderStatus(status);
const eventType = getWhatsAppOrderEventType(status);
// ...dedup 10s on eventType...
if (!notificationStatus || !eventType) {
  return;  // ← الصمت هنا يخفي RETURNED/REFUNDED/إلخ
}
// ...await WhatsAppNotificationService.sendOrderStatusNotification(order, notificationStatus);
```

#### 🔴 شرط مسبق إلزامي: mapping الـ event type إلى قيم الـ enum الصالحة

> ⚠️ **تحذير من مراجعة ثانية**: الحالات الـ enum الموجودة في الـ schema (`WhatsAppNotificationLogsEventType` / `WhatsAppNotificationQueueEventType`، `schema.prisma:3669` و `3832`) تحتوي على `ORDER_RETURNED`، `ORDER_REFUNDED`، `RETURNED_TO_SENDER`، `PARTIAL_REFUND`، `REFUND_PROCESSING` — لكن `getPersistedNotificationEventType` (`WhatsAppNotificationService.js:1064`) **لا يحوّل** `RETURNED` الخام إلى `ORDER_RETURNED`. النتيجة: لو مرّرنا `notificationStatus = 'RETURNED'` مباشرة، الإدراج في `whatsAppNotificationLog`/`whatsAppNotificationQueue` سيفشل (قيمة enum غير صالحة) → الإشعار يضيع صامتاً.

**إجراء إلزامي (قبل أو مع §2.1)**: أضف mapping في `getPersistedNotificationEventType` (`WhatsAppNotificationService.js:1017`):

```js
// 🚨 PRODUCTION-FIX (notifications-fix-plan §2.1-pre):
// حول raw order status codes إلى قيم enum صالحة لـ WhatsAppNotificationLog/Queue.
// الـ enums تحتوي بالفعل على ORDER_RETURNED/ORDER_REFUNDED/PARTIAL_REFUND/RETURNED_TO_SENDER/REFUND_PROCESSING.
const ORDER_STATUS_TO_EVENT_TYPE = {
  RETURNED: 'ORDER_RETURNED',
  PARTIALLY_RETURNED: 'ORDER_RETURNED',   // أو 'PARTIAL_REFUND' حسب الرغبة في التمييز
  REFUNDED: 'ORDER_REFUNDED',
  PARTIALLY_REFUNDED: 'PARTIAL_REFUND',
  EXCHANGED: 'ORDER_RETURNED',            // لا يوجد EXCHANGED منفصل؛ استخدم ORDER_RETURNED أو أضف enum جديد
};

function getPersistedNotificationEventType(eventType) {
  if (String(eventType || '').toUpperCase().startsWith('TASK_')) {
    return 'ANNOUNCEMENT';
  }
  const upper = String(eventType || '').toUpperCase();
  // 🚨 NEW: map raw order status codes to valid enum values
  if (ORDER_STATUS_TO_EVENT_TYPE[upper]) {
    return ORDER_STATUS_TO_EVENT_TYPE[upper];
  }
  return PERSISTED_EVENT_TYPE_FALLBACKS[eventType] || eventType;
}
```

> **قرار تصميمي مطلوب**: `EXCHANGED` و `PARTIALLY_RETURNED` ليس لهما مقابل مباشر في الـ enum. الخيارات: (أ) استخدام `ORDER_RETURNED` كـ fallback، أو (ب) إضافة قيم enum جديدة عبر migration. سجّل القرار في §8.

**الكود بعد الإصلاح** (الخيار الموصى به — تفويض كامل، **بدون `contains`**):

```js
// 🚨 PRODUCTION-FIX (notifications-fix-plan §2.1):
// لا تحجب الإشعارات هنا — دع sendOrderStatusNotification يقرر عبر:
//   1) DB OrderStatusConfig.notifyCustomer
//   2) خريطته الخاصة الأوسع
//   3) fallback isFallback
// الاحتفاظ بـ normalizeWhatsAppOrderStatus فقط للتطبيع (PREPARING→PICKING).
const notificationStatus = normalizeWhatsAppOrderStatus(status) || status;

// dedup 10s — استخدم الـ eventType المُحوّل (موحّد عبر getPersistedNotificationEventType)
// كمفتاح، مع مطابقة تامة (ليس contains) لتفادي STATUS_1/STATUS_10 false match.
// (راجع §3.1: لاحقًا يستبدل هذا بالـ helper الموحّد isDuplicateNotification)
const persistedEventType = getPersistedNotificationEventType(notificationStatus);
const recent = await prisma.whatsAppNotificationLog.findFirst({
  where: {
    orderId: order.id,
    eventType: persistedEventType,   // ← تطابق تام (equals)
    createdAt: { gte: new Date(Date.now() - 10000) },
  },
  select: { id: true },
});
if (recent) {
  console.log(`[ORDER] duplicate status notification skipped: ${order.id}/${persistedEventType}`);
  return;
}

try {
  await WhatsAppNotificationService.sendOrderStatusNotification(order, notificationStatus);
} catch (notifErr) {
  console.error('[ORDER] status notification failed:', notifErr.message);
  // لا ترمِ — الإشعار فشل لكن تحديث الحالة نجح
}
```

> ⚠️ **تصحيح من مراجعة ثانية**: النسخة الأولى من هذا الكود استخدمت `eventType: { contains: notificationStatus }` — هذا يعيد إدخال نفس عيب §3.1 (مطابقة كاذبة `STATUS_1`/`STATUS_10`). استخدم التطابق التام على `persistedEventType` المحوّل.

#### ⚠️ تنبيهات
- **راجع `sendOrderStatusNotification` (WhatsAppNotificationService.js:2714)** لتأكيد أنه يتعامل مع الحالات غير المرسومة بـ fallback آمن (لا يرمي). لو يرمي، أضف `try/catch` داخلي + إعادة الحالة `null` بدل `throw`.
- **افحص `orderStatusConfig.notifyCustomer`**: الحالات اللي `notifyCustomer: false` يجب ألا تُرسل حتى بعد التفويض. تأكد إن `sendOrderStatusNotification` يحترم هذا الحقل (راجع L~2730).
- **اختبار الانحدار**: قبل الإصلاح، RETURNED كان يُتخطى بصمت. بعد الإصلاح قد يبدأ الإرسال — تأكد من وجود قالب DB لكل حالة `notifyCustomer: true` (استخدم `seedDefaultOrderTemplates`).

**معايير النجاح §2.1**:
- [ ] طلب يُغيّر لـ `RETURNED` مع `OrderStatusConfig.notifyCustomer: true` → العميل يتلقى إشعاراً.
- [ ] 🟡 طلب يُغيّر لـ `RETURNED` خلال **quiet-hours** (يدخل الطابور) → الإشعار يصل أيضًا عبر الطابور بعد نهاية الهدوء. (لأن مسار الـ queue يستخدم `getPersistedNotificationEventType` أيضًا في `:3493`، فالحل شامل؛ يستحق اختبارًا صريحًا.)
- [ ] طلب يُغيّر لحالة `notifyCustomer: false` → لا إشعار (محترم).
- [ ] لا تكرار إشعار لنفس التغيير خلال 10ث.
- [ ] لا انحدار للحالات الـ 8 المرسومة أصلاً.

**خطة التراجع §2.1**: `git checkout -- services/orderService.js`.

---

### 🔴 2.2 إزالة هاردكود علامة "Mokhtar Elhenawy" + الروابط

**الجذر**: منصة SaaS متعددة المستأجرين ترسل اسم/روابط شركة محددة لكل العملاء.

| الملف:السطر | الهاردكود |
|-------------|-----------|
| `WhatsAppNotificationService.js:49` | `footer: "Mokhtar Elhenawy Store"` |
| `WhatsAppNotificationService.js:2331` | `"Mokhtar Elhenawy Store"` |
| `WhatsAppNotificationService.js:2136` | `https://mokhtarelhenawy.online/track/...` |
| `WhatsAppNotificationService.js:2658` | `https://${company.slug}.mokhtarelhenawy.online` |

**الحل**: استبدل بـ `company.name` + `company.customDomain`/`company.website` من DB، مع fallback عام محايد.

**الكود المقترح** (دالة مساعدة في أعلى الملف):

> 🟡 **تصحيح من مراجعة ثانية**: النسخة الأولى استخدمت `displayName`/`domain`/`websiteUrl` — **هذه الحقول غير موجودة** في نموذج `Company` (`schema.prisma:1900`). الحقول الفعلية المؤكدة: `name` (`:1902`، غير nullable)، `website` (`:1905`، String؟)، `slug` (`:1913`، @unique)، `customDomain` (`:1928`، @unique).

```js
// 🚨 PRODUCTION-FIX (notifications-fix-plan §2.2): multi-tenant brand resolution
// حقول Company المؤكدة (schema.prisma): name, website?, slug?, customDomain?
function resolveCompanyBrand(company) {
  // company قد يكون undefined في سياقات معينة — fallback محايد
  const name = company?.name || 'Store';
  const slug = company?.slug || 'store';
  // أولوية: customDomain (النطاق المخصص) → website → slug.platformDomain
  const customDomain = company?.customDomain?.trim() || null;
  const websiteHost = company?.website
    ? String(company.website).replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim()
    : null;
  const domain =
    customDomain ||
    websiteHost ||
    `${slug}.${process.env.PLATFORM_BASE_DOMAIN || 'maxp.online'}`;
  return { name, domain, trackingBaseUrl: `https://${domain}` };
}

// مكان الاستخدام:
// footer: resolveCompanyBrand(company).name
// trackingLink: variables.trackingLink ||
//   (variables.orderNumber ? `${brand.trackingBaseUrl}/track/${variables.orderNumber}` : '')
```

#### ⚠️ تنبيهات
- **البحث الشامل**: بعد الاستبدال، شغّل `grep -rn "Mokhtar Elhenawy\|mokhtarelhenawy" apps/backend/services/whatsapp/` للتأكد من عدم بقاء أي ظهور.
- **اختراق العلامة القديمة**: شركة Mokhtar الحقيقية يجب أن ترى اسمها الصحيح من DB (`company.name === 'Mokhtar Elhenawy Store'`) — تأكد إن سجلها في DB يحوي الاسم الصحيح، وإلا حدّث السجل.
- **`customDomain` بدون بروتوكول**: الحقل يُخزَّن عادةً بدون `https://`؛ الـ helper أعلاه يضيف البروتوكول. تحقق من صيغة التخزين الفعلية في الإنتاج قبل الاعتماد.

**معايير النجاح §2.2**:
- [ ] شركة جديدة ترى اسمها + نطاقها في الإشعارات، لا اسم Mokhtar.
- [ ] شركة Mokhtar ترى اسمها الصحيح (من DB).
- [ ] `grep -rn "mokhtarelhenawy" apps/backend/services/whatsapp/` → لا ظهور (بعد استثناءات migration/seed).
- [ ] لا انكسار في روابط التتبع للطلبات القديمة.

**خطة التراجع §2.2**: `git checkout -- services/whatsapp/WhatsAppNotificationService.js`.

---

## 5. المرحلة 3–5: تحسينات عالية/متوسطة الأولوية

### 🟠 3.1 توحيد الـ dedup + قيد DB فريد (يحل المشاكل #5 و #6)

**الجذر**: الـ dedup منسوخ في 4 أماكن بمنطق متناقض + نافذة 10ث فقط (لا `idempotency key` حقيقي).

**المواقع**:
1. `WhatsAppNotificationService.js:2671` — key: `orderId`+`ORDER_CREATED`
2. `orderService.js:1230` — key: `orderId`+`eventType`
3. `orderService.js:1460` — key: `recipientPhone`+`eventType` (guest)
4. `orderWorkflowService.js:610` — key: `eventType contains statusCode` (الأضعف — مطابقة كاذبة محتملة)

**الحل**:
1. **أنشئ دالة مساعدة موحّدة** في `WhatsAppNotificationService.js`:
   ```js
   async function isDuplicateNotification({ companyId, orderId, recipientPhone, eventType, windowMs = 10000 }) {
     const prisma = getSharedPrismaClient();
     const where = {
       companyId,
       eventType,
       createdAt: { gte: new Date(Date.now() - windowMs) },
       OR: [
         ...(orderId ? [{ orderId }] : []),
         ...(recipientPhone ? [{ recipientPhone }] : []),
       ],
     };
     const found = await prisma.whatsAppNotificationLog.findFirst({ where, select: { id: true } });
     return Boolean(found);
   }
   ```
2. **استبدل** كل الـ 4 مواقع بهذه الدالة (أو صَدِّرها منها).
3. **أضف قيد DB فريد** (migration):
   ```prisma
   // في WhatsAppNotificationLog:
   @@unique([companyId, orderId, eventType], map: "notif_log_order_event_uniq")
   // ملاحظة: استخدم partial unique index لو لازم السماح بإعادة محاولة بعد فشل:
   // CREATE UNIQUE INDEX ... WHERE status = 'SENT'
   ```

#### 🔒 القرار النهائي (بعد التنفيذ)

> **رُفض القيد الفريد الدائم** — تم اعتماد `isDuplicateNotification` بنافذة زمنية (10 ثوانٍ) فقط، و**لا migration مطلوبة**.
> **السبب**: القيد الدائم على `(companyId, orderId, eventType)` يمنع إعادة الإرسال المشروعة بعد انتهاء النافذة الزمنية — مثلاً flip-flop `CONFIRMED → CANCELLED → CONFIRMED` بعد >10ث: أول `CONFIRMED` أصبح `SENT` فيبقى القيد (حتى partial على `status='SENT'`) يرفض الـ CONFIRMED الثاني رغم أنه إشعار مشروع لاحق. الـ dedup هنا **زمني بطبيعته** (نافذة)، لذا الآلية الصحيحة هي فحص النافذة في طبقة التطبيق الموحّد — وليس قيداً DB دائماً.

#### ⚠️ تنبيهات
- **القيد الفريد قد يفشل** لو فيه صفوف مكررة موجودة في الإنتاج. شغّل سكربت تنظيف أولاً. 🟡 **تصحيح من مراجعة ثانية**: اسم الجدول الفعلي `whatsapp_notification_logs` (**جمع**، `@@map` في `schema.prisma`):
  ```sql
  DELETE FROM "whatsapp_notification_logs" a USING "whatsapp_notification_logs" b
  WHERE a.id > b.id AND a."orderId" = b."orderId" AND a."eventType" = b."eventType"
    AND a."companyId" = b."companyId";
  ```
- **راجع نموذج `WhatsAppNotificationLog`** للتأكد من وجود `companyId`, `orderId`, `recipientPhone`, `eventType` كأعمدة (راجع `schema.prisma:7090`).
- **`orderWorkflowService.js:610`** يستخدم `contains` → استبدل بمطابقة تامة (`equals`) على `persistedEventType` المحوّل (نفس منهج §2.1) بعد التوحيد.

**معايير النجاح §3.1**: flip-flop (CONFIRMED→CANCELLED→CONFIRMED) خلال > 10ث لا ينتج إشعارين متطابقين؛ مطابقة كاذبة `STATUS_1`/`STATUS_10` مستحيلة.

---

### 🟠 4.1 إضافة retry للإرسال الفوري

**الجذر**: `sendNotification` catch (`:2387-2410`) يسجّل `FAILED` + يحسب `retryable` لكن لا شيء يتصرف عليه.

#### 🔴 قيود تصميمية (تصحيح من مراجعة ثانية)

> ⚠️ **تحذير مهم**: النسخة الأولى من هذا القسم اقترحت `scheduleNotification(...)` للـ retry. لكن `scheduleNotification` (`WhatsAppNotificationService.js:2495-2519`) **يحل الجلسة ويُثبّتها وقت الجدولة** — لو الجلسة مقطوعة وقت الفشل، يرجع `{success: false, reason: 'no_session'}` **قبل** أن يكتب صفًا في الطابور. النتيجة: retry لفشل الجلسة **عديم الفائدة** بهذا الأسلوب.
>
> **الإصلاح المطلوب**: الإصلاح الحقيقي لفشل الجلسة هو **تأجيل حل الجلسة إلى وقت المعالجة** داخل `processNotificationQueue` (وليس وقت الجدولة). وهذا **نفسه** الإصلاح الذي يحل دعم META_CLOUD المذكور في تنبيه §1.1. لذا:
> - **لأخطاء الإرسال العابرة غير الجلسة** (timeout شبكة، rate limit): الجدولة عبر الطابور **بعد** فصل حل الجلسة تعمل.
> - **لأخطاء الجلسة المقطوعة**: لا فائدة من retry حتى يُطبَّق الإصلاح الهيكلي أدناه.

**الحل المقترح (جزئان)**:

**الجزء أ — فصل حل الجلسة عن الجدولة (إصلاح هيكلي، مرتبط بـ §1.1)**:
في `scheduleNotification` (`:2495-2519`) و`processNotificationQueue` (`:3413`):
1. **لا تحل الجلسة وقت `scheduleNotification`** — بدل ذلك، خزّن `companyId` فقط في صف الطابور (الحقل موجود بالفعل في `WhatsAppNotificationQueue.companyId`).
2. **حُل الجلسة وقت `processNotificationQueue`** (عند الإرسال الفعلي) — هذا يسمح بإعادة المحاولة لاحقًا عندما تعود الجلسة/META_CLOUD متصلة.
3. هذا التغيير **يحل أيضًا** دعم META_CLOUD في الطابور: المعالج يستخدم `sendNotification({...})` الرئيسي (الذي فيه DB fallback + META special-casing) بدلاً من `WhatsAppMessageHandler.sendText` المباشر.

**الجزء ب — retry للإرسال العابر** (في `sendNotification` catch `:2387`):
```js
} catch (sendErr) {
  const retryable = isRetryableError(sendErr);  // timeout/rate-limit، وليس no_session
  if (retryable && (attempt ?? 0) < 3) {
    const backoffMs = Math.min(30000, 5000 * Math.pow(2, attempt ?? 0));
    // بعد الجزء أ: scheduleNotification لم يعد يحتاج sessionId مسبقًا
    await scheduleNotification({
      ...originalOptions,
      scheduleAt: new Date(Date.now() + backoffMs),
      priority: Math.max(priority ?? 5, 8),  // أقل أولوية (أرقام أعلى)
    });
    return { status: 'RETRYING', scheduledAt: new Date(Date.now() + backoffMs) };
  }
  // سجّل FAILED نهائي
}
```

> ربط مع §1.1: الـ retry يعتمد على (أ) طابور الإشعارات النشط، و(ب) الجزء أ (فصل حل الجلسة). بدون الجزء أ، الـ retry يعمل فقط للأخطاء غير الجلسية.

---

### 🟡 5.1 تقسيم الملف العملاق + توحيد القوالب (تحسين صيانة)

**الجذر**: `WhatsAppNotificationService.js` = **4206 سطر** يجمع templates + queue + send + balancing + كل domain. القوالب عربية فقط ومبعثرة في 3 طبقات.

**الحل المقترح (تدريجي، لا rewrite كبير)**:
1. **استخراج القوالب**: `services/whatsapp/templates/defaultTemplates.js` (نقل `DEFAULT_TEMPLATES` L15-904).
2. **استخراج الموازنة**: `services/whatsapp/sessionBalancer.js` (`getOrAssignSession`, sticky session, DB fallback).
3. **استخراج الطابور**: منطق `processNotificationQueue` + `scheduleNotification` إلى module منفصل.
4. **i18n للقوالب**: أضف دعم اللغة على مستوى `Company.locale` (أو `Customer.locale`) — القالب يُختار باللغة. ابدأ بالعربية (الحالي) + skeleton إنجليزي.

> هذه المرحلة **اختيارية/تدريجية** — لا تؤثر على الإصلاحات الحرجة. نفّذها فقط بعد استقرار §1–§4.

### 📋 ما نُفّذ فعلياً (حتى 2026-08-03) مقابل ما تأجّل

**نُفّذ (الملف نزل من 4206 → ~3227 سطر):**
- ✅ `DEFAULT_TEMPLATES` → `services/whatsapp/templates/defaultTemplates.js` (بيانات نقية، ~890 سطر).
- ✅ موازنة الجلسات (Sticky / Round-Robin / JIT init) → `services/whatsapp/sessionBalancer.js` (+ `sessionRotation`, `sessionInitializationInFlight`).
- ✅ `formatPhoneNumber` → `utils/phoneFormat.js` (مشترك بين الخدمة والـ balancer).
- ✅ نواة الأنواع النقية → `services/whatsapp/notificationTypes.js` (`getPersistedNotificationEventType` / `getPersistedNotificationCategory` / `getPersistedNotificationRecipientType` / `isOrderCategory`) — تُستخدم من الخدمة والـ dedup معاً، وتُعاد تصديرها من `WhatsAppNotificationService` للمتوافقين الحاليين.
- ✅ كل التصديرات الخارجية محفوظة (`DEFAULT_TEMPLATES`, `formatPhoneNumber`, `resolveDeliveryCompanyId`, `getPersistedNotificationEventType`, ...) — تحقّق من `adminWhatsAppController` / `customerWhatsAppController` / `whatsappNotificationController`.

**متأجّل (بسبب محدد):**
- ⏸️ **استخراج الطابور/`senders`** (البند 3 + تفصيل سابق): دوال الإرسال (HR/loyalty/signup/orders) والطابور تعتمد على ~20 دالة مشتركة في الملف الرئيسي — الاستخراج يتطلب module نواة إضافياً ويعرّض لـ circular dependencies. قيّم لاحقاً كـ refactor مستقل.
- ⏸️ **i18n للرسائل** (البند 4): ميزة منتج كاملة — تتطلب حقل لغة على القالب/الشركة + UI في صفحة status-templates + بذر قوالب إنجليزية. خارج نطاق إصلاح الأخطاء.

---

### 🟠 5.2 سدّ تجاوزات الشغّالة المتقدمة (workflow raw updates)

> 🆕 **أُضيف من مراجعة ثانية**: مشكلة صحة بيانات فعلية، ليست إشعارات فقط.

**الجذر**: `services/orderWorkflowService.js:351` و `:471` يستخدمان `prisma.order.update` خام لتطبيق نتيجة التحقق (`validateStatusChange`) — هذا يتجاوز `orderService.updateOrderStatus`، فلا مزامنة `metadata.preparationStatus` للطلبات التي تنتقل عبر الشغّالة المتقدمة.

**التأثير**: طابور التحضير (`preparationQueueService` يقرأ `metadata.preparationStatus` كمصدر للحقيقة) لا يرى تغييرات الشغّالة → طلبات تضيع من قائمة التحضير أو تتأخر.

**الحل المقترح** (خياران — اختر حسب التعقيد المقبول):

**الخيار أ (موصى به — أقل تغيير)**: بعد `prisma.order.update` الخام في كلا الموقعين، استدعِ دالة مزامنة `metadata.preparationStatus` مباشرة. هذه الدالة موجودة بالفعل داخل `orderService.updateOrderStatus` (المنطق عند `orderService.js:1025-1034`) — استخرجها كدالة مستقلة قابلة للاستدعاء:
```js
// 🚨 PRODUCTION-FIX (notifications-fix-plan §5.2):
// بعد كل prisma.order.update خام في orderWorkflowService.js:351/:471:
const orderService = require('./orderService');
await orderService.syncPreparationMetadata(orderId, newStatus);
```
> **مطلوب من المنفّذ**: تأكد إن `syncPreparationMetadata` دالة مستقلة (أو استخرجها من `updateOrderStatus`). لا تُكرر منطق التطبيع في مكانين.

**الخيار ب (أنظف لكن أكبر)**: استبدل `prisma.order.update` الخام في `orderWorkflowService` بالاستدعاء الكامل لـ `updateOrderStatus` (بنفس توقيع §1.2). لكن هذا قد يسبب تكرار إشعارات (يُعالج بـ §3.1 dedup).

**معايير النجاح §5.2**:
- [ ] طلب ينتقل عبر workflow transition (مثلاً READY_FOR_PROCESSING→PROCESSING) → `metadata.preparationStatus` يُحدّث.
- [ ] طابور التحضير يرى الطلب في القائمة الصحيحة بعد transition.

**خطة التراجع §5.2**: `git checkout -- services/orderWorkflowService.js`.

---

### 🟠 5.3 مراقبة الطابور (queue stats endpoint + alert)

> 🆕 **أُضيف من مراجعة ثانية**: سدّ فجوة #12 من التدقيق الأصلي.

**الجذر**: بعد تفعيل الطابور (§1.1)، لا يوجد endpoint يعرض "كم إشعار عالق" ولا alert لو الطابور بيكبر. مشكلة #1 الأصلية (الطابور الميت) ممكن تستمر شهور بدون ما حد يلاحظ؛ مع تفعيله، عكس ذلك — أي تعطل صامت لازم يظهر بسرعة.

**الحل المقترح** (جزءان):

**الجزء أ — endpoint إحصائيات**: أضف في `controller/whatsappNotificationController.js`:

> 🟡 **تصحيح من مراجعة ثالثة**: النسخة الأولى استخدمت `status: { notIn: ['COMPLETED', 'PENDING', 'PROCESSING'] }` لـ failed — هذا خاطئ لسببين: (1) `'COMPLETED'` ليست قيمة enum صالحة (راجع §1.1-pre)، (2) الـ enum يحتوي `FAILED` و`CANCELLED` صراحةً. استخدم تطابقًا تامًا على قيم الـ enum الخمس: `PENDING, PROCESSING, SENT, FAILED, CANCELLED`.

```js
// 🚨 PRODUCTION-FIX (notifications-fix-plan §5.3): queue stats endpoint
async function getNotificationQueueStats(req, res) {
  const prisma = getSharedPrismaClient();
  const companyId = req.user.companyId;

  const [pending, processing, sent, failed, cancelled, overdue] = await Promise.all([
    prisma.whatsAppNotificationQueue.count({ where: { companyId, status: 'PENDING' } }),
    prisma.whatsAppNotificationQueue.count({ where: { companyId, status: 'PROCESSING' } }),
    prisma.whatsAppNotificationQueue.count({ where: { companyId, status: 'SENT' } }),          // 🟡 SENT بدل COMPLETED
    prisma.whatsAppNotificationQueue.count({ where: { companyId, status: 'FAILED' } }),
    prisma.whatsAppNotificationQueue.count({ where: { companyId, status: 'CANCELLED' } }),
    // overdue = PENDING مستحقة لم تُعالج (> 2 دقيقة) — مؤشر صحة الطابور
    prisma.whatsAppNotificationQueue.count({
      where: { companyId, status: 'PENDING', scheduledAt: { lte: new Date(Date.now() - 120000) } }
    }),
  ]);

  res.json({ pending, processing, sent, failed, cancelled, overdue, healthy: overdue === 0 });
}
```
سجّله في `routes/whatsappNotificationRoutes.js` كـ `GET /stats` (محمي بصلاحية).

**الجزء ب — alert في الـ worker**: في `notificationQueueWorker.js` (من §1.1)، سجّل تحذير صريح لو `overdue > 0`:
```js
// كل دقيقة، بعد processNotificationQueue، افحص overdue
const overdue = await prisma.whatsAppNotificationQueue.count({
  where: { status: 'PENDING', scheduledAt: { lte: new Date(Date.now() - 120000) } }
});
if (overdue > 10) {
  console.error(`🚨 [NOTIF-QUEUE] ${overdue} notifications overdue (>2min) — check worker/Redis/META_CLOUD`);
}
```

#### ⚠️ تنبيهات
- 🟡 **مؤكد (مراجعة ثالثة)**: `WhatsAppNotificationQueueStatus` enum (`schema.prisma:3625`) قيمه: `PENDING, PROCESSING, SENT, FAILED, CANCELLED`. لا `COMPLETED` — لذا stats يستخدم `SENT` للإشعارات الناجحة (راجع §1.1-pre).
- **الحد (threshold)**: ابدأ بـ 10 كـ alert threshold، اضبطه بناءً على الحمل الفعلي.

**معايير النجاح §5.3**:
- [ ] `GET /api/v1/whatsapp-notifications/stats` يرجع counts صحيحة.
- [ ] لو الطابور يتراكم (>10 overdue)، يظهر خطأ واضح في الـ logs.
- [ ] اللوحة الإدارية (اختياري) تعرض هذه الأرقام.

**خطة التراجع §5.3**: احذف endpoint + الـ alert block. لا تأثير وظيفي (مراقبة فقط).

---

### 🔧 متطلبات النشر (منفّذ — بعد اكتمال §1.1–§5.3)

- **Redis**: `REDIS_URL` أو `REDIS_HOST/PORT/PASSWORD` في `.env` — لو غير مكوّن، الـ worker يعمل بـ fallback polling (setInterval 60s) مع تحذير، والأداء أقل تعدداً للـ instances.
- **لا schema migration مطلوبة**: لا تغيير enums ولا قيود DB (قرار §3.1). التغييرات كلها app-level.
- **شركة Mokhtar**: تأكد أن `company.name` في DB يحوي "Mokhtar Elhenawy Store" — الـ footer/الروابط الآن تُقرأ من DB (لا هاردكود).
- **التحقق بعد النشر**: `GET /api/v1/whatsapp-notifications/queue-stats` يعمل، و`psql` للطابور لا يتراكم PENDING مستحقة.

---

## 6. ترتيب التنفيذ الموصى به + الجدول الزمني

| الترتيب | المهمة | الجهد | المخاطرة | يعتمد على |
|---------|--------|------|---------|-----------|
| 1 | 🔴 §1.1-pre تصحيح enum `'COMPLETED'→'SENT'` (حاجز) | صغير | منخفضة (سطر واحد) | — |
| 2 | §1.1 تفعيل الطابور | متوسط | منخفضة (كان ميتاً) | §1.1-pre (إلزامي) |
| 3 | §2.1-pre mapping event type (شرط مسبق) | صغير | منخفضة | — |
| 4 | §2.1 توسيع خريطة الحالات | صغير | متوسطة (قد يبدأ إرسالات جديدة) | §1.1، §2.1-pre |
| 5 | §1.2 إصلاح الكرون | صغير | منخفضة | §2.1 (حتى الحالات الجديدة تُرسل) |
| 6 | §2.2 إزالة الهاردكود | صغير | منخفضة | — |
| 7 | §3.1 توحيد dedup + DB unique | متوسط | متوسطة (migration) | — |
| 8 | §4.1 retry + فصل حل الجلسة | متوسط | متوسطة (هيكلي) | §1.1 (يحل META_CLOUD أيضًا) |
| 9 | §5.2 سدّ تجاوزات workflow | صغير | منخفضة | — |
| 10 | §5.3 مراقبة الطابور | صغير | منخفضة | §1.1 |
| 11 | §5.1 التقسيم + i18n | كبير | منخفضة (تدريجي) | كل ما سبق |

**الحد الزمني المقترح**: §1.1-pre+§1.1+§2.1-pre+§2.1+§1.2+§2.2 = 1–2 يوم عمل (الحرجة)؛ §3.1+§4.1+§5.2+§5.3 = 2–3 أيام؛ §5.1 = أسبوع+.

---

## 7. استراتيجية الاختبار والطرح

### 7.1 سيناريوهات اختبار يدوية (لكل مرحلة)
| # | السيناريو | المتوقع | المرحلة |
|---|-----------|---------|---------|
| 1 | إشعار في quiet-hours | يُرسل خلال 60ث بعد نهاية الهدوء | §1.1 |
| 2 | طابور Redis مُطفأ | fallback polling يعمل | §1.1 |
| 3 | قاعدة auto-change (بعد X دقيقة → SHIPPED) | إشعار شحن يصل للعميل | §1.2 |
| 4 | تغيير طلب لـ RETURNED (notifyCustomer:true) | إشعار يصل | §2.1 |
| 5 | تغيير طلب لحالة notifyCustomer:false | لا إشعار | §2.1 |
| 6 | شركة جديدة (غير Mokhtar) | اسمها + نطاقها في الإشعار | §2.2 |
| 7 | flip-flop CONFIRMED→CANCELLED→CONFIRMED (>10ث) | لا إشعار متكرر مطابق | §3.1 |
| 8 | 🟡 طلب ينتقل لـ RETURNED عبر شركه META_CLOUD | الإشعار يصل (لا يُتخطى) | §1.1+§4.1 |
| 9 | 🟡 جولة processNotificationQueue > 60ث | الجولة التالية تتخطى (لا تداخل) | §1.1 |

### 7.2 أوامر تحقق
```bash
# الطابور لا يتراكم PENDING مستحقة
psql -d maxp -c "SELECT COUNT(*) FROM whatsapp_notification_queue
  WHERE status='PENDING' AND \"scheduledAt\" <= NOW();"

# لا إشعارات مكررة في الـ 10ث الأخيرة (🟡 اسم الجدول جمع: whatsapp_notification_logs)
psql -d maxp -c "SELECT \"orderId\", \"eventType\", COUNT(*)
  FROM whatsapp_notification_logs
  WHERE \"createdAt\" >= NOW() - INTERVAL '10 seconds'
  GROUP BY \"orderId\", \"eventType\" HAVING COUNT(*) > 1;"

# البحث عن هاردكود متبقٍّ
grep -rn "Mokhtar Elhenawy\|mokhtarelhenawy" apps/backend/services/whatsapp/

# 🟡 مراقبة الطابور (بعد §5.3): عدد العالقين حسب الحالة/العمر
psql -d maxp -c "SELECT status, COUNT(*),
    MAX(EXTRACT(EPOCH FROM (NOW() - \"scheduledAt\"))::INT) AS max_age_sec
  FROM whatsapp_notification_queue
  WHERE status IN ('PENDING','PROCESSING')
  GROUP BY status;"
```

---

## 8. سجل التقدم (يحدّثه المنفّذ بعد كل مهمة)

| المهمة | المنفّذ | التاريخ | الحالة | ملاحظات / PR |
|--------|---------|---------|--------|---------------|
| §1.1-pre enum COMPLETED→SENT | agent | 2026-08-03 | ✅ منفّذ | 🔴 حاجز قبل §1.1 — WhatsAppNotificationService.js:3509 → 'SENT' |
| §1.1 تفعيل الطابور | agent | 2026-08-03 | ✅ منفّذ | `notificationQueueWorker.js` (جديد) + تسجيل في server.js + حارس تداخل في processNotificationQueue |
| §1.2 إصلاح الكرون | agent | 2026-08-03 | ✅ منفّذ | مرور عبر updateOrderStatus (setCompanyId + take:50 + changedBy='SYSTEM_AUTO'). **تصحيح**: updateOrderStatus يكتب history متداخلاً — أُزيل createMany (كان سيُنتج صفّين) |
| §2.1-pre mapping event type | agent | 2026-08-03 | ✅ منفّذ | ORDER_STATUS_TO_EVENT_TYPE (موسّعة بالحالات الست القياسية في §3.1) + تصدير getPersistedNotificationEventType |
| §2.1 خريطة الحالات | agent | 2026-08-03 | ✅ منفّذ | حذف guard + تفويض sendOrderStatusNotification + تطابق تام (بدل contains) + حذف getWhatsAppOrderEventType |
| §2.2 إزالة الهاردكود | agent | 2026-08-03 | ✅ منفّذ | `utils/companyBranding.js` (جديد) + استبدال المواضع الأربعة + orderWorkflowService |
| §2.3 auto-seed قوالب (دفاعي) | agent | 2026-08-03 | ✅ منفّذ | `services/orderTemplateSeeding.js` (جديد) — `ensureOrderTemplate` في sendNotification عند غياب قالب طلب (شركة جديدة لم تعد تفشل بصمت بـ no_template)؛ orderStatusController يستورد البذر من الخدمة |
| §3.1 توحيد dedup | agent | 2026-08-03 | ✅ منفّذ | helper `isDuplicateNotification` موحّد + استبدال المواقع الأربعة (إصلاح contains). **قرار**: DB unique مرفوض — permanent يمنع إعادة الإرسال المشروعة بعد النافذة (flip-flop)؛ الـ dedup الزمني هو الآلية الصحيحة |
| §4.1 retry + فصل الجلسة | agent | 2026-08-03 | ✅ منفّذ | حلّ الجلسة مؤجّل للمعالجة في الطابور (يدعم META_CLOUD + الجلسات المنفصلة)؛ scheduleNotification يقبل الجدولة بلا جلسة (sessionId='')؛ retry عبر الطابور للأخطاء العابرة (retryable) |
| §5.1 التقسيم | agent | 2026-08-03 | ✅ جزئي | استخرجت `DEFAULT_TEMPLATES` → `templates/defaultTemplates.js`، موازنة الجلسات → `sessionBalancer.js` + `formatPhoneNumber` → `utils/phoneFormat.js`، ونواة الأنواع النقية → `notificationTypes.js` (الملف 4205→2797 سطر). **متبقّي**: الطابور/senders + i18n (مؤجلة — تنطوي على circular deps وميزة منتج) |
| §5.2 سد bypasses workflow | agent | 2026-08-03 | ✅ منفّذ | استخراج `syncPreparationMetadata` + استدعاؤه بعد الـ raw updates في :351/:471 |
| §5.3 مراقبة الطابور | agent | 2026-08-03 | ✅ منفّذ | `GET /api/v1/whatsapp-notifications/queue-stats` (جديد) + تنبيه overdue>10 في الـ worker |
| **اختبارات Jest (task 1)** | agent | 2026-08-03 | ✅ منفّذ | 4 ملفات جديدة: `tests/services/whatsapp/notificationTypes.test.js` (25)، `tests/services/whatsapp/isDuplicateNotification.test.js` (7)، `tests/utils/companyBranding.test.js` (7)، `tests/services/syncPreparationMetadata.test.js` (7) — **52/52 أخضر** |
| **توحيد الوثيقة (task 2)** | agent | 2026-08-03 | ✅ منفّذ | §1.2 كود مطابق للفعل (بلا createMany + تنبيه الـ nested history)؛ §3.1 أُضيف "القرار النهائي" (رفض الـ DB unique)؛ §5.1 وثّق المنفّذ/المؤجّل بدقة |
| **تحقق سلوكي (task 3)** | agent | 2026-08-03 | ✅ منفّذ | scheduleNotification لا يرجع no_session ✓؛ re-entrancy guard ✓؛ ملاحظة: processNotificationQueue يرسل مباشرة عبر WhatsAppMessageHandler (يروّت META_CLOUD) وليس sendNotification — مقبول وظيفياً، يُوثّق في التقرير |
| **إصلاح اختبارات مسبقة الفشل** | agent | 2026-08-03 | ✅ منفّذ | `orderService.limit.test.js` (mock ناقص product.findUnique) + `WhatsAppSyncService.test.js` — **🔴 اكتُشف وصُحّح deadlock حقيقي في `withKeyLock`** (WhatsAppSyncService.js:23-43): `gate = prev.then(() => current)` كان يجعل أول استدعاء لأي مفتاح ينتظر `current` الذي لا يُحلّ إلا بعد fn → **أول رسالة WhatsApp تنشئ عميلاً كانت ستتجمّد للأبد في الإنتاج**. الإصلاح: `gate = prev` (وعد إطلاق المُتصل السابق) + تخزين `current` كمفتاح التالي. تحقّق: تسلسل صحيح (maxConcurrent=1) + تنظيف الخريطة. + mock `executeWithRetry` في الاختبار + توقّع `whatsappId` في الـ backfill. المجموعة: **8/8 سويتات / 59/59 أخضر (مستقر عبر 3 تشغيلات)** |

---

## 9. مراجع

### 9.1 ملفات متأثرة
| الملف | التغييرات |
|------|-----------|
| `services/whatsapp/WhatsAppNotificationService.js` | §1.1-pre (enum `'COMPLETED'→'SENT'`)، §2.1-pre (mapping)، §2.2 (هاردكود)، §3.1 (dedup)، §4.1 (retry + فصل الجلسة)، §5.1 (تقسيم)، §5.3 (alert) |
| `services/whatsapp/templates/defaultTemplates.js` | **جديد** (§5.1) — DEFAULT_TEMPLATES مستخرج |
| `services/whatsapp/sessionBalancer.js` | **جديد** (§5.1) — موازنة الجلسات + JIT init |
| `services/whatsapp/notificationTypes.js` | **جديد** (§5.1) — نواة أنواع الإشعارات النقية (persisted mapping + isOrderCategory) |
| `services/whatsapp/notificationQueueWorker.js` | **جديد** (§1.1 + §5.3 alert) |
| `utils/companyBranding.js` | **جديد** (§2.2) |
| `utils/phoneFormat.js` | **جديد** (§5.1) |
| `services/orderService.js` | §2.1 (خريطة الحالات + guard)، §3.1 (dedup)، §5.2 (استخراج syncPreparationMetadata) |
| `services/orderWorkflowService.js` | §3.1 (dedup)، §5.2 (سد raw update bypass) |
| `cron/orderStatusAutoChangeCron.js` | §1.2 (تمرير عبر updateOrderStatus — أُزيل createMany لتجنّب ازدواج history) |
| `controller/whatsappNotificationController.js` | §5.3 (getNotificationQueueStats) |
| `routes/whatsappNotificationRoutes.js` | §5.3 (تسجيل /queue-stats) |
| `server.js` | §1.1 (تسجيل الـ worker) |

### 9.2 وثائق ذات صلة
- `docs/infrastructure/production-memory-queue-remediation-plan.md` — **طابور مختلف** (`OrderSyncQueue`/مزامنة بين الشركات + تسريب الذاكرة). لا يخلط.
- `docs/orders/order-status-auto-change-2026-07-01.md` — توثيق ميزة الكرون (يحتوي تحذير §1.2).
- `docs/orders/order-status-preparation-sync-2026-08-03.md` — مزامنة `metadata.preparationStatus` (مرتبطة بـ §1.2 و§5.2).

### 9.3 ملاحظات للمُراجِع
- ركّز المراجعة على: (أ) صحة توقيعات الدوال قبل الاستدعاء (راجع §1.2 — التوقيع الفعلي 9 معاملات)، (ب) عدم كسر META_CLOUD path (§1.1 + §4.1 الجزء أ)، (ج) **§3.1**: قُدّر أن قيد DB الفريد الدائم يُعيق إعادة الإرسال المشروعة بعد النافذة — اعتمدنا الـ dedup الزمني الموحّد فقط (لا migration).
- أي تعديل على `orderService.updateOrderStatus` يجب اختباره على مسارات الـ 7 المذكورة في §2.2 (نقاط دخول تغيير الحالة).
- 🟡 **مراجعة ثانية (2026-08-03)** طُبّقت: صحّحت توقيع `updateOrderStatus`، حقول `Company`، mapping الـ enum، اسم الجدول (`whatsapp_notification_logs`)، منطق retry لفشل الجلسة، guard التداخل، وأضفت §5.2 (workflow bypass) و§5.3 (مراقبة).
- 🟡 **مراجعة رابعة (التنفيذ)**: اكتُشف أن `updateOrderStatus` يكتب OrderStatusHistory متداخلاً — أُزيل createMany من §1.2 لتجنّب الازدواج. اكتملت §1.1-pre→§5.3 ما عدا i18n وبقية تقسيم §5.1 (مؤجلة).
- 🟡 **مراجعة خامسة (تسليم/اختبارات)**: أُضيفت 4 ملفات اختبار Jest (52/52 أخضر). تحقق سلوكي: `scheduleNotification` لا يُسقط عند غياب جلسة ✓، guard التداخل ✓، لكن `processNotificationQueue` يرسل مباشرة عبر `WhatsAppMessageHandler` (يروّت META_CLOUD داخلياً + حل الجلسة مؤجّل) وليس عبر `sendNotification` — مقبول وظيفياً، deviation موثّق من توصية §1.1. ملاحظة: `getPersistedNotificationEventType('PREPARING'|'PACKAGED')` يُرجع القيمة الخام (ليست قيم enum) — آمنة حالياً لأن `normalizeWhatsAppOrderStatus` تحوّلهما إلى PICKING/PACKED قبل الإرسال، لكن أي مُستدعٍ مستقبلي يمرّرها مباشرة سيُصاب بـ enum error.

---

*هذا المستند هو المرجع الرسمي لإصلاح إشعارات واتساب للطلبات. حدّث §8 بعد كل مهمة. المراجعة الثانية (2026-08-03) دمجت تصحيحات تقنية مؤكدة من مراجعة خارجية.*
