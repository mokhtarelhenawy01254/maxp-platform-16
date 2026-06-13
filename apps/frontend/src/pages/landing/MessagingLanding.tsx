import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, Bot, Users, BarChart3, Check, ChevronDown,
  ArrowLeft, Smartphone, Headphones, LayoutDashboard, X,
  SendHorizontal, Sparkles, Zap, Shield, Globe, Clock,
} from "lucide-react";
import { usePlatformSiteMetaPixel } from "../../hooks/usePlatformSiteMetaPixel";
import "./messagingLanding.css";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.007-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
);

const TelegramIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#0088cc"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
);

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#E4405F"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
);

const MessengerIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#006AFF"><path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.353 1.655 6.353 4.242 8.305V24l3.895-2.135c1.16.325 2.384.502 3.672.502h.09C18.438 22.367 24 17.4 24 11.111 24 4.974 18.627 0 12 0zm0 2c5.514 0 10 4.088 10 9.111 0 5.035-4.486 9.122-10 9.122-1.19 0-2.34-.189-3.418-.536l-.417-.135-2.586 1.418.502-2.403-.267-.427A8.926 8.926 0 012 11.11C2 6.089 6.486 2 12 2zm.874 7.283l-5.119 5.432 4.646-2.583 2.35 2.625 5.014-5.36-4.677 2.48z"/></svg>
);

const platformIcons = [
  { name: "WhatsApp", icon: WhatsAppIcon, color: "#25D366" },
  { name: "Telegram", icon: TelegramIcon, color: "#0088cc" },
  { name: "Instagram", icon: InstagramIcon, color: "#E4405F" },
  { name: "Messenger", icon: MessengerIcon, color: "#006AFF" },
];

const painPoints = [
  { icon: "😤", title: "رسايل ضايعة", desc: "عميل بيسأل على واتساب وموظف تاني بيرد على ماسنجر بإجابة مختلفة — العميل مشتري من منافس" },
  { icon: "⏳", title: "وقت استجابة بطيء", desc: "متوسط وقت الرد أكتر من ٥ ساعات. في السوق اللي سرعته فيه — بيكسب" },
  { icon: "🔄", title: "مفيش متابعة", desc: "مش عارف مين كلم العميل آخر مرة ولا إيه آخر حاجة اتقالت. كل موظف شغال لحاله" },
  { icon: "📉", title: "خسارة مبيعات", desc: "٨٠٪ من استفسارات العملاء بتضيع بين المنصات. وانت مش عارف — عشان محدش بيسجل" },
];

const features = [
  {
    icon: <LayoutDashboard className="w-6 h-6" />, title: "صندوق وارد موحّد",
    desc: "واتساب + تلجرام + انستجرام + ماسنجر في شاشة واحدة. بحث، تصفية، Assign، ملاحظات داخلية، و customer card.",
    tag: "٤ منصات في واجهة",
  },
  {
    icon: <Bot className="w-6 h-6" />, title: "الذكاء الاصطناعي للرد",
    desc: "AI بيفهم العربي، بيرد على الاستفسارات، يبحث عن منتجات، ويعمل حجوزات وطلبات بشكل تلقائي — شغال ٢٤ ساعة.",
    tag: "AI Agent",
  },
  {
    icon: <Users className="w-6 h-6" />, title: "فريق عمل متكامل",
    desc: "كل الموظفين يشتغلوا على نفس الانبوكس. صلاحيات، Assign للمحادثات، ملاحظات داخلية، وتقارير أداء لكل فرد.",
    tag: "غير محدود موظفين",
  },
  {
    icon: <BarChart3 className="w-6 h-6" />, title: "تقارير وتحليلات",
    desc: "اعرف مين الأسرع في الرد، مين الأكفأ، وكم محادثة حلها الـ AI نيابة عن فريقك. تابع رضا العملاء لحظة بلحظة.",
    tag: "رضا العملاء",
  },
];

