import React, { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  ExternalLink,
  Filter,
  Loader2,
  Megaphone,
  Search,
} from "lucide-react";
import {
  type FacebookAdLibraryAd,
  facebookAdsService,
} from "../../services/facebookAdsService";
import FacebookAdsModuleNav from "../../components/advertising/FacebookAdsModuleNav";

type SearchMode = "terms" | "pages";

const activeStatusOptions = [
  { value: "ACTIVE", label: "النشطة" },
  { value: "ALL", label: "الكل" },
  { value: "INACTIVE", label: "المتوقفة" },
] as const;

const adTypeOptions = [
  { value: "ALL", label: "كل الإعلانات" },
  { value: "POLITICAL_AND_ISSUE_ADS", label: "سياسية / قضايا" },
] as const;

const mediaTypeOptions = [
  { value: "ALL", label: "كل الوسائط" },
  { value: "IMAGE", label: "صور" },
  { value: "VIDEO", label: "فيديو" },
  { value: "MEME", label: "Meme" },
  { value: "NONE", label: "بدون وسائط" },
] as const;

const platformOptions = [
  { value: "FACEBOOK", label: "Facebook" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "MESSENGER", label: "Messenger" },
  { value: "AUDIENCE_NETWORK", label: "Audience Network" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "THREADS", label: "Threads" },
];

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function firstText(value?: string[]) {
  return Array.isArray(value) && value.length > 0 ? value[0] : "";
}

function formatRange(value?: { lower_bound?: string; upper_bound?: string }) {
  if (!value?.lower_bound && !value?.upper_bound) {
    return "غير متاح";
  }

  if (value.lower_bound && value.upper_bound) {
    return `${value.lower_bound} - ${value.upper_bound}`;
  }

  return value.lower_bound || value.upper_bound || "غير متاح";
}

