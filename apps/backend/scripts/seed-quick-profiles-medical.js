// Script to create 5 quick profiles on maxp server
const https = require("https");

const BASE = "https://maxp.online";
const EMAIL = "mokhtar2@elhenawy.com";
const PASSWORD = "0165676135";

function apiReq(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const url = new URL(BASE + path);
    const opts = {
      hostname: url.hostname, port: 443, path: url.pathname + url.search,
      method, rejectUnauthorized: false,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) }
    };
    const req = https.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => data += c);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: null, raw: data }); }
      });
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

const PROFILES = [
  {
    slug: "aesthetic-advisor", icon: "💆🏻‍♀️",
    title: "شهد — استشارية تجميل وعناية بالبشرة",
    titleEn: "Shahd - Aesthetic & Skincare Consultant",
    category: "الخدمات الطبية", categoryEn: "Medical Services",
    desc: "شهد بتساعدك في حجز جلسات التجميل والعناية بالبشرة — ليزر، بوتوكس، فيلر، تقشير، وميزوثيرابي",
    descEn: "Book aesthetic and skincare sessions — laser, botox, filler, peels, and mesotherapy",
    templateSlug: "aesthetic-advisor", lucideIcon: "Sparkles",
    roleColor: "medical", channels: ["dashboard", "whatsapp", "messenger"],
    lockIdentity: false, lockPersona: true, lockRules: true, lockCustomPrompt: true,
    personalities: [
      { id: "aesthetic-shahd", name: "استشارية تجميل", desc: "أسلوب راقي وشيك، مهتمة بالتفاصيل", tone: "friendly", persona: "شهد — استشارية تجميل", goal: "مساعدة العملاء في اختيار العلاجات التجميلية المناسبة وتنسيق المواعيد", language: "ar", escalation: "knowledge_ask" }
    ]
  },
  {
    slug: "physio-coordinator", icon: "💪",
    title: "أحمد — منسق العلاج الطبيعي والتأهيل",
    titleEn: "Ahmed - Physiotherapy Coordinator",
    category: "الخدمات الطبية", categoryEn: "Medical Services",
    desc: "أحمد بيساعدك في حجز جلسات العلاج الطبيعي والتأهيل الرياضي",
    descEn: "Book physiotherapy and rehabilitation sessions",
    templateSlug: "physio-coordinator", lucideIcon: "Heart",
    roleColor: "medical", channels: ["dashboard", "whatsapp", "messenger"],
    lockIdentity: false, lockPersona: true, lockRules: true, lockCustomPrompt: true,
    personalities: [
      { id: "physio-ahmed", name: "منسق علاج طبيعي", desc: "أسلوب حيوي ومحفز، يشجع على التعافي", tone: "friendly", persona: "أحمد — منسق العلاج الطبيعي", goal: "مساعدة المرضى في حجز جلسات العلاج الطبيعي والتأهيل ومتابعة برامجهم العلاجية", language: "ar", escalation: "knowledge_ask" }
    ]
  },
  {
    slug: "dental-care-specialist", icon: "🦷",
    title: "مروة — منسقة حجوزات الأسنان",
    titleEn: "Marwa - Dental Care Specialist",
    category: "الخدمات الطبية", categoryEn: "Medical Services",
    desc: "مروة بتساعدك في حجز كشوفات الأسنان — تقويم، زرع، ابتسامة هوليود، وحشو عصب",
    descEn: "Book dental appointments — orthodontics, implants, Hollywood smile, fillings",
    templateSlug: "dental-care-specialist", lucideIcon: "Smile",
    roleColor: "medical", channels: ["dashboard", "whatsapp", "messenger"],
    lockIdentity: false, lockPersona: true, lockRules: true, lockCustomPrompt: true,
    personalities: [
      { id: "dental-marwa", name: "منسقة أسنان", desc: "أسلوب رايق ومطمن، تخفف التوتر", tone: "friendly", persona: "مروة — منسقة حجوزات الأسنان", goal: "مساعدة المرضى في حجز مواعيد الأسنان وتنسيق العلاجات التجميلية والعلاجية", language: "ar", escalation: "knowledge_ask" }
    ]
  },
  {
    slug: "medical-lab-analyst", icon: "🧪",
    title: "كريم — مستشار التحاليل الطبية",
    titleEn: "Karim - Medical Lab Analyst",
    category: "الخدمات الطبية", categoryEn: "Medical Services",
    desc: "كريم بيساعدك في حجز التحاليل الطبية والاستعلام عنها — سكر، دهون، فيتامينات، هرمونات",
    descEn: "Book lab tests and inquiries — blood sugar, lipids, vitamins, hormones",
    templateSlug: "medical-lab-analyst", lucideIcon: "FlaskConical",
    roleColor: "medical", channels: ["dashboard", "whatsapp", "messenger"],
    lockIdentity: false, lockPersona: true, lockRules: true, lockCustomPrompt: true,
    personalities: [
      { id: "lab-karim", name: "مستشار تحاليل", desc: "أسلوب مهني ودقيق، واضح ومباشر", tone: "professional", persona: "كريم — مستشار التحاليل الطبية", goal: "مساعدة المرضى في حجز التحاليل وشرح تعليمات التجهيز والاستعداد", language: "ar", escalation: "knowledge_ask" }
    ]
  },
  {
    slug: "mental-health-counselor", icon: "🧠",
    title: "يارا — منسقة الدعم النفسي",
    titleEn: "Yara - Mental Health Counselor",
    category: "الخدمات الطبية", categoryEn: "Medical Services",
    desc: "يارا بتساعدك في حجز جلسات الدعم النفسي والاستشارات — فردي، زواج، أطفال، أونلاين",
    descEn: "Book mental health and counseling sessions — individual, couples, children, online",
    templateSlug: "mental-health-counselor", lucideIcon: "Brain",
    roleColor: "medical", channels: ["dashboard", "whatsapp", "messenger"],
    lockIdentity: false, lockPersona: true, lockRules: true, lockCustomPrompt: true,
    personalities: [
      { id: "mental-yara", name: "منسقة دعم نفسي", desc: "أسلوب دافئ ومتفهم، تحترم الخصوصية", tone: "friendly", persona: "يارا — منسقة الدعم النفسي", goal: "مساعدة العملاء في حجز جلسات الدعم النفسي واختيار نوع الاستشارة المناسب", language: "ar", escalation: "escalate_human" }
    ]
  }
];

