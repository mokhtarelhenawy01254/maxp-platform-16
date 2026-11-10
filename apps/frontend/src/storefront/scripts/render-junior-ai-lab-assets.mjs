import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, "../../..");
const themePath = path.join(frontendRoot, "src/storefront/themes/junior-ai-lab.json");
const theme = JSON.parse(fs.readFileSync(themePath, "utf8"));
const assetsDir = path.join(frontendRoot, "public/assets/themes/junior-ai-lab");
const evidenceDir = path.resolve("H:/_atelier/reports/evidence");
fs.mkdirSync(assetsDir, { recursive: true });
fs.mkdirSync(evidenceDir, { recursive: true });
const findChromiumExecutable = () => {
  const localAppData = process.env.LOCALAPPDATA;
  const managedBrowserDir = localAppData && path.join(localAppData, "ms-playwright");
  const installedBrowsers = managedBrowserDir && fs.existsSync(managedBrowserDir)
    ? fs.readdirSync(managedBrowserDir)
      .filter((name) => name.startsWith("chromium-"))
      .sort((left, right) => Number(right.slice(9)) - Number(left.slice(9)))
      .map((name) => path.join(managedBrowserDir, name, "chrome-win64/chrome.exe"))
    : [];
  const systemBrowsers = [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  ];
  return [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    ...installedBrowsers,
    ...systemBrowsers,
  ].find((candidate) => candidate && fs.existsSync(candidate));
};

const esc = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");
const settings = (page, type) =>
  theme.pages[page]?.sections.find((section) => typeof section !== "string" && section.type === type)?.settings || {};
const sectionTypes = (page) => theme.pages[page]?.sections.map((section) => typeof section === "string" ? section : section.type) || [];
const colors = theme.tokens.colors;
const nav = theme.header.navigation.map((item) => `<a href="${esc(item.to)}">${esc(item.label)}</a>`).join("");

