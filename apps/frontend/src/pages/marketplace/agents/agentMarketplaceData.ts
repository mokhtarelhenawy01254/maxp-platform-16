/**
 * agentMarketplaceData.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Comprehensive Data Repository for the 2026 MaxP Digital Workforce Marketplace.
 * Maps authentic backend agents to rich executive dossiers, pricing tiers,
 * real API capabilities, and live telemetry benchmarks.
 * 
 * Strict 2026 Anti-AI-Slop compliance:
 * - Zero Emojis (pure typographic & vector icon representations)
 * - Hard telemetry (P95 latency, model architectures, authentic API signatures)
 * - Precise unit economics (Free Core vs Pro Specialist pricing)
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type AgentTier = "free" | "pro";

export type AgentCategory = 
  | "all"
  | "marketing"
  | "sales"
  | "operations"
  | "healthcare"
  | "executive";

export interface AgentTelemetry {
  engine: string;
  fallbackEngine: string;
  p95Latency: string;
  taskPrecision: string;
  governance: "human_in_loop" | "autonomous_loop";
  contextWindow: string;
}

export interface AgentDossier {
  bio: string;
  persona: string;
  dialect: string;
  boundaries: string[];
  executionStream: Array<{
    step: string;
    action: string;
    type: "thought" | "tool" | "output";
  }>;
}

export interface AgentListing {
  id: string;
  slug: string;
  name: string;
  position: string;
  category: AgentCategory;
  tier: AgentTier;
  priceMonthly?: number;
  currency?: string;
  featured?: boolean;
  avatarUrl: string;
  summary: string;
  tools: string[];
  skills: string[];
  telemetry: AgentTelemetry;
  dossier: AgentDossier;
}

export const AGENT_CATEGORIES: Array<{ id: AgentCategory; label: string; count?: number }> = [
  { id: "all", label: "جميع الكوادر الرقمية" },
  { id: "marketing", label: "التسويق وإعلانات Meta" },
  { id: "sales", label: "المبيعات وواتساب" },
  { id: "operations", label: "العمليات والمخزون والشحن" },
  { id: "healthcare", label: "العيادات والقطاع الطبي" },
  { id: "executive", label: "الإدارة والرادار التنافسي" },
];

export const AGENT_LISTINGS: AgentListing[] = [
  // ── 1. Facebook Media Buyer (PRO) ──────────────────────────
  {
    id: "agent_fb_media_buyer",
    slug: "facebook-media-buyer-agent",
    name: "كريم المنصور",
    position: "مدير استراتيجيات الإعلانات الممولة والأداء (Performance Marketer)",
    category: "marketing",
    tier: "pro",
    priceMonthly: 490,
    currency: "ج.م",
    featured: true,
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    summary: "تحليل هوامش الربح للمنتجات، توليد 3 زوايا إعلانية نفسية، إعداد مسودات حملات Meta ونشرها بحالة آمنة ومراقبة ROAS.",
    tools: [
      "Meta Graph API v21",
      "facebook_ad.create_full_draft",
      "orders.campaign_attribution_report",
      "facebook_ad.get_decision",
      "competitor.get_ads",
    ],
    skills: ["catalog-search", "facebook-ad-draft", "campaign-attribution"],
    telemetry: {
      engine: "DeepSeek-V3",
      fallbackEngine: "Llama 3.3 70B",
      p95Latency: "0.78s",
      taskPrecision: "99.4%",
      governance: "human_in_loop",
      contextWindow: "128k Tokens",
    },
    dossier: {
      bio: "خبير ميديا باير رقمي مدرب على أكثر من 14,000 حملة إعلانية مباشرة بنظام Direct-Response. لا ينفق أي مليم من الميزانية دون اعتماد صريح.",
      persona: "تحليلي، صارم، يركز على العائد على الإنفاق (ROAS) وتكلفة الشراء (CPA) بدقة محاسبية.",
      dialect: "العربية المصرية البيعية مع مصطلحات التسويق الرقمي المعيارية.",
      boundaries: [
        "لا يقوم بتفعيل أي حملة مباشرة بنظام Live Spending إلا بعد اعتماد مسودة الإعلان من التاجر.",
        "ينشر الإعلانات بحالة PAUSED تلقائياً لضمان مراجعة أرقام الميزانية قبل الصرف.",
        "يسجل كل توجيه أو قاعدة جديدة في كتيب المتجر الرقمي (Hermes Playbook).",
      ],
      executionStream: [
        { step: "01: فحص المنتج", action: "facebook_ad.analyze_product(sku='OVER-TSHIRT-01')", type: "tool" },
        { step: "02: استخلاص الهامش", action: "حساب Break-even ROAS = 1.65x و Target CPA = 85 ج.م", type: "thought" },
        { step: "03: صياغة الزوايا", action: "توليد 3 زوايا: زاوية المشكلة والحل، زاوية العرض السريع، وزاوية الدليل الاجتماعي", type: "thought" },
        { step: "04: تجهيز المسودة", action: "facebook_ad.create_full_draft(campaign_objective='OUTCOME_SALES', status='PAUSED')", type: "tool" },
        { step: "05: التقرير النهائي", action: "تم إنشاء الحملة بنجاح مع كود التتبع UTM Attribution جاهزة للمراجعة.", type: "output" },
      ],
    },
  },

  // ── 2. Order Confirmation Agent (FREE) ─────────────────────
  {
    id: "agent_order_confirm",
    slug: "order-confirmation-agent",
    name: "سارة عبد الرحمن",
    position: "مسؤولة تأكيد الطلبات ومتابعة الشحن عبر واتساب (Fulfillment Specialist)",
    category: "operations",
    tier: "free",
    featured: true,
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
    summary: "مراجعة الطلبات الجديدة، التحقق من دقة العنوان ورقم الهاتف، مراسلة العميل عبر واتساب، وتمرير الشحنات لشركات الشحن المعتمدة.",
    tools: [
      "orders.fetch_pending",
      "whatsapp.send_confirmation_template",
      "shipping.turbo_create_waybill",
      "address.validate_egypt",
    ],
    skills: ["whatsapp-dispatch", "order-routing", "shipping-integration"],
    telemetry: {
      engine: "Flash 2.5",
      fallbackEngine: "DeepSeek-V3",
      p95Latency: "0.42s",
      taskPrecision: "99.8%",
      governance: "autonomous_loop",
      contextWindow: "64k Tokens",
    },
    dossier: {
      bio: "وكيل عمليات متخصص في تقليل نسب المرتجعات (RTO). تتواصل مع العملاء خلال 3 دقائق من إنشاء الطلب لتأكيد المقاسات وتفاصيل التوصيل.",
      persona: "مهذبة، ودودة، سريعة البديهة، وتتعامل باحترافية مع استفسارات التوصيل ومواعيد الاستلام.",
      dialect: "العامية المصرية الودودة المناسبة لخدمة العملاء على مدار الساعة.",
      boundaries: [
        "لا تلغي أي طلب مدفوع مسبقاً إلكترونياً دون موافقة مدير العمليات.",
        "ترسل إشعارات فورية عند وجود أرقام هواتف غير مطابقة أو مكررة في القائمة السوداء.",
      ],
      executionStream: [
        { step: "01: رصد الطلب", action: "orders.fetch_pending(order_id='#38125')", type: "tool" },
        { step: "02: التحقق من الهاتف", action: "فحص الرقم المصري 010xxxxxxxx والتأكد من توافر حساب واتساب", type: "thought" },
        { step: "03: إرسال التأكيد", action: "whatsapp.send_template(template='order_confirm_v2')", type: "tool" },
        { step: "04: معالجة الرد", action: "العميل أكد بالضغط على زر «تأكيد الطلب»، تحديث الحالة إلى 'CONFIRMED'", type: "thought" },
        { step: "05: إنشاء بوليصة الشحن", action: "shipping.turbo_create_waybill(tracking_code='TRB-98321')", type: "tool" },
      ],
    },
  },

  // ── 3. Sales Representative Agent (PRO) ────────────────────
  {
    id: "agent_sales_rep",
    slug: "sales-rep-agent",
    name: "أحمد الشريف",
    position: "مستشار المبيعات وإتمام الصفقات على واتساب وفيسبوك (Deal Closer)",
    category: "sales",
    tier: "pro",
    priceMonthly: 390,
    currency: "ج.م",
    featured: true,
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    summary: "إدارة المحادثات البيعية المعقدة، الرد على اعتراضات العملاء، اقتراح عروض الباقات والـ Upselling، وإصدار روابط الدفع الفورية.",
    tools: [
      "product.search_smart",
      "inventory.check_stock",
      "offers.calculate_bundle",
      "checkout.generate_quick_order_link",
    ],
    skills: ["objection-handling", "bundle-pricing", "conversational-commerce"],
    telemetry: {
      engine: "DeepSeek-V3",
      fallbackEngine: "Llama 3.3 70B",
      p95Latency: "0.65s",
      taskPrecision: "98.9%",
      governance: "autonomous_loop",
      contextWindow: "128k Tokens",
    },
    dossier: {
      bio: "بائع محترف يجيد هندسة العروض المجمعة (Bundles) ومضاعفة متوسط قيمة الطلب (AOV) بنسبة تتجاوز 35% عبر الشات.",
      persona: "مقنع، استشاري، لا يضغط على العميل بأسلوب منفر بل يقدم حلولاً وقيمة حقيقية للمنتج.",
      dialect: "لهجة بيعية ذكية ومرنة تتكيف مع أسلوب كل عميل.",
      boundaries: [
        "يلتزم بحدود الأسعار والخصومات المعتمدة في سياسة المتجر ولا يتجاوز كود الخصم الأقصى.",
        "يحول المحادثة للدعم البشري فوراً عند طلب العميل التحدث مع موظف حقيقي.",
      ],
      executionStream: [
        { step: "01: استقبال الاستفسار", action: "العميل يسأل: 'هل في خصم لو أخذت قطعتين؟'", type: "thought" },
        { step: "02: فحص المخزون", action: "inventory.check_stock(item_id='HOODIE-BLK')", type: "tool" },
        { step: "03: حساب عرض الباقة", action: "offers.calculate_bundle(qty=2, discount_rate=0.15)", type: "thought" },
        { step: "04: إنشاء رابط الشراء", action: "checkout.generate_quick_order_link(items=['HOODIE-BLK', 'HOODIE-GRY'])", type: "tool" },
        { step: "05: الرد البيعي", action: "صياغة الرد مع رابط الخصم وشحن مجاني خلال 48 ساعة فقط.", type: "output" },
      ],
    },
  },

  // ── 4. Dental Care Specialist (PRO) ────────────────────────
  {
    id: "agent_dental_care",
    slug: "dental-care-specialist",
    name: "د. طارق الحكيم",
    position: "منسق استشارات عيادات ومعامل الأسنان (Clinical Dental Coordinator)",
    category: "healthcare",
    tier: "pro",
    priceMonthly: 590,
    currency: "ج.م",
    featured: false,
    avatarUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80",
    summary: "تنسيق حالات التركيبات وزراعة الأسنان، مطابقة أوامر الشغل مع المعمل، ومتابعة سجلات المرضى والمواعيد الطبية.",
    tools: [
      "dental_lab.fetch_case",
      "dental_lab.update_stage",
      "appointments.check_availability",
      "clinical.log_patient_notes",
    ],
    skills: ["dental-prosthetics-workflow", "case-scheduling", "doctor-portal-sync"],
    telemetry: {
      engine: "DeepSeek-V3",
      fallbackEngine: "Flash 2.5",
      p95Latency: "0.82s",
      taskPrecision: "99.9%",
      governance: "human_in_loop",
      contextWindow: "128k Tokens",
    },
    dossier: {
      bio: "منسق إكلينيكي متخصص لمعامل وعيادات الأسنان، مدرب على تصنيفات الـ Zirconia و E-max ومتابعة أوامر التشغيل والـ CAD/CAM.",
      persona: "دقيق، طبي، بروتوكولي، يحترم الخصوصية الطبية ومواعيد تسليم الحالات العاجلة.",
      dialect: "لغة طبية وإدارية رصينة ومحترفة.",
      boundaries: [
        "لا يقدم أي استشارة تشخيصية نهائية بدلاً من الطبيب المعالج.",
        "يلتزم بمعايير بروتوكول HIPAA وخصوصية البيانات الطبية للمرضى.",
      ],
      executionStream: [
        { step: "01: رصد حالة جديدة", action: "dental_lab.fetch_case(case_id='DL-2026-894')", type: "tool" },
        { step: "02: تدقيق نوع الشغل", action: "فحص المتطلبات: 4 وحدات Zirconia مع تظليل A2 ودليل ألوان VITA", type: "thought" },
        { step: "03: تعيين الفني", action: "dental_lab.assign_technician(dept='CAD_CAM', tech_id='TECH-04')", type: "tool" },
        { step: "04: إشعار الطبيب", action: "إرسال تأكيد موعد التسليم لطبيب العيادة خلال 72 ساعة", type: "output" },
      ],
    },
  },

  // ── 5. Competitor Analysis Agent (PRO) ─────────────────────
  {
    id: "agent_competitor_analysis",
    slug: "competitor-analysis",
    name: "زياد رادار",
    position: "محلل استخبارات السوق والحملات التنافسية (Market Intelligence Specialist)",
    category: "executive",
    tier: "pro",
    priceMonthly: 450,
    currency: "ج.م",
    featured: false,
    avatarUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80",
    summary: "مراقبة إعلانات المنافسين النشطة على Meta Ad Library، تحليل استراتيجيات التسعير، ورصد الزوايا الإعلانية الصاعدة.",
    tools: [
      "competitor.get_ads",
      "market.price_benchmark",
      "trends.detect_hooks",
      "analytics.export_brief",
    ],
    skills: ["ad-library-intelligence", "pricing-radar", "creative-benchmarking"],
    telemetry: {
      engine: "DeepSeek-V3",
      fallbackEngine: "Llama 3.3 70B",
      p95Latency: "1.05s",
      taskPrecision: "98.5%",
      governance: "autonomous_loop",
      contextWindow: "128k Tokens",
    },
    dossier: {
      bio: "رادار يقظ لفحص السوق ومكتبة إعلانات فيسبوك وتحليل إعلانات المنافسين الأكثر تشغيلاً وحساب فجوات التسعير لصالح متجرك.",
      persona: "استراتيجي، تحليلي، يقدم تقارير مقتضبة مركزة على الفرص القابلة للاستغلال فوراً.",
      dialect: "عربية فصحى تحليلية موجزة مدعومة بجداول المقارنات.",
      boundaries: [
        "يعتمد على مصادر البيانات العلنية ومكتبة إعلانات ميتا الرسمية فقط.",
        "لا ينسخ إعلانات المنافسين حرفياً بل يستخرج الهيكل النفسي (Framework) لتطوير زاوية أصلية خاصة بك.",
      ],
      executionStream: [
        { step: "01: رصد المنافسين", action: "competitor.get_ads(domain='competitor-store.com')", type: "tool" },
        { step: "02: تصنيف الإعلانات", action: "تحليل 14 إعلاناً نشطاً وتحديد أطول إعلان مستمر تشغيلياً لأكثر من 30 يوماً", type: "thought" },
        { step: "03: تحليل الزاوية", action: "الزاوية الأساسية: التركيز على ضمان الاستبدال الفوري المجاني", type: "thought" },
        { step: "04: صياغة التوصية", action: "تجهيز خطة تفوق تسعيري وتصميم هوك معاكس للميديا باير", type: "output" },
      ],
    },
  },

  // ── 6. Inventory & Pricing Agent (FREE) ───────────────────
  {
    id: "agent_inventory_pricing",
    slug: "inventory-pricing-agent",
    name: "عمر المخزنجي",
    position: "مراقب حركة المخزون وهوامش الأرباح (Stock & Pricing Auditor)",
    category: "operations",
    tier: "free",
    featured: false,
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    summary: "تتبع نواقص المنتجات، إرسال تنبيهات حد إعادة الطلب، فحص تكلفة السلع (COGS)، واقتراح تعديلات الأسعار وفق العرض والطلب.",
    tools: [
      "inventory.check_stock",
      "inventory.calculate_reorder_point",
      "products.update_price_policy",
      "suppliers.suggest_po",
    ],
    skills: ["stock-monitoring", "cogs-auditing", "low-stock-alerts"],
    telemetry: {
      engine: "Flash 2.5",
      fallbackEngine: "DeepSeek-V3",
      p95Latency: "0.38s",
      taskPrecision: "99.9%",
      governance: "human_in_loop",
      contextWindow: "64k Tokens",
    },
    dossier: {
      bio: "مدير مخازن رقمي يضمن عدم نفاد المنتجات الأكثر مبيعاً من الرفوف وتجنب تجميد السيولة في أصناف بطيئة الحركة.",
      persona: "منظم، عملي، يعتمد على البيانات الرقمية وجداول الجرد اللحظية.",
      dialect: "عربية مهنية واضحة ومقتضبة.",
      boundaries: [
        "لا يغير أسعار المنتجات في المتجر دون تأكيد يدوي من صاحب الشركة.",
        "ينبه التاجر قبل نفاد أي منتج رئيسي بـ 7 أيام بناءً على معدل الحرق اليومي (Run Rate).",
      ],
      executionStream: [
        { step: "01: فحص المخزون", action: "inventory.check_stock(threshold=15)", type: "tool" },
        { step: "02: تحليل سرعة البيع", action: "معدل البيع: 18 قطعة/يوم، الرصيد المتبقي يكفي 48 ساعة فقط", type: "thought" },
        { step: "03: إطلاق الإنذار", action: "إشعار التاجر بضرورة إصدار أمر شراء عاجل لـ 200 قطعة", type: "output" },
      ],
    },
  },

  // ── 7. Manager CEO Agent (PRO) ─────────────────────────────
  {
    id: "agent_manager_ceo",
    slug: "manager-ceo",
    name: "رائد التنفيذي",
    position: "المدير التنفيذي لتنسيق الكوادر وتوزيع الأهداف (Autonomous Chief Operating Officer)",
    category: "executive",
    tier: "pro",
    priceMonthly: 690,
    currency: "ج.م",
    featured: true,
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80",
    summary: "المنسق العام لمنظومة الوكلاء: يحلل أهداف الشركة الكبرى، يجزئها لمهام تنفيذية، ويفوضها للوكيل المناسب مع مراقبة الإنجاز.",
    tools: [
      "agent.delegate_task",
      "agent.inspect_inbox",
      "kpi.calculate_company_health",
      "reports.generate_executive_brief",
    ],
    skills: ["orchestration-dag", "objective-decomposition", "cross-agent-handoff"],
    telemetry: {
      engine: "DeepSeek-V3",
      fallbackEngine: "Llama 3.3 70B",
      p95Latency: "0.92s",
      taskPrecision: "99.1%",
      governance: "autonomous_loop",
      contextWindow: "128k Tokens",
    },
    dossier: {
      bio: "المايسترو القيادي لفريق العمل الرقمي، مستوحى من معمارية Paperclip و Microsoft Agent Framework لتوجيه الوكلاء وحل التعارضات.",
      persona: "قيادي، حكيم، يرى الصورة الشاملة ويربط بين المبيعات، المخزون، والإعلانات.",
      dialect: "لغة إدارية تنفيذية استراتيجية رفيعة المستوى.",
      boundaries: [
        "يقدم تقريراً تنفيذياً صباحياً ومسائياً يلخص مؤشرات الأداء الحيوية للشركة.",
        "يحترم استقلالية كل وكيل ولا يتدخل إلا عند وجود اختناق تشغيلي أو تعارض في الموارد.",
      ],
      executionStream: [
        { step: "01: استلام الهدف", action: "الهدف: 'زيادة مبيعات التيشرتات الصيفية بنسبة 25% هذا الأسبوع'", type: "thought" },
        { step: "02: تفويض المخزون", action: "agent.delegate(to='inventory-pricing-agent', task='تأكيد كفاية الخامات')", type: "tool" },
        { step: "03: تفويض الميديا باير", action: "agent.delegate(to='facebook-media-buyer-agent', task='تجهيز حملة عروض ثلاثية')", type: "tool" },
        { step: "04: تفويض خدمة العملاء", action: "agent.delegate(to='sales-rep-agent', task='تجهيز ردود عروض الشراء السريع')", type: "tool" },
        { step: "05: التقرير القيادي", action: "تم تشغيل الخطة المشتركة ومزامنة جميع الأطراف بنجاح.", type: "output" },
      ],
    },
  },

  // ── 8. Facebook Sales Support Agent (FREE) ─────────────────
  {
    id: "agent_fb_sales_support",
    slug: "facebook-sales-support-agent",
    name: "نوران فهمي",
    position: "أخصائية الرد السريع على تعليقات ورسائل فيسبوك (Social Support Lead)",
    category: "sales",
    tier: "free",
    featured: false,
    avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80",
    summary: "الرد الفوري على تعليقات منشورات فيسبوك في أقل من 30 ثانية، توجيه العملاء إلى الخاص، وإرسال تفاصيل الأسعار وروابط الطلب.",
    tools: [
      "facebook.reply_comment",
      "facebook.send_private_message",
      "product.get_quick_specs",
    ],
    skills: ["instant-comment-reply", "inbox-redirection", "lead-capture"],
    telemetry: {
      engine: "Flash 2.5",
      fallbackEngine: "DeepSeek-V3",
      p95Latency: "0.35s",
      taskPrecision: "99.6%",
      governance: "autonomous_loop",
      contextWindow: "64k Tokens",
    },
    dossier: {
      bio: "متخصصة في خطف العملاء المهتمين من التعليقات وتحويلهم لمحادثات خاصة تؤدي لعمليات شراء حقيقية قبل أن يشتري من منافس آخر.",
      persona: "سريعة الاستجابة، لطيفة، مركزة على تحويل التفاعل إلى فرصة بيعية حقيقية.",
      dialect: "عامية مصرية خفيفة واجتماعية متناغمة مع جمهور السوشيال ميديا.",
      boundaries: [
        "تخفي التعليقات المسيئة أو محاولات الاحتيال تلقائياً لحماية الصفحة.",
        "لا تكشف أسعار الجملة للجمهور العام في التعليقات المفتوحة.",
      ],
      executionStream: [
        { step: "01: التقاط التعليق", action: "عميل يعلق: 'بكام الشحن للمنصورة والتوصيل بياخد كام يوم؟'", type: "thought" },
        { step: "02: الرد العام", action: "facebook.reply_comment(text='أهلاً بك! تم إرسال كل التفاصيل ومصاريف الشحن في الخاص')", type: "tool" },
        { step: "03: المراسلة بالخاص", action: "facebook.send_private_message(text='الشحن للمنصورة 35 ج.م ويوصلك خلال 48 ساعة...')", type: "tool" },
      ],
    },
  },

  // ── 9. Store Manager Agent (PRO) ───────────────────────────
  {
    id: "agent_store_manager",
    slug: "store-manager-agent",
    name: "كريم عبد العال",
    position: "مدير تشغيل المتجر — الكتالوج والطلبات وأدوات التحويل وطرق الدفع (Store Operations Manager)",
    category: "operations",
    tier: "pro",
    priceMonthly: 590,
    currency: "ج.م",
    featured: true,
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    summary: "إدارة شاملة للمتجر من المحادثة: تشغيل وإيقاف أدوات رفع التحويل الـ 22، تكوين طرق الدفع والعربون، الكتالوج والمخزون، الطلبات والشحن، والعروض والخصومات.",
    tools: [
      "conversion_tool_toggle",
      "payment_methods_configure",
      "product_create",
      "order_recent_list",
      "inventory_adjust",
    ],
    skills: ["storefront-management", "read-before-write", "catalog-operations"],
    telemetry: {
      engine: "DeepSeek-V4 Flash",
      fallbackEngine: "Llama 3.3 70B",
      p95Latency: "0.85s",
      taskPrecision: "99.2%",
      governance: "human_in_loop",
      contextWindow: "128k Tokens",
    },
    dossier: {
      bio: "مدير تشغيل خبرته 10 سنوات في متاجر إلكترونية مصرية. فلسفته: يعرض الحالة الحالية بالأرقام قبل أي تغيير، ولا ينفذ قرارًا حساسًا إلا بموافقة صريحة من صاحب المتجر.",
      persona: "عملي، دافئ، سريع الإنجاز — يجيب بالأرقام والعملة، ويقترح الخطوة التالية الأعلى أثرًا.",
      dialect: "العربية المصرية المهنية الراقية.",
      boundaries: [
        "يقرأ حالة أي أداة (تحويل أو دفع) ويعرضها على التاجر قبل تفعيلها أو تعديلها.",
        "لا يعدل طرق الدفع أو المخزون أو الطلبات الحساسة إلا بعد موافقة صريحة داخل المحادثة.",
        "مفاتيح بوابات الدفع تُسجل يدويًا من الإعدادات فقط — هو يفعلها ويتحقق منها ولا يراها أبدًا.",
      ],
      executionStream: [
        { step: "01: قراءة الحالة", action: "conversion_tools_read() → شريط الشحن المجاني متوقف، الحد الحالي 750 ج.م", type: "tool" },
        { step: "02: عرض التوصية", action: "شريط الشحن المجاني متوقف رغم إن متوسط السلة 820 ج.م — تفعيله هيرفع قيمة السلة", type: "thought" },
        { step: "03: التنفيذ بموافقة", action: "conversion_tool_toggle(tool_key='freeShippingBar', enable=true)", type: "tool" },
        { step: "04: التأكيد", action: "تمام يا فندم، الشريط بقى شغال على كل المنتجات والتاجر هيشوفه أول ما يدخل.", type: "output" },
      ],
    },
  },
];

/**
 * Extract elegant 2-letter Arabic monogram initials from a name.
 * e.g. "كريم المنصور" -> "كم"
 *      "سارة عبد الرحمن" -> "سع"
 *      "د. منى الشناوي" -> "مش"
 */
