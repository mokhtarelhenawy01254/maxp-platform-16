---
name: maxp-executable-mindmap
description: المرجع الأساسي والهندسي لتصميم، تطوير، تشغيل، وصيانة محرك الخرائط الذهنية التنفيذية ومسارات الأتمتة (Executable Mindmap & Workflow Engine) ووضع التدريب والعرض في منصة MaxP.
---

# محرك الخرائط الذهنية التنفيذية ومسارات العمل — MaxP Executable Mindmap & Canvas Engine

هذا الملف هو **المرجع الهندسي والتشغيلي المعتمد** في منصة MaxP لأداة الخرائط الذهنية التفاعلية القابلة للتنفيذ. يحدد هذا الدليل: الأهداف، المعمارية، مصفوفة الأدوات المتكاملة، كيفية إضافة أداة جديدة بسهولة (Plug-and-Play)، وأوضاع الاستخدام (التخطيط، التدريب والشرح، والتنفيذ مثل n8n).

---

## 🎯 الأهداف الأساسية الثلاثة للمحرك (Triple Purpose Engine)

تم تصميم هذه الأداة لتوحيد ثلاثة استخدامات في واجهة واحدة متكاملة دون الحاجة للتنقل بين برامج مختلفة:

```
                  ┌────────────────────────────────────────┐
                  │    MaxP Canvas / Mindmap Hub           │
                  └──────────────────┬─────────────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         ▼                           ▼                           ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│  1. وضع التخطيط  │       │ 2. وضع الشرح     │       │ 3. وضع التنفيذ   │
│    (Planning)    │       │    والتدريب      │       │     والأتمتة     │
│ عصف ذهني، هيكلة  │       │ عرض سينمائي      │       │ محرك n8n لتنفيذ  │
│  أفكار، رسم شجري  │       │ فيديوهات، مهام   │       │ كل خطوة على أرض  │
│ وتوليد بالـ AI   │       │ واختبارات للمتدرب │       │ الواقع بالمنصة   │
└──────────────────┘       └──────────────────┘       └──────────────────┘
```

---

## 🧩 مصفوفة الأدوات الشاملة (The Tool Registry Matrix)

لا تقتصر الخريطة على مجرد نصوص، بل تحتوي على **7 فئات من الأدوات الحية** الجاهزة للربط:

### 1. أدوات المشغلات (Triggers - متى يبدأ المسار؟)
* **مشغلات المتجر (Store Events):** طلب جديد، سلة متروكة (Abandoned Cart)، عميل جديد، نفاد مخزون منتج.
* **مشغلات المحادثات (Chat Triggers):** رسالة واردة على واتساب، تعليق على منشور فيسبوك، رسالة إنستغرام.
* **مشغلات الجدولة والوقت (Schedule / Cron):** في وقت محدد، كل أسبوع، أو بعد انقضاء مدة محددة من حدث سابق.
* **مشغل يدوي (Manual Trigger):** زر تشغيل مباشر داخل الخريطة للاختبار أو لتفعيل خطوة تدريبية للمتدرب.
* **مشغل خارجي (Webhook):** استقبال إشارات من أي نظام خارجي أو بوابة دفع.

### 2. أدوات الذكاء الاصطناعي والوكلاء (MaxP AI Agents)
* **وكيل المبيعات وخدمة العملاء (Human-like Agent):** صياغة ردود ذكية مخصصة تتناسب مع لغة العميل وسجل شرائه.
* **وكيل العصف الذهني والتوسيع (Brainstorm & Expand):** توليد فروع وأفكار تسويقية وتشغيلية جديدة تلقائياً.
* **وكيل استخراج البيانات (OCR & Data Extractor):** استخراج بيانات الفواتير، بطاقات الدفع، وإيصالات التحويل البنكي.
* **وكيل الأبحاث والمقارنات (Research Agent):** فحص أسعار المنافسين أو تقديم مقترحات تسعير.
* **عقدة أمر مخصص (Custom Prompt Node):** تشغيل Prompt حر يحدده المستخدم للتحكم الكامل.

### 3. أدوات التواصل وخدمة العملاء (CRM & Messaging)
* **إرسال واتساب (WhatsApp Message):** إرسال رسائل نصية، صور، ملفات PDF، أو أزرار تفاعلية (Interactive Buttons).
* **إرسال SMS أو بريد إلكتروني (Email / SMS Notification).**
* **تحديث بطاقة العميل (CRM Contact Update):** إضافة وسم (Tag)، تغيير مرحلة العميل في مسار البيع (Pipeline Stage)، أو كتابة ملاحظة في حسابه.
* **إشعار المشرف البشري (Notify Manager):** إرسال تنبيه فوري لفريق العمل بتدخل بشري مطلوب.

