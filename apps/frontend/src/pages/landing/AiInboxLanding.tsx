import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Bot, Users, BarChart, Check, ChevronDown, ArrowLeft, Phone, LayoutDashboard, X, SendHorizontal, Star, Zap, Shield, Globe, Clock, Menu } from 'lucide-react';
import { usePlatformSiteMetaPixel } from "../../hooks/usePlatformSiteMetaPixel";
import "./aiInboxLanding.css";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const WhatsAppIcon = ({ title }: { title?: string }) => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#25D366" role="img" aria-label={title || "WhatsApp"}>{title && <title>{title}</title>}<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.007-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
);

const TelegramIcon = ({ title }: { title?: string }) => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#0088cc" role="img" aria-label={title || "Telegram"}>{title && <title>{title}</title>}<path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
);

const InstagramIcon = ({ title }: { title?: string }) => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#E4405F" role="img" aria-label={title || "Instagram"}>{title && <title>{title}</title>}<path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
);

const MessengerIcon = ({ title }: { title?: string }) => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#006AFF" role="img" aria-label={title || "Messenger"}>{title && <title>{title}</title>}<path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.353 1.655 6.353 4.242 8.305V24l3.895-2.135c1.16.325 2.384.502 3.672.502h.09C18.438 22.367 24 17.4 24 11.111 24 4.974 18.627 0 12 0zm0 2c5.514 0 10 4.088 10 9.111 0 5.035-4.486 9.122-10 9.122-1.19 0-2.34-.189-3.418-.536l-.417-.135-2.586 1.418.502-2.403-.267-.427A8.926 8.926 0 012 11.11C2 6.089 6.486 2 12 2zm.874 7.283l-5.119 5.432 4.646-2.583 2.35 2.625 5.014-5.36-4.677 2.48z"/></svg>
);

