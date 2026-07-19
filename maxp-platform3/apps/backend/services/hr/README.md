# 👥 HR Services - خدمات الموارد البشرية

## المزايا المكتملة

### ✅ 1. مستندات الموظفين (Employee Documents)
- رفع وتحميل المستندات
- تتبع تواريخ انتهاء المستندات
- التحقق من المستندات
- إشعارات للمستندات المنتهية

### ✅ 2. سجل الرواتب (Salary History)
- عرض تاريخ التغييرات في الراتب
- تتبع الترقيات والزيادات
- تقارير التغييرات

### ✅ 3. تقييم الأداء (Performance Reviews)
- إنشاء وتحديث التقييمات
- تتبع الأهداف (Goals/KPIs)
- تقارير التقييمات

### ✅ 4. التدريب والتطوير (Employee Training)
- إدارة برامج التدريب
- تتبع حالة التدريب
- رفع شهادات التدريب
- تقارير التدريب

### ✅ 5. الإنذارات (Employee Warnings)
- إصدار إنذارات للموظفين
- تتبع الإنذارات (شفوي، كتابي، نهائي)
- إشعارات للموظفين

### ✅ 6. إدارة المناوبات (Shifts Management)
- جدولة المناوبات
- تعيين موظفين للمناوبات
- تبادل المناوبات

### ✅ 7. إدارة المزايا (Benefits Management)
- المزايا المتاحة (تأمين صحي، تأمين على الحياة، إلخ)
- اشتراكات الموظفين
- تتبع التكاليف

### ✅ 8. إدارة الترقيات (Promotions Management)
- موجود في Salary History
- تقارير الترقيات والزيادات

### ✅ 9. إدارة الاستقالات (Resignations Management)
- طلبات الاستقالة
- إجراءات إنهاء الخدمة
- مقابلات الخروج (Exit Interviews)

### ✅ 10. إدارة التغذية الراجعة (Feedback Management)
- نظام 360 درجة
- التغذية الراجعة من الزملاء
- التغذية الراجعة من المديرين

### ✅ 11. إدارة الأهداف (Goals/KPIs Management)
- تحديد الأهداف الفردية والجماعية
- تتبع التقدم
- تقييم الإنجاز

### ✅ 12. إدارة العطلات الرسمية (Public Holidays)
- إضافة/تعديل/حذف العطلات
- تأثيرها على الحضور والرواتب

## API Endpoints

جميع الـ endpoints متاحة تحت `/api/hr/`

### المستندات
- `POST /api/hr/documents` - رفع مستند
- `GET /api/hr/documents/employee/:employeeId` - جلب مستندات موظف
- `GET /api/hr/documents/expired` - المستندات المنتهية

### سجل الرواتب
- `GET /api/hr/salary-history/employee/:employeeId` - سجل رواتب موظف
- `GET /api/hr/salary-history/promotions-report` - تقرير الترقيات

### تقييم الأداء
- `POST /api/hr/performance-reviews` - إنشاء تقييم
- `GET /api/hr/performance-reviews/employee/:employeeId` - تقييمات موظف

### التدريب
- `POST /api/hr/trainings` - إنشاء سجل تدريب
- `GET /api/hr/trainings/employee/:employeeId` - سجلات تدريب موظف

### الإنذارات
- `POST /api/hr/warnings` - إنشاء إنذار
- `GET /api/hr/warnings/employee/:employeeId` - إنذارات موظف

### المناوبات
- `POST /api/hr/shifts` - إنشاء مناوبة
- `POST /api/hr/shifts/assign` - تعيين مناوبة

### المزايا
- `POST /api/hr/benefits` - إنشاء ميزة
- `POST /api/hr/benefits/enroll` - اشتراك موظف

### الأهداف
- `POST /api/hr/goals` - إنشاء هدف
- `GET /api/hr/goals` - جلب الأهداف

### التغذية الراجعة
- `POST /api/hr/feedback` - إنشاء تغذية راجعة
- `GET /api/hr/feedback` - جلب التغذية الراجعة

### الاستقالات
- `POST /api/hr/resignations` - إنشاء استقالة
- `GET /api/hr/resignations` - جلب الاستقالات

### العطلات الرسمية
- `GET /api/hr/public-holidays` - جلب العطلات
- `PUT /api/hr/public-holidays` - تحديث العطلات














































