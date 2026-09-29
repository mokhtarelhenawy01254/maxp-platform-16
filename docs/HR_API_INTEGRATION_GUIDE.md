# MaxP Platform — HR API & Integrations Developer Guide

دليل المطورين والأنظمة الخارجية للربط والتكامل مع نظام الموارد البشرية (HR) في منصة **MaxP**.

---

## 📌 الفهرس
1. [المعمارية ونظرة عامة (Overview)](#1-المعمارية-ونظرة-عامة)
2. [المصادقة والصلاحيات (Authentication & Scopes)](#2-المصادقة-والصلاحيات)
3. [عناوين الخدمة (Base URLs)](#3-عناوين-الخدمة)
4. [مواصفات الـ API والـ Swagger](#4-مواصفات-الـ-api-والـ-swagger)
5. [النقاط النهائية للخدمة (Endpoints Reference)](#5-النقاط-النهائية-للخدمة)
6. [دليل ربط أجهزة البصمة (ZKTeco Biometric Sync)](#6-دليل-ربط-أجهزة-البصمة-zkteco)
7. [الـ Webhooks والتحقق من التوقيع (HMAC SHA-256)](#7-الـ-webhooks-والتحقق-من-التوقيع)
8. [الربط مع أدوات الذكاء الاصطناعي (Custom GPTs / n8n / Zapier)](#8-الربط-مع-أدوات-الذكاء-الاصطناعي)

---

## 1. المعمارية ونظرة عامة

يقدم MaxP HR API واجهة برمجية آمنة متعددة المستأجرين (Multi-tenant) ومبنية وفق معايير **REST** مع تشفير مفاتيح الربط وتجزئتها (SHA-256 Hash)، ومراقبة الصلاحيات على مستوى كل طلب (Granular Scopes).

### حالات الاستخدام الأساسية:
- **أجهزة البصمة البيومترية:** رفع حركات الحضور والانصراف اللحظية أو المجمعة (Batch Ingestion).
- **أنظمة الـ ERP (Odoo / SAP / ERPNext):** مزامنة الموظفين، الأقسام، والإجازات.
- **وكلاء ونماذج الذكاء الاصطناعي (AI Agents):** الاستعلام عن بيانات الموظفين، التحقق من الأرصدة، وتقديم طلبات الإجازات نيابة عن الموظفين عبر المحادثة.

---

## 2. المصادقة والصلاحيات

كل شركة أو فرع يقوم بإنشاء مفاتيح الربط الخاصة به من لوحة التحكم:
`https://maxp.online/hr/integrations`

### البنية الدقيقة للمفتاح (Key Anatomy):
يتكون المفتاح من ثلاثة أجزاء مفصولة بـ `_` بطول إجمالي 69 حرفاً:
```text
hrk_{16_hex_public_prefix}_{48_hex_secret}
```
- **البادئة (Fixed Prefix):** `hrk` (3 أحرف).
- **المعرف العام (Public Identifier):** 8 بايت عشوائية مشفرة Hex &larr; **16 حرفاً** (يُحفظ في قاعدة البيانات كـ `keyPrefix` مع البادئة لتحديد المفتاح بسرعة دون فك التشفير).
- **الرمز السري (Secret Token):** 24 بايت عشوائية مشفرة Hex (`crypto.randomBytes(24)`) &larr; **48 حرفاً** (يُحفظ مشفراً فقط بتجزئة SHA-256).

مثال حي متطابق:
```text
hrk_58903fa80570b7e7_830cc84a3da252756f67be5a66e891619aab6684800feca9
│   │                │
│   │                └─ Secret (48 حرف Hex)
│   └─ Public Prefix (16 حرف Hex)
└─ Service Indicator (hrk)
```

### طريقة تمرير المفتاح:
يجب تمرير المفتاح كاملاً في ترويسة الطلب (Header) عبر أحد الخيارين:
- **الخيار الأول (الموصى به):**
  ```http
  x-api-key: hrk_58903fa80570b7e7_830cc84a3da252756f67be5a66e891619aab6684800feca9
  ```
- **الخيار الثاني:**
  ```http
  Authorization: Bearer hrk_58903fa80570b7e7_830cc84a3da252756f67be5a66e891619aab6684800feca9
  ```

### جدول الصلاحيات المتاحة (Scopes):
| الصلاحية | النوع | الوصف والمسارات المشمولة |
| :--- | :--- | :--- |
| `*` | Umbrella | وصول كامل لكافة دوال الموارد البشرية (قراءة + كتابة + اعتماد) |
| `hr:read` | Umbrella | صلاحية قراءة لكافة المسارات الاستعلامية (الموظفين، الأقسام، الحضور، الإجازات، الرواتب) |
| `hr:write` | Umbrella | صلاحية كتابة وتعديل لكافة المسارات (إضافة موظفين، رفع بصمات، تقديم إجازات، وب هوكس) |
| `hr:departments:read` | Granular | استعلام قائمة الأقسام وتفاصيلها (`GET /departments`) |
| `hr:positions:read` | Granular | استعلام المسميات والوظائف (`GET /positions`) |
| `hr:employees:read` | Granular | قراءة بيانات الموظفين، الإحصائيات، والهيكل التنظيمي (`GET /employees`, `/stats`, `/organization-chart`, `/:id`) |
| `hr:employees:write` | Granular | إنشاء أو تعديل بيانات موظف (`POST /employees/upsert`) |
| `hr:attendance:ingest` | Granular | رفع حركات البصمة والحضور من الأجهزة البيومترية (`POST /attendance/punches/batch`) |
| `hr:attendance:read` | Granular | استعلام كشف الحضور اليومي والملخص الإحصائي (`GET /attendance/today`, `GET /attendance/summary`) |
| `hr:leaves:read` | Granular | استعلام طلبات وأرصدة الإجازات (`GET /leaves`, `GET /leaves/balances`) |
| `hr:leaves:write` | Granular | تقديم طلب إجازة جديد نيابة عن موظف (`POST /leaves`) |
| `hr:leaves:approve` | Granular | اتخاذ قرار قبول أو رفض طلب إجازة مع تدوين الملاحظة (`POST /leaves/:id/decision`) |
| `hr:payroll:read` | Granular | استعلام مسيرات الرواتب والمفردات والبدلات والخصومات (`GET /payroll/runs`, `GET /payroll/runs/:id/items`) |

### حدود الاستخدام ومعدل الطلبات (Rate Limiting):
- **معدل الطلبات للمفاتيح (API Keys):** `120` طلب بالدقيقة بنظام Token Bucket، مع سعة تدفق قصوى (Burst) تبلغ `30` طلب، وحاجز أمان لا يتجاوز `10` طلبات في الثانية الواحدة.
- **مسارات التوثيق العامة (Docs & OpenAPI):** `60` طلب بالدقيقة لكل عنوان IP.
- **تجاوز المعدل:** يُرجع الخادم رمز الحالة `429 Too Many Requests` مع ترويسة `Retry-After` توضح عدد الثواني للانتظار.

### جدول أكواد الأخطاء الموحدة (Error Codes):
| الرمز البرمجي (Error Code) | رمز الحالة (HTTP) | الوصف والمعنى |
| :--- | :--- | :--- |
| `AUTH_KEY_REQUIRED` | 401 | لم يتم تزويد مفتاح API في ترويسة الطلب (`x-api-key` أو `Authorization`). |
| `INVALID_KEY_FORMAT` | 401 | بنية المفتاح غير صحيحة (يجب أن تبدأ بـ `hrk_` متبوعة ببادئة وسر سداسي عشري). |
| `INVALID_CREDENTIALS` | 401 | المفتاح غير موجود أو لا يتطابق السر السري المشفر مع السجل في قاعدة البيانات. |
| `KEY_REVOKED` | 401 | تم إلغاء وتجميد هذا المفتاح من قبل الإدارة. |
| `KEY_EXPIRED` | 401 | انتهت فترة صلاحية هذا المفتاح. |
| `COMPANY_INACTIVE` | 401 | حساب الشركة في منصة MaxP غير نشط أو معلق. |
| `FORBIDDEN_SCOPE` | 403 | المفتاح صالح لكنه لا يملك الصلاحية اللازمة للوصول لهذا المسار (محدد بالـ Scope). |
| `RATE_LIMIT_EXCEEDED` | 429 | تجاوز الحد المسموح به من الطلبات (120 req/min). |

---

## 3. عناوين الخدمة

- **Production Gateway:**
  ```text
  https://api.maxp.online/api/v1/external/hr
  ```

---

## 4. مواصفات الـ API والـ Swagger

- **رابط الاستكشاف التفاعلي (Interactive Swagger UI):**
  [https://api.maxp.online/api/v1/external/hr/docs](https://api.maxp.online/api/v1/external/hr/docs)
- **رابط تحميل مواصفات OpenAPI 3.1 بصيغة JSON:**
  [https://api.maxp.online/api/v1/external/hr/openapi.json](https://api.maxp.online/api/v1/external/hr/openapi.json)

---

## 5. النقاط النهائية للخدمة (Endpoints Reference)

### 👥 إدارة الموظفين والهيكل (Employees & Org)
- `GET /employees` (`hr:employees:read`): استعلام الموظفين بصفحات وفلاتر (`page`, `limit`, `search`, `departmentId`, `status`).
- `GET /employees/stats` (`hr:employees:read`): إحصائيات عامة (إجمالي الموظفين، النشطين، المجازين، وتوزيع الأقسام).
- `GET /employees/organization-chart` (`hr:employees:read`): شجرة الهيكل التنظيمي وتسلسل الإدارة والمناصب.
- `GET /employees/:id` (`hr:employees:read`): ملف الموظف الكامل بواسطة الـ ID أو الرقم الوظيفي.
- `POST /employees/upsert` (`hr:employees:write`): مزامنة وتحديث بيانات موظف من أنظمة الـ ERP.

### 🏢 الأقسام والوظائف (Departments & Positions)
- `GET /departments` (`hr:departments:read`): استعلام الأقسام مع أسماء المديرين وعدد الموظفين.
- `GET /positions` (`hr:positions:read`): استعلام المسميات الوظيفية والأقسام التابعة لها.

### ⏰ الحضور والانصراف والبصمة (Attendance)
- `POST /attendance/punches/batch` (`hr:attendance:ingest`): رفع حركات البصمة مجمعة من أجهزة ZKTeco.
- `GET /attendance/today` (`hr:attendance:read`): كشف الحضور والغياب لليوم الحالي.
- `GET /attendance/summary` (`hr:attendance:read`): ملخص مجمع لحركات الحضور والغياب والتأخيرات ومعدلات الدوام لفترة محددة (`from`, `to`, `employeeCode`, `departmentId`).

### 🏖️ طلبات وأرصدة الإجازات (Leaves Management)
- `GET /leaves` (`hr:leaves:read`): استعلام سجلات وطلبات الإجازات بفلترة (`status`, `employeeCode`, `from`, `to`, `page`, `limit`).
- `GET /leaves/balances` (`hr:leaves:read`): استعلام أرصدة الإجازات والمتبقي والمستهلك لكل موظف (`employeeCode`, `year`).
- `POST /leaves` (`hr:leaves:write`): تقديم طلب إجازة جديد للموظف.
- `POST /leaves/:id/decision` (`hr:leaves:approve`): اعتماد أو رفض طلب إجازة مع ملاحظة (`action`: `APPROVE` أو `REJECT`, `note`).

### 💰 مسيرات ومفردات الرواتب (Payroll)
- `GET /payroll/runs` (`hr:payroll:read`): استعلام دورات ومسيرات الرواتب المحسوبة (`year`, `month`, `status`, `page`, `limit`).
- `GET /payroll/runs/:id/items` (`hr:payroll:read`): تفاصيل مفردات الراتب لكل موظف داخل المسيرة (أساسي، بدلات، خصومات، صافي).

### 🔔 الأحداث والـ Webhooks
- `GET /webhooks` (`hr:write`): استعلام روابط الـ Webhook النشطة للشركة.
- `POST /webhooks` (`hr:write`): تسجيل رابط Webhook جديد لاستقبال الإشعارات اللحظية.

---

## 6. دليل ربط أجهزة البصمة (ZKTeco Biometric Sync)

إذا كان لديك جهاز بصمة ZKTeco متصل بالشبكة المحلية، يمكنك تشغيل هذا السكريبت الخفيف بلغة **Python** على أي جهاز كمبيوتر داخل نفس الشبكة ليقوم بسحب الحركات الجديدة تلقائياً ورفعها لـ MaxP:

```python
# maxp_zkteco_sync.py
import time
from datetime import datetime
import requests
from pyzk import ZK

DEVICE_IP = "192.168.1.201"
DEVICE_PORT = 4370
MAXP_API_URL = "https://api.maxp.online/api/v1/external/hr/attendance/punches/batch"
MAXP_API_KEY = "hrk_your_key_here"

def sync_attendance():
    zk = ZK(DEVICE_IP, port=DEVICE_PORT, timeout=10)
    conn = None
    try:
        conn = zk.connect()
        conn.disable_device()
        print("Connected to ZKTeco device successfully.")
        
        attendances = conn.get_attendance()
        punches = []
        
        for att in attendances:
            punch_type = "CHECK_IN" if att.punch == 0 else "CHECK_OUT"
            punches.append({
                "employeeCode": str(att.user_id),
                "timestamp": att.timestamp.isoformat() + "Z",
                "punchType": punch_type,
                "deviceId": f"ZK_{DEVICE_IP}"
            })
            
        if punches:
            # إرسال الحركات لـ MaxP
            res = requests.post(
                MAXP_API_URL,
                headers={"x-api-key": MAXP_API_KEY, "Content-Type": "application/json"},
                json={"punches": punches[-100:]}, # إرسال آخر 100 حركة
                timeout=15
            )
            print(f"Sync result: {res.status_code} - {res.text}")
            
    except Exception as e:
        print(f"Error during biometric sync: {e}")
    finally:
        if conn:
            conn.enable_device()
            conn.disconnect()

if __name__ == "__main__":
    while True:
        sync_attendance()
        time.sleep(300) # فحص ومزامنة كل 5 دقائق
```

---

## 7. الـ Webhooks والتحقق من التوقيع

عند حدوث أحداث فورية (مثل تسجيل حضور موظف أو طلب إجازة)، يقوم MaxP بإرسال طلب `POST` إلى رابط الـ Webhook الخاص بك مع ترويسة التوقيع:
```http
x-maxp-signature: sha256=abcdef1234567890...
```

### كود التحقق من صحة التوقيع (Node.js):
```javascript
const crypto = require('crypto');

function verifyMaxpWebhook(rawBody, signatureHeader, webhookSecret) {
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signatureHeader),
    Buffer.from(expectedSignature)
  );
}
```

---

## 8. الربط مع أدوات الذكاء الاصطناعي

### في Custom GPT / OpenAI Actions:
1. اذهب إلى إعدادات الـ GPT واختر **Create new action**.
2. انسخ الرابط المباشر للمواصفات:
   `https://api.maxp.online/api/v1/external/hr/openapi.json`
   أو قم بلصق محتوى الملف في حقل **Schema**.
3. في خانة **Authentication**:
   - اختر **API Key**.
   - Auth Type: **Custom**.
   - Custom Header Name: `x-api-key`.
   - الصق مفتاح الـ API الخاص بشركتك.

### في سير العمل عبر n8n أو Make:
1. استخدم **HTTP Request Node**.
2. حدد الـ Method (`GET` أو `POST`).
3. أضف ترويسة `x-api-key`.
4. يمكنك استقبال الـ Webhook مباشرة في Webhook Trigger Node للقيام بإجراءات فورية (إرسال إشعار Slack/WhatsApp، تنبيه مدير الفرع، إلخ).
