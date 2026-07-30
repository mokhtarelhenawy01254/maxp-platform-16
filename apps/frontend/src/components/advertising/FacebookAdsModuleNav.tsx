import React from "react";
import { Link, NavLink, useLocation, useSearchParams } from "react-router-dom";
import { Activity, Box, Bell, Boxes, BrainCircuit, ChevronDown, Clipboard, Beaker, Gauge, Library, TrendingUp, Volume2, MousePointerClick, Network, PlugZap, Search, Target, Users, Wand2 } from 'lucide-react';

interface FacebookAdsModuleNavProps {
  selectedAdAccountId?: string;
}

const navItems = [
  {
    to: "/advertising/facebook-ads",
    label: "مركز التحكم",
    description: "نظرة عامة",
    icon: Activity,
  },
  {
    to: "/advertising/facebook-ads/diagnosis",
    label: "التشخيص",
    description: "تحليل الأداء",
    icon: Search,
  },
  {
    to: "/advertising/facebook-ads/campaigns",
    label: "الحملات",
    description: "إدارة ومزامنة",
    icon: ClipboardCheck,
  },
  {
    to: "/advertising/facebook-ads/ad-library",
    label: "المكتبة",
    description: "بحث ومقارنة",
    icon: Archive,
  },
  {
    to: "/advertising/facebook-ads/audiences",
    label: "الجماهير",
    description: "استهداف",
    icon: Users,
  },
  {
    to: "/advertising/facebook-ads/creative-formats",
    label: "الكرياتيف",
    description: "الصيغ والمكتبة",
    icon: Library,
  },
] as const;

const toolGroups = [
  {
    title: "التحسين والقرارات",
    items: [
      {
        to: "/advertising/facebook-ads/automation-rules",
        label: "قواعد الأتمتة",
        description: "إيقاف، رفع ميزانية، وتنبيهات",
        icon: Gauge,
      },
      {
        to: "/advertising/facebook-ads/decision-reports",
        label: "تقارير القرار",
        description: "قرارات media buying قابلة للتنفيذ",
        icon: BarChart3,
      },
      {
        to: "/advertising/facebook-ads/dco",
        label: "DCO",
        description: "توليفات نصوص وصور ديناميكية",
        icon: Wand2,
      },
      {
        to: "/advertising/facebook-ads/advantage-plus",
        label: "Advantage+",
        description: "توافق وتسريع حملات التسوق",
        icon: BrainCircuit,
      },
    ],
  },
  {
    title: "البيانات والتحويلات",
    items: [
      {
        to: "/advertising/facebook-ads/budget-alerts",
        label: "تنبيهات الرصيد",
        description: "WhatsApp Budget Alerts",
        icon: BellRing,
      },
      {
        to: "/advertising/facebook-ads/lead-forms",
        label: "نماذج العملاء",
        description: "Lead forms من صفحات Meta",
        icon: ClipboardCheck,
      },
      {
        to: "/advertising/facebook-ads/conversions",
        label: "Conversions API",
        description: "Pixel + CAPI وجودة الأحداث",
        icon: PlugZap,
      },
      {
        to: "/advertising/facebook-ads/attribution",
        label: "الإسناد",
        description: "نوافذ التحويل وقياس الطلبات",
        icon: Network,
      },
      {
        to: "/advertising/facebook-ads/saved-audiences",
        label: "الجماهير المحفوظة",
        description: "استهداف محفوظ لإعادة الاستخدام",
        icon: Target,
      },
    ],
  },
  {
    title: "الأصول والاختبار",
    items: [
      {
        to: "/advertising/facebook-ads/ad-preview",
        label: "معاينة الإعلان",
        description: "Preview آمن قبل الإطلاق",
        icon: MousePointerClick,
      },
      {
        to: "/advertising/facebook-ads/catalogs",
        label: "الكتالوجات",
        description: "Product catalogs وdynamic ads",
        icon: Boxes,
      },
      {
        to: "/advertising/facebook-ads/tests",
        label: "A/B Tests",
        description: "اختبارات كرياتيف وجمهور",
        icon: FlaskConical,
      },
      {
        to: "/advertising/facebook-ads/create-full-ad",
        label: "إنشاء إعلان كامل",
        description: "Wizard آمن للحملة والإعلان",
        icon: Megaphone,
      },
    ],
  },
] as const;

