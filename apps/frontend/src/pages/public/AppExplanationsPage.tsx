import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiClient } from "../../services/apiClient";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import {
  BookOpen,
  PlayCircle,
  ChevronDown,
  Search,
  ExternalLink,
  Settings,
  Package,
  Truck,
  MessageSquare,
  Megaphone,
  BarChart3,
  Users,
  MoreHorizontal,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "../../components/ui/collapsible";
import {
  getYouTubeEmbedUrl,
  getDirectVideoUrl,
} from "../../utils/explanationVideo";
import DOMPurify from "dompurify";

interface AppExplanation {
  id: string;
  title: string;
  content: string;
  slug: string;
  order: number;
  targetRoute?: string;
  videoUrl?: string | null;
}

/** تجميع الشروحات حسب أول جزء من المسار — ترتيب المجموعات ثابت ومقصود */
const ROUTE_GROUPS: {
  key: string;
  labelKey: string;
  labelFallback: string;
  prefixes: string[];
}[] = [
  {
    key: "start",
    labelKey: "explanations.groupStart",
    labelFallback: "البداية والإعدادات",
    prefixes: ["/company-dashboard", "/apps", "/settings", "/payments", "/marketplace", "/notifications"],
  },
  {
    key: "products",
    labelKey: "explanations.groupProducts",
    labelFallback: "المنتجات والمخزون",
    prefixes: ["/products", "/categories", "/inventory", "/procurement"],
  },
  {
    key: "orders",
    labelKey: "explanations.groupOrders",
    labelFallback: "الطلبات والشحن",
    prefixes: ["/orders", "/shipping-companies", "/returns"],
  },
  {
    key: "customers",
    labelKey: "explanations.groupCustomers",
    labelFallback: "العملاء والمحادثات",
    prefixes: ["/customers", "/whatsapp", "/unified-inbox"],
  },
  {
    key: "marketing",
    labelKey: "explanations.groupMarketing",
    labelFallback: "التسويق والعروض",
    prefixes: ["/advertising", "/coupons", "/wholesale", "/affiliates"],
  },
  {
    key: "finance",
    labelKey: "explanations.groupFinance",
    labelFallback: "المالية والتقارير",
    prefixes: ["/analytics", "/reports", "/treasury-expenses", "/invoices"],
  },
  {
    key: "team",
    labelKey: "explanations.groupTeam",
    labelFallback: "الفريق والتشغيل",
    prefixes: ["/hr", "/admin/agent-profiles", "/academy"],
  },
];

const GROUP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  start: Settings,
  products: Package,
  orders: Truck,
  customers: MessageSquare,
  marketing: Megaphone,
  finance: BarChart3,
  team: Users,
  other: MoreHorizontal,
};

const groupOf = (route?: string) => {
  if (!route) return "other";
  let best: { key: string; len: number } | null = null;
  for (const group of ROUTE_GROUPS) {
    for (const prefix of group.prefixes) {
      const matches = route === prefix || route.startsWith(prefix + "/");
      if (matches && (!best || prefix.length > best.len)) {
        best = { key: group.key, len: prefix.length };
      }
    }
  }
  return best?.key ?? "other";
};

