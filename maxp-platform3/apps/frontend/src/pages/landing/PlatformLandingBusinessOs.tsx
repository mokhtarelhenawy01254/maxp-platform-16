import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  DatabaseZap,
  Link2Off,
  MessageSquareMore,
  PlayCircle,
  Sparkles,
  UsersRound,
  WalletCards,
  Workflow,
} from "lucide-react";
import { trackPlatformSiteLead } from "../../utils/platformSiteMetaPixel";

const MANROPE_FONT_LINK_ID = "platform-landing-business-os-manrope";

const heroMetrics = [
  { value: "-62%", label: "خفض زمن التشغيل" },
  { value: "+38%", label: "تحسن التحويلات" },
  { value: "24/7", label: "أتمتة القنوات" },
  { value: "360°", label: "رؤية موحّدة" },
] as const;

const pillars = [
  {
    title: "نواة ERP",
    description: "إدارة الطلبات والمخزون والتشغيل المالي بدقة متناهية.",
    icon: DatabaseZap,
  },
  {
    title: "إدارة العملاء والمبيعات",
    description: "تتبّع دورة العميل بالكامل من أول رسالة وحتى الإغلاق.",
    icon: Workflow,
  },
  {
    title: "تشغيل الموارد البشرية",
    description: "إدارة الحضور، الشفتات، والطلبات الداخلية في مكان واحد.",
    icon: UsersRound,
    featured: true,
  },
  {
    title: "أتمتة القنوات الاجتماعية",
    description: "أتمتة واتساب والسوشيال بدون فقدان سياق المحادثة.",
    icon: MessageSquareMore,
  },
  {
    title: "الأتمتة التشغيلية",
    description: "تدفقات عمل تقرأ الإشارات وتدفع الخطوة التالية لنموك.",
    icon: Workflow,
  },
] as const;

const automationSteps = [
  {
    label: "01. الالتقاط التلقائي",
    title: "الالتقاط الذكي",
    description:
      "النظام يلتقط العميل الجديد فور وصوله من أي منصة ويصنفه فورًا.",
  },
  {
    label: "02. مزامنة العملاء",
    title: "تحديث سجل المبيعات",
    description:
      "يتم إنشاء ملف تعريف كامل للعميل وربطه بمسار المبيعات المناسب دون تدخل بشري.",
  },
  {
    label: "03. تشغيل الموارد البشرية",
    title: "إسناد المهام",
    description:
      "يتم إخطار الموظف المناسب بناءً على جدول عمله الحالي وتخصيص المهمة له.",
  },
  {
    label: "04. أتمتة القنوات",
    title: "المتابعة الذكية",
    description:
      "إرسال تحديثات حالة الطلب للعميل عبر واتساب تلقائيًا في كل مرحلة.",
  },
] as const;

const operatingPainPoints = [
  {
    title: "أنظمة لا تتحدث مع بعضها",
    description:
      "إدخال البيانات يدويًا أكثر من مرة يسبب أخطاء بشرية ويكسر سرعة القرار.",
    icon: Link2Off,
  },
  {
    title: "تكلفة تشغيل أعلى من اللازم",
    description:
      "الاشتراكات المتفرقة تستهلك الميزانية بدون أن تعطيك رؤية موحدة أو أثرًا متماسكًا.",
    icon: WalletCards,
  },
  {
    title: "قرارات بطيئة وفرص ضائعة",
    description:
      "البيانات المبعثرة تجعل المدير يتحرك بالحدس بدل أن يرى المسار الكامل في لحظة.",
    icon: Clock3,
  },
] as const;

const executionPoints = [
  {
    title: "ربط المتجر الإلكتروني",
    description:
      "تزامن فوري للمخزون والطلبات مع منصات التجارة العالمية من نفس مركز القيادة.",
  },
  {
    title: "لوحة قيادة موحدة",
    description:
      "شاشة واحدة تظهر نبض العمل لحظة بلحظة بدل التنقل بين واجهات منفصلة.",
  },
  {
    title: "صلاحيات وموافقات",
    description:
      "نظام هرمي لإدارة الاعتمادات المالية والإدارية دون فقدان سجل القرار.",
  },
  {
    title: "أتمتة ذكية",
    description: "حوّل المهام المتكررة إلى تدفقات عمل تعمل بثبات وبدون إهدار.",
  },
] as const;

