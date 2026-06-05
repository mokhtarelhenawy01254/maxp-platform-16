# ai-agent — Known Issues & Notes

---

## ⚠ متطلب قبل التشغيل

### يجب تشغيل `schema:generate` أولاً من backend
الـ ai-agent يستورد الـ Prisma client من `apps/backend/generated/postgresql_v2`.
لو هذا المجلد غير موجود (لم يُشغَّل generate بعد) سيفشل الـ TypeScript compilation.

```bash
# من apps/backend
npm run schema:generate
```

---

## 🐛 مشاكل معروفة

### 1. جدول `agent_tool_definitions` لم يُنشأ بعد في الـ DB
**المشكلة:** الموديل أُضيف لـ `apps/backend/prisma/schema.prisma` لكن لم تُطبَّق migration بعد.

**الحل:**
```bash
cd apps/backend
node ../../node_modules/prisma/build/index.js db push --schema=prisma/schema.prisma
# ثم
npm run schema:generate
# ثم seed الأدوات
cd ../ai-agent && npm run seed
```

---

### 2. Raw SQL يفترض وجود PostgreSQL ENUMs بأسماء محددة
**المشكلة:** في بعض الـ queries يتم casting صريح مثل:
```sql
AND status = 'CONFIRMED'::"OrderStatus"
```
إذا كان اسم الـ ENUM في الـ DB مختلفاً سيفشل الـ query.

**الملفات المتأثرة:**
- `src/tools/implementations/orders.ts`
- `src/tools/implementations/customers.ts`
- `src/tools/implementations/write.ts`

**الحل:** تحقق من أسماء الـ ENUMs الفعلية في الـ DB:
```sql
SELECT typname FROM pg_type WHERE typcategory = 'E';
```

---

### 3. `createOrder` مبسّط — قد يفشل بسبب required fields
**المشكلة:** موديل `Order` في الـ backend يحتوي على حقول required كثيرة (`customerId`, `subtotal`, إلخ) وبعضها لها constraints.
الـ raw SQL INSERT في `write.ts` لا يشمل كل الحقول المطلوبة.

**الملف:** `src/tools/implementations/write.ts` — دالة `createOrder`

**الحل المؤقت:** استخدم الـ tool بحذر في الـ production، أو أكمل الـ INSERT بكل الحقول المطلوبة.

---

### 4. الذاكرة (Memory) — استخراج الحقائق بسيط جداً
**المشكلة:** دالة `extractFacts` في `agent-runner.ts` تبحث فقط عن أسطر تبدأ بـ `حقيقة:` أو `ملاحظة:`.
هذا يعني أن الـ agent لن يحفظ ذاكرة تلقائياً إلا إذا ضمّنتها في الـ system prompt.

**الملف:** `src/core/agent-runner.ts` — دالة `extractFacts`

**الحل:** ضع في الـ system prompt تعليماً للـ agent أن يذكر الحقائق بهذا الشكل أو استبدل بـ structured output.

---

### 5. `tsx` في devDependencies
**المشكلة:** الـ `tsx` package مذكور في `devDependencies` فقط. لو شغّلت `npm install --production` لن يُثبَّت.

**الحل:** إما نقله لـ `dependencies` أو البناء أولاً:
```bash
npm run build        # tsc → dist/
node dist/index.js   # بدلاً من tsx
```

---

### 6. لا يوجد Authentication على الـ API
**المشكلة:** الـ endpoints مفتوحة تماماً بدون أي JWT أو API key validation.

**الملفات:** كل الـ routes في `src/api/routes/`

**الحل:** أضف middleware للـ auth قبل الـ production deployment.

---

### 7. Tool Approval — يُنشئ request جديد في كل مرة
**المشكلة:** دالة `requireApproval` تتحقق من وجود `APPROVED` request سابق لنفس الـ `toolName` فقط، بدون ربط بالـ `agentId` أو `input` المحدد.
يعني لو وافقت على `updateOrderStatus` مرة واحدة، أي تنفيذ تالٍ لأي طلب update سيمر بدون موافقة.

**الملف:** `src/tools/implementations/write.ts` — دالة `requireApproval`

**الحل:** أضف `agentId` أو `idempotencyKey` للـ lookup.

---

## ✅ ما يعمل بشكل صحيح

- Failover بين Gemini models والـ keys
- Tool calling loop (حتى MAX_TOOL_TURNS = 10)
- Multi-agent routing عبر CEO → sub-agents
- Telemetry traces وspans
- ApprovalRequiredError يوقف التنفيذ وينتظر الموافقة
- Memory loading من `agentic_memory_facts`
- Skills loading من `company_skills`
- Seed script للـ 14 أداة الأساسية
