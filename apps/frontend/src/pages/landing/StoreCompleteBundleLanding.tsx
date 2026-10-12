import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Store,
  GitFork,
  MessageSquare,
  Bot,
  Layers,
  Truck,
  Warehouse,
  RotateCcw,
  BarChart3,
  TrendingUp,
  Share2,
  Inbox,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  ShieldCheck,
  Zap,
  Clock,
  PhoneCall,
  Check,
  ChevronDown,
  Building2,
  Activity,
  FileCheck,
} from "lucide-react";
import tokenManager from "../../utils/tokenManager";

interface BundleApp {
  id: string;
  name: string;
  price: number;
  category: "store" | "comms" | "logistics" | "analytics";
  description: string;
  icon: React.ElementType;
}

const INCLUDED_APPS: BundleApp[] = [
  {
    id: "store",
    name: "المتجر الإلكتروني المتكامل",
    price: 699,
    category: "store",
    description: "إدارة الطلبات والمنتجات وواجهة المتجر السريعة — متجرك جاهز للبيع بضغطة واحدة.",
    icon: Store,
  },
  {
    id: "order-pipeline",
    name: "مسار الطلبات المخصص",
    price: 149,
    category: "store",
    description: "ترتيب الحالات وسلسلة معالجة الأوردر المخصصة من الاستلام حتى التأكيد والتسليم.",
    icon: GitFork,
  },
  {
    id: "whatsapp-api",
    name: "WhatsApp Business API",
    price: 350,
    category: "comms",
    description: "ربط رسمي مباشر لإرسال إشعارات تأكيد الأوردر، تتبع الشحنات، والردود الفورية.",
    icon: MessageSquare,
  },
  {
    id: "chat-automation",
    name: "أتمتة المحادثات والرد الآلي",
    price: 149,
    category: "comms",
    description: "بوت محادثات ذكي على واتساب وفيسبوك بردود الكلمات المفتاحية وفلوهات الشراء السريعة.",
    icon: Bot,
  },
  {
    id: "bulk-orders",
    name: "معالجة الطلبات الجماعية",
    price: 99,
    category: "store",
    description: "تغيير الحالات، الفلترة، الطباعة، والإسناد لمئات الطلبات دفعة واحدة بنقرة واحدة.",
    icon: Layers,
  },
  {
    id: "order-prep",
    name: "تجهيز الطلبات ومعالجة النواقص",
    price: 0,
    category: "store",
    description: "متابعة الطلبات المعلقة في التجهيز ومشاكل النواقص والتوريد لتسريع الشحن الفوري.",
    icon: FileCheck,
  },
  {
    id: "smart-shipping",
    name: "بوابة شركات الشحن الذكي",
    price: 149,
    category: "logistics",
    description: "ربط آلي مع Bosta، Turbo، Aramex، وQP Express: إصدار بوالص لحظية وتتبع وتسويات.",
    icon: Truck,
  },
  {
    id: "inventory",
    name: "المخزون والمستودعات الشامل",
    price: 199,
    category: "logistics",
    description: "إدارة المستودعات المتعددة، تتبع الكميات الحية، تنبيهات النواقص، والجرد السريع.",
    icon: Warehouse,
  },
  {
    id: "returns-settings",
    name: "إعدادات وقواعد المرتجعات",
    price: 99,
    category: "logistics",
    description: "تحديد شروط وسياسات الإرجاع، ومسارات فحص الشحنات المرتجعة والمستلمة.",
    icon: RotateCcw,
  },
  {
    id: "returns-reasons",
    name: "تحليلات أسباب المرتجعات",
    price: 99,
    category: "logistics",
    description: "تشخيص دقيق لأسباب الارتجاع المتكررة لعلاجها ورفع نسبة الاستلام الفعلي.",
    icon: Activity,
  },
  {
    id: "orders-analytics",
    name: "تحليلات الطلبات المتقدمة",
    price: 99,
    category: "analytics",
    description: "مؤشرات الطلبات النقدية والمسبقة الدفع وتوزيع الحالات والمقارنات الزمنية.",
    icon: BarChart3,
  },
  {
    id: "profit-analytics",
    name: "تحليلات الأرباح وهوامش الربح",
    price: 99,
    category: "analytics",
    description: "حساب صافي الأرباح والتكاليف وهامش الربحية الحقيقي لكل منتج وحملة.",
    icon: TrendingUp,
  },
  {
    id: "campaign-attribution",
    name: "إسناد الحملات (Attribution)",
    price: 149,
    category: "analytics",
    description: "تتبع مصدر كل أوردر بالـ UTM وClick ID والمنصة لمعرفة الإعلان الرابح بالضبط.",
    icon: Share2,
  },
  {
    id: "campaign-data",
    name: "بيانات الحملات التسويقية",
    price: 0,
    category: "analytics",
    description: "لوحة موحدة لربط نتائج المبيعات بالأداء الإعلاني المباشر دون تشتت.",
    icon: Activity,
  },
  {
    id: "meta-ads",
    name: "إعلانات فيسبوك وانستجرام الذكية",
    price: 199,
    category: "analytics",
    description: "إدارة الحملات الإعلانية ومزامنة الكتالوج مع تحسينات أداء مبنية على المبيعات.",
    icon: Zap,
  },
  {
    id: "meta-pages",
    name: "ربط صفحات فيسبوك والمنشورات",
    price: 99,
    category: "comms",
    description: "إدارة ربط الصفحات، الردود على التعليقات، وتوجيه العملاء للشراء المباشر.",
    icon: Building2,
  },
  {
    id: "unified-inbox",
    name: "صندوق الوارد الموحد (Unified Inbox)",
    price: 299,
    category: "comms",
    description: "تجميع محادثات واتساب، فيسبوك، وانستجرام في شاشة مركزية واحدة مع فريقك.",
    icon: Inbox,
  },
];