const traditionalStack = [
  { name: "نظام إدارة العملاء", price: "$150/mo" },
  { name: "منصة التواصل الداخلي", price: "$80/mo" },
  { name: "نظام إدارة الموارد البشرية", price: "$120/mo" },
  { name: "ربط المتجر الإلكتروني", price: "$50/mo" },
  { name: "واجهة واتساب للأعمال", price: "$60/mo" },
] as const;

const unifiedStackBenefits = [
  "نظام ERP متكامل",
  "أتمتة المبيعات والواتساب",
  "إدارة موظفين وكشوف رواتب",
  "دعم فني مخصص بالعربية",
] as const;

const testimonials = [
  {
    quote:
      "كنا نفقد 30% من العملاء بسبب تأخر الرد، مع الأتمتة الموحدة أصبحنا نغلق الصفقات في دقائق.",
    name: "أحمد صلاح",
    role: "مؤسس شركة لوجستية",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBre3kh4OXKqhF9vuqrHRlCAr0lhKnxUSKdXXIG-a90wG6T3DhqDL7tf9watIc5DjAx0xtIubKCjYeW7uTgdO8qEfaFU78wUpO3Ht9V2El2seqQKFNi4yvlDhPIO_FeQ-9NJXlBBMsmLEAssi0qWwO-zqe4F9c7eTLgLLRlvyjKv3wMZ7d6-TshEb5I9LaTNN6FHsDTCDMyPL_53n0A0-LWoLcnl99qNOi1ISdTq-QHTaoKeEmoEqc083vDo93OrMnZ8DTBT-NFyrk",
  },
  {
    quote:
      "الربط بين المخزون والمالية والمبيعات وفّر علينا مئات الساعات من الجرد اليدوي شهريًا.",
    name: "ليلى محمود",
    role: "مديرة عمليات",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDIe_f12-7iC0mus6SHZUYga3yko1Ocs2gvFn9K3v-9WFiKXP7iQ_JanM6clZhv52TEbYmm34dvBLT-zSutYTUAWIsj5_HepwJIqlldKEtHAHgYpa_FDCv1mWJpgHcgu3JnBxew7a99m5Vt_e5kdK0P7iJ8Gjk_rZvFY8vxcsvhjcoOp_s4rOVOXYbidMcZmlYmX5frH7MYhfP_ZnFmQwg_U14AKkNUecimpZCVjfRiD0DRwGEk-VmdXZFcEe0zH2opAPMsury_JGw",
  },
  {
    quote:
      "إدارة الشفتات والرواتب أصبحت عملية ممتعة، والموظفون الآن لديهم وصول مباشر لطلباتهم من نفس البيئة.",
    name: "عمر فاروق",
    role: "مدير موارد بشرية",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBPv__qNzud9Iip_GRLI4vA9hkNcKdP8GcTDgPuKGGhM4cNg-5rOBcMgx8ToZp91q0Br_tsNsnwqB8pksPo6ezS3jt_08bnV92TJM9192eUXDfWhhfoCaAIYdYY640zfwPGXajRBHIHhxYpau3pdHcyDwyDxb0oYDei4eBFawoslgzhl3X1roAvGYP3W1wfhrmcU2Lrd_shflM3M0pE9P9droYPllpa5tsqGcz3GWzKqONPQl0d6Z84-W7qV9CzuDtn7sWMgt0NuCI",
  },
] as const;

const faqItems = [
  {
    question: "هل يمكن البدء تدريجيًا؟",
    answer:
      "نعم، يمكنك البدء بموديول واحد مثل المبيعات أو التشغيل ثم التوسع لباقي المحاور حسب احتياج شركتك الفعلي.",
  },
  {
    question: "ما مدى صعوبة الانتقال من أنظمتي الحالية؟",
    answer:
      "لدينا فريق مختص في نقل البيانات وهجرة الأنظمة يضمن انتقالًا آمنًا وسلسًا دون تعطيل العمليات اليومية.",
  },
  {
    question: "هل النظام يدعم اللغة العربية بالكامل؟",
    answer:
      "النظام مصمم للسوق العربي ويدعم العربية في الواجهات، التقارير، وسير العمل التشغيلي بالكامل.",
  },
] as const;

