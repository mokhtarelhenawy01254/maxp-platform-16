# استرجاع القائمة الجانبية المستقلة للسوبر أدمن - 2026-05-04

## المشكلة

صفحات `/super-admin/*` كانت ملفوفة داخل `Layout` العام، وده خلاها تستخدم `getSidebarConfig` الخاص بالشركات. النتيجة إن السوبر أدمن كان بيشوف قائمة أدوات الشركات بدل القائمة المركزية المستقلة الموجودة أصلًا في `SuperAdminSidebar`.

## الإصلاح

- أُضيف حارس `shouldUseSuperAdminShell` لتحديد متى يجب استخدام Shell السوبر أدمن.
- `Layout` العام أصبح يسلّم أي صفحة تحت `/super-admin` للمستخدم صاحب الدور `SUPER_ADMIN` إلى `SuperAdminLayout`.
- تم منع `Layout` العام من بناء قائمة الشركات أو تشغيل polling المستخدمين النشطين في نفس الحالة، عشان ما يحصلش تكرار مع `SuperAdminLayout`.
- تم تشديد `SuperAdminLayout` بحيث لا يعمل إلا مع دور `SUPER_ADMIN`.

## التحقق

- `npm test -- --runTestsByPath src/components/layout/__tests__/layoutMode.test.ts --runInBand`
- `npx eslint src/components/layout/Layout.tsx src/components/layout/SuperAdminLayout.tsx src/components/layout/layoutMode.ts src/components/layout/__tests__/layoutMode.test.ts --max-warnings=0`
- `npm run build`
