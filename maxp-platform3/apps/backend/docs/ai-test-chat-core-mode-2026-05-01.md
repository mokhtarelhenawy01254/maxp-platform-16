# /test-chat CoreAIAgent Mode

## الهدف

صفحة `/test-chat` أصبحت قادرة على اختبار مسارين للذكاء الاصطناعي:

- `Legacy/OpenRouter`: المسار القديم عبر `aiAgentService.processCustomerMessage`.
- `CoreAIAgent`: نفس عقل الإنتاج المستخدم مع محادثات Facebook، لكن بدون إرسال الرد للخارج.

## التدفق

عند اختيار `CoreAIAgent` من واجهة `/test-chat`:

1. الواجهة ترسل `agentMode: "core"` مع الرسالة أو الاختبار السريع.
2. `testChatController` يستدعي `CoreAIAgent.processMessageForTest`.
3. Core يبني `contextBag` بنفس منطق الإنتاج: الذاكرة، RAG، الكتالوج، الشحن، بيانات الطلب، والتحقق من الرد.
4. النتيجة ترجع إلى صفحة الاختبار كرسالة AI عادية مع metadata توضّح `agentMode`, `provider`, `model`, وبيانات grounding.

## سلوك fallback في الاختبار

مسار الإنتاج في `CoreAIAgent` يعتمد على Gemini في مرحلة التفكير الحر. بيئة الاختبار المحلية قد لا تحتوي على مفتاح Gemini، لذلك وضع `/test-chat` يتعامل مع الصمت هكذا:

- لو Core قدر يبني رد حتمي من بيانات الكتالوج/الشحن/الأوردر، يستخدمه مباشرة.
- لو لا يوجد رد حتمي، يستخدم مزود النظام النشط عبر `aiAgentService.generateAIResponse` كـ fallback محدود المحاولات.
- fallback الحالي محدود بـ `maxProviderAttempts: 2` حتى لا تتجمد صفحة الاختبار عند بطء أو انتهاء كوتة OpenRouter.

هذا fallback خاص بمسار الاختبار ولا يغير مسار إرسال رسائل Facebook في الإنتاج.

## التحقق المحلي

- `node --check backend/services/CoreAIAgent.js`
- `node --check backend/controller/testChatController.js`
- `node --check backend/services/aiAgent/responseGenerator.js`
- Smoke مباشر على `CoreAIAgent.processMessageForTest`:
  - سؤال كتالوج عام رجع رد `CORE` حتمي.
  - تحية عامة رجعت رد عبر `OPENROUTER` fallback باستخدام `openai/gpt-oss-20b:free`.

## ملاحظات

- تحذير Redis المحلي المتوقع مستمر: BullMQ يحتاج Redis 5+ بينما البيئة الحالية تستخدم Redis 3.2.100.
- عند اختبار OpenRouter المجاني، البطء أو 429 من المزود الخارجي ما زال ممكن، لكن وضع Core في `/test-chat` لن ينتظر كل المفاتيح بلا حدود.
