# CoreAIAgent Central Provider Routing - 2026-05-05

## المشكلة

`CoreAIAgent` كان يبدأ مسار توليد الردود النصية بمحاولة Gemini/Google مباشرة من `GEMINI_API_KEY` أو أول مفتاح Google في قاعدة البيانات. هذا كان يتجاوز إعدادات المزود المركزي مثل OpenRouter، ويتجاوز خيار الشركة `useCentralKeys`، ثم لا يصل للمزود المركزي إلا كـ fallback بعد فشل Google.

في نفس الوقت، `ModelManager.getNextKeySimple` كان يحتفظ بمفاتيح الشركة فقط عندما توجد، حتى لو المزود النشط في النظام المركزي هو OpenRouter والمفتاح المتاح لهذا المزود مركزي.

## التعديل

- `ModelManager.getNextKeySimple` أصبح يبقي مفاتيح `CENTRAL` داخل مجموعة الاختيار كـ fallback حتى في وضع company-first.
- اختيار المفاتيح أصبح provider-first عبر مفاتيح الشركة والمفاتيح المركزية معاً:
  - يفضل مفاتيح المزود النشط في `GlobalAiConfig.defaultProvider`.
  - لو لا توجد مفاتيح للمزود النشط وكان `enableFailover=true`، ينتقل لباقي المفاتيح.
  - لو failover معطل، لا يبدل إلى مزود آخر.
- `CoreAIAgent.thinkAndGenerateResponse` أصبح يستدعي `ModelManager` قبل مسار Gemini القديم:
  - لو المزود المختار غير Google، يستخدم `aiRuntimeService.generateAIResponse` كمسار أساسي ولا يتجاوز إلى Gemini للردود النصية.
  - لو المزود المختار Google، يستخدم المفتاح والموديل المختارين من `ModelManager`.
  - أخطاء Gemini النصية ترسل الآن إلى rotator/model failure tracking حتى لا يعلق المسار على نفس المفتاح المستنفد.

## التحقق

- `node --check services/CoreAIAgent.js`
- `node --check services/aiAgent/modelManager.js`
- `node --check tests/services/CoreAIAgent.catalogVariantContext.test.js`
- `node --check tests/services/modelManager.centralProviderRouting.test.js`
- `node node_modules/jest/bin/jest.js --runInBand --runTestsByPath tests/services/modelManager.centralProviderRouting.test.js --testTimeout=30000 --detectOpenHandles=false`
- `node node_modules/jest/bin/jest.js --runInBand --runTestsByPath tests/services/CoreAIAgent.catalogVariantContext.test.js --testNamePattern "uses the configured central provider before legacy Gemini text generation" --testTimeout=30000 --forceExit`
