import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import { lpAdminService, type LpPage } from "../../services/lpAdminService";
import i18n from "../../i18n";

const ACTIVATION_OPTIONS = [
  { value: "free", label: "مجاني فقط" },
  { value: "paid", label: "مقابل فقط" },
  { value: "both", label: "مجاني ومقابل" },
];

type BundleOption = { slug: string; name: string; price: number };

const SuperAdminLandingPages: React.FC = () => {
  const [pages, setPages] = useState<LpPage[]>([]);
  const [bundles, setBundles] = useState<BundleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [data, bundleData] = await Promise.all([
        lpAdminService.list(),
        fetch("/api/v1/marketplace/bundles", { credentials: "include" }).then(r => r.ok ? r.json() : []),
      ]);
      setPages(data);
      const rawBundles = Array.isArray(bundleData) ? bundleData : bundleData?.data || [];
      setBundles(rawBundles.map((b: any) => ({ slug: b.slug, name: b.name, price: b.monthlyPrice })));
    } catch {
      tToast.error("SuperAdminLandingPages.failed_load_65d1");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const toggleActive = async (page: LpPage) => {
    try {
      setToggling(page.id);
      const updated = await lpAdminService.update(page.id, { isActive: !page.isActive });
      setPages((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      toast.success(updated.isActive ? "تم تفعيل الصفحة" : "تم إخفاء الصفحة");
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

  if (loading) {
    return (
      <div dir={i18n.dir()} className="bg-slate-50 p-6 dark:bg-slate-900">
        <div className="mx-auto flex h-[60vh] max-w-6xl 2xl:max-w-7xl items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
            <ArrowPathIcon className="h-6 w-6 animate-spin" />
            <span className="text-sm font-semibold">جاري تحميل الصفحات...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div dir={i18n.dir()} className="bg-slate-50 p-6 dark:bg-slate-900">
      <div className="mx-auto max-w-6xl 2xl:max-w-7xl space-y-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
            Landing Pages Management
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
            إدارة صفحات اللاندينغ
          </h1>
          <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
            تحكم في ظهور صفحات اللاندينغ الثابتة <span dir="ltr" className="font-mono">/lp/*</span>. إخفاء الصفحة يمنع الوصول إليها ويحوّل الزائر إلى الصفحة الرئيسية.
          </p>
        </header>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-indigo-200/80 bg-indigo-50/60 p-5 dark:border-indigo-900/60 dark:bg-indigo-950/30">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex size-2 rounded-full bg-indigo-600 animate-pulse" />
              <h3 className="text-sm font-bold text-indigo-950 dark:text-indigo-200">
                صفحات الهبوط البيعية لمنتجات الشركة (HQ): max-p
              </h3>
            </div>
            <p className="text-xs text-indigo-800/80 dark:text-indigo-300/80 leading-relaxed">
              إنشاء وإدارة صفحات الهبوط البيعية لمنتجات وعروض شركة max-p مع ربط مباشر ومكتمل بنظام الطلبات والمخزون والتتبع.
            </p>
          </div>
          <Link
            to="/advertising/product-landing-pages"
            className="inline-flex items-center gap-1.5 shrink-0 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
          >
            منشئ صفحات الهبوط (HQ)
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          </Link>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          {pages.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
              لا توجد صفحات بعد
            </div>
          ) : (
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-[0.1em] text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  <th className="px-5 py-4">#</th>
                  <th className="px-5 py-4">العنوان</th>
                  <th className="px-5 py-4">المسار</th>
                  <th className="px-5 py-4">الكومبوننت</th>
                  <th className="px-5 py-4">الباقة</th>
                  <th className="px-5 py-4">نوع التفعيل</th>
                  <th className="px-5 py-4">الحالة</th>
                  <th className="px-5 py-4">معاينة</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((page, i) => (
                  <tr
                    key={page.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-700/50 dark:hover:bg-slate-700/30"
                  >
                    <td className="px-5 py-4 font-mono text-xs text-slate-400">{i + 1}</td>
                    <td className="px-5 py-4 font-medium text-slate-900 dark:text-white text-xs">
                      {page.title}
                    </td>
                    <td className="px-5 py-4">
                      <code className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                        /lp/{page.slug}
                      </code>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {page.componentName}
                    </td>
                    <td className="px-5 py-4">
                      <select
                        value={page.bundleSlug || ""}
                        disabled={saving === page.id}
                        onChange={(e) => void handleBundleChange(page, e.target.value || (null as any))}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                      >
                        <option value="">— بدون باقة —</option>
                        {bundles.map((b) => (
                          <option key={b.slug} value={b.slug}>{b.name} ({b.price} ج.م)</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      <select
                        value={page.activationType}
                        disabled={saving === page.id}
                        onChange={(e) => void handleActivationChange(page, e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                      >
                        {ACTIVATION_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        disabled={toggling === page.id}
                        onClick={() => void toggleActive(page)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                          page.isActive
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300"
                        } ${toggling === page.id ? "opacity-60" : ""}`}
                      >
                        {toggling === page.id ? (
                          <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                        ) : page.isActive ? (
                          <CheckCircleIcon className="h-3.5 w-3.5" />
                        ) : (
                          <XCircleIcon className="h-3.5 w-3.5" />
                        )}
                        {page.isActive ? "ظاهر" : "مخفي"}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <a
                        href={`/lp/${page.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
                      >
                        فتح
                        <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
};

export default SuperAdminLandingPages;
