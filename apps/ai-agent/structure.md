# ai-agent — Project Structure

خدمة Node.js/TypeScript مسؤولة عن تشغيل AI Agents متعددة بـ Gemini مع multi-agent routing وtool execution.

---

## هيكل الملفات

```
apps/ai-agent/
├── src/
│   ├── index.ts                          # Entry point — Express server على PORT 3001
│   ├── db/
│   │   └── client.ts                     # Prisma client — يستورد من backend/generated/postgresql_v2
│   ├── providers/
│   │   ├── gemini-provider.ts            # Gemini API wrapper (function calling)
│   │   ├── usage-tracker.ts             # تسجيل النجاح/الفشل في ai_provider_logs
│   │   └── provider-manager.ts          # Failover logic: DB keys → env key
│   ├── tools/
│   │   ├── executor.ts                  # Dispatcher — يوجّه tool call للـ implementation الصح
│   │   ├── seed.ts                      # يزرع الـ 14 أداة في agent_tool_definitions
│   │   └── implementations/
│   │       ├── orders.ts               # getOrders, getOrderDetails ($queryRaw)
│   │       ├── products.ts             # getProducts ($queryRaw)
│   │       ├── customers.ts            # getCustomers, getCustomerHistory ($queryRaw)
│   │       ├── hr.ts                   # getEmployees, getPayrolls, getAttendance ($queryRaw)
│   │       ├── analytics.ts            # getDailyAnalytics, getProductAnalytics, getCommissions ($queryRaw)
│   │       └── write.ts                # updateOrderStatus, createOrder, createTask + ApprovalFlow
│   ├── core/
│   │   ├── soul.ts                     # بناء system prompt من agent.soul + agent.rules + memory
│   │   ├── memory-manager.ts           # قراءة/كتابة agentic_memory_facts
│   │   ├── router.ts                   # يستخدم Gemini لاختيار sub-agent المناسب
│   │   ├── agent-runner.ts             # الحلقة الكاملة: routing → tools → memory → telemetry
│   │   └── skills-engine.ts            # تحميل company_skills وإضافتها للـ system prompt
│   ├── telemetry/
│   │   └── tracer.ts                   # telemetry_traces + telemetry_spans
│   ├── task-manager/
│   │   └── task-runner.ts              # ai_agent_tasks + ai_agent_runs
│   └── api/
│       ├── server.ts                   # Express app factory
│       └── routes/
│           ├── agent.ts                # POST /agent/run
│           ├── tools.ts                # GET/POST/PATCH /tools
│           └── sub-agents.ts          # GET/POST /agents, PATCH /:id/tools, GET /:id/tree
├── prisma/
│   └── schema.prisma                   # ⚠ NOT USED — موجود للمرجع فقط
├── package.json
├── tsconfig.json
├── .env.example
└── .gitignore
```

---

## قاعدة البيانات

### مصدر الـ Prisma Client
```
apps/backend/prisma/schema.prisma
        │
        └─(npm run schema:generate)──► apps/backend/generated/postgresql_v2/
                                                    ▲
                                                    │ import
                                        apps/ai-agent/src/db/client.ts
```

- **الـ ai-agent لا يملك schema.prisma خاص بيه** ولا يشغّل migrations.
- كل الـ migrations تتعمل من `apps/backend` فقط.
- لازم تشغّل `npm run schema:generate` من `apps/backend` قبل ما تبدأ الـ ai-agent لأول مرة أو بعد أي تغيير في الـ schema.

### جدول جديد أُضيف في هذه الجلسة
| الجدول | الموديل | الوصف |
|--------|---------|-------|
| `agent_tool_definitions` | `AgentToolDefinition` | تعريفات الأدوات المتاحة للـ agents |

---

## الجداول المستخدمة (من backend schema)

| الجدول | القراءة/الكتابة | الوصف |
|--------|----------------|-------|
| `company_agents` | قراءة | تحميل الـ agent وأبنائه |
| `agent_tool_definitions` | قراءة/كتابة | الأدوات المتاحة |
| `ai_keys` | قراءة/تحديث | API keys + currentUsage |
| `ai_model_configs` | قراءة | الـ models المرتبطة بكل key |
| `ai_model_limits` | قراءة | RPD limits لكل model |
| `excluded_models` | قراءة/كتابة | models متوقفة مؤقتاً (failover) |
| `ai_provider_logs` | كتابة | سجل كل LLM call |
| `agentic_memory_facts` | قراءة/كتابة | الذاكرة طويلة المدى |
| `telemetry_traces` | قراءة/كتابة | trace لكل رسالة |
| `telemetry_spans` | كتابة | span لكل خطوة |
| `ai_agent_tasks` | قراءة/كتابة | المهام |
| `ai_agent_runs` | كتابة | سجل تنفيذ المهام |
| `ai_tool_approval_requests` | قراءة/كتابة | طلبات الموافقة على write tools |
| `company_skills` | قراءة | المهارات المخصصة للـ agents |

---

## API Endpoints

| Method | Path | الوصف |
|--------|------|-------|
| `POST` | `/agent/run` | تشغيل agent برسالة — body: `{ agentId, companyId, message }` |
| `GET` | `/tools` | قائمة الأدوات — query: `?companyId=` |
| `POST` | `/tools` | إضافة أداة جديدة |
| `PATCH` | `/tools/:id` | تعديل/تعطيل أداة |
| `GET` | `/agents` | قائمة الـ agents — query: `?companyId=` |
| `POST` | `/agents` | إنشاء agent أو sub-agent |
| `PATCH` | `/agents/:id/tools` | تحديث skills الـ agent |
| `GET` | `/agents/:id/tree` | شجرة الـ agents الكاملة |
| `GET` | `/health` | health check |

---

## Provider Failover Logic

```
1. جلب DB keys (isActive=true, provider=GOOGLE) مرتبة بـ priority
2. لكل key: تحقق أن currentUsage < maxRequestsPerDay
3. لكل model في الـ key: تحقق أنه مش في excluded_models
4. لو فشل الـ call:
   - 429 → excluded_models لمدة 60 ثانية
   - 503 → excluded_models لمدة 5 دقائق
   - Quota → excluded_models لمدة 24 ساعة
5. Fallback نهائي: GEMINI_API_KEY من .env
```

---

## المتغيرات البيئية

```env
POSTGRES_URL=postgresql://user:pass@host:5432/db
PORT=3001
NODE_ENV=production
MAX_ROUTING_DEPTH=3
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-2.5-flash
```
