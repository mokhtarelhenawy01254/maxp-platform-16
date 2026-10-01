# ⏱️ سياسة سماح التأخير ورصيد المرونة الشهري (Lateness Grace & Monthly Allowance Policy)

## 🎯 الغرض والرؤية الموحدة
توحيد احتساب التأخير وفترات السماح عبر جميع أجزاء منصة MaxP (قواعد البيانات، محركات احتساب الرواتب والخصومات، وواجهات برمجة التطبيقات الداخلية والخارجية) بحيث لا يوجد أي تعارض بين شاشات الواجهة، الـ API، وسجلات الداتابيز.

---

## 📌 القواعد الأساسية المعتمدة (Company Policy)

### ١) حد التسامح اليومي للتأخير (Daily Lateness Allowance)
- **القيمة الافتراضية:** **10 دقائق** لكل تسجيل حضور.
- **الحقول الممثلة:**
  - `hr_settings.lateThresholdMinutes`
  - `hr_settings.lateGracePeriod`
  - `lateness_rules.latestAllowedTime` (محسوب كـ `workStartTime + dailyThreshold`، مثلاً `10:00 + 10 = 10:10`).
- **المعنى المالي والتنظيمي:**
  - الموظف الذي يسجل حضوره حتى 10:10 (بتأخير 5 أو 10 دقائق):
    - **يُخصم التأخير من رصيد المرونة الشهري فقط** (بدون أي خصم مالي)، طالما رصيد المرونة متاح.
    - حالة الحضور لا تُحمّل عقوبة مالية.

### ٢) رصيد التسامح الشهري (Monthly Grace Balance)
- **القيمة الافتراضية:** **60 دقيقة** شهرياً لكل موظف.
- **الحقول الممثلة:**
  - `hr_settings.gracePeriodMinutes`
  - `lateness_rules.monthlyAllowanceMinutes`
  - `lateness_balances.graceMinutesUsed` (الرصيد المستهلك شهرياً).
- **آلية الاستهلاك والتجديد:**
  - يتم استهلاك دقائق التأخير اليومية المسموحة (حتى 10 دقائق في المرة) من رصيد الـ 60 دقيقة الشهري.
  - يتجدد الرصيد تلقائياً مع بداية كل شهر جديد.

---

## 🧮 معادلة الاحتساب المالي (Financial Deduction Formula)

لكل عملية تأخير بعدد دقائق `lateMinutes`:

```text
dailyAllowedPortion = min(lateMinutes, maxDailyThreshold) // بحد أقصى 10 دقائق
immediateExcessMinutes = max(0, lateMinutes - maxDailyThreshold) // ما زاد عن الـ 10 دقائق

useGraceMinutes = min(dailyAllowedPortion, remainingGrace) // يُمتص من رصيد الـ 60 دقيقة
graceExhaustedMinutes = dailyAllowedPortion - useGraceMinutes // ما لم يغطّه رصيد المرونة

totalDeductMinutes = graceExhaustedMinutes + immediateExcessMinutes
```

### أمثلة توضيحية:
1. **تأخير 5 دقائق (رصيد الشهر 60د متاح):**
   - `dailyAllowedPortion = 5`
   - `immediateExcess = 0`
   - `useGraceMinutes = 5` (يتبقى 55 دقيقة للشهر)
   - `totalDeductMinutes = 0` ⬅️ **خصم صفر جنيه**.

2. **تأخير 15 دقيقة (رصيد الشهر 60د متاح):**
   - `dailyAllowedPortion = 10`
   - `immediateExcess = 5` (تجاوز الحد اليومي)
   - `useGraceMinutes = 10` (يتبقى 50 دقيقة للشهر)
   - `totalDeductMinutes = 5` ⬅️ **يُخصم 5 دقائق فقط مضروبة في معدل الدقيقة ومضاعف التكرار**.

3. **تأخير 5 دقائق (رصيد الشهر 0د مستنفذ):**
   - `dailyAllowedPortion = 5`
   - `useGraceMinutes = 0`
   - `totalDeductMinutes = 5` ⬅️ **يُخصم 5 دقائق بالكامل**.

---

## 🔄 التزامن والتوافق في واجهات الـ API (API Synchronization)

1. **عند الاستعلام (`GET /settings`):**
   - إرجاع قيم متطابقة موحدة دائماً:
     - `lateThresholdMinutes: 10`
     - `lateGracePeriod: 10`
     - `lateThreshold: 10`
     - `gracePeriodMinutes: 60`
     - `workStartTime: "10:00"`
     - `latestAllowedTime: "10:10"`
     - `monthlyAllowanceMinutes: 60`

2. **عند التحديث (`PUT /settings`):**
   - أي تعديل على `lateThresholdMinutes` أو `lateGracePeriod` أو `lateThreshold` يحدّث كلا الحقلين في الداتابيز لنفس القيمة تلقائياً، ويعيد حساب `latestAllowedTime = workStartTime + threshold` في جدول `lateness_rules`.
   - أي تعديل على `gracePeriodMinutes` يُحدّث `lateness_rules.monthlyAllowanceMinutes` بالتزامن.
