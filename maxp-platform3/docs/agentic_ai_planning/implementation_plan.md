# خطة التنفيذ: المرحلة 1 - مخطط قاعدة البيانات لـ Memory Facts والتتبع (Telemetry)

تتضمن هذه الخطة تأسيس وتدشين مخطط الجداول البرمجية وقاعدة البيانات المهيكلة التي سيعتمد عليها الوكيل الذكي (Agentic AI) لحفظ حقائق وتفضيلات العملاء (Memory Facts)، وتتبع شجرة قراراته وخطوات تشغيله واستدعائه للأدوات والنماذج (Telemetry Spans/Traces) برمجياً عبر هيكل **Prisma Modular** المعتمد في منصة **MaxP**.

---

## User Review Required

> [!IMPORTANT]
> - سنقوم بإنشاء ملف مخطط مستقل جديد باسم `agentic_memory_telemetry.prisma` تحت مجلد `backend/prisma/schema/` لضمان عدم حدوث تعارض مع الجداول الحالية وللحفاظ على معمارية الموديل المقسم.
> - بعد مراجعة المخطط والموافقة عليه، سنقوم بتوليد العميل `Prisma Client` وإجراء الترحيل المباشر `migration` لقاعدة البيانات عبر الأوامر البرمجية المعتمدة في بيئة التطوير المحلية وتحديث الـ Client.

---

## Open Questions

> [!NOTE]
> لا توجد أسئلة معلقة حالياً، حيث أن الهيكل يلتزم تماماً بمواصفات البنية الهندسية المقترحة في خارطة الطريق والموافق عليها سابقاً.

---

## Proposed Changes

سنقوم بإضافة الموديلات الهندسية التالية متطابقة مع معايير المشروع (أحرف PascalCase للموديلات، حروف camelCase للحقول، وربطها بأسماء جداول snake_case حتمية عبر `@@map`):

1. **`AgenticMemoryFact`**:
   - `id`: المعرف الفريد للمعلومة (`cuid`).
   - `companyId`: معرف الشركة المستأجرة لتأمين عزل تام للبيانات.
   - `customerId`: معرف العميل المرتبطة به الحقيقة.
   - `type`: نوع الحقيقة (مثال: `FACT` للمعلومات الثابتة، `PREFERENCE` للتفضيلات).
   - `content`: نص الحقيقة أو المعلومة المستخلصة.
   - `confidence`: نسبة يقين الوكيل من صحة استخلاص المعلومة (بين 0.0 و 1.0).
   - `importance`: مستوى أهمية المعلومة لتحديد وزنها (بين 1 و 5).
   - `validFrom` / `validTo`: حقول لتأمين المنطق الواعي بالوقت وتواريخ صلاحية الحقائق الموسمية.
   - `metadata`: حقل نصي مرن لحفظ تفاصيل إضافية بصيغة JSON.
   - التواريخ: `createdAt` و `updatedAt`.

2. **`TelemetryTrace`**:
   - `id`: المعرف الفريد للجلسة الحوارية أو المعاملة الشاملة للوكيل.
   - `companyId`: معرف الشركة المستأجرة.
   - `channel`: القناة (مثال: `WHATSAPP` أو `MESSENGER` أو `DASHBOARD`).
   - `provider`: المزود المستدعى في الجلسة.
   - `totalTokens` / `promptTokens` / `completionTokens`: إحصائيات استهلاك التوكنات لضبط التكاليف.
   - `totalCost`: التكلفة الإجمالية للجلسة المالية لمنع تجاوز الميزانية.
   - `status`: حالة الجلسة التتبعية (`RUNNING`, `SUCCESS`, `ERROR`).
   - التواريخ: `createdAt` و `updatedAt`.

