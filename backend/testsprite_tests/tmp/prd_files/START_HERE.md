# 🚀 ابدأ من هنا - نظام الافليت والدروب شيبنج

## ✅ النظام جاهز 100%!

جميع الملفات موجودة ومتكاملة. فقط تحتاج لتشغيل Migration.

## 📋 الخطوات السريعة

### 1️⃣ تشغيل Migration (مطلوب)

افتح Terminal في مجلد `backend` وشغل:

```bash
cd backend

# الطريقة الأولى (موصى بها)
npx prisma migrate deploy

# أو الطريقة الثانية
npx prisma db push

# ثم تحديث Prisma Client
npx prisma generate
```

### 2️⃣ إعادة تشغيل الخوادم

```bash
# Backend
cd backend
npm run dev

# Frontend (في terminal آخر)
cd frontend
npm run dev
```

### 3️⃣ اختبار النظام

#### صفحات Frontend:
- ✅ `/affiliates/register` - تسجيل مسوق جديد
- ✅ `/affiliates/dashboard` - لوحة تحكم المسوق
- ✅ `/affiliates/orders` - طلبات المسوق
- ✅ `/affiliates/products` - منتجات المسوق (للطريقة الثانية)
- ✅ `/affiliates/customers` - عملاء المسوق
- ✅ `/merchants` - إدارة التجار
- ✅ `/platform/commissions` - إدارة العمولات

#### API Endpoints:
- ✅ `POST /api/v1/affiliates/register` - تسجيل مسوق
- ✅ `GET /api/v1/affiliates/me` - بيانات المسوق
- ✅ `GET /api/v1/affiliates/orders` - طلبات المسوق
- ✅ `POST /api/v1/affiliates/orders` - إنشاء طلب مباشر
- ✅ `GET /api/v1/merchants` - قائمة التجار
- ✅ `GET /api/v1/commissions` - قائمة العمولات

## 🎯 الميزات المتاحة

### ✅ طريقتان للعمولة:
1. **نسبة مئوية**: المسوق يحصل على نسبة من السعر النهائي
2. **هامش ربح**: المسوق يضيف هامش على سعر ثابت

### ✅ طريقتان لإنشاء الطلبات:
1. **رابط الإحالة**: `?ref=AFFILIATE_CODE`
2. **طلب مباشر**: المسوق ينشئ طلب من حسابه

### ✅ الميزات الأخرى:
- ✅ المسوق يرى طلباته فقط
- ✅ نظام الدروب شيبنج كامل
- ✅ حساب عمولات تلقائي (مسوق، تاجر، منصة)
- ✅ تتبع الإحالات والعمولات

## 📁 الملفات المهمة

### Backend:
- `backend/services/affiliateService.js` - إدارة المسوقين
- `backend/services/commissionService.js` - حساب العمولات
- `backend/services/merchantService.js` - إدارة التجار
- `backend/services/dropshippingService.js` - توجيه الطلبات
- `backend/routes/affiliateRoutes.js` - API للمسوقين
- `backend/routes/merchantRoutes.js` - API للتجار
- `backend/routes/commissionRoutes.js` - API للعمولات

### Frontend:
- `frontend/src/pages/affiliates/*` - صفحات المسوقين
- `frontend/src/pages/merchants/*` - صفحات التجار
- `frontend/src/pages/platform/*` - صفحات الإدارة

### Database:
- `backend/prisma/migrations/20260123_add_affiliate_dropshipping_system/` - Migration files

## ⚠️ ملاحظات مهمة

1. **Migration ضروري**: يجب تشغيل Migration قبل استخدام النظام
2. **العمولات**: تُحسب تلقائياً عند تأكيد الطلب (status = CONFIRMED)
3. **التجار**: يمكن ربط منتجاتهم بمنتجات النظام من صفحة Products
4. **المسوقين**: يمكنهم إنشاء طلبات مباشرة أو عن طريق روابط الإحالة

## 🎉 جاهز للاستخدام!

بعد تشغيل Migration، النظام سيكون جاهزاً بالكامل!
