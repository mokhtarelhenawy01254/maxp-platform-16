import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiClient } from "../../services/apiClient";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { BookOpen, PlayCircle, ChevronDown, Search } from "lucide-react";
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
const ROUTE_GROUPS: { key: string; labelKey: string; labelFallback: string; prefixes: string[] }[] = [
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 rtl">
      <div className="mb-5 text-center">
        <div className="flex justify-center mb-2">
          <BookOpen className="size-10 text-blue-500" aria-hidden="true" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1.5">
          {t("explanations.pageTitle", "شرح المنصة")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("explanations.pageSubtitle", "دليلك الكامل لصفحات وتطبيقات المنصة")}
          {!loading && !error && explanations.length > 0 && (
            <>
              {" · "}
              <span className="tabular-nums font-semibold">{explanations.length}</span>{" "}
              {t("explanations.guidesCount", "شرح")}
            </>
          )}
        </p>
      </div>

      {/* بحث */}
      {!loading && !error && explanations.length > 0 && (
        <div className="relative mb-4">
          <Search
            className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("explanations.searchPlaceholder", "ابحث في الشروحات…")}
            className="w-full rounded-xl border bg-card py-2.5 ps-9 pe-3 text-sm outline-none
              focus:ring-2 focus:ring-ring"
          />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      ) : explanations.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            {t("explanations.emptyState", "لا توجد شروحات متاحة حالياً")}
          </p>
        </div>
      ) : isSearching && grouped.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            {t("explanations.searchEmpty", "مفيش نتائج للبحث")}
          </p>
        </div>
      ) : (
        <>
          {/* تنقّل المجموعات */}
          {!isSearching && grouped.length > 1 && (
            <nav
              aria-label="مجموعات الشروحات"
              className="sticky top-0 z-10 -mx-4 px-4 py-2 mb-3
                bg-background/85 backdrop-blur border-b border-border/70"
            >
              <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
                {grouped.map((group) => (
                  <a
                    key={group.key}
                    href={`#${group.key}`}
                    className="shrink-0 whitespace-nowrap rounded-full border bg-card px-3 py-1.5
                      text-xs font-semibold text-muted-foreground
                      hover:text-foreground hover:bg-accent transition-colors no-underline"
                  >
                    {t(group.labelKey, group.labelFallback)}
                    {" "}
                    <span className="tabular-nums opacity-70">{group.items.length}</span>
                  </a>
                ))}
              </div>
            </nav>
          )}

          {grouped.map((group) => (
            <section key={group.key} id={group.key} className="scroll-mt-20 mb-6">
              <div className="flex items-center gap-2.5 mb-2.5">
                <h2 className="text-sm font-bold">{t(group.labelKey, group.labelFallback)}</h2>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {group.items.length}
                </span>
                <div className="h-px flex-1 bg-border" aria-hidden="true" />
              </div>

              <div className="space-y-2">
                {group.items.map((exp) => (
                  <ExplanationCard
                    key={exp.id}
                    exp={exp}
                    open={openSlugs.has(exp.slug)}
                    onOpenChange={(open) => toggleSlug(exp.slug, open)}
                    videoBadgeLabel={t("explanations.videoBadge", "فيديو")}
                    watchVideoLabel={t("explanations.watchVideo", "شاهد الفيديو التوضيحي")}
                  />
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
};

/** كارت شرح واحد: مقفول افتراضياً — الفيديو والنص بيتحمّلوا عند الفتح فقط */
const ExplanationCard: React.FC<{
  exp: AppExplanation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoBadgeLabel: string;
  watchVideoLabel: string;
}> = ({ exp, open, onOpenChange, videoBadgeLabel, watchVideoLabel }) => {
  const hasVideo = Boolean(exp.videoUrl);

  return (
    <Collapsible open={open} onOpenChange={(nextOpen: boolean) => onOpenChange(nextOpen)}>
      <div
        id={exp.slug}
        className="scroll-mt-20 rounded-xl border bg-card overflow-hidden shadow-xs"
      >
        <CollapsibleTrigger
          className="flex w-full items-center gap-3 p-4 text-start
            hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors cursor-pointer
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex-1 min-w-0 text-[15px] font-bold leading-snug">
            {exp.title}
          </span>
          {hasVideo && (
            <span
              className="shrink-0 inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/40
                px-2 py-0.5 text-[11px] font-semibold text-red-600 dark:text-red-400"
            >
              <PlayCircle className="size-3.5" aria-hidden="true" />
              {videoBadgeLabel}
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
            <div className="border-t border-border/60 px-4 pb-4 pt-3">
              <CardVideoBlock exp={exp} watchVideoLabel={watchVideoLabel} />
              <div
                className="prose prose-sm max-w-none dark:prose-invert [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-bold [&_p]:leading-relaxed [&_img]:rounded-lg [&_img]:max-w-full"
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
        <div className="relative w-full pb-[56.25%] mb-4 rounded-xl overflow-hidden bg-black">
          <iframe
            className="absolute inset-0 w-full h-full"
            src={yt}
            title={exp.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {direct && (
        <video
          className="w-full mb-4 rounded-xl bg-black"
          src={direct}
          controls
          playsInline
          preload="metadata"
        />
      )}

      {!yt && !direct && (
        <a
          href={exp.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
        >
          <PlayCircle className="size-5" aria-hidden="true" />
          {watchVideoLabel}
        </a>
      )}
    </>
  );
};

export default AppExplanationsPage;
