import { motion } from "framer-motion";
import {
  Rocket,
  ShieldCheck,
  Zap,
  Layout,
  MessageSquare,
  BarChart3,
  ArrowLeft,
  CheckCircle2,
  Globe,
  Monitor
} from "lucide-react";
import { Link } from "react-router-dom";

const MainAdsLanding = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-primary-100" dir="rtl">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary-200">
                <Rocket size={28} />
              </div>
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 font-cairo">
                Max P
              </span>
            </div>
            <div className="hidden md:flex items-center gap-8 text-sm font-bold text-gray-600">
              <a href="#features" className="hover:text-primary-600 transition-colors">المميزات</a>
              <a href="#how-it-works" className="hover:text-primary-600 transition-colors">كيف يعمل</a>
              <a href="#results" className="hover:text-primary-600 transition-colors">النتائج</a>
            </div>
            <Link
              to="/auth/register"
              className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-2xl font-bold transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-primary-200"
            >
              ابدأ الآن
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="pt-40 pb-24 px-4 relative overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-50 via-white to-white">
        <div className="max-w-6xl 2xl:max-w-7xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-bold mb-8"
          >
            <Zap size={16} />
            المنصة رقم #1 لإدارة التجارة الحديثة
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-5xl md:text-7xl font-extrabold text-gray-900 mb-8 leading-[1.15] font-cairo"
          >
            حوّل تجارتك من التقليدية <br />
            إلى <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-indigo-600 italic">الذكاء الكامل</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed"
          >
            منصة Max P تجمع لك المتجر الإلكتروني، أتمتة الواتساب، وإدارة العملاء في مكان واحد.
            وفر 60% من وقت التشغيل واخدم عملاءك باحترافية.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="flex flex-col sm:flex-row justify-center gap-6"
          >
            <Link
              to="/auth/register"
              className="bg-primary-600 hover:bg-primary-700 text-white text-xl px-12 py-5 rounded-3xl font-bold shadow-2xl shadow-primary-200 transition-all flex items-center justify-center gap-3 transform hover:-translate-y-1"
            >
              سجل مجاناً وابدأ اليوم
              <ArrowLeft size={24} />
            </Link>
            <button className="bg-white border-2 border-gray-200 hover:border-primary-600 text-gray-700 text-xl px-12 py-5 rounded-3xl font-bold transition-all hover:bg-gray-50">
              مشاهدة Demo
            </button>
          </motion.div>
        </div>

        {/* Decorative Background Elements */}
        <div className="absolute top-1/2 left-0 w-96 h-96 bg-primary-200 rounded-full blur-[120px] opacity-20 -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-200 rounded-full blur-[140px] opacity-20 translate-x-1/4 translate-y-1/4"></div>
      </header>

      {/* Features Grid */}
      <section id="features" className="py-24 px-4 bg-white relative">
        <div className="max-w-6xl 2xl:max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 font-cairo">تحكم كامل في كل تفصيلة</h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              بدل ما تستخدم 5 تطبيقات مختلفة، Max P بتقدم لك كل اللي محتاجه في واجهة واحدة موحدة.
            </p>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {[
              {
                icon: <Layout className="text-blue-600" />,
                title: "متاجر Storefront احترافية",
                desc: "أنشئ واجهات بيع مذهلة وسريعة تعمل بكفاءة على جميع الأجهزة دون الحاجة لخبرة تقنية.",
                color: "bg-blue-50"
              },
              {
                icon: <MessageSquare className="text-green-600" />,
                title: "أتمتة الواتساب الكاملة",
                desc: "ارسل رسائل تلقائية للطلبات، المتابعات، والعروض الترويجية مباشرة من النظام.",
                color: "bg-green-50"
              },
              {
                icon: <MessageSquare className="text-purple-600" />,
                title: "ردود تلقائية منظمة",
                desc: "قواعد رد ومتابعة تساعد فريقك يرد بسرعة ويحافظ على سياق العميل 24/7.",
                color: "bg-purple-50"
              },
              {
                icon: <BarChart3 className="text-orange-600" />,
                title: "تحليلات متقدمة",
                desc: "لوحات تحكم لحظية تقيس مبيعاتك، أداء فريقك، وتفاعلات العملاء بدقة.",
                color: "bg-orange-50"
              },
              {
                icon: <Globe className="text-cyan-600" />,
                title: "تعدد القنوات",
                desc: "اربط فيسبوك، انستجرام، وتليجرام في Inbox واحدة موحدة لردود أسرع.",
                color: "bg-cyan-50"
              },
              {
                icon: <ShieldCheck className="text-indigo-600" />,
                title: "أمان واستمرارية",
                desc: "بياناتك مشفرة ومحفوظة، مع نظام يعمل بكفاءة قصوى لضمان عدم توقف مبيعاتك.",
                color: "bg-indigo-50"
              }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                className="p-10 rounded-[2.5rem] border border-gray-100 bg-white hover:shadow-2xl hover:shadow-primary-100 transition-all group"
              >
                <div className={`w-16 h-16 ${feature.color} rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform`}>
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold mb-4 font-cairo">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed text-lg">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Trust & Stats */}
      <section id="results" className="py-24 bg-gray-900 text-white rounded-[4rem] mx-4 relative overflow-hidden">
        <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-8 font-cairo leading-tight">
                أرقام تتحدث عن <span className="text-primary-400">القيمة</span> التي نقدمها
              </h2>
              <div className="grid grid-cols-2 gap-8">
                {[
                  { value: "52+", label: "قسم صفحات Frontend" },
                  { value: "151", label: "Route في Backend" },
                  { value: "75", label: "حالة إشعارات واتساب" },
                  { value: "24/7", label: "دعم فني متواصل" }
                ].map((stat, i) => (
                  <div key={i} className="bg-gray-800/50 p-6 rounded-3xl border border-gray-700">
                    <div className="text-4xl font-bold text-primary-400 mb-2">{stat.value}</div>
                    <div className="text-gray-400 font-bold">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-primary-600 to-indigo-600 rounded-[3rem] p-12 shadow-2xl rotate-2">
                <blockquote className="text-2xl font-bold leading-relaxed mb-8">
                  "منذ اشتراكنا في Max P، تضاعفت سرعة معالجة الطلبات لدينا ثلاث مرات، وقلت أخطاء المبيعات بنسبة 90% بفضل الأتمتة."
                </blockquote>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 rounded-full"></div>
                  <div>
                    <div className="font-bold text-lg italic">محمد الشهاوي</div>
                    <div className="text-primary-200">مدير عمليات - براند لايف</div>
                  </div>
                </div>
              </div>
              {/* Floating element */}
              <div className="absolute -bottom-6 -left-6 bg-white text-gray-900 p-6 rounded-3xl shadow-xl hidden md:block border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <div className="font-bold">تم حفظ 42 ساعة</div>
                    <div className="text-sm text-gray-500">هذا الشهر بفضل الأتمتة</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Abstract Background */}
        <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 100 C 20 0 50 0 100 100 Z" fill="currentColor" />
          </svg>
        </div>
      </section>

      {/* App Preview / How it works */}
      <section id="how-it-works" className="py-24 px-4 bg-white text-center">
        <div className="max-w-6xl 2xl:max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold mb-16 font-cairo">ابدأ في 3 خطوات بسيطة</h2>
          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                step: "01",
                title: "أنشئ حسابك",
                desc: "سجل بيانات شركتك وابدأ الفترة التجريبية فوراً وبدون أي تعقيدات."
              },
              {
                step: "02",
                title: "اربط قنواتك",
                desc: "اربط رقم الواتساب، صفحات الفيسبوك، وابدأ في تخصيص متجرك الإلكتروني."
              },
              {
                step: "03",
                title: "انطلق وبع",
                desc: "استقبل الطلبات، فعل الرد الآلي، وشوف مبيعاتك بتنمو مع التحليلات اللحظية."
              }
            ].map((step, i) => (
              <div key={i} className="relative group">
                <div className="text-8xl font-black text-gray-100 group-hover:text-primary-50 transition-colors absolute -top-10 left-1/2 -translate-x-1/2 z-0">
                  {step.step}
                </div>
                <div className="relative z-10">
                  <h3 className="text-2xl font-bold mb-4 font-cairo">{step.title}</h3>
                  <p className="text-gray-600 leading-relaxed text-lg">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-24 px-4 bg-gradient-to-b from-white to-primary-50">
        <div className="max-w-5xl mx-auto bg-gray-900 text-white rounded-[4rem] p-12 md:p-24 text-center relative overflow-hidden shadow-2xl shadow-primary-900/20">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-8 font-cairo leading-tight">
              مستعد لنقل تجارتك لمستوى <br />
              <span className="text-primary-400 underline decoration-primary-400 underline-offset-8">عالمي؟</span>
            </h2>
            <p className="text-gray-400 mb-12 text-xl max-w-2xl mx-auto leading-relaxed">
              انضم لمئات الشركات التي تثق في Max P لإدارة عملياتها ونموها الرقمي. لا تفوت الفرصة.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <Link
                to="/auth/register"
                className="bg-primary-600 hover:bg-primary-700 text-white text-2xl px-16 py-6 rounded-3xl font-bold transition-all shadow-xl shadow-primary-900/40 transform hover:-translate-y-1"
              >
                سجل الآن مجاناً
              </Link>
            </div>
          </motion.div>
          {/* Subtle decoration */}
          <div className="absolute top-0 right-0 p-12 opacity-10">
            <Monitor size={120} />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-100 bg-white">
        <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center text-white">
              <Rocket size={24} />
            </div>
            <span className="text-xl font-bold font-cairo">Max P</span>
          </div>
          <div className="flex gap-8 text-gray-500 font-bold">
            <a href="#" className="hover:text-primary-600 transition-colors">سياسة الخصوصية</a>
            <a href="#" className="hover:text-primary-600 transition-colors">الشروط والأحكام</a>
            <a href="#" className="hover:text-primary-600 transition-colors">تواصل معنا</a>
          </div>
          <div className="text-gray-400 font-medium">
            © {new Date().getFullYear()} Max P Platform. جميع الحقوق محفوظة.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainAdsLanding;