const AppExplanationsPage: React.FC = () => {
  const { t } = useTranslation();
  const [explanations, setExplanations] = useState<AppExplanation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [openSlugs, setOpenSlugs] = useState<Set<string>>(new Set());
  const [activeGroup, setActiveGroup] = useState<string>("");

  useEffect(() => {
    const fetchExplanations = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get("/app-explanations/public");
        const data = res.data as any;
        if (data.success) {
          setExplanations(data.explanations);
        }
      } catch (err) {
        console.error("Failed to load explanations", err);
        setError(t("explanations.loadError", "تعذر تحميل الشروحات. يرجى المحاولة لاحقاً."));
      } finally {
        setLoading(false);
      }
    };

    fetchExplanations();
  }, [t]);

  const toggleSlug = (slug: string, open: boolean) => {
    setOpenSlugs((prev) => {
      const next = new Set(prev);
      if (open) next.add(slug);
      else next.delete(slug);
      return next;
    });
  };

  const isSearching = query.trim().length > 0;

  const grouped = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = isSearching
      ? explanations.filter(
          (exp) =>
            exp.title.toLowerCase().includes(needle) ||
            (exp.content || "").toLowerCase().includes(needle)
        )
      : explanations;

    const buckets = new Map<string, AppExplanation[]>();
    for (const group of ROUTE_GROUPS) buckets.set(group.key, []);
    buckets.set("other", []);

    for (const exp of filtered) {
      buckets.get(groupOf(exp.targetRoute))!.push(exp);
    }

    return ROUTE_GROUPS.concat([
      {
        key: "other",
        labelKey: "explanations.groupOther",
        labelFallback: "أخرى",
        prefixes: [],
      },
    ])
      .map((group) => ({
        ...group,
        items: buckets.get(group.key) ?? [],
      }))
      .filter((group) => group.items.length > 0);
  }, [explanations, query, isSearching]);

  const filteredTotal = useMemo(
    () => grouped.reduce((sum, g) => sum + g.items.length, 0),
    [grouped]
  );

  useEffect(() => {
    if (grouped.length > 0 && (!activeGroup || !grouped.some((g) => g.key === activeGroup))) {
      const firstGroup = grouped[0];
      if (firstGroup) {
        setActiveGroup(firstGroup.key);
      }
    }
  }, [grouped, activeGroup]);

  // Scroll spy: راقب سكرول الصفحة وحدّد القسم الظاهر عند خط ~150px
  useEffect(() => {
    let rafId = 0;
    const handleScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        const line = 150;
        const sections = grouped
          .map((g) => document.getElementById(g.key))
          .filter((el): el is HTMLElement => el !== null);

        const firstSection = sections[0];
        if (!firstSection) return;

        let currentId = firstSection.id;
        for (const section of sections) {
          const top = section.getBoundingClientRect().top;
          if (top <= line) {
            currentId = section.id;
          }
        }
        setActiveGroup((prev) => (prev !== currentId ? currentId : prev));
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [grouped]);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, key: string) => {
    e.preventDefault();
    setActiveGroup(key);
    const target = document.getElementById(key);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="rtl min-h-screen bg-background text-foreground">
      {/* الشريط الأعلى الثابت */}
      <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <span>{t("explanations.breadcrumbHome", "الرئيسية")}</span>
            <span className="text-muted-foreground/60">⁄</span>
            <b className="font-extrabold text-foreground">
              {t("explanations.pageTitle", "شرح المنصة")}
            </b>
          </div>
          {!loading && !error && explanations.length > 0 && (
            <div className="text-xs font-bold text-muted-foreground tabular-nums">
              <span>{filteredTotal}</span> {t("explanations.guidesCount", "شرح")} ·{" "}
              <span>{grouped.length}</span> {t("explanations.groupsCount", "أقسام")}
            </div>
          )}
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <div className="mx-auto max-w-[1180px] px-4 py-8">
          <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-destructive">
            {error}
          </div>
        </div>
      ) : explanations.length === 0 ? (
        <div className="mx-auto max-w-[1180px] px-4 py-8">
          <div className="rounded-2xl border bg-card p-12 text-center">
            <p className="text-muted-foreground">
              {t("explanations.emptyState", "لا توجد شروحات متاحة حالياً")}
            </p>
          </div>
        </div>
      ) : (
        <div className="mx-auto grid max-w-[1180px] gap-6 px-4 py-5 md:grid-cols-[286px_minmax(0,1fr)] md:gap-[22px]">
          {/* الشريط الجانبي */}
          <aside className="rounded-2xl border bg-card p-3.5 shadow-sm md:sticky md:top-[60px] md:h-fit">
            {/* بلوك الهوية */}
            <div className="mb-3.5 flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <BookOpen className="size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <b className="block truncate text-[15px] font-extrabold leading-tight text-foreground">
                  {t("explanations.pageTitle", "شرح المنصة")}
                </b>
                <span className="text-[11.5px] text-muted-foreground tabular-nums">
                  {filteredTotal} {t("explanations.guidesCount", "شرح")} · {grouped.length}{" "}
                  {t("explanations.groupsCount", "أقسام")}
                </span>
              </div>
            </div>

            {/* البحث */}
            <div className="relative mb-3">
              <Search
                className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                id="explanation-search"
                name="search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث…"
                aria-label={t("explanations.searchPlaceholder", "ابحث في الشروحات…")}
                className="h-10 w-full rounded-xl border bg-card ps-9 pe-14 text-sm outline-none focus:ring-2 focus:ring-ring text-foreground"
              />
              <span className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold tabular-nums text-muted-foreground">
                {filteredTotal}
              </span>
            </div>

            {/* قائمة الأقسام */}
            <nav
              aria-label="مجموعات الشروحات"
              className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1 md:grid md:gap-[3px] md:overflow-visible md:pb-0"
            >
              {grouped.map((group) => {
                const isActive = activeGroup === group.key;
                const Icon = GROUP_ICONS[group.key] || MoreHorizontal;

                return (
                  <a
                    key={group.key}
                    href={`#${group.key}`}
                    onClick={(e) => handleNavClick(e, group.key)}
                    className={`flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-[10px] px-2.5 py-2 text-[13.5px] font-semibold no-underline transition-colors ${
                      isActive
                        ? "bg-primary/10 font-extrabold text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    <Icon
                      className={`size-4 shrink-0 ${
                        isActive ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                    <span className="truncate">{t(group.labelKey, group.labelFallback)}</span>
                    <span
                      className={`ms-auto rounded-full px-2 py-0.5 text-[11px] tabular-nums ${
                        isActive
                          ? "bg-primary/20 font-bold text-primary"
                          : "bg-muted font-semibold text-muted-foreground"
                      }`}
                    >
                      {group.items.length}
                    </span>
                  </a>
                );
              })}
            </nav>

            {/* سطر توضيحي أسفل الشريط */}
            <div className="hidden border-t pt-3 text-[11.5px] leading-relaxed text-muted-foreground md:block mt-3">
              {t("explanations.railHint", "اختر القسم وتنقّل — الصفحة بتفضل في نفس المكان.")}
            </div>
          </aside>

          {/* العمود الرئيسي */}
          <main>
            {isSearching && grouped.length === 0 ? (
              <div className="rounded-2xl border border-dashed bg-card p-12 text-center text-sm text-muted-foreground">
                <p>{t("explanations.searchEmpty", "مفيش نتائج للبحث")}</p>
              </div>
            ) : (
              grouped.map((group) => (
                <section key={group.key} id={group.key} className="scroll-mt-24 mb-6">
                  {/* رأس القسم */}
                  <div className="mb-2.5 flex items-center gap-2.5">
                    <h2 className="text-sm font-bold text-foreground">
                      {t(group.labelKey, group.labelFallback)}
                    </h2>
                    <span className="rounded-full bg-muted/60 px-2 py-0.5 text-xs font-bold text-muted-foreground tabular-nums">
                      {group.items.length}
                    </span>
                    <div className="h-px flex-1 bg-border" aria-hidden="true" />
                  </div>

                  {/* كارت القسم الموحد */}
                  <div className="overflow-hidden rounded-2xl border bg-card shadow-xs">
                    {group.items.map((exp, idx) => (
                      <ExplanationRow
                        key={exp.id}
                        exp={exp}
                        idx={idx}
                        open={openSlugs.has(exp.slug)}
                        onOpenChange={(open) => toggleSlug(exp.slug, open)}
                        watchVideoLabel={t("explanations.watchVideo", "شاهد الفيديو التوضيحي")}
                      />
                    ))}
                  </div>
                </section>
              ))
            )}
          </main>
        </div>
      )}
    </div>
  );
};

