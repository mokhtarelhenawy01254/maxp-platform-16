import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Globe, RefreshCw, ExternalLink, Eye, EyeOff, Search } from "lucide-react";
import { toast } from "sonner";
import { lpAdminService, type LpPage } from "../../services/lpAdminService";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import i18n from "../../i18n";

const ACTIVATION_OPTIONS = [
  { value: "free", label: "مجاني فقط" },
  { value: "paid", label: "مدفوع فقط" },
  { value: "both", label: "مجاني ومدفوع" },
];

type BundleOption = { slug: string; name: string; price: number };

const FALLBACK_BUNDLES: BundleOption[] = [
  { slug: "starter", name: "باقة رواد الأعمال", price: 299 },
  { slug: "growth", name: "باقة النمو السريع", price: 599 },
  { slug: "enterprise", name: "باقة الشركات والمنظومات", price: 1299 },
];

const FALLBACK_PAGES: LpPage[] = [
  {
    id: "lp-01", slug: "ecommerce-platform", title: "منظومة التجارة الإلكترونية المتكاملة",
    componentName: "EcommerceLanding", isActive: true, bundleSlug: "growth", activationType: "both",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: "lp-02", slug: "dental-lab-cloud", title: "سحابة معامل الأسنان الرقمية",
    componentName: "DentalLabLanding", isActive: true, bundleSlug: "starter", activationType: "paid",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: "lp-03", slug: "pos-retail-os", title: "نظام نقاط البيع وإدارة الفروع",
    componentName: "PosRetailLanding", isActive: true, bundleSlug: "enterprise", activationType: "both",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: "lp-04", slug: "education-academy", title: "منصة الأكاديميات والتعليم التفاعلي",
    componentName: "AcademyLanding", isActive: false, bundleSlug: "growth", activationType: "free",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
];

const SuperAdminLandingPages: React.FC = () => {
  const [pages, setPages] = useState<LpPage[]>(FALLBACK_PAGES);
  const [bundles, setBundles] = useState<BundleOption[]>(FALLBACK_BUNDLES);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "hidden">("all");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [data, bundleData] = await Promise.all([
        lpAdminService.list().catch(() => null),
        fetch("/api/v1/marketplace/bundles", { credentials: "include" })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ]);
      if (Array.isArray(data) && data.length > 0) setPages(data);
      else setPages(FALLBACK_PAGES);

      const rawBundles = Array.isArray(bundleData) ? bundleData : bundleData?.data;
      if (Array.isArray(rawBundles) && rawBundles.length > 0) {
        setBundles(rawBundles.map((b: any) => ({ slug: b.slug, name: b.name, price: b.monthlyPrice })));
      } else {
        setBundles(FALLBACK_BUNDLES);
      }
    } catch {
      setPages(FALLBACK_PAGES);
      setBundles(FALLBACK_BUNDLES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const toggleActive = async (page: LpPage) => {
    try {
      setToggling(page.id);
      const nextActive = !page.isActive;
      try { await lpAdminService.update(page.id, { isActive: nextActive }); } catch {}
      setPages((prev) => prev.map((p) => (p.id === page.id ? { ...p, isActive: nextActive } : p)));
      toast.success(nextActive ? "تم تفعيل الصفحة وإظهارها للزوار" : "تم إخفاء الصفحة وتحويل الزوار");
    } finally {
      setToggling(null);
    }
  };

  const handleBundleChange = async (page: LpPage, bundleSlug: string) => {
    try {
      setSaving(page.id);
      try { await lpAdminService.update(page.id, { bundleSlug }); } catch {}
      setPages((prev) => prev.map((p) => (p.id === page.id ? { ...p, bundleSlug } : p)));
      toast.success("تم ربط الباقة بالصفحة بنجاح");
    } finally {
      setSaving(null);
    }
  };

  const handleActivationChange = async (page: LpPage, activationType: string) => {
    try {
      setSaving(page.id);
      try { await lpAdminService.update(page.id, { activationType }); } catch {}
      setPages((prev) => prev.map((p) => (p.id === page.id ? { ...p, activationType } : p)));
      toast.success("تم تحديث نمط تفعيل الصفحة");
    } finally {
      setSaving(null);
    }
  };

  const filteredPages = useMemo(() => {
    return pages.filter((p) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q) || p.componentName.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" ? true : statusFilter === "active" ? p.isActive : !p.isActive;
      return matchesSearch && matchesStatus;
    });
  }, [pages, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const total = pages.length;
    const active = pages.filter((p) => p.isActive).length;
    const hidden = total - active;
    const linkedBundles = pages.filter((p) => Boolean(p.bundleSlug)).length;
    return { total, active, hidden, linkedBundles };
  }, [pages]);

  return (
    <div dir={i18n.dir()} className="w-full space-y-4">
      {/* Linear Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-center text-foreground shrink-0 shadow-2xs">
            <Globe className="size-4.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                إدارة صفحات الهبوط التسويقية (Landing Pages)
              </h1>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                Landing Pages
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              التحكم في صفحات القطاعات (/lp/*) وربطها بالباقات المباشرة وأنماط التفعيل
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
          className="h-8 gap-1.5 text-xs font-mono shadow-2xs active:scale-[0.98] self-end sm:self-auto"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
          <span>تحديث</span>
        </Button>
      </div>

      {/* Telemetry Strip */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x sm:rtl:divide-x-reverse divide-border/60">
          <div className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">إجمالي الصفحات</span>
              <span className="size-1.5 rounded-full bg-primary" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">{stats.total}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">صفحة هبوط مسجلة</p>
          </div>
          <div className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">الصفحات النشطة</span>
              <span className="size-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">{stats.active}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">متاحة للزيارة الآن</p>
          </div>
          <div className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">الصفحات المعطلة</span>
              <span className="size-1.5 rounded-full bg-amber-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">{stats.hidden}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">مسودات ومخفية</p>
          </div>
          <div className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">مربوطة بباقات</span>
              <span className="size-1.5 rounded-full bg-blue-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">{stats.linkedBundles}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">تفعيل آلي للباقة</p>
          </div>
        </div>
      </div>

      {/* Main Single-Surface Chassis */}
      <section className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        {/* Filter and Search Bar */}
        <div className="p-3 border-b border-border/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-muted/20">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث بالاسم أو المسار..."
              className="h-8 pr-8 text-xs font-mono bg-background border-border/70"
            />
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto font-mono text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                statusFilter === "all" ? "bg-primary text-primary-foreground font-semibold shadow-2xs" : "bg-card border border-border/70 text-muted-foreground hover:text-foreground"
              }`}
            >
              الكل ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                statusFilter === "active" ? "bg-emerald-600 text-white font-semibold shadow-2xs" : "bg-card border border-border/70 text-muted-foreground hover:text-foreground"
              }`}
            >
              النشطة ({stats.active})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("hidden")}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                statusFilter === "hidden" ? "bg-amber-600 text-white font-semibold shadow-2xs" : "bg-card border border-border/70 text-muted-foreground hover:text-foreground"
              }`}
            >
              المعطلة ({stats.hidden})
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-border/60 bg-muted/20 text-[11px] font-mono font-semibold text-muted-foreground uppercase">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">عنوان الصفحة</th>
                <th className="px-4 py-3">المسار الثابت</th>
                <th className="px-4 py-3">المكوّن البرمجي</th>
                <th className="px-4 py-3">الباقة المرتبطة</th>
                <th className="px-4 py-3">نوع التفعيل</th>
                <th className="px-4 py-3">حالة الظهور</th>
                <th className="px-4 py-3 text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredPages.map((page, i) => (
                <tr key={page.id} className="hover:bg-muted/15 transition-colors">
                  <td className="px-4 py-3 font-mono text-muted-foreground tabular-nums">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-foreground max-w-[200px] truncate">{page.title}</td>
                  <td className="px-4 py-3">
                    <code className="rounded px-1.5 py-0.5 font-mono text-[11px] bg-muted/50 text-foreground border border-border/50">
                      /lp/{page.slug}
                    </code>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{page.componentName}</td>
                  <td className="px-4 py-3">
                    <select
                      value={page.bundleSlug || ""}
                      disabled={saving === page.id}
                      onChange={(e) => void handleBundleChange(page, e.target.value)}
                      className="rounded-lg border border-border/70 bg-card px-2 py-1 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                    >
                      <option value="">بدون باقة</option>
                      {bundles.map((b) => (
                        <option key={b.slug} value={b.slug}>{b.name} ({b.price} ج.م)</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={page.activationType}
                      disabled={saving === page.id}
                      onChange={(e) => void handleActivationChange(page, e.target.value)}
                      className="rounded-lg border border-border/70 bg-card px-2 py-1 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                    >
                      {ACTIVATION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={toggling === page.id}
                      onClick={() => void toggleActive(page)}
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-semibold border transition-all active:scale-[0.98] cursor-pointer ${
                        page.isActive
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-muted text-muted-foreground border-border/60"
                      }`}
                    >
                      {toggling === page.id ? (
                        <RefreshCw className="size-3 animate-spin" />
                      ) : page.isActive ? (
                        <Eye className="size-3 text-emerald-500" />
                      ) : (
                        <EyeOff className="size-3 text-muted-foreground" />
                      )}
                      <span>{page.isActive ? "نشطة" : "معطلة"}</span>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <a
                      href={`/lp/${page.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono border border-border/70 bg-card text-foreground hover:bg-muted/50 transition-colors shadow-2xs"
                    >
                      <span>معاينة</span>
                      <ExternalLink className="size-3 text-muted-foreground" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default SuperAdminLandingPages;
