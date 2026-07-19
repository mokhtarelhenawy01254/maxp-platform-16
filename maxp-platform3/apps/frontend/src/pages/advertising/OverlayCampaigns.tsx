import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  PlusIcon,
  TrashIcon,
  PlayIcon,
  PhotoIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { apiClient } from "../../services/apiClient";
import { useAuth } from "../../hooks/useAuthSimple";

interface OverlayCampaign {
  id: string;
  name: string;
  overlayImage: string;
  status: string;
  startAt: string | null;
  endAt: string | null;
  createdAt: string;
  _count: { products: number };
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "مسودة",
  SCHEDULED: "مجدول",
  ACTIVE: "نشط",
  EXPIRED: "منتهي",
  PAUSED: "موقف",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  SCHEDULED: "bg-blue-100 text-blue-800",
  ACTIVE: "bg-green-100 text-green-800",
  EXPIRED: "bg-red-100 text-red-800",
  PAUSED: "bg-yellow-100 text-yellow-800",
};

const OverlayCampaigns: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<OverlayCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", overlayImage: "", startAt: "", endAt: "" });

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get("/overlay-campaigns");
      setCampaigns(data.data || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "فشل في تحميل الحملات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.overlayImage) {
      toast.error("الاسم وصورة الإطار مطلوبان");
      return;
    }
    try {
      await apiClient.post("/overlay-campaigns", form);
      toast.success("تم إنشاء الحملة");
      setShowForm(false);
      setForm({ name: "", overlayImage: "", startAt: "", endAt: "" });
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "فشل في الإنشاء");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("حذف الحملة؟")) return;
    try {
      await apiClient.delete(`/overlay-campaigns/${id}`);
      toast.success("تم الحذف");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "فشل في الحذف");
    }
  };

  const handleApply = async (id: string) => {
    try {
      const { data } = await apiClient.post(`/overlay-campaigns/${id}/apply`);
      if (data.data?.processing) {
        toast.success("جاري تطبيق الإطارات والتزامن مع فيسبوك في الخلفية");
      } else {
        toast.success(`تم تطبيق الإطار على ${data.data?.results?.length || 0} منتج`);
      }
      setTimeout(() => load(), 2000);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "فشل في التطبيق");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-950/50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        <p className="mt-4 text-sm text-slate-500">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-8 bg-[#f8fafc] px-4 py-8 dark:bg-[#030712] sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between rounded-3xl bg-white/70 p-6 backdrop-blur-xl border border-slate-200/60 shadow-sm dark:bg-slate-900/50 dark:border-slate-800/60">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
              <PhotoIcon className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              إطارات <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-500">المنتجات</span>
            </h1>
          </div>
          <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400 max-w-2xl">
            أضف إطار (Overlay) على صور منتجاتك لإعلانات الفيسبوك — زي البراندات الكبيرة.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition-all hover:bg-indigo-700"
        >
          <PlusIcon className="h-5 w-5" />
          حملة جديدة
        </button>
      </div>

      {showForm && (
        <div className="rounded-3xl bg-white/70 p-6 backdrop-blur-xl border border-slate-200/60 shadow-sm dark:bg-slate-900/50 dark:border-slate-800/60 space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">حملة جديدة</h2>
          <div>
            <label className="block text-sm font-medium mb-1">اسم الحملة</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-white dark:bg-slate-800 dark:border-slate-700"
              placeholder="مثال: تخفيضات الصيف"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">رابط صورة الإطار (PNG شفاف)</label>
            <input
              value={form.overlayImage}
              onChange={(e) => setForm({ ...form, overlayImage: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-white dark:bg-slate-800 dark:border-slate-700"
              placeholder="/uploads/products/frame.png"
            />
            <p className="text-xs text-slate-400 mt-1">ارفع الصورة أولاً من صفحة رفع الملفات، ثم الصق الرابط هنا</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">بداية</label>
              <input type="datetime-local" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-white dark:bg-slate-800 dark:border-slate-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">نهاية</label>
              <input type="datetime-local" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-white dark:bg-slate-800 dark:border-slate-700" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleCreate} className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">
              إنشاء
            </button>
            <button onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">
              إلغاء
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {campaigns.length === 0 && (
          <div className="rounded-3xl bg-white/70 p-12 backdrop-blur-xl border border-slate-200/60 text-center dark:bg-slate-900/50 dark:border-slate-800/60">
            <PhotoIcon className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-slate-500">لا توجد حملات إطارات بعد. أنشئ حملة جديدة!</p>
          </div>
        )}
        {campaigns.map((c) => (
          <div key={c.id} className="rounded-3xl bg-white/70 p-6 backdrop-blur-xl border border-slate-200/60 shadow-sm dark:bg-slate-900/50 dark:border-slate-800/60 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white">
                <img src={c.overlayImage} alt="" className="h-full w-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">{c.name}</h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[c.status] || STATUS_COLORS.DRAFT}`}>
                    {STATUS_LABELS[c.status] || c.status}
                  </span>
                  <span className="text-xs text-slate-400">{c._count?.products || 0} منتج</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleApply(c.id)}
                className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400"
                title="تطبيق الإطار">
                <PlayIcon className="h-4 w-4" />
              </button>
              <button onClick={() => navigate(`/advertising/facebook-ads/overlay-campaigns/${c.id}`)}
                className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400"
                title="إدارة المنتجات">
                <MagnifyingGlassIcon className="h-4 w-4" />
              </button>
              <button onClick={() => handleDelete(c.id)}
                className="rounded-lg border border-red-200 p-2 text-red-500 hover:bg-red-50 dark:border-red-900/30">
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OverlayCampaigns;
