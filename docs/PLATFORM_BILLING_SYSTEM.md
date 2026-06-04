# 📊 نظام Platform Billing - دليل شامل

## 🎯 نظرة عامة

تم تطوير نظام شامل لإدارة اشتراكات المنصة والفواتير، مع فصل واضح بين:
1. **اشتراكات العملاء (Customer Plans)** - الاشتراكات القديمة للعملاء
2. **اشتراكات المنصة (Platform Billing)** - النظام الجديد لرسوم المنصة الشهرية

---

## 📋 الفرق بين النظامين

### 1️⃣ **اشتراكات العملاء (Customer Plans)**

**الغرض:** إدارة اشتراكات العملاء في خدمات الشركة

**الصفحات:**
- `/super-admin/subscriptions` - إدارة اشتراكات العملاء
- `/super-admin/invoices` - فواتير العملاء
- `/super-admin/payments` - مدفوعات العملاء

**APIs:**
```javascript
GET  /admin/subscriptions
POST /admin/subscriptions
POST /admin/subscriptions/:id/cancel
POST /admin/subscriptions/:id/renew

GET  /admin/invoices
POST /admin/invoices/:id/send
PUT  /admin/invoices/:id/status

GET  /admin/payments
POST /admin/payments
```

**الملفات:**
- `frontend/src/pages/SuperAdminSubscriptions.jsx`
- `frontend/src/pages/SuperAdminInvoices.jsx`
- `frontend/src/pages/SuperAdminPayments.jsx`

---

### 2️⃣ **اشتراكات المنصة (Platform Billing)**

**الغرض:** إدارة رسوم المنصة الشهرية (99-499 ج/شهر)

**الصفحات:**
- `/super-admin/platform-subscriptions` - إدارة اشتراكات المنصة
- `/super-admin/billing-overview` - نظرة عامة على الإيرادات

**APIs:**
```javascript
GET  /api/v1/super-admin/platform/subscriptions
PUT  /api/v1/super-admin/platform/subscription/:id
GET  /api/v1/super-admin/platform/billing-overview
GET  /api/v1/super-admin/platform/marketplace-stats
POST /api/v1/super-admin/platform/marketplace-app
PUT  /api/v1/super-admin/platform/marketplace-app/:id
DELETE /api/v1/super-admin/platform/marketplace-app/:id
PUT  /api/v1/super-admin/platform/plan-limit/:plan
POST /api/v1/super-admin/platform/retry-failed-payment/:id
```

**الملفات:**
- `frontend/src/pages/super-admin/PlatformSubscriptions.tsx`
- `frontend/src/pages/super-admin/BillingOverview.tsx`
- `backend/controller/superAdminPlatformController.js`
- `backend/routes/superAdminPlatformRoutes.js`

---

## 🗄️ Database Models

### Platform Subscription Models

```prisma
model PlatformSubscription {
  id                String              @id @default(cuid())
  companyId         String              @unique
  plan              SubscriptionPlan    @default(BASIC)
  monthlyFee        Decimal             @db.Decimal(10, 2)
  status            SubscriptionStatus  @default(ACTIVE)
  billingDay        Int                 @default(1)
  nextBillingDate   DateTime
  lastBillingDate   DateTime?
  failedAttempts    Int                 @default(0)
  
  company           Company             @relation(fields: [companyId], references: [id])
}

model EnterprisePlan {
  id                String   @id @default(cuid())
  companyId         String   @unique
  customMonthlyFee  Decimal  @db.Decimal(10, 2)
  customLimits      Json
  dedicatedSupport  Boolean  @default(true)
  apiAccess         Boolean  @default(true)
  
  company           Company  @relation(fields: [companyId], references: [id])
}

model PlanLimit {
  id                String           @id @default(cuid())
  plan              SubscriptionPlan @unique
  maxEmployees      Int              @default(-1)
  maxProducts       Int              @default(-1)
  maxOrdersPerMonth Int              @default(-1)
  hasAdvancedReports Boolean         @default(false)
  hasAPIAccess      Boolean          @default(false)
}

model BillingHistory {
  id                String              @id @default(cuid())
  companyId         String
  type              BillingHistoryType
  amount            Decimal             @db.Decimal(10, 2)
  description       String
  status            String
  
  company           Company             @relation(fields: [companyId], references: [id])
}
```

---

## 🎨 Frontend Structure

### للشركات (Company Pages)

```
/subscription/plans          - عرض الخطط المتاحة
/subscription/my-subscription - إدارة الاشتراك
/subscription/usage          - إحصائيات الاستخدام
/marketplace                 - متجر الأدوات
/my-apps                     - أدواتي المفعلة
/wallet                      - المحفظة
```

### للسوبر أدمن (Super Admin Pages)

```
القسم 1: إدارة الشركات
├── /super-admin/companies
└── /super-admin/wallet-management

القسم 2: اشتراكات العملاء (Customer Plans)
├── /super-admin/subscriptions
├── /super-admin/invoices
└── /super-admin/payments

القسم 3: اشتراكات المنصة (Platform Billing)
├── /super-admin/platform-subscriptions
└── /super-admin/billing-overview
```