### 4. أدوات إدارة العمليات والمهام (Tasks Workspace)
* **إنشاء مهمة (Create Task):** تعيين المهمة لموظف معين مع تحديد الأولوية وتاريخ الاستحقاق.
* **موافقة بشرية قبل المتابعة (Human Approval Step):** يوقف المسار حتى يراجع الموظف/المشرف الخطوة ويعتمدها يدوياً.
* **تحديث حالة مهمة (Update Task Status):** تعديل حالة مهمة موجودة إلى (قيد التنفيذ / مكتملة).

### 5. أدوات المتجر والمنتجات والمالية (Commerce & Inventory)
* **إنشاء كود خصم مؤقت (Dynamic Coupon):** توليد كوبون بخصم معين ومدة صلاحية محددة لعميل محدد.
* **ربط منتج أو باقة (Link Product / Bundle):** سحب بيانات منتج حي من متجر سوان وعرض مخزونه وسعره داخل العقدة.
* **تعديل حالة الطلب في المتجر (Order Status Update):** مثل تحويل الطلب إلى "تم التأكيد" أو "قيد الشحن".
* **إنشاء رابط دفع إلكتروني (Payment Link):** إرسال رابط دفع مباشر للعميل.

### 6. أدوات الشرح والتدريب (Training & Knowledge Nodes)
* **عقدة فيديو شرح مدمج (Video Lesson):** تضمين فيديو قصير (Loom، YouTube، أو MP4 مباشر) يفتح داخل الخريطة للمتدرب.
* **عقدة تطبيق عملي للمتدرب (Action Checklist):** مربعات اختيار لا ينتقل المتدرب للخطوة التالية إلا بعد تنفيذها وتحديدها.
* **عقدة اختبار سريع (Quick Quiz / Flashcard):** سؤال تفاعلي للتأكد من استيعاب المتدرب للخطوة قبل الانتقال للتالية.
* **عقدة مستند ودليل تشغيل (SOP / PDF Viewer):** إرفاق خطوات العمل المعيارية داخل العقدة.

### 7. أدوات المنطق والتحكم في المسار (Logic & Branching)
* **عقدة الشرط (If / Else):** تفرع المسار بناءً على (هل اشترى العميل؟ هل المبلغ > 500؟ هل الوقت بعد 12 ليلاً؟).
* **عقدة التأخير الزمني (Delay / Wait):** الانتظار لمدة (مثلاً 24 ساعة) قبل إرسال الرسالة التالية.
* **عقدة دمج المسارات (Merge):** تجميع أكثر من مسار متفرع في خطوة واحدة لاحقة.

---

## 🚀 كيفية إضافة أداة جديدة بسهولة تامة (Plug-and-Play Tool Extension)

للحفاظ على سهولة الصيانة مستقبلاً، **لا يتم تعديل ملفات الخريطة الأساسية نهائياً**، بل يتم تسجيل الأداة الجديدة باتباع 3 خطوات محددة ومعزولة:

```
  الخطوة 1: تعريف الأداة                 الخطوة 2: كارت الواجهة               الخطوة 3: معالج السيرفر
┌────────────────────────┐            ┌────────────────────────┐            ┌────────────────────────┐
│  src/tools/definitions │            │  src/components/nodes  │            │  backend/workflows/    │
│     my-new-tool.ts     │  ───────►  │    MyNewToolNode.tsx   │  ───────►  │     executors.js       │
│ (الاسم، الأيقونة،     │            │  (شكل العقدة على       │            │  (تنفيذ الكود الفعلي   │
│  المدخلات والمخرجات)   │            │   الخريطة بالـ React)   │            │   على السيرفر)         │
└────────────────────────┘            └────────────────────────┘            └────────────────────────┘
```

### الخطوة 1: ملف تعريف الأداة (`src/modules/canvas/tools/defs/sampleTool.ts`)
```typescript
import { CanvasToolDefinition } from '../types';

export const sendWhatsAppCouponTool: CanvasToolDefinition = {
  id: 'send_whatsapp_coupon',
  category: 'communication',
  label: 'إرسال كوبون واتساب',
  description: 'يولد كوبون خصم ويرسله للعميل عبر الواتساب',
  icon: 'MessageSquare',
  color: 'emerald',
  inputs: [
    { name: 'phone', label: 'رقم الهاتف', type: 'string', required: true },
    { name: 'discountPercent', label: 'نسبة الخصم %', type: 'number', default: 10 },
    { name: 'messageTemplate', label: 'نص الرسالة', type: 'text', required: true }
  ],
  outputs: [
    { name: 'success', label: 'تم الإرسال بنجاح', type: 'boolean' },
    { name: 'couponCode', label: 'كود الكوبون المولد', type: 'string' }
  ]
};
```

