# إصلاح خطأ إنشاء الطلب عبر مسار المحادثة واليدوي (500 Invalid prisma.order.create)

- **التاريخ:** 2026-10-16
- **المكون:** `apps/backend/services/orderService.js` (`createOrderFromConversation`)

## 1. المشكلة
عند استدعاء مسار إنشاء الطلب من المحادثة أو اليدوي (`POST /api/v1/orders-new/create`)، كان الخادم يعيد خطأ 500:
```
Invalid `prisma.order.create()` invocation:
Unknown argument `conversationId`. Did you mean `conversation`?
```
مما أدى إلى تعطل إنشاء الطلبات عبر هذا المسار، وتعطل طبقة سكور الطلبات المرتبطة به.

## 2. السبب الجذري
في Prisma Client، عند تمرير علاقات متداخلة (Nested Relations) في كائن `data` مثل:
`company: { connect: { id } }` و `customer: { connect: { id } }` و `orderItems: { create: [...] }`،
يقوم Prisma بمطابقة المعاملات مع نوع `OrderCreateInput`.
في هذا النوع، لا يوجد حقل رقمي/نصي مفرد باسم `conversationId`؛ بل الحقل المعرف للعلاقة هو `conversation: ConversationCreateNestedOneWithoutOrdersInput`.
لذلك، كان تمرير `conversationId: conversationId || null` يُرفض من محرك Prisma باعتباره `Unknown argument conversationId`.

## 3. الإصلاح (Least Change)
1. تم التحقق من وجود المحادثة مسبقاً وتخزين معرفها الصحيح `existingConversationId = conv.id`.
2. تم استبدال الحقل المفرد بالربط العلائقي الشرطي:
```javascript
...(existingConversationId ? { conversation: { connect: { id: existingConversationId } } } : {})
```
بحيث:
- إذا لم يكن هناك `conversationId` (طلب يدوي للاختبار): لا يتم تمرير أي حقل خاص بالمحادثة ويكون الحقل `NULL` في قاعدة البيانات دون أي اعتراض من Prisma.
- إذا كان هناك `conversationId` وموجود في القاعدة: يتم ربطه علائقياً بنجاح (`conversation: { connect: { id } }`).
- إذا كان هناك `conversationId` غير موجود في القاعدة: لا يتم إلقاء خطأ FK constraint أو record not found، مع الحفاظ على القيمة في `metadata.conversationId` وملاحظات الطلب.

## 4. التحقق
- تشغيل اختبار الانحدار الآلي `scripts/verify-order-create-fix.cjs` والتأكد من نجاح الحالات الثلاث.
- اختبار حي على بيئة الإنتاج على شركة الاختبار `cmuxvt9ae01njjubzegkcwkar`.