function formatDate(value?: string) {
  if (!value) {
    return "غير محدد";
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ar-EG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
}

const AdLibraryResearch: React.FC = () => {
  const [searchMode, setSearchMode] = useState<SearchMode>("terms");
  const [query, setQuery] = useState("");
  const [countries, setCountries] = useState("EG");
  const [adActiveStatus, setAdActiveStatus] =
    useState<(typeof activeStatusOptions)[number]["value"]>("ACTIVE");
  const [adType, setAdType] =
    useState<(typeof adTypeOptions)[number]["value"]>("ALL");
  const [mediaType, setMediaType] =
    useState<(typeof mediaTypeOptions)[number]["value"]>("ALL");
  const [publisherPlatforms, setPublisherPlatforms] = useState<string[]>([
    "FACEBOOK",
    "INSTAGRAM",
  ]);
  const [deliveryDateMin, setDeliveryDateMin] = useState("");
  const [deliveryDateMax, setDeliveryDateMax] = useState("");
  const [limit, setLimit] = useState(25);
  const [results, setResults] = useState<FacebookAdLibraryAd[]>([]);
  const [apiVersion, setApiVersion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastSearchLabel, setLastSearchLabel] = useState("");

  const hasResults = results.length > 0;
  const selectedCountries = useMemo(() => splitList(countries), [countries]);

  const togglePlatform = (platform: string) => {
    setPublisherPlatforms((current) =>
      current.includes(platform)
        ? current.filter((item) => item !== platform)
        : [...current, platform],
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const cleanQuery = query.trim();
    if (!cleanQuery) {
      toast.error(
        searchMode === "terms"
          ? "اكتب كلمة بحث"
          : "اكتب Page ID واحد على الأقل",
      );
      return;
    }

    try {
      setLoading(true);
      const response = await facebookAdsService.searchAdLibrary({
        searchTerms: searchMode === "terms" ? cleanQuery : undefined,
        pageIds: searchMode === "pages" ? splitList(cleanQuery) : undefined,
        countries: selectedCountries.length > 0 ? selectedCountries : ["EG"],
        adActiveStatus,
        adType,
        mediaType,
        publisherPlatforms,
        deliveryDateMin: deliveryDateMin || undefined,
        deliveryDateMax: deliveryDateMax || undefined,
        limit,
      });

      setResults(response.data || []);
      setApiVersion(response.apiVersion || null);
      setLastSearchLabel(cleanQuery);
      if ((response.data || []).length === 0) {
        toast("لا توجد نتائج مطابقة");
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.error || error?.message || "فشل البحث";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 dark:bg-slate-950 dark:text-slate-50 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl 2xl:max-w-7xl flex-col gap-5">
        <FacebookAdsModuleNav />
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-5 dark:border-slate-800 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
              Meta Ad Library
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-normal sm:text-3xl">
              مكتبة الإعلانات
            </h1>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            <Megaphone className="h-4 w-4 text-blue-600" />
            <span>{apiVersion || "v25.0"}</span>
          </div>
        </header>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="flex flex-col gap-4">
              <div className="inline-flex w-full rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-950 sm:w-fit">
                {[
                  { value: "terms", label: "كلمة بحث" },
                  { value: "pages", label: "Page IDs" },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setSearchMode(item.value as SearchMode)}
                    className={[
                      "rounded-md px-4 py-2 text-sm font-black transition-colors",
                      searchMode === item.value
                        ? "bg-white text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white"
                        : "text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white",
                    ].join(" ")}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-black">
                  {searchMode === "terms" ? "البحث" : "Page IDs"}
                </span>
                <div className="relative">
                  <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-3 pr-10 text-sm font-semibold outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950"
                    placeholder={
                      searchMode === "terms"
                        ? "مثال: boots أو skincare"
                        : "مثال: 123456789,987654321"
                    }
                  />
                </div>
              </label>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-black">الدول</span>
                  <input
                    value={countries}
                    onChange={(event) => setCountries(event.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950"
                    placeholder="EG,SA,US"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-black">الحالة</span>
                  <select
                    value={adActiveStatus}
                    onChange={(event) =>
                      setAdActiveStatus(event.target.value as typeof adActiveStatus)
                    }
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950"
                  >
                    {activeStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-black">الحد</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={limit}
                    onChange={(event) => setLimit(Number(event.target.value))}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-3 flex items-center gap-2 text-sm font-black">
                <Filter className="h-4 w-4 text-blue-600" />
                <span>الفلاتر</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-black text-slate-500 dark:text-slate-400">
                    النوع
                  </span>
                  <select
                    value={adType}
                    onChange={(event) => setAdType(event.target.value as typeof adType)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none dark:border-slate-700 dark:bg-slate-900"
                  >
                    {adTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-xs font-black text-slate-500 dark:text-slate-400">
                    الوسائط
                  </span>
                  <select
                    value={mediaType}
                    onChange={(event) =>
                      setMediaType(event.target.value as typeof mediaType)
                    }
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none dark:border-slate-700 dark:bg-slate-900"
                  >
                    {mediaTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-xs font-black text-slate-500 dark:text-slate-400">
                    من
                  </span>
                  <input
                    type="date"
                    value={deliveryDateMin}
                    onChange={(event) => setDeliveryDateMin(event.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none dark:border-slate-700 dark:bg-slate-900"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-xs font-black text-slate-500 dark:text-slate-400">
                    إلى
                  </span>
                  <input
                    type="date"
                    value={deliveryDateMax}
                    onChange={(event) => setDeliveryDateMax(event.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none dark:border-slate-700 dark:bg-slate-900"
                  />
                </label>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {platformOptions.map((platform) => (
                  <button
                    key={platform.value}
                    type="button"
                    onClick={() => togglePlatform(platform.value)}
                    className={[
                      "rounded-md border px-3 py-1.5 text-xs font-black transition-colors",
                      publisherPlatforms.includes(platform.value)
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
                    ].join(" ")}
                  >
                    {platform.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span>بحث</span>
            </button>
          </div>
        </form>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-2 border-b border-slate-200 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-black">النتائج</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                {hasResults
                  ? `${results.length} نتيجة لـ ${lastSearchLabel}`
                  : "لا توجد نتائج معروضة"}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
              <CalendarDays className="h-4 w-4" />
              <span>{selectedCountries.join(", ") || "EG"}</span>
            </div>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {hasResults ? (
              results.map((ad) => {
                const title = firstText(ad.ad_creative_link_titles);
                const body = firstText(ad.ad_creative_bodies);

                return (
                  <article key={ad.id} className="p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-black">
                            {ad.page_name || "صفحة غير معروفة"}
                          </h3>
                          {ad.page_id ? (
                            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              {ad.page_id}
                            </span>
                          ) : null}
                        </div>
                        {title ? (
                          <p className="mt-2 text-sm font-black text-slate-900 dark:text-white">
                            {title}
                          </p>
                        ) : null}
                        {body ? (
                          <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                            {body}
                          </p>
                        ) : null}
                      </div>

                      {ad.ad_snapshot_url ? (
                        <a
                          href={ad.ad_snapshot_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-black text-slate-800 transition hover:border-blue-500 hover:text-blue-700 dark:border-slate-700 dark:text-slate-100 dark:hover:border-blue-400 dark:hover:text-blue-300"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span>Snapshot</span>
                        </a>
                      ) : null}
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
                        <p className="text-xs font-black text-slate-500">بدأ</p>
                        <p className="mt-1 text-sm font-bold">
                          {formatDate(ad.ad_delivery_start_time)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
                        <p className="text-xs font-black text-slate-500">توقف</p>
                        <p className="mt-1 text-sm font-bold">
                          {formatDate(ad.ad_delivery_stop_time)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
                        <p className="text-xs font-black text-slate-500">
                          الانطباعات
                        </p>
                        <p className="mt-1 text-sm font-bold">
                          {formatRange(ad.impressions)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
                        <p className="text-xs font-black text-slate-500">الإنفاق</p>
                        <p className="mt-1 text-sm font-bold">
                          {formatRange(ad.spend)} {ad.currency || ""}
                        </p>
                      </div>
                    </div>

                    {Array.isArray(ad.publisher_platforms) &&
                    ad.publisher_platforms.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {ad.publisher_platforms.map((platform) => (
                          <span
                            key={`${ad.id}-${platform}`}
                            className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700 dark:bg-blue-950 dark:text-blue-200"
                          >
                            {platform}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </article>
                );
              })
            ) : (
              <div className="flex min-h-[220px] items-center justify-center p-6 text-center">
                <div>
                  <Search className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-400">
                    ابدأ بحثًا لعرض الإعلانات المؤرشفة.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdLibraryResearch;