/** صف شرح واحد داخل كارت القسم */
const ExplanationRow: React.FC<{
  exp: AppExplanation;
  idx: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  watchVideoLabel: string;
}> = ({ exp, idx, open, onOpenChange, watchVideoLabel }) => {
  const hasVideo = Boolean(exp.videoUrl);

  return (
    <Collapsible open={open} onOpenChange={(nextOpen: boolean) => onOpenChange(nextOpen)}>
      <div
        id={exp.slug}
        className={`transition-colors ${idx > 0 ? "border-t border-border/60" : ""} ${
          open ? "bg-muted/30" : ""
        }`}
      >
        <CollapsibleTrigger
          className="flex w-full items-center gap-3 p-3.5 text-start hover:bg-muted/40 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {hasVideo && (
            <span
              className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-border/70 text-muted-foreground"
              aria-hidden="true"
            >
              <PlayCircle className="size-3.5" />
            </span>
          )}
          <span className="flex-1 min-w-0 text-[14.5px] font-bold leading-snug text-foreground">
            {exp.title}
          </span>
          {exp.targetRoute && (
            <span
              dir="ltr"
              className="hidden md:inline-block max-w-[230px] truncate rounded-md border bg-muted/40 px-2 py-0.5 text-[11.5px] text-muted-foreground tabular-nums"
            >
              {exp.targetRoute}
            </span>
          )}
          <ChevronDown
            className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          />
        </CollapsibleTrigger>

        <CollapsibleContent>
          {open && (
            <div className="border-t border-border/60 p-4 sm:p-5 space-y-4">
              <CardVideoBlock exp={exp} watchVideoLabel={watchVideoLabel} />
              <div
                className="prose prose-sm max-w-[640px] dark:prose-invert [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-bold [&_p]:leading-relaxed [&_img]:rounded-lg [&_img]:max-w-full"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(exp.content) }}
              />
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

