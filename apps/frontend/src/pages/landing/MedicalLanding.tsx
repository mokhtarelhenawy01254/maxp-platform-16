import React, { useState, useEffect } from "react";
import i18n from "../../i18n";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, Bot, Users, BarChart3, Check, ChevronDown,
  ArrowLeft, Building2, Stethoscope, Calendar, Syringe,
  Sparkles, Zap, Shield, Clock, Menu, X, Star, Heart, Search,
  TrendingUp, Phone, Smartphone,
} from "lucide-react";
import { usePlatformSiteMetaPixel } from "../../hooks/usePlatformSiteMetaPixel";
import "./medicalLanding.css";

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

const agents = [
  { name: "شهد", role: "استشارية تجميل", emoji: "✨", color: "#ec4899", bg: "rgba(236,72,153,0.15)" },
  { name: "أحمد", role: "علاج طبيعي", emoji: "💪", color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
  { name: "مروة", role: "منسقة أسنان", emoji: "🦷", color: "#a855f7", bg: "rgba(168,85,247,0.15)" },
  { name: "كريم", role: "تحاليل طبية", emoji: "🔬", color: "#0ea5e9", bg: "rgba(14,165,233,0.15)" },
  { name: "يارا", role: "دعم نفسي", emoji: "🌿", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
];

const painPoints = [
  { icon: "😤", title: "مريض ضايع", desc: "مريض كلمك الساعة ١١ بليل عايز يحجز — مفيش حد بيرد. الصبح حجز عند دكتور تاني وخسرته للأبد." },
  { icon: "📱", title: "واتساب فوضوي", desc: "المواعيد على واتسابك الشخصي، روشتة المريض ضايعة في الشات، ولو في أجازتك — مفيش حد يعرف حاجة." },
  { icon: "💰", title: "مرتب موظف كل شهر", desc: "بتدفع ٤٠٠٠-٦٠٠٠ ج.م لموظف استقبال — ومازال في أخطاء وتضاعف مواعيد ومريض زعَلان." },
  { icon: "🏥", title: "توسعك مكلف", desc: "عندك ٣ عيادات — كل واحدة شغالة لوحدها. مش عارف إيراد النهاردة من غير ما تكلم كل فرع على تليفون." },
];

const beforeAfterData = [
  {
    before: "العميل بيكلمك على واتساب عايز يحجز — مفيش رد ١٢ ساعة.",
    beforeResult: "خسارة: المريض راح لدكتور تاني",
    after: "الـ AI بيرد فوراً، يعرف المواعيد المتاحة، ويأكد الحجز.",
    afterResult: "كسبت: ٣٠٠ ج.م كشف — وانت نايم",
    loss: "خسارة ٣٠٠ ج.م",
    gain: "كسبان ٣٠٠ ج.م",
  },
  {
    before: "٣ عيادات — ٣ دفاتر منفصلة. مفيش تقارير. المحاسبة يوم القيامة.",
    beforeResult: "٣ ساعات كل يوم في المتابعة اليدوية",
    after: "لوحة تحكم واحدة — إيرادات كل فرع، مواعيد النهاردة، نسبة الإلغاءات.",
    afterResult: "تقرير كامل في ٣ ثواني",
    loss: "٣ ساعات/يوم ضايعة",
    gain: "٣ ثواني بس",
  },
  {
    before: "موظف استقبال ب ٥٠٠٠ ج.م — بيشتغل ٨ ساعات. بره الدوام مقفول.",
    beforeResult: "تكلفة شهرية ٥٠٠٠ + مواعيد ضايعة",
    after: "AI Agent شغال ٢٤ ساعة — يرد، يحجز، يؤكد، ويحول للبشري لو لزم.",
    afterResult: "توفير ٥٠٠٠ ج.م شهرياً + ولا مريض ضايع",
    loss: "٥٠٠٠ ج.م/شهر",
    gain: "توفير ٥٠٠٠ + مكسب من كل مريض",
  },
];

const features = [
  {
    icon: <Building2 className="w-6 h-6" />, title: "إدارة الفروع",
    desc: "ضيف فروع غير محدودة — كل فرع بأيام عمل وأوقات منفصلة. أيام رجالة/ستات.",
    tag: "غير محدود فروع",
  },
  {
    icon: <Stethoscope className="w-6 h-6" />, title: "إدارة الأطباء",
    desc: "ضيف أطباء، حدد تخصصاتهم، المواعيد المتاحة، وكل دكتور له جدول منفصل.",
    tag: "دكاترة غير محدود",
  },
  {
    icon: <Calendar className="w-6 h-6" />, title: "حجوزات المواعيد",
    desc: "حجز ذكي مع أيام منفصلة للرجال والنساء، تأكيد تلقائي، وإشعارات قبل الموعد.",
    tag: "حجوزات ذكية",
  },
  {
    icon: <Bot className="w-6 h-6" />, title: "٥ وكلاء ذكاء اصطناعي",
    desc: "شهد، أحمد، مروة، كريم، يارا — كل واحد متخصص في مجاله. بيستقبلوا المرضى ويردوا على استفساراتهم.",
    tag: "AI Agents",
  },
  {
    icon: <MessageCircle className="w-6 h-6" />, title: "واتساب بزنس",
    desc: "اربط واتسابك — المرضى يحجزوا ويستفسروا عبر واتساب. والـ AI يرد ويحجز نيابة عنك.",
    tag: "WhatsApp API",
  },
  {
    icon: <BarChart3 className="w-6 h-6" />, title: "تقارير وإحصائيات",
    desc: "Dashboard واحد — إيرادات، مواعيد، إلغاءات، أداء الأطباء. كل حاجة في شاشة.",
    tag: "تقارير لحظية",
  },
];

const testimonials = [
  { name: "د. أحمد عبد الرحمن", role: "صاحب مركز طبي — القاهرة", text: "كان عندي ٣ عيادات وكل واحدة شغالة بكراسة. بعد Max P، بقى عندي لوحة تحكم واحدة، والـ AI بيسأل على المرضى ويحجز مواعيد. إيراداتي زادت ٤٠٪ في أول شهرين.", rating: 5 },
  { name: "د. منى سامي", role: "استشارية تجميل — الإسكندرية", text: "أكتر حاجة عجبتني إن الـ AI بيرد على واتساب بدل ما أنا أو الريسيبشن نرد. وفرت مرتب موظف كامل — وشهد (الـ AI) بتساعد مرضاي يختاروا الجلسات المناسبة.", rating: 5 },
  { name: "د. خالد النجار", role: "مركز علاج طبيعي — جدة", text: "نظام الحجوزات مع أيام الرجالة والستات حل عبقري. والمواعيد مكررتش ولا مرة. التقارير بتخليني أعرف بالضبط كسبت كام كل شهر.", rating: 5 },
];

const faqs = [
  { q: "إيه اللي بيجيله في الباقة الطبية ب ٩٩٩ ج.م؟", a: "الباقة شاملة: النظام الطبي كامل (فروع، أطباء، خدمات، حجوزات، تقويم، تقارير) + واتساب بزنس (ربط واتساب العيادة) + ٥ وكلاء ذكاء اصطناعي (شهد، أحمد، مروة، كريم، يارا) كل واحد متخصص في مجاله. كل دا في باقة واحدة بسعر ٩٩٩ ج.م/شهر." },
  { q: "الـ AI Agents دول بيشتغلوا إزاي؟", a: "كل Agent عنده شخصية وتخصص معين. شهد للتجميل، أحمد للعلاج الطبيعي، مروة للأسنان، كريم للتحاليل، يارا للصحة النفسية. المريض بيكلمهم على واتساب أو الماسنجر ويسأل ويحجز — والـ AI بيرد بذكاء ويفهم العامية المصرية والفصحى." },
  { q: "هل أقدر أجرب قبل ما أشتري؟", a: "أيوة، في ١٤ يوم تجربة مجانية — كاملة بدون أي حدود. جرب النظام والوكلاء والواتساب. لو مش عاجبك، إلغاء بدون أي مصاريف." },
  { q: "هل ينفع لمشترك في النظام الطبي القديم ٢٤٩ ج.م؟", a: "أكيد. تقدر ترقي للباقة الشاملة ٩٩٩ ج.م وتضيف واتساب والوكلاء. أو تكمل على باقتك الحالية وتضيف واتساب أو AI Agents كإضافات منفصلة." },
  { q: "هل في دعم فني عربي؟", a: "أيوة، الدعم الفني متخصص في النظام الطبي — يعرف مشاكلك ويساعدك في أي حاجة. متاح واتساب وتليفون ٢٤ ساعة." },
  { q: "هل أقدر أسترد فلوسي لو مش عجبني؟", a: "أيوة، ضمان استرداد كامل خلال أول ٧ أيام من الاشتراك المدفوع. من غير ما تسأل سؤال." },
];

type BundleInfo = {
  slug: string; name: string; monthlyPrice: number; discount: number; appSlugs: string[];
};

const LP_SLUG = "medical";

const MedicalLanding: React.FC = () => {
  const navigate = useNavigate();
  usePlatformSiteMetaPixel();
  const [isScrolled, setIsScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [bundle, setBundle] = useState<BundleInfo | null>(null);
  const [activationType, setActivationType] = useState<string>("both");

  useEffect(() => {
    document.title = "Max P الباقة الطبية | النظام الطبي + واتساب + AI Agents";

    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[property="${name}"]`) as HTMLMetaElement | null;
      if (!el) { el = document.createElement("meta"); el.setAttribute("property", name); document.head.appendChild(el); }
      el.content = content;
    };
    setMeta("og:title", "Max P الباقة الطبية — النظام الطبي المتكامل + واتساب + AI Agents");
    setMeta("og:description", "النظام الطبي، واتساب بزنس، و ٥ وكلاء ذكاء اصطناعي في باقة واحدة ب ٩٩٩ ج.م/شهر. وفر ٥٠٠٠ ج.م شهرياً من رواتب الموظفين.");
    setMeta("og:type", "website");
    setMeta("og:url", window.location.href);
    setMeta("og:locale", "ar_AR");
    let descEl = document.querySelector("meta[name=\"description\"]") as HTMLMetaElement | null;
    if (!descEl) { descEl = document.createElement("meta"); descEl.name = "description"; document.head.appendChild(descEl); }
    descEl.content = "الباقة الطبية الشاملة من Max P — النظام الطبي + واتساب بزنس + ٥ وكلاء AI. ب ٩٩٩ ج.م/شهر.";

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
      navigate(`/auth/register?source=${LP_SLUG}&theme=medical&redirect=/lp/${LP_SLUG}&action=free`);
      return;
    }
    if (!bundle) { alert(i18n.t("MedicalLanding.msg_9147")); return; }
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
        navigate("/admin");
      } else {
        alert(data.message || i18n.t("MedicalLanding.msg_da67"));
        setSubscribing(false);
      }
    } catch {
      alert(i18n.t("MedicalLanding.msg_94ce"));
      setSubscribing(false);
    }
  };

  const handlePaidSubscribe = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      navigate(`/auth/register?source=${LP_SLUG}&theme=medical&redirect=/lp/${LP_SLUG}&action=paid`);
      return;
    }
    if (!bundle) { alert(i18n.t("MedicalLanding.msg_9147")); return; }
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
        alert(data.message || i18n.t("MedicalLanding.failed_create_2bac"));
        setSubscribing(false);
      }
    } catch {
      alert(i18n.t("MedicalLanding.msg_94ce"));
      setSubscribing(false);
    }
  };

  const handleSubscribe = bundle && activationType === "paid" ? handlePaidSubscribe
    : bundle && activationType === "free" ? handleFreeActivate
    : handlePaidSubscribe;

  const priceDisplay = bundle ? bundle.monthlyPrice.toLocaleString("ar-EG") : "٩٩٩";

  const originalTotal = bundle && bundle.discount > 0
    ? Math.round(Number(bundle.monthlyPrice) / (1 - Number(bundle.discount) / 100)).toLocaleString("ar-EG")
    : "١,٥٨٧";

  return (
    <div className="med-landing" dir="rtl">
      <nav className={`med-nav ${isScrolled ? "is-scrolled" : ""}`}>
        <div className="med-brand">
          <Heart className="w-5 h-5" style={{ color: "var(--med-warm)" }} />
          <span>Max P <span style={{ color: "var(--med-accent-light)" }}>الطبية</span></span>
        </div>
        <div className="med-nav-links">
          <a href="#problems">المشكلة</a>
          <a href="#features">المميزات</a>
          <a href="#agents">الوكلاء</a>
          <a href="#pricing">الأسعار</a>
          <a href="#faq">الأسئلة</a>
        </div>
        <div className="med-nav-actions">
          <Link to="/auth/login" className="med-btn med-btn-ghost med-nav-login">تسجيل الدخول</Link>
          {activationType !== "paid" && (
            <button onClick={handleFreeActivate} disabled={subscribing} className="med-btn med-btn-primary med-nav-subscribe">جرب ١٤ يوم مجانا</button>
          )}
          {activationType !== "free" && (
            <button onClick={handlePaidSubscribe} disabled={subscribing} className="med-btn med-btn-primary med-nav-subscribe">{priceDisplay} ج.م</button>
          )}
          <button className="med-mobile-toggle" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} aria-label={isMobileMenuOpen ? "إغلاق القائمة" : "فتح القائمة"}>
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>
      {isMobileMenuOpen && (
        <div className="med-mobile-menu">
          <a href="#problems" onClick={() => setIsMobileMenuOpen(false)}>المشكلة</a>
          <a href="#features" onClick={() => setIsMobileMenuOpen(false)}>المميزات</a>
          <a href="#agents" onClick={() => setIsMobileMenuOpen(false)}>الوكلاء</a>
          <a href="#pricing" onClick={() => setIsMobileMenuOpen(false)}>الأسعار</a>
          <a href="#faq" onClick={() => setIsMobileMenuOpen(false)}>الأسئلة</a>
          <div className="med-mobile-menu-divider" />
          <Link to="/auth/login" onClick={() => setIsMobileMenuOpen(false)}>تسجيل الدخول</Link>
          {activationType !== "paid" && (
            <button onClick={() => { setIsMobileMenuOpen(false); handleFreeActivate(); }} className="med-btn med-btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: "0.25rem" }}>جرب ١٤ يوم مجانا</button>
          )}
          {activationType !== "free" && (
            <button onClick={() => { setIsMobileMenuOpen(false); handlePaidSubscribe(); }} className="med-btn med-btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: "0.25rem" }}>{priceDisplay} ج.م</button>
          )}
        </div>
      )}

      {/* ── Hero ── */}
      <section className="med-section" style={{ paddingTop: "8rem" }}>
        <div className="med-container">
          <motion.div className="flex flex-col lg:flex-row items-center gap-12" variants={containerVariants} initial="hidden" animate="visible">
            <div className="flex-1">
              <motion.div variants={itemVariants}>
                <span className="med-kicker"><Heart className="w-4 h-4" /> النظام الطبي + واتساب + AI Agents</span>
              </motion.div>
              <motion.h1 variants={itemVariants} className="med-title">
                <span className="med-title-gradient">عياداتك كلها</span> في نظام واحد<br />
                والـ AI يرد ويحجز نيابة عنك
              </motion.h1>
              <motion.p variants={itemVariants} className="med-lead">
                إدارة الفروع والأطباء والمواعيد — كل حاجة من لوحة تحكم واحدة.
                ٥ وكلاء ذكاء اصطناعي بشخصيات بشرية يردوا على مرضاك ويحجزوا مواعيد — ٢٤ ساعة.
                واتساب بزنس مربوط — كل حاجة في باقة واحدة.
              </motion.p>
              <motion.div variants={itemVariants} className="flex flex-wrap gap-3 mb-6">
                {activationType !== "paid" && (
                  <button onClick={handleFreeActivate} disabled={subscribing} className="med-btn med-btn-primary">
                    {subscribing && actionType === "free" ? "جاري..." : "جرب ١٤ يوم مجانا"} <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                {activationType !== "free" && (
                  <button onClick={handlePaidSubscribe} disabled={subscribing} className="med-btn med-btn-secondary">
                    {subscribing && actionType === "paid" ? "جاري..." : `اشترك ب ${priceDisplay} ج.م`}
                  </button>
                )}
                <a href="#features" className="med-btn med-btn-ghost">شوف المميزات</a>
              </motion.div>
              <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-4 text-sm" style={{ color: "var(--med-text-muted)" }}>
                <div className="flex gap-1">
                  {["م","ك","ع"].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-[var(--med-panel)] bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white">{i}</div>
                  ))}
                </div>
                <span>أكتر من <strong style={{ color: "var(--med-text-main)" }}>٢٠٠+</strong> مركز طبي وعيادة شغالة على Max P</span>
              </motion.div>
            </div>
            <motion.div variants={itemVariants} className="flex-1 w-full">
              <div className="med-card" style={{ padding: "1.5rem" }}>
                <div className="flex items-center gap-2 mb-4">
                  <WhatsAppIcon />
                  <span className="text-sm font-bold">واتساب العيادة — محادثة واردة</span>
                  <span className="med-badge med-badge-save mr-auto">AI Agent شغال</span>
                </div>
                <div className="med-chat">
                  <div className="med-chat-header">
                    <div className="med-chat-dots"><span /><span /><span /></div>
                    <div className="flex-1 text-center text-sm font-bold">محادثة حجز موعد</div>
                    <Bot className="w-4 h-4" style={{ color: "var(--med-accent)" }} />
                  </div>
                  <div className="med-chat-body" style={{ minHeight: "260px" }}>
                    <AnimatePresence>
                      {showChat && [
                        { role: "patient", text: "السلام عليكم .. عايز أحجز عند دكتور أحمد بكره", delay: 0 },
                        { role: "ai", text: "وعليكم السلام 👋 دكتور أحمد متاح بكره الساعة ٤ العصر و ٦ المساء. أي وقت يناسب حضرتك؟", delay: 1200 },
                        { role: "patient", text: "٦ المساء أحسن", delay: 2400 },
                        { role: "ai", text: "تم تأكيد موعدك بكره الساعة ٦ مع دكتور أحمد ✅\nالعنوان: ٢٤ شارع النيل — الدور ٣\nهنتذكرك قبل الموعد بساعة", delay: 3500 },
                        { role: "patient", text: "تمام شكراً 💚", delay: 4600 },
                        { role: "ai", text: "الشكر لله 🤝 لو عايز تعرف عن باقتنا حقن فيتامينات — في عرض خاص الشهر ده", delay: 5500 },
                      ].map((msg, i) => (
                        <motion.div
                          key={i}
                          className={`med-message ${msg.role}`}
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
                      style={{ color: "var(--med-text-muted)" }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 6.5 }}
                    >
                      <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                      تم الحجز بالكامل · رد آلي · بدون تدخل بشري
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Social Proof Strip ── */}
      <section className="med-section" style={{ padding: "2rem 0" }}>
        <div className="med-container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { num: "٢٠٠+", label: "عيادة ومركز طبي", sub: "شغالة على النظام" },
              { num: "٩٥٪", label: "حجوزات بيحلها الـ AI", sub: "بدون تدخل بشري" },
              { num: "٥٠٠٠+", label: "ج.م توفير شهرياً", sub: "في رواتب موظفين الاستقبال" },
              { num: "١٤", label: "يوم تجربة مجانية", sub: "كاملة بدون حدود" },
            ].map((s, i) => (
              <motion.div key={i} className="text-center p-4"
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              >
                <div className="text-2xl font-black" style={{ color: "var(--med-accent-light)" }}>{s.num}</div>
                <div className="font-bold text-sm">{s.label}</div>
                <div className="text-xs" style={{ color: "var(--med-text-muted)" }}>{s.sub}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pain Points ── */}
      <section className="med-section" id="problems" style={{ background: "var(--med-bg-deep)" }}>
        <div className="med-container">
          <motion.div className="text-center mb-12" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: "-80px" }}>
            <span className="med-kicker"><span className="med-title-gradient-warm">المشكلة</span></span>
            <h2 className="med-title" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)" }}>كدا بتخسر فلوس ومرضى .. واحنا عندنا الحل</h2>
            <p className="med-lead" style={{ margin: "0 auto" }}>٤ مشاكل كل صاحب عيادة يعاني منها — واحنا بنحلها كلها في باقة واحدة</p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {painPoints.map((p, i) => (
              <motion.div key={i} className="med-card med-card-warm" style={{ padding: "1.5rem" }}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              >
                <div className="text-3xl mb-3">{p.icon}</div>
                <h3 className="font-bold mb-1">{p.title}</h3>
                <p className="text-sm" style={{ color: "var(--med-text-muted)" }}>{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Before / After ── */}
      <section className="med-section">
        <div className="med-container">
          <motion.div className="text-center mb-12" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: "-80px" }}>
            <span className="med-kicker">قبل / بعد</span>
            <h2 className="med-title" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)" }}>الفرق بين نظامك الحالي و Max P</h2>
          </motion.div>
          <div className="space-y-6">
            {beforeAfterData.map((item, i) => (
              <motion.div key={i} className="med-card" style={{ padding: "1.5rem" }}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              >
                <div className="med-comparison-grid">
                  <div className="med-comparison-col before">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="med-badge med-badge-warm">قبل</span>
                      <span className="text-xs font-bold" style={{ color: "#fb7185" }}>{item.loss}</span>
                    </div>
                    <p className="text-sm mb-2">{item.before}</p>
                    <div className="flex items-center gap-1 text-xs font-bold" style={{ color: "#fb7185" }}>
                      <X className="w-3 h-3" /> {item.beforeResult}
                    </div>
                  </div>
                  <div className="med-comparison-col after">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="med-badge med-badge-save">بعد</span>
                      <span className="text-xs font-bold" style={{ color: "var(--med-accent-light)" }}>{item.gain}</span>
                    </div>
                    <p className="text-sm mb-2">{item.after}</p>
                    <div className="flex items-center gap-1 text-xs font-bold" style={{ color: "#22c55e" }}>
                      <Check className="w-3 h-3" /> {item.afterResult}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="med-section" id="features" style={{ background: "var(--med-bg-deep)" }}>
        <div className="med-container">
          <motion.div className="text-center mb-12" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: "-80px" }}>
            <span className="med-kicker">المميزات</span>
            <h2 className="med-title" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)" }}>كل اللي محتاجه عشان تدير عياداتك</h2>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div key={i} className="med-card med-card-accent" style={{ padding: "1.8rem" }}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="med-badge med-badge-save">{f.tag}</span>
                </div>
                <div className="flex items-center gap-2 mb-2" style={{ color: "var(--med-accent-light)" }}>{f.icon}</div>
                <h3 className="text-lg font-bold mb-1">{f.title}</h3>
                <p className="text-sm" style={{ color: "var(--med-text-muted)" }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Agents ── */}
      <section className="med-section" id="agents">
        <div className="med-container">
          <motion.div className="text-center mb-12" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: "-80px" }}>
            <span className="med-kicker"><Bot className="w-4 h-4" /> AI Agents</span>
            <h2 className="med-title" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)" }}>فريق كامل شغال ٢٤ ساعة — من غير مرتبات</h2>
            <p className="med-lead" style={{ margin: "0 auto" }}>٥ وكلاء ذكاء اصطناعي — كل واحد متخصص في مجاله، بشخصية بشرية، بيفهم العامية المصرية والفصحى</p>
          </motion.div>
          <div className="grid md:grid-cols-5 gap-4">
            {agents.map((agent, i) => (
              <motion.div key={i} className="med-card text-center" style={{ padding: "1.5rem", borderColor: `${agent.color}25` }}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              >
                <div className="med-agent-avatar mx-auto mb-3" style={{ background: agent.bg, color: agent.color, border: `2px solid ${agent.color}30` }}>
                  {agent.emoji}
                </div>
                <h3 className="font-bold text-lg">{agent.name}</h3>
                <p className="text-xs mb-2" style={{ color: agent.color }}>{agent.role}</p>
                <p className="text-xs" style={{ color: "var(--med-text-muted)" }}>
                  {["استشارات تجميل وبشرة", "علاج طبيعي وتأهيل", "حجوزات الأسنان", "تحاليل طبية", "دعم نفسي"][i]}
                </p>
              </motion.div>
            ))}
          </div>
          <motion.div className="text-center mt-8" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            <p className="text-sm" style={{ color: "var(--med-text-muted)" }}>
              كل Agent ليه شخصيته، طريقته في الكلام، وتخصصه — <strong style={{ color: "var(--med-text-main)" }}>وكلهم شغالين في باقتك</strong>
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="med-section" style={{ background: "var(--med-bg-deep)" }}>
        <div className="med-container">
          <motion.div className="text-center mb-12" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: "-80px" }}>
            <span className="med-kicker">طريقة العمل</span>
            <h2 className="med-title" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)" }}>تبدأ في ١٠ دقايق بس</h2>
          </motion.div>
          <div className="flex flex-col md:flex-row gap-8">
            {[
              { num: "١", title: "اربط واتسابك", desc: "استخدم QR كود أو WhatsApp API. الربط في أقل من دقيقتين.", icon: <Smartphone className="w-6 h-6" /> },
              { num: "٢", title: "ضيف أطباءك وفروعك", desc: "ضيف دكاترة، حدد تخصصاتهم، وحدد أيام العمل لكل فرع.", icon: <Building2 className="w-6 h-6" /> },
              { num: "٣", title: "فعل الـ AI Agents", desc: "الوكلاء بيبدأوا يستقبلوا المرضى ويحجزوا مواعيد — أوتوماتيك.", icon: <Bot className="w-6 h-6" /> },
            ].map((s, i) => (
              <motion.div key={i} className="flex-1 text-center"
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.12 }}
              >
                <div className="w-16 h-16 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mx-auto mb-4" style={{ color: "var(--med-accent-light)" }}>{s.icon}</div>
                <div className="med-timeline-step justify-center mb-2">
                  <div className="med-timeline-number" style={{ background: "var(--med-accent)", color: "#fff" }}>{s.num}</div>
                </div>
                <h3 className="font-bold text-lg mb-1">{s.title}</h3>
                <p className="text-sm" style={{ color: "var(--med-text-muted)" }}>{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="med-section">
        <div className="med-container">
          <motion.div className="text-center mb-12" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: "-80px" }}>
            <span className="med-kicker"><Star className="w-4 h-4" /> آراء العملاء</span>
            <h2 className="med-title" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)" }}>أصحاب عيادات زيك — والنتائج حقيقية</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <motion.div key={i} className="med-card" style={{ padding: "1.8rem" }}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              >
                <div className="flex gap-1 mb-3" style={{ color: "var(--med-accent-light)" }}>
                  {Array.from({ length: t.rating }).map((_, si) => <Star key={si} className="w-4 h-4 fill-current" />)}
                </div>
                <p className="text-sm mb-4" style={{ color: "var(--med-text-muted)", lineHeight: 1.7 }}>"{t.text}"</p>
                <div>
                  <div className="font-bold text-sm">{t.name}</div>
                  <div className="text-xs" style={{ color: "var(--med-text-muted)" }}>{t.role}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="med-section" id="pricing" style={{ background: "var(--med-bg-deep)" }}>
        <div className="med-container">
          <motion.div className="text-center mb-10" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: "-80px" }}>
            <span className="med-kicker">باقة واحدة — كل حاجة</span>
            <h2 className="med-title" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)" }}>وفر ٥٠٠٠ ج.م شهرياً من رواتب الموظفين</h2>
          </motion.div>
          <motion.div className="max-w-md mx-auto" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <div className="med-pricing-card featured text-center">
              <div className="flex justify-center gap-2 mb-4">
                <span className="med-badge med-badge-save">توفير {(bundle?.discount ?? 37).toLocaleString("ar-EG")}٪</span>
                <span className="med-badge med-badge-gold">الباقة الأكثر طلباً</span>
              </div>
              {bundle && bundle.discount > 0 && (
                <div className="med-price-original mb-1">{originalTotal} ج.م/شهر</div>
              )}
              {!bundle && <div className="med-price-original mb-1">١,٥٨٧ ج.م/شهر</div>}
              <div className="med-price mb-2">{priceDisplay} ج.م<span className="text-base font-normal" style={{ color: "var(--med-text-muted)" }}>/شهر</span></div>
              <p className="text-xs mb-6" style={{ color: "var(--med-text-muted)" }}>ضمان استرداد كامل خلال ٧ أيام — من غير ما تسأل</p>
              {activationType === "both" ? (
                <div className="flex flex-col gap-2 mb-6">
                  <button onClick={handlePaidSubscribe} disabled={subscribing} className="med-btn med-btn-primary w-full justify-center">
                    {subscribing && actionType === "paid" ? "جاري..." : `اشترك ب ${priceDisplay} ج.م/شهر`} <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button onClick={handleFreeActivate} disabled={subscribing} className="med-btn med-btn-secondary w-full justify-center">
                    {subscribing && actionType === "free" ? "جاري..." : "جرب ١٤ يوم مجانا"}
                  </button>
                </div>
              ) : (
                <button onClick={handleSubscribe} disabled={subscribing} className="med-btn med-btn-primary w-full justify-center mb-6">
                  {subscribing ? "جاري..." : activationType === "free" ? "جرب ١٤ يوم مجانا" : `اشترك ب ${priceDisplay} ج.م/شهر`} <ArrowLeft className="w-4 h-4" />
                </button>
              )}

              {/* Value breakdown */}
              <div className="text-right mb-4 p-3 rounded-xl" style={{ background: "var(--med-bg)", border: "1px solid var(--med-panel-border)" }}>
                <div className="text-xs font-bold mb-2" style={{ color: "var(--med-text-muted)" }}>قيمة المنتجات لو منفصلة:</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between"><span>النظام الطبي</span><span style={{ color: "var(--med-text-muted)" }}>٢٤٩ ج.م</span></div>
                  <div className="flex justify-between"><span>واتساب بزنس (Unified Inbox)</span><span style={{ color: "var(--med-text-muted)" }}>٢٩٩ ج.م</span></div>
                  <div className="flex justify-between"><span>AI Agents (٥ وكلاء)</span><span style={{ color: "var(--med-text-muted)" }}>٧٩٩ ج.م</span></div>
                  <div className="border-t border-[var(--med-panel-border)] my-1" />
                  <div className="flex justify-between font-bold"><span>المجموع</span><span style={{ color: "#fb7185" }}>١,٣٤٧ ج.م</span></div>
                  <div className="flex justify-between font-bold" style={{ color: "var(--med-accent-light)" }}><span>سعر الباقة</span><span>{priceDisplay} ج.م</span></div>
                  <div className="flex justify-between font-bold" style={{ color: "#22c55e" }}><span>توفير</span><span>٣٤٨ ج.م شهرياً</span></div>
                </div>
              </div>

              <div className="space-y-3 text-right">
                {[
                  "النظام الطبي — فروع، أطباء، خدمات، مواعيد، تقويم، تقارير",
                  "واتساب بزنس — ربط واتساب العيادة مع الرد التلقائي",
                  "٥ وكلاء AI — شهد، أحمد، مروة، كريم، يارا",
                  "أيام منفصلة للرجال والنساء في الحجوزات",
                  "صفحة حجز عامة — المرضى يحجزوا بدون تسجيل",
                  "فريق غير محدود — صلاحيات، ملاحظات، تقارير أداء",
                  "دعم فني عربي — ٢٤ ساعة — ٧ أيام",
                  "ضمان استرداد كامل ٧ أيام",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 shrink-0" style={{ color: "var(--med-accent)" }} />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="med-section" id="faq">
        <div className="med-container" style={{ maxWidth: "720px" }}>
          <motion.div className="text-center mb-10" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: "-80px" }}>
            <span className="med-kicker">الأسئلة الشائعة</span>
            <h2 className="med-title" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)" }}>إجابات لأسئلتك</h2>
          </motion.div>
          <div>
            {faqs.map((faq, i) => (
              <div key={i} className={`med-faq-item ${openFaq === i ? "open" : ""}`} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <div className="med-faq-question">
                  <span>{faq.q}</span>
                  <ChevronDown className="med-faq-icon w-4 h-4" />
                </div>
                <div className="med-faq-answer">{faq.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="med-section" style={{ padding: "5rem 0", background: "var(--med-bg-deep)" }}>
        <div className="med-container">
          <motion.div className="text-center" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: "-80px" }}>
            <span className="med-kicker">جهز تبدأ؟</span>
            <h2 className="med-title" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", maxWidth: "600px", margin: "0 auto 1rem" }}>
              عياداتك في نظام واحد — والـ AI يشتغل نيابة عنك
            </h2>
            <p className="med-lead" style={{ margin: "0 auto 2rem" }}>
              ابدأ دلوقتي في ١٠ دقايق. ١٤ يوم تجربة مجانية. ضمان استرداد كامل ٧ أيام.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {activationType !== "paid" && (
                <button onClick={handleFreeActivate} disabled={subscribing} className="med-btn med-btn-primary">
                  {subscribing && actionType === "free" ? "جاري..." : "جرب ١٤ يوم مجانا"} <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              {activationType !== "free" && (
                <button onClick={handlePaidSubscribe} disabled={subscribing} className="med-btn med-btn-secondary">
                  {subscribing && actionType === "paid" ? "جاري..." : `اشترك ب ${priceDisplay} ج.م`}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="med-footer">
        <div className="med-container">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="med-brand"><Heart className="w-5 h-5" style={{ color: "var(--med-warm)" }} /> Max P الباقة الطبية</div>
            <div className="flex gap-4 text-xs">
              <a href="/apps/legal" style={{ color: "var(--med-text-muted)" }}>الخصوصية</a>
              <a href="/apps/legal" style={{ color: "var(--med-text-muted)" }}>الشروط</a>
              <a href="/" style={{ color: "var(--med-text-muted)" }}>الرئيسية</a>
            </div>
            <div className="text-xs" style={{ color: "var(--med-text-muted)" }}>© 2026 Max P. كل الحقوق محفوظة.</div>
          </div>
        </div>
      </footer>

      {/* WhatsApp Float */}
      <a href="https://wa.me/201123087745" target="_blank" rel="noopener noreferrer" aria-label="تواصل عبر واتساب"
        className="fixed bottom-6 left-6 z-40 w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
        style={{ background: "var(--med-accent)" }}
      >
        <WhatsAppIcon title="واتساب" />
      </a>
    </div>
  );
};

export default MedicalLanding;
