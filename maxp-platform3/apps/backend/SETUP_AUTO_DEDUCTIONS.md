# 🚀 دليل التشغيل السريع - نظام الخصومات التلقائية

## خطوات التفعيل

### 1️⃣ تشغيل قاعدة البيانات

```bash
# تشغيل SQL migration
mysql -u root -p your_database < backend/migrations/create_auto_deduction_system.sql
```

أو استخدام MySQL Workbench:
1. افتح الملف `backend/migrations/create_auto_deduction_system.sql`
2. نفذ السكريبت على قاعدة البيانات

### 2️⃣ التحقق من الجداول

تأكد من إنشاء الجداول التالية:
- ✅ `attendance_deduction_settings`
- ✅ `employee_grace_balance`
- ✅ `auto_deductions`
- ✅ `deduction_notifications`
- ✅ `violation_history`

```sql
SHOW TABLES LIKE '%deduction%';
SHOW TABLES LIKE '%grace%';
```

### 3️⃣ إعادة تشغيل الخادم

```bash
cd backend
npm run dev
```

### 4️⃣ تفعيل النظام للشركة

استخدم API لتفعيل النظام:

```bash
curl -X PUT http://localhost:3007/api/hr/auto-deductions/settings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "grace_period_minutes": 60,
    "late_threshold_minutes": 10,
    "early_checkout_enabled": true,
    "early_checkout_threshold_minutes": 0,
    "first_violation_multiplier": 1.0,
    "second_violation_multiplier": 2.0,
    "third_violation_multiplier": 3.0,
    "notify_at_percentage": 75,
    "is_active": true
  }'
```

## 🧪 اختبار النظام

### اختبار 1: تأخير بسيط (ضمن الحد المسموح)

```bash
# سجل حضور متأخر 5 دقائق
# النتيجة المتوقعة: لا خصم، استخدام من رصيد التسامح
```

### اختبار 2: تأخير أكثر من 10 دقائق

```bash
# سجل حضور متأخر 15 دقيقة
# النتيجة المتوقعة: خصم على 5 دقائق (15 - 10)
```

### اختبار 3: انصراف مبكر

```bash
# سجل انصراف قبل الموعد بدقيقة واحدة
# النتيجة المتوقعة: خصم فوري
```

### اختبار 4: نفاد رصيد التسامح

```bash
# استنفد رصيد الـ 60 دقيقة ثم سجل تأخير
# النتيجة المتوقعة: خصم مالي مباشر
```

## 📊 التحقق من البيانات

### عرض إعدادات الشركة

```sql
SELECT * FROM attendance_deduction_settings WHERE company_id = 1;
```

### عرض رصيد التسامح للموظفين

```sql
SELECT 
  e.name,
  egb.total_grace_minutes,
  egb.used_grace_minutes,
  egb.remaining_grace_minutes,
  egb.late_count
FROM employee_grace_balance egb
JOIN employees e ON egb.employee_id = e.id
WHERE egb.month = MONTH(CURRENT_DATE)
AND egb.year = YEAR(CURRENT_DATE);
```

### عرض الخصومات التلقائية

```sql
SELECT 
  ad.id,
  e.name as employee_name,
  ad.deduction_type,
  ad.minutes_late,
  ad.is_financial,
  ad.deduction_amount,
  ad.violation_count,
  ad.status,
  ad.deduction_date
FROM auto_deductions ad
JOIN employees e ON ad.employee_id = e.id
WHERE ad.company_id = 1
ORDER BY ad.created_at DESC
LIMIT 20;
```

### عرض الإشعارات

```sql
SELECT 
  e.name,
  dn.notification_type,
  dn.title,
  dn.message,
  dn.is_read,
  dn.created_at
FROM deduction_notifications dn
JOIN employees e ON dn.employee_id = e.id
WHERE dn.company_id = 1
ORDER BY dn.created_at DESC
LIMIT 10;
```

## 🔧 الإعدادات الموصى بها

### للشركات الصغيرة (أقل من 50 موظف)

```json
{
  "grace_period_minutes": 90,
  "late_threshold_minutes": 15,
  "first_violation_multiplier": 1.0,
  "second_violation_multiplier": 1.5,
  "third_violation_multiplier": 2.0,
  "notify_at_percentage": 80
}
```

### للشركات المتوسطة والكبيرة

```json
{
  "grace_period_minutes": 60,
  "late_threshold_minutes": 10,
  "first_violation_multiplier": 1.0,
  "second_violation_multiplier": 2.0,
  "third_violation_multiplier": 3.0,
  "notify_at_percentage": 75
}
```

### للشركات الصارمة

```json
{
  "grace_period_minutes": 30,
  "late_threshold_minutes": 5,
  "first_violation_multiplier": 1.5,
  "second_violation_multiplier": 2.5,
  "third_violation_multiplier": 4.0,
  "notify_at_percentage": 70
}
```

