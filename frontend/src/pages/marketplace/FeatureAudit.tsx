import React, {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { apiClient } from "../../services/apiClient";
import {
  areaLabels,
  FeatureAuditArea,
  FeatureAuditStatus,
  getFeatureAuditSummary,
  getMarketplaceFeatureAudit,
  MarketplaceFeatureAuditEntry,
  marketplaceFeatureMap,
  statusLabels,
} from "../../config/marketplaceFeatureMap";
import { useAuth } from "../../hooks/useAuthSimple";

type MarketplaceApp = {
  slug?: string;
  name?: string;
  category?: string;
};

type MarketplaceAppsResponse = {
  data?: MarketplaceApp[];
  pagination?: {
    total?: number;
    limit?: number;
  };
};

type FilterStatus = FeatureAuditStatus | "all";
type FilterArea = FeatureAuditArea | "all";

const marketplaceAuditRoles = ["SUPER_ADMIN", "COMPANY_ADMIN", "OWNER"];

const statusTone: Record<FeatureAuditStatus, string> = {
  core: "border-slate-200 bg-slate-50 text-slate-700",
  covered: "border-emerald-200 bg-emerald-50 text-emerald-700",
  "needs-granular-gate": "border-amber-200 bg-amber-50 text-amber-800",
  "missing-app": "border-rose-200 bg-rose-50 text-rose-700",
};

const summaryCards = [
  {
    key: "covered",
    label: "مربوط فعلاً",
    description: "الأجزاء المتصلة بتطبيق موجود",
    tone: "from-emerald-500 to-teal-500",
  },
  {
    key: "needsGranularGate",
    label: "يحتاج ربط أدق",
    description: "التطبيق موجود لكن الصفحة مربوطة ببوابة عامة",
    tone: "from-amber-500 to-orange-500",
  },
  {
    key: "missingApp",
    label: "يحتاج App جديد",
    description: "جزء قابل للتسعير ولا يوجد له slug في المتجر",
    tone: "from-rose-500 to-red-500",
  },
  {
    key: "core",
    label: "Core",
    description: "أساسيات لا ينفع تتقفل بتطبيق",
    tone: "from-slate-600 to-slate-900",
  },
] as const;

const getEntrySearchText = (entry: MarketplaceFeatureAuditEntry) =>
  [
    entry.label,
    entry.description,
    entry.appSlug,
    entry.appLabel,
    entry.currentGate,
    areaLabels[entry.area],
    entry.routes.map((route) => `${route.path} ${route.label}`).join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const MarketplaceFeatureAudit: React.FC = () => {
  const { user } = useAuth();
  const [apps, setApps] = useState<MarketplaceApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [areaFilter, setAreaFilter] = useState<FilterArea>("all");
  const deferredQuery = useDeferredValue(query);
  const canAuditMarketplace = marketplaceAuditRoles.includes(user?.role || "");

  useEffect(() => {
    if (!canAuditMarketplace) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadApps = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.get<MarketplaceAppsResponse>(
          "/marketplace/apps",
          {
            params: { page: 1, limit: 200 },
          },
        );

        if (!isMounted) return;
        setApps(Array.isArray(response.data.data) ? response.data.data : []);
      } catch (loadError) {
        if (!isMounted) return;
        console.error("Failed to load marketplace apps for feature audit", loadError);
        setError("تعذر تحميل تطبيقات المتجر. سيتم عرض الخريطة الثابتة فقط.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadApps();

    return () => {
      isMounted = false;
    };
  }, [canAuditMarketplace]);

  const appSlugs = useMemo(
    () =>
      apps
        .map((app) => app.slug)
        .filter((slug): slug is string => typeof slug === "string" && slug.length > 0),
    [apps],
  );

  const auditEntries = useMemo(
    () => getMarketplaceFeatureAudit(appSlugs),
    [appSlugs],
  );

  const summary = useMemo(
    () => getFeatureAuditSummary(auditEntries),
    [auditEntries],
  );

  const filteredEntries = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return auditEntries.filter((entry) => {
      if (statusFilter !== "all" && entry.effectiveStatus !== statusFilter) {
        return false;
      }

      if (areaFilter !== "all" && entry.area !== areaFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return getEntrySearchText(entry).includes(normalizedQuery);
    });
  }, [areaFilter, auditEntries, deferredQuery, statusFilter]);

  const areas = useMemo(
    () =>
      Array.from(new Set(marketplaceFeatureMap.map((entry) => entry.area))).sort(
        (left, right) => areaLabels[left].localeCompare(areaLabels[right], "ar"),
      ),
    [],
  );

  const handleStatusChange = (nextStatus: FilterStatus) => {
    startTransition(() => setStatusFilter(nextStatus));
  };

  const handleAreaChange = (nextArea: FilterArea) => {
    startTransition(() => setAreaFilter(nextArea));
  };

  if (!canAuditMarketplace) {
    return (
      <div className="min-h-screen bg-[#f6f1e8] px-4 py-10 text-slate-950" dir="rtl">
        <div className="mx-auto max-w-2xl rounded-[2rem] border border-rose-200 bg-white p-8 text-center shadow-xl shadow-rose-100">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
            <ExclamationTriangleIcon className="h-8 w-8" />
          </div>
          <h1 className="mt-5 text-2xl font-black">ليس لديك صلاحية لعرض خريطة التطبيقات</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            الصفحة مخصصة للإدارة لأنها تعرض قرارات تسعير وربط داخل Marketplace.
            لو محتاج تشوفها، استخدم حساب Owner أو Company Admin أو Super Admin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f1e8] px-4 py-6 text-slate-950 sm:px-6 lg:px-8" dir="rtl">
      <div className="mx-auto max-w-7xl">
        <section className="relative overflow-hidden rounded-[2rem] border border-stone-200 bg-[#15120d] p-6 text-white shadow-2xl shadow-stone-300/50 sm:p-8">
          <div className="absolute inset-0 opacity-60">
            <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-amber-500/30 blur-3xl" />
            <div className="absolute bottom-0 right-16 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-white/40 to-transparent" />
          </div>

          <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-amber-100">
                <SparklesIcon className="h-4 w-4" />
                Marketplace Feature Audit
              </div>
              <h1 className="max-w-3xl text-3xl font-black leading-tight sm:text-5xl">
                خريطة الأجزاء التي يمكن إدخالها داخل التطبيقات
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-200 sm:text-base">
                الصفحة دي بتجمع أجزاء النظام القابلة للتسعير أو التفعيل كتطبيقات، وتقارنها
                بتطبيقات المتجر الموجودة فعلاً. الهدف إن أي ميزة جديدة ما تفضلش خارج
                Marketplace بالغلط.
              </p>
            </div>

            <div className="relative rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-stone-300">Catalog signal</p>
                  <p className="mt-2 text-4xl font-black">{apps.length || "..."}</p>
                  <p className="text-sm text-stone-300">تطبيق محمل من الإنتاج / الجلسة الحالية</p>
                </div>
                <div className="rounded-2xl bg-amber-400 p-4 text-slate-950 shadow-lg shadow-amber-500/30">
                  {loading ? (
                    <ArrowPathIcon className="h-8 w-8 animate-spin" />
                  ) : (
                    <CubeIcon className="h-8 w-8" />
                  )}
                </div>
              </div>

              {error ? (
                <div className="mt-5 rounded-2xl border border-amber-300/30 bg-amber-200/10 p-4 text-sm text-amber-100">
                  {error}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div key={card.key} className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
              <div className={`h-2 bg-gradient-to-l ${card.tone}`} />
              <div className="p-5">
                <p className="text-3xl font-black">{summary[card.key]}</p>
                <h2 className="mt-2 text-base font-bold">{card.label}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">{card.description}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-6 rounded-[1.75rem] border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
            <label className="relative block">
              <MagnifyingGlassIcon className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ابحث باسم جزء، route، app slug..."
                className="h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 pr-12 text-sm outline-none transition focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-100"
              />
            </label>

            <select
              value={statusFilter}
              onChange={(event) => handleStatusChange(event.target.value as FilterStatus)}
              className="h-12 rounded-2xl border border-stone-200 bg-stone-50 px-4 text-sm outline-none transition focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-100"
            >
              <option value="all">كل الحالات</option>
              {Object.entries(statusLabels).map(([status, label]) => (
                <option key={status} value={status}>
                  {label}
                </option>
              ))}
            </select>

            <select
              value={areaFilter}
              onChange={(event) => handleAreaChange(event.target.value as FilterArea)}
              className="h-12 rounded-2xl border border-stone-200 bg-stone-50 px-4 text-sm outline-none transition focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-100"
            >
              <option value="all">كل المجالات</option>
              {areas.map((area) => (
                <option key={area} value={area}>
                  {areaLabels[area]}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="mt-6 grid gap-4">
          {filteredEntries.map((entry) => (
            <article
              key={entry.id}
              className="rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-stone-200/70"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusTone[entry.effectiveStatus]}`}>
                      {statusLabels[entry.effectiveStatus]}
                    </span>
                    <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600">
                      {areaLabels[entry.area]}
                    </span>
                    {entry.appSlug ? (
                      <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                        {entry.appSlug}
                      </span>
                    ) : null}
                    {entry.currentGate ? (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                        الحالي: {entry.currentGate}
                      </span>
                    ) : null}
                    {entry.legacyGate ? (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        fallback: {entry.legacyGate}
                      </span>
                    ) : null}
                  </div>

                  <h2 className="mt-4 text-2xl font-black text-slate-950">{entry.label}</h2>
                  <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-600">{entry.description}</p>
                </div>

                <div className="min-w-0 rounded-2xl border border-stone-200 bg-stone-50 p-4 lg:w-72">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    {entry.appExists || entry.effectiveStatus === "core" ? (
                      <CheckCircleIcon className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <ExclamationTriangleIcon className="h-5 w-5 text-rose-600" />
                    )}
                    <span>{entry.appLabel || "Core Feature"}</span>
                  </div>
                  <p className="mt-2 text-xs leading-6 text-slate-500">{entry.action}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {entry.routes.map((route) => (
                  <span
                    key={`${entry.id}-${route.path}`}
                    className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
                    title={route.path}
                  >
                    {route.label}
                    <span className="mr-2 font-mono text-[11px] text-slate-400">{route.path}</span>
                  </span>
                ))}
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
};

export default MarketplaceFeatureAudit;