/** فيديو الكارت — ما يُرندر إلا بعد فتح الكارت (تحميل عند الطلب) */
const CardVideoBlock: React.FC<{ exp: AppExplanation; watchVideoLabel: string }> = ({
  exp,
  watchVideoLabel,
}) => {
  if (!exp.videoUrl) return null;
  const yt = getYouTubeEmbedUrl(exp.videoUrl);
  const direct = yt ? null : getDirectVideoUrl(exp.videoUrl);

  return (
    <>
      {yt && (
        <div className="space-y-2 mb-4">
          <div className="w-full max-w-[640px] aspect-video max-h-[380px] rounded-xl overflow-hidden bg-black border border-border shadow-sm">
            <iframe
              className="w-full h-full border-0"
              src={yt}
              title={exp.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
          <div className="flex items-center justify-start max-w-[640px] px-1">
            <a
              href={exp.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors font-medium"
            >
              <ExternalLink className="size-3.5" />
              <span>فتح على يوتيوب ↗</span>
            </a>
          </div>
        </div>
      )}

      {direct && (
        <div className="space-y-2 mb-4">
          <div className="w-full max-w-[640px] aspect-video max-h-[380px] rounded-xl overflow-hidden bg-black border border-border shadow-sm">
            <video
              className="w-full h-full object-contain"
              src={direct}
              controls
              playsInline
              preload="metadata"
            />
          </div>
          <div className="flex items-center justify-start max-w-[640px] px-1">
            <a
              href={direct}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors font-medium"
            >
              <ExternalLink className="size-3.5" />
              <span>فتح الفيديو في نافذة جديدة</span>
            </a>
          </div>
        </div>
      )}

      {!yt && !direct && (
        <div className="mb-4">
          <a
            href={exp.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <PlayCircle className="size-5" aria-hidden="true" />
            <span>{watchVideoLabel}</span>
            <ExternalLink className="size-3.5" />
          </a>
        </div>
      )}
    </>
  );
};

export default AppExplanationsPage;
