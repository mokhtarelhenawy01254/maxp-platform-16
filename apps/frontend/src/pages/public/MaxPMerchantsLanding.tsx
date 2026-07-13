import React from "react";
import { Link } from "react-router-dom";

const painPoints = [
  "طلبات بتضيع بين واتساب وإنستجرام وفيسبوك",
  "بطء في الرد بسبب كثرة الرسائل وتشتت الفريق",
  "متابعة يدوية متعبة باستخدام إكسل أو ملاحظات",
  "عدم وضوح حالة العميل أو الطلب في كل لحظة",
];

const benefits = [
  {
    title: "كل الشاتات في مكان واحد",
    description:
      "بدل ما تتابع من أكتر من قناة، فريقك يشتغل من لوحة واحدة أوضح وأسرع.",
  },
  {
    title: "طلبات أقل ضياعًا",
    description:
      "متابعة أوضح لكل عميل ولكل طلب، مع رحلة تشغيل أسهل من الرسالة حتى إغلاق البيع.",
  },
  {
    title: "تشغيل يومي أهدى",
    description:
      "قلل اللخبطة والاعتماد على الحلول اليدوية، وخلي الشغل قابل للتوسع مع نمو النشاط.",
  },
];

const useCases = [
  "متاجر تبيع عبر واتساب والسوشيال كومرس",
  "براندات مصرية صغيرة ومتوسطة عايزة تنظيم أوضح",
  "فرق مبيعات أو خدمة عملاء عندها أكثر من موظف",
];

const steps = [
  {
    title: "افهم أين تضيع الفرص",
    description: "نراجع معك أين يحدث التأخير والتشتت وضياع الطلبات في دورة البيع الحالية.",
  },
  {
    title: "شوف الديمو على حالتك",
    description: "نعرض لك كيف يجمع ماكس بي المحادثات والطلبات والمتابعة في مسار واحد.",
  },
  {
    title: "ابدأ التشغيل بشكل أبسط",
    description: "انطلق بخطوات أوضح لفريقك بدل تعدد الأدوات والعمل اليدوي اليومي.",
  },
];

