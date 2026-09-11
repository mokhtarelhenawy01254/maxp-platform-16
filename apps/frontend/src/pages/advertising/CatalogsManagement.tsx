/**
 * Catalogs Management Page
 *
 * صفحة إدارة Product Catalogs
 */

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  PlusIcon,
  TrashIcon,
  EyeIcon,
  ArrowPathIcon,
  FolderIcon,
  ShoppingBagIcon,
  LinkIcon,
  ClipboardDocumentIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import {
  facebookAdsService,
  FacebookProductCatalog,
} from "../../services/facebookAdsService";
import FacebookAdsModuleNav from "../../components/advertising/FacebookAdsModuleNav";
import { useAuth } from "../../hooks/useAuthSimple";

const CatalogsManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [catalogs, setCatalogs] = useState<FacebookProductCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [businessId, setBusinessId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [includeHidden, setIncludeHidden] = useState(false);

  useEffect(() => {
    loadCatalogs();
  }, []);

  const loadCatalogs = async () => {
    try {
      setLoading(true);
      setErrors({});

      if (!businessId) {
        setErrors({ businessId: "Business ID is required" });
        setLoading(false);
        return;
      }

      const data = await facebookAdsService.getCatalogs(businessId);
      setCatalogs(data);
    } catch (error: any) {
      console.error("Error loading catalogs:", error);
      const errorMsg = error?.response?.data?.error || "فشل في تحميل Catalogs";
      toast.error(errorMsg);
      if (errorMsg.includes("Business ID")) {
        setErrors({ businessId: errorMsg });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCatalogs();
    setRefreshing(false);
    tToast.success("CatalogsManagement.success_update_522e");
  };

  const handleCreateCatalog = () => {
    navigate("/advertising/facebook-ads/catalogs/create");
  };

  const handleViewCatalog = (id: string) => {
    navigate(`/advertising/facebook-ads/catalogs/${id}`);
  };

  const handleDeleteCatalog = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      !confirm(
        "هل أنت متأكد من حذف هذا Catalog؟ سيتم حذف جميع المنتجات المرتبطة به.",
      )
    )
      return;

    try {
      await facebookAdsService.deleteCatalog(id);
      tToast.success("CatalogsManagement.success_delete_47bf");
      await loadCatalogs();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "فشل في حذف Catalog");
    }
  };

  const getSyncStatusBadge = (status?: string) => {
    if (!status) return "bg-gray-100 text-gray-800";

    switch (status) {
      case "SUCCESS":
        return "bg-green-100 text-green-800";
      case "FAILED":
        return "bg-red-100 text-red-800";
      case "IN_PROGRESS":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getSyncStatusLabel = (status?: string) => {
    if (!status) return "غير متزامن";

    switch (status) {
      case "SUCCESS":
        return "مكتمل";
      case "FAILED":
        return "فشل";
      case "IN_PROGRESS":
        return "جاري المزامنة";
      default:
        return "غير متزامن";
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-950/50">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-indigo-500/20" />
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent dark:border-indigo-400" />
        </div>
        <p className="mt-4 text-sm font-medium text-slate-500 animate-pulse">جاري تحميل الكتالوجات...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-8 bg-[#f8fafc] px-4 py-8 dark:bg-[#030712] sm:px-6 lg:px-8">
      <FacebookAdsModuleNav />
      {/* Elite Command Bar */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between rounded-3xl bg-white/70 p-6 backdrop-blur-xl border border-slate-200/60 shadow-sm dark:bg-slate-900/50 dark:border-slate-800/60">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
              <ShoppingBagIcon className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              إدارة <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-500">الكتالوجات</span>
            </h1>
          </div>
          <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400 max-w-2xl">
            مزامنة وإدارة كتالوجات المنتجات لاستخدامها في إعلانات Dynamic Product Ads وإعادة الاستهداف المتقدم.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="group flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/80"
          >
            <ArrowPathIcon className={`h-4 w-4 transition-transform group-hover:rotate-180 ${refreshing ? "animate-spin" : ""}`} />
            تحديث
          </button>
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>
          <button
            onClick={handleCreateCatalog}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition-all hover:bg-indigo-700 hover:shadow-lg dark:shadow-none"
          >
            <PlusIcon className="h-5 w-5" />
            كتالوج جديد
          </button>
        </div>
      </div>

      {/* Business ID Bar */}
      <div className="rounded-3xl bg-white/70 p-6 backdrop-blur-xl border border-slate-200/60 shadow-sm dark:bg-slate-900/50 dark:border-slate-800/60">
        <label className="mb-2.5 block text-sm font-bold text-slate-700 dark:text-slate-300">
          Business ID (لاستيراد الكتالوجات من حساب أعمال محدد)
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
              <FolderIcon className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              value={businessId}
              onChange={(e) => {
                setBusinessId(e.target.value);
                if (errors["businessId"]) setErrors({ ...errors, businessId: "" });
              }}
              placeholder="مثال: 1234567890"
              className={`w-full rounded-xl border bg-white px-4 py-3 pr-11 text-sm font-medium outline-none transition-all focus:ring-4 dark:bg-slate-950 dark:text-white ${errors["businessId"] ? "border-red-400 focus:border-red-500 focus:ring-red-500/10 dark:border-red-500/50" : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10 dark:border-slate-700 dark:focus:border-indigo-400"}`}
            />
          </div>
          <button
            onClick={loadCatalogs}
            className="h-12 w-full sm:w-auto rounded-xl bg-slate-900 px-8 font-bold text-white shadow-sm transition-all hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            استيراد
          </button>
        </div>
        {errors["businessId"] && (
          <p className="mt-3 text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-100 text-[10px] dark:bg-red-900/30">!</span>
            {errors["businessId"]}
          </p>
        )}
      </div>

      {/* Product Feed URL Section */}
      {user?.company?.slug && (
        <div className="rounded-3xl bg-white/70 p-6 backdrop-blur-xl border border-slate-200/60 shadow-sm dark:bg-slate-900/50 dark:border-slate-800/60">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <DocumentTextIcon className="w-5 h-5 text-indigo-600" />
            Product Feed URL
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            استخدم هذا الرابط في Facebook Catalog أو أي منصة أخرى لاستيراد منتجات متجرك تلقائياً — مش محتاج تعمل كتالوج
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={`https://${user.company.slug}.maxp.online/api/v1/public/products/feed/${includeHidden ? '?includeHidden=true' : ''}`}
              className="flex-1 px-3 py-2 text-sm text-gray-700 bg-gray-50 border border-gray-300 rounded-lg ltr text-left font-mono dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600"
              onClick={(e) => e.currentTarget.select()}
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(`https://${user.company.slug}.maxp.online/api/v1/public/products/feed/${includeHidden ? '?includeHidden=true' : ''}`);
                tToast.success("CatalogsManagement.msg_eddf");
              }}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              <ClipboardDocumentIcon className="w-4 h-4" />
              نسخ
            </button>
          </div>
          <label className="mt-3 flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeHidden}
              onChange={(e) => setIncludeHidden(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              تضمين المنتجات المخفية في الفيد
            </span>
          </label>
        </div>
      )}

      {/* Catalog List */}
      <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        {catalogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 text-slate-400 dark:bg-slate-800">
              <ShoppingBagIcon className="h-10 w-10" />
            </div>
            <h3 className="mt-6 text-xl font-black text-slate-900 dark:text-white">لا توجد كتالوجات</h3>
            <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400 max-w-sm">
              قم بربط كتالوجات المنتجات الخاصة بك للاستفادة من الإعلانات التفاعلية القائمة على المنتجات.
            </p>
            <button
              onClick={handleCreateCatalog}
              className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 font-bold text-white shadow-md shadow-indigo-600/20 transition-all hover:bg-indigo-700 hover:shadow-lg dark:shadow-none"
            >
              <PlusIcon className="h-5 w-5" />
              إنشاء كتالوج
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50/50 text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-4 font-bold">معلومات الكتالوج</th>
                  <th className="px-6 py-4 font-bold">حالة المزامنة</th>
                  <th className="px-6 py-4 font-bold">الحالة</th>
                  <th className="px-6 py-4 font-bold">الإنشاء</th>
                  <th className="px-6 py-4 text-left font-bold">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {catalogs.map((catalog) => (
                  <tr key={catalog.id} onClick={() => handleViewCatalog(catalog.id)} className="group cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/60">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500 dark:bg-indigo-900/30 dark:text-indigo-400">
                          <ShoppingBagIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                            {catalog.name}
                          </div>
                          {catalog.description && (
                            <div className="mt-1 text-xs font-medium text-slate-500 max-w-xs truncate">{catalog.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 dark:text-white">{catalog.syncedProducts || 0}</span>
                          <span className="text-xs text-slate-500">/ {catalog.totalProducts || 0} منتج</span>
                        </div>
                        {catalog.lastSyncAt ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400">
                              {new Date(catalog.lastSyncAt).toLocaleDateString("ar-EG")}
                            </span>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${getSyncStatusBadge(catalog.lastSyncStatus)}`}>
                              {getSyncStatusLabel(catalog.lastSyncStatus)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400">لم تتم المزامنة بعد</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${catalog.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : catalog.status === "PAUSED" ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${catalog.status === "ACTIVE" ? "bg-emerald-500" : catalog.status === "PAUSED" ? "bg-amber-500" : "bg-slate-400"}`}></span>
                        {catalog.status === "ACTIVE" ? "نشط" : catalog.status === "PAUSED" ? "مؤقت" : "محذوف"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-500 dark:text-slate-400">
                      {new Date(catalog.createdAt).toLocaleDateString("ar-EG")}
                    </td>
                    <td className="px-6 py-4 text-left">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={(e) => { e.stopPropagation(); handleViewCatalog(catalog.id); }} className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors hover:bg-indigo-100 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-indigo-900/50 dark:hover:text-indigo-400">
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button onClick={(e) => handleDeleteCatalog(catalog.id, e)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors hover:bg-red-100 hover:text-red-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-red-900/50 dark:hover:text-red-400">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CatalogsManagement;
