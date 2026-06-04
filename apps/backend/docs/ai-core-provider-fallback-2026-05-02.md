# CoreAIAgent Provider Fallback - 2026-05-02

## الهدف

بدء توحيد النظام حول `CoreAIAgent` بدون حذف `aiAgentService` الآن. التغيير يجعل Core يستخدم مزود النظام النشط عبر `aiAgentService.generateAIResponse` كـ fallback مضبوط عندما لا يوجد مفتاح Gemini/Google صالح أو عندما يفشل Gemini.

## ما تم تنفيذه

- إضافة `generateConfiguredProviderFallbackReply` داخل `CoreAIAgent`.
- إضافة prompt fallback عام `buildCoreProviderFallbackPrompt` بدلا من حصره في `/test-chat`.
- الإبقاء على wrapper الاختبار `generateTestProviderFallbackReply` حتى لا ينكسر المسار السابق.
- تمرير `conversationId` داخل `contextBag` لاستخدامه في تتبع محاولات المزود.
- حفظ metadata داخل `contextBag.providerFallbackMetadata` حتى تظهر في `/test-chat`.
- إضافة grounding أوضح للمنتج المثبت في prompt fallback:
  - اسم المنتج
  - السعر
  - الألوان
  - المقاسات
- إضافة قاعدة صريحة: لو العميل يسأل عن السعر والمنتج مثبت، يجب ذكر سعر المنتج المثبت.
- إضافة timeout مخصص لمسار OpenRouter من خلال:
  - `CORE_AI_PROVIDER_FALLBACK_ATTEMPTS`، الافتراضي `2`
  - `CORE_AI_PROVIDER_FALLBACK_TIMEOUT_MS`، الافتراضي `12000`
- تحديث `OpenRouterProvider` ليدعم `timeoutMs` على مستوى الطلب الواحد.
- تحديث `responseGenerator` لتمرير `messageContext.timeoutMs` إلى المزود.

## السلوك الجديد

داخل `CoreAIAgent.thinkAndGenerateResponse`:

1. Core يحاول الرد الحتمي السريع إن وجد.
2. يبني `authoritativeReplyBlueprint`.
3. يبحث عن مفتاح Google/Gemini.
4. لو لا يوجد Gemini صالح:
   - يحاول المزود النشط من إعدادات النظام، حاليا OpenRouter.
   - لو رد المزود غير ملتزم بالـ blueprint، يرجع Core إلى الـ blueprint.
   - لو فشل المزود، يرجع Core إلى الـ blueprint أو fallback منخفض المخاطر.
5. لو Gemini موجود لكنه فشل:
   - يحاول المزود النشط بنفس القواعد.
   - ثم يعود للردود الآمنة.

## التحقق

تم تشغيل:

- `node --check backend/services/CoreAIAgent.js`
- `node --check backend/services/aiAgent/responseGenerator.js`
- `node --check backend/services/aiAgent/providers/OpenRouterProvider.js`

Smoke مباشر على `CoreAIAgent.processMessageForTest`:

- تحية عامة:
  - `provider`: `OPENROUTER`
  - `model`: `CoreAIAgent + openai/gpt-oss-20b:free`
  - `fallbackSource`: `configured_provider`
  - زمن المزود: حوالي 3 ثواني

- سؤال سعر بالإنجليزية لتجنب مشكلة ترميز PowerShell:
  - الرسالة: `What is the price of Running Sneakers?`
  - `provider`: `OPENROUTER`
  - `model`: `CoreAIAgent + openai/gpt-oss-20b:free`
  - grounding: `Running Sneakers`
  - الرد ذكر السعر: `89.99 جنيه`

## ملاحظات

- عند تشغيل smoke بمحادثة وهمية غير موجودة في قاعدة البيانات يظهر تحذير `conversation.update` لأن المحادثة ليست موجودة. هذا لا يخص المسار الحقيقي في `/test-chat` أو Facebook حيث تكون المحادثة محفوظة.
- تحذير Redis 3.2.100 مع BullMQ ما زال موجودا، ولا يخص هذا التغيير مباشرة.
- هذه خطوة أولى فقط. لم يتم نقل WhatsApp أو تعليقات Facebook إلى Core بعد، ولم يتم حذف `aiAgentService`.
- تم إعادة تشغيل الباك إند المحلي على `http://localhost:3008` بعد التعديل، وفحص `/api/v1/health` رجع `200`.
