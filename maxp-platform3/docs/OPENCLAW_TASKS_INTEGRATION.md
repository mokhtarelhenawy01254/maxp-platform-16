# OpenClaw Tasks Integration

هذه الوثيقة تشرح الربط بين نظام المهام في `/tasks` و OpenClaw عبر `Webhook provider = OPENCLAW`.

## الفكرة

- كل شركة يمكنها إنشاء webhook مستقلة من تبويب:
  - `/tasks?tab=integrations`
- وكل شركة يمكنها أيضًا حفظ إعدادات `OpenClaw` الخاصة بها لكل بيئة:
  - `local`
  - `production`
- عند اختيار `OpenClaw` كنوع الـ webhook:
  - النظام يرسل مباشرة إلى `POST /hooks/agent`
  - الـ body تتحول تلقائيًا إلى الصيغة التي تتوقعها OpenClaw
  - لا تحتاج الشركة إلى `hooks.mappings` خاصة لهذا الربط الأساسي

## ما الذي ترسله الواجهة؟

يتم حفظ الإعدادات التالية لكل شركة:

- `targetUrl`
- `customHeaders`
- `providerType = OPENCLAW`
- `providerConfig`

ويدعم `providerConfig`:

- `name`
- `agentId`
- `wakeMode`
- `deliver`
- `channel`
- `to`
- `model`
- `thinking`
- `timeoutSeconds`
- `sessionMode`
- `sessionKeyPrefix`

## إعداد OpenClaw

مثال إعداد آمن كبداية:

```json5
{
  hooks: {
    enabled: true,
    token: "YOUR_OPENCLAW_HOOKS_TOKEN",
    defaultSessionKey: "hook:ingress",
    allowRequestSessionKey: false,
    allowedSessionKeyPrefixes: ["hook:"],
    allowedAgentIds: ["main"],
  },
}
```

## إعداد webhook داخل النظام

من شاشة التكاملات:

- يمكنك استخدام `الإعداد السريع لـ OpenClaw` لتحديد:
  - البيئة `local / production`
  - `Base URL`
  - `Hook Token`
  - `agentId`
  - `wake mode`
  - `session mode`
  ثم:
  - `حفظ الإعداد لهذه البيئة` مرة واحدة لكل شركة
  - تعبئة نموذج الـ webhook تلقائيًا
  - أو `إنشاء webhook الآن`
  - أو `إنشاء ثم اختبار`
- اختر `OpenClaw`
- أو استخدم preset الجاهزة:
  - `OpenClaw محلي`
  - `OpenClaw إنتاج`
- استخدم:
  - `targetUrl`: `http://127.0.0.1:18789/hooks/agent`
  - `customHeaders`:

```json
{
  "Authorization": "Bearer YOUR_OPENCLAW_HOOKS_TOKEN"
}
```

## الإعدادات المحفوظة للشركة

- يتم حفظ إعدادات `OpenClaw` على مستوى الشركة داخل قاعدة البيانات، وليس في `.env`.
- يمكن لكل شركة الاحتفاظ بإعداد مستقل لـ:
  - `local`
  - `production`
- عند وجود إعداد محفوظ لنفس البيئة:
  - يمكن ترك حقل `Hook Token` فارغًا في الإعداد السريع
  - وسيستخدم النظام الـ token المحفوظة تلقائيًا عند:
    - `تعبئة النموذج تلقائيًا`
    - `إنشاء webhook الآن`
    - `إنشاء ثم اختبار`
- يتم عرض الـ token بشكل masked فقط داخل الواجهة، ولا تظهر قيمتها الكاملة إلا في مسار reveal الداخلي عند الحاجة.
- هذا يسمح لكل شركة أن تضبط OpenClaw مرة واحدة ثم تعيد استخدام الإعداد في التطوير أو الإنتاج بدون إعادة إدخال الأسرار كل مرة.

## Session Mode

### `default`

- الأكثر أمانًا
- يعتمد على `hooks.defaultSessionKey`
- لا يحتاج `allowRequestSessionKey=true`

### `task-scoped`

- ينشئ session مستقلة لكل مهمة
- يرسل `sessionKey = <prefix><taskId>`
- يحتاج داخل OpenClaw:

```json5
{
  hooks: {
    allowRequestSessionKey: true,
    allowedSessionKeyPrefixes: ["hook:task:"],
  },
}
```

## ملاحظات تشغيلية

- `deliver=false` يعني أن OpenClaw ستعالج الحدث داخليًا، مع بقاء summary في `main session`.
- `deliver=true` يتيح أيضًا إرسال الرد النهائي إلى قناة OpenClaw المختارة.
- لكل بيئة `dev / staging / prod` استخدم `HOOK TOKEN` مستقلة.
- لا تستخدم `gateway.auth.token` نفسها بدل `hooks.token`.
- في `production` استخدم دومين HTTPS ثابت مثل:
  - `https://openclaw.example.com/hooks/agent`
- إذا كانت الشركة تستخدم OpenClaw محلية في التطوير ونسخة HTTPS في الإنتاج، احفظ البيئتين معًا داخل نفس الشركة ثم بدّل البيئة فقط من الشاشة.

## ما الذي تم اختباره؟

تم التحقق محليًا من:

- تفعيل `POST /hooks/agent`
- إنشاء webhook `providerType=OPENCLAW`
- إرسال test delivery من نظام المهام
- استلام `200 OK` من OpenClaw مع `runId`
- حفظ إعداد `OpenClaw` للشركة ثم استخدامه من الواجهة بدون إعادة إدخال `Hook Token`
- إنشاء webhook من الواجهة عبر `إنشاء ثم اختبار` بعد الاعتماد على الإعداد المحفوظ
