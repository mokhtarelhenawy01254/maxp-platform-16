# OPENCODE_FIXES — 83791d03 (جولة ١ → ٢)

مراجعة OpenCode على 278c22922: **FIX_FIRST** — 1 BLOCKER / 1 BUG / 1 RISK (معايير 2/3).
التحقق من الـfindings: كل `file:line` اتأكد في نفس الكوميت (278c22922) بـ`git show` — التقرير مقبول.

| # | النوع | الملاحظة | الإصلاح | الدليل |
|---|---|---|---|---|
| ١ | BLOCKER | `migration.sql:31-36` بضيف FK لـ`sample_orders` اللي مش موجود في أي migration سابقة (بيتعمل runtime DDL) → migration تفشل على قاعدة نضيفة | الـFK بقى داخل `IF to_regclass('public.sample_orders') IS NOT NULL` — على قاعدة نضيفة يتخطى بدل الفشل | `migration.sql:31-45` · `psql -v ON_ERROR_STOP=1 -f migration.sql` على `maxp_qa` نجح |
| ٢ | BUG | فحص التكرار والإنشاء عمليتين منفصلتين → سباق إضافة متزامنة، ومفيش قيد DB | `lockSampleComponents` — `pg_advisory_xact_lock(hashtext(companyId:sampleId))` داخل `$transaction` في add/update، والفحص والكتابة بقوا في نفس الـtransaction | ٥ POST متزامنة على نفس العينة: 1×201 + 4×409 + `db_rows=1` (`evidence/83791d03_concurrency.json`) |
| ٣ | RISK | مفيش تست ناجح لتعديل/إعادة حساب مكوّن | أضفت تست «تعديل ناجح للكمية»: 40→120 وsample 50→130 + list parity | Jest: 34/34 (تست 7 جديد) |

## جولة ٢ → ٣ (مراجعة OpenCode على 22e29a14d: FIX_FIRST — 0 BLOCKER / 1 BUG / 1 RISK · معايير 3/3)

| # | النوع | الملاحظة | الإصلاح | الدليل |
|---|---|---|---|---|
| ٤ | BUG | `updateSampleComponent` بيقرأ المكوّن ويحسب `patch.totalCost` **قبل** القفل/الـtransaction → تعديلان متزامنان ممكن يكتبوا total من snapshot قديم (مثال: quantity=2 و unitPrice=100 → total=100 بدل 200) | نقل قراءة المكوّن وحساب الـpatch بالكامل جوه الـtransaction بعد `pg_advisory_xact_lock` — كل تعديل بيقرأ آخر قيمة مقفولة | سباق تعديل حقيقي على QA: PATCH quantity=2 + PATCH unitPrice=100 في نفس اللحظة → النتيجة 2 × 100 = 200 والـDB `2.000\|100.00\|200.00` (`evidence/83791d03_concurrency.json`) |
| ٥ | RISK | الـFK كان بيتخطى على تثبيت نضيف لأن `sample_orders` بيتعمل لاحقًا runtime | الـmigration بقت self-contained: بتنشئ enums + `sample_orders` (IF NOT EXISTS) + indexes قبل جدول المكونات، والـFK unconditional | قاعدة نضيفة `maxp_8379_clean2`: الجدولان اتعملوا + `fk_constraints_added=1` (`evidence/83791d03_migration_clean_db.json`) |
| ٦ | — | `lockSampleComponents` كانت fail-open (بتسكت على أي خطأ) | بقت fail-closed: ترمي 500 لو مفيش دعم raw queries، وبتستخدم `$executeRawUnsafe` (void-safe) لأن `$queryRaw` بيفشل في deserialize `pg_advisory_xact_lock` | فحص حي: 3 أوضاع قفل على Prisma حقيقي (`executeRawUnsafe OK`) + كل الـAPI 10/10 + السباقان PASS |

اختبارات ما بعد الجولة ٣: Jest 34/34 · API 10/10 · add race (5 متزامنة → 1×201 + 4×409) · edit race (200) · بوابة الموقع 160/190 → 170/200.

## ملاحظات
- بوابة الواجهة (Vitest) لسه مش قابلة للتشغيل عند المراجع — `node_modules/.bin/vitest` مش موجود في بيئة المراجعة (بيئي). البوابة ٢ اتعملت بالـbrowser من عندي على QA محلي.
- الـRISK البيئي (مفيش DB عند المراجع) اتغطى بتشغيل API فعلي على QA (10/10) + سباق 5 طلبات.
