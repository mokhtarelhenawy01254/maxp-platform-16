# OPENCODE_FIXES — 83791d03 (جولة ١ → ٢)

مراجعة OpenCode على 278c22922: **FIX_FIRST** — 1 BLOCKER / 1 BUG / 1 RISK (معايير 2/3).
التحقق من الـfindings: كل `file:line` اتأكد في نفس الكوميت (278c22922) بـ`git show` — التقرير مقبول.

| # | النوع | الملاحظة | الإصلاح | الدليل |
|---|---|---|---|---|
| ١ | BLOCKER | `migration.sql:31-36` بضيف FK لـ`sample_orders` اللي مش موجود في أي migration سابقة (بيتعمل runtime DDL) → migration تفشل على قاعدة نضيفة | الـFK بقى داخل `IF to_regclass('public.sample_orders') IS NOT NULL` — على قاعدة نضيفة يتخطى بدل الفشل | `migration.sql:31-45` · `psql -v ON_ERROR_STOP=1 -f migration.sql` على `maxp_qa` نجح |
| ٢ | BUG | فحص التكرار والإنشاء عمليتين منفصلتين → سباق إضافة متزامنة، ومفيش قيد DB | `lockSampleComponents` — `pg_advisory_xact_lock(hashtext(companyId:sampleId))` داخل `$transaction` في add/update، والفحص والكتابة بقوا في نفس الـtransaction | ٥ POST متزامنة على نفس العينة: 1×201 + 4×409 + `db_rows=1` (`evidence/83791d03_concurrency.json`) |
| ٣ | RISK | مفيش تست ناجح لتعديل/إعادة حساب مكوّن | أضفت تست «تعديل ناجح للكمية»: 40→120 وsample 50→130 + list parity | Jest: 34/34 (تست 7 جديد) |

## ملاحظات
- بوابة الواجهة (Vitest) لسه مش قابلة للتشغيل عند المراجع — `node_modules/.bin/vitest` مش موجود في بيئة المراجعة (بيئي). البوابة ٢ اتعملت بالـbrowser من عندي على QA محلي.
- الـRISK البيئي (مفيش DB عند المراجع) اتغطى بتشغيل API فعلي على QA (10/10) + سباق 5 طلبات.