const styles = `
  *{box-sizing:border-box}html{background:#f7f6f1}body{margin:0;color:#182333;background:#f7f6f1;font-family:"Alexandria","IBM Plex Sans Arabic",Tahoma,Arial,sans-serif;direction:rtl;font-variant-numeric:tabular-nums}
  a{color:inherit;text-decoration:none}.shell{max-width:1440px;margin:auto;overflow:hidden;background:#f7f6f1;min-height:100vh}.top{height:82px;padding:0 6.2%;display:flex;align-items:center;justify-content:space-between;gap:24px;background:#fff;border-bottom:1px solid #e5e8eb}.brand{display:flex;align-items:center;gap:12px;font-weight:900;font-size:19px;white-space:nowrap}.mark{width:38px;height:38px;border-radius:12px;background:#12213a;display:grid;place-items:center;color:#9debd2;font-size:12px;letter-spacing:-.04em}.nav{display:flex;gap:28px;color:#596573;font-size:13px;font-weight:700}.tools{display:flex;align-items:center;gap:10px}.search{height:40px;padding:0 14px;border-radius:10px;background:#f2f4f5;color:#7a858e;font-size:12px;display:flex;align-items:center}.cart{padding:11px 15px;border-radius:10px;background:#17283f;color:white;font-size:12px;font-weight:800}.hero{position:relative;isolation:isolate;background:#101f35;color:#fff;padding:66px 7%;display:grid;grid-template-columns:1.05fr .95fr;gap:38px;align-items:center;min-height:500px;overflow:hidden}.hero:before,.hero:after{content:"";position:absolute;border-radius:50%;z-index:-1;pointer-events:none}.hero:before{width:460px;height:460px;left:-190px;top:-220px;border:1px solid rgba(151,238,210,.17);box-shadow:0 0 0 42px rgba(151,238,210,.035),0 0 0 96px rgba(151,238,210,.025)}.hero:after{width:310px;height:310px;right:-100px;bottom:-185px;background:radial-gradient(circle,rgba(117,225,191,.18),transparent 68%)}.hero-copy{max-width:650px}.eyebrow{display:inline-flex;align-items:center;gap:9px;color:#a8ecd6;font-size:12px;font-weight:800;letter-spacing:.02em}.eyebrow:before{content:"";width:7px;height:7px;border-radius:50%;background:#a6edcf}.hero h1{font-size:clamp(34px,4.1vw,58px);line-height:1.34;letter-spacing:-.04em;margin:19px 0 14px;max-width:13ch;text-wrap:balance}.hero p{color:#c3cfda;font-size:16px;line-height:1.9;max-width:49ch;margin:0;text-wrap:pretty}.actions{display:flex;gap:12px;margin-top:26px;flex-wrap:wrap}.btn{display:inline-flex;align-items:center;justify-content:center;min-height:47px;padding:0 20px;border-radius:10px;font-size:13px;font-weight:900;background:#9ce9cf;color:#12213a}.btn.secondary{background:transparent;border:1px solid rgba(255,255,255,.25);color:#fff}.hero-visual{position:relative;min-height:355px;border:1px solid rgba(255,255,255,.14);border-radius:20px;background:linear-gradient(145deg,#1b3049,#13233b 70%);padding:22px;box-shadow:0 30px 80px -50px rgba(0,0,0,.9)}.visual-head{display:flex;justify-content:space-between;align-items:center;color:#a9b9c8;font-size:11px}.dots{display:flex;gap:5px}.dots i{width:6px;height:6px;border-radius:50%;background:#718496}.orbit{height:225px;margin:20px 0 14px;position:relative;display:grid;place-items:center}.orbit:before,.orbit:after{content:"";position:absolute;border:1px solid rgba(156,233,207,.24);border-radius:50%;width:192px;height:192px}.orbit:after{width:126px;height:126px;border-color:rgba(255,190,98,.28)}.core{width:74px;height:74px;border-radius:20px;transform:rotate(45deg);display:grid;place-items:center;background:linear-gradient(145deg,#a1edd3,#70cfae);box-shadow:0 0 46px rgba(122,229,190,.24);color:#102039;font-weight:900}.core span{transform:rotate(-45deg);font-size:14px}.node{position:absolute;padding:9px 12px;border-radius:9px;background:#223953;border:1px solid rgba(255,255,255,.1);font-size:11px;font-weight:800;color:#e6edf2}.node.one{top:12px;right:18px}.node.two{bottom:20px;left:8px}.node.three{bottom:16px;right:0;color:#ffd18c}.visual-foot{display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px solid rgba(255,255,255,.1);font-size:11px;color:#c1cfda}.pill{padding:7px 10px;border-radius:7px;background:rgba(156,233,207,.1);color:#a6ead2;font-weight:800}
  .section{padding:48px 7%}.section-head{display:flex;justify-content:space-between;align-items:end;gap:20px;margin-bottom:22px}.section h2{font-size:26px;line-height:1.4;margin:0;text-wrap:balance}.section-head p{max-width:540px;color:#65717c;font-size:13px;line-height:1.8;margin:8px 0 0}.trust{padding:19px 7%;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;background:#fff;border-bottom:1px solid #e8ebec}.trust div{display:flex;align-items:center;gap:12px;font-size:12px;font-weight:800;color:#374555}.check{display:grid;place-items:center;flex:0 0 26px;height:26px;border-radius:8px;background:#e1f7ee;color:#187b5d;font-size:13px;font-weight:900}.levels{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.level{min-height:184px;padding:20px;border-radius:14px;background:#fff;border:1px solid #e4e8e8;position:relative;overflow:hidden}.level:after{content:"";position:absolute;width:75px;height:75px;border:1px solid #d4e9e1;border-radius:50%;left:-24px;bottom:-27px;box-shadow:0 0 0 12px #f5faf7}.num{color:#237d62;font-size:11px;font-weight:900;letter-spacing:.12em}.level h3{font-size:17px;margin:16px 0 8px}.level p{font-size:12px;line-height:1.8;color:#69747d;margin:0}.projects{display:grid;grid-template-columns:1.15fr .85fr .85fr;gap:13px}.project{min-height:208px;padding:20px;border-radius:15px;background:#182b43;color:#fff;position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end}.project:nth-child(2){background:#e8f3ef;color:#183b34}.project:nth-child(3){background:#f5e9d5;color:#45341d}.project-art{position:absolute;top:18px;left:18px;width:64px;height:64px;border:1px solid currentColor;opacity:.45;border-radius:18px;transform:rotate(12deg)}.project-art:after{content:"";position:absolute;inset:12px;border:1px solid currentColor;border-radius:50%}.project h3{font-size:17px;margin:0 0 7px}.project p{font-size:11px;line-height:1.7;margin:0;opacity:.78}.course-list{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.course{border:1px solid #e1e6e5;border-radius:15px;background:#fff;overflow:hidden}.course-visual{height:142px;background:linear-gradient(135deg,#d8f2e8,#f5f8f5);display:flex;align-items:center;justify-content:center;position:relative}.course-visual:before{content:"";width:66px;height:66px;border:2px solid #2e8a6d;border-radius:15px;transform:rotate(45deg);box-shadow:0 0 0 12px rgba(46,138,109,.08)}.course-visual.gold{background:linear-gradient(135deg,#fff0d6,#faf7f0)}.course-visual.gold:before{border-color:#bd7f1b}.course-visual.blue{background:linear-gradient(135deg,#dce7f2,#f5f7f9)}.course-visual.blue:before{border-color:#395d7f}.course-body{padding:17px}.course-meta{font-size:10px;color:#27765d;font-weight:900}.course h3{font-size:16px;margin:7px 0}.course p{font-size:12px;color:#69747d;line-height:1.7;margin:0 0 14px}.course-link{font-size:12px;color:#167858;font-weight:900}.banner{margin:0 7% 48px;padding:28px 32px;border-radius:16px;background:#17283f;color:#fff;display:flex;align-items:center;justify-content:space-between;gap:20px}.banner h2{font-size:20px;margin:0 0 6px}.banner p{font-size:12px;color:#c4d0da;margin:0;line-height:1.7}.banner .btn{white-space:nowrap}.reviews{background:#eef3f1}.review-card{padding:20px;border-right:3px solid #50a98b;background:#fff;border-radius:0 12px 12px 0;color:#596570;font-size:13px;line-height:1.8}.review-card strong{display:block;color:#1b2e42;margin-bottom:4px}.newsletter{background:#e5f4ed;padding:32px 7%;display:flex;align-items:center;justify-content:space-between;gap:20px}.newsletter h2{font-size:20px;margin:0 0 5px}.newsletter p{margin:0;color:#5c6c68;font-size:12px}.email{display:flex;gap:8px;width:min(410px,100%)}.email span{flex:1;background:#fff;border:1px solid #d5e4dc;border-radius:9px;padding:12px;color:#85918b;font-size:11px}.email b{background:#17283f;color:#fff;border-radius:9px;padding:12px 16px;font-size:11px;white-space:nowrap}.footer{padding:28px 7%;background:#12213a;color:#d5dde4;display:flex;justify-content:space-between;gap:20px;font-size:11px}.footer strong{color:#fff;font-size:13px}.shop-head{padding:45px 7% 28px;background:#13243b;color:#fff}.crumb{font-size:11px;color:#a4b1bf;margin-bottom:12px}.shop-head h1{font-size:34px;margin:0 0 8px}.shop-head p{color:#c5d0db;font-size:13px;margin:0;line-height:1.7}.shop-body{padding:30px 7% 54px;display:grid;grid-template-columns:230px 1fr;gap:24px}.filters{background:#fff;border:1px solid #e3e7e7;border-radius:13px;padding:18px;height:max-content}.filters h3{font-size:15px;margin:0 0 17px}.filter-label{font-size:11px;font-weight:900;color:#53616d;margin:17px 0 9px}.filter-item{padding:10px 0;border-top:1px solid #edf0f0;font-size:12px;color:#69747d}.toolbar{background:#fff;border:1px solid #e3e7e7;border-radius:12px;padding:12px;display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:15px}.toolbar .search{flex:1}.toolbar small{font-size:11px;color:#66727d}.shop-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:13px}.shop-grid .course-visual{height:130px}.pd{padding:34px 7% 56px}.pd-breadcrumb{font-size:11px;color:#7a858d;margin-bottom:18px}.pd-main{display:grid;grid-template-columns:1fr .92fr;gap:34px;align-items:start}.gallery{min-height:480px;border-radius:18px;background:linear-gradient(145deg,#102039,#1c3550);display:grid;place-items:center;position:relative;overflow:hidden}.gallery:before,.gallery:after{content:"";position:absolute;border:1px solid rgba(156,233,207,.2);border-radius:50%;width:320px;height:320px}.gallery:after{width:210px;height:210px;border-color:rgba(255,190,98,.25)}.gallery-card{z-index:1;background:#fff;border-radius:15px;padding:24px;width:58%;min-height:210px;box-shadow:0 25px 60px -32px #000;display:flex;flex-direction:column;justify-content:space-between}.gallery-card .mini{font-size:10px;color:#25775d;font-weight:900}.code-lines{display:grid;gap:9px}.code-lines i{height:8px;border-radius:5px;background:#dbece5}.code-lines i:nth-child(2){width:70%;background:#f2d7a6}.code-lines i:nth-child(3){width:84%}.gallery-stamp{font-size:11px;color:#314255;font-weight:900}.pd-info .eyebrow{color:#278062}.pd-info h1{font-size:32px;line-height:1.4;margin:12px 0;text-wrap:balance}.pd-info>p{font-size:13px;color:#66717b;line-height:1.9}.details{margin:23px 0;border-top:1px solid #e2e7e5;border-bottom:1px solid #e2e7e5}.details div{padding:13px 0;border-bottom:1px solid #e9edeb;font-size:12px;color:#56616d}.details div:last-child{border:0}.details strong{color:#1c2d40}.pd-actions{display:flex;gap:10px;align-items:center}.pd-actions .btn{background:#17283f;color:#fff}.trust-note{margin-top:16px;padding:14px;background:#edf6f1;border-radius:11px;font-size:11px;line-height:1.8;color:#436355}.mobile{display:none}
  @media(max-width:700px){.top{height:66px;padding:0 18px}.brand{font-size:14px}.mark{width:32px;height:32px}.nav{display:none}.search{display:none}.cart{padding:10px 12px}.hero{padding:38px 22px 28px;grid-template-columns:1fr;gap:23px;min-height:unset}.hero h1{font-size:34px;max-width:14ch;margin:15px 0 9px}.hero p{font-size:13px}.hero-visual{min-height:265px;padding:16px}.orbit{height:150px;margin:14px 0 8px}.orbit:before{width:140px;height:140px}.orbit:after{width:94px;height:94px}.core{width:57px;height:57px;border-radius:15px}.node{font-size:9px;padding:7px 9px}.node.one{top:4px;right:0}.node.two{bottom:7px;left:0}.node.three{bottom:5px;right:2px}.visual-foot{font-size:9px}.trust{padding:14px 20px;grid-template-columns:1fr;gap:11px}.trust div{font-size:11px}.section{padding:34px 20px}.section-head{display:block;margin-bottom:17px}.section h2{font-size:21px}.section-head p{font-size:11px}.levels{grid-template-columns:repeat(2,1fr);gap:8px}.level{min-height:150px;padding:14px}.level h3{font-size:14px;margin:12px 0 6px}.level p{font-size:10px}.projects{grid-template-columns:1fr 1fr;gap:8px}.project{min-height:150px;padding:14px}.project:first-child{grid-column:1/-1;min-height:170px}.project h3{font-size:14px}.project p{font-size:10px}.course-list{grid-template-columns:1fr 1fr;gap:8px}.course-visual{height:100px}.course-body{padding:12px}.course h3{font-size:13px}.course p{font-size:10px}.course-meta,.course-link{font-size:9px}.banner{margin:0 20px 30px;padding:20px;display:block}.banner h2{font-size:17px}.banner p{font-size:11px;margin-bottom:14px}.newsletter{padding:24px 20px;display:block}.newsletter h2{font-size:17px}.newsletter p{font-size:11px;margin-bottom:13px}.email{width:100%}.footer{padding:23px 20px;display:block;line-height:1.8}.shop-head{padding:32px 20px 24px}.shop-head h1{font-size:27px}.shop-head p{font-size:11px}.shop-body{padding:20px;display:block}.filters{display:none}.toolbar{padding:9px;margin-bottom:10px}.toolbar .search{display:flex;font-size:10px}.toolbar small{font-size:9px}.shop-grid{grid-template-columns:repeat(2,1fr);gap:8px}.shop-grid .course-visual{height:100px}.shop-grid .course-body{padding:11px}.pd{padding:22px 20px 38px}.pd-main{grid-template-columns:1fr;gap:21px}.gallery{min-height:270px}.gallery:before{width:230px;height:230px}.gallery:after{width:150px;height:150px}.gallery-card{width:62%;min-height:160px;padding:16px}.pd-info h1{font-size:25px}.pd-info>p{font-size:12px}.details div{font-size:11px}.pd-actions{flex-direction:column;align-items:stretch}.pd-actions .btn{width:100%}.mobile{display:block}}
`;

