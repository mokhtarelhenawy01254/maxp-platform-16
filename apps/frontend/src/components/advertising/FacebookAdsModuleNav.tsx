import React from "react";
import { Link, NavLink, useLocation, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Activity,
  Archive,
  BarChart3,
  BellRing,
  Boxes,
  ChevronDown,
  ClipboardCheck,
  FlaskConical,
  Gauge,
  LineChart,
  Megaphone,
  MousePointerClick,
  Network,
  PlugZap,
  Target,
  Users,
  Wand2,
  Sparkles,
  Palette,
} from "lucide-react";

interface FacebookAdsModuleNavProps {
  selectedAdAccountId?: string;
}

const navItems = [
  {
    to: "/advertising/marketing-studio",
    labelAr: "مركز التسويق الذكي",
    labelEn: "AI Studio",
    descriptionAr: "فريق الأيجنتس والمخزون",
    descriptionEn: "Agent Squad & Inventory",
    icon: Sparkles,
  },
  {
    to: "/advertising/creative-studio",
    labelAr: "استوديو التصاميم",
    labelEn: "Creative Studio",
    descriptionAr: "تصاميم المنتجات والسوشيال",
    descriptionEn: "Product Visuals & Ads",
    icon: Palette,
  },
  {
    to: "/advertising/facebook-ads",
    labelAr: "مركز التحكم",
    labelEn: "Cockpit",
    descriptionAr: "نظرة عامة",
    descriptionEn: "Overview",
    icon: Activity,
  },
  {
    to: "/advertising/facebook-ads/connection",
    labelAr: "الربط",
    labelEn: "Connection",
    descriptionAr: "حسابات الإعلانات",
    descriptionEn: "Ad Accounts",
    icon: PlugZap,
  },
  {
    to: "/advertising/facebook-ads/campaigns",
    labelAr: "الحملات",
    labelEn: "Campaigns",
    descriptionAr: "إدارة ومزامنة",
    descriptionEn: "Manage & Sync",
    icon: ClipboardCheck,
  },
  {
    to: "/advertising/facebook-ads/ad-library",
    labelAr: "المكتبة",
    labelEn: "Ad Library",
    descriptionAr: "بحث ومقارنة",
    descriptionEn: "Search & Compare",
    icon: Archive,
  },
  {
    to: "/advertising/facebook-ads/audiences",
    labelAr: "الجماهير",
    labelEn: "Audiences",
    descriptionAr: "استهداف",
    descriptionEn: "Targeting",
    icon: Users,
  },
] as const;

const toolGroups = [
  {
    titleAr: "التحسين والقرارات",
    titleEn: "Optimization & Decisions",
    items: [
      {
        to: "/advertising/facebook-ads/automation-rules",
        labelAr: "قواعد الأتمتة",
        labelEn: "Automation Rules",
        descriptionAr: "إيقاف، رفع ميزانية، وتنبيهات",
        descriptionEn: "Pause, scale budget & alerts",
        icon: Gauge,
      },
      {
        to: "/advertising/facebook-ads/decision-reports",
        labelAr: "تقارير القرار",
        labelEn: "Decision Reports",
        descriptionAr: "قرارات media buying قابلة للتنفيذ",
        descriptionEn: "Actionable media buying reports",
        icon: BarChart3,
      },
      {
        to: "/advertising/facebook-ads/dco",
        labelAr: "DCO",
        labelEn: "DCO",
        descriptionAr: "توليفات نصوص وصور ديناميكية",
        descriptionEn: "Dynamic text & image combos",
        icon: Wand2,
      },
      {
        to: "/advertising/facebook-ads/advantage-plus",
        labelAr: "Advantage+",
        labelEn: "Advantage+",
        descriptionAr: "توافق وتسريع حملات التسوق",
        descriptionEn: "Shopping campaign acceleration",
        icon: LineChart,
      },
    ],
  },
  {
    titleAr: "البيانات والتحويلات",
    titleEn: "Data & Conversions",
    items: [
      {
        to: "/advertising/facebook-ads/budget-alerts",
        labelAr: "تنبيهات الرصيد",
        labelEn: "Budget Alerts",
        descriptionAr: "WhatsApp Budget Alerts",
        descriptionEn: "WhatsApp Budget Alerts",
        icon: BellRing,
      },
      {
        to: "/advertising/facebook-ads/lead-forms",
        labelAr: "نماذج العملاء",
        labelEn: "Lead Forms",
        descriptionAr: "Lead forms من صفحات Meta",
        descriptionEn: "Instant Lead Forms from Meta",
        icon: ClipboardCheck,
      },
      {
        to: "/advertising/facebook-ads/attribution",
        labelAr: "الإسناد",
        labelEn: "Attribution",
        descriptionAr: "نوافذ التحويل وقياس الطلبات",
        descriptionEn: "Attribution windows & order tracking",
        icon: Network,
      },
      {
        to: "/advertising/facebook-ads/saved-audiences",
        labelAr: "الجماهير المحفوظة",
        labelEn: "Saved Audiences",
        descriptionAr: "استهداف محفوظ لإعادة الاستخدام",
        descriptionEn: "Saved targeting presets",
        icon: Target,
      },
    ],
  },
  {
    titleAr: "الأصول والاختبار",
    titleEn: "Assets & Testing",
    items: [
      {
        to: "/advertising/facebook-ads/ad-preview",
        labelAr: "معاينة الإعلان",
        labelEn: "Ad Preview",
        descriptionAr: "Preview آمن قبل الإطلاق",
        descriptionEn: "Safe pre-launch preview",
        icon: MousePointerClick,
      },
      {
        to: "/advertising/facebook-ads/catalogs",
        labelAr: "الكتالوجات",
        labelEn: "Catalogs",
        descriptionAr: "Product catalogs وdynamic ads",
        descriptionEn: "Product catalogs & dynamic ads",
        icon: Boxes,
      },
      {
        to: "/advertising/facebook-ads/tests",
        labelAr: "A/B Tests",
        labelEn: "A/B Tests",
        descriptionAr: "اختبارات كرياتيف وجمهور",
        descriptionEn: "Creative & audience experiments",
        icon: FlaskConical,
      },
      {
        to: "/advertising/facebook-ads/create-full-ad",
        labelAr: "إنشاء إعلان كامل",
        labelEn: "Create Full Ad",
        descriptionAr: "Wizard آمن للحملة والإعلان",
        descriptionEn: "Guided campaign & ad builder",
        icon: Megaphone,
      },
    ],
  },
] as const;