const MaxPMerchantsLanding: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100" dir="rtl">
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl 2xl:max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-semibold text-emerald-300">
              Max P
            </span>
            <span className="text-sm text-slate-300">للتجار والبراندات في مصر</span>
          </Link>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              to="/auth/login"
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-white/30 hover:bg-white/5"
            >
              دخول
            </Link>
            <Link
              to="/register/merchant?source=maxp-merchants-landing"
              className="rounded-full bg-emerald-400 px-5 py-2 text-sm font-bold text-slate-950 transition hover:bg-emerald-300"
            >
              اطلب ديمو
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.18),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.12),transparent_30%)]" />
          <div className="relative mx-auto grid max-w-6xl 2xl:max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-28">
            <div>
              <span className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1 text-sm font-medium text-emerald-300">
                بيع أسرع وإدارة أوضح للتاجر المصري
              </span>
              <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight text-white md:text-5xl lg:text-6xl">
                إدارة المحادثات والطلبات والمتجر من <span className="text-emerald-300">مكان واحد</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                ماكس بي يساعدك تجمع الشاتات والطلبات والمتابعة في نظام واحد، بدل التشتت بين واتساب وإنستجرام وفيسبوك وأدوات يدوية تضيّع عليك الوقت والفرص.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/register/merchant?source=maxp-merchants-landing&intent=demo"
                  className="inline-flex items-center justify-center rounded-2xl bg-emerald-400 px-6 py-3 text-base font-bold text-slate-950 transition hover:bg-emerald-300"
                >
                  احجز ديمو
                </Link>
                <a
                  href="#why-maxp"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/15 px-6 py-3 text-base font-semibold text-white transition hover:border-white/30 hover:bg-white/5"
                >
                  شوف كيف يساعدك ماكس بي
                </a>
              </div>

              <div className="mt-8 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">رد أسرع على العملاء</div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">طلبات أقل ضياعًا</div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">تشغيل يومي أوضح</div>
              </div>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-emerald-900/10 backdrop-blur">
              <div className="rounded-3xl border border-white/10 bg-slate-900/90 p-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <p className="text-sm text-slate-400">لوحة متابعة مبسطة</p>
                    <h2 className="text-lg font-bold text-white">رحلة البيع في مكان واحد</h2>
                  </div>
                  <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                    Max P
                  </span>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                    <p className="text-sm text-slate-400">محادثات العملاء</p>
                    <p className="mt-1 font-semibold text-white">واتساب + إنستجرام + فيسبوك</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                    <p className="text-sm text-slate-400">متابعة الطلبات</p>
                    <p className="mt-1 font-semibold text-white">العميل، الطلب، والحالة أمام فريقك بوضوح</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                    <p className="text-sm text-slate-400">النتيجة</p>
                    <p className="mt-1 font-semibold text-emerald-300">تنظيم أكتر • متابعة أسرع • شغل أهدى</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="why-maxp" className="mx-auto max-w-6xl 2xl:max-w-7xl px-6 py-16 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300/80">المشكلة</p>
            <h2 className="mt-3 text-3xl font-black text-white md:text-4xl">
              لو شغلك متوزع على كذا أداة، طبيعي يضيع منك وقت وفرص بيع
            </h2>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {painPoints.map((pain) => (
              <div key={pain} className="rounded-3xl border border-white/10 bg-white/5 p-5 text-slate-200">
                <div className="mb-3 h-2 w-16 rounded-full bg-rose-400/70" />
                <p className="text-lg leading-8">{pain}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-white/10 bg-white/[0.03]">
          <div className="mx-auto max-w-6xl 2xl:max-w-7xl px-6 py-16 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300/80">الحل</p>
              <h2 className="mt-3 text-3xl font-black text-white md:text-4xl">
                ماكس بي يجمع المحادثات والطلبات والمتابعة في مسار واحد
              </h2>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {benefits.map((benefit) => (
                <article key={benefit.title} className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
                  <h3 className="text-xl font-bold text-white">{benefit.title}</h3>
                  <p className="mt-4 text-base leading-8 text-slate-300">{benefit.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl 2xl:max-w-7xl px-6 py-16 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300/80">مناسب لمين؟</p>
              <h2 className="mt-3 text-3xl font-black text-white md:text-4xl">
                مناسب للتجار والبراندات اللي البيع عندهم يبدأ من الشات
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-300">
                لو نشاطك يبيع عبر السوشيال أو عندك فريق صغير يتابع العملاء والطلبات، فدي الصفحة معمولالك.
              </p>
            </div>

            <div className="space-y-4">
              {useCases.map((useCase) => (
                <div key={useCase} className="rounded-3xl border border-white/10 bg-white/5 p-5 text-lg text-slate-100">
                  {useCase}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl 2xl:max-w-7xl px-6 py-16 lg:px-8">
          <div className="rounded-[32px] border border-emerald-400/20 bg-emerald-400/10 p-8 md:p-10">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-200/90">كيف نبدأ؟</p>
              <h2 className="mt-3 text-3xl font-black text-white md:text-4xl">
                طريق واضح من أول اهتمام لحد تشغيل عملي
              </h2>
            </div>
            <div className="mt-8 grid gap-5 lg:grid-cols-3">
              {steps.map((step, index) => (
                <div key={step.title} className="rounded-3xl border border-white/10 bg-slate-950/60 p-6">
                  <span className="text-sm font-bold text-emerald-300">0{index + 1}</span>
                  <h3 className="mt-3 text-xl font-bold text-white">{step.title}</h3>
                  <p className="mt-3 leading-8 text-slate-300">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl 2xl:max-w-7xl px-6 pb-20 lg:px-8">
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 text-center md:p-12">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300/80">جاهز تبدأ؟</p>
            <h2 className="mt-3 text-3xl font-black text-white md:text-5xl">
              ابدأ تدير شغلك بشكل أوضح وأسهل
            </h2>
            <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-slate-300">
              لو عندك متجر أو براند في مصر وعايز تقلل التشتت بين الرسائل والطلبات والمتابعة، فخلّينا نوريك كيف ماكس بي يساعدك عمليًا.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/register/merchant?source=maxp-merchants-landing&intent=demo"
                className="inline-flex items-center justify-center rounded-2xl bg-emerald-400 px-6 py-3 text-base font-bold text-slate-950 transition hover:bg-emerald-300"
              >
                احجز ديمو
              </Link>
              <Link
                to="/auth/login"
                className="inline-flex items-center justify-center rounded-2xl border border-white/15 px-6 py-3 text-base font-semibold text-white transition hover:border-white/30 hover:bg-white/5"
              >
                دخول المنصة
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default MaxPMerchantsLanding;