const header = (active) => `<header class="top"><div class="brand"><span class="mark">م ذ</span><span>${esc(theme.header.brandName)}</span></div><nav class="nav">${nav}</nav><div class="tools"><span class="search">ابحث عن مسار تعلّم</span><span class="cart">السلة</span></div></header>`;
const footer = `<footer class="footer"><div><strong>${esc(theme.header.brandName)}</strong><br>${esc(theme.footer.description)}</div><span>مسارات تعليمية واضحة للأسرة</span></footer>`;
const courseCard = (title, meta, tone = "") => `<article class="course"><div class="course-visual ${tone}"></div><div class="course-body"><div class="course-meta">${esc(meta)}</div><h3>${esc(title)}</h3><p>تفاصيل المحتوى والعمر المناسب تظهر في صفحة المسار.</p><a class="course-link" href="/shop">عرض التفاصيل ←</a></div></article>`;

const homeMarkup = () => {
  const hero = settings("home", "hero-banner");
  const badges = settings("home", "trusted-badges");
  const services = settings("home", "services-grid");
  const projects = settings("home", "journal-strip");
  const products = settings("home", "featured-products");
  const countdown = settings("home", "countdown-banner");
  const levels = services.items || [];
  const badgeItems = String(badges.trustedBadgeItems || "").split(",").filter(Boolean);
  const types = sectionTypes("home");
  return `${header("home")}<main>
    <section class="hero"><div class="hero-copy"><span class="eyebrow">${esc(hero.eyebrow)}</span><h1>${esc(hero.title)}</h1><p>${esc(hero.subtitle)}</p><div class="actions"><a class="btn" href="${esc(hero.ctaLink)}">${esc(hero.ctaText)}</a><a class="btn secondary" href="${esc(hero.secondaryCtaLink)}">${esc(hero.secondaryCtaText)}</a></div></div><div class="hero-visual"><div class="visual-head"><span>مسار التعلّم</span><span class="dots"><i></i><i></i><i></i></span></div><div class="orbit"><span class="node one">منطق وبرمجة</span><span class="node two">مشروع تطبيقي</span><span class="node three">فكرة ذكية</span><div class="core"><span>كود</span></div></div><div class="visual-foot"><span>من الفضول إلى مشروع يمكن عرضه</span><span class="pill">٤ مستويات</span></div></div></section>
    ${types.includes("trusted-badges") ? `<section class="trust">${badgeItems.map((item) => `<div><span class="check">✓</span>${esc(item)}</div>`).join("")}</section>` : ""}
    ${types.includes("services-grid") ? `<section class="section"><div class="section-head"><div><h2>${esc(services.title)}</h2><p>${esc(services.subtitle)}</p></div></div><div class="levels">${levels.map((item) => `<article class="level"><span class="num">${esc(item.title.split(" · ")[0])}</span><h3>${esc(item.title.split(" · ").slice(1).join(" · "))}</h3><p>${esc(item.description)}</p></article>`).join("")}</div></section>` : ""}
    ${types.includes("journal-strip") ? `<section class="section" style="padding-top:18px"><div class="section-head"><div><h2>${esc(projects.title)}</h2><p>${esc(projects.subtitle)}</p></div></div><div class="projects"><article class="project"><span class="project-art"></span><h3>لعبة تفاعلية</h3><p>مشروع يطبّق منطق البرمجة خطوة بخطوة.</p></article><article class="project"><span class="project-art"></span><h3>قصة متحركة</h3><p>شخصيات وأحداث ينشئها الطفل بنفسه.</p></article><article class="project"><span class="project-art"></span><h3>فكرة ذكية</h3><p>تجربة مبسطة تعرض طريقة عمل الفكرة.</p></article></div></section>` : ""}
    ${types.includes("featured-products") ? `<section class="section" style="padding-top:18px"><div class="section-head"><div><h2>${esc(products.title)}</h2><p>${esc(products.subtitle)}</p></div></div><div class="course-list">${courseCard("أساسيات التفكير المنطقي", "بداية المسار")}${courseCard("Scratch ومشاريع الألعاب", "برمجة إبداعية", "gold")}${courseCard("Python والذكاء الاصطناعي", "تدرّج متقدم", "blue")}</div></section>` : ""}
    ${types.includes("countdown-banner") ? `<section class="banner"><div><h2>${esc(countdown.title)}</h2><p>${esc(countdown.subtitle)}</p></div><a class="btn" href="${esc(countdown.ctaLink)}">${esc(countdown.ctaText)}</a></section>` : ""}
    ${types.includes("reviews") ? `<section class="section reviews"><div class="section-head"><div><h2>${esc(settings("home", "reviews").title)}</h2><p>تظهر هنا المراجعات المعتمدة من أولياء الأمور.</p></div></div><div class="review-card"><strong>مساحة آراء أولياء الأمور</strong>تُعرض المراجعات الفعلية المرتبطة بمنتجات الأكاديمية.</div></section>` : ""}
    ${types.includes("whatsapp-cta") ? `<section class="section" style="padding-top:24px"><div class="banner" style="margin:0;background:#e5f4ed;color:#183a31"><div><h2>سؤال صغير قبل الاختيار؟</h2><p>اسأل عن العمر والمستوى المناسبين لطفلك.</p></div><a class="btn" href="/contact">${esc(settings("home", "whatsapp-cta").label)}</a></div></section>` : ""}
    ${types.includes("newsletter") ? `<section class="newsletter"><div><h2>${esc(settings("home", "newsletter").title)}</h2><p>${esc(settings("home", "newsletter").subtitle)}</p></div><div class="email"><span>${esc(settings("home", "newsletter").placeholder)}</span><b>${esc(settings("home", "newsletter").buttonText)}</b></div></section>` : ""}
  </main>${footer}`;
};

