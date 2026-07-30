import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Layers3, TimerReset } from 'lucide-react';
import { trackPlatformSiteLead } from "../../utils/platformSiteMetaPixel";
import { primaryMarketingSection } from "./platformLandingContent";

const PlatformLandingSalesFlow: React.FC = () => {
  const section = primaryMarketingSection;

  const handleLeadClick =
    (eventSource: string, destination: string) => () => {
      trackPlatformSiteLead(eventSource, {
        destination,
        landing_variant: "sales-flow",
      });
    };

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[linear-gradient(180deg,#fffaf4_0%,#fff7ef_42%,#fff_100%)] text-slate-950"
    >
      <div className="absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.18),transparent_34%),radial-gradient(circle_at_top_left,rgba(45,212,191,0.14),transparent_28%)]" />

      <section className="mx-auto max-w-6xl 2xl:max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-white/70 bg-white/80 px-5 py-4 shadow-[0_28px_70px_-48px_rgba(15,23,42,0.45)] backdrop-blur">
          <Link to="/" className="flex items-center gap-3 text-slate-950">
            <span className="rounded-2xl bg-slate-950 px-3 py-2 text-sm font-black text-white">
              Max P
            </span>
            <span className="text-sm font-semibold text-slate-600">
              Sales Flow Landing
            </span>
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/auth/login"
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              دخول
            </Link>
            <Link
              to="/auth/register"
              className="rounded-full bg-slate-950 px-5 py-2 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
              onClick={handleLeadClick(
                "landing_sales_flow_nav_register",
                "auth_register",
              )}
            >
              ابدأ الآن
            </Link>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-bold text-orange-700">
              نسخة تحويلية للصفحة الأساسية
            </div>

            <div className="space-y-5">
              <h1 className="max-w-4xl text-4xl font-black leading-[1.08] text-slate-950 sm:text-5xl lg:text-6xl">
                من أول Lead لحد التشغيل اليومي
                <span className="block text-orange-500">
                  المنصة كلها تتحرك من شاشة واحدة
                </span>
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                {section.heroLead}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {section.metrics.map((metric) => (
                <article
                  key={metric.label}
                  className="rounded-[1.75rem] border border-white/70 bg-white/85 px-4 py-4 shadow-[0_22px_60px_-42px_rgba(15,23,42,0.5)]"
                >
                  <p className="text-3xl font-black text-slate-950">
                    {metric.value}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{metric.label}</p>
                </article>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to="/auth/register"
                className="inline-flex items-center justify-center gap-3 rounded-[1.4rem] bg-slate-950 px-7 py-4 text-base font-black text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
                onClick={handleLeadClick(
                  "landing_sales_flow_hero_register",
                  "auth_register",
                )}
              >
                {section.primaryCta}
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <a
                href="#platform-flow"
                className="inline-flex items-center justify-center rounded-[1.4rem] border border-slate-200 bg-white px-7 py-4 text-base font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300"
              >
                شاهد الرحلة التنفيذية
              </a>
            </div>

            <div className="rounded-[2rem] border border-orange-200 bg-orange-50/70 p-5 text-sm leading-7 text-slate-700">
              هذه الصفحة خاصة بالمنصة نفسها. المتجر العام يظل منفصلًا تمامًا على{" "}
              <span dir="ltr" className="font-black text-slate-950">
                /store
              </span>
              .
            </div>
          </div>

          <aside className="rounded-[2.3rem] border border-slate-200 bg-white p-5 shadow-[0_35px_90px_-48px_rgba(15,23,42,0.45)]">
            <div className="rounded-[1.9rem] bg-[linear-gradient(160deg,#111827_0%,#1f2937_100%)] p-5 text-white">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-orange-200">
                    Flow Board
                  </p>
                  <h2 className="mt-2 text-2xl font-black">
                    رحلة المنصة في 3 حركات
                  </h2>
                </div>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
                  Root Variant
                </span>
              </div>

              <div className="space-y-4">
                {[
                  {
                    title: "Lead يدخل من الصفحة",
                    description:
                      "رسالة أوضح وCTA أسرع لتقليل التشتت بين ما تبيعه المنصة وما يراه الزائر.",
                    icon: TimerReset,
                  },
                  {
                    title: "البيانات تتحول إلى تشغيل",
                    description:
                      "CRM والمحادثات والمهام والطلبات تعمل على نفس السياق بدل التنقل بين أدوات منفصلة.",
                    icon: Layers3,
                  },
                  {
                    title: "المدير يرى الأثر فورًا",
                    description:
                      "لوحة واحدة تجمع التنفيذ والتحويلات والحوكمة بدل متابعة أرقام مبعثرة.",
                    icon: CheckCircle2,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4"
                    >
                      <div className="mb-3 inline-flex rounded-2xl bg-white/10 p-3 text-orange-200">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-lg font-black">{item.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-slate-300">
                        {item.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section id="platform-flow" className="mx-auto max-w-6xl 2xl:max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-3">
          {section.pains.map((pain) => (
            <article
              key={pain.title}
              className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.45)]"
            >
              <div className="mb-4 h-2 w-20 rounded-full bg-orange-400" />
              <h2 className="text-xl font-black text-slate-950">{pain.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {pain.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto grid max-w-6xl 2xl:max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.88fr_1.12fr] lg:px-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-orange-200">
              لماذا هذه النسخة؟
            </p>
            <h2 className="mt-3 text-3xl font-black">
              لأن الزائر يحتاج أن يفهم بسرعة أن المنصة ليست متجرًا فقط
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-300">
              هذه الـ variant تركّز على الرسالة الأساسية: المنصة تجمع التشغيل
              والبيع والمتابعة في مسار واحد، بينما المتجر يبقى تجربة منفصلة
              موجهة للعملاء النهائيين.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {section.offers.map((offer) => (
              <div
                key={offer}
                className="rounded-[1.6rem] border border-white/10 bg-white/5 p-4 text-sm leading-7 text-slate-200"
              >
                {offer}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl 2xl:max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-3">
          {section.useCases.map((useCase) => (
            <article
              key={useCase.title}
              className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,#fff_0%,#fff7ef_100%)] p-6"
            >
              <p className="text-sm font-bold text-orange-600">Use Case</p>
              <h3 className="mt-3 text-xl font-black text-slate-950">
                {useCase.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {useCase.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="rounded-[2.6rem] border border-slate-200 bg-white px-6 py-10 text-center shadow-[0_30px_80px_-50px_rgba(15,23,42,0.45)]">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-orange-600">
            Ready
          </p>
          <h2 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">
            ابدأ تشغيل أعمالك بمنطق أوضح من أول زيارة
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-base leading-8 text-slate-600">
            لو احتجت نسخة لاندنج أسرع في الشرح وأكثر مباشرة في التحويل، فهذه هي
            النسخة المصممة لذلك.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/auth/register"
              className="inline-flex items-center justify-center gap-3 rounded-[1.4rem] bg-slate-950 px-7 py-4 text-base font-black text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
              onClick={handleLeadClick(
                "landing_sales_flow_footer_register",
                "auth_register",
              )}
            >
              {section.primaryCta}
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <a
              href="mailto:demo@example.com"
              className="inline-flex items-center justify-center rounded-[1.4rem] border border-slate-200 px-7 py-4 text-base font-semibold text-slate-700 transition hover:border-slate-300"
              onClick={handleLeadClick(
                "landing_sales_flow_footer_demo",
                "demo_email",
              )}
            >
              {section.demoCta}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
};

export default PlatformLandingSalesFlow;