## 📱 API Endpoints المتاحة

### للموظفين

```bash
# جلب رصيد التسامح
GET /api/hr/auto-deductions/grace-balance/:employeeId

# جلب الإشعارات
GET /api/hr/auto-deductions/notifications/my

# تحديد إشعار كمقروء
PUT /api/hr/auto-deductions/notifications/:id/read
```

### للإدارة

```bash
# جلب/تحديث الإعدادات
GET /api/hr/auto-deductions/settings
PUT /api/hr/auto-deductions/settings

# جلب الخصومات
GET /api/hr/auto-deductions

# إلغاء خصم
POST /api/hr/auto-deductions/:id/cancel

# التقارير
GET /api/hr/auto-deductions/report/:employeeId
GET /api/hr/auto-deductions/stats/company
GET /api/hr/auto-deductions/alerts
```

## 🔄 المهام المجدولة

النظام يتضمن مهمة مجدولة تلقائية:

### إعادة تعيين رصيد التسامح الشهري

```sql
-- يتم تنفيذها تلقائياً في أول يوم من كل شهر
-- Event: reset_grace_balance_monthly
```

للتحقق من المهام المجدولة:

```sql
SHOW EVENTS;
SELECT * FROM information_schema.EVENTS WHERE EVENT_NAME = 'reset_grace_balance_monthly';
```

## ⚠️ استكشاف الأخطاء

### المشكلة: النظام لا يعمل

**الحلول:**
1. تحقق من أن `is_active = TRUE` في جدول `attendance_deduction_settings`
2. تأكد من وجود سجل في جدول الإعدادات للشركة
3. راجع logs الخادم للأخطاء

```bash
# عرض آخر 50 سطر من logs
tail -n 50 backend/logs/app.log
```

### المشكلة: الخصومات لا تظهر

**الحلول:**
1. تحقق من جدول `auto_deductions`
2. تأكد من أن الموظف لديه `shift_id` محدد
3. راجع أوقات الشيفت في جدول `shifts`

```sql
-- التحقق من بيانات الموظف
SELECT 
  e.id, e.name, e.shift_id, e.salary,
  s.start_time, s.end_time
FROM employees e
LEFT JOIN shifts s ON e.shift_id = s.id
WHERE e.id = YOUR_EMPLOYEE_ID;
```

### المشكلة: الإشعارات لا تصل

**الحلول:**
1. تحقق من جدول `deduction_notifications`
2. تأكد من `notify_on_deduction = TRUE` في الإعدادات

```sql
-- عرض الإشعارات غير المقروءة
SELECT * FROM deduction_notifications 
WHERE employee_id = YOUR_EMPLOYEE_ID 
AND is_read = FALSE;
```

## 📈 مراقبة الأداء

### استعلامات مفيدة للمراقبة

```sql
-- عدد الخصومات اليوم
SELECT COUNT(*) as today_deductions
FROM auto_deductions
WHERE deduction_date = CURRENT_DATE
AND status != 'cancelled';

-- إجمالي الخصومات المالية هذا الشهر
SELECT 
  COUNT(*) as count,
  SUM(deduction_amount) as total_amount
FROM auto_deductions
WHERE MONTH(deduction_date) = MONTH(CURRENT_DATE)
AND YEAR(deduction_date) = YEAR(CURRENT_DATE)
AND is_financial = TRUE
AND status = 'applied';

-- الموظفون الأكثر تأخيراً
SELECT 
  e.name,
  COUNT(*) as late_count,
  SUM(ad.deduction_amount) as total_deductions
FROM auto_deductions ad
JOIN employees e ON ad.employee_id = e.id
WHERE MONTH(ad.deduction_date) = MONTH(CURRENT_DATE)
AND YEAR(ad.deduction_date) = YEAR(CURRENT_DATE)
GROUP BY e.id
ORDER BY late_count DESC
LIMIT 10;
```

## 🎯 أفضل الممارسات

1. **راجع الإعدادات شهرياً** - تأكد من أن الإعدادات مناسبة لسياسة الشركة
2. **راقب التنبيهات** - تابع الموظفين الذين اقتربوا من نفاد رصيد التسامح
3. **راجع الخصومات الملغاة** - تأكد من عدم إساءة استخدام صلاحية الإلغاء
4. **حدث معدلات الخصم** - اضبط معدل الخصم بناءً على الراتب اليومي
5. **تواصل مع الموظفين** - أعلمهم بالنظام الجديد وكيفية عمله

## 📞 الدعم

للمساعدة أو الاستفسارات:
- راجع الملفات في `backend/services/autoDeductionService.js`
- راجع الملفات في `backend/controller/hr/autoDeductionController.js`
- راجع التوثيق الكامل في `docs/AUTO_DEDUCTION_SYSTEM.md`

---

✅ **النظام جاهز للعمل!**