const shopMarkup = () => {
  const hero = settings("shop", "shop-hero");
  const filter = settings("shop", "filters-sidebar");
  const search = settings("shop", "shop-command-bar");
  return `${header("shop")}<main><section class="shop-head"><div class="crumb">الرئيسية / الكورسات</div><h1>${esc(hero.title)}</h1><p>${esc(hero.subtitle)}</p></section><section class="shop-body"><aside class="filters"><h3>${esc(filter.title)}</h3><div class="filter-label">${esc(filter.categoryLabel)}</div><div class="filter-item">كل المسارات</div><div class="filter-item">المنطق وScratch</div><div class="filter-item">Python والذكاء الاصطناعي</div><div class="filter-label">العمر</div><div class="filter-item">٧–١٠ سنوات</div><div class="filter-item">١١–١٤ سنة</div></aside><div><div class="toolbar"><span class="search">${esc(search.searchPlaceholder)}</span><small>${esc(search.allCategoriesLabel)}</small><small>ترتيب النتائج</small></div><div class="shop-grid">${courseCard("أساسيات التفكير المنطقي", "مبتدئ")}${courseCard("Scratch: لعبة تفاعلية", "مناسب للبداية", "gold")}${courseCard("Python للمبتدئين", "مستوى متوسط", "blue")}${courseCard("مشروع ذكاء اصطناعي", "تطبيق عملي")}${courseCard("روبوتات وبرمجة", "تعلّم بالممارسة", "gold")}${courseCard("المسار المتكامل", "من البداية إلى المشروع", "blue")}</div></div></section></main>${footer}`;
};