---

## ⚙️ Billing Cron Service

**الملف:** `backend/services/billingCronService.js`

**الوظائف:**
- يعمل يومياً الساعة 2 صباحاً
- خصم رسوم المنصة الشهرية (99-499 ج)
- خصم اشتراكات الأدوات
- تنبيهات الرصيد المنخفض
- تحديث حالة الاشتراكات

**الأنواع:**
```javascript
processPlatformFees()      // خصم رسوم المنصة
processAppSubscriptions()  // خصم اشتراكات الأدوات
checkLowBalances()         // تنبيهات الرصيد المنخفض
```

---

## 💰 خطط المنصة (Platform Plans)

| الخطة | السعر الشهري | الموظفين | المنتجات | الطلبات/شهر |
|-------|--------------|----------|----------|-------------|
| **BASIC** | 99 ج | 5 | 100 | 500 |
| **PRO** | 199 ج | 20 | 500 | 2000 |
| **ENTERPRISE** | 499 ج | غير محدود | غير محدود | غير محدود |

---

## 🔄 التكامل بين الأنظمة

### Wallet System
- جميع الخصومات تتم من `CompanyWallet`
- يتم تسجيل جميع العمليات في `WalletTransaction`
- يتم تسجيل الفواتير في `BillingHistory`

### Marketplace System
- الأدوات المفعلة في `CompanyApp`
- تتبع الاستخدام في `AppUsageLog`
- قواعد التسعير في `PricingRule`

### Platform Subscription
- الاشتراك الحالي في `PlatformSubscription`
- الخطط المخصصة في `EnterprisePlan`
- حدود الخطط في `PlanLimit`

---

## 📊 إحصائيات ومؤشرات

### للسوبر أدمن

**Platform Subscriptions:**
- إجمالي الاشتراكات
- الاشتراكات النشطة
- MRR (Monthly Recurring Revenue)
- الاشتراكات المعلقة/المتأخرة

**Billing Overview:**
- إجمالي الإيرادات
- MRR
- الإيرادات حسب النوع (Platform Fee, App Subscription, Usage)
- الإيرادات حسب الخطة (BASIC, PRO, ENTERPRISE)
- الدفعات الفاشلة

### للشركات

**Usage Stats:**
- الموظفين (مقابل الحد الأقصى)
- المنتجات (مقابل الحد الأقصى)
- الطلبات الشهرية (مقابل الحد الأقصى)
- العملاء (مقابل الحد الأقصى)

---

## 🚀 الميزات الرئيسية

### ✅ تم التنفيذ

1. **Platform Subscription Management**
   - 3 خطط (BASIC, PRO, ENTERPRISE)
   - خصم تلقائي شهري
   - تتبع حالة الاشتراك
   - معالجة الدفعات الفاشلة

2. **Billing & Revenue**
   - نظرة عامة شاملة على الإيرادات
   - تحليلات حسب النوع والخطة
   - سجل الفواتير الكامل
   - تتبع MRR

3. **Usage Tracking**
   - مراقبة الاستخدام مقابل الحدود
   - تنبيهات عند الاقتراب من الحد
   - إحصائيات تفصيلية

4. **Marketplace Integration**
   - 10 أدوات جاهزة
   - تسعير حسب الاستخدام
   - باقات مخفضة
   - تتبع الاستخدام الفوري

---

## 🔧 التكوين والإعداد

### Environment Variables

```env
DATABASE_URL="mysql://..."
VITE_API_URL="http://localhost:3007"
```

### Database Migration

```bash
# تطبيق التغييرات على Database
npx prisma db push

# تشغيل Seed Data
node prisma/seeds/marketplaceSeed.js
```

### Backend Startup

```bash
cd backend
npm start
```

الـ Billing Cron Service سيبدأ تلقائياً عند تشغيل Backend.

---

## 📝 ملاحظات مهمة

### ⚠️ تجنب الخلط بين النظامين

1. **Customer Subscriptions** = اشتراكات العملاء في خدمات الشركة
2. **Platform Subscriptions** = رسوم المنصة الشهرية (99-499 ج)

### 🔒 الصلاحيات

- **Super Admin:** الوصول الكامل لجميع الصفحات
- **Company Owner/Admin:** الوصول لصفحات الشركة فقط
- **Company Manager:** الوصول للقراءة فقط

### 💡 أفضل الممارسات

1. استخدم `PlatformSubscriptions` لإدارة رسوم المنصة
2. استخدم `SuperAdminSubscriptions` لإدارة اشتراكات العملاء
3. راقب `BillingOverview` للإيرادات والتحليلات
4. تحقق من `Usage Stats` لمراقبة استخدام الشركات

---

## 🎉 الخلاصة

النظام الآن يحتوي على:
- ✅ نظام كامل لإدارة اشتراكات المنصة
- ✅ نظام منفصل لإدارة اشتراكات العملاء
- ✅ تكامل كامل مع Marketplace
- ✅ خصم تلقائي شهري
- ✅ تحليلات وإحصائيات شاملة
- ✅ واجهات منفصلة للشركات والسوبر أدمن

**النظام جاهز 100% للإنتاج! 🚀**