export const StoreCompleteBundleLanding: React.FC = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    document.title = "باقة المتجر الكاملة — 17 أداة في باقة واحدة | MaxP";
    window.scrollTo(0, 0);
  }, []);

  const handleStartTrial = () => {
    const token = tokenManager.getAccessToken ? tokenManager.getAccessToken() : tokenManager.getToken?.();
    if (token) {
      navigate("/marketplace/bundle/store-complete-bundle");
    } else {
      navigate(
        "/auth/register?landingBundle=store-complete-bundle&action=trial&redirect=/marketplace/bundle/store-complete-bundle"
      );
    }
  };

  const handleSubscribeNow = () => {
    const token = tokenManager.getAccessToken ? tokenManager.getAccessToken() : tokenManager.getToken?.();
    if (token) {
      navigate("/marketplace/bundle/store-complete-bundle");
    } else {
      navigate(
        "/auth/register?landingBundle=store-complete-bundle&action=paid&redirect=/marketplace/bundle/store-complete-bundle"
      );
    }
  };

  const filteredApps =
    selectedCategory === "all"
      ? INCLUDED_APPS
      : INCLUDED_APPS.filter((a) => a.category === selectedCategory);

  const totalSeparatePrice = INCLUDED_APPS.reduce((acc, curr) => acc + curr.price, 0);

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 font-sans selection:bg-blue-600 selection:text-white" dir="rtl">
      {/* Top Notification Bar */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-700 text-white text-xs sm:text-sm py-2 px-4 text-center font-medium shadow-inner">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
          <span>عرض الإطلاق الحصري: وفّر 1,937 ج.م شهرياً (خصم 66%) مع تجربة مجانية لمدة 7 أيام!</span>
          <button
            onClick={handleStartTrial}
            className="hidden md:inline-flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white font-bold px-2.5 py-0.5 rounded-full transition-colors text-xs"
          >
            جرّب الآن مجاناً &larr;
          </button>
        </div>
      </div>

      {/* Main Navbar */}
      <nav className="sticky top-0 z-50 bg-[#07090E]/90 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
                M
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg text-white leading-tight">MaxP</span>
                <span className="text-[10px] text-blue-400 font-medium">منظومة التجارة المتكاملة</span>
              </div>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm text-slate-300">
            <a href="#features" className="hover:text-blue-400 transition-colors">محتويات الباقة (17 أداة)</a>
            <a href="#savings" className="hover:text-blue-400 transition-colors">معادلة التوفير</a>
            <a href="#pricing" className="hover:text-blue-400 transition-colors">الأسعار والاشتراك</a>
            <a href="#faq" className="hover:text-blue-400 transition-colors">الأسئلة الشائعة</a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/auth/login?redirect=/marketplace/bundle/store-complete-bundle"
              className="text-xs sm:text-sm text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors"
            >
              تسجيل الدخول
            </Link>
            <button
              onClick={handleStartTrial}
              className="text-xs sm:text-sm bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg transition-all shadow-md shadow-blue-600/25 active:scale-95"
            >
              ابدأ 7 أيام مجاناً
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 bg-blue-950/60 border border-blue-800/60 px-3.5 py-1.5 rounded-full text-blue-300 text-xs sm:text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
              <span>الحل النهائي لمتاجر التجارة الإلكترونية في مصر</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.2]">
              17 أداة تشغيل في باقة واحدة
              <span className="block mt-2 bg-gradient-to-r from-blue-400 via-indigo-300 to-sky-400 bg-clip-text text-transparent">
                كل ما يحتاجه متجرك بـ 999 ج.م فقط
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto">
              المتجر + مسار الطلبات + واتساب لتأكيد الأوردر + أتمتة المحادثات + الشحن الذكي + المستودعات + المرتجعات + التحليلات وإسناد الحملات.
              بدل دفع <span className="line-through text-slate-400">2,936 ج.م</span> شهرياً في اشتراكات مشتتة.
            </p>

            {/* CTAs */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={handleStartTrial}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-3.5 rounded-xl text-base shadow-xl shadow-blue-600/30 transition-all hover:-translate-y-0.5 active:scale-95"
              >
                <span>ابدأ الفترة التجريبية (7 أيام مجاناً)</span>
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleSubscribeNow}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-medium px-6 py-3.5 rounded-xl text-base transition-colors"
              >
                <span>اشترك وادفع الآن — 999 ج.م/شهر</span>
              </button>
            </div>

            <div className="pt-2 flex items-center justify-center gap-6 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>بدون بطاقة ائتمان للتجربة</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span>إلغاء في أي وقت</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>تفعيل فوري لجميع الأدوات</span>
              </div>
            </div>
          </div>

          {/* Value Dashboard Preview Cards */}
          <div className="mt-14 max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-2xl backdrop-blur-sm">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
              <div className="text-2xl sm:text-3xl font-black text-blue-400 font-mono">17</div>
              <div className="text-xs text-slate-400 mt-1">تطبيق وأداة متكاملة</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">66%</div>
              <div className="text-xs text-slate-400 mt-1">نسبة التوفير المالي</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
              <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">1,937 ج.م</div>
              <div className="text-xs text-slate-400 mt-1">توفير شهري مستمر</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
              <div className="text-2xl sm:text-3xl font-black text-purple-400 font-mono">7 أيام</div>
              <div className="text-xs text-slate-400 mt-1">تجربة مجانية كاملة</div>
            </div>
          </div>
        </div>
      </section>

      {/* Savings Breakdown */}
      <section id="savings" className="py-16 bg-[#0B0F19] border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">لماذا تدفع 2,936 ج.م شهرياً لأدوات منفصلة؟</h2>
            <p className="text-slate-400 text-sm mt-2">
              جمعنا كل البرمجيات التي تشتريها منفصلة لكل متجر في اشتراك واحد مدمج يتحدث مع بعضه لحظياً.
            </p>
          </div>

          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* The Old Way */}
            <div className="p-6 sm:p-8 rounded-2xl bg-slate-950 border border-rose-950/40 flex flex-col justify-between">
              <div>
                <div className="inline-block px-3 py-1 rounded-full bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs font-semibold mb-4">
                  الطريقة التقليدية المنفصلة
                </div>
                <div className="text-3xl font-extrabold text-slate-300 font-mono">2,936 ج.م <span className="text-sm font-normal text-slate-500">/ شهرياً</span></div>
                <p className="text-xs text-slate-400 mt-2 mb-6">شراء كل أداة برابط وحساب وفاتورة مستقلة:</p>
                <ul className="space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                    <span>منصة المتجر الإلكتروني</span>
                    <span className="font-mono text-slate-400">699 ج.م</span>
                  </li>
                  <li className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                    <span>اشتراك WhatsApp Business API</span>
                    <span className="font-mono text-slate-400">350 ج.م</span>
                  </li>
                  <li className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                    <span>صندوق الوارد الموحد (Inbox)</span>
                    <span className="font-mono text-slate-400">299 ج.م</span>
                  </li>
                  <li className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                    <span>نظام المخزون والمستودعات</span>
                    <span className="font-mono text-slate-400">199 ج.م</span>
                  </li>
                  <li className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                    <span>ربط الشحن الآلي مع الشركات</span>
                    <span className="font-mono text-slate-400">149 ج.م</span>
                  </li>
                  <li className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                    <span>أتمتة المحادثات والرد الآلي</span>
                    <span className="font-mono text-slate-400">149 ج.م</span>
                  </li>
                  <li className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                    <span>إسناد الحملات وتحليلات الأرباح (Attribution)</span>
                    <span className="font-mono text-slate-400">248 ج.م</span>
                  </li>
                  <li className="flex items-center justify-between pb-1.5 text-slate-400">
                    <span>باقي الأدوات والإعدادات والتحليلات (9 أدوات إضافية)</span>
                    <span className="font-mono">843 ج.م</span>
                  </li>
                </ul>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-900 text-xs text-rose-400/90 flex items-center gap-2">
                <span>تشتت بالفواتير وفقدان مزامنة البيانات بين البرامج</span>
              </div>
            </div>

            {/* The MaxP Complete Bundle */}
            <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-blue-950/40 via-slate-900 to-slate-950 border-2 border-blue-600/60 shadow-xl shadow-blue-900/20 flex flex-col justify-between relative">
              <div className="absolute -top-3 left-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md">
                الأوفر بنسبة 66%
              </div>

              <div>
                <div className="inline-block px-3 py-1 rounded-full bg-blue-900/60 border border-blue-700/60 text-blue-200 text-xs font-semibold mb-4">
                  باقة المتجر الكاملة من MaxP
                </div>
                <div className="flex items-baseline gap-2">
                  <div className="text-4xl sm:text-5xl font-black text-white font-mono">999 ج.م</div>
                  <div className="text-sm text-slate-400">/ شهرياً</div>
                </div>
                <div className="text-xs font-medium text-emerald-400 mt-1 mb-6">
                  وفّرت 1,937 ج.م شهرياً (23,244 ج.م سنوياً)
                </div>

                <ul className="space-y-3 text-xs sm:text-sm text-slate-200">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>جميع الـ 17 أداة مفعلة بالكامل بدون رسوم إضافية</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>ربط ذري تلقائي: الطلب يُسجل في المتجر، يُخصم من المخزن، ويُرسل بوليصة الشحن بواتساب فوري</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>لوحة تحكم واحدة، فاتورة واحدة، ودعم فني موحد</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>تحديثات مستمرة وتكاملات جديدة مجانية للباقة</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8">
                <button
                  onClick={handleStartTrial}
                  className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <span>ابدأ تجربتك المجانية لمدة 7 أيام</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="text-center text-[11px] text-slate-400 mt-2">
                  لا يتم خصم أي مبلغ خلال فترة التجربة
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Complete 17 Tools Directory */}
      <section id="features" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-block px-3 py-1 rounded-full bg-slate-800 text-blue-400 text-xs font-semibold mb-3">
            المواصفات الشاملة
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white">ماذا تتضمن الباقة بالتفصيل؟</h2>
          <p className="text-slate-400 text-sm mt-2">
            17 أداة تغطي كل زاوية في تجارتك من أول نقرة الإعلان وحتى تسليم الطلب وحساب الأرباح.
          </p>

          {/* Filter Categories */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
            {[
              { id: "all", label: "كل الأدوات (17)" },
              { id: "store", label: "المتجر والطلبات (4)" },
              { id: "comms", label: "المحادثات وواتساب (4)" },
              { id: "logistics", label: "الشحن والمستودعات والمرتجعات (4)" },
              { id: "analytics", label: "الإعلانات والتحليلات والأرباح (5)" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`text-xs px-3.5 py-1.5 rounded-lg transition-colors font-medium ${
                  selectedCategory === cat.id
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                    : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredApps.map((app) => {
            const Icon = app.icon;
            return (
              <div
                key={app.id}
                className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between group hover:bg-slate-900/90"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-950/80 border border-blue-800/40 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {app.price === 0 ? "مضمّن مجاناً" : `${app.price} ج.م`}
                      </span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/50">
                        مضمّن
                      </span>
                    </div>
                  </div>
                  <h3 className="font-bold text-white text-base mb-1.5">{app.name}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{app.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Total Summary Footer */}
        <div className="mt-8 p-4 rounded-xl bg-blue-950/30 border border-blue-800/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-right">
          <div className="text-xs text-slate-300">
            مجموع قيمة الأدوات منفصلة: <span className="font-mono text-slate-400 line-through font-bold">{totalSeparatePrice} ج.م</span> — داخل الباقة: <span className="font-mono text-emerald-400 font-bold text-sm">999 ج.م/شهر</span>
          </div>
          <button
            onClick={handleStartTrial}
            className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2 rounded-lg transition-colors"
          >
            تفعيل جميع الأدوات الـ 17 &larr;
          </button>
        </div>
      </section>

      {/* Pricing and Guarantee Section */}
      <section id="pricing" className="py-20 bg-[#0B0F19] border-t border-slate-800/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-8">
          <div>
            <div className="inline-block px-3 py-1 rounded-full bg-slate-800 text-blue-400 text-xs font-semibold mb-3">
              خطة الاشتراك
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">جرّب مجاناً لمدة 7 أيام</h2>
            <p className="text-slate-400 text-sm mt-2 max-w-xl mx-auto">
              الباقة كاملة بدون أي دفع مسبق. بعد انتهاء الـ 7 أيام، اشترك لاستمرار الخدمة بـ 999 ج.م/شهر.
            </p>
          </div>

          <div className="p-8 sm:p-12 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl relative max-w-xl mx-auto">
            <div className="text-xs text-slate-400 uppercase tracking-widest font-semibold">اشتراك الباقة الكاملة</div>
            <div className="mt-4 flex items-baseline justify-center gap-2">
              <span className="text-5xl sm:text-6xl font-black text-white font-mono">999</span>
              <span className="text-slate-400 font-bold text-lg">ج.م / شهرياً</span>
            </div>
            <div className="text-xs font-medium text-emerald-400 mt-2">
              وفرت 1,937 ج.م مقارنة بشراء الأدوات منفردة
            </div>

            <div className="my-8 py-6 border-y border-slate-800/80 space-y-3 text-right text-xs sm:text-sm text-slate-300">
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>تشغيل فوري لكافة تطبيقات المتجر والطلبات</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>ربط WhatsApp Business API وأتمتة الردود والمحادثات</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>ربط شركات الشحن والمستودعات وتتبع المرتجعات</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>تقارير الأرباح وتحليلات إسناد الحملات الإعلانية</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>دعم فني مخصص ومستمر طوال فترة الاشتراك</span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleStartTrial}
                className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-base shadow-lg shadow-blue-600/30 transition-all active:scale-95"
              >
                ابدأ الفترة التجريبية (7 أيام بدون دفع)
              </button>
              <button
                onClick={handleSubscribeNow}
                className="w-full py-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-700 text-sm transition-colors"
              >
                اشترك وادفع الآن مباشرة
              </button>
            </div>

            <div className="text-center text-xs text-slate-500 mt-4">
              يمكنك الإلغاء في أي وقت من لوحة التحكم بنقرة واحدة
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">الأسئلة الشائعة</h2>
          <p className="text-slate-400 text-sm mt-2">كل ما تريد معرفته عن تفعيل واستخدام باقة المتجر الكاملة</p>
        </div>

        <div className="space-y-3">
          {[
            {
              q: "كيف تعمل الفترة التجريبية المجانية؟",
              a: "بمجرد الضغط على 'ابدأ الفترة التجريبية'، تُفعّل جميع الـ 17 أداة فوراً داخل حسابك لمدة 7 أيام بدون أي خصم مالي. يمكنك تجربة كل خصائص المتجر، الشحن، وواتساب بالكامل.",
            },
            {
              q: "هل أحتاج لخبرة برمجية لتشغيل هذه الأدوات؟",
              a: "لا على الإطلاق. لوحة MaxP مصممة لتكون جاهزة للاستخدام الفوري بدون أي سطر كود. ربط شركات الشحن وواتساب وفيسبوك يتم عبر معالجات ربط بصرية سريعة.",
            },
            {
              q: "ماذا لو كنت مشتركاً بالفعل في بعض الأدوات المنفردة؟",
              a: "عند اشتراكك في باقة المتجر الكاملة، يتم ترقية حسابك تلقائياً لتوحيد جميع الأدوات في فاتورة الباقة الواحدة بـ 999 ج.م/شهر وتوفير المبالغ السابقة.",
            },
            {
              q: "ما هي شركات الشحن المدعومة في الباقة؟",
              a: "الباقة تدعم الربط الآلي الفوري مع كبرى شركات الشحن في مصر مثل Bosta (بوسطة)، Turbo (تربو)، Aramex (أرامكس)، QP Express، بالإضافة إلى إدارة مناديب الشحن الداخلي.",
            },
            {
              q: "هل يمكنني إلغاء الاشتراك في أي وقت؟",
              a: "نعم، لا توجد أي عقود إلزامية أو شروط احتجاز. يمكنك إدارة اشتراكك أو إلغاؤه مباشرة بضغطة زر واحدة من قسم المدفوعات.",
            },
          ].map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-xl bg-slate-900/60 border border-slate-800 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-4.5 text-right font-semibold text-sm sm:text-base text-slate-200 flex items-center justify-between gap-4 hover:text-white transition-colors"
                >
                  <span>{item.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <div className="px-4.5 pb-4.5 text-xs sm:text-sm text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-800 bg-[#06080D] text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm">MaxP</span>
            <span>&copy; {new Date().getFullYear()} جميع الحقوق محفوظة.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/marketplace" className="hover:text-slate-300 transition-colors">متجر التطبيقات</Link>
            <Link to="/marketplace/bundles" className="hover:text-slate-300 transition-colors">جميع الباقات</Link>
            <Link to="/auth/login" className="hover:text-slate-300 transition-colors">تسجيل الدخول</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default StoreCompleteBundleLanding;