const platformIcons = [
  { name: "WhatsApp", icon: WhatsAppIcon, color: "#25D366" },
  { name: "Telegram", icon: TelegramIcon, color: "#0088cc" },
  { name: "Instagram", icon: InstagramIcon, color: "#E4405F" },
  { name: "Messenger", icon: MessengerIcon, color: "#006AFF" },
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

const testimonials = [
  { name: "أحمد الشريف", role: "صاحب متجر إلكتروني — القاهرة", text: "كنت بخسر عملاء كتير بسبب تأخير الرد على الواتساب. بعد Max P، الـ AI بيرد فوراً والطلبات بتتسجل تلقائياً. مبيعاتي زادت ٤٠٪ في شهرين.", rating: 5 },
  { name: "سارة السعيد", role: "مدير تسويق — جدة", text: "كنا محتاجين حل يلم كل المنصات في مكان واحد. Max P وفر علينا ٣ موظفين وكانت التجربة مع الـ AI Agent مذهلة — بيفهم اللهجة الخليجية ويرد بدقة.", rating: 5 },
  { name: "مصطفى كامل", role: "صاحب وكالة دعاية — الإسكندرية", text: "تقارير الأداء وتحليلات الرضا بتخليني أعرف مين الأكفأ في فريقي. والـ AI بيحول المحادثات المعقدة للموظف الصح من أول مرة.", rating: 5 },
];

const faqs = [
  { q: "إيه الفرق بين AI + Inbox Bundle والباقات التانية?", a: "الباقة دي مخصصة للشركات اللي عايزة تركز على خدمة العملاء والمبيعات عبر المحادثات. بتجمع الانبوكس الموحد لكل المنصات مع AI Agent ذكي بيفهم العربية ويرد وينشئ طلبات بشكل تلقائي. مناسبة للشركات اللي بتستقبل محادثات كتير يومياً." },
  { q: "هل الباقة شاملة عدد غير محدود من الرسايل?", a: "أيوة، الباقة شاملة غير محدود رسايل ومحادثات على كل المنصات. تقدر ترسل وتستقبل قد ما تحتاج من غير قيود." },
  { q: "هل الـ AI بيدعم اللهجة المصرية والعامية?", a: "أيوة، الـ AI مدرب على العربية الفصحى والعامية المصرية والخليجية. وكل ما تستخدمه أكتر — بيتعلم ويبقى أدق في الردود." },
  { q: "هل الـ AI بيستغنى عن فريق الدعم البشري?", a: "الـ AI بيساعد في الرد على الاستفسارات البسيطة والتكرارية. الاستفسارات المعقدة أو الحساسة بيحولها للموظف المختص — ما بينوبش عن البشر، بيساعدهم." },
  { q: "هل تقدر تدعم اللغة الإنجليزية?", a: "الواجهة والـ AI يدعموا العربية والإنجليزية. وكمان في ترجمة آنية لأكتر من ٤٥ لغة." },
  { q: "هل أسترد فلوسي لو مش عجبني?", a: "أيوة، ضمان استرداد كامل خلال أول ٧ أيام من الاشتراك. من غير ما تسأل سؤال." },
];

type BundleInfo = {
  slug: string; name: string; monthlyPrice: number; discount: number; appSlugs: string[];
};

const LP_SLUG = "ai-inbox";

const AiInboxLanding: React.FC = () => {
  const navigate = useNavigate();
  usePlatformSiteMetaPixel();
  const [isScrolled, setIsScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [bundle, setBundle] = useState<BundleInfo | null>(null);
  const [activationType, setActivationType] = useState<string>("both");

  useEffect(() => {
    document.title = "Max P AI + Inbox | الذكاء الاصطناعي وصندوق الوارد الموحد";

    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[property="${name}"]`) as HTMLMetaElement | null;
      if (!el) { el = document.createElement("meta"); el.setAttribute("property", name); document.head.appendChild(el); }
      el.content = content;
    };
    setMeta("og:title", "Max P AI + Inbox Bundle — AI Agent + Unified Inbox في باقة واحدة");
    setMeta("og:description", "الذكاء الاصطناعي للمحادثات + صندوق وارد موحد لكل المنصات. ٩٩٩ ج.م/شهر — AI Agent يرد وينشئ الطلبات تلقائياً.");
    setMeta("og:type", "website");
    setMeta("og:url", window.location.href);
    setMeta("og:locale", "ar_AR");
    let descEl = document.querySelector("meta[name=\"description\"]") as HTMLMetaElement | null;
    if (!descEl) { descEl = document.createElement("meta"); descEl.name = "description"; document.head.appendChild(descEl); }
    descEl.content = "باقة AI + Inbox من Max P — الذكاء الاصطناعي وصندوق الوارد الموحد لكل منصات المحادثات. بسعر ٩٩٩ ج.م/شهر.";

    const onScroll = () => setIsScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    fetch(`/api/v1/public/lp-pages/${LP_SLUG}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.bundle) setBundle({ slug: data.bundle.slug, name: data.bundle.name, monthlyPrice: Number(data.bundle.monthlyPrice), discount: Number(data.bundle.discount || 0), appSlugs: data.bundle.appSlugs || [] });
        if (data?.activationType) setActivationType(data.activationType);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setShowChat(true), 500);
    return () => clearTimeout(t);
  }, []);

  const [subscribing, setSubscribing] = useState(false);
  const [actionType, setActionType] = useState<"free" | "paid" | null>(null);

  const handleFreeActivate = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      navigate(`/auth/register?source=${LP_SLUG}&theme=ai-inbox&redirect=/lp/${LP_SLUG}&action=free`);
      return;
    }
    if (!bundle) { alert("الباقة غير متوفرة"); return; }
    setSubscribing(true);
    setActionType("free");
    try {
      const res = await fetch("/api/v1/platform-subscription/lp-activate", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ bundleSlug: bundle.slug }),
      });
      const data = await res.json();
      if (data.success) {
        navigate("/admin/ai-hub?tab=sandbox");
      } else {
        alert(data.message || "فشل التفعيل");
        setSubscribing(false);
      }
    } catch {
      alert("خطأ في الاتصال");
      setSubscribing(false);
    }
  };

  const handlePaidSubscribe = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      navigate(`/auth/register?source=${LP_SLUG}&theme=ai-inbox&redirect=/lp/${LP_SLUG}&action=paid`);
      return;
    }
    if (!bundle) { alert("الباقة غير متوفرة"); return; }
    setSubscribing(true);
    setActionType("paid");
    try {
      const res = await fetch("/api/v1/platform-subscription/lp-checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ bundleSlug: bundle.slug }),
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

  const handleSubscribe = bundle && activationType === "paid" ? handlePaidSubscribe
    : bundle && activationType === "free" ? handleFreeActivate
    : handlePaidSubscribe;

  return (
    <div className="ai-landing" dir="rtl">
      <nav className={`ai-nav ${isScrolled ? "is-scrolled" : ""}`}>
        <div className="ai-brand"><span className="ai-brand-dot" /><span>Max P <span style={{ color: "var(--ai-accent-light)" }}>AI + Inbox</span></span></div>
        <div className="ai-nav-links">
          <a href="#features">المميزات</a>
          <a href="#ai-agent">AI Agent</a>
          <a href="#pricing">الأسعار</a>
          <a href="#faq">الأسئلة</a>
        </div>
        <div className="ai-nav-actions">
          <Link to="/auth/login" className="ai-btn ai-btn-ghost ai-nav-login">تسجيل الدخول</Link>
          {activationType !== "paid" && (
            <button onClick={handleFreeActivate} disabled={subscribing} className="ai-btn ai-btn-primary ai-nav-subscribe">جرب مجانا</button>
          )}
          {activationType !== "free" && (
            <button onClick={handlePaidSubscribe} disabled={subscribing} className="ai-btn ai-btn-primary ai-nav-subscribe">اشترك {bundle ? bundle.monthlyPrice.toLocaleString("ar-EG") : ""} ج.م</button>
          )}
          <button className="ai-mobile-toggle" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} aria-label={isMobileMenuOpen ? "إغلاق القائمة" : "فتح القائمة"}>
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>
      {isMobileMenuOpen && (
        <div className="ai-mobile-menu">
          <a href="#features" onClick={() => setIsMobileMenuOpen(false)}>المميزات</a>
          <a href="#ai-agent" onClick={() => setIsMobileMenuOpen(false)}>AI Agent</a>
          <a href="#pricing" onClick={() => setIsMobileMenuOpen(false)}>الأسعار</a>
          <a href="#faq" onClick={() => setIsMobileMenuOpen(false)}>الأسئلة</a>
          <div className="ai-mobile-menu-divider" />
          <Link to="/auth/login" onClick={() => setIsMobileMenuOpen(false)}>تسجيل الدخول</Link>
          {activationType !== "paid" && (
            <button onClick={() => { setIsMobileMenuOpen(false); handleFreeActivate(); }} className="ai-btn ai-btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: "0.25rem" }}>جرب مجانا</button>
          )}
          {activationType !== "free" && (
            <button onClick={() => { setIsMobileMenuOpen(false); handlePaidSubscribe(); }} className="ai-btn ai-btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: "0.25rem" }}>اشترك {bundle ? bundle.monthlyPrice.toLocaleString("ar-EG") : ""} ج.م</button>
          )}
        </div>
      )}

      {/* Hero */}
      <section className="ai-section" style={{ paddingTop: "8rem" }}>
        <div className="ai-container">
          <motion.div className="flex flex-col lg:flex-row items-center gap-12" variants={containerVariants} initial="hidden" animate="visible">
            <div className="flex-1">
              <motion.div variants={itemVariants}>
                <span className="ai-kicker"><Sparkles className="w-4 h-4" /> AI Agent + Unified Inbox</span>
              </motion.div>
              <motion.h1 variants={itemVariants} className="ai-title">
                <span className="ai-title-gradient">الذكاء الاصطناعي</span>{" "}
                + صندوق وارد موحد<br />
                في باقة واحدة بسعر ثابت
              </motion.h1>
              <motion.p variants={itemVariants} className="ai-lead">
                وفر ٦٠٪ من وقت فريقك. كل المحادثات من ٤ منصات في صندوق واحد.
                والذكاء الاصطناعي يرد على العملاء وينشئ طلبات وحجوزات — ٢٤ ساعة.
              </motion.p>
              <motion.div variants={itemVariants} className="flex flex-wrap gap-3 mb-6">
                {activationType !== "paid" && (
                  <button onClick={handleFreeActivate} disabled={subscribing} className="ai-btn ai-btn-primary">
                    {subscribing && actionType === "free" ? "جاري..." : "جرب مجانا"} <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                {activationType !== "free" && (
                  <button onClick={handlePaidSubscribe} disabled={subscribing} className="ai-btn ai-btn-secondary">
                    {subscribing && actionType === "paid" ? "جاري..." : `اشترك ب ${bundle ? bundle.monthlyPrice.toLocaleString("ar-EG") : "٩٩٩"} ج.م`}
                  </button>
                )}
                <a href="#features" className="ai-btn ai-btn-ghost">شوف المميزات</a>
              </motion.div>
              <motion.div variants={itemVariants} className="flex items-center gap-4 text-sm" style={{ color: "var(--ai-text-muted)" }}>
                <div className="flex -space-x-2">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-[var(--ai-panel)] bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white">
                      {["أ","ن","خ","ع"][i-1]}
                    </div>
                  ))}
                </div>
                <span>أكتر من <strong style={{ color: "var(--ai-text-main)" }}>١٠٠٠+</strong> تاجر بيستخدم Max P</span>
              </motion.div>
            </div>
            <motion.div variants={itemVariants} className="flex-1 w-full">
              <div className="ai-card" style={{ padding: "1.5rem" }}>
                <div className="flex gap-1 mb-4">
                  {platformIcons.map(p => (
                    <div key={p.name} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-bold" style={{ background: `${p.color}12`, color: p.color, border: `1px solid ${p.color}25` }}>
                      <p.icon title={p.name} /> {p.name}
                    </div>
                  ))}
                </div>
                <div className="ai-chat">
                  <div className="ai-chat-header">
                    <div className="ai-chat-dots"><span /><span /><span /></div>
                    <div className="flex-1 text-center text-sm font-bold">محادثة واردة — ماسنجر</div>
                    <Bot className="w-4 h-4" style={{ color: "var(--ai-accent)" }} />
                  </div>
                  <div className="ai-chat-body" style={{ minHeight: "200px" }}>
                    <AnimatePresence>
                      {showChat && [
                        { role: "customer", text: "السلام عليكم .. عايز استفسر عن طلب رقم #2431", delay: 0 },
                        { role: "ai", text: "وعليكم السلام 👋 طلبك رقم #2431: تم الشحن وهو في الطريق، هيوصلك بكره بمشيئة الله.", delay: 1200 },
                        { role: "customer", text: "طب ممكن أغير العنوان؟", delay: 2500 },
                        { role: "ai", text: "تمام، حولتك لموظف الدعم المختص. دقيقة من فضلك 🤝", delay: 3500 },
                      ].map((msg, i) => (
                        <motion.div
                          key={i}
                          className={`ai-message ${msg.role}`}
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
                      style={{ color: "var(--ai-text-muted)" }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 4.5 }}
                    >
                      <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                      تمت المحادثة · رد آلي بالكامل
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="ai-section" id="features" style={{ background: "var(--ai-bg-deep)" }}>
        <div className="ai-container">
          <motion.div className="text-center mb-12" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: "-80px" }}>
            <span className="ai-kicker">مميزات الباقة</span>
            <h2 className="ai-title" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)" }}>كل اللي محتاجه عشان تدير محادثاتك من مكان واحد</h2>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-5">
            {features.map((f, i) => (
              <motion.div key={i} className="ai-card" style={{ padding: "1.8rem" }}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="ai-badge ai-badge-save">{f.tag}</span>
                </div>
                <div className="flex items-center gap-2 mb-2" style={{ color: "var(--ai-accent-light)" }}>{f.icon}</div>
                <h3 className="text-lg font-bold mb-1">{f.title}</h3>
                <p className="text-sm" style={{ color: "var(--ai-text-muted)" }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="ai-section">
        <div className="ai-container">
          <motion.div className="text-center mb-12" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: "-80px" }}>
            <span className="ai-kicker">طريقة العمل</span>
            <h2 className="ai-title" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)" }}>تبدأ في ٣ خطوات بس</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { num: "٠١", title: "اربط حساباتك", desc: "واتساب QR كود / API، تلجرام بوت، فيسبوك OAuth. كل دا في ٥ دقايق.", icon: <Smartphone className="w-6 h-6" /> },
              { num: "٠٢", title: "جهز فريقك", desc: "ضيف موظفينك، حدد صلاحياتهم، وجهز الردود التلقائية والـ Quick Replies.", icon: <Users className="w-6 h-6" /> },
              { num: "٠٣", title: "فعل الـ AI", desc: "الـ AI بيبدأ يرد على الاستفسارات، يعمل طلبات، ويحجز مواعيد — أوتوماتيك بدون تدخل.", icon: <Bot className="w-6 h-6" /> },
            ].map((s, i) => (
              <motion.div key={i} className="text-center"
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.12 }}
              >
                <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-4" style={{ color: "var(--ai-accent-light)" }}>{s.icon}</div>
                <div className="text-3xl font-black mb-1 opacity-20" style={{ color: "var(--ai-accent)" }}>{s.num}</div>
                <h3 className="font-bold text-lg mb-1">{s.title}</h3>
                <p className="text-sm" style={{ color: "var(--ai-text-muted)" }}>{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Agent Deep Dive */}
      <section className="ai-section" id="ai-agent" style={{ background: "var(--ai-bg-deep)" }}>
        <div className="ai-container">
          <motion.div className="flex flex-col lg:flex-row items-center gap-12" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: "-80px" }}>
            <div className="flex-1">
              <span className="ai-kicker"><Bot className="w-4 h-4" /> AI Agent</span>
              <h2 className="ai-title" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)" }}>الـ AI بيدعم عملاءك .. واحنا بنتكلم</h2>
              <p className="ai-lead">
                مش بس بيرد — الـ AI بيفهم سياق المحادثة، يبحث عن منتجات، يعمل طلبات، يحجز مواعيد، ويحول للموظف المناسب لو احتاج تدخل بشري. كل دا شغال ٢٤ ساعة.
              </p>
              <div className="space-y-3 mt-6">
                {[
                  { icon: <Sparkles className="w-4 h-4" />, text: "يفهم السياق — مش ردود جاهزة، بيفهم العربية الفصحى والعامية" },
                  { icon: <Zap className="w-4 h-4" />, text: "يعمل حجوزات، يفتح تكيت، ويكشوف منتجات بشكل تلقائي" },
                  { icon: <Shield className="w-4 h-4" />, text: "يحول للموظف المناسب لو محتاج تدخل بشري — وميغادرش العميل يتوه" },
                  { icon: <Globe className="w-4 h-4" />, text: "يدعم العربية والإنجليزية وترجمة آنية لأكثر من ٤٥ لغة" },
                  { icon: <Clock className="w-4 h-4" />, text: "يتعلم من تاريخ محادثاتك — كل ما تستخدمه أكتر — كل ما يبقى أدق" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span style={{ color: "var(--ai-accent-light)" }}>{item.icon}</span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 w-full">
              <div className="ai-chat">
                <div className="ai-chat-header">
                  <div className="ai-chat-dots"><span /><span /><span /></div>
                  <div className="flex-1 text-center text-sm font-bold">AI Agent — محادثة مباشرة</div>
                  <Bot className="w-4 h-4" style={{ color: "var(--ai-accent)" }} />
                </div>
                <div className="ai-chat-body" style={{ minHeight: "240px" }}>
                  <div className="ai-message customer">عايز منتج للعناية بالشعر — يكون طبيعي ومناسب للشعر الدهني</div>
                  <div className="ai-message ai">فيه عندنا "كريم الشعر الطبيعي" 🌿 بسعر ١٨٠ ج.م — خالي من السيليكون والبارابين. مناسب لجميع أنواع الشعر. هل تحب تشوف التفاصيل أو تطلبه؟</div>
                  <div className="ai-message customer">تمام .. عايز أطلبه</div>
                  <div className="ai-message ai" style={{ border: "1px dashed rgba(124,58,237,0.35)" }}>
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
      <section className="ai-section" style={{ padding: "3rem 0" }}>
        <div className="ai-container">
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
                <div className="text-3xl font-black mb-1" style={{ color: "var(--ai-accent-light)" }}>{s.num}</div>
                <div className="font-bold">{s.label}</div>
                <div className="text-xs" style={{ color: "var(--ai-text-muted)" }}>{s.sub}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="ai-section" style={{ background: "var(--ai-bg-deep)" }}>
        <div className="ai-container">
          <motion.div className="text-center mb-12" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: "-80px" }}>
            <span className="ai-kicker"><Star className="w-4 h-4" /> آراء العملاء</span>
            <h2 className="ai-title" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)" }}>ماذا يقول عملاؤنا عن Max P AI + Inbox</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <motion.div key={i} className="ai-card" style={{ padding: "1.8rem" }}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              >
                <div className="flex gap-1 mb-3" style={{ color: "var(--ai-accent-light)" }}>
                  {Array.from({ length: t.rating }).map((_, si) => <Star key={si} className="w-4 h-4 fill-current" />)}
                </div>
                <p className="text-sm mb-4" style={{ color: "var(--ai-text-muted)", lineHeight: 1.7 }}>"{t.text}"</p>
                <div>
                  <div className="font-bold text-sm">{t.name}</div>
                  <div className="text-xs" style={{ color: "var(--ai-text-muted)" }}>{t.role}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="ai-section" id="pricing">
        <div className="ai-container">
          <motion.div className="text-center mb-10" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: "-80px" }}>
            <span className="ai-kicker">باقة واحدة — كل الأدوات</span>
            <h2 className="ai-title" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)" }}>اشتراك واحد — كل حاجة</h2>
          </motion.div>
          <motion.div className="max-w-md mx-auto" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <div className="ai-pricing-card featured text-center">
              <div className="flex justify-center gap-2 mb-4">
                <span className="ai-badge ai-badge-save">AI Agent + Inbox</span>
                <span className="ai-badge" style={{ background: "rgba(236,72,153,0.12)", color: "#ec4899" }}>الأفضل للمبيعات</span>
              </div>
              <div className="ai-price mb-2">{bundle ? bundle.monthlyPrice.toLocaleString("ar-EG") : "٩٩٩"} ج.م<span className="text-base font-normal" style={{ color: "var(--ai-text-muted)" }}>/شهر</span></div>
              <p className="text-xs mb-6" style={{ color: "var(--ai-text-muted)" }}>ضمان استرداد كامل خلال ٧ أيام — من غير ما تسأل</p>
              {activationType === "both" ? (
                <div className="flex flex-col gap-2 mb-6">
                  <button onClick={handlePaidSubscribe} disabled={subscribing} className="ai-btn ai-btn-primary w-full justify-center">
                    {subscribing && actionType === "paid" ? "جاري..." : `اشترك ب ${bundle ? bundle.monthlyPrice.toLocaleString("ar-EG") : "٩٩٩"} ج.م/شهر`} <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button onClick={handleFreeActivate} disabled={subscribing} className="ai-btn ai-btn-secondary w-full justify-center">
                    {subscribing && actionType === "free" ? "جاري..." : "جرب مجانا ٧ أيام"}
                  </button>
                </div>
              ) : (
                <button onClick={handleSubscribe} disabled={subscribing} className="ai-btn ai-btn-primary w-full justify-center mb-6">
                  {subscribing ? "جاري..." : activationType === "free" ? "جرب مجانا" : `اشترك ب ${bundle ? bundle.monthlyPrice.toLocaleString("ar-EG") : "٩٩٩"} ج.م/شهر`} <ArrowLeft className="w-4 h-4" />
                </button>
              )}
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
                    <Check className="w-4 h-4 shrink-0" style={{ color: "var(--ai-accent)" }} />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="ai-section" id="faq" style={{ background: "var(--ai-bg-deep)" }}>
        <div className="ai-container" style={{ maxWidth: "720px" }}>
          <motion.div className="text-center mb-10" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: "-80px" }}>
            <span className="ai-kicker">الأسئلة الشائعة</span>
            <h2 className="ai-title" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)" }}>إجابات لأسئلتك</h2>
          </motion.div>
          <div>
            {faqs.map((faq, i) => (
              <div key={i} className={`ai-faq-item ${openFaq === i ? "open" : ""}`} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <div className="ai-faq-question">
                  <span>{faq.q}</span>
                  <ChevronDown className="ai-faq-icon w-4 h-4" />
                </div>
                <div className="ai-faq-answer">{faq.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="ai-section" style={{ padding: "5rem 0" }}>
        <div className="ai-container">
          <motion.div className="text-center" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: "-80px" }}>
            <span className="ai-kicker">جهز تبدأ؟</span>
            <h2 className="ai-title" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", maxWidth: "600px", margin: "0 auto 1rem" }}>
              AI + Inbox Bundle — كل ما تحتاج لإدارة المحادثات والذكاء الاصطناعي
            </h2>
            <p className="ai-lead" style={{ margin: "0 auto 2rem" }}>
              ابدأ دلوقتي واربط حساباتك في ٥ دقايق. ضمان استرداد كامل ٧ أيام.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {activationType !== "paid" && (
                <button onClick={handleFreeActivate} disabled={subscribing} className="ai-btn ai-btn-primary">
                  {subscribing && actionType === "free" ? "جاري..." : "جرب مجانا"} <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              {activationType !== "free" && (
                <button onClick={handlePaidSubscribe} disabled={subscribing} className="ai-btn ai-btn-secondary">
                  {subscribing && actionType === "paid" ? "جاري..." : `اشترك ب ${bundle ? bundle.monthlyPrice.toLocaleString("ar-EG") : "٩٩٩"} ج.م`}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="ai-footer">
        <div className="ai-container">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="ai-brand"><span className="ai-brand-dot" /> Max P AI + Inbox</div>
            <div className="flex gap-4 text-xs">
              <a href="/apps/legal" style={{ color: "var(--ai-text-muted)" }}>الخصوصية</a>
              <a href="/apps/legal" style={{ color: "var(--ai-text-muted)" }}>الشروط</a>
              <a href="/" style={{ color: "var(--ai-text-muted)" }}>الرئيسية</a>
            </div>
            <div className="text-xs" style={{ color: "var(--ai-text-muted)" }}>© 2026 Max P. كل الحقوق محفوظة.</div>
          </div>
        </div>
      </footer>

      {/* WhatsApp Float */}
      <a href="https://wa.me/201123087745" target="_blank" rel="noopener noreferrer" aria-label="تواصل عبر واتساب"
        className="fixed bottom-6 left-6 z-40 w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
        style={{ background: "var(--ai-accent)" }}
      >
        <WhatsAppIcon title="واتساب" />
      </a>
    </div>
  );
};

export default AiInboxLanding;
