# MaxP Agent Studio (Desktop Cockpit)

تطبيق سطح مكتب مستقل مخصص لوكلاء الذكاء الاصطناعي لمنصة **MaxP** (Media Buyer, Order Confirmation, Creative Studio, Inventory).

## الفلسفة المعمارية
- **الهدف:** توفير غرفة قيادة سريعة (Cockpit) ذات سطح موحد تمكّن التاجر أو الميديا باير من إدارة الحملات ومسودات الإعلانات وتأكيد طلبات الدفع عند الاستلام (COD) وحساب الشحن وتوليد فيديوهات Veo 3.1 بضغطة زر.
- **التكامل السحابي:** التطبيق لا يحتوي على مفاتيح API محلية؛ كل الطلبات تمر عبر جلسات موثقة بالسيرفر السحابي (`https://maxp.online`)، وتسحب الأدوات والمهارات ديناميكياً من `apps/backend/agents`.
- **نظام التشغيل:**
  - نافذة بدون إطار (Frameless Window) ذات طابع داكن عصري (OLED `#09090b`).
  - اختصار عالمي فوري: `Alt + Space` لإظهار وإخفاء الاستوديو بسرعة أثناء العمل على أي برنامج.
  - أيقونة في شريط المهام (System Tray) مع تنبيهات حية.
  - ميزة التقاط الشاشة وتحليلها برؤية الذكاء الاصطناعي (Screen Vision Context).

## الأوامر التشغيلية
```bash
# تشغيل وضع التطوير المحلي
npm run dev

# بناء الـ Main Process (TypeScript)
npm run build:main

# بناء واجهة الـ React (Vite)
npm run build:renderer

# تجميع ملف التثبيت للويندوز (NSIS Installer)
npm run build:installer
```
