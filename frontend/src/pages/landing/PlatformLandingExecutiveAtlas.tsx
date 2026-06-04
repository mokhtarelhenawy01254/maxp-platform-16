import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  Briefcase,
  ShieldCheck,
} from "lucide-react";
import { trackPlatformSiteLead } from "../../utils/platformSiteMetaPixel";
import { primaryMarketingSection } from "./platformLandingContent";

const PlatformLandingExecutiveAtlas: React.FC = () => {
  const section = primaryMarketingSection;

  const handleLeadClick =
    (eventSource: string, destination: string) => () => {
      trackPlatformSiteLead(eventSource, {
        destination,
        landing_variant: "executive-atlas",
      });
    };

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.14),transparent_28%),linear-gradient(180deg,#07131a_0%,#0f172a_52%,#091118_100%)] text-white"
    >
      <section className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-3 text-white">
            <span className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-black">
              Max P
            </span>
            <span className="text-sm font-semibold text-slate-300">
              Executive Atlas
            </span>
          </Link>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/auth/login"
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white/85 transition hover:border-white/30 hover:bg-white/5"
            >
              دخول
            </Link>
            <Link
              to="/auth/register"
              className="rounded-full bg-teal-400 px-5 py-2 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-teal-300"
              onClick={handleLeadClick(
                "landing_executive_atlas_nav_register",
                "auth_register",
              )}
            >
              اطلب تجربة تنفيذية
            </Link>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-start">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-300/20 bg-teal-300/10 px-4 py-2 text-sm font-bold text-teal-100">
              نسخة مجلس إدارة / غرفة قرار
            </div>

            <div className="space-y-5">
              <h1 className="max-w-4xl text-4xl font-black leading-[1.04] text-white sm:text-5xl lg:text-6xl">
                غرفة قرار تنفيذية
                <span className="block text-teal-300">
                  للمنصة التي تريد أن تُفهم كقرار استراتيجي
                </span>
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-300">
                {section.heroLead}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  label: "Operational Confidence",
                  value: "Board",
                },
                {
                  label: "Governance Ready",
                  value: "Audit",
                },
                {
                  label: "Unified Execution",
                  value: "360°",
                },
              ].map((item) => (
                <article
                  key={item.label}
                  className="rounded-[1.8rem] border border-white/10 bg-white/5 px-4 py-5 backdrop-blur"
                >
                  <p className="text-3xl font-black text-white">{item.value}</p>
                  <p className="mt-1 text-sm text-slate-400">{item.label}</p>
                </article>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to="/auth/register"
                className="inline-flex items-center justify-center gap-3 rounded-[1.45rem] bg-teal-400 px-7 py-4 text-base font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-teal-300"
                onClick={handleLeadClick(
                  "landing_executive_atlas_hero_register",
                  "auth_register",
                )}
              >
                {section.demoCta}
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <a
                href="#executive-brief"
                className="inline-flex items-center justify-center rounded-[1.45rem] border border-white/15 px-7 py-4 text-base font-semibold text-white transition hover:border-white/30 hover:bg-white/5"
              >
                اقرأ الملخص التنفيذي
              </a>
            </div>
          </div>

          <aside className="rounded-[2.4rem] border border-white/10 bg-white/5 p-5 shadow-[0_35px_90px_-45px_rgba(0,0,0,0.55)] backdrop-blur">
            <div className="rounded-[2rem] border border-white/10 bg-slate-950/60 p-5">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-teal-200">
                    Executive Brief
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-white">
                    ماذا ترى الإدارة هنا؟
                  </h2>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
                  Root Variant
                </span>
              </div>

              <div className="space-y-4">
                {[
                  {
                    title: "حوكمة تنفيذية واضحة",
                    description:
                      "صلاحيات وموافقات وسجل تدقيق يجعل اعتماد القرار جزءًا من المنتج وليس عملية خارجية.",
                    icon: ShieldCheck,
                  },
                  {
                    title: "قراءة أسرع للمشهد الكامل",
                    description:
                      "من الرسائل والـ leads حتى الطلبات والموظفين، كل جزء يظهر في سياق واحد قابل للقياس.",
                    icon: BarChart3,
                  },
                  {
                    title: "تقديم أقوى للمنصة",
                    description:
                      "هذه النسخة تعطي انطباعًا أقرب لمنصة boardroom منها إلى صفحة marketing اعتيادية.",
                    icon: Briefcase,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="rounded-[1.6rem] border border-white/10 bg-white/5 p-4"
                    >
                      <div className="mb-3 inline-flex rounded-2xl bg-teal-400/10 p-3 text-teal-200">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-lg font-black text-white">
                        {item.title}
                      </h3>
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

      <section id="executive-brief" className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[0.94fr_1.06fr]">
          <article className="rounded-[2.4rem] border border-white/10 bg-white/5 p-6 backdrop-blur">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-teal-200">
              Strategic Tension
            </p>
            <h2 className="mt-3 text-3xl font-black text-white">
              أين يتعطل التوسع عادة؟
            </h2>
            <div className="mt-6 space-y-4">
              {section.pains.map((pain) => (
                <div
                  key={pain.title}
                  className="rounded-[1.5rem] border border-white/10 bg-slate-950/40 p-4"
                >
                  <h3 className="text-lg font-black text-white">{pain.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-300">
                    {pain.description}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[2.4rem] border border-white/10 bg-[#f8fafc] p-6 text-slate-950 shadow-[0_32px_90px_-58px_rgba(15,23,42,0.55)]">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-teal-700">
              Decision Stack
            </p>
            <h2 className="mt-3 text-3xl font-black">
              ما الذي يبرر اعتماد المنصة؟
            </h2>
            <div className="mt-6 grid gap-4">
              {section.offers.map((offer) => (
                <div
                  key={offer}
                  className="rounded-[1.5rem] border border-slate-200 bg-white p-4"
                >
                  <p className="text-sm leading-7 text-slate-700">{offer}</p>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-3">
          {section.useCases.map((useCase) => (
            <article
              key={useCase.title}
              className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur"
            >
              <p className="text-sm font-bold text-teal-200">Executive Fit</p>
              <h3 className="mt-3 text-xl font-black text-white">
                {useCase.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                {useCase.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="rounded-[2.8rem] border border-white/10 bg-white/5 px-6 py-10 text-center backdrop-blur">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-teal-200">
            Final Decision
          </p>
          <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">
            عندما تريد الصفحة الرئيسية أن تبيع الثقة قبل أي شيء
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-base leading-8 text-slate-300">
            هذه النسخة مناسبة عندما يكون الانطباع التنفيذي والحوكمة والوضوح
            الاستراتيجي أهم من أسلوب اللاندنج السريع التقليدي.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/auth/register"
              className="inline-flex items-center justify-center gap-3 rounded-[1.45rem] bg-teal-400 px-7 py-4 text-base font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-teal-300"
              onClick={handleLeadClick(
                "landing_executive_atlas_footer_register",
                "auth_register",
              )}
            >
              {section.primaryCta}
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <a
              href="mailto:demo@example.com"
              className="inline-flex items-center justify-center rounded-[1.45rem] border border-white/15 px-7 py-4 text-base font-semibold text-white transition hover:border-white/30 hover:bg-white/5"
              onClick={handleLeadClick(
                "landing_executive_atlas_footer_demo",
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

export default PlatformLandingExecutiveAtlas;
