# عملاء ماكس بي المستهدفين (Target Customers) — من الكود فعلاً
تاريخ الاستخراج: 2026-08-23
المصدر: فحص كود `apps/frontend/src` (marketplace.ts, appRegistry.ts, storefront/variants/registry.ts, Register.tsx) + `apps/backend/prisma/schema/*`

---

## ١. أنواع النشاط التجاري الرسمية (businessType — من marketplace.ts starter bundles)
دي الـ6 أنواع اللي السيستم بيقترحها كحزم جاهزة عند التسجيل:
1. fashionStore — محل أزياء / ملابس
2. restaurant — مطعم / مأكولات
3. electronics — إلكترونيات
4. pharmacy — صيدلية
5. services — خدمات (مواعيد + فواتير)
6. education — تعليم

## ٢. الوحدات/التطبيقات النشطة (appRegistry.ts) — بتحدد مين العميل اللي محتاج كل أداة
من التطبيقات المبنية فعلاً، نستنتج شرائح العملاء:
- order-core + pos → مطاعم، كافيهات، محلات بيع مباشر
- order-shipping-turbo → شركات شحن / تجار بيع أونلاين
- order-invoicing → تجار، محاسبين، شركات خدمات
- inventory-pro → محلات، صيدليات، مخازن
- crm-loyalty → أي بيزنس بالعملاء (مطاعم، عيادات، محلات)
- whatsapp-business + bot-automation + unified-inbox → أي بيزنس بيتواصل مع عملائه
- appointments-pro (ف services bundle) → عيادات، صالونات، خدمات مواعيد
- hr-basic / hr-attendance / hr-payroll → شركات فيها موظفين
- analytics-advanced → أي بيزنس عايز يقيس

## ٣. ثيمات المتجر (storefront archetypes — من registry.ts)
ده أكبر مصدر لأنواع العملاء — الثيمات المتاحة فعلاً في السيستم:
- fashion / women-fashion / menswear / streetwear / modestwear / ready-to-wear / capsule-wardrobe
- jewelry / watches / bags / accessories / premium-accessories / gift-jewelry
- beauty / skincare / perfume / cosmetics / beauty-ritual
- electronics / gadgets / computer-retail / desk-gear / creator-tools
- pets / pet-food / pet-care / pet-commerce
- grocery / fresh-grocery / produce-boxes / organic / plants / spices / food-market
- butcher-shop / fresh-meat / premium-butcher / luxury-food
- pharmacy-lite / care-products
- bookstore / books
- toys / kids / playful
- fitness / automotive / automotive-parts / garage-commerce / bikes / sports-retail / mobility
- florist / artisan / gifting / gifts / travel-goods
- gaming / tech / dark-mode
- restaurant / cafe (theme-demo/restaurant, theme-demo/pharmacy موجودة)
- hotel / hospitality (admin/hotel module موجود)
- realestate (موجود في i18n)

## ٤. الوحدات المتخصصة (من sidebar.ts + i18n)
- hotel-app → فنادق / إقامة
- booking / appointments → عيادات، صالونات، خدمات
- hr → شركات بأقسام وموظفين
- ledgers / accounting

## ٥. القطاعات التسويقية (Verticals المستنتجة من الـApp + الداتا)
بناءً على كل ما سبق، العميل المستهدف الحقيقي لمكس بي (منتج 299 جنيه/شهر) يتقسم لـ **24 شريحة فعلية**:

| # | الشريحة | الأدوات الأنسب له | مصدر في الكود |
|---|---|---|---|
| 1 | مطاعم / كافيهات | order-core, pos, whatsapp, crm-loyalty | starter bundle + theme restaurant |
| 2 | صيدليات | inventory-pro, order-core, crm | pharmacy bundle + pharmacy-lite |
| 3 | محلات أزياء | store-basic, crm, whatsapp, analytics | fashion bundle |
| 4 | إلكترونيات | order-core, inventory, analytics | electronics bundle |
| 5 | خدمات / مواعيد | appointments-pro, invoicing, whatsapp | services bundle |
| 6 | تعليم / كورسات | crm, whatsapp, broadcast, hr | education bundle |
| 7 | عيادات | appointments, crm-loyalty, whatsapp | booking module |
| 8 | صالونات / تجميل | appointments, crm, beauty theme | beauty archetype |
| 9 | مجوهرات | jewelry theme, crm, whatsapp | jewelry archetype |
| 10 | مستحضرات تجميل | beauty/skincare theme, crm | beauty-ritual |
| 11 | حيوانات أليفة | pets theme, repeat-order, crm | pets archetype |
| 12 | بقالة / سوبر ماركت | grocery theme, inventory, order-core | grocery archetype |
| 13 | لحوم / جزارة | butcher-shop theme, inventory | butcher archetype |
| 14 | عضوي / نباتات | plants/organic theme, inventory | organic archetype |
| 15 | كتب / مكتبات | bookstore theme, crm | bookstore archetype |
| 16 | ألعاب / أطفال | toys/kids theme, crm | kids archetype |
| 17 | لياقة بدنية | fitness theme, crm | fitness archetype |
| 18 | سيارات / قطع غيار | automotive theme, inventory | automotive archetype |
| 19 | دراجات / رياضة | bikes theme, inventory | bikes archetype |
| 20 | ورود / هدايا | florist/gifting theme, crm | florist archetype |
| 21 | ألعاب / جيمنج | gaming theme, crm | gaming archetype |
| 22 | فنادق / ضيافة | hotel-app, booking, hr | hotel module |
| 23 | عقارات | realestate, crm | realestate i18n |
| 24 | شركات شحن | order-shipping-turbo, crm | shipping module |

+ شريحة شاملة: **الوكالات/المسوقين** (بيشتروا ماكس بي يديروا عملائهم) + **المقارنين** (HubSpot/Zoho).

---

## الخلاصة
ماكس بي فيها **فوق 20 نوع عميل حقيقي** (24 شريحة فعلية مستنتجة من الكود).
الأهم: كل شريحة ليها **أدوات محددة** جوا السيستم — وده اللي بيخلي الـ91 Persona فكرة صح: كل Persona = شريحة + الأداة اللي بتحل ألمها + القناة + الأتمتة.

ملاحظة: الـMarketplace (متجر التطبيقات المفتوح) لسه `UNUSED` في السكيما — يعني التوزيع حالياً عبر الـApp Registry الداخلي + نظام الشركاء (platform-partner).
