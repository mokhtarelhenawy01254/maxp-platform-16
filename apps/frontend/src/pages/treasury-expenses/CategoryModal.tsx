import React, { useState } from "react";
import { X, Tag, CheckCircle2, AlertTriangle, Plus } from "lucide-react";
import { ExpenseCategory, createCategory } from "./shared";
import { toast } from "sonner";

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newCat?: ExpenseCategory) => void;
}

const PRESET_COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#f59e0b", // Amber
  "#06b6d4", // Cyan
  "#6366f1", // Indigo
  "#64748b", // Slate
  "#ef4444", // Red
  "#14b8a6", // Teal
];

export default function CategoryModal({ isOpen, onClose, onSuccess }: CategoryModalProps) {
  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [type, setType] = useState<"OPEX" | "CAPEX">("OPEX");
  const [color, setColor] = useState("#3b82f6");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("يرجى إدخال اسم التصنيف");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const created = await createCategory({
        name: name.trim(),
        nameEn: nameEn.trim() || undefined,
        type,
        color,
        icon: "Tag",
      });
      toast.success("تمت إضافة التصنيف بنجاح");
      onSuccess(created);
      onClose();
      setName("");
      setNameEn("");
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "فشل إنشاء التصنيف");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" dir="rtl">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Tag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              إضافة تصنيف نفقات جديد
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              تنظيم وتوزيع المصروفات حسب مراكز التكلفة
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              اسم التصنيف (بالعربية) *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: شحن وتوصيل، إعلانات، صيانة أجهزة..."
              className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              الاسم بالإنجليزية (اختياري)
            </label>
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="e.g. Shipping, Logistics, Software..."
              className="w-full px-3 py-2 text-sm font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:outline-none"
              dir="ltr"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              النوع المحاسبي للتصنيف
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType("OPEX")}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all text-center ${
                  type === "OPEX"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent shadow-sm"
                    : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
                }`}
              >
                تشغيلي (OPEX)
              </button>
              <button
                type="button"
                onClick={() => setType("CAPEX")}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all text-center ${
                  type === "CAPEX"
                    ? "bg-purple-600 text-white border-transparent shadow-sm"
                    : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
                }`}
              >
                أصول رأسمالية (CAPEX)
              </button>
            </div>
            <p className="text-[10px] text-zinc-500">
              {type === "OPEX"
                ? "مصروفات تشغيلية تستهلك في النشاط اليومي (مرتبات، إيجارات، فواتير)"
                : "أصول ثابتة تزيد من قيمة المؤسسة الرأسمالية (أجهزة، معدات، لابتوبات)"}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              لون تمييز التصنيف
            </label>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    color === c ? "scale-110 border-zinc-900 dark:border-white shadow-sm" : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 rounded-xl shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{loading ? "جاري الحفظ..." : "حفظ التصنيف"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
