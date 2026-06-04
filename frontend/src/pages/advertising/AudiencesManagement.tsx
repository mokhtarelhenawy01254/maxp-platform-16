/**
 * Audiences Management Page
 *
 * صفحة إدارة الجماهير (Custom & Lookalike Audiences)
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  PlusIcon,
  TrashIcon,
  EyeIcon,
  UserGroupIcon,
  SparklesIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import {
  facebookAdsService,
  FacebookCustomAudience,
  FacebookLookalikeAudience,
} from "../../services/facebookAdsService";

const AudiencesManagement: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"custom" | "lookalike">("custom");
  const [customAudiences, setCustomAudiences] = useState<
    FacebookCustomAudience[]
  >([]);
  const [lookalikeAudiences, setLookalikeAudiences] = useState<
    FacebookLookalikeAudience[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAudiences();
  }, [activeTab]);

  const loadAudiences = async () => {
    try {
      setLoading(true);
      if (activeTab === "custom") {
        const data = await facebookAdsService.getCustomAudiences();
        setCustomAudiences(data);
      } else {
        const data = await facebookAdsService.getLookalikeAudiences();
        setLookalikeAudiences(data);
      }
    } catch (error: any) {
      console.error("Error loading audiences:", error);
      toast.error(error?.response?.data?.error || "فشل في تحميل الجماهير");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAudiences();
    setRefreshing(false);
    toast.success("تم تحديث البيانات");
  };

  const handleCreateCustomAudience = () => {
    navigate("/advertising/facebook-ads/audiences/custom/create");
  };

  const handleCreateLookalikeAudience = () => {
    navigate("/advertising/facebook-ads/audiences/lookalike/create");
  };

  const handleDeleteCustomAudience = async (
    id: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    if (!confirm("هل أنت متأكد من حذف هذا الجمهور؟")) return;

    try {
      await facebookAdsService.deleteCustomAudience(id);
      toast.success("تم حذف الجمهور بنجاح");
      await loadAudiences();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "فشل في حذف الجمهور");
    }
  };

  const handleViewAudience = (id: string) => {
    if (activeTab === "custom") {
      navigate(`/advertising/facebook-ads/audiences/custom/${id}`);
    }
  };

  const getAudienceTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      CUSTOMER_LIST: "قائمة عملاء",
      WEBSITE: "زوار الموقع",
      ENGAGEMENT: "المتفاعلين",
      APP_ACTIVITY: "نشاط التطبيق",
      VIDEO_VIEW: "مشاهدي الفيديو",
    };
    return types[type] || type;
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-950/50">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-indigo-500/20" />
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent dark:border-indigo-400" />
        </div>
        <p className="mt-4 text-sm font-medium text-slate-500 animate-pulse">جاري تحميل الجماهير...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-8 bg-[#f8fafc] px-4 py-8 dark:bg-[#030712] sm:px-6 lg:px-8">
      {/* Elite Command Bar */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between rounded-3xl bg-white/70 p-6 backdrop-blur-xl border border-slate-200/60 shadow-sm dark:bg-slate-900/50 dark:border-slate-800/60">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
              <UserGroupIcon className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              إدارة <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-500">الجماهير</span>
            </h1>
          </div>
          <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400 max-w-2xl">
            إدارة شرائح العملاء والجماهير المشابهة (Lookalike) لرفع كفاءة الاستهداف وتقليل تكلفة الاستحواذ.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="group flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/80"
          >
            <ArrowPathIcon className={`h-4 w-4 transition-transform group-hover:rotate-180 ${refreshing ? "animate-spin" : ""}`} />
            تحديث البيانات
          </button>
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>
          <button
            onClick={activeTab === "custom" ? handleCreateCustomAudience : handleCreateLookalikeAudience}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition-all hover:bg-indigo-700 hover:shadow-lg dark:shadow-none"
          >
            <PlusIcon className="h-5 w-5" />
            {activeTab === "custom" ? "جمهور مخصص جديد" : "جمهور مشابه جديد"}
          </button>
        </div>
      </div>

      {/* Elite Tabs */}
      <div className="flex overflow-hidden rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 w-full sm:w-fit">
        <button
          onClick={() => setActiveTab("custom")}
          className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold transition-all ${activeTab === "custom" ? "bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:ring-indigo-800/50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50"}`}
        >
          <UserGroupIcon className="h-4 w-4" />
          الجماهير المخصصة <span className="ml-1.5 rounded-full bg-slate-200/50 px-2 py-0.5 text-xs dark:bg-slate-800">{customAudiences.length}</span>
        </button>
        <button
          onClick={() => setActiveTab("lookalike")}
          className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold transition-all ${activeTab === "lookalike" ? "bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:ring-indigo-800/50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50"}`}
        >
          <SparklesIcon className="h-4 w-4" />
          الجماهير المشابهة <span className="ml-1.5 rounded-full bg-slate-200/50 px-2 py-0.5 text-xs dark:bg-slate-800">{lookalikeAudiences.length}</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        {activeTab === "custom" ? (
          customAudiences.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
                <UserGroupIcon className="h-8 w-8" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">لا توجد جماهير مخصصة</h3>
              <p className="mt-2 text-sm text-slate-500 max-w-sm">ابدأ ببناء جماهير من قائمة عملائك، أو تفاعلات الصفحات والموقع لتعيد استهدافهم بفعالية.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50/50 text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="px-6 py-4 font-bold">الجمهور</th>
                    <th className="px-6 py-4 font-bold">المصدر / النوع</th>
                    <th className="px-6 py-4 font-bold">الحجم</th>
                    <th className="px-6 py-4 font-bold">الحالة</th>
                    <th className="px-6 py-4 font-bold">تاريخ الإنشاء</th>
                    <th className="px-6 py-4 text-left font-bold">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {customAudiences.map((audience) => (
                    <tr key={audience.id} onClick={() => handleViewAudience(audience.id)} className="group cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/60">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">{audience.name}</div>
                        {audience.description && <div className="mt-1 text-xs text-slate-500 max-w-xs truncate">{audience.description}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-lg bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          {getAudienceTypeLabel(audience.audienceType)}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-black text-slate-900 dark:text-white">
                        {audience.audienceSize ? audience.audienceSize.toLocaleString() : "قيد المعالجة"}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${audience.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${audience.status === "ACTIVE" ? "bg-emerald-500" : "bg-slate-400"}`}></span>
                          {audience.status === "ACTIVE" ? "نشط ومتاح" : "محذوف أو معلق"}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-500 dark:text-slate-400">
                        {new Date(audience.createdAt).toLocaleDateString("ar-EG")}
                      </td>
                      <td className="px-6 py-4 text-left">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={(e) => { e.stopPropagation(); handleViewAudience(audience.id); }} className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors hover:bg-indigo-100 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-indigo-900/50 dark:hover:text-indigo-400">
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button onClick={(e) => handleDeleteCustomAudience(audience.id, e)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors hover:bg-red-100 hover:text-red-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-red-900/50 dark:hover:text-red-400">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          lookalikeAudiences.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
                <SparklesIcon className="h-8 w-8" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">لا توجد جماهير مشابهة</h3>
              <p className="mt-2 text-sm text-slate-500 max-w-sm">قم بتوسيع نطاق حملاتك بإنشاء جماهير تتشابه بنسبة 1-10% مع أفضل عملائك الحاليين.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50/50 text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="px-6 py-4 font-bold">الجمهور</th>
                    <th className="px-6 py-4 font-bold">المصدر الأساسي</th>
                    <th className="px-6 py-4 font-bold">نسبة الشبه</th>
                    <th className="px-6 py-4 font-bold">الحجم</th>
                    <th className="px-6 py-4 font-bold">الحالة</th>
                    <th className="px-6 py-4 font-bold">الإنشاء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {lookalikeAudiences.map((audience) => (
                    <tr key={audience.id} className="group transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/60">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 dark:text-white">{audience.name}</div>
                        {audience.description && <div className="mt-1 text-xs text-slate-500 max-w-xs truncate">{audience.description}</div>}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-600 dark:text-slate-300">
                        {audience.sourceAudience?.name || "غير محدد"}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-lg bg-violet-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                          {audience.ratio}%
                        </span>
                      </td>
                      <td className="px-6 py-4 font-black text-slate-900 dark:text-white">
                        {audience.audienceSize ? audience.audienceSize.toLocaleString() : "قيد المعالجة"}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${audience.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${audience.status === "ACTIVE" ? "bg-emerald-500" : "bg-slate-400"}`}></span>
                          {audience.status === "ACTIVE" ? "نشط" : "محذوف"}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-500 dark:text-slate-400">
                        {new Date(audience.createdAt).toLocaleDateString("ar-EG")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default AudiencesManagement;
