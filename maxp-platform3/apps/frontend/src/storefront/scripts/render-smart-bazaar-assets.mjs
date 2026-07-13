import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../..');
const assetsDir = path.resolve(projectRoot, 'public/assets/themes/smart-bazaar');

const buildPreviewHtml = () => String.raw`
<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>Smart Bazaar Preview</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "IBM Plex Sans Arabic", "Segoe UI", Tahoma, Arial, sans-serif;
      background: linear-gradient(160deg, #f7fbff 0%, #eef5ff 46%, #fff7ea 100%);
      color: #13263f;
      direction: rtl;
    }
    .canvas {
      width: 1600px;
      height: 980px;
      margin: 0 auto;
      position: relative;
      overflow: hidden;
      background:
        radial-gradient(circle at 14% 84%, rgba(255, 186, 73, 0.15), transparent 18%),
        radial-gradient(circle at 86% 12%, rgba(30, 99, 255, 0.12), transparent 22%),
        linear-gradient(160deg, #f7fbff 0%, #eef5ff 46%, #fff7ea 100%);
    }
    .glow {
      position: absolute;
      border-radius: 999px;
      filter: blur(90px);
      opacity: 0.72;
    }
    .glow.one { width: 280px; height: 280px; background: rgba(30, 99, 255, 0.22); top: 110px; right: -40px; }
    .glow.two { width: 260px; height: 260px; background: rgba(255, 186, 73, 0.24); left: 10px; bottom: 10px; }
    .window {
      position: absolute;
      inset: 78px 118px 82px;
      border-radius: 42px;
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.9);
      box-shadow: 0 50px 120px -70px rgba(19, 38, 63, 0.34);
      backdrop-filter: blur(18px);
      overflow: hidden;
    }
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      padding: 20px 28px;
      border-bottom: 1px solid rgba(20, 61, 122, 0.08);
      background: rgba(255, 255, 255, 0.72);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 800;
      font-size: 24px;
      white-space: nowrap;
      flex-direction: row-reverse;
    }
    .brand-dot {
      width: 14px;
      height: 14px;
      border-radius: 999px;
      background: linear-gradient(135deg, #ffb233, #1e63ff);
      box-shadow: 0 0 0 8px rgba(30, 99, 255, 0.08);
    }
    .nav {
      display: flex;
      gap: 14px;
      color: #516177;
      font-size: 15px;
      font-weight: 700;
    }
    .nav span.active {
      color: #1e63ff;
      background: rgba(30, 99, 255, 0.08);
      padding: 10px 16px;
      border-radius: 999px;
    }
    .tools {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .search {
      min-width: 330px;
      background: #f1f5fb;
      color: #6a7788;
      border-radius: 999px;
      padding: 12px 18px;
      font-size: 14px;
      font-weight: 700;
      text-align: right;
    }
    .cart {
      background: #1e63ff;
      color: white;
      border-radius: 999px;
      padding: 12px 18px;
      font-weight: 800;
      font-size: 14px;
      box-shadow: 0 24px 50px -36px rgba(30, 99, 255, 0.7);
      white-space: nowrap;
    }
    .body {
      padding: 28px;
      display: grid;
      grid-template-columns: 1.02fr 0.98fr;
      gap: 24px;
      height: calc(100% - 84px);
    }
    .hero {
      display: flex;
      flex-direction: column;
      gap: 18px;
      text-align: right;
    }
    .eyebrow {
      width: fit-content;
      padding: 10px 16px;
      border-radius: 999px;
      border: 1px solid rgba(30, 99, 255, 0.12);
      color: #1e63ff;
      background: rgba(30, 99, 255, 0.05);
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.18em;
    }
    .hero h1 {
      margin: 0;
      font-size: 56px;
      line-height: 1.02;
      max-width: 10.8ch;
      letter-spacing: -0.04em;
    }
    .hero p {
      margin: 0;
      color: #5a6879;
      font-size: 21px;
      line-height: 1.78;
      max-width: 31ch;
      font-weight: 600;
    }
    .cta-row {
      display: flex;
      gap: 14px;
      justify-content: flex-start;
    }
    .cta {
      border-radius: 999px;
      padding: 15px 24px;
      font-size: 16px;
      font-weight: 900;
    }
    .cta.primary {
      background: linear-gradient(135deg, #1e63ff, #1856df);
      color: white;
      box-shadow: 0 24px 60px -42px rgba(30, 99, 255, 0.75);
    }
    .cta.secondary {
      border: 1px solid rgba(30, 99, 255, 0.14);
      background: rgba(255, 255, 255, 0.88);
      color: #13263f;
    }
    .quick-links {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .quick-links span, .fact {
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.92);
      border: 1px solid rgba(30, 99, 255, 0.1);
      padding: 10px 14px;
      font-size: 13px;
      font-weight: 800;
      color: #13263f;
      box-shadow: 0 16px 30px -28px rgba(19, 38, 63, 0.35);
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
      margin-top: auto;
    }
    .stat {
      border-radius: 26px;
      background: rgba(255, 255, 255, 0.92);
      border: 1px solid rgba(30, 99, 255, 0.08);
      padding: 18px 18px 20px;
      box-shadow: 0 20px 36px -34px rgba(19, 38, 63, 0.5);
    }
    .stat .label {
      color: #6b7889;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.16em;
      margin-bottom: 8px;
    }
    .stat .value {
      font-size: 17px;
      font-weight: 900;
      line-height: 1.5;
    }
    .panel {
      display: grid;
      grid-template-rows: 1fr auto;
      gap: 18px;
    }
    .deal {
      border-radius: 32px;
      background: linear-gradient(145deg, #1e63ff, #1b56df 74%);
      color: white;
      padding: 24px;
      box-shadow: 0 35px 80px -55px rgba(30, 99, 255, 0.8);
      position: relative;
      overflow: hidden;
    }
    .deal::after {
      content: "";
      position: absolute;
      left: -40px;
      bottom: -30px;
      width: 170px;
      height: 170px;
      border-radius: 999px;
      background: rgba(255,255,255,0.08);
    }
    .deal-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      margin-bottom: 18px;
    }
    .deal-head span {
      padding: 10px 14px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.16em;
    }
    .deal-head .soft { background: rgba(255,255,255,0.14); }
    .deal-head .white { background: white; color: #1e63ff; }
    .deal h2 {
      margin: 0 0 12px;
      font-size: 34px;
      line-height: 1.12;
      max-width: 12ch;
    }
    .deal p {
      margin: 0;
      font-size: 15px;
      line-height: 1.9;
      color: rgba(255,255,255,0.84);
      max-width: 28ch;
      font-weight: 600;
    }
    .deal-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-top: 18px;
    }
    .deal-box {
      border-radius: 22px;
      background: rgba(255,255,255,0.11);
      border: 1px solid rgba(255,255,255,0.08);
      padding: 16px;
    }
    .deal-box .mini { font-size: 11px; font-weight: 900; letter-spacing: 0.16em; color: rgba(255,255,255,0.72); }
    .deal-box .strong { margin-top: 6px; font-size: 16px; font-weight: 900; }
    .deal-box .sub { margin-top: 6px; font-size: 12px; color: rgba(255,255,255,0.76); }
    .products {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .product {
      display: grid;
      grid-template-columns: 92px 1fr;
      gap: 14px;
      align-items: start;
      padding: 14px;
      border-radius: 24px;
      border: 1px solid rgba(30, 99, 255, 0.08);
      background: rgba(255, 255, 255, 0.94);
      box-shadow: 0 18px 34px -28px rgba(19, 38, 63, 0.32);
    }
    .thumb {
      min-height: 92px;
      border-radius: 22px;
      padding: 12px;
      display: flex;
      align-items: flex-end;
      justify-content: flex-start;
      background: linear-gradient(145deg, rgba(30,99,255,0.16), rgba(255,255,255,0.9));
    }
    .thumb.gold { background: linear-gradient(145deg, rgba(255,186,73,0.42), rgba(255,255,255,0.92)); }
    .thumb.slate { background: linear-gradient(145deg, rgba(148,163,184,0.35), rgba(255,255,255,0.92)); }
    .thumb span {
      background: rgba(255,255,255,0.9);
      padding: 8px 10px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 900;
      box-shadow: 0 12px 26px -18px rgba(19,38,63,0.25);
    }
    .product h3 {
      margin: 2px 0 8px;
      font-size: 17px;
      line-height: 1.7;
    }
    .product .meta { color: #6b7889; font-size: 12px; font-weight: 800; }
    .row { display: flex; align-items: center; gap: 10px; margin-top: 10px; }
    .price { font-size: 17px; font-weight: 900; }
    .compare { color: #7c8898; font-size: 12px; font-weight: 800; text-decoration: line-through; }
    .badge { margin-right: auto; padding: 8px 12px; border-radius: 999px; background: rgba(30,99,255,0.08); color: #1e63ff; font-size: 11px; font-weight: 900; }
    .summary {
      border-radius: 24px;
      background: linear-gradient(135deg, rgba(255,186,73,0.24), rgba(255,255,255,0.98) 56%, rgba(242,247,255,1));
      border: 1px solid rgba(30, 99, 255, 0.08);
      padding: 18px 20px;
      box-shadow: 0 20px 40px -34px rgba(19,38,63,0.35);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }
    .summary .mini { font-size: 11px; font-weight: 900; letter-spacing: 0.16em; color: #6b7889; }
    .summary .strong { margin-top: 8px; font-size: 17px; font-weight: 900; max-width: 23ch; line-height: 1.45; }
    .summary .tag { padding: 10px 14px; border-radius: 999px; background: #13263f; color: white; font-size: 11px; font-weight: 900; letter-spacing: 0.16em; }
  </style>
</head>
<body>
  <div class="canvas">
    <div class="glow one"></div>
    <div class="glow two"></div>
    <div class="window">
      <div class="topbar">
        <div class="brand"><span class="brand-dot"></span>بيتك اليوم</div>
        <div class="nav">
          <span class="active">الرئيسية</span>
          <span>المتجر</span>
          <span>الأقسام</span>
          <span>العروض</span>
          <span>الأكثر طلبًا</span>
        </div>
        <div class="tools">
          <div class="search">ابحث عن منظمات المطبخ والهدايا السريعة وأساسيات البيت</div>
          <div class="cart">السلة 3</div>
        </div>
      </div>
      <div class="body">
        <div class="hero">
          <div class="eyebrow">بيتك اليوم</div>
          <h1>كل احتياجات البيت واليوم العادي في متجر واحد واضح</h1>
          <p>منظمات التخزين وأساسيات البيت والهدايا السريعة واللقطات الاقتصادية مرتبة مثل متجر حقيقي يساعدك تختار بسرعة.</p>
          <div class="cta-row">
            <div class="cta primary">ابدأ التسوق</div>
            <div class="cta secondary">شاهد الأقسام</div>
          </div>
          <div class="quick-links">
            <span>منظمات البيت</span>
            <span>أقل من 299 ج.م</span>
            <span>جاهز كهدية</span>
            <span>الأكثر طلبًا</span>
          </div>
          <div class="stats">
            <div class="stat">
              <div class="label">اختيار أسرع</div>
              <div class="value">أقسام واضحة وعروض يومية تقربك من القرار</div>
            </div>
            <div class="stat">
              <div class="label">ثقة ظاهرة</div>
              <div class="value">الشحن والاستبدال والدفع المريح ظاهرين من البداية</div>
            </div>
            <div class="stat">
              <div class="label">طلبات متكررة</div>
              <div class="value">منتجات عملية للبيت والتنظيم والهدايا السريعة</div>
            </div>
          </div>
        </div>
        <div class="panel">
          <div class="deal">
            <div class="deal-head">
              <span class="soft">عروض الأسبوع</span>
              <span class="white">خصم حتى 25%</span>
            </div>
            <h2>اختيارات يومية مرتبة مثل الرف الحقيقي داخل المتجر</h2>
            <p>منظمات مطبخ ومساعدات مكتب وهدايا جاهزة تظهر قبل الدفع لتسهّل القرار من أول نظرة.</p>
            <div class="deal-grid">
              <div class="deal-box">
                <div class="mini">عرض اليوم</div>
                <div class="strong">باقة تنظيم المطبخ</div>
                <div class="sub">تبدأ من 199 ج.م</div>
              </div>
              <div class="deal-box">
                <div class="mini">شحن سريع</div>
                <div class="strong">القاهرة والجيزة</div>
                <div class="sub">خلال 48 ساعة عمل</div>
              </div>
            </div>
          </div>
          <div class="products">
            <div class="product">
              <div class="thumb"><span>الأكثر طلبًا</span></div>
              <div>
                <h3>طقم تخزين 6 قطع</h3>
                <div class="meta">جاهز للشحن في المدن الرئيسية</div>
                <div class="row"><span class="price">249 ج.م</span><span class="compare">319 ج.م</span><span class="badge">جاهز</span></div>
              </div>
            </div>
            <div class="product">
              <div class="thumb gold"><span>وصل جديد</span></div>
              <div>
                <h3>منظم مكتب خشبي</h3>
                <div class="meta">اختيار عملي لركن المكتب والعمل من البيت</div>
                <div class="row"><span class="price">179 ج.م</span><span class="compare">219 ج.م</span><span class="badge">سريع</span></div>
              </div>
            </div>
            <div class="product">
              <div class="thumb slate"><span>جاهز كهدية</span></div>
              <div>
                <h3>بوكس هدية عملي</h3>
                <div class="meta">مناسب للهدايا السريعة والطلبات الأخيرة</div>
                <div class="row"><span class="price">329 ج.م</span><span class="badge">هدية</span></div>
              </div>
            </div>
            <div class="summary">
              <div>
                <div class="mini">ملخص سريع</div>
                <div class="strong">عروض وهدايا ومنظمات مرتبة داخل واجهة تشبه المتجر الحقيقي</div>
              </div>
              <div class="tag">متجر حي</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

const buildHeroHtml = () => String.raw`
<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>Smart Bazaar Hero</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "IBM Plex Sans Arabic", "Segoe UI", Tahoma, Arial, sans-serif;
      background:
        radial-gradient(circle at top right, rgba(255,186,73,0.18), transparent 28%),
        radial-gradient(circle at left center, rgba(30,99,255,0.14), transparent 34%),
        linear-gradient(180deg, #f8fbff 0%, #edf4ff 50%, #f8fbff 100%);
      direction: rtl;
    }
    .hero {
      width: 1400px;
      height: 980px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: 1.04fr 0.96fr;
      gap: 44px;
      align-items: center;
      padding: 90px 70px;
      position: relative;
      overflow: hidden;
    }
    .blob {
      position: absolute;
      border-radius: 999px;
      filter: blur(90px);
      opacity: 0.7;
    }
    .blob.a { width: 260px; height: 260px; background: rgba(30,99,255,0.18); top: 80px; left: -40px; }
    .blob.b { width: 260px; height: 260px; background: rgba(255,186,73,0.22); right: -20px; bottom: 40px; }
    .copy { position: relative; z-index: 2; }
    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      border-radius: 999px;
      border: 1px solid rgba(30,99,255,0.12);
      background: rgba(255,255,255,0.84);
      padding: 12px 16px;
      color: #1e63ff;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.2em;
      box-shadow: 0 16px 34px -28px rgba(19,38,63,0.35);
    }
    .eyebrow::before {
      content: "";
      width: 10px;
      height: 10px;
      border-radius: 999px;
      background: #ffb233;
    }
    h1 {
      margin: 24px 0 18px;
      font-size: 80px;
      line-height: 0.98;
      letter-spacing: -0.06em;
      color: #13263f;
      max-width: 9.5ch;
      text-align: right;
    }
    p {
      margin: 0;
      color: #5a6879;
      font-size: 24px;
      line-height: 1.75;
      font-weight: 600;
      max-width: 30ch;
      text-align: right;
    }
    .buttons {
      display: flex;
      gap: 16px;
      margin-top: 28px;
    }
    .button {
      border-radius: 999px;
      padding: 16px 26px;
      font-size: 17px;
      font-weight: 900;
    }
    .button.primary {
      background: linear-gradient(135deg, #1e63ff, #1856df);
      color: white;
      box-shadow: 0 28px 70px -42px rgba(30,99,255,0.72);
    }
    .button.secondary {
      border: 1px solid rgba(30,99,255,0.14);
      background: rgba(255,255,255,0.88);
      color: #13263f;
    }
    .facts {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
      margin-top: 30px;
    }
    .fact {
      border-radius: 28px;
      border: 1px solid rgba(30,99,255,0.1);
      background: rgba(255,255,255,0.9);
      padding: 18px;
      box-shadow: 0 20px 36px -32px rgba(19,38,63,0.35);
    }
    .fact .label {
      color: #6b7889;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.16em;
      margin-bottom: 8px;
    }
    .fact .value {
      color: #13263f;
      font-size: 18px;
      font-weight: 900;
      line-height: 1.45;
    }
    .visual {
      position: relative;
      z-index: 2;
      border-radius: 40px;
      border: 1px solid rgba(255,255,255,0.72);
      background: rgba(255,255,255,0.92);
      box-shadow: 0 44px 120px -70px rgba(19,38,63,0.36);
      padding: 22px;
      backdrop-filter: blur(18px);
    }
    .toolbar {
      display: flex;
      gap: 10px;
      margin-bottom: 18px;
    }
    .toolbar span {
      height: 14px;
      width: 14px;
      border-radius: 999px;
      background: #d9e4f4;
    }
    .toolbar span:nth-child(2) { background: #ffcf76; }
    .toolbar span:nth-child(3) { background: #7aa5ff; }
    .search {
      border-radius: 999px;
      background: #f1f5fb;
      padding: 14px 18px;
      color: #6a7788;
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 16px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1.04fr 0.96fr;
      gap: 14px;
    }
    .deal {
      border-radius: 30px;
      background: linear-gradient(145deg, #1e63ff, #1b56df 76%);
      color: white;
      padding: 22px;
      min-height: 360px;
      position: relative;
      overflow: hidden;
    }
    .deal::after {
      content: "";
      position: absolute;
      left: -24px;
      bottom: -34px;
      width: 140px;
      height: 140px;
      border-radius: 999px;
      background: rgba(255,255,255,0.08);
    }
    .deal .mini {
      display: inline-flex;
      border-radius: 999px;
      background: rgba(255,255,255,0.14);
      padding: 10px 14px;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.16em;
    }
    .deal h2 {
      margin: 18px 0 12px;
      font-size: 36px;
      line-height: 1.08;
      max-width: 10ch;
    }
    .deal p {
      font-size: 15px;
      color: rgba(255,255,255,0.84);
      max-width: 24ch;
      line-height: 1.8;
    }
    .deal-cards {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-top: 16px;
    }
    .deal-cards div {
      border-radius: 22px;
      padding: 15px;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.08);
    }
    .deal-cards .small {
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.16em;
      color: rgba(255,255,255,0.72);
    }
    .deal-cards .big {
      font-size: 15px;
      font-weight: 900;
      margin-top: 7px;
    }
    .deal-cards .sub {
      font-size: 12px;
      margin-top: 6px;
      color: rgba(255,255,255,0.78);
    }
    .stack {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .item {
      border-radius: 26px;
      border: 1px solid rgba(30,99,255,0.08);
      background: rgba(255,255,255,0.94);
      box-shadow: 0 18px 36px -30px rgba(19,38,63,0.28);
      padding: 14px;
      display: grid;
      grid-template-columns: 92px 1fr;
      gap: 14px;
      align-items: start;
    }
    .thumb {
      min-height: 92px;
      border-radius: 22px;
      padding: 12px;
      display: flex;
      align-items: flex-end;
      background: linear-gradient(145deg, rgba(30,99,255,0.16), rgba(255,255,255,0.92));
    }
    .thumb.gold { background: linear-gradient(145deg, rgba(255,186,73,0.42), rgba(255,255,255,0.92)); }
    .thumb.slate { background: linear-gradient(145deg, rgba(148,163,184,0.38), rgba(255,255,255,0.92)); }
    .thumb span {
      border-radius: 999px;
      background: rgba(255,255,255,0.92);
      padding: 8px 10px;
      font-size: 10px;
      font-weight: 900;
      box-shadow: 0 12px 26px -18px rgba(19,38,63,0.25);
    }
    .item h3 {
      margin: 0 0 8px;
      color: #13263f;
      font-size: 17px;
      line-height: 1.7;
    }
    .item p {
      color: #6b7889;
      font-size: 12px;
      font-weight: 800;
      line-height: 1.65;
      margin: 0;
      text-align: right;
    }
    .price-row {
      display: flex;
      gap: 10px;
      align-items: center;
      margin-top: 10px;
    }
    .price {
      color: #13263f;
      font-size: 17px;
      font-weight: 900;
    }
    .compare {
      color: #7c8898;
      font-size: 12px;
      font-weight: 800;
      text-decoration: line-through;
    }
    .tag {
      margin-right: auto;
      border-radius: 999px;
      padding: 8px 12px;
      background: rgba(30,99,255,0.08);
      color: #1e63ff;
      font-size: 11px;
      font-weight: 900;
    }
  </style>
</head>
<body>
  <div class="hero">
    <div class="blob a"></div>
    <div class="blob b"></div>
    <div class="copy">
      <div class="eyebrow">بيتك اليوم</div>
      <h1>احتياجات البيت اليومية في تجربة شراء أوضح وأسرع</h1>
      <p>أقسام سريعة وعروض مرتبة ورسائل ثقة واضحة تجعل المتجر العام يبدو حيًا من أول نظرة.</p>
      <div class="buttons">
        <div class="button primary">ابدأ التسوق</div>
        <div class="button secondary">شاهد الأقسام</div>
      </div>
      <div class="facts">
        <div class="fact">
          <div class="label">اختيار أسرع</div>
          <div class="value">أقسام واضحة وعروض أسبوعية تقرب القرار</div>
        </div>
        <div class="fact">
          <div class="label">ثقة أوضح</div>
          <div class="value">الشحن والاستبدال ظاهرين قبل إتمام الطلب</div>
        </div>
        <div class="fact">
          <div class="label">قيمة عملية</div>
          <div class="value">منظمات البيت وأساسياته والهدايا السريعة في مكان واحد</div>
        </div>
      </div>
    </div>

    <div class="visual">
      <div class="toolbar"><span></span><span></span><span></span></div>
      <div class="search">ابحث عن منظمات البيت وباقات المطبخ والهدايا السريعة</div>
      <div class="grid">
        <div class="deal">
          <div class="mini">عروض الأسبوع</div>
          <h2>اختيارات عملية تساعد على الشراء أسرع</h2>
          <p>منظمات البيت وأطقم التخزين والمنتجات الاقتصادية مرتبة لتسهيل القرار من أول نظرة.</p>
          <div class="deal-cards">
            <div>
              <div class="small">عرض اليوم</div>
              <div class="big">باقة المطبخ</div>
              <div class="sub">تبدأ من 199 ج.م</div>
            </div>
            <div>
              <div class="small">التوصيل</div>
              <div class="big">القاهرة والجيزة</div>
              <div class="sub">خلال 48 ساعة</div>
            </div>
          </div>
        </div>

        <div class="stack">
          <div class="item">
            <div class="thumb"><span>الأكثر طلبًا</span></div>
            <div>
              <h3>طقم تخزين 6 قطع</h3>
              <p>جاهز للشحن في المدن الرئيسية</p>
              <div class="price-row"><span class="price">249 ج.م</span><span class="compare">319 ج.م</span><span class="tag">جاهز</span></div>
            </div>
          </div>
          <div class="item">
            <div class="thumb gold"><span>وصل جديد</span></div>
            <div>
              <h3>منظم مكتب خشبي</h3>
              <p>اختيار عملي لركن المكتب والعمل من البيت</p>
              <div class="price-row"><span class="price">179 ج.م</span><span class="compare">219 ج.م</span><span class="tag">سريع</span></div>
            </div>
          </div>
          <div class="item">
            <div class="thumb slate"><span>جاهز كهدية</span></div>
            <div>
              <h3>بوكس هدية عملي</h3>
              <p>مناسب للمناسبات والطلبات السريعة</p>
              <div class="price-row"><span class="price">329 ج.م</span><span class="tag">هدية</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

const renderSceneChips = (chips) => chips
  .map((chip) => `<span>${chip}</span>`)
  .join('');

const renderSceneCards = (cards) => cards
  .map((card) => `
    <div class="product">
      <div class="thumb ${card.tone ?? ''}"><span>${card.label}</span></div>
      <div>
        <h3>${card.title}</h3>
        <p>${card.meta}</p>
        <div class="row">
          <span class="price">${card.price}</span>
          ${card.compare ? `<span class="compare">${card.compare}</span>` : ''}
          <span class="tag">${card.tag}</span>
        </div>
      </div>
    </div>
  `)
  .join('');

const renderSceneFacts = (facts) => facts
  .map((fact) => `
    <div class="fact">
      <div class="fact-label">${fact.label}</div>
      <div class="fact-value">${fact.value}</div>
    </div>
  `)
  .join('');

const buildCollectionSceneHtml = (config) => `
<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>${config.title}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "IBM Plex Sans Arabic", "Segoe UI", Tahoma, Arial, sans-serif;
      background: ${config.background};
      color: #13263f;
      direction: rtl;
    }
    .canvas {
      width: 800px;
      height: 600px;
      position: relative;
      overflow: hidden;
      background: ${config.background};
    }
    .orb {
      position: absolute;
      border-radius: 999px;
      filter: blur(72px);
      opacity: 0.72;
      pointer-events: none;
    }
    .orb.one {
      width: 180px;
      height: 180px;
      background: ${config.haloOne};
      top: 26px;
      right: -18px;
    }
    .orb.two {
      width: 190px;
      height: 190px;
      background: ${config.haloTwo};
      left: -24px;
      bottom: 12px;
    }
    .window {
      position: absolute;
      inset: 42px 44px 48px;
      border-radius: 34px;
      background: rgba(255,255,255,0.92);
      border: 1px solid rgba(255,255,255,0.88);
      box-shadow: 0 34px 80px -48px rgba(19,38,63,0.32);
      overflow: hidden;
      backdrop-filter: blur(18px);
    }
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      padding: 16px 20px;
      border-bottom: 1px solid rgba(20,61,122,0.08);
      background: rgba(255,255,255,0.76);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 18px;
      font-weight: 900;
      color: #13263f;
      white-space: nowrap;
      flex-direction: row-reverse;
    }
    .brand-dot {
      width: 12px;
      height: 12px;
      border-radius: 999px;
      background: linear-gradient(135deg, #ffb233, #1e63ff);
      box-shadow: 0 0 0 7px rgba(30,99,255,0.08);
    }
    .search {
      flex: 1;
      border-radius: 999px;
      background: #f1f5fb;
      color: #708096;
      padding: 10px 14px;
      font-size: 12px;
      font-weight: 700;
      text-align: right;
      min-width: 180px;
    }
    .section-chip {
      border-radius: 999px;
      padding: 10px 14px;
      background: ${config.badgeBg};
      color: ${config.accent};
      font-size: 11px;
      font-weight: 900;
      white-space: nowrap;
      box-shadow: 0 14px 26px -22px rgba(19,38,63,0.28);
    }
    .body {
      display: grid;
      grid-template-columns: 1fr 0.96fr;
      gap: 14px;
      padding: 16px;
      height: calc(100% - 66px);
    }
    .copy {
      display: flex;
      flex-direction: column;
      gap: 10px;
      text-align: right;
    }
    .eyebrow {
      width: fit-content;
      border-radius: 999px;
      padding: 9px 13px;
      background: ${config.badgeBg};
      color: ${config.accent};
      font-size: 11px;
      font-weight: 900;
    }
    .copy h1 {
      margin: 0;
      font-size: 30px;
      line-height: 1.08;
      letter-spacing: -0.04em;
      max-width: 11ch;
      color: #13263f;
    }
    .copy p {
      margin: 0;
      color: #607084;
      font-size: 13px;
      line-height: 1.7;
      font-weight: 700;
      max-width: 28ch;
    }
    .chips {
      display: flex;
      gap: 7px;
      flex-wrap: wrap;
    }
    .chips span {
      border-radius: 999px;
      background: rgba(255,255,255,0.96);
      border: 1px solid rgba(30,99,255,0.08);
      padding: 7px 10px;
      color: #13263f;
      font-size: 10px;
      font-weight: 800;
      box-shadow: 0 12px 26px -24px rgba(19,38,63,0.32);
    }
    .banner {
      border-radius: 28px;
      background: ${config.bannerBackground};
      color: ${config.bannerText};
      padding: 15px;
      box-shadow: 0 28px 64px -46px rgba(19,38,63,0.44);
      position: relative;
      overflow: hidden;
      margin-top: auto;
    }
    .banner::after {
      content: "";
      position: absolute;
      width: 130px;
      height: 130px;
      border-radius: 999px;
      left: -22px;
      bottom: -28px;
      background: ${config.bannerGlow};
    }
    .banner-badge {
      width: fit-content;
      border-radius: 999px;
      padding: 9px 12px;
      background: ${config.bannerBadgeBackground};
      color: ${config.bannerBadgeColor};
      font-size: 11px;
      font-weight: 900;
      position: relative;
      z-index: 1;
    }
    .banner h2 {
      margin: 10px 0 6px;
      font-size: 21px;
      line-height: 1.2;
      letter-spacing: -0.03em;
      max-width: 12ch;
      position: relative;
      z-index: 1;
    }
    .banner p {
      margin: 0;
      color: ${config.bannerSubtle};
      font-size: 12px;
      line-height: 1.65;
      font-weight: 700;
      max-width: 25ch;
      position: relative;
      z-index: 1;
    }
    .facts {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-top: 10px;
      position: relative;
      z-index: 1;
    }
    .fact {
      border-radius: 20px;
      padding: 10px;
      background: ${config.factBackground};
      border: 1px solid ${config.factBorder};
      min-height: 72px;
    }
    .fact-label {
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.08em;
      color: ${config.factLabelColor};
    }
    .fact-value {
      margin-top: 5px;
      font-size: 12px;
      font-weight: 900;
      line-height: 1.55;
      color: ${config.factValueColor};
    }
    .products {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .product {
      display: grid;
      grid-template-columns: 78px 1fr;
      gap: 12px;
      align-items: start;
      border-radius: 22px;
      background: rgba(255,255,255,0.96);
      border: 1px solid rgba(30,99,255,0.08);
      padding: 12px;
      box-shadow: 0 16px 30px -26px rgba(19,38,63,0.28);
    }
    .thumb {
      min-height: 78px;
      border-radius: 18px;
      padding: 10px;
      display: flex;
      align-items: flex-end;
      background: linear-gradient(145deg, rgba(30,99,255,0.16), rgba(255,255,255,0.92));
    }
    .thumb.gold {
      background: linear-gradient(145deg, rgba(255,186,73,0.42), rgba(255,255,255,0.92));
    }
    .thumb.slate {
      background: linear-gradient(145deg, rgba(148,163,184,0.34), rgba(255,255,255,0.92));
    }
    .thumb.warm {
      background: linear-gradient(145deg, rgba(255,151,73,0.36), rgba(255,255,255,0.92));
    }
    .thumb span {
      border-radius: 999px;
      background: rgba(255,255,255,0.92);
      padding: 7px 9px;
      font-size: 9px;
      font-weight: 900;
      box-shadow: 0 10px 22px -16px rgba(19,38,63,0.26);
    }
    .product h3 {
      margin: 0 0 6px;
      color: #13263f;
      font-size: 15px;
      line-height: 1.65;
    }
    .product p {
      margin: 0;
      color: #6d7a8c;
      font-size: 11px;
      font-weight: 800;
      line-height: 1.65;
    }
    .row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
    }
    .price {
      font-size: 15px;
      font-weight: 900;
      color: #13263f;
    }
    .compare {
      font-size: 11px;
      font-weight: 800;
      color: #7c8898;
      text-decoration: line-through;
    }
    .tag {
      margin-right: auto;
      border-radius: 999px;
      padding: 7px 10px;
      background: ${config.tagBackground};
      color: ${config.accent};
      font-size: 10px;
      font-weight: 900;
    }
    .foot-note {
      border-radius: 20px;
      background: ${config.noteBackground};
      border: 1px solid rgba(30,99,255,0.08);
      padding: 14px 16px;
      box-shadow: 0 16px 30px -26px rgba(19,38,63,0.24);
    }
    .foot-note .small {
      color: #6d7a8c;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.08em;
    }
    .foot-note .strong {
      margin-top: 6px;
      color: #13263f;
      font-size: 14px;
      font-weight: 900;
      line-height: 1.55;
    }
  </style>
</head>
<body>
  <div class="canvas">
    <div class="orb one"></div>
    <div class="orb two"></div>
    <div class="window">
      <div class="topbar">
        <div class="brand"><span class="brand-dot"></span>بيتك اليوم</div>
        <div class="search">${config.searchText}</div>
        <div class="section-chip">${config.navLabel}</div>
      </div>
      <div class="body">
        <div class="copy">
          <div class="eyebrow">${config.eyebrow}</div>
          <h1>${config.title}</h1>
          <p>${config.subtitle}</p>
          <div class="chips">${renderSceneChips(config.chips)}</div>
          <div class="banner">
            <div class="banner-badge">${config.highlight.badge}</div>
            <h2>${config.highlight.title}</h2>
            <p>${config.highlight.subtitle}</p>
            <div class="facts">${renderSceneFacts(config.highlight.facts)}</div>
          </div>
        </div>
        <div class="products">
          ${renderSceneCards(config.cards)}
          <div class="foot-note">
            <div class="small">${config.note.label}</div>
            <div class="strong">${config.note.value}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

const collectionScenes = [
  {
    outputFile: 'daily.png',
    navLabel: 'احتياج يومي',
    eyebrow: 'أساسيات يومية',
    title: 'منتجات البيت التي تدخل السلة بسرعة كل أسبوع',
    subtitle: 'اختيارات عملية بأسعار واضحة وشحن معروف لاحتياجات اليوم العادي.',
    searchText: 'ابحث عن علب التخزين ومنظمات الأدراج وأساسيات المطبخ',
    chips: ['أقل من 299 ج.م', 'شحن خلال 48 ساعة', 'الأكثر طلبًا'],
    background: 'linear-gradient(160deg, #f7fbff 0%, #eef4ff 60%, #fff7ea 100%)',
    haloOne: 'rgba(30,99,255,0.18)',
    haloTwo: 'rgba(255,186,73,0.2)',
    accent: '#1e63ff',
    badgeBg: 'rgba(30,99,255,0.08)',
    bannerBackground: 'linear-gradient(145deg, #13263f, #1b3356 76%)',
    bannerText: '#ffffff',
    bannerSubtle: 'rgba(255,255,255,0.84)',
    bannerGlow: 'rgba(255,255,255,0.08)',
    bannerBadgeBackground: 'rgba(255,255,255,0.14)',
    bannerBadgeColor: '#ffffff',
    factBackground: 'rgba(255,255,255,0.1)',
    factBorder: 'rgba(255,255,255,0.08)',
    factLabelColor: 'rgba(255,255,255,0.74)',
    factValueColor: '#ffffff',
    tagBackground: 'rgba(30,99,255,0.08)',
    noteBackground: 'linear-gradient(135deg, rgba(255,186,73,0.2), rgba(255,255,255,0.98) 56%, rgba(242,247,255,1))',
    highlight: {
      badge: 'ترتيب واضح',
      title: 'طلبات يومية تدخل السلة أسرع',
      subtitle: 'علب تخزين ومنظمات درج وقطع مطبخ مرتبة مثل الرف الحقيقي.',
      facts: [
        { label: 'عرض اليوم', value: 'خصم 22% على باقة التخزين' },
        { label: 'التوصيل', value: 'القاهرة والجيزة خلال 48 ساعة' },
      ],
    },
    cards: [
      { label: 'الأكثر طلبًا', title: 'طقم علب تخزين', meta: '6 قطع للمطبخ والثلاجة', price: '249 ج.م', compare: '319 ج.م', tone: '', tag: 'جاهز' },
      { label: 'اليوم', title: 'منظم أدراج مطبخ', meta: 'تقسيمات مرنة للملاعق والأدوات', price: '139 ج.م', compare: '179 ج.م', tone: 'gold', tag: 'سريع' },
      { label: 'قيمة', title: 'بخاخ زيت زجاجي', meta: 'قطعة عملية للطبخ اليومي', price: '89 ج.م', compare: '', tone: 'slate', tag: 'عملي' },
    ],
    note: {
      label: 'ملخص سريع',
      value: 'قسم يومي يظهر المنتجات العملية التي يشتريها العميل بدون تفكير طويل.',
    },
  },
  {
    outputFile: 'home.png',
    navLabel: 'تنظيم البيت',
    eyebrow: 'البيت والتنظيم',
    title: 'أركان البيت مرتبة كأنك تتجول بين أقسام حقيقية',
    subtitle: 'المطبخ والحمام والمكتب في تقسيمات سهلة للمقارنة واتخاذ القرار.',
    searchText: 'ابحث عن تنظيم المطبخ والحمام والمكتب ومنتجات الترتيب',
    chips: ['المطبخ', 'الحمام', 'المكتب', 'ترتيب سريع'],
    background: 'linear-gradient(160deg, #eef5ff 0%, #e7f0ff 58%, #fffaf0 100%)',
    haloOne: 'rgba(30,99,255,0.24)',
    haloTwo: 'rgba(255,186,73,0.18)',
    accent: '#1e63ff',
    badgeBg: 'rgba(30,99,255,0.08)',
    bannerBackground: 'linear-gradient(145deg, #1e63ff, #2c73ff 78%)',
    bannerText: '#ffffff',
    bannerSubtle: 'rgba(255,255,255,0.86)',
    bannerGlow: 'rgba(255,255,255,0.1)',
    bannerBadgeBackground: 'rgba(255,255,255,0.16)',
    bannerBadgeColor: '#ffffff',
    factBackground: 'rgba(255,255,255,0.12)',
    factBorder: 'rgba(255,255,255,0.1)',
    factLabelColor: 'rgba(255,255,255,0.76)',
    factValueColor: '#ffffff',
    tagBackground: 'rgba(30,99,255,0.08)',
    noteBackground: 'linear-gradient(135deg, rgba(30,99,255,0.08), rgba(255,255,255,0.98) 58%, rgba(255,244,223,0.9))',
    highlight: {
      badge: 'تنظيم أذكى',
      title: 'كل ركن له منتجاته ورسالة شراء واضحة',
      subtitle: 'تقسيم قريب من واقع المتجر: ركن مطبخ، ركن حمام، وركن مكتب.',
      facts: [
        { label: 'ركن المطبخ', value: 'رفوف توابل وعلب وحلول تخزين' },
        { label: 'ركن المكتب', value: 'منظمات مكتب وقطع عملية للعمل من البيت' },
      ],
    },
    cards: [
      { label: 'حمام', title: 'عربة تنظيم حمام', meta: '3 أدوار للأدوات اليومية', price: '299 ج.م', compare: '369 ج.م', tone: '', tag: 'منظم' },
      { label: 'مطبخ', title: 'رف توابل خشبي', meta: 'شكل مرتب وسهل الوصول', price: '159 ج.م', compare: '199 ج.م', tone: 'gold', tag: 'جاهز' },
      { label: 'مكتب', title: 'منظم مكتب خشبي', meta: 'للكتب والأقلام والأوراق', price: '179 ج.م', compare: '', tone: 'slate', tag: 'عملي' },
    ],
    note: {
      label: 'مشهد واقعي',
      value: 'هذه المعاينة توصل فكرة أن المتجر منظم حول الاستخدام اليومي لا حول الشكل فقط.',
    },
  },
  {
    outputFile: 'deals.png',
    navLabel: 'عروض سريعة',
    eyebrow: 'عروض هذا الأسبوع',
    title: 'خصومات واضحة تحفز القرار قبل انتهاء الكمية',
    subtitle: 'الصفقة والسعر السابق والحالي ظاهرين من أول نظرة داخل القسم.',
    searchText: 'ابحث عن العروض اليومية والمنتجات الأقل سعرًا والباقات المجمعة',
    chips: ['خصم حتى 35%', 'صفقات مجمعة', 'حتى نفاد الكمية'],
    background: 'linear-gradient(160deg, #fff7e8 0%, #fff1cf 58%, #fef9ef 100%)',
    haloOne: 'rgba(255,186,73,0.26)',
    haloTwo: 'rgba(30,99,255,0.12)',
    accent: '#8b5a00',
    badgeBg: 'rgba(255,186,73,0.26)',
    bannerBackground: 'linear-gradient(145deg, #ffb233, #ffa11c 78%)',
    bannerText: '#13263f',
    bannerSubtle: 'rgba(19,38,63,0.78)',
    bannerGlow: 'rgba(255,255,255,0.18)',
    bannerBadgeBackground: 'rgba(19,38,63,0.08)',
    bannerBadgeColor: '#13263f',
    factBackground: 'rgba(255,255,255,0.42)',
    factBorder: 'rgba(19,38,63,0.08)',
    factLabelColor: '#805600',
    factValueColor: '#13263f',
    tagBackground: 'rgba(255,186,73,0.26)',
    noteBackground: 'linear-gradient(135deg, rgba(255,186,73,0.24), rgba(255,255,255,0.98) 58%, rgba(245,248,255,1))',
    highlight: {
      badge: 'خصومات الأسبوع',
      title: 'باقات مجمعة وأسعار تشجع على الشراء الآن',
      subtitle: 'خصم ظاهر وسعر سابق واضح ورسالة استعجال مقنعة بدون مبالغة.',
      facts: [
        { label: 'العرض الأقوى', value: 'حتى 35% على باقات التنظيم' },
        { label: 'فئة السعر', value: 'منتجات أقل من 199 ج.م داخل القسم' },
      ],
    },
    cards: [
      { label: 'خصم 26%', title: 'باقة تنظيم مطبخ', meta: '3 قطع أساسية للاستخدام اليومي', price: '199 ج.م', compare: '269 ج.م', tone: 'gold', tag: 'عرض' },
      { label: 'خصم 29%', title: 'صندوقا تخزين', meta: 'قياس متوسط للألعاب والأغراض', price: '149 ج.م', compare: '209 ج.م', tone: '', tag: 'سريع' },
      { label: 'خصم 18%', title: 'ركن الهدايا السريعة', meta: 'منتجات مختارة بسعر مشجع', price: '329 ج.م', compare: '399 ج.م', tone: 'warm', tag: 'محدود' },
    ],
    note: {
      label: 'قوة تجارية',
      value: 'المعاينة توضح أن صفحة العروض تبيع بالفعل ولا تكتفي بإظهار ألوان جذابة فقط.',
    },
  },
  {
    outputFile: 'gifts.png',
    navLabel: 'هدايا جاهزة',
    eyebrow: 'اختيارات للإهداء',
    title: 'هدايا جاهزة برسالة أوضح من أول نظرة',
    subtitle: 'منتجات مناسبة للمناسبات الصغيرة والطلبات السريعة مع إحساس مرتب وموثوق.',
    searchText: 'ابحث عن بوكسات الهدايا والأكواب والشموع والاختيارات الجاهزة',
    chips: ['تغليف جاهز', 'مناسب للمناسبات', 'إهداء سريع'],
    background: 'linear-gradient(160deg, #f4f7ff 0%, #eef3ff 58%, #fff8ef 100%)',
    haloOne: 'rgba(30,99,255,0.14)',
    haloTwo: 'rgba(255,186,73,0.18)',
    accent: '#1e63ff',
    badgeBg: 'rgba(30,99,255,0.08)',
    bannerBackground: 'linear-gradient(145deg, #15213b, #24355a 78%)',
    bannerText: '#ffffff',
    bannerSubtle: 'rgba(255,255,255,0.84)',
    bannerGlow: 'rgba(255,255,255,0.08)',
    bannerBadgeBackground: 'rgba(255,255,255,0.14)',
    bannerBadgeColor: '#ffffff',
    factBackground: 'rgba(255,255,255,0.1)',
    factBorder: 'rgba(255,255,255,0.08)',
    factLabelColor: 'rgba(255,255,255,0.74)',
    factValueColor: '#ffffff',
    tagBackground: 'rgba(30,99,255,0.08)',
    noteBackground: 'linear-gradient(135deg, rgba(30,99,255,0.08), rgba(255,255,255,0.98) 58%, rgba(255,241,220,0.94))',
    highlight: {
      badge: 'جاهز للإهداء',
      title: 'منتجات تتجمع بسهولة في بوكس واحد',
      subtitle: 'أكواب ودفاتر وقطع عطرية مع شعور أن القسم جاهز للبيع المباشر.',
      facts: [
        { label: 'التغليف', value: 'خيار تغليف هدية قبل إتمام الطلب' },
        { label: 'المناسبات', value: 'هدايا بسيطة للعمل والأصدقاء والزيارات' },
      ],
    },
    cards: [
      { label: 'الأكثر طلبًا', title: 'بوكس هدية عملي', meta: 'اختيار جاهز للمناسبات السريعة', price: '329 ج.م', compare: '399 ج.م', tone: '', tag: 'هدية' },
      { label: 'إهداء', title: 'طقم مج قهوة', meta: 'مج مع ملعقة وتغليف أنيق', price: '219 ج.م', compare: '269 ج.م', tone: 'gold', tag: 'جاهز' },
      { label: 'لمسة بسيطة', title: 'شمعة عطرية', meta: 'هدية خفيفة تكمل البوكس', price: '149 ج.م', compare: '', tone: 'slate', tag: 'ناعم' },
    ],
    note: {
      label: 'إحساس المتجر',
      value: 'القسم يبدو كواجهة هدايا فعلية يمكن للعميل أن يتخيل نفسه يشتري منها مباشرة.',
    },
  },
];

const render = async (html, outputFile, viewport) => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({
    path: path.resolve(assetsDir, outputFile),
    fullPage: false,
    type: 'png',
  });
  await browser.close();
};

await render(buildPreviewHtml(), 'preview.png', { width: 1600, height: 980 });
await render(buildHeroHtml(), 'hero.png', { width: 1400, height: 980 });

for (const scene of collectionScenes) {
  await render(buildCollectionSceneHtml(scene), scene.outputFile, { width: 800, height: 600 });
}
