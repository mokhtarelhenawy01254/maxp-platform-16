# فريق MaxP — دليل العمل على القاعدة الجديدة

## 🎯 القاعدة الرسمية: `v2.0-stable`

- **Tag:** `v2.0-stable`
- **Commit:** `a8aa1d42` (= `4523730` + إصلاح 41 خطأ runtime)
- **الفرع:** `main`

**هذا هو أساس كل الشغل الجديد. لا نرجع لأي commit قديم من الـ main.**

---

## 🚀 إعداد المشروع

```bash
git clone https://github.com/mokhtar267/maxp-platform-6.git
cd maxp-platform-6

# الفرونت
cd apps/frontend
npm install

# الباك-إند
cd ../backend
npm install
```

---

## ✅ قبل ما تعمل push — فحص إلزامي

أي تغيير بيلمس `apps/frontend` لازم يعدي الفحص ده:

```bash
cd apps/frontend
npx tsc --noEmit
```

**القاعدة الذهبية:**
- `Cannot find name` = **0** ← لازم صفر (هذه أخطاء runtime بتوقع الموقع)
- `Cannot find module` في ملفات جديدة = تأكد إن الملف ده متوصّل فعلاً (مش dead code)
- بعدها: `npm run build` لازم ينجح

لو ظهر أي `Cannot find name` → الملف ناقص import → **أضف الـ import قبل الـ push**.

---

## 🔄 سير العمل

1. **اعمل feature branch** من `main`:
   ```bash
   git checkout -b feature/my-feature
   ```
2. **اشتغل واعمل فحص tsc** قبل الـ commit
3. **اعمل PR** لـ `main`
4. بعد الـ merge → الـ GitHub Actions **ينشر تلقائياً** على maxp.online

---

## ⚠️ تحذير مهم — الكومنتات المكسورة

الكومنتات اللي بعد `4523730` في تاريخ git (الـ i18n refactor `55a962e` وإصلاحاته) كانت **مكسورة** وبتوقع الموقع (مئات الـ imports الناقصة).

**ممنوع** دمج أو cherry-pick أي منها على `main` إلا بعد:
1. فحص tsc كامل = 0 `Cannot find name`
2. تأكد إنك فاهم ليه بتضيفها

---

## 📌 ملاحظات

- الريبو `maxp-platform7` (المستضاف تحت omokhtar748-hub) **متجاهل** — مش بنستخدمه للنشر
- إذا حصل خطأ في production → نرجع لـ `v2.0-stable` فوراً