const PlatformLandingBusinessOs: React.FC = () => {
  useEffect(() => {
    if (document.getElementById(MANROPE_FONT_LINK_ID)) {
      return;
    }

    const link = document.createElement("link");
    link.id = MANROPE_FONT_LINK_ID;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap";

    document.head.appendChild(link);
  }, []);

  const handleLeadClick =
    (eventSource: string, destination: string) => () => {
      trackPlatformSiteLead(eventSource, {
        destination,
        landing_variant: "business-os",
      });
    };

  return (
    <main
      dir="rtl"
      className="min-h-screen overflow-x-hidden bg-[#091423] text-[#d9e3f8]"
      style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
    >
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-[1280px] items-center justify-between gap-6 px-6 sm:px-8">
          <div className="flex items-center gap-10">
            <Link
              to="/"
              className="text-lg font-extrabold tracking-[-0.04em] text-white sm:text-xl"
            >
              Max P | نظام تشغيل الأعمال
            </Link>

            <nav className="hidden items-center gap-7 text-sm font-semibold tracking-tight md:flex">
              <a className="border-b-2 border-[#2f6bff] pb-1 text-[#b5c4ff]" href="#business-os-solutions">
                الحلول
              </a>
              <a className="text-slate-400 transition-colors hover:text-white" href="#business-os-automation">
                المنصة
              </a>
              <a className="text-slate-400 transition-colors hover:text-white" href="#business-os-impact">
                الأثر
              </a>
              <a className="text-slate-400 transition-colors hover:text-white" href="#business-os-faq">
                الأسئلة
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/auth/register"
              className="hidden text-sm font-semibold text-slate-400 transition-colors hover:text-white lg:block"
              onClick={handleLeadClick(
                "landing_business_os_nav_brief",
                "auth_register",
              )}
            >
              احجز عرضًا تنفيذيًا
            </Link>
            <Link
              to="/auth/register"
              className="rounded-xl bg-[#2f6bff] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#00c1fd] active:scale-[0.99]"
              onClick={handleLeadClick(
                "landing_business_os_nav_register",
                "auth_register",
              )}
            >
              ابدأ تشغيل أعمالك بشكل أذكى
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden pb-24 pt-36">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:92px_92px] opacity-[0.08]" />
        <div className="pointer-events-none absolute left-1/2 top-24 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-[#2f6bff]/15 blur-[120px]" />
        <div className="pointer-events-none absolute -right-28 top-12 h-[20rem] w-[20rem] rounded-full bg-[#00c1fd]/8 blur-[90px]" />

        <div className="mx-auto grid max-w-[1280px] gap-12 px-6 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="relative z-10 order-2 lg:order-1">
            <div className="relative rounded-[1.8rem] border border-white/10 bg-[#0c1b31]/90 p-4 shadow-[0_40px_110px_-58px_rgba(0,0,0,0.75)]">
              <div className="absolute -inset-6 -z-10 rounded-[2.4rem] bg-[#2f6bff]/10 blur-3xl" />
              <div className="absolute right-7 top-7 z-10 rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-xs font-extrabold text-[#b5c4ff] backdrop-blur">
                لوحة تشغيل حيّة
              </div>
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuApe_00TNH-UZDHeXHi1W_XDzD7lF3r5xYDQ9R5v2wsbqeXxI_yzANJ3QbUa4wRCgH680jK8ISBv-GDu0pmyGYuCySCEgJtPwW8t4mHO8LXHSV7onzR1FIYRplOEOSUIJaJR1XxPb02UmzZYV6NNOcvbz7QFKOMzHSwr33DxtJgPH6dHO2-cTiHiB3TWEVOG6sns2hhsfkHNNeMaEWP1q0_gS-J1NxYdY4umlD0ciCMLzwaBlG1c7DVOnTXrqRjgmjy9EAcYRA-IzQ"
                alt="لوحة تنفيذية داكنة مع رسوم بيانية ومؤشرات تشغيل ومبيعات في بيئة مؤسسية"
                className="w-full rounded-[1.15rem] border border-white/5 object-cover"
              />
              <div className="absolute bottom-7 left-7 z-10 hidden rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-right text-xs leading-6 text-[#d9e3f8] backdrop-blur md:block">
                المبيعات
                <span className="mx-2 text-[#00c1fd]">•</span>
                التشغيل
                <span className="mx-2 text-[#00c1fd]">•</span>
                الموارد البشرية
              </div>
            </div>
          </div>

          <div className="order-1 z-10 space-y-8 lg:order-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#2f6bff]/30 bg-[#2f6bff]/10 px-4 py-2 text-xs font-bold text-[#b5c4ff]">
              <Sparkles className="h-4 w-4" />
              مستقبل إدارة الشركات أصبح هنا
            </div>

            <div className="space-y-5">
              <h1 className="max-w-3xl text-5xl font-extrabold leading-[1.02] tracking-[-0.05em] text-white sm:text-6xl lg:text-[4.1rem]">
                مركز القيادة الموحّد
                <span className="mt-2 block text-[#b5c4ff]">
                  لكل طبقات العمل
                </span>
              </h1>
              <p className="max-w-2xl text-lg leading-9 text-[#c3c5d8]">
                المبيعات والعمليات والموظفون والمحادثات في لوحة تنفيذ واحدة.
                سيطر على كل تفاصيل عملك بذكاء، مع وضوح كامل بأن{" "}
                <span dir="ltr" className="font-bold text-white">
                  /store
                </span>{" "}
                يبقى تجربة مستقلة تمامًا عن هذه المنصة.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {heroMetrics.map((metric) => (
                <article
                  key={metric.label}
                  className="rounded-[1.35rem] border border-white/10 bg-[#0c1b31]/88 p-5 shadow-[0_18px_50px_-34px_rgba(0,0,0,0.65)] transition duration-300 hover:-translate-y-1 hover:border-[#2f6bff]/30"
                >
                  <p className="text-3xl font-extrabold tracking-[-0.04em] text-[#00c1fd]">
                    {metric.value}
                  </p>
                  <p className="mt-2 text-sm font-medium text-[#8d90a1]">
                    {metric.label}
                  </p>
                </article>
              ))}
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                to="/auth/register"
                className="inline-flex items-center justify-center gap-3 rounded-xl bg-[#2f6bff] px-7 py-4 text-base font-extrabold text-white transition hover:bg-[#00c1fd]"
                onClick={handleLeadClick(
                  "landing_business_os_hero_register",
                  "auth_register",
                )}
              >
                ابدأ الآن مجانًا
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <a
                href="#business-os-automation"
                className="inline-flex items-center justify-center gap-3 rounded-xl border border-[#2f6bff]/25 px-7 py-4 text-base font-bold text-white transition hover:bg-[#2f6bff]/8"
              >
                <PlayCircle className="h-5 w-5" />
                مشاهدة ديمو
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-[#8d90a1]">
              <span>قنوات موحّدة</span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#2f6bff]" />
              <span>تشغيل أسرع</span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#00c1fd]" />
              <span>رؤية تنفيذية فورية</span>
            </div>
          </div>
        </div>
      </section>

      <section
        id="business-os-solutions"
        className="border-y border-white/6 bg-[#050e1d] py-24"
      >
        <div className="mx-auto max-w-[1280px] px-6 sm:px-8">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="text-4xl font-extrabold tracking-[-0.04em] text-white sm:text-5xl">
              خمسة محاور تشغّل العمل كمنظومة واحدة
            </h2>
            <p className="mt-4 text-base leading-8 text-[#c3c5d8]">
              تكامل عميق يلغي الحاجة لربط الأنظمة يدويًا أو توزيع القرارات بين
              شاشات متفرقة.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.15fr_1fr_1fr]">
            {pillars.map((pillar) => {
              const Icon = pillar.icon;

              return (
                <article
                  key={pillar.title}
                  className={`rounded-[1.75rem] border p-7 text-center shadow-[0_22px_70px_-48px_rgba(0,0,0,0.75)] transition duration-300 hover:-translate-y-1 ${
                    pillar.featured
                      ? "border-[#00c1fd]/30 bg-[#132844] text-white xl:-translate-y-4"
                      : "border-white/10 bg-[#0c1b31]/78 text-white"
                  }`}
                >
                  <div
                    className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
                      pillar.featured
                        ? "bg-[#00c1fd]/16 text-[#8fd8ff]"
                        : "bg-[#2f6bff]/12 text-[#b5c4ff]"
                    }`}
                  >
                    <Icon className="h-8 w-8" />
                  </div>
                  <h3 className="mt-6 text-2xl font-extrabold tracking-[-0.03em]">
                    {pillar.title}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-[#c3c5d8]">
                    {pillar.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="business-os-automation" className="py-24">
        <div className="mx-auto max-w-[1000px] px-6 sm:px-8">
          <p className="mb-4 text-center text-sm font-extrabold uppercase tracking-[0.3em] text-[#8fd8ff]">
            تسلسل القرار والتنفيذ
          </p>
          <h2 className="text-center text-4xl font-extrabold tracking-[-0.04em] text-white sm:text-5xl">
            رحلة العميل المؤتمتة بالكامل
          </h2>

          <div className="relative mt-16">
            <div className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-gradient-to-b from-[#2f6bff] via-[#00c1fd] to-transparent md:block" />

            <div className="space-y-10">
              {automationSteps.map((step, index) => (
                <div
                  key={step.label}
                  className={`relative flex items-center ${
                    index % 2 === 0
                      ? "md:flex-row-reverse md:justify-between"
                      : "md:justify-between"
                  }`}
                >
                  <div className="hidden w-5/12 md:block" />
                  <span className="absolute left-1/2 top-1/2 hidden h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-[#091423] bg-[#2f6bff] shadow-[0_0_20px_rgba(47,107,255,0.65)] md:block" />
                  <article className="w-full rounded-[1.7rem] border border-white/10 bg-[#0c1b31]/85 p-6 shadow-[0_26px_70px_-50px_rgba(0,0,0,0.78)] md:w-5/12">
                    <span className="text-xs font-bold uppercase tracking-[0.24em] text-[#8fd8ff]">
                      {step.label}
                    </span>
                    <h3 className="mt-3 text-2xl font-extrabold tracking-[-0.03em] text-white">
                      {step.title}
                    </h3>
                    <p className="mt-3 text-sm leading-8 text-[#c3c5d8]">
                      {step.description}
                    </p>
                  </article>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#07101e] py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,180,171,0.08),transparent_28%)]" />
        <div className="relative mx-auto max-w-[1280px] px-6 sm:px-8">
          <div className="mb-14 max-w-3xl">
            <h2 className="text-4xl font-extrabold tracking-[-0.04em] text-white sm:text-5xl">
              هل ما زلت تدير فريقك وعملاءك وطلباتك من أدوات متفرقة؟
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {operatingPainPoints.map((problem) => {
              const Icon = problem.icon;

              return (
                <article
                  key={problem.title}
                  className="rounded-[1.75rem] border border-[#93000a]/24 bg-[#93000a]/8 p-8"
                >
                  <Icon className="h-11 w-11 text-[#ffb4ab]" />
                  <h3 className="mt-6 text-2xl font-extrabold tracking-[-0.03em] text-white">
                    {problem.title}
                  </h3>
                  <p className="mt-4 text-sm leading-8 text-[#c3c5d8]">
                    {problem.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto grid max-w-[1280px] gap-12 px-6 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="order-2 lg:order-1">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAvRv_L5j4_Me0orexPU89Ez6U2o_DpD9W9---U_RFjRUwYlqsE6ZZkn9n8-fd9F9AAOEuAA95gQ2vha3Lpy9RgMpSpWS98wnl1WLMPJgv_cearyydKDKm5xHZYGdgZEYmC7myDa2RnhMIv4OIYDN6RaKUxZi47nyHEc-_dfK6KSQkoB2gD41ylHwZltsi6aVrHaBBGmFjbc88p59Hriw2hGAwzgVmWG-dbxRyjM2pA0aWgMc75g-bSXKv7Yad6qWRI_h9ePYEqMmM"
              alt="بيئة عمل احترافية متعددة الشاشات تعرض لوحات تشغيل وتحليلات موحدة"
              className="w-full rounded-[2rem] border border-white/5 shadow-[0_40px_120px_-60px_rgba(0,0,0,0.85)]"
            />
          </div>

          <div className="order-1 space-y-8 lg:order-2">
            <h2 className="text-4xl font-extrabold tracking-[-0.04em] text-white sm:text-5xl">
              نفس البيانات تخدم المبيعات، العمليات، والموارد البشرية دون
              ازدواجية.
            </h2>

            <div className="space-y-6">
              {executionPoints.map((point) => (
                <div key={point.title} className="flex gap-4">
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#00c1fd] text-[#003548]">
                    <Check className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold tracking-[-0.03em] text-white">
                      {point.title}
                    </h3>
                    <p className="mt-2 text-sm leading-8 text-[#c3c5d8]">
                      {point.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="business-os-impact" className="bg-[#121c2b] py-24">
        <div className="mx-auto max-w-[1280px] px-6 sm:px-8">
          <p className="mb-4 text-center text-sm font-extrabold uppercase tracking-[0.3em] text-[#8fd8ff]">
            أثر تشغيلي ومالي
          </p>
          <h2 className="text-center text-4xl font-extrabold tracking-[-0.04em] text-white sm:text-5xl">
            لماذا تنتقل الشركات إلى نظام تشغيل الأعمال؟
          </h2>

          <div className="mt-16 grid gap-8 md:grid-cols-2">
            <article className="rounded-[2rem] border border-white/10 bg-[#0c1b31]/72 p-8">
              <div className="mb-10 inline-flex rounded-full bg-[#93000a]/16 px-4 py-2 text-sm font-extrabold text-[#ffb4ab]">
                الوضع التقليدي
              </div>
              <h3 className="text-3xl font-extrabold tracking-[-0.03em] text-white">
                فوضى الأدوات المتعددة
              </h3>

              <ul className="mt-8 space-y-4">
                {traditionalStack.map((item) => (
                  <li
                    key={item.name}
                    className="flex items-center justify-between border-b border-white/8 pb-3 text-sm text-[#c3c5d8]"
                  >
                    <span>{item.name}</span>
                    <span className="font-extrabold text-white">
                      {item.price}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex items-end justify-between gap-4">
                <span className="text-xl font-bold text-white">
                  الإجمالي التقريبي
                </span>
                <span className="text-4xl font-extrabold tracking-[-0.04em] text-[#ffb4ab]">
                  $460/mo
                </span>
              </div>
              <p className="mt-4 text-sm leading-7 text-[#8d90a1]">
                بالإضافة إلى تكلفة التكامل اليدوي وضياع الوقت بين الأدوات.
              </p>
            </article>

            <article className="rounded-[2rem] bg-[#2f6bff] p-8 text-white shadow-[0_34px_110px_-62px_rgba(47,107,255,0.9)] ring-1 ring-white/12">
              <div className="mb-10 inline-flex rounded-full bg-white/16 px-4 py-2 text-sm font-extrabold">
                النظام الموحّد
              </div>
              <h3 className="text-3xl font-extrabold tracking-[-0.03em]">
                نظام واحد، هوية واحدة
              </h3>

              <div className="mt-8 space-y-5">
                {unifiedStackBenefits.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <span className="text-lg font-bold">{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="mt-10 border-t border-white/20 pt-8">
                <div className="flex items-end justify-between gap-4">
                  <span className="text-xl font-bold">تكلفة تشغيلية</span>
                  <span className="text-4xl font-extrabold tracking-[-0.04em]">
                    وفر حتى 70%
                  </span>
                </div>
                <p className="mt-4 text-sm leading-7 text-white/82">
                  كفاءة أعلى بمراحل، ورؤية تشغيلية متماسكة، وقدرة على التوسع بلا
                  أدوات إضافية.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-[1280px] px-6 sm:px-8">
          <h2 className="text-center text-4xl font-extrabold tracking-[-0.04em] text-white sm:text-5xl">
            آراء من قلب الميدان
          </h2>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <article
                key={testimonial.name}
                className={`rounded-[1.9rem] border bg-[#0c1b31]/80 p-8 ${
                  index === 1
                    ? "border-[#2f6bff]/30"
                    : "border-white/10"
                }`}
              >
                <p className="text-base italic leading-8 text-white">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div className="mt-8 flex items-center gap-4">
                  <img
                    src={testimonial.image}
                    alt={`${testimonial.name}، ${testimonial.role}`}
                    className="h-12 w-12 rounded-full border border-[#2f6bff]/40 object-cover"
                  />
                  <div>
                    <p className="font-extrabold text-white">
                      {testimonial.name}
                    </p>
                    <p className="text-xs text-[#8d90a1]">{testimonial.role}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="business-os-faq" className="bg-[#050e1d] py-24">
        <div className="mx-auto max-w-[800px] px-6 sm:px-8">
          <h2 className="text-center text-4xl font-extrabold tracking-[-0.04em] text-white sm:text-5xl">
            الأسئلة الشائعة
          </h2>

          <div className="mt-12 space-y-4">
            {faqItems.map((item) => (
              <details
                key={item.question}
                className="overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#0c1b31]/82"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6">
                  <span className="text-lg font-extrabold text-white">
                    {item.question}
                  </span>
                  <ChevronDown className="h-5 w-5 shrink-0 text-[#b5c4ff]" />
                </summary>
                <div className="px-6 pb-6 text-sm leading-8 text-[#c3c5d8]">
                  {item.answer}
                </div>
              </details>
            ))}
          </div>

          <div className="mt-16 rounded-[2rem] border border-white/8 bg-[linear-gradient(135deg,#16202f_0%,#091423_100%)] px-6 py-12 text-center shadow-[0_40px_120px_-72px_rgba(0,0,0,0.9)] sm:px-8">
            <h2 className="text-4xl font-extrabold tracking-[-0.05em] text-white sm:text-5xl">
              جاهز لترقية تشغيل أعمالك؟
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-9 text-[#c3c5d8]">
              انضم إلى الشركات التي تريد تشغيلًا أذكى، بيانات أوضح، ومركز
              قيادة واحد بدل التشتت بين الأدوات.
            </p>

            <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                to="/auth/register"
                className="inline-flex items-center justify-center rounded-xl bg-[#2f6bff] px-8 py-4 text-base font-extrabold text-white transition hover:bg-[#00c1fd]"
                onClick={handleLeadClick(
                  "landing_business_os_footer_register",
                  "auth_register",
                )}
              >
                ابدأ تشغيل أعمالك بشكل أذكى
              </Link>
              <Link
                to="/auth/register"
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-[#16202f] px-8 py-4 text-base font-extrabold text-white transition hover:bg-[#212a3a]"
                onClick={handleLeadClick(
                  "landing_business_os_footer_demo",
                  "auth_register",
                )}
              >
                احجز عرضًا تنفيذيًا
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 bg-slate-950 py-12">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-6 px-6 text-center sm:px-8 md:flex-row md:text-right">
          <div className="text-lg font-extrabold text-white">
            Max P | نظام تشغيل الأعمال
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-xs font-medium text-slate-500">
            <a className="transition-colors hover:text-[#b5c4ff]" href="#business-os-faq">
              الأحكام القانونية
            </a>
            <a className="transition-colors hover:text-[#b5c4ff]" href="#business-os-faq">
              سياسة الخصوصية
            </a>
            <a className="transition-colors hover:text-[#b5c4ff]" href="#business-os-faq">
              شروط الاستخدام
            </a>
            <a className="transition-colors hover:text-[#b5c4ff]" href="#business-os-impact">
              الدعم الإقليمي
            </a>
            <a className="transition-colors hover:text-[#b5c4ff]" href="#business-os-impact">
              الأمان
            </a>
          </div>
          <div className="text-xs text-slate-500">
            © 2024 Max P. جميع الحقوق محفوظة.
          </div>
        </div>
      </footer>
    </main>
  );
};

export default PlatformLandingBusinessOs;