const stepsData = [
  { num: "٠١", title: "اربط حساباتك", desc: "واتساب QR كود / API، تلجرام بوت، فيسبوك OAuth. كل دا في ٥ دقايق.", icon: <Smartphone className="w-6 h-6" /> },
  { num: "٠٢", title: "جهز فريقك", desc: "ضيف موظفينك، حدد صلاحياتهم، وجهز الردود التلقائية والـ Quick Replies.", icon: <Users className="w-6 h-6" /> },
  { num: "٠٣", title: "فعل الـ AI", desc: "الـ AI بيبدأ يرد على الاستفسارات، يعمل طلبات، ويحجز مواعيد — أوتوماتيك بدون تدخل.", icon: <Bot className="w-6 h-6" /> },
];

const faqs = [
  { q: "إزاي أربط حساباتي مع Max P?", a: "الواتساب: استخدم QR كود أو WhatsApp API. تلجرام: ضيف البوت برابط. انستجرام وماسنجر: عبر فيسبوك OAuth. كل دا خلال ٥ دقايق من لوحة التحكم." },
  { q: "هل الـ AI بيستغنى عن فريق الدعم البشري?", a: "الـ AI بيساعد في الرد على الاستفسارات البسيطة والتكرارية. الاستفسارات المعقدة أو الحساسة بيحولها للموظف المختص — ما بينوبش عن البشر، بيساعدهم." },
  { q: "هل الـ AI بيدعم اللهجة المصرية والعامية?", a: "أيوة، الـ AI مدرب على العربية الفصحى والعامية المصرية والخليجية. وكل ما تستخدمه أكتر — بيتعلم ويبقى أدق في الردود." },
  { q: "هل فيه حد لعدد الرسايل أو المحادثات?", a: "الباقة شاملة غير محدود رسايل ومحادثات. تقدر ترسل وتستقبل قد ما تحتاج من غير قيود." },
  { q: "هل تقدر تدعم اللغة الإنجليزية?", a: "الواجهة والـ AI يدعموا العربية والإنجليزية. وكمان في ترجمة آنية لأكتر من ٤٥ لغة." },
  { q: "هل أسترد فلوسي لو مش عجبني?", a: "أيوة، ضمان استرداد كامل خلال أول ٧ أيام من الاشتراك. من غير ما تسأل سؤال." },
];

