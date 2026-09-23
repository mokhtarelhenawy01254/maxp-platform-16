const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function generateCafeGuidePDF() {
  console.log('📄 Generating MaxP Cafe & Restaurant Pro Client Capabilities PDF...');

  const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>دليل إمكانيات منصة MaxP لإدارة الكافيهات والمطاعم المتخصصة</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');

    @page {
      size: A4 portrait;
      margin: 0;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      background-color: #0c0a09;
      color: #f5f5f4;
      font-size: 13px;
      line-height: 1.6;
    }

    .page {
      width: 210mm;
      min-height: 297mm;
      max-height: 297mm;
      padding: 18mm 20mm;
      page-break-after: always;
      position: relative;
      background: radial-gradient(circle at 10% 10%, #1c1917 0%, #0c0a09 100%);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .page:last-child {
      page-break-after: avoid;
    }

    /* Machine Header & Footer */
    .doc-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 12px;
      margin-bottom: 20px;
    }

    .doc-header .brand {
      font-size: 18px;
      font-weight: 900;
      letter-spacing: -0.5px;
      color: #fafaf9;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .doc-header .brand span {
      background: linear-gradient(135deg, #d97706, #f59e0b);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .doc-header .doc-tag {
      font-size: 11px;
      font-weight: 600;
      color: #a8a29e;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 4px 10px;
      border-radius: 20px;
    }

    .doc-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding-top: 10px;
      font-size: 10px;
      color: #78716c;
    }

    /* Page 1: Cover */
    .cover-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: flex-start;
      padding: 20px 0;
    }

    .cover-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 9999px;
      background: rgba(217, 119, 6, 0.15);
      border: 1px solid rgba(217, 119, 6, 0.35);
      color: #fbbf24;
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 24px;
    }

    .cover-title {
      font-size: 34px;
      font-weight: 900;
      line-height: 1.25;
      color: #ffffff;
      margin-bottom: 16px;
      text-wrap: balance;
    }

    .cover-title span {
      color: #f59e0b;
    }

    .cover-desc {
      font-size: 15px;
      color: #d6d3d1;
      max-width: 580px;
      line-height: 1.8;
      margin-bottom: 35px;
    }

    .feature-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 14px;
      width: 100%;
      margin-top: 10px;
    }

    .feature-card {
      background: rgba(28, 25, 23, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 16px 18px;
    }

    .feature-card h4 {
      font-size: 14px;
      font-weight: 700;
      color: #fafaf9;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .feature-card p {
      font-size: 11.5px;
      color: #a8a29e;
      line-height: 1.6;
    }

    .dot-amber {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #f59e0b;
      display: inline-block;
    }

    /* Inner Page Styles */
    .section-header {
      margin-bottom: 18px;
    }

    .section-number {
      font-size: 11px;
      font-weight: 800;
      color: #f59e0b;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }

    .section-title {
      font-size: 22px;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 6px;
    }

    .section-desc {
      font-size: 12px;
      color: #a8a29e;
      line-height: 1.6;
    }

    .sub-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 14px;
      margin-bottom: 16px;
    }

    .box-surface {
      background: rgba(28, 25, 23, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 14px 16px;
    }

    .box-surface h4 {
      font-size: 13.5px;
      font-weight: 700;
      color: #fafaf9;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .box-surface p {
      font-size: 11.5px;
      color: #a8a29e;
      line-height: 1.6;
    }

    .pill-badge {
      font-size: 10px;
      padding: 2px 8px;
      border-radius: 4px;
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.3);
      font-weight: 700;
    }

    .pill-green {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border-color: rgba(16, 185, 129, 0.3);
    }

    .pill-blue {
      background: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
      border-color: rgba(59, 130, 246, 0.3);
    }

    .pill-rose {
      background: rgba(244, 63, 94, 0.15);
      color: #fb7185;
      border-color: rgba(244, 63, 94, 0.3);
    }

    /* Workflow Diagram Box */
    .flow-container {
      background: rgba(18, 16, 15, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 16px;
    }

    .flow-steps {
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: relative;
      margin-top: 10px;
    }

    .flow-step {
      text-align: center;
      flex: 1;
      padding: 8px 10px;
      background: rgba(28, 25, 23, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      margin: 0 4px;
    }

    .flow-step .step-title {
      font-size: 11.5px;
      font-weight: 700;
      color: #f5f5f4;
      margin-bottom: 2px;
    }

    .flow-step .step-desc {
      font-size: 9.5px;
      color: #a8a29e;
    }

    .flow-arrow {
      color: #f59e0b;
      font-size: 14px;
      font-weight: bold;
    }

    /* Data Table */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      margin-top: 8px;
    }

    .data-table th {
      background: rgba(41, 37, 36, 0.6);
      color: #d6d3d1;
      text-align: right;
      padding: 8px 10px;
      font-weight: 700;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .data-table td {
      padding: 8px 10px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      color: #e7e5e4;
    }

    .data-table tr:hover td {
      background: rgba(255, 255, 255, 0.02);
    }

    .num-cell {
      font-family: monospace;
      font-size: 12px;
      color: #fbbf24;
      font-weight: 700;
    }

    /* ROI Callout */
    .highlight-card {
      background: linear-gradient(135deg, rgba(217, 119, 6, 0.15) 0%, rgba(28, 25, 23, 0.8) 100%);
      border: 1px solid rgba(217, 119, 6, 0.35);
      border-radius: 12px;
      padding: 16px 20px;
      margin-top: 14px;
    }

    .highlight-card h3 {
      color: #f59e0b;
      font-size: 15px;
      font-weight: 800;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .highlight-card p {
      font-size: 12px;
      color: #e7e5e4;
      line-height: 1.7;
    }

    /* Credentials Card */
    .creds-box {
      background: #1c1917;
      border: 1px solid #f59e0b;
      border-radius: 12px;
      padding: 18px 22px;
      margin-top: 20px;
    }

    .creds-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-top: 12px;
    }

    .cred-item {
      background: rgba(0, 0, 0, 0.4);
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .cred-label {
      font-size: 10px;
      color: #a8a29e;
      margin-bottom: 2px;
    }

    .cred-value {
      font-size: 12.5px;
      font-family: monospace;
      font-weight: 700;
      color: #38bdf8;
    }
  </style>
</head>
<body>

  <!-- ================= PAGE 1: COVER ================= -->
  <div class="page">
    <div class="doc-header">
      <div class="brand">MaxP <span>Platform</span></div>
      <div class="doc-tag">حلول سلاسل الكافيهات والمقاهي المختصة</div>
    </div>

    <div class="cover-content">
      <div class="cover-badge">
        <span class="dot-amber"></span>
        الجيل الجديد لمنظومة المقاهي والمطاعم المتخصصة 2026
      </div>

      <h1 class="cover-title">
        منظومة <span>MaxP Cafe & Restaurant Pro</span><br>
        الهندسة التشغيلية الكاملة من البار إلى الربحية
      </h1>

      <p class="cover-desc">
        نظام تشغيلي سحابي فائق السرعة صُمم خصيصاً لتلبية متطلبات المقاهي المختصة (Specialty Coffee)، الكافيهات، وسلاسل المشروبات. يدمج نقطة البيع التفاعلية السريعة (POS)، تتبع الوصفات بالجرام (BOM)، عيار ومطحنة الإسبريسو اليومي، ومطابقة الهدر المالي والجرد الدقيق.
      </p>

      <div class="feature-grid">
        <div class="feature-card">
          <h4><span class="dot-amber"></span> كاشير وباريستا فائق السرعة</h4>
          <p>تخصيص كامل للمشروب (بدائل الحليب، الشوتات، السيرب) وإرسال بون التحضير المسبق (KOT) بضغطة زر واحدة.</p>
        </div>

        <div class="feature-card">
          <h4><span class="dot-amber"></span> هندسة الوصفات وتكاليف الإنتاج (BOM)</h4>
          <p>خصم لحظي للمواد الخام (البن، الحليب، السيرب) مع كل كوب مباع وحساب دقيق ومباشر لهامش الربح الإجمالي.</p>
        </div>

        <div class="feature-card">
          <h4><span class="dot-amber"></span> تتبع الهدر وعيار المطحنة (Dial-in)</h4>
          <p>تسجيل هدر المعايرة الصباحية والانسكابات وحساب تأثيرها المالي في تكلفة المبيعات بصورة مؤتمتة.</p>
        </div>

        <div class="feature-card">
          <h4><span class="dot-amber"></span> جرد فعلي وسرعة تسوية الفوارق</h4>
          <p>جلسات جرد دورية وسريعة، مقارنة الرصيد الدفتري بالفعلي واحتساب الفوارق واعتماد التسوية آلياً.</p>
        </div>
      </div>
    </div>

    <div class="doc-footer">
      <span>MaxP Enterprise Retail & Hospitality Suite</span>
      <span>الصفحة 1 من 4</span>
    </div>
  </div>

  <!-- ================= PAGE 2: POS & BARISTA COCKPIT ================= -->
  <div class="page">
    <div class="doc-header">
      <div class="brand">MaxP <span>Cafe & POS</span></div>
      <div class="doc-tag">الوحدة التشغيلية الأولى: نقطة البيع السريعة</div>
    </div>

    <div>
      <div class="section-header">
        <div class="section-number">القسم 01</div>
        <h2 class="section-title">نقطة البيع السحابية وكوكتيل الباريستا (Barista Cockpit)</h2>
        <p class="section-desc">واجهة سريعة الاستجابة خالية من التعقيد، تتيح للباريستا والكاشير استقبال وتخصيص الطلبات المعقدة في ثوانٍ معدودة دون تأخير طوابير العملاء.</p>
      </div>

      <div class="sub-grid">
        <div class="box-surface">
          <h4>
            موديل تخصيص المشروبات (Drink Modifiers)
            <span class="pill-badge">متزامن بالكامل</span>
          </h4>
          <p>
            تخصيص فوري عند النقر على المشروب:
            <br>• <strong>أنواع الحليب:</strong> حليب كامل الدسم، حليب لوز نباتي (+25 ج)، حليب شوفان (+25 ج).
            <br>• <strong>الشوتات الإضافية:</strong> إسبريسو سنغل (+15 ج)، إسبريسو دبل (+25 ج).
            <br>• <strong>النكهات والسيرب:</strong> كراميل فرنسي، فانيليا خالي السكر.
            <br>• <strong>ملاحظات التحضير:</strong> خانة تعليمات حرة للباريستا (سكر، ثلج، درجة الحرارة).
          </p>
        </div>

        <div class="box-surface">
          <h4>
            بون التحضير المسبق (Pre-Checkout KOT Fire)
            <span class="pill-badge pill-green">تسريع الخدمة</span>
          </h4>
          <p>
            في أوقات الذروة، لا ينتظر البار حتى يدفع العميل! زر <strong>«إرسال بون البار»</strong> يرسل الطلب فوراً إلى شاشة أو طابعة البار ليبدأ الباريستا في التبخير والاستخلاص بينما يقوم الكاشير بإتمام الحساب.
          </p>
        </div>

        <div class="box-surface">
          <h4>
            شيكات الطاولات وحفظ السلات (Cloud Table Tabs)
            <span class="pill-badge pill-blue">خدمة الصالة</span>
          </h4>
          <p>
            إمكانية تعليق الطلب وحفظه برقم الطاولة (مثل: طاولة 4 - شرفة). يمكن للويتر إضافة طلبات إضافية على نفس الشيك في أي وقت واستعادته عند طلب الحساب والإغلاق.
          </p>
        </div>

        <div class="box-surface">
          <h4>
            الخصومات الذكية والدفع المقسم (Split Payments)
            <span class="pill-badge pill-rose">مرونة مالية</span>
          </h4>
          <p>
            أزرار خصم سريعة مجهزة (10%، 15%، 20%) مع إمكانية تقسيم الفاتورة الواحدة بين النقد (Cash) والبطاقة البنكية (Card) والمحافظ الإلكترونية دون أخطاء حسابية.
          </p>
        </div>
      </div>

      <div class="flow-container">
        <div style="font-size: 12px; font-weight: 800; color: #fbbf24; margin-bottom: 4px;">دورة حياة الطلب السريع في الكافيه:</div>
        <div class="flow-steps">
          <div class="flow-step">
            <div class="step-title">1. اختيار المشروب</div>
            <div class="step-desc">نقرة على سبانش لاتيه</div>
          </div>
          <div class="flow-arrow">←</div>
          <div class="flow-step">
            <div class="step-title">2. التخصيص الآلي</div>
            <div class="step-desc">لوز + شوت + ملاحظة</div>
          </div>
          <div class="flow-arrow">←</div>
          <div class="flow-step">
            <div class="step-title">3. إرسال للبار (KOT)</div>
            <div class="step-desc">البار يبدأ التحضير</div>
          </div>
          <div class="flow-arrow">←</div>
          <div class="flow-step">
            <div class="step-title">4. التحصيل والإيصال</div>
            <div class="step-desc">كاش أو مقسم + طباعة</div>
          </div>
        </div>
      </div>

      <div class="highlight-card">
        <h3>قيمة تشغيلية مباشرة: تقليص وقت الانتظار بنسبة 45%</h3>
        <p>التزامن التلقائي بين الكاشير والبار مع ميزة إرسال بون التحضير المسبق يضمن عدم بقاء العميل أمام الكاشير لفترات طويلة، ويزيد من معدل دوران الطاولات والمبيعات في ساعات الذروة الصباحية والمسائية.</p>
      </div>
    </div>

    <div class="doc-footer">
      <span>MaxP Enterprise Retail & Hospitality Suite</span>
      <span>الصفحة 2 من 4</span>
    </div>
  </div>

  <!-- ================= PAGE 3: RECIPES & INVENTORY ================= -->
  <div class="page">
    <div class="doc-header">
      <div class="brand">MaxP <span>BOM & Costing</span></div>
      <div class="doc-tag">الوحدة التشغيلية الثانية: هندسة الوصفات والمخزون</div>
    </div>

    <div>
      <div class="section-header">
        <div class="section-number">القسم 02</div>
        <h2 class="section-title">هندسة الوصفات وتكاليف الإنتاج (Recipe BOM Engine)</h2>
        <p class="section-desc">تحويل المواد الخام المشتراة بالكيلوجرام واللتر إلى مقادير دقيقة بالجرام والمل، مع خصم آلي لحظي من المستودع مع كل فاتورة يتم استخراجها.</p>
      </div>

      <div class="box-surface" style="margin-bottom: 16px;">
        <h4>نموذج بطاقة التكلفة والمكونات لمنتج (سبانش لاتيه بارد):</h4>
        <table class="data-table">
          <thead>
            <tr>
              <th>المادة الخام</th>
              <th>الكمية المعيارية</th>
              <th>تكلفة الوحدة</th>
              <th>التكلفة الفعلية للكوب</th>
              <th>حالة الخصم المخزني</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>بن سبيشالتي إثيوبي فاخر</td>
              <td class="num-cell">0.018 كجم (18 جم)</td>
              <td>420 ج / كجم</td>
              <td class="num-cell">7.56 ج</td>
              <td><span class="pill-badge pill-green">خصم آلي فوري</span></td>
            </tr>
            <tr>
              <td>حليب طازج كامل الدسم</td>
              <td class="num-cell">0.200 لتر (200 مل)</td>
              <td>36 ج / لتر</td>
              <td class="num-cell">7.20 ج</td>
              <td><span class="pill-badge pill-green">خصم آلي فوري</span></td>
            </tr>
            <tr>
              <td>سيرب كراميل فرنسي (Monin)</td>
              <td class="num-cell">0.025 لتر (25 مل)</td>
              <td>160 ج / لتر</td>
              <td class="num-cell">4.00 ج</td>
              <td><span class="pill-badge pill-green">خصم آلي فوري</span></td>
            </tr>
            <tr>
              <td>كوب بلاستيك شفاف + غطاء وشاليموه</td>
              <td class="num-cell">1 وحدة</td>
              <td>3.50 ج / وحدة</td>
              <td class="num-cell">3.50 ج</td>
              <td><span class="pill-badge pill-green">خصم آلي فوري</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="sub-grid">
        <div class="box-surface">
          <h4>مؤشرات الربحية المحسوبة آلياً:</h4>
          <p style="line-height: 1.9;">
            • <strong>سعر البيع للجمهور:</strong> <span class="num-cell">85.00 ج</span>
            <br>• <strong>إجمالي تكلفة المكونات (BOM):</strong> <span class="num-cell">22.26 ج</span>
            <br>• <strong>مجمل الربح للكوب الواحد:</strong> <span class="num-cell" style="color:#34d399;">62.74 ج</span>
            <br>• <strong>نسبة هامش الربح الإجمالي:</strong> <span class="pill-badge pill-green">73.8% Gross Margin</span>
          </p>
        </div>

        <div class="box-surface">
          <h4>تأثير الإضافات على المخزون (Modifiers Link):</h4>
          <p>
            عندما يطلب العميل <strong>حليب لوز</strong> بدلاً من الحليب العادي، يقوم النظام بذكاء بخصم <strong>0.25 كجم من حليب اللوز</strong> وإلغاء خصم الحليب العادي، مع إضافة فارق السعر (+25 ج) في الفاتورة وحساب التكلفة المحدثة بدقة تامة.
          </p>
        </div>
      </div>

      <div class="highlight-card">
        <h3>الرقابة الصارمة على استهلاك المواد الخام</h3>
        <p>لا مجال لضياع أكياس البن أو استهلاك الحليب دون إثبات بيع؛ فالنظام يربط كل جرام خارج من المطحنة بفاتورة بيع موثقة أو بسجل هدر معتمد، مما يقضي على العجز غير المبرر بنسبة تصل إلى 95%.</p>
      </div>
    </div>

    <div class="doc-footer">
      <span>MaxP Enterprise Retail & Hospitality Suite</span>
      <span>الصفحة 3 من 4</span>
    </div>
  </div>

  <!-- ================= PAGE 4: WASTE & AUDITS ================= -->
  <div class="page">
    <div class="doc-header">
      <div class="brand">MaxP <span>Operations</span></div>
      <div class="doc-tag">الوحدة التشغيلية الثالثة: إدارة الهدر والجرد الدوري</div>
    </div>

    <div>
      <div class="section-header">
        <div class="section-number">القسم 03</div>
        <h2 class="section-title">إدارة الهدر التشغيلي وجلسات الجرد الفعلي</h2>
        <p class="section-desc">الكافيه الناجح يُقاس بقدرته على ضبط هدر البن الصباحي وتتبع الحليب التالف ومطابقة الجرد المستودعي دون تعطيل العمل.</p>
      </div>

      <div class="sub-grid">
        <div class="box-surface">
          <h4>
            سجل الهدر والعيار (Dial-in Spoilage)
            <span class="pill-badge pill-rose">رقابة تكلفة</span>
          </h4>
          <p>
            تتبع يومي دقيق لأسباب الهدر بالجرام والتكلفة المالية:
            <br>• <strong>معايرة المطحنة الصباحية (Dial-in):</strong> تسجيل الجرامات المستهلكة لضبط زمن الاستخلاص والطحن.
            <br>• <strong>انسكابات الباريستا (Spills & Drops):</strong> تسجيل الحوادث أثناء ضغط العمل.
            <br>• <strong>المواد منتهية الصلاحية (Expired):</strong> حليب أو مخبوزات بانتهاء صلاحية.
            <br>• <strong>اختبار الجودة والعينات (QC & Tasting).</strong>
          </p>
        </div>

        <div class="box-surface">
          <h4>
            جلسات الجرد السريع (Stock Count Audits)
            <span class="pill-badge pill-blue">تسوية مؤتمتة</span>
          </h4>
          <p>
            بدء جلسة جرد للمخزن أو البار في أي وقت:
            <br>• أخذ لقطة لحظية للأرصدة الدفترية المتوقعة.
            <br>• إدخال أرقام العد الفعلي بالوزن أو العلب.
            <br>• احتساب فوارق الجرد (كمية وتكلفة مالية) تلقائياً.
            <br>• زر <strong>«اعتماد وتسوية الجرد»</strong> يقوم بإنشاء حركات تسوية مخزنية وتعديل الأرصدة بضغطة واحدة.
          </p>
        </div>
      </div>

      <div class="box-surface" style="margin-top: 10px;">
        <h4 style="color: #fbbf24;">مركزية الفروع والتحكم السحابي (Multi-Branch Ready):</h4>
        <p style="font-size: 12px; color: #d6d3d1; line-height: 1.8;">
          سواء كان لديك فرع واحد أو سلسلة من 20 فرعاً، تمنحك MaxP رؤية شاملة لمخازن الفروع، حركة التحويلات بين المستودع المركزي وبارات الفروع، وأداء كل باريستا وكاشير مع تقارير مبيعات وأرباح فورية تصلك على هاتفك في أي لحظة.
        </p>
      </div>

      <div class="creds-box">
        <div style="font-size: 14px; font-weight: 800; color: #ffffff;">بيانات الحساب التجريبي المباشر (Live Sandbox Access):</div>
        <div style="font-size: 11px; color: #a8a29e; margin-top: 2px;">يمكنكم الدخول وتجربة شاشات الكاشير، الوصفات، والهدر بأنفسكم الآن:</div>

        <div class="creds-grid">
          <div class="cred-item">
            <div class="cred-label">رابط المنظومة:</div>
            <div class="cred-value">https://maxp.online/pos</div>
          </div>
          <div class="cred-item">
            <div class="cred-label">البريد الإلكتروني:</div>
            <div class="cred-value">cafe@maxp.online</div>
          </div>
          <div class="cred-item">
            <div class="cred-label">كلمة المرور:</div>
            <div class="cred-value">Password@123</div>
          </div>
        </div>
      </div>
    </div>

    <div class="doc-footer">
      <span>MaxP Enterprise Retail & Hospitality Suite</span>
      <span>الصفحة 4 من 4</span>
    </div>
  </div>

</body>
</html>`;

  // Launch browser with channel: 'chrome'
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle' });

  // Output PDF directory
  const outputDir = path.join(__dirname, '..', 'docs');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'MaxP-Cafe-Enterprise-Guide.pdf');

  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
  });

  await browser.close();
  console.log(`✅ PDF Generated Successfully at: ${outputPath}`);
}

generateCafeGuidePDF().catch(err => {
  console.error('❌ Failed to generate PDF:', err);
  process.exit(1);
});