const pdpMarkup = () => {
  const info = settings("pdp", "product-info");
  return `${header("pdp")}<main class="pd"><div class="pd-breadcrumb">الرئيسية / الكورسات / تفاصيل المسار</div><div class="pd-main"><section class="gallery"><div class="gallery-card"><span class="mini">مشروع تعلّم تطبيقي</span><div class="code-lines"><i></i><i></i><i></i></div><span class="gallery-stamp">من الفكرة إلى التنفيذ</span></div></section><section class="pd-info"><span class="eyebrow">مسار تعليمي للأطفال</span><h1>منهج عملي يبدأ من مستوى طفلك</h1><p>تعرف على محتوى المسار والعمر المناسب والمشروع الذي يعمل عليه الطفل قبل تأكيد التسجيل.</p><div class="details"><div><strong>العمر المناسب</strong> · يُحدد حسب الكورس</div><div><strong>محتوى المسار</strong> · خطوات ومهارات عملية</div><div><strong>المشروع</strong> · تطبيق ختامي لكل مستوى</div><div><strong>المتابعة</strong> · تقرير أسبوعي لولي الأمر</div></div><div class="pd-actions"><a class="btn" href="/cart">${esc(info.ctaText)}</a></div><div class="trust-note">${esc(info.shippingText)}<br>راجع تفاصيل المستوى والمواعيد مع الأكاديمية قبل التسجيل.</div></section></div></main>${footer}`;
};