const MessagingLanding: React.FC = () => {
  const navigate = useNavigate();
  usePlatformSiteMetaPixel();
  const [isScrolled, setIsScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [leadFormOpen, setLeadFormOpen] = useState(false);
  const [leadForm, setLeadForm] = useState({ name: "", phone: "" });
  const [leadSent, setLeadSent] = useState(false);

  useEffect(() => {
    document.title = "Max P Inbox | واتساب وتلجرام وانستجرام وماسنجر في صندوق واحد";

    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[property="${name}"]`) as HTMLMetaElement | null;
      if (!el) { el = document.createElement("meta"); el.setAttribute("property", name); document.head.appendChild(el); }
      el.content = content;
    };
    setMeta("og:title", "Max P Inbox — كل رسايل واتساب وتلجرام وانستجرام وماسنجر في مكان واحد");
    setMeta("og:description", "صندوق وارد موحّد لكل المنصات + AI Agent يرد على العملاء ويعمل حجوزات وطلبات. ٩٩٩ ج.م/شهر — وفّر ٦٠٪ من وقت فريقك.");
    setMeta("og:type", "website");
    setMeta("og:url", window.location.href);
    setMeta("og:image", "https://maxp.online/og-messaging.svg");
    setMeta("og:locale", "ar_AR");
    let descEl = document.querySelector("meta[name=\"description\"]") as HTMLMetaElement | null;
    if (!descEl) { descEl = document.createElement("meta"); descEl.name = "description"; document.head.appendChild(descEl); }
    descEl.content = "صندوق وارد موحّد لكل منصات المحادثات + AI Agent يرد وينشئ طلبات. باقات من ٩٩٩ ج.م/شهر.";

    const onScroll = () => setIsScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setShowChat(true), 500);
    return () => clearTimeout(t);
  }, []);

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const nameParts = leadForm.name.trim().split(/\s+/);
      const res = await fetch("/api/v1/public/customers/lead-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: nameParts[0] || "", lastName: nameParts.slice(1).join(" ") || nameParts[0], phone: leadForm.phone, source: "messaging-landing", service: "messaging_inbox" }),
      });
      if (res.ok) setLeadSent(true);
    } catch { setLeadSent(true); }
  };

  const [subscribing, setSubscribing] = useState(false);

  const handleSubscribe = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      navigate("/auth/register?source=messaging&theme=messaging&redirect=/lp/messaging");
      return;
    }
    setSubscribing(true);
    try {
      const res = await fetch("/api/v1/platform-subscription/messaging-checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.success && data.data?.sessionUrl) {
        window.location.href = data.data.sessionUrl;
      } else {
        alert(data.message || "فشل إنشاء الدفع");
        setSubscribing(false);
      }
    } catch {
      alert("خطأ في الاتصال");
      setSubscribing(false);
    }
  };

  return (
    <div className="msg-landing" dir="rtl">
      <nav className={`msg-nav ${isScrolled ? "is-scrolled" : ""}`}>
        <div className="msg-brand"><span className="msg-brand-dot" /><span>Max P <span style={{ color: "var(--msg-accent-light)" }}>Inbox</span></span></div>
        <div className="msg-nav-links">
          <a href="#features">المميزات</a>
          <a href="#how-it-works">طريقة العمل</a>
          <a href="#ai-agent">AI Agent</a>
          <a href="#pricing">الأسعار</a>
          <a href="#faq">الأسئلة</a>
        </div>
        <Link to="/auth/login" className="msg-btn msg-btn-ghost">تسجيل الدخول</Link>
        <button onClick={handleSubscribe} className="msg-btn msg-btn-primary">ابدأ الاشتراك</button>
      </nav>

      {/* Hero */}
      <section className="msg-section" style={{ paddingTop: "8rem" }}>
        <div className="msg-container">
          <motion.div className="flex flex-col lg:flex-row items-center gap-12" variants={containerVariants} initial="hidden" animate="visible">
            <div className="flex-1">
              <motion.div variants={itemVariants}>
                <span className="msg-kicker"><MessageCircle className="w-4 h-4" /> ٤ منصات محادثات في شاشة واحدة</span>
              </motion.div>
              <motion.h1 variants={itemVariants} className="msg-title">
                كل رسايل{" "}
                <span className="msg-title-gradient">واتساب وتلجرام وانستجرام وماسنجر</span>
                <br />في مكان واحد والـ AI يرد نيابة عنك
              </motion.h1>
              <motion.p variants={itemVariants} className="msg-lead">
                وفر ٦٠٪ من وقت فريقك. كل المحادثات من ٤ منصات في صندوق واحد.
                فريق كامل يشتغل عليها والذكاء الاصطناعي يرد على العملاء ويعمل طلبات وحجوزات بشكل تلقائي — ٢٤ ساعة.
              </motion.p>
              <motion.div variants={itemVariants} className="flex flex-wrap gap-3 mb-6">
                <button onClick={handleSubscribe} className="msg-btn msg-btn-primary">
                  ابدأ الاشتراك <ArrowLeft className="w-4 h-4" />
                </button>
                <a href="#features" className="msg-btn msg-btn-secondary">شوف المميزات</a>
              </motion.div>
              <motion.div variants={itemVariants} className="flex items-center gap-4 text-sm" style={{ color: "var(--msg-text-muted)" }}>
                <div className="flex -space-x-2">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-[var(--msg-panel)] bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-xs font-bold text-white">
                      {["أ","ن","خ","ع"][i-1]}
                    </div>
                  ))}
                </div>
                <span>أكتر من <strong style={{ color: "var(--msg-text-main)" }}>١٠٠٠+</strong> تاجر بيستخدم Max P</span>
              </motion.div>
            </div>
            <motion.div variants={itemVariants} className="flex-1 w-full">
              <div className="msg-card" style={{ padding: "1.5rem" }}>
                <div className="flex gap-1 mb-4">
                  {platformIcons.map(p => (
                    <div key={p.name} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-bold" style={{ background: `${p.color}12`, color: p.color, border: `1px solid ${p.color}25` }}>
                      <p.icon /> {p.name}
                    </div>
                  ))}
                </div>
                <div className="simulated-chat">
                  <div className="simulated-chat-header">
                    <div className="simulated-chat-dots"><span /><span /><span /></div>
                    <div className="flex-1 text-center text-sm font-bold">محادثة واردة — ماسنجر</div>
                    <Bot className="w-4 h-4" style={{ color: "var(--msg-accent)" }} />
                  </div>
                  <div className="simulated-chat-body" style={{ minHeight: "200px" }}>
                    <AnimatePresence>
                      {showChat && [
                        { role: "customer", text: "السلام عليكم .. عايز استفسر عن طلب رقم #2431", delay: 0 },
                        { role: "ai", text: "وعليكم السلام 👋 طلبك رقم #2431: تم الشحن وهو في الطريق، هيوصلك بكره بمشيئة الله.", delay: 1200 },
                        { role: "customer", text: "طب ممكن أغير العنوان؟", delay: 2500 },
                        { role: "ai", text: "تمام، حولتك لموظف الدعم المختص. دقيقة من فضلك 🤝", delay: 3500 },
                      ].map((msg, i) => (
                        <motion.div
                          key={i}
                          className={`simulated-message ${msg.role}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: msg.delay / 1000, duration: 0.4 }}
                        >
                          {msg.text}
                          {msg.role === "ai" && <span className="block text-[10px] opacity-50 mt-1">AI Agent · رد تلقائي</span>}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    <motion.div
                      className="flex gap-1 items-center text-xs"
                      style={{ color: "var(--msg-text-muted)" }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 4.5 }}
                    >
                      <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                      تمت المحادثة · رد آلي بالكامل
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Pain Points */}
      <section className="msg-section" id="pain-points">
        <div className="msg-container">
          <motion.div className="text-center mb-12" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: "-80px" }}>
            <span className="msg-kicker">المشكلة</span>
            <h2 className="msg-title" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)" }}>كدا بتخسر عملاء .. واحنا عندنا الحل</h2>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {painPoints.map((p, i) => (
              <motion.div key={i} className="msg-card" style={{ padding: "1.5rem" }}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              >
                <div className="text-3xl mb-3">{p.icon}</div>
                <h3 className="font-bold mb-1">{p.title}</h3>
                <p className="text-sm" style={{ color: "var(--msg-text-muted)" }}>{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="msg-section" id="features" style={{ background: "var(--msg-bg-deep)" }}>
        <div className="msg-container">
          <motion.div className="text-center mb-12" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: "-80px" }}>
            <span className="msg-kicker">الحل</span>
            <h2 className="msg-title" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)" }}>كل اللي محتاجه عشان تدير محادثاتك من مكان واحد</h2>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-5">
            {features.map((f, i) => (
              <motion.div key={i} className="msg-card" style={{ padding: "1.8rem" }}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="msg-badge msg-badge-save">{f.tag}</span>
                </div>
                <div className="flex items-center gap-2 mb-2" style={{ color: "var(--msg-accent-light)" }}>{f.icon}</div>
                <h3 className="text-lg font-bold mb-1">{f.title}</h3>
                <p className="text-sm" style={{ color: "var(--msg-text-muted)" }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="msg-section" id="how-it-works">
        <div className="msg-container">
          <motion.div className="text-center mb-12" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: "-80px" }}>
            <span className="msg-kicker">طريقة العمل</span>
            <h2 className="msg-title" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)" }}>تبدأ في ٣ خطوات بس</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {stepsData.map((s, i) => (
              <motion.div key={i} className="text-center"
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.12 }}
              >
                <div className="w-16 h-16 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mx-auto mb-4" style={{ color: "var(--msg-accent-light)" }}>{s.icon}</div>
                <div className="text-3xl font-black mb-1 opacity-20" style={{ color: "var(--msg-accent)" }}>{s.num}</div>
                <h3 className="font-bold text-lg mb-1">{s.title}</h3>
                <p className="text-sm" style={{ color: "var(--msg-text-muted)" }}>{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Agent */}
      <section className="msg-section" id="ai-agent" style={{ background: "var(--msg-bg-deep)" }}>
        <div className="msg-container">
          <motion.div className="flex flex-col lg:flex-row items-center gap-12" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: "-80px" }}>
            <div className="flex-1">
              <span className="msg-kicker"><Bot className="w-4 h-4" /> AI Agent</span>
              <h2 className="msg-title" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)" }}>الـ AI بيدعم عملاءك .. واحنا بنتكلم</h2>
              <p className="msg-lead">
                مش بس بيرد — الـ AI بيفهم سياق المحادثة، يبحث عن منتجات، يعمل طلبات، يحجز مواعيد، ويحول للموظف المناسب لو احتاج تدخل بشري. وكل دا شغال ٢٤ ساعة.
              </p>
              <div className="space-y-3 mt-6">
                {[
                  { icon: <Sparkles className="w-4 h-4" />, text: "يفهم السياق — مش ردود جاهزة، بيفهم العربية الفصحى والعامية" },
                  { icon: <Zap className="w-4 h-4" />, text: "يعمل حجوزات، يفتح تكيت، ويكشوف منتجات بشكل تلقائي" },
                  { icon: <Shield className="w-4 h-4" />, text: "يحول للموظف المناسب لو محتاج تدخل بشري — وميغادرش العميل يتوه" },
                  { icon: <Clock className="w-4 h-4" />, text: "يتعلم من تاريخ محادثاتك — كل ما تستخدمه أكتر — كل ما يبقى أدق" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span style={{ color: "var(--msg-accent-light)" }}>{item.icon}</span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 w-full">
              <div className="simulated-chat">
                <div className="simulated-chat-header">
                  <div className="simulated-chat-dots"><span /><span /><span /></div>
                  <div className="flex-1 text-center text-sm font-bold">AI Agent — محادثة مباشرة</div>
                  <Bot className="w-4 h-4" style={{ color: "var(--msg-accent)" }} />
                </div>
                <div className="simulated-chat-body" style={{ minHeight: "240px" }}>
                  <div className="simulated-message customer">عايز منتج للعناية بالشعر — يكون طبيعي ومناسب للشعر الدهني</div>
                  <div className="simulated-message ai">فيه عندنا "كريم الشعر الطبيعي" 🌿 بسعر ١٨٠ ج.م — خالي من السيليكون والبارابين. مناسب لجميع أنواع الشعر. هل تحب تشوف التفاصيل أو تطلبه؟</div>
                  <div className="simulated-message customer">تمام .. عايز أطلبه</div>
                  <div className="simulated-message ai" style={{ border: "1px dashed rgba(13,148,136,0.35)" }}>
                    ✅ تم تأكيد الطلب<br />
                    المنتج: كريم الشعر الطبيعي · ١٨٠ ج.م<br />
                    الكمية: ١ · الإجمالي: ١٨٠ ج.م<br />
                    التوصيل: ٢-٣ أيام عمل<br />
                    <span className="block text-[10px] opacity-50 mt-2">طلب تم باستخدام AI Agent · بدون تدخل بشري</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="msg-section" style={{ padding: "3rem 0" }}>
        <div className="msg-container">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { num: "٤٠٪", label: "أسرع في الرد على العملاء", sub: "مقارنة باستخدام منصات منفصلة" },
              { num: "١٠٠٠+", label: "محادثة شهرياً", sub: "بيتعامل معاها الـ AI بدون تدخل بشري" },
              { num: "٨٠٪", label: "من الاستفسارات البسيطة", sub: "بيحلها الـ AI بدون ما يوصل لموظف" },
            ].map((s, i) => (
              <motion.div key={i} className="text-center p-6"
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              >
                <div className="text-3xl font-black mb-1" style={{ color: "var(--msg-accent-light)" }}>{s.num}</div>
                <div className="font-bold">{s.label}</div>
                <div className="text-xs" style={{ color: "var(--msg-text-muted)" }}>{s.sub}</div>
              </motion.div>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-10 mt-8 opacity-40">
            {platformIcons.map(p => (
              <div key={p.name} className="flex items-center gap-1 text-sm font-bold"><p.icon /> {p.name}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="msg-section" id="pricing">
        <div className="msg-container">
          <motion.div className="text-center mb-10" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: "-80px" }}>
            <span className="msg-kicker">باقة واحدة — كل الأدوات</span>
            <h2 className="msg-title" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)" }}>اشتراك واحد — كل حاجة</h2>
          </motion.div>
          <motion.div className="max-w-md mx-auto" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <div className="msg-pricing-card featured text-center">
              <div className="flex justify-center gap-2 mb-4">
                <span className="msg-badge msg-badge-save">توفير ٦٩٪</span>
                <span className="msg-badge" style={{ background: "rgba(197,95,106,0.12)", color: "#c55f6a" }}>الأفضل في السوق</span>
              </div>
              <div className="msg-price-original mb-1">٣٬٢٠٠ ج.م/شهر</div>
              <div className="msg-price mb-2">٩٩٩ ج.م<span className="text-base font-normal" style={{ color: "var(--msg-text-muted)" }}>/شهر</span></div>
              <p className="text-xs mb-6" style={{ color: "var(--msg-text-muted)" }}>ضمان استرداد كامل خلال ٧ أيام — من غير ما تسأل</p>
              <button onClick={handleSubscribe} className="msg-btn msg-btn-primary w-full justify-center mb-6">
                ابدأ الاشتراك <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="space-y-3 text-right">
                {[
                  "واتساب + تلجرام + انستجرام + ماسنجر",
                  "صندوق وارد موحّد لكل المنصات — بحث، تصفية، Assign",
                  "AI Agent — ردود تلقائية + حجوزات وطلبات",
                  "فريق غير محدود — صلاحيات، ملاحظات داخلية، تقارير",
                  "ردود سريعة، Quick Replies، Auto-reply rules",
                  "تقارير أداء وتحليلات — لكل موظف ولكل منصة",
                  "دعم فني عربي — ٢٤ ساعة — ٧ أيام",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 shrink-0" style={{ color: "var(--msg-accent)" }} />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="msg-section" id="faq" style={{ background: "var(--msg-bg-deep)" }}>
        <div className="msg-container" style={{ maxWidth: "720px" }}>
          <motion.div className="text-center mb-10" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: "-80px" }}>
            <span className="msg-kicker">الأسئلة الشائعة</span>
            <h2 className="msg-title" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)" }}>إجابات لأسئلتك</h2>
          </motion.div>
          <div>
            {faqs.map((faq, i) => (
              <div key={i} className={`msg-faq-item ${openFaq === i ? "open" : ""}`} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <div className="msg-faq-question">
                  <span>{faq.q}</span>
                  <ChevronDown className="msg-faq-icon w-4 h-4" />
                </div>
                <div className="msg-faq-answer">{faq.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="msg-section" style={{ padding: "5rem 0" }}>
        <div className="msg-container">
          <motion.div className="text-center" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: "-80px" }}>
            <span className="msg-kicker">جهز تبدأ؟</span>
            <h2 className="msg-title" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", maxWidth: "600px", margin: "0 auto 1rem" }}>
              كل رسايل عملائك في مكان واحد — وفر ٦٠٪ من وقت فريقك
            </h2>
            <p className="msg-lead" style={{ margin: "0 auto 2rem" }}>
              ابدأ دلوقتي واربط حساباتك في ٥ دقايق. ضمان استرداد كامل ٧ أيام.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button onClick={handleSubscribe} className="msg-btn msg-btn-primary">
                ابدأ الاشتراك <ArrowLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setLeadFormOpen(true)} className="msg-btn msg-btn-secondary">
                <Headphones className="w-4 h-4" /> كلم المبيعات
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="msg-footer">
        <div className="msg-container">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="msg-brand"><span className="msg-brand-dot" /> Max P Inbox</div>
            <div className="flex gap-4 text-xs">
              <a href="#" style={{ color: "var(--msg-text-muted)" }}>الخصوصية</a>
              <a href="#" style={{ color: "var(--msg-text-muted)" }}>الشروط</a>
              <a href="/" style={{ color: "var(--msg-text-muted)" }}>الرئيسية</a>
            </div>
            <div className="text-xs" style={{ color: "var(--msg-text-muted)" }}>© 2026 Max P. كل الحقوق محفوظة.</div>
          </div>
        </div>
      </footer>

      {/* Lead Form Modal */}
      <AnimatePresence>
        {leadFormOpen && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setLeadFormOpen(false)}
          >
            <motion.div className="msg-card" style={{ padding: "2rem", width: "90%", maxWidth: "400px" }}
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => setLeadFormOpen(false)} className="float-left" style={{ color: "var(--msg-text-muted)" }}>
                <X className="w-5 h-5" />
              </button>
              {leadSent ? (
                <div className="text-center py-6">
                  <Check className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--msg-accent)" }} />
                  <h3 className="text-lg font-bold mb-1">شكراً لتواصلك!</h3>
                  <p className="text-sm" style={{ color: "var(--msg-text-muted)" }}>فريق المبيعات هيتواصل معاك في أقرب وقت.</p>
                </div>
              ) : (
                <>
                  <h3 className="text-lg font-bold mb-1">كلم المبيعات</h3>
                  <p className="text-sm mb-4" style={{ color: "var(--msg-text-muted)" }}>سيّب بياناتك واحنا نكلمك</p>
                  <form onSubmit={handleLeadSubmit} className="space-y-3">
                    <input
                      type="text" placeholder="الاسم" required
                      value={leadForm.name} onChange={e => setLeadForm(p => ({ ...p, name: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl text-sm bg-[var(--msg-bg-deep)] border border-[var(--msg-panel-border)] focus:outline-none focus:border-teal-500/50"
                      style={{ color: "var(--msg-text-main)" }}
                    />
                    <input
                      type="tel" placeholder="رقم التليفون" required
                      value={leadForm.phone} onChange={e => setLeadForm(p => ({ ...p, phone: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl text-sm bg-[var(--msg-bg-deep)] border border-[var(--msg-panel-border)] focus:outline-none focus:border-teal-500/50"
                      style={{ color: "var(--msg-text-main)" }}
                    />
                    <button type="submit" className="msg-btn msg-btn-primary w-full justify-center">
                      <SendHorizontal className="w-4 h-4" /> إرسال
                    </button>
                  </form>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* WhatsApp Float */}
      <a href="https://wa.me/201123087745" target="_blank" rel="noopener noreferrer"
        className="fixed bottom-6 left-6 z-40 w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
        style={{ background: "var(--msg-accent)" }}
      >
        <WhatsAppIcon />
      </a>
    </div>
  );
};

export default MessagingLanding;
