import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Globe,
  RefreshCw,
  ExternalLink,
  Eye,
  EyeOff,
  Package,
  Search,
  Sparkles,
  Layers,
  CheckCircle2,
  XCircle,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import { lpAdminService, type LpPage } from "../../services/lpAdminService";
import i18n from "../../i18n";

const ACTIVATION_OPTIONS = [
  { value: "free", label: "مجاني فقط" },
  { value: "paid", label: "مدفوع فقط" },
  { value: "both", label: "مجاني ومدفوع" },
];

type BundleOption = { slug: string; name: string; price: number };

const SuperAdminLandingPages: React.FC = () => {
  const [pages, setPages] = useState<LpPage[]>([]);
  const [bundles, setBundles] = useState<BundleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "hidden">("all");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [data, bundleData] = await Promise.all([
        lpAdminService.list(),
        fetch("/api/v1/marketplace/bundles", { credentials: "include" }).then((r) =>
          r.ok ? r.json() : []
        ),
      ]);
      setPages(Array.isArray(data) ? data : []);
      const rawBundles = Array.isArray(bundleData) ? bundleData : bundleData?.data || [];
      setBundles(rawBundles.map((b: any) => ({ slug: b.slug, name: b.name, price: b.monthlyPrice })));
    } catch {
      tToast.error("SuperAdminLandingPages.failed_load_65d1");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleActive = async (page: LpPage) => {
    try {
      setToggling(page.id);
      const updated = await lpAdminService.update(page.id, { isActive: !page.isActive });
      setPages((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      toast.success(updated.isActive ? "تم تفعيل الصفحة وإظهارها للزوار" : "تم إخفاء الصفحة وتحويل الزوار");
    } catch {
      tToast.error("SuperAdminLandingPages.failed_update_status_4f34");
    } finally {
      setToggling(null);
    }
  };

  const handleBundleChange = async (page: LpPage, bundleSlug: string) => {
    try {
      setSaving(page.id);
      const updated = await lpAdminService.update(page.id, { bundleSlug });
      setPages((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      tToast.success("SuperAdminLandingPages.msg_bae8");
    } catch {
      tToast.error("SuperAdminLandingPages.failed_update_dddb");
    } finally {
      setSaving(null);
    }
  };

  const handleActivationChange = async (page: LpPage, activationType: string) => {
    try {
      setSaving(page.id);
      const updated = await lpAdminService.update(page.id, { activationType });
      setPages((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      tToast.success("SuperAdminLandingPages.success_update_e302");
    } catch {
      tToast.error("SuperAdminLandingPages.failed_update_58c9");
    } finally {
      setSaving(null);
    }
  };

  const filteredPages = useMemo(() => {
    return pages.filter((p) => {
      const matchesSearch =
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.componentName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
          ? p.isActive
          : !p.isActive;
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
    <div dir={i18n.dir()} className="w-full min-h-screen bg-background text-foreground space-y-5 p-4 sm:p-6">
      {/* Top Header Chassis */}
      <header className="rounded-xl border border-border/70 bg-card p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary">
                <Globe className="size-4" />
              </span>
              <p className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                Governance & Routing
              </p>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              إدارة صفحات اللاندينغ المركزية
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              تحكم دقيق في ظهور ومسارات صفحات الهبوط الثابتة{" "}
              <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted text-foreground border border-border/50">
                /lp/*
              </code>{" "}
              وربطها التلقائي بباقات الاشتراك ومسارات التحويل.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>تحديث البيانات</span>
            </button>
          </div>
        </div>
      </header>

      {/* HQ Builder Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex size-2 rounded-full bg-primary animate-pulse" />
            <h3 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="size-4 text-primary" />
              منشئ صفحات الهبوط البيعية لمنتجات الشركة (HQ)
            </h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">
            بناء وتخصيص صفحات الهبوط الترويجية الخاصة بمنتجات max-p مع تكامل فوري بنظام الطلبات، المخزون، وتتبع بكسلات الإعلانات.
          </p>
        </div>
        <Link
          to="/advertising/product-landing-pages"
          className="inline-flex items-center gap-2 shrink-0 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-95 transition-all active:scale-[0.98]"
        >
          <span>منشئ صفحات الهبوط</span>
          <ExternalLink className="size-3.5" />
        </Link>
      </div>

      {/* Telemetry Summary Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 rounded-xl border border-border/80 bg-card/40 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border/60 overflow-hidden shadow-xs">
        <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-[11px]">إجمالي الصفحات</span>
            <span className="size-1.5 rounded-full bg-slate-400" />
          </div>
          <div className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums">
            {stats.total}
          </div>
          <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">صفحة هبوط مسجلة</p>
        </div>

        <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-[11px]">الصفحات النشطة</span>
            <span className="size-1.5 rounded-full bg-emerald-500" />
          </div>
          <div className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
            {stats.active}
          </div>
          <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">متاحة وموجهة للزوار</p>
        </div>

        <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-[11px]">الصفحات المعطلة</span>
            <span className="size-1.5 rounded-full bg-amber-500" />
          </div>
          <div className="text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">
            {stats.hidden}
          </div>
          <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">مخفية أو تحت التعديل</p>
        </div>

        <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-[11px]">مرتبطة بباقة</span>
            <span className="size-1.5 rounded-full bg-primary" />
          </div>
          <div className="text-xl font-bold tracking-tight text-primary font-mono tabular-nums">
            {stats.linkedBundles}
          </div>
          <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">تحويل مباشر للاشتراك</p>
        </div>
      </div>

      {/* Main Single-Surface Chassis */}
      <section className="rounded-xl border border-border/70 bg-card shadow-sm overflow-hidden">
        {/* Table Filter Controls */}
        <div className="p-4 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث بالعنوان، الرابط أو الكومبوننت..."
              className="w-full pl-3 pr-9 py-2 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                statusFilter === "all"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-background border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              الكل ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                statusFilter === "active"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-background border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              النشطة ({stats.active})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("hidden")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                statusFilter === "hidden"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-background border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              المعطلة ({stats.hidden})
            </button>
          </div>
        </div>

        {/* Data Table */}
        {loading ? (
          <div className="flex h-56 items-center justify-center gap-3 text-muted-foreground">
            <RefreshCw className="size-5 animate-spin text-primary" />
            <span className="text-xs font-medium">جاري فحص وتحديث قائمة الصفحات...</span>
          </div>
        ) : filteredPages.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground space-y-2">
            <FileText className="size-8 text-muted-foreground/50" />
            <p className="text-xs font-medium">لا توجد صفحات مطابقة لمعايير البحث</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-border/70 bg-muted/30 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-3.5">#</th>
                  <th className="px-4 py-3.5">عنوان الصفحة</th>
                  <th className="px-4 py-3.5">المسار الثابت</th>
                  <th className="px-4 py-3.5">المكوّن البرمجي</th>
                  <th className="px-4 py-3.5">الباقة المرتبطة</th>
                  <th className="px-4 py-3.5">نوع التفعيل</th>
                  <th className="px-4 py-3.5">حالة الظهور</th>
                  <th className="px-4 py-3.5 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredPages.map((page, i) => (
                  <tr
                    key={page.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3.5 font-mono text-muted-foreground tabular-nums">
                      {i + 1}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-foreground max-w-[200px] truncate">
                      {page.title}
                    </td>
                    <td className="px-4 py-3.5">
                      <code className="rounded px-2 py-0.5 font-mono text-[11px] bg-muted text-foreground border border-border/50">
                        /lp/{page.slug}
                      </code>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[11px] text-muted-foreground">
                      {page.componentName}
                    </td>
                    <td className="px-4 py-3.5">
                      <select
                        value={page.bundleSlug || ""}
                        disabled={saving === page.id}
                        onChange={(e) => void handleBundleChange(page, e.target.value || ("" as any))}
                        className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                      >
                        <option value="">— بدون باقة —</option>
                        {bundles.map((b) => (
                          <option key={b.slug} value={b.slug}>
                            {b.name} ({b.price} ج.م)
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3.5">
                      <select
                        value={page.activationType}
                        disabled={saving === page.id}
                        onChange={(e) => void handleActivationChange(page, e.target.value)}
                        className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                      >
                        {ACTIVATION_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        disabled={toggling === page.id}
                        onClick={() => void toggleActive(page)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all active:scale-[0.98] ${
                          page.isActive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                            : "bg-muted text-muted-foreground border-border"
                        } ${toggling === page.id ? "opacity-60" : ""}`}
                      >
                        {toggling === page.id ? (
                          <RefreshCw className="size-3 animate-spin" />
                        ) : page.isActive ? (
                          <Eye className="size-3" />
                        ) : (
                          <EyeOff className="size-3" />
                        )}
                        <span>{page.isActive ? "نشطة وظاهرة" : "معطلة ومخفية"}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <a
                        href={`/lp/${page.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border border-border bg-background text-foreground hover:bg-muted transition-colors"
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
        )}
      </section>
    </div>
  );
};

export default SuperAdminLandingPages;