3. **`TelemetrySpan`**:
   - `id`: معرف الخطوة التفصيلية.
   - `traceId`: المعرف الخاص بالجلسة الشاملة لربط كافة الخطوات بها.
   - `parentId`: معرف الخطوة الأب (الخطوات المتداخلة والشجرية كاستدعاء أدوات داخل تفكير LLM).
   - `name`: اسم الخطوة (مثال: `LLM_GENERATE` أو `TOOL_EXECUTION`).
   - `type`: نوع المهمة (`LLM`, `TOOL`, `RETRIEVAL`, `ROUTER`).
   - `startTime` / `endTime`: توقيتات البداية والنهاية لحساب زمن الاستجابة الفوري بالملي ثانية.
   - `latencyMs`: زمن الاستجابة الفعلي.
   - `input` / `output`: سياق المدخلات والمخرجات التفصيلية للخطوة.
   - `status`: حالة الخطوة (`SUCCESS`, `ERROR`).
   - `error`: نص الخطأ عند الفشل.
   - `metadata`: بيانات JSON مرنة إضافية للخطوة.
   - التاريخ: `createdAt`.

---

### Backend (Database Schema & Tests)

#### [NEW] [agentic_memory_telemetry.prisma](file:///h:/max_p_new/backend/prisma/schema/agentic_memory_telemetry.prisma)
*ملف الموديلات الجديد لقاعدة البيانات.*

```prisma
model AgenticMemoryFact {
  id         String    @id @default(cuid())
  companyId  String
  customerId String?
  type       String    @default("FACT") // FACT, PREFERENCE, TEMPORAL
  content    String    @db.Text
  confidence Float     @default(1.0)
  importance Int       @default(3)
  validFrom  DateTime?
  validTo    DateTime?
  metadata   String?   @db.Text
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  @@index([companyId, type])
  @@index([companyId, customerId])
  @@map("agentic_memory_facts")
}

model TelemetryTrace {
  id               String          @id @default(cuid())
  companyId        String
  channel          String          @default("DASHBOARD")
  provider         String?
  totalTokens      Int             @default(0)
  promptTokens     Int             @default(0)
  completionTokens Int             @default(0)
  totalCost        Decimal         @default(0.0) @db.Decimal(12, 5)
  status           String          @default("RUNNING") // RUNNING, SUCCESS, ERROR
  metadata         String?         @db.Text
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt
  spans            TelemetrySpan[]

  @@index([companyId, createdAt])
  @@index([status])
  @@map("telemetry_traces")
}

model TelemetrySpan {
  id        String         @id @default(cuid())
  traceId   String
  parentId  String?
  name      String
  type      String         @default("LLM") // LLM, TOOL, RETRIEVAL, ROUTER
  startTime DateTime       @default(now())
  endTime   DateTime?
  latencyMs Int            @default(0)
  input     String?        @db.Text
  output    String?        @db.Text
  status    String         @default("SUCCESS") // SUCCESS, ERROR
  error     String?        @db.Text
  metadata  String?        @db.Text
  createdAt DateTime       @default(now())
  trace     TelemetryTrace @relation(fields: [traceId], references: [id], onDelete: Cascade)

  @@index([traceId])
  @@index([parentId])
  @@index([createdAt])
  @@map("telemetry_spans")
}
```

#### [NEW] [databaseMemoryTelemetry.test.js](file:///h:/max_p_new/backend/tests/services/databaseMemoryTelemetry.test.js)
*اختبار جودة برمجى مبدئي للتأكد من ربط الجداول بنجاح وسلاسة عمليات القراءة والكتابة وعزل المستأجرين عبر Prisma Client.*

---

## Verification Plan

### Automated Tests
سنقوم بتشغيل اختبارات الجودة للتأكد من تكامل قاعدة البيانات ومزامنتها بنجاح:
1. دمج وتوليد مخطط الجداول المحدث:
   ```bash
   cd backend
   npm run schema:generate
   ```
2. إنشاء ملف ترحيل قاعدة البيانات (Database Migration) وتطبيقه محلياً:
   ```bash
   npx prisma migrate dev --name init_agentic_memory_telemetry
   ```
3. تشغيل اختبارات الوحدة الحتمية للجداول الجديدة للتحقق من عمليات الكتابة والقراءة وعزل المستأجرين بنجاح تام:
   ```bash
   npm run test backend/tests/services/databaseMemoryTelemetry.test.js
   ```

### Manual Verification
- التحقق من ترحيل الجداول بنجاح إلى قاعدة بيانات التطوير المحلية وظهورها بشكل سليم في الـ Prisma Studio أو الاستعلامات المباشرة.
