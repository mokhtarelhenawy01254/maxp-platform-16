# تحسين صفحات Facebook Ads - 2026-05-04

## الصفحات

- `/advertising/facebook-ads`
- `/advertising/facebook-ads/decision-reports`

## المشكلة

الصفحتان كانتا مبنيتين كـ "command center" مختصر جداً: نصوص إنجليزية، مؤشرات قليلة، وفلاتر محدودة. أهم عيب عملي كان أن فترة الأداء ثابتة في الكود، لذلك المستخدم لا يعرف هل الأرقام آخر 7 أيام أم 30 يوم، ولا يستطيع تثبيت فترة عمله المعتادة.

## ما تم تحسينه

- إضافة فلتر فترة زمنية واضح: اليوم، أمس، آخر 7/14/30/90 يوم، هذا الشهر، وفترة مخصصة.
- حفظ فلاتر الصفحات في `localStorage` بحيث تبقى كما هي حتى يغيرها المستخدم بنفسه.
- توضيح صفحة الحملات بعناوين عربية، KPI cards، حالة تسليم فعلية، توصيات، وفلاتر للهدف والحالة والمصدر والترتيب.
- إضافة backend endpoint جديد: `/api/v1/facebook-ads/reports/performance-breakdown`.
- دعم تقارير breakdown على مستوى الحملة:
  - العمر والجنس: `age,gender`
  - الموضع والمنصة: `publisher_platform,platform_position`
  - المنصة، الجهاز، الدولة، المحافظة
- جعل صفحة تقارير القرار تعرض كل حملة لوحدها مع تشخيص سريع: Hook ضعيف، إنفاق بدون شراء، إرهاق جمهور، قابل للتوسيع، أو لا يوجد تسليم.

## ما كان ناقصاً حسب البحث

- Meta Insights API مبني على breakdowns لتجميع النتائج، ويدعم تقارير كبيرة عبر async jobs حسب Postman Meta Marketing API collection.
- تقارير الأداء القياسية يجب أن تعرض delivery breakdowns مثل العمر، الجنس، الدولة، المحافظة، `publisher_platform`، `platform_position`، و`device_platform`.
- تقارير actions مختلفة عن delivery breakdowns؛ لذلك لا يجب خلط كل شيء في طلب واحد عند الحاجة لتفصيل conversion actions.
- أدوات التقييم ليست ROAS فقط. يلزم فصل المشكلة إلى: الكريتيف/CTR، التكرار/Frequency، conversion path، Pixel/Purchase tracking، والموضع/الجمهور.
- Ad relevance diagnostics المفيدة للتقييم الإضافي هي Quality Ranking وEngagement Rate Ranking وConversion Rate Ranking، لكنها تعمل كتشخيص بجانب KPI التجاري وليست قرار إيقاف/توسيع وحدها.

## التحقق

- `backend`: `npx jest tests/controller/facebookAdsController.performanceSummary.test.js --runInBand`
- `frontend`: `npx eslint src/pages/advertising/FacebookAdsDashboard.tsx src/pages/advertising/MediaBuyingReports.tsx src/services/facebookAdsService.ts src/utils/facebookAdsReportFilters.ts --max-warnings=0`
- `frontend`: `npm run build`
- Smoke محلي على `http://127.0.0.1:3000/advertising/facebook-ads` و`/advertising/facebook-ads/decision-reports` بدون console errors.

## المصادر

- Meta Marketing API Insights collection في Postman: https://www.postman.com/meta/facebook-marketing-api/folder/zzd6d5p/insights-api
- Improvado Facebook Ads Insights & Actions Reports docs: https://improvado.io/docs/facebook-ads-insights-actions-reports
- Ad Relevance Diagnostics overview: https://www.adwhiz.ai/glossary/ad-relevance-diagnostics
- Meta ad auction overview: https://www.facebook.com/business/ads/ad-auction
- Meta ads machine learning/help overview: https://www.facebook.com/help/447278887528796?locale=en_GB
