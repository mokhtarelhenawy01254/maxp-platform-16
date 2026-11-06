import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { apiClient } from "../../services/apiClient";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { ExplanationsHeader } from "./app-explanations/ExplanationsHeader";
import { SectionRail } from "./app-explanations/SectionRail";
import { ExplanationRow } from "./app-explanations/ExplanationRow";
import { MobileBottomBar } from "./app-explanations/MobileBottomBar";
import { MobileCategorySheet } from "./app-explanations/MobileCategorySheet";
import {
  ALL_TAB,
  OTHER_GROUP,
  ROUTE_GROUPS,
  groupOf,
  type AppExplanation,
  type RouteGroup,
} from "./app-explanations/groups";
import {
  buildSearchIndex,
  locateTitleMatch,
  matchesQuery,
  normalizeArabic,
} from "./app-explanations/search";
import type { RailGroup } from "./app-explanations/SectionRail";
import "./app-explanations/explanations.css";

export { CardVideoBlock } from "./app-explanations/ExplanationVideo";

const AppExplanationsPage: React.FC = () => {
  const { i18n } = useTranslation();
  const [explanations, setExplanations] = useState<AppExplanation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [openSlugs, setOpenSlugs] = useState<Set<string>>(new Set());
  /* تاب فلتر حقيقي: «all» = كل الأقسام، أو مفتاح مجموعة واحدة — البحث بيتجاوزه */
  const [activeTab, setActiveTab] = useState<string>("all");
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const [videoOnly, setVideoOnly] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [resultCursor, setResultCursor] = useState(0);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const ar = useCallback(
    (key: string, fallback: string): string => {
      const res = i18n.getResource("ar", "translation", key);
      return typeof res === "string" && res.trim() ? res : fallback;
    },
    [i18n],
  );

  useEffect(() => {
    document.title = "شرح المنصة — MaxP";
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchExplanations = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get("/app-explanations/public");
        const data = res.data as { success?: boolean; explanations?: AppExplanation[] };
        if (!cancelled && data.success && Array.isArray(data.explanations)) {
          setExplanations(data.explanations);
        }
      } catch (err) {
        console.error("Failed to load explanations", err);
        if (!cancelled) {
          setError(ar("explanations.loadError", "تعذر تحميل الشروحات. يرجى المحاولة لاحقاً."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchExplanations();
    return () => {
      cancelled = true;
    };
  }, [ar]);

  const hasVideosAvailable = useMemo(
    () => explanations.some((exp) => Boolean(exp.videoUrl)),
    [explanations],
  );

  /* تصفية الفيديو أولاً إن فُعّل زر الفيديو */
  const baseList = useMemo(() => {
    if (!videoOnly) return explanations;
    return explanations.filter((exp) => Boolean(exp.videoUrl));
  }, [explanations, videoOnly]);

  /* البحث: فهرس مبني على النص المجرد */
  const searchIndex = useMemo(() => buildSearchIndex(baseList), [baseList]);
  const needle = normalizeArabic(query);
  const isSearching = needle.length > 0;

  /* تابات الأقسام بعد فلتر الفيديو (البحث مش بيدخل في العدّ) */
  const tabGroups: RailGroup[] = useMemo(() => {
    const buckets = new Map<string, AppExplanation[]>();
    for (const group of [...ROUTE_GROUPS, OTHER_GROUP]) buckets.set(group.key, []);
    for (const exp of baseList) buckets.get(groupOf(exp.targetRoute))!.push(exp);

    const all: RailGroup = { ...ALL_TAB, items: baseList };
    const rest = [...ROUTE_GROUPS, OTHER_GROUP].map((group) => ({
      ...group,
      items: buckets.get(group.key) ?? [],
    }));
    return [all, ...rest];
  }, [baseList]);

  /* النتائج المعروضة: البحث بيتجاوز التاب المختار ويدور في الكل */
  const grouped = useMemo(() => {
    const filtered = isSearching
      ? baseList.filter((exp) => matchesQuery(searchIndex.get(exp.id), needle))
      : activeTab === "all"
        ? baseList
        : baseList.filter((exp) => groupOf(exp.targetRoute) === activeTab);

    const buckets = new Map<string, AppExplanation[]>();
    for (const group of ROUTE_GROUPS) buckets.set(group.key, []);
    buckets.set(OTHER_GROUP.key, []);

    for (const exp of filtered) {
      buckets.get(groupOf(exp.targetRoute))!.push(exp);
    }

    return [...ROUTE_GROUPS, OTHER_GROUP]
      .map((group) => ({ ...group, items: buckets.get(group.key) ?? [] }))
      .filter((group) => group.items.length > 0);
  }, [baseList, searchIndex, needle, isSearching, activeTab]);

  const filteredTotal = useMemo(
    () => grouped.reduce((sum, group) => sum + group.items.length, 0),
    [grouped],
  );

  /* قائمة مسطّحة للتنقّل بالكيبورد في وضع البحث */
  const flatResults = useMemo(() => grouped.flatMap((group) => group.items), [grouped]);

  useEffect(() => {
    setResultCursor(0);
  }, [needle, videoOnly]);

  const labelFor = useCallback(
    (group: RouteGroup) => ar(group.labelKey, group.labelFallback),
    [ar],
  );

  /* «أضيف حديثًا»: آخر 8 شروحات خلال آخر 30 يومًا — ينزّل للـ hash المباشر */
  const recent = useMemo(() => {
    const now = Date.now();
    return explanations
      .filter((exp) => {
        const t = Date.parse(exp.createdAt || "");
        return !Number.isNaN(t) && now - t <= 30 * 24 * 60 * 60 * 1000;
      })
      .sort((a, b) => Date.parse(b.createdAt || "") - Date.parse(a.createdAt || ""))
      .slice(0, 8);
  }, [explanations]);

  /* مراقبة التمرير لزر الرجوع للأعلى فقط (التابات فلاتر — مفيش scroll-spy) */
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 320);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* اختيار تاب: بيلغي أي بحث جاري + يرجّع القارئة لأول القائمة */
  const handleTabSelect = useCallback(
    (key: string) => {
      setActiveTab(key);
      if (isSearching) setQuery("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [isSearching],
  );

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleSlug = useCallback((slug: string, open: boolean) => {
    setOpenSlugs((prev) => {
      const next = new Set(prev);
      if (open) next.add(slug);
      else next.delete(slug);
      return next;
    });

    const currentHash = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    if (open && currentHash !== slug) {
      window.history.replaceState(null, "", `#${slug}`);
    } else if (!open && currentHash === slug) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }
  }, []);

  /* لينك مباشر: /app-explanations#slug يفتح الشرح نفسه — ويبدّل للتاب الصح لو مش مختار */
  const openFromSlug = useCallback(
    (slug: string) => {
      if (!slug) return;
      const target = explanations.find((exp) => exp.slug === slug);
      if (!target) return;
      const owningGroup = groupOf(target.targetRoute);
      setActiveTab((prev) => (prev === "all" || prev === owningGroup ? prev : "all"));
      setOpenSlugs((prev) => {
        if (prev.has(slug)) return prev;
        const next = new Set(prev);
        next.add(slug);
        return next;
      });
      window.setTimeout(() => {
        document.getElementById(slug)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 140);
    },
    [explanations],
  );

  useEffect(() => {
    if (loading || !explanations.length) return;
    const slug = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    if (slug) openFromSlug(slug);
  }, [loading, explanations, openFromSlug]);

  useEffect(() => {
    const onHashChange = () => {
      openFromSlug(decodeURIComponent(window.location.hash.replace(/^#/, "")));
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [openFromSlug]);

  /* اختصار / لفتح البحث */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
      event.preventDefault();
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  /* نتيجة واحدة؟ افتحها تلقائيًا */
  useEffect(() => {
    if (!isSearching || filteredTotal !== 1) return;
    const only = grouped[0]?.items[0];
    if (only && !openSlugs.has(only.slug)) {
      setOpenSlugs((prev) => new Set(prev).add(only.slug));
    }
  }, [isSearching, filteredTotal, grouped, openSlugs]);

  /* تنقّل النتائج بالكيبورد: ↑↓ للتحرك و Enter للفتح */
  const moveCursor = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(next, flatResults.length - 1));
      setResultCursor(clamped);
      const slug = flatResults[clamped]?.slug;
      if (slug) {
        document.getElementById(slug)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    },
    [flatResults],
  );

  const handleSearchKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isSearching || flatResults.length === 0) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveCursor(resultCursor + 1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        moveCursor(resultCursor - 1);
      } else if (event.key === "Enter") {
        const item = flatResults[Math.min(resultCursor, flatResults.length - 1)];
        if (item) openFromSlug(item.slug);
      }
    },
    [isSearching, flatResults, resultCursor, moveCursor, openFromSlug],
  );

  const watchVideoLabel = ar("explanations.watchVideo", "شاهد الفيديو التوضيحي");
  const cursorSlug = isSearching ? flatResults[resultCursor]?.slug : undefined;

  return (
    <div className="rtl min-h-screen bg-background text-foreground" dir="rtl">
      {/* شريط التطبيق العلوي الثابت */}
      <ExplanationsHeader
        title={ar("explanations.pageTitle", "شرح المنصة")}
        homeLabel={ar("explanations.breadcrumbHome", "الرئيسية")}
        total={filteredTotal}
        query={query}
        isSearching={isSearching}
        onQueryChange={setQuery}
        inputRef={searchInputRef}
        searchLabel={ar("explanations.searchPlaceholder", "ابحث في الشروحات…")}
        clearLabel={ar("explanations.clearSearch", "مسح البحث")}
        onOpenCategorySheet={() => setIsCategorySheetOpen(true)}
        onSearchKeyDown={handleSearchKeyDown}
      />

      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <div className="mx-auto max-w-[1180px] px-3 py-8 sm:px-4">
          <div className="rounded-2xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        </div>
      ) : explanations.length === 0 ? (
        <div className="mx-auto max-w-[1180px] px-3 py-8 sm:px-4">
          <div className="rounded-2xl border bg-card p-12 text-center">
            <p className="text-muted-foreground">
              {ar("explanations.emptyState", "لا توجد شروحات متاحة حالياً")}
            </p>
          </div>
        </div>
      ) : (
        <div className="mx-auto grid min-w-0 max-w-[1180px] grid-cols-1 gap-4 px-3 py-2 sm:px-4 md:grid-cols-[268px_minmax(0,1fr)] md:gap-6 md:py-5 pb-24 md:pb-12">
          {/* شريط التابات:
              على الموبايل: يلتصق أسفل شريط التطبيق العلوي مباشرة (Sticky Sub-Header) مع تمويه خلفية.
              على الديسكتوب: قائمة تابات عمودية ثابتة في الشريط الجانبي — التاب بيفلتر، مش بسيسكرول. */}
          <aside className="sticky top-14 z-20 min-w-0 bg-background/95 pb-1 backdrop-blur-md sm:top-[60px] md:top-[76px] md:h-fit md:bg-transparent md:backdrop-blur-none md:pb-0">
            <p className="mb-2 hidden text-[11px] font-bold text-muted-foreground md:block">
              الأقسام
            </p>
            <SectionRail
              groups={tabGroups}
              activeGroup={activeTab}
              labelFor={labelFor}
              onSelect={(event, key) => {
                event.preventDefault();
                handleTabSelect(key);
              }}
            />
          </aside>

          {/* متن الشروحات الرئيسي */}
          <main className="min-w-0">
            {/* شريط «أضيف حديثًا» — أحدث الشروحات المضافة خلال آخر 30 يومًا */}
            {!isSearching && recent.length > 0 && (
              <div className="mb-4 flex items-center gap-2">
                <span className="flex shrink-0 items-center gap-1 text-[11px] font-extrabold text-muted-foreground">
                  <Sparkles className="size-3 text-emerald-500" aria-hidden="true" />
                  {ar("explanations.recentSection", "أضيف حديثًا")}
                </span>
                <div className="exp-rail -mx-3 flex min-w-0 flex-1 gap-2 overflow-x-auto px-3 py-0.5 md:mx-0 md:px-0">
                  {recent.map((exp) => (
                    <button
                      key={exp.id}
                      type="button"
                      onClick={() => openFromSlug(exp.slug)}
                      className="shrink-0 whitespace-nowrap rounded-full border border-border/70 bg-card px-3 py-1.5 text-[12px] font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary active:scale-95"
                      title={exp.title}
                    >
                      {exp.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {grouped.length === 0 ? (
              <div className="rounded-2xl border border-dashed bg-card px-6 py-12 text-center">
                <p className="text-sm font-semibold text-foreground">
                  {isSearching
                    ? `مفيش نتائج لـ «${query.trim()}»`
                    : videoOnly
                      ? "لا توجد شروحات مصحوبة بفيديو في هذا القسم حالياً"
                      : "مفيش شروحات في القسم ده لسه"}
                </p>
                <p className="mt-1 text-[12.5px] text-muted-foreground">
                  {isSearching
                    ? "جرّب كلمة أقصر أو اسم الأداة نفسها، زي «الطلبات» أو «الكوبونات»."
                    : videoOnly
                      ? "يمكنك إلغاء فلتر الفيديو لعرض كل الشروحات النصية."
                      : "اختار قسم تاني من التابات أو اعرض الكل."}
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  {videoOnly && (
                    <button
                      type="button"
                      onClick={() => setVideoOnly(false)}
                      className="inline-flex items-center rounded-xl bg-primary px-3 py-1.5 text-[12px] font-bold text-primary-foreground shadow-xs transition-transform active:scale-95"
                    >
                      عرض كل الشروحات
                    </button>
                  )}
                  {isSearching && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        searchInputRef.current?.focus();
                      }}
                      className="inline-flex items-center rounded-xl border border-border/70 bg-card px-3 py-1.5 text-[12px] font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary active:scale-95"
                    >
                      {ar("explanations.clearSearch", "مسح البحث")}
                    </button>
                  )}
                  {!isSearching && !videoOnly && activeTab !== "all" && (
                    <button
                      type="button"
                      onClick={() => handleTabSelect("all")}
                      className="inline-flex items-center rounded-xl bg-primary px-3 py-1.5 text-[12px] font-bold text-primary-foreground shadow-xs transition-transform active:scale-95"
                    >
                      {ar("explanations.allGroups", "كل الأقسام")}
                    </button>
                  )}
                </div>

                {/* اقتراحات عند عدم وجود نتائج: آخر الشروحات المضافة */}
                {isSearching && recent.length > 0 && (
                  <div className="mt-6 border-t border-border/50 pt-4">
                    <p className="mb-2 text-[11px] font-bold text-muted-foreground">
                      <Sparkles
                        className="ms-1 inline size-3 text-emerald-500"
                        aria-hidden="true"
                      />{" "}
                      جرّب آخر اللي اتضاف:
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {recent.slice(0, 4).map((exp) => (
                        <button
                          key={exp.id}
                          type="button"
                          onClick={() => openFromSlug(exp.slug)}
                          className="shrink-0 whitespace-nowrap rounded-full border border-border/70 bg-background px-3 py-1.5 text-[12px] font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary active:scale-95"
                        >
                          {exp.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              grouped.map((group) => (
                <section
                  key={group.key}
                  id={group.key}
                  className="mb-5 scroll-mt-[120px] last:mb-0 sm:scroll-mt-[80px]"
                >
                  {/* ترويسة القسم */}
                  <div className="mb-2 flex items-center gap-2.5 px-0.5">
                    <h2 className="font-heading text-[14.5px] font-extrabold text-foreground sm:text-[15px]">
                      {labelFor(group)}
                    </h2>
                    <span className="rounded-full bg-muted/80 px-2 py-0.5 text-[10.5px] font-bold tabular-nums text-muted-foreground">
                      {group.items.length}
                    </span>
                    <div className="h-px flex-1 bg-border/60" aria-hidden="true" />
                  </div>

                  {/* بطاقة المجموعة المحاطة بأسلوب التطبيقات الأصلية (Grouped Inset Card) */}
                  <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
                    {group.items.map((exp, idx) => (
                      <ExplanationRow
                        key={exp.id}
                        exp={exp}
                        idx={idx}
                        open={openSlugs.has(exp.slug)}
                        onOpenChange={(open) => toggleSlug(exp.slug, open)}
                        watchVideoLabel={watchVideoLabel}
                        highlight={isSearching ? locateTitleMatch(exp.title, needle) : null}
                        cursorActive={cursorSlug === exp.slug}
                      />
                    ))}
                  </div>
                </section>
              ))
            )}
          </main>
        </div>
      )}

      {/* شريط التحكم السفلي العائم (Floating Mobile App Dock) */}
      {!loading && !error && explanations.length > 0 && (
        <MobileBottomBar
          groups={tabGroups}
          activeGroup={activeTab}
          labelFor={labelFor}
          onOpenSheet={() => setIsCategorySheetOpen(true)}
          showScrollTop={showScrollTop}
          onScrollToTop={handleScrollToTop}
          videoOnly={videoOnly}
          onToggleVideoOnly={() => setVideoOnly((prev) => !prev)}
          hasVideosAvailable={hasVideosAvailable}
        />
      )}

      {/* نافذة الأقسام السفلية للموبايل (Mobile Category Bottom Sheet) */}
      <MobileCategorySheet
        isOpen={isCategorySheetOpen}
        onClose={() => setIsCategorySheetOpen(false)}
        groups={tabGroups}
        activeGroup={activeTab}
        labelFor={labelFor}
        onSelect={handleTabSelect}
        totalExplanations={filteredTotal}
      />
    </div>
  );
};

export default AppExplanationsPage;
