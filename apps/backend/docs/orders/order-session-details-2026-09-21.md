# توثيق ميزة تفاصيل الجلسة في الطلبات والطلبات غير المكتملة
تاريخ التوثيق: 21 سبتمبر 2026

## 1. نبذة عن الميزة (Feature Overview)
تمت إضافة بطاقة تحليلية موحدة "تفاصيل الجلسة" (Session Details) تعرض داخل صفحة تفاصيل كل طلب (`/orders/:id`) وصفحة تفاصيل كل طلب غير مكتمل (`/orders/incomplete/:cartId`).

## 2. البيانات الثمانية المتتبعة والمعروضة (Tracked Data Points)
1. **عنوان الـ IP الخاص بالعميل (`ip`)**:
   - استخراجه من هيدرز الحماية (Cloudflare `cf-connecting-ip` أو `x-forwarded-for` أو `x-real-ip`).
   - إمكانية نسخ الـ IP بضغطة واحدة مع شارة الدولة.
2. **موقع الـ IP الجغرافي (`ipGovernorate`, `ipCity`)**:
   - المحافظة والمدينة المعتمدة في مصر والعالم.
   - ترجمة أسماء المحافظات المصرية تلقائيًا للغة العربية المعتمدة.
3. **مصدر الدخول على الموقع (`trafficSource`)**:
   - المنصة أو المصدر (Facebook, Instagram, TikTok, Google, Direct, Referral).
   - الحملة الإعلانية واسمها والمجموعة الإعلانية وروابط الإحالة وUTM Parameters.
4. **مسار الصفحات التي زارها العميل (`pagesVisited`)**:
   - رحلة زمنية تفاعلية متسلسلة لجميع الصفحات التي تنقل بينها العميل في المتجر قبل الطلب، مع عنوان الصفحة وطابع زمني دقيق لكل صفحة.
5. **الوقت المستغرق في الشراء أو التصفح (`durationSeconds`)**:
   - حساب إجمالي الوقت بالدقائق والثواني بدقة `tabular-nums`.
6. **عدد الجلسات الإجمالي للزائر (`sessionCount`)**:
   - إجمالي الجلسات التي فتحها الزائر على المتجر (بفاصل 30 دقيقة خمول لكل جلسة).
7. **تاريخ وتوقيت أول زيارة (`firstSeenAt`)**:
   - توقيت أول مرة دخل فيها هذا المتصفح للمتجر.
8. **سجل أول طلب للعميل (`firstOrderInfo`)**:
   - شارة توضح هل هذا أول طلب للعميل في المتجر (عميل جديد لأول مرة)، أم عميل متكرر مع عرض رقم وتاريخ أول طلب وإجمالي عدد طلباته السابقة.

## 3. المعمارية الفنية (Technical Architecture)
- **الواجهة الأمامية (Storefront Tracking)**:
  - `apps/frontend/src/storefront/utils/storefrontSessionTracker.ts`: إدارة معرف الزائر الدائم، الجلسات، وسجل الصفحات.
  - `apps/frontend/src/storefront/hooks/useStorefrontVisitTracking.ts`: تسجيل زيارات الصفحات فور تنقل العميل.
  - `apps/frontend/src/storefront/hooks/useCheckout.ts` & `apps/frontend/src/utils/storefrontApi.ts`: إرفاق بيانات الجلسة عند حفظ المسودة أو إرسال الطلب.
- **الخلفية وقواعد البيانات (Backend Processing)**:
  - `apps/backend/utils/ipGeoLookup.js`: فك وتحديد الـ IP الجغرافي.
  - `apps/backend/utils/sessionDetailsHelper.js`: توحيد وحفظ بيانات الجلسة وحساب تاريخ أول طلب للعميل.
  - `apps/backend/routes/publicOrdersRoutes.js`: حفظ بيانات الجلسة في مسودة الطلب غير المكتمل والطلب النهائي.
  - `apps/backend/routes/orders.js`: استرجاع بيانات الجلسة وسجل أول طلب في تفاصيل الطلب المكتمل وغير المكتمل.
- **واجهة لوحة التحكم (Dashboard UI)**:
  - `apps/frontend/src/pages/orders/components/OrderSessionDetailsCard.tsx`: بطاقة تفاعلية أحادية السطح متوافقة مع الوضعين الليلي والنهاري وبدون إيموجي (Anti-AI-Slop).
  - مدمجة في `OrderDetails.tsx` و `IncompleteOrderDetails.tsx`.