const FacebookAdsModuleNav: React.FC<FacebookAdsModuleNavProps> = ({
  selectedAdAccountId,
}) => {
  const { i18n } = useTranslation();
  const isEn = Boolean(i18n.language && i18n.language.startsWith("en"));
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
      className="relative rounded-2xl border border-border/70 bg-card/95 backdrop-blur-md p-1.5 shadow-xs"
    >
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const label = isEn ? item.labelEn : item.labelAr;

          return (
            <NavLink
              key={item.to}
              to={buildTo(item.to)}
              end={item.to === "/advertising/facebook-ads"}
              className={({ isActive }) =>
                [
                  "group flex min-w-[105px] items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold tracking-normal transition-all duration-150",
                  isActive
                    ? "active bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                ].join(" ")
              }
            >
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-muted/60 text-muted-foreground group-[.active]:bg-primary-foreground/20 group-[.active]:text-primary-foreground">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 text-start">
                <span className="block truncate">{label}</span>
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
              "group flex min-w-[105px] items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold tracking-normal transition-all duration-150 cursor-pointer",
              isToolsOpen || isToolActive
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            ].join(" ")}
          >
            <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-muted/60 text-muted-foreground group-[.active]:bg-primary-foreground/20 group-[.active]:text-primary-foreground">
              <LineChart className="h-4 w-4" />
            </span>
            <span className="min-w-0 text-start">
              <span className="block truncate">{isEn ? "Tools" : "الأدوات"}</span>
            </span>
            <ChevronDown
              className={[
                "ms-auto h-3.5 w-3.5 flex-none transition-transform duration-200",
                isToolsOpen ? "rotate-180" : "",
              ].join(" ")}
            />
          </button>
        </div>
      </div>

      {isToolsOpen ? (
        <div
          id="facebook-ads-tools-launcher"
          className="absolute end-1.5 top-[calc(100%+0.5rem)] z-30 w-[min(780px,calc(100vw-2rem))] rounded-2xl border border-border/70 bg-card/98 backdrop-blur-xl p-4 text-foreground shadow-2xl animate-in fade-in-50 zoom-in-95 duration-150"
        >
          <div className="grid gap-4 md:grid-cols-3">
            {toolGroups.map((group) => {
              const groupTitle = isEn ? group.titleEn : group.titleAr;
              return (
                <section key={group.titleAr} aria-label={group.titleAr}>
                  <h3 className="mb-2 px-1 text-xs font-semibold text-muted-foreground">
                    {groupTitle}
                  </h3>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = location.pathname.startsWith(item.to);
                      const label = isEn ? item.labelEn : item.labelAr;
                      const description = isEn ? item.descriptionEn : item.descriptionAr;

                      return (
                        <Link
                          key={item.to}
                          to={buildTo(item.to)}
                          onClick={() => setIsToolsOpen(false)}
                          className={[
                            "group flex min-w-0 items-start gap-2.5 rounded-xl p-2 text-start transition-all",
                            active
                              ? "bg-primary/10 text-primary border border-primary/20"
                              : "hover:bg-muted/60",
                          ].join(" ")}
                        >
                          <span
                            className={[
                              "mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-lg transition-colors",
                              active
                                ? "bg-primary text-primary-foreground shadow-xs"
                                : "bg-muted/60 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary",
                            ].join(" ")}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-semibold text-foreground">
                              {label}
                            </span>
                            <span
                              className={[
                                "block text-[11px] leading-4 line-clamp-1",
                                active
                                  ? "text-primary/90"
                                  : "text-muted-foreground",
                              ].join(" ")}
                            >
                              {description}
                            </span>
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      ) : null}
    </nav>
  );
};

export default FacebookAdsModuleNav;