### الخطوة 2: مكوّن الواجهة للعقدة (`src/modules/canvas/nodes/SampleNode.tsx`)
```tsx
import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { MessageSquare, Sparkles } from 'lucide-react';

export const WhatsAppCouponNode = ({ data, selected }: any) => {
  return (
    <div className={`p-3 rounded-2xl bg-slate-900 border ${selected ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-slate-700'} w-64 shadow-xl`}>
      <Handle type="target" position={Position.Right} className="w-3 h-3 bg-emerald-500" />
      <div className="flex items-center gap-2 mb-2 text-emerald-400 font-bold text-xs">
        <MessageSquare className="w-4 h-4" />
        <span>إرسال كوبون واتساب</span>
      </div>
      <p className="text-[11px] text-slate-300">خصم: {data.discountPercent || 10}%</p>
      <Handle type="source" position={Position.Left} className="w-3 h-3 bg-emerald-500" />
    </div>
  );
};
```

### الخطوة 3: معالج التنفيذ في الـ Backend (`apps/backend/src/workflows/handlers/whatsapp.js`)
```javascript
export async function executeWhatsAppCoupon(nodeData, context) {
  const { phone, discountPercent, messageTemplate } = nodeData;
  // 1. استدعاء خدمة الكوبونات
  const coupon = await createStoreCoupon({ discount: discountPercent });
  // 2. إرسال الرسالة عبر محرك واتساب في MaxP
  await sendWhatsAppMessage({ phone, text: messageTemplate.replace('{CODE}', coupon.code) });
  return { success: true, couponCode: coupon.code };
}
```

---

## 🎓 وضع التدريب والشرح والعرض (Training & Presentation Mode)

لتحويل أي خريطة إلى مادة تدريبية أو دورة تعليمية:

1. **الترقيم والتسلسل (Step Sequencing):**
   * يمكن للمدرب ترقيم العقد بالترتيب (1 ثم 2 ثم 3).
2. **التحكم بالعرض (Presentation Controller):**
   * شريط سفلي يحتوي على (السابق ◀ | إيقاف مؤقت ⏸ | التالي ▶).
   * عند الضغط على "التالي"، تتحرك الكاميرا تلقائياً بـ `Smooth Pan & Zoom` وتضيء العقدة الهدف بنور خافت مع تظليل باقي الشاشة (`Spotlight Effect`).
3. **التفاعل مع المتدرب (Interactive Engagement):**
   * المتدرب لا يشاهد فقط، بل يمكنه الضغط على "جرّب بنفسك الآن" لينفذ الخطوة فوراً في حسابه أو متجره.

---

## ⚙️ معايير الكود والصيانة لعام 2026 (Maintenance Best Practices)

1. **لا تخلط منطق الرسم بمنطق التنفيذ:**
   * الواجهة في المتصفح فقط ترسم (`Renderer`) وتصدر بيانات الاتصال كـ JSON.
   * التنفيذ الفعلي يتم بالكامل على السيرفر في محرك مسارات العمل (`Workflow Runner Engine`).
2. **الاعتماد على الأنواع الثابتة (TypeScript Strict Types):**
   * كل عقدة لها Type محدد يمنع توصيل مخرجات غير متوافقة (مثلاً منع ربط مخرج نص بمدخل يحتاج رقم).
3. **دعم كامل للهواتف والأجهزة اللوحية (Mobile & Tablet Responsive):**
   * تطبيق قاعدة المنصة: عدم حشر البطاقات، وإمكانية تصفح الخريطة باللمس (Touch Gestures) وفتح تفاصيل العقدة في `Slide-over Sheet` مريح على الموبايل.
4. **حفظ الإصدارات (Version Control for Workflows):**
   * كل تعديل على الخريطة يسجل كـ Version (v1, v2) بحيث يمكن للمستخدم العودة لأي إصدار سابق بضغطة زر إذا حدث خطأ.

---

## 📌 الكلمات المفتاحية والمحفزات لاستدعاء هذه المهارة (Triggers)
يتم استدعاء والرجوع لهذه المهارة تلقائياً عندما:
* يطلب المستخدم تعديل أو تطوير أو صيانة الخريطة الذهنية (`mindmap` أو `canvas`).
* إضافة أداة أو تكامل جديد لمسارات العمل (`workflow` أو `n8n automation`).
* بناء أو تعديل وضع العرض والتدريب التفاعلي (`presentation mode` أو `training hub`).
* ربط عقد الخريطة بالمهام، المتجر، الوكلاء، أو إرسال الرسائل.