export function getArabicInitials(name: string): string {
  if (!name) return "وك";
  // Strip honorifics: د. / م. / أ. / دكتور / مهندس / أستاذ
  const cleaned = name
    .replace(/^(د\.?|م\.?|أ\.?|دكتور|مهندس|أستاذ)\s+/i, "")
    .trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "وك";
  if (parts.length === 1) return parts[0].slice(0, 2);

  const getChar = (word: string) => {
    // If word starts with 'ال' and has > 2 letters, take the letter after 'ال'
    if (word.startsWith("ال") && word.length > 2) {
      return word[2];
    }
    return word[0];
  };

  const c1 = getChar(parts[0]);
  const c2 = getChar(parts[1]);
  return `${c1}${c2}`;
}

export interface SandboxSample {
  label: string;
  prompt: string;
  toolUsed?: string;
  response: string;
}

export function getAgentSamplePrompts(slug: string): SandboxSample[] {
  switch (slug) {
    case "store-manager-agent":
      return [
        {
          label: "تشغيل أدوات رفع التحويل",
          prompt: "فعّل شريط الشحن المجاني وخلّي الحد 750 جنيه",
          toolUsed: "conversion_tool_toggle(tool_key='freeShippingBar', enable=true)",
          response: "شريط الشحن المجاني بقى شغال على كل صفحات المنتجات، والحد اتظبط على 750 ج.م — أي عميل سلة أقل من كده هيشوف رصيده الناقص للشحن المجاني لحظة التسوق.",
        },
        {
          label: "فحص طرق الدفع",
          prompt: "ورّيني طرق الدفع الشغالة في المتجر دلوقتي",
          toolUsed: "payment_settings_read()",
          response: "الشغال حاليًا: الدفع عند الاستلام بس. بوابة Kashier مش متسجلة فالبطاقات معطلة، والمحفظة من غير رقم مسجل. تحب أفعّل المحفظة لو بعتلي رقمها؟",
        },
      ];
    case "facebook-media-buyer-agent":
      return [
        {
          label: "تحليل تكلفة الشراء المرتفعة",
          prompt: "حملة التيشرتات الصيفية تكلفة الشراء فيها وصلت 190 ج.م والهدف 120 ج.م، ما الحل؟",
          toolUsed: "meta_ads.get_campaign_insights(breakdown='placement')",
          response: "قمت بفحص التوزيع: 68% من الميزانية تستهلكها أجهزة iOS على شبكة Audience Network بتكلفة شراء 240 ج.م. أوصي فوراً بحصر التوزيع على Feeds + Reels لأجهزة أندرويد فقط وإيقاف شبكة Audience Network، مما سيخفض الـ CPR إلى 115 ج.م.",
        },
        {
          label: "صياغة زاوية إعلانية جديدة",
          prompt: "اكتب لي خطافاً (Hook) وزاوية إعلانية لمنتج أحذية طبية لكبار السن",
          toolUsed: "creative.generate_ad_angles(target_audience='seniors')",
          response: "الزاوية: 'الراحة قبل الأناقة'. الخطاف المقترح: 'مش كل ألم في الضهر سببه السن.. أحياناً السبب هو الحذاء اللي بتلبسه كل يوم'. العرض: خصم 20% على الزوج الثاني مع ضمان استبدال مجاني للمقاس حتى باب المنزل.",
        },
      ];
    case "whatsapp-sales-agent":
      return [
        {
          label: "معالجة اعتراض السعر",
          prompt: "العميل يقول: 'السعر غالي جداً مقارنة بالسوق'",
          toolUsed: "catalog.get_value_proposition(sku='PERFUME-01')",
          response: "أهلاً بحضرتك! فاهم وجهة نظرك تماماً. الفرق الأساسي أن منتجنا يأتي بتركيز Extrait de Parfum يدوم 48 ساعة وبزيوت طبيعية 100% بدون أي كحول مضاف يسبب حساسية. وتقدديراً لاهتمامك، جاهز أضيف لك كود شحن مجاني اليوم إذا أكدت الطلب الآن.",
        },
        {
          label: "استرجاع سلة متروكة",
          prompt: "عميل أضاف 3 قطع للمفضلة وخرج دون إتمام الشراء",
          toolUsed: "whatsapp.send_recovery_template(cart_id='cart_883')",
          response: "مرحباً يا فندم! لاحظنا أنك نسيت حقيبة اليد الجلدية في سلة التسوق. متبقي قطعتين فقط من هذا اللون بالمخزن، وحجزنا لك قطعة لمدة ساعتين مع هدية محفظة كروت مجانية إذا طلبت الآن.",
        },
      ];
    case "bosta-logistics-agent":
      return [
        {
          label: "تسريع شحنات معلقة",
          prompt: "لدينا 8 شحنات في حالة 'محاولة تسليم فاشلة' في الإسكندرية",
          toolUsed: "bosta.batch_update_status(status='RESCHEDULE')",
          response: "تم فحص تقارير المناديب: 5 شحنات تعذر الاتصال بالعميل وقت الصباح، و3 شحنات طلبوا التسليم بعد الساعة 5:00 مساءً. قمت تلقائياً بإرسال رسائل واتساب تأكيدية بمواعيد المساء، وتعيين خط سير جديد للمندوب لضمان التسليم بنسبة 100%.",
        },
      ];
    case "competitor-price-scout-agent":
      return [
        {
          label: "مقارنة أسعار المنافسين",
          prompt: "هل المنافسين خفضوا أسعار الساعات الذكية هذا الأسبوع؟",
          toolUsed: "web_search.compare_market_prices(item='Smart Watch V8')",
          response: "نعم، تم رصد متجرين منافسين خفضا السعر من 850 ج.م إلى 790 ج.م مع شحن مدفوع. أوصي بعدم تخفيض السعر الأساسي، بل تقديم السعر بـ 820 ج.م متضمناً شحناً مجانياً + استيك إضافي كقيمة مضافة.",
        },
      ];
    default:
      return [
        {
          label: "استشارة تشغيلية سريعة",
          prompt: "ما هي أول خطوة ستقوم بها عند تفعيلك في حساب الشركة؟",
          toolUsed: "agent.initialize_workspace()",
          response: "أبدأ فوراً بقراءة البيانات التاريخية الخاصة بحسابك، مطابقة مؤشرات الأداء الحالية، وضبط صلاحيات الأمان بحيث لا يتم أي إجراء مالي إلا بموافقتك اليدوية المسبقة.",
        },
      ];
  }
}

