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
| الصلاحية | الوصف |
| :--- | :--- |
| `*` | وصول كامل لكافة دوال الموارد البشرية |
| `hr:employees:read` | قراءة بيانات الموظفين والهيكل التنظيمي |
| `hr:employees:write` | إنشاء أو تعديل بيانات موظف (Upsert) |
| `hr:attendance:ingest` | رفع حركات البصمة والحضور من الأجهزة |
| `hr:attendance:read` | استعلام كشف الحضور وسجلات الدوام |
| `hr:leaves:read` | استعلام طلبات وأرصدة الإجازات |
| `hr:leaves:write` | تقديم طلب إجازة جديد للموظف |
| `hr:payroll:read` | استعلام مسيرات الرواتب والمستحقات |

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

## 5. النقاط النهائية للخدمة

### 1) استعلام قائمة الموظفين
`GET /employees`
- **Query Params:**
  - `page` (افتراضي: 1)
  - `limit` (افتراضي: 50)
  - `search` (بحث بالاسم أو الرقم الوظيفي أو البريد)
  - `status` (`ACTIVE`, `PROBATION`, `ON_LEAVE`, `TERMINATED`)
- **مثال cURL:**
  ```bash
  curl -X GET "https://api.maxp.online/api/v1/external/hr/employees?status=ACTIVE" \
    -H "x-api-key: hrk_your_key_here"
  ```

---

### 2) رفع حركات البصمة مجمعة (Biometric Batch Ingestion)
`POST /attendance/punches/batch`
- **Body Schema:**
  ```json
  {
    "punches": [
      {
        "employeeCode": "EMP-102",
        "timestamp": "2026-09-29T08:30:15Z",
        "punchType": "CHECK_IN",
        "deviceId": "ZKT-MAIN-GATE",
        "verifyMode": "FINGERPRINT"
      },
      {
        "employeeCode": "EMP-105",
        "timestamp": "2026-09-29T16:05:00Z",
        "punchType": "CHECK_OUT",
        "deviceId": "ZKT-MAIN-GATE",
        "verifyMode": "FACE"
      }
    ]
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "processed": 2,
    "failed": 0
  }
  ```

---

### 3) تقديم طلب إجازة
`POST /leaves`
- **Body Schema:**
  ```json
  {
    "employeeId": "emp_uuid_or_code",
    "leaveTypeId": "leave_type_id",
    "startDate": "2026-10-01",
    "endDate": "2026-10-03",
    "reason": "إجازة عارضة"
  }
  ```

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