async function main() {
  // Login
  console.log("Logging in...");
  const login = await apiReq("POST", "/api/v1/auth/login", { email: EMAIL, password: PASSWORD });
  const token = login.body?.data?.token;
  if (!token) { console.error("Login failed:", login.body); process.exit(1); }
  console.log("Token OK\n");

  for (const profile of PROFILES) {
    process.stdout.write(profile.slug + " (" + profile.title + ")... ");
    const result = await apiReq("POST", "/api/v1/super-admin/agents/quick-profiles", profile, token);
    if (result.status === 201) {
      console.log("CREATED ✅");
    } else if (result.status === 409) {
      console.log("EXISTS - updating...");
      const update = await apiReq("PUT", "/api/v1/super-admin/agents/quick-profiles/" + profile.slug, profile, token);
      console.log(update.status < 400 ? "  UPDATED ✅" : "  FAILED ❌");
    } else {
      console.log("FAILED (" + result.status + "):", JSON.stringify(result.body));
    }
  }

  // Verify
  console.log("\nVerifying...");
  const list = await apiReq("GET", "/api/v1/super-admin/agents/quick-profiles", null, token);
  const profiles = list.body?.profiles || [];
  for (const p of profiles) {
    const pers = p.personalities || [];
    console.log("  " + p.icon + " " + p.slug + " — " + (pers.length + " personality(ies)"));
  }
  console.log("\nTotal: " + profiles.length + " profiles");
}

main().catch(console.error);
