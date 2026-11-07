# حزمة أدلة 83791d03 — مكونات العينة (rework)

كل الأدلة هنا اتولدت بتشغيل فعلي على بيئة QA محلية (Postgres 17 على 127.0.0.1:5433/`maxp_qa` + backend من نفس الكوميت). مفيش أي اتصال بالإنتاج.

## الملفات
| الملف | إيه اللي يثبته |
|---|---|
| `83791d03_api.json` | 10 سيناريوهات API: إضافة مكوّن (100/130) · تكرار اسم (409) · إضافة تانية (120/150) · تعديل لاسم مكرر (409) · تعديل كمية (170/200) · حذف (150/180) · list parity · مكوّن مرتبط بمنتج · تكرار productId (409) |
| `83791d03_concurrency.json` | سباق إضافة: 5 POST متزامنة → 1×201 + 4×409 + صف واحد · سباق تعديل: quantity=2 + unitPrice=100 معًا → total=200 في الرد وفي DB |
| `83791d03_snapshot.json` | تغيير catalog cost 1225→999 والـ`unitPrice` للمكوّن فضل 10 (سعر وقت الإضافة محفوظ) |
| `83791d03_migration_clean_db.json` | تشغيل الـmigration على قاعدة نضيفة `maxp_8379_clean2`: enums + `sample_orders` + `sample_order_components` + FK=1، وبعدها القاعدة اتشالت |
| `83791d03_g2_ui_flow.json` | البوابة ٢: من الشاشة، مكونات 160.00→170.00 وإجمالي العينة 190→200 في نفس الجلسة + رسالة التكرار |

## إعادة التشغيل
```bash
# 1) قاعدة QA + backend من الكوميت (مثال)
#    backend على 3104 وPSQL متاح في C:/Users/ali wazery/maxp-qa/pg/pgsql/bin

# 2) API
MAXP_QA_BASE=http://127.0.0.1:3104 python verify_83791d03_api.py

# 3) سباق الإضافة + التعديل
MAXP_QA_BASE=http://127.0.0.1:3104 python verify_83791d03_concurrency2.py

# 4) Snapshot السعر (بيغيّر product cost ويرجّعه)
MAXP_QA_BASE=http://127.0.0.1:3104 python verify_83791d03_snapshot2.py

# 5) الـmigration على قاعدة نضيفة
createdb -h 127.0.0.1 -p 5433 -U postgres maxp_clean_check
psql -h 127.0.0.1 -p 5433 -U postgres -d maxp_clean_check -v ON_ERROR_STOP=1 \
  -f apps/backend/prisma/migrations/20261108000000_sample_order_components/migration.sql
psql -h 127.0.0.1 -p 5433 -U postgres -d maxp_clean_check -Atc \
  "select count(*) from information_schema.table_constraints where constraint_name='sample_order_components_sampleOrderId_fkey';"
dropdb -h 127.0.0.1 -p 5433 -U postgres maxp_clean_check
```

`MAXP_QA_BASE` افتراضيًا `http://127.0.0.1:3104`، و`MAXP_QA_PGPASS_FILE` افتراضيًا `C:/Users/ali wazery/maxp-qa/pg/PGPASS.txt`.

## الاختبارات الآلية
```
cd apps/backend
node node_modules/jest/bin/jest.js __tests__/manufacturingSampleOrders.test.js --runInBand
# Test Suites: 1 passed — Tests: 34 passed (منهم 7 جديدة لـ83791d03)
```