const pageHtml = (pageKey) => {
  const content = pageKey === "home" ? homeMarkup() : pageKey === "shop" ? shopMarkup() : pdpMarkup();
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(theme.name)}</title><style>:root{--primary:hsl(${colors.primary});--accent:hsl(${colors.accent});--background:hsl(${colors.background});--foreground:hsl(${colors.foreground})}${styles}</style></head><body><div class="shell">${content}</div></body></html>`;
};

const executablePath = findChromiumExecutable();
const browser = await chromium.launch({
  headless: true,
  ...(executablePath ? { executablePath } : {}),
});
try {
  const previewPage = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  await previewPage.setContent(pageHtml("home"), { waitUntil: "load" });
  await previewPage.screenshot({ path: path.join(assetsDir, "preview.png"), type: "png" });
  const previewBytes = fs.statSync(path.join(assetsDir, "preview.png")).size;
  if (previewBytes > 400 * 1024) throw new Error(`preview.png exceeds 400 KB: ${previewBytes} bytes`);

  for (const pageKey of ["home", "shop", "pdp"]) {
    for (const viewport of [{ width: 1440, height: 1000, label: "1440" }, { width: 390, height: 844, label: "390" }]) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
      const browserErrors = [];
      page.on("console", (message) => {
        if (message.type() === "error") browserErrors.push(message.text());
      });
      page.on("pageerror", (error) => browserErrors.push(error.message));
      await page.setContent(pageHtml(pageKey), { waitUntil: "load" });
      const pageCheck = await page.evaluate(() => ({
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        heading: document.querySelector("main h1")?.textContent?.trim() || "",
      }));
      if (!pageCheck.heading) throw new Error(`${pageKey} did not render its primary heading`);
      if (pageCheck.documentWidth > pageCheck.viewportWidth) {
        throw new Error(`${pageKey} overflows horizontally at ${viewport.width}px (${pageCheck.documentWidth}px)`);
      }
      if (browserErrors.length > 0) {
        throw new Error(`${pageKey} browser errors: ${browserErrors.join("; ")}`);
      }
      await page.screenshot({ path: path.join(evidenceDir, `junior-ai-lab-${pageKey}-${viewport.label}.png`), type: "png" });
      await page.close();
    }
  }
  console.log(JSON.stringify({ themeId: theme.id, preview: path.join(assetsDir, "preview.png"), previewBytes, evidenceDir, screenshots: 6, viewports: [1440, 390], browserChecks: "PASS (headings present, no horizontal overflow, zero console/page errors)" }, null, 2));
} finally {
  await browser.close();
}
