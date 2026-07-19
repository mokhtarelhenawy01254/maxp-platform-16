# Core AI message fallback guard - 2026-05-05

## المشكلة

مراجعة سجلات الإنتاج أظهرت أن إزالة الردود المعلبة لم تكن كافية. بقيت ثلاث حالات تصل للعميل:

- ردود Gemini/Gemma فيها أجزاء تحليل داخلي مثل `Since this is the first message` و`Refining for conciseness`.
- `sanitizeCustomerFacingReply()` كان يستخدم `fallbackReply` عند مسح رد فارغ أو مسرب، فيتحول التسريب إلى رد حتمي بديل بدلا من الصمت.
- رسائل التحية داخل محادثة قديمة كانت تسحب منتجا محفوظا من ملخص المحادثة، ثم تبني رد سعر/شحن كأنه سؤال تجاري.

## القرار

- لا يستخدم الـsanitizer أي fallback عند فشل استخراج رد آمن من تسريب داخلي. النتيجة الفارغة تذهب لحارس الصمت قبل الإرسال.
- توسع كاشف التسريب ليشمل صيغ `User provided`, `User says`, `Available Data`, `Analysis`, `Reasoning`, و`Refining for ...`.
- تحية العميل فقط لا تبني `authoritative blueprint` من منتج محفوظ، ولا تستدعي product memory/history enrichment.
- إزالة التحية الآن تحذف افتتاحية الرد فقط وتترك جسم الرد الحقيقي، بدلا من مسح الرد كاملا ثم الاعتماد على fallback.

## التحقق

- `node --check backend/services/CoreAIAgent.js`
- `CoreAIAgent.catalogVariantContext.test.js`: 127/127
