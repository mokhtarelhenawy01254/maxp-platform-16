const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function generateSimplifiedEgyptianCafePDF() {
  console.log('📄 Generating Simplified Egyptian Dialect Cafe & Restaurant Guide PDF...');

  const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>دليل تشغيل الكافيهات والمقاهي في منصة MaxP</title>
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
      padding: 16mm 18mm;
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

    /* Header & Footer */
    .doc-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 10px;
      margin-bottom: 16px;
    }

    .doc-header .brand {
      font-size: 18px;
      font-weight: 900;
      color: #fafaf9;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .doc-header .brand span {
      background: linear-gradient(135deg, #d97706, #f59e0b);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .doc-header .doc-tag {
      font-size: 11px;
      font-weight: 700;
      color: #fbbf24;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.25);
      padding: 3px 10px;
      border-radius: 20px;
    }

    .doc-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding-top: 8px;
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
      padding: 10px 0;
    }

    .cover-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 9999px;
      background: rgba(217, 119, 6, 0.15);
      border: 1px solid rgba(217, 119, 6, 0.35);
      color: #fbbf24;
      font-size: 11.5px;
      font-weight: 700;
      margin-bottom: 18px;
    }

    .cover-title {
      font-size: 32px;
      font-weight: 900;
      line-height: 1.3;
      color: #ffffff;
      margin-bottom: 14px;
      text-wrap: balance;
    }

    .cover-title span {
      color: #f59e0b;
    }

    .cover-desc {
      font-size: 14.5px;
      color: #d6d3d1;
      max-width: 600px;
      line-height: 1.8;
      margin-bottom: 26px;
    }

    .feature-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      width: 100%;
    }

    .feature-card {
      background: rgba(28, 25, 23, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 14px 16px;
    }

    .feature-card h4 {
      font-size: 13.5px;
      font-weight: 700;
      color: #fafaf9;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .feature-card p {
      font-size: 11px;
      color: #a8a29e;
      line-height: 1.6;
    }

    .dot-amber {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #f59e0b;
      display: inline-block;
    }

    /* Inner Sections */
    .section-header {
      margin-bottom: 14px;
    }

    .section-number {
      font-size: 10.5px;
      font-weight: 800;
      color: #f59e0b;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }

    .section-title {
      font-size: 20px;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 4px;
    }

    .section-desc {
      font-size: 11.5px;
      color: #a8a29e;
      line-height: 1.6;
    }

    .sub-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 14px;
    }

    .box-surface {
      background: rgba(28, 25, 23, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 12px 14px;
    }

    .box-surface h4 {
      font-size: 13px;
      font-weight: 700;
      color: #fafaf9;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .box-surface p {
      font-size: 11px;
      color: #a8a29e;
      line-height: 1.6;
    }

    .pill-badge {
      font-size: 9.5px;
      padding: 2px 7px;
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

    /* Flow Box */
    .flow-container {
      background: rgba(18, 16, 15, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 12px 14px;
      margin-bottom: 12px;
    }

    .flow-steps {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 8px;
    }

    .flow-step {
      text-align: center;
      flex: 1;
      padding: 6px 8px;
      background: rgba(28, 25, 23, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      margin: 0 3px;
    }

    .flow-step .step-title {
      font-size: 11px;
      font-weight: 700;
      color: #f5f5f4;
    }

    .flow-step .step-desc {
      font-size: 9px;
      color: #a8a29e;
    }

    .flow-arrow {
      color: #f59e0b;
      font-size: 13px;
      font-weight: bold;
    }

    /* Table */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
      margin-top: 6px;
    }

    .data-table th {
      background: rgba(41, 37, 36, 0.6);
      color: #d6d3d1;
      text-align: right;
      padding: 6px 8px;
      font-weight: 700;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .data-table td {
      padding: 6px 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      color: #e7e5e4;
    }

    .num-cell {
      font-family: monospace;
      font-size: 11.5px;
      color: #fbbf24;
      font-weight: 700;
    }

    .highlight-card {
      background: linear-gradient(135deg, rgba(217, 119, 6, 0.12) 0%, rgba(28, 25, 23, 0.8) 100%);
      border: 1px solid rgba(217, 119, 6, 0.3);
      border-radius: 12px;
      padding: 12px 16px;
      margin-top: 10px;
    }

    .highlight-card h3 {
      color: #f59e0b;
      font-size: 13.5px;
      font-weight: 800;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .highlight-card p {
      font-size: 11px;
      color: #e7e5e4;
      line-height: 1.6;
    }

    .creds-box {
      background: #1c1917;
      border: 1px solid #f59e0b;
      border-radius: 12px;
      padding: 14px 18px;
      margin-top: 12px;
    }

    .creds-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-top: 10px;
    }

    .cred-item {
      background: rgba(0, 0, 0, 0.4);
      padding: 6px 10px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .cred-label {
      font-size: 9.5px;
      color: #a8a29e;
    }

    .cred-value {
      font-size: 11.5px;
      font-family: monospace;
      font-weight: 700;
      color: #38bdf8;
    }
  </style>
</head>
<body>

  <!-- ================= PAGE 1: الغلاف والنظرة العامة ================= -->
  <div class="page">
    <div class="doc-header">
      <div class="brand">MaxP <span>Cafe Pro</span></div>
      <div class="doc-tag">الدليل التشغيلي الشامل للكافيهات والمطاعم</div>
    </div>

    <div class="cover-content">
      <div class="cover-badge">
        <span class="dot-amber"></span>
        المنظومة المتكاملة لإدارة الكافيه والمقهى المختص من الألف للياء
      </div>

      <h1 class="cover-title">
        إزاي تدير كافيهك باحتراف مع <span>MaxP</span>؟<br>
        من أول حبة البن في المخزن.. لحد الفلوس اللي دخلت الخزنة!
      </h1>

      <p class="cover-desc">
        أي صاحب كافيه أو مقهى مختص بيكون عنده 4 أسئلة شاغلة باله كل يوم: 
        <strong>(الزبون بيقعد قد إيه في الطابور؟ البن والحليب بيتهدر منهم قد إيه؟ البضاعة اللي في المخزن مظبوطة ولا فيها عجز؟ وفلوس الدرج والمصاريف النثرية متقفلة بالقرش ولا لأ؟)</strong>.. منصة MaxP اتعملت عشان تجاوبك على كل ده بضغطة زر واحدة.
      </p>

      <div class="feature-grid">
        <div class="feature-card">
          <h4><span class="dot-amber"></span> كاشير سريع وبون بار فوري</h4>
          <p>تخصيص المشروب (حليب لوز، شوت زيادة، سكر خفيف)، وإرسال بون التحضير للبار فوراً قبل ما العميل حتى يدفع عشان الطابور ميمشيش بطيء.</p>
        </div>

        <div class="feature-card">
          <h4><span class="dot-amber"></span> وصفات دقيقة وخصم مخزون بالجرام</h4>
          <p>كل كوباية سبانش لاتيه أو فلات وايت تتباع، بيتخصم قصادها أوتوماتيك 18 جرام بن و200 مل حليب من رصيد المستودع والبار لحظياً.</p>
        </div>

        <div class="feature-card">
          <h4><span class="dot-amber"></span> مشتريات ومخازن متعددة الفروع</h4>
          <p>فواتير الموردين، استلام كراتين الحليب وشكاير البن، والتحويل بين المخزن الرئيسي وبارات الفروع بمنتهى الدقة والرقابة.</p>
        </div>

        <div class="feature-card">
          <h4><span class="dot-amber"></span> خزنة مركزية، درج الكاشير، والنفقات</h4>
          <p>تقفيل وردية الكاشير، توريد إيراد اليوم للخزنة، وتسجيل المصاريف النثرية (شراء ثلج، نعناع، سباكة، صيانة الماكينات) بالقرش.</p>
        </div>
      </div>
    </div>

    <div class="doc-footer">
      <span>منصة MaxP لإدارة وتشغيل الكافيهات والمطاعم</span>
      <span>الصفحة 1 من 4</span>
    </div>
  </div>

  <!-- ================= PAGE 2: الكاشير والبار (POS & Modifiers) ================= -->
  <div class="page">
    <div class="doc-header">
      <div class="brand">MaxP <span>POS & Bar</span></div>
      <div class="doc-tag">الجزء الأول: سرعة الكاشير وتحضير البار</div>
    </div>

    <div>
      <div class="section-header">
        <div class="section-number">الجزء 01</div>
        <h2 class="section-title">نقطة البيع السريعة وسر الباريستا (Barista Cockpit)</h2>
        <p class="section-desc">شاشة كاشير معمولة بالعامية السريعة واللمس المريح، عشان الكاشير مياخدش أكثر من 3 ثواني لتسجيل وتخصيص أي أوردر معقد.</p>
      </div>

      <div class="sub-grid">
        <div class="box-surface">
          <h4>
            تخصيص المشروب (Drink Modifiers)
            <span class="pill-badge pill-green">سهل وسريع</span>
          </h4>
          <p>
            أول ما بتدوس على المشروب (مثلاً: سبانش لاتيه)، بتفتح شاشة ذكية:
            <br>• <strong>نوع الحليب:</strong> حليب كامل الدسم، حليب لوز (+25 ج)، حليب شوفان (+25 ج).
            <br>• <strong>الشوتات الإضافية:</strong> إسبريسو سنغل (+15 ج)، إسبريسو دبل (+25 ج).
            <br>• <strong>السيرب والنكهات:</strong> كراميل، فانيليا خالي السكر.
            <br>• <strong>تعليمات الباريستا:</strong> خانة حرة لكتابة ملاحظة الزبون (سكر خفيف، ثلج زيادة، سخن جداً).
          </p>
        </div>

        <div class="box-surface">
          <h4>
            بون التحضير المسبق للبار (KOT Fire)
            <span class="pill-badge pill-blue">فك زحمة الصباح</span>
          </h4>
          <p>
            في وقت الزحمة الصبح، الباريستا مش هيستنى لما الزبون يدور على المحفظة ويدفع!
            <br>الكاشير بيدوس <strong>«إرسال بون البار»</strong>، الطلب يظهر فوراً على شاشة أو طابعة البار عشان الباريستا يبدأ يطحن ويبخر فوراً بينما الكاشير بيحاسب الزبون براحته.
          </p>
        </div>

        <div class="box-surface">
          <h4>
            شيكات الطاولات وحفظ الطلبات (Table Tabs)
            <span class="pill-badge">خدمة الصالة</span>
          </h4>
          <p>
            لو زبون قعد في الصالة أو الشرفة وعايز يطلب كذا حاجة على مدار قعدته:
            <br>الكاشير أو الويتر بيحفظ الطلب باسم <strong>«طاولة 4 - شرفة»</strong>. يفضل الطلب مفتوح، وأي طلب جديد بينزل عليه، ولما ييجي يدفع بيتقفل ويتحاسب دفعة واحدة.
          </p>
        </div>

        <div class="box-surface">
          <h4>
            تقسيم الدفع والخصومات (Split Payments)
            <span class="pill-badge pill-rose">مرونة عالية</span>
          </h4>
          <p>
            لو اتنين صحاب عايزين يدفعوا سوا، أو زبون عايز يدفع 50 جنيه كاش والباقي بالفيزا أو المحفظة الإلكترونية:
            <br>النظام بيقسم الفاتورة أوتوماتيك بدون آلة حاسبة وبدون أي خطأ في تقفيل الحساب.
          </p>
        </div>
      </div>

      <div class="flow-container">
        <div style="font-size: 11.5px; font-weight: 800; color: #fbbf24; margin-bottom: 2px;">دورة الطلب السريع في الكافيه:</div>
        <div class="flow-steps">
          <div class="flow-step">
            <div class="step-title">1. لمسة على المشروب</div>
            <div class="step-desc">سبانش لاتيه بارد</div>
          </div>
          <div class="flow-arrow">←</div>
          <div class="flow-step">
            <div class="step-title">2. التخصيص في ثانية</div>
            <div class="step-desc">حليب لوز + شوت إضافي</div>
          </div>
          <div class="flow-arrow">←</div>
          <div class="flow-step">
            <div class="step-title">3. إرسال بون البار</div>
            <div class="step-desc">الباريستا بدأ التحضير</div>
          </div>
          <div class="flow-arrow">←</div>
          <div class="flow-step">
            <div class="step-title">4. تحصيل الفلوس</div>
            <div class="step-desc">كاش أو فيزا مقسمة</div>
          </div>
        </div>
      </div>

      <div class="highlight-card">
        <h3>النتيجة العملية: الطابور بيتحرك في نص الوقت!</h3>
        <p>التناغم اللحظي بين شاشة الكاشير وشاشة أو طابعة البار بيوفر أكثر من 40 ثانية في كل أوردر، وده بيخليك تخدم زباين أكثر في ساعة الذروة الصباحية وتزود مبيعات اليوم.</p>
      </div>
    </div>

    <div class="doc-footer">
      <span>منصة MaxP لإدارة وتشغيل الكافيهات والمطاعم</span>
      <span>الصفحة 2 من 4</span>
    </div>
  </div>

  <!-- ================= PAGE 3: المشتريات، المخزون، والوصفات (BOM & Procurement) ================= -->
  <div class="page">
    <div class="doc-header">
      <div class="brand">MaxP <span>Stock & BOM</span></div>
      <div class="doc-tag">الجزء الثاني: المشتريات، المخازن، وحساب التكلفة</div>
    </div>

    <div>
      <div class="section-header">
        <div class="section-number">الجزء 02</div>
        <h2 class="section-title">المشتريات، المخازن، وهندسة الوصفات (Recipe BOM)</h2>
        <p class="section-desc">إزاي تشتري خاماتك من الموردين، تراقب رصيد المخزن الرئيسي وبار الكافيه، وتخصم كل جرام بيتباع تلقائياً.</p>
      </div>

      <div class="sub-grid">
        <div class="box-surface">
          <h4>
            فواتير الموردين والمشتريات (Procurement)
            <span class="pill-badge pill-blue">رقابة التوريد</span>
          </h4>
          <p>
            • بتسجل كل فاتورة شراء جاية من مورد البن، الحليب، السيرب، أو الأكواب.
            <br>• تحديد سعر الشراء وتاريخ الاستلام وطريقة السداد (كاش من الخزنة أو آجل).
            <br>• أول ما تدوس «تأكيد الاستلام»، الرصيد بيزيد فوراً في المخزن وتتحدث متوسطات التكلفة.
          </p>
        </div>

        <div class="box-surface">
          <h4>
            المخزن الرئيسي ومخزن البار (Multi-Location)
            <span class="pill-badge pill-green">منع السرقة والتسريب</span>
          </h4>
          <p>
            • فصل المخزن العام (الكراتين المقفولة) عن المخزن اللي تحت إيد الباريستا في البار.
            <br>• التحويل الداخلي بين المخازن: لما البار يحتاج 5 كجم بن، بيتعمل إذن تحويل موثق بالوقت واسم المستلم عشان مفيش حاجة تضيع بين المخزن والبار.
          </p>
        </div>
      </div>

      <div class="box-surface" style="margin-bottom: 12px;">
        <h4>مثال واقعي: جدول مكونات كوباية (سبانش لاتيه بارد):</h4>
        <table class="data-table">
          <thead>
            <tr>
              <th>المادة الخام</th>
              <th>الكمية المخصومة</th>
              <th>سعر الشراء</th>
              <th>التكلفة الفعلية للكوب</th>
              <th>طريقة الخصم</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>بن سبيشالتي إثيوبي فاخر</td>
              <td class="num-cell">0.018 كجم (18 جم)</td>
              <td>420 ج / كجم</td>
              <td class="num-cell">7.56 ج</td>
              <td><span class="pill-badge pill-green">خصم آلي بالجرام</span></td>
            </tr>
            <tr>
              <td>حليب طازج كامل الدسم</td>
              <td class="num-cell">0.200 لتر (200 مل)</td>
              <td>36 ج / لتر</td>
              <td class="num-cell">7.20 ج</td>
              <td><span class="pill-badge pill-green">خصم آلي بالمل</span></td>
            </tr>
            <tr>
              <td>سيرب كراميل فرنسي (Monin)</td>
              <td class="num-cell">0.025 لتر (25 مل)</td>
              <td>160 ج / لتر</td>
              <td class="num-cell">4.00 ج</td>
              <td><span class="pill-badge pill-green">خصم آلي بالمل</span></td>
            </tr>
            <tr>
              <td>كوب بلاستيك + غطاء وشاليموه</td>
              <td class="num-cell">1 طقم كامل</td>
              <td>3.50 ج</td>
              <td class="num-cell">3.50 ج</td>
              <td><span class="pill-badge pill-green">خصم بالقطعة</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="sub-grid">
        <div class="box-surface">
          <h4>حسبة الأرباح الأوتوماتيكية:</h4>
          <p style="line-height: 1.8;">
            • سعر بيع الكوب للزبون: <span class="num-cell">85.00 ج</span>
            <br>• إجمالي تكلفة المكونات: <span class="num-cell">22.26 ج</span>
            <br>• مكسبك الصافي في الكوباية: <span class="num-cell" style="color: #34d399;">62.74 ج</span>
            <br>• نسبة هامش الربح: <span class="pill-badge pill-green">73.8% هامش ربح ممتاز</span>
          </p>
        </div>

        <div class="box-surface">
          <h4>الذكاء في بدائل الحليب:</h4>
          <p>
            لو العميل طلب حليب لوز بدال الحليب العادي:
            <br>السيستم بذكاء بيخصم <strong>0.25 كجم حليب لوز</strong> وبيلغي خصم الحليب العادي، وبيضيف فرق السعر (+25 ج) في الفاتورة ويحسب التكلفة الجديدة بالمليم!
          </p>
        </div>
      </div>

      <div class="highlight-card">
        <h3>الرقابة الحديدية على خامات الكافيه</h3>
        <p>مفيش كيس بن هيتفتح ومفيش علبة لبن هتخلص إلا وليها أثر: يا إما قصادها كوبايات اتباعت وداخل فلوسها الدرج، يا إما متسجلة هدر رسمي معتمد.</p>
      </div>
    </div>

    <div class="doc-footer">
      <span>منصة MaxP لإدارة وتشغيل الكافيهات والمطاعم</span>
      <span>الصفحة 3 من 4</span>
    </div>
  </div>

  <!-- ================= PAGE 4: الهدر، الخزنة، والمصاريف (Waste & Treasury) ================= -->
  <div class="page">
    <div class="doc-header">
      <div class="brand">MaxP <span>Finance & Cash</span></div>
      <div class="doc-tag">الجزء الثالث: الهدر، الخزنة، وتقفيل اليومية</div>
    </div>

    <div>
      <div class="section-header">
        <div class="section-number">الجزء 03</div>
        <h2 class="section-title">الهدر والعيار، الخزنة المركزية، والنفقات اليومية</h2>
        <p class="section-desc">الكافيه بيكسب لما تسيطر على الهدر الصباحي، وتقفل حساب الخزنة والمصاريف النثرية أول بأول.</p>
      </div>

      <div class="sub-grid">
        <div class="box-surface">
          <h4>
            سجل هدر البن والعيار (Dial-in Spoilage)
            <span class="pill-badge pill-rose">ضبط التكلفة</span>
          </h4>
          <p>
            الباريستا الصبح وهو بيظبط مطحنة الإسبريسو عشان الطحنة تطلع مظبوطة:
            <br>• بيهدر حوالي 50 لـ 60 جرام بن.. في MaxP بيسجلهم في ثانيتين بزر <strong>«معايرة مطحنة»</strong>.
            <br>• لو كوباية وقعت أو علبة لبن باظت، بتتسجل فوراً «انسكاب» أو «تالف».
            <br>• بكده المخزن يفضل مظبوط 100% وميبقاش عندك عجز مجهول المصدر في الجرد.
          </p>
        </div>

        <div class="box-surface">
          <h4>
            جلسات الجرد الفعلي (Stock Audits)
            <span class="pill-badge pill-blue">مطابقة سريعة</span>
          </h4>
          <p>
            كل أسبوع أو شهر، بتعمل جلسة جرد:
            <br>• السيستم بيطلعلك الرصيد الدفتري المتوقع في المخزن والبار.
            <br>• بتوزن البن وتعد العلب وتدخل الأرقام الفعلية.
            <br>• السيستم بيحسب الفرق فوراً (بالكمية وبالفلوس)، وتدوس <strong>«اعتماد الجرد»</strong> عشان تتسوى كل الأرصدة بضغطة زر.
          </p>
        </div>
      </div>

      <div class="box-surface" style="margin-bottom: 12px;">
        <h4 style="color: #fbbf24;">موديل الخزنة، العهدة، والمصروفات اليومية (Treasury & Safe):</h4>
        <p style="font-size: 11.5px; color: #d6d3d1; line-height: 1.8;">
          • <strong>درج الكاشير وتقفيل الوردية:</strong> الكاشير بيفتح بدرج عهدة نقدية أول اليوم، وفي نهاية الوردية بيقفل ويسرد المبيعات (كاش وفيزا ومحافظ) ويورد الصافي للخزنة الرئيسية.
          <br>• <strong>المصروفات النثرية واليومية:</strong> أي كافيه بيطلع مصاريف على مدار اليوم (شراء ثلج، نعناع، أدوات نظافة، صيانة سباكة، مصاريف نقل).. بيتم تسجيلها في ثوانٍ مع اختيار بند المصروف وتتخصم من الخزنة فوراً.
          <br>• <strong>تقرير صافي الربح الحقيقي اليومي:</strong> (إجمالي مبيعات اليوم - تكلفة الخامات المستهلكة - المصاريف والنفقات اليومية = <strong>الصافي الحقيقي اللي دخل جيبك النهاردة!</strong>).
        </p>
      </div>

      <div class="creds-box">
        <div style="font-size: 13.5px; font-weight: 800; color: #ffffff;">بيانات الدخول والتجربة المباشرة (جرب بنفسك الآن):</div>
        <div style="font-size: 10.5px; color: #a8a29e; margin-top: 2px;">تقدر تفتح اللينك ده من الموبايل أو اللابتوب وتجرب كل الشاشات لايف:</div>

        <div class="creds-grid">
          <div class="cred-item">
            <div class="cred-label">رابط الكاشير:</div>
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
      <span>منصة MaxP لإدارة وتشغيل الكافيهات والمطاعم</span>
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
  console.log(`✅ Simplified Egyptian Dialect PDF Generated Successfully at: ${outputPath}`);
}

generateSimplifiedEgyptianCafePDF().catch(err => {
  console.error('❌ Failed to generate PDF:', err);
  process.exit(1);
});