const FacebookAdsModuleNav: React.FC<FacebookAdsModuleNavProps> = ({
  selectedAdAccountId,
}) => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [isToolsOpen, setIsToolsOpen] = React.useState(false);

  const buildTo = (path: string) => {
    const params = new URLSearchParams();
    const accountId =
      selectedAdAccountId || searchParams.get("adAccountId") || "";

    if (accountId) {
      params.set("adAccountId", accountId);
    }



    const query = params.toString();
    return query ? `${path}?${query}` : path;
  };

  const isToolActive = toolGroups.some((group) =>
    group.items.some((item) => location.pathname.startsWith(item.to)),
  );

  return (
    <nav
      aria-label="Meta Ads module navigation"
      className="relative rounded-xl border border-slate-200 bg-slate-950 p-1.5 shadow-sm dark:border-slate-800"
    >
      <div className="flex gap-1.5 overflow-x-auto">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={buildTo(item.to)}
              end={item.to === "/advertising/facebook-ads"}
              className={({ isActive }) =>
                [
                  "group flex min-w-[118px] items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors",
                  isActive
                    ? "active bg-white text-slate-950 shadow-sm"
                    : "text-slate-300 hover:bg-white/10 hover:text-white",
                ].join(" ")
              }
            >
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-white/10 text-current group-[.active]:bg-slate-100">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 text-start">
                <span className="block truncate font-black">{item.label}</span>
              </span>
            </NavLink>
          );
        })}

        <div className="relative flex-none">
          <button
            type="button"
            aria-expanded={isToolsOpen}
            aria-controls="facebook-ads-tools-launcher"
            onClick={() => setIsToolsOpen((current) => !current)}
            className={[
              "group flex min-w-[118px] items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors",
              isToolsOpen || isToolActive
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-300 hover:bg-white/10 hover:text-white",
            ].join(" ")}
          >
            <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-white/10 text-current group-[.active]:bg-slate-100">
              <LineChart className="h-4 w-4" />
            </span>
            <span className="min-w-0 text-start">
              <span className="block truncate font-black">الأدوات</span>
            </span>
            <ChevronDown
              className={[
                "ms-auto h-3.5 w-3.5 flex-none transition-transform",
                isToolsOpen ? "rotate-180" : "",
              ].join(" ")}
            />
          </button>
        </div>
      </div>

      {isToolsOpen ? (
        <div
          id="facebook-ads-tools-launcher"
          className="absolute end-1.5 top-[calc(100%+0.5rem)] z-30 w-[min(760px,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-3 text-slate-950 shadow-2xl dark:border-slate-800 dark:bg-slate-950 dark:text-white"
        >
          <div className="grid gap-3 md:grid-cols-3">
            {toolGroups.map((group) => (
              <section key={group.title} aria-label={group.title}>
                <h3 className="mb-2 px-1 text-xs font-black text-slate-500 dark:text-slate-400">
                  {group.title}
                </h3>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = location.pathname.startsWith(item.to);

                    return (
                      <Link
                        key={item.to}
                        to={buildTo(item.to)}
                        onClick={() => setIsToolsOpen(false)}
                        className={[
                          "group flex min-w-0 items-start gap-2 rounded-lg px-2 py-2 text-start transition-colors",
                          active
                            ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                            : "hover:bg-slate-100 dark:hover:bg-white/10",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-lg",
                            active
                              ? "bg-white/15"
                              : "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200",
                          ].join(" ")}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-black">
                            {item.label}
                          </span>
                          <span
                            className={[
                              "block text-xs leading-5",
                              active
                                ? "text-white/75 dark:text-slate-700"
                                : "text-slate-500 dark:text-slate-400",
                            ].join(" ")}
                          >
                            {item.description}
                          </span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      ) : null}
    </nav>
  );
};

export default FacebookAdsModuleNav;
