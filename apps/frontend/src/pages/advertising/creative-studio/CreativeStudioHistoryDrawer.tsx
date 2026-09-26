import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ImageIcon,
  RefreshCw,
  X,
  Download,
  Trash2,
  ExternalLink,
  Sparkles,
  Calendar,
  Search,
  Wand2,
} from "lucide-react";
import { apiClient } from "../../../services/apiClient";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export interface HistoryImageItem {
  filename: string;
  url: string;
  createdAt: string;
  size?: number;
  prompt?: string;
  aspectRatio?: string;
  model?: string;
}

interface CreativeStudioHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (imageUrl: string) => void;
  onHistoryChange?: (count: number) => void;
}

export const CreativeStudioHistoryDrawer: React.FC<CreativeStudioHistoryDrawerProps> = ({
  isOpen,
  onClose,
  onSelectImage,
  onHistoryChange,
}) => {
  const [images, setImages] = useState<HistoryImageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [deletingFilename, setDeletingFilename] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<{ success?: boolean; data?: HistoryImageItem[] }>("/ai-image/history");
      const payload = res.data?.data ?? res.data;
      const list = Array.isArray(payload) ? payload : (payload?.items || payload?.history || payload?.images || []);
      if (Array.isArray(list)) {
        setImages(list);
        onHistoryChange?.(list.length);
      }
    } catch {
      toast.error("تعذر تحميل سجل الصور المولدة");
    } finally {
      setLoading(false);
    }
  }, [onHistoryChange]);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, fetchHistory]);

  const handleDelete = async (filename: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setDeletingFilename(filename);
      const res = await apiClient.delete<{ success?: boolean; message?: string }>(`/ai-image/${filename}`);
      if (res.data?.success) {
        setImages((prev) => {
          const updated = prev.filter((img) => img.filename !== filename);
          onHistoryChange?.(updated.length);
          return updated;
        });
        toast.success("تم حذف الصورة من السجل بنجاح");
      } else {
        toast.error(res.data?.message || "فشل حذف الصورة");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "حدث خطأ أثناء الحذف");
    } finally {
      setDeletingFilename(null);
    }
  };

  const handleDownload = (imageUrl: string, filename: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = filename;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.click();
    toast.success("تم بدء تحميل الصورة الأصلية");
  };

  const filteredImages = useMemo(() => {
    if (!search.trim()) return images;
    const query = search.toLowerCase();
    return images.filter(
      (img) =>
        (img.prompt && img.prompt.toLowerCase().includes(query)) ||
        (img.model && img.model.toLowerCase().includes(query)) ||
        img.filename.toLowerCase().includes(query)
    );
  }, [images, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
      {/* Backdrop click to close */}
      <div className="flex-1 cursor-pointer" onClick={onClose} aria-hidden="true" />

      {/* Slide-over Drawer */}
      <aside
        aria-label="سجل الصور المولدة بالذكاء الاصطناعي"
        className="w-full sm:w-[480px] max-w-full h-full bg-white dark:bg-slate-900 border-r sm:border-r-0 sm:border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200"
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                سجل الصور والتصاميم
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 tabular-nums">
                  {images.length} صورة
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                كل الخلفيات والمشاهد المولدة لمتجرك محفوظة هنا بدقة عالية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={fetchHistory}
              disabled={loading}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="تحديث السجل"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search input */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالوصف، الموديل، أو اسم الملف..."
              className="w-full pl-3 pr-9 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Images Grid */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {loading && images.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin text-indigo-600" />
              جاري استرجاع الصور السابقة...
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              {search ? "لا توجد نتائج مطابقة لبحثك." : "لم يتم توليد أي صور حتى الآن. ابدأ بتوليد أول مشهد إعلاني!"}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredImages.map((img) => {
                const dateStr = img.createdAt
                  ? new Date(img.createdAt).toLocaleDateString("ar-EG", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "";

                return (
                  <div
                    key={img.filename}
                    className="group relative rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-850 hover:border-indigo-300 dark:hover:border-indigo-700 transition flex flex-col overflow-hidden shadow-xs"
                  >
                    {/* Image Preview Container */}
                    <div className="aspect-square w-full bg-slate-900 relative overflow-hidden flex items-center justify-center">
                      <img
                        src={img.url}
                        alt={img.prompt || "AI Scene"}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300 cursor-pointer"
                        onClick={() => {
                          onSelectImage(img.url);
                          onClose();
                          toast.success("تم تطبيق المشهد كخلفية للاستوديو");
                        }}
                      />

                      {/* Top Overlay Badges */}
                      <div className="absolute top-2 inset-x-2 flex items-center justify-between pointer-events-none">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-white border border-white/10 truncate max-w-[120px]">
                          {img.model ? img.model.split("/").pop() : "AI"}
                        </span>
                        {img.aspectRatio && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-white border border-white/10">
                            {img.aspectRatio}
                          </span>
                        )}
                      </div>

                      {/* Quick Hover Action: Apply to Canvas */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                        <span className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold shadow-md flex items-center gap-1.5">
                          <Wand2 className="w-3.5 h-3.5" />
                          تطبيق على الكانفاس
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-2.5 flex flex-col gap-2 flex-1 justify-between">
                      <div>
                        {img.prompt && (
                          <p className="text-[11px] text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed" title={img.prompt}>
                            {img.prompt}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1.5">
                          <Calendar className="w-3 h-3" />
                          <span>{dateStr}</span>
                        </div>
                      </div>

                      {/* Actions Bar */}
                      <div className="flex items-center justify-between gap-1 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            onSelectImage(img.url);
                            onClose();
                            toast.success("تم تطبيق المشهد كخلفية للاستوديو");
                          }}
                          className="h-7 text-[11px] px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white gap-1 rounded-lg flex-1 cursor-pointer"
                        >
                          <Wand2 className="w-3 h-3" />
                          <span>تطبيق</span>
                        </Button>

                        <div className="flex items-center gap-1">
                          <a
                            href={img.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="عرض بالحجم الأصلي"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>

                          <button
                            type="button"
                            onClick={(e) => handleDownload(img.url, img.filename, e)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            title="تحميل بجودة كاملة"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleDelete(img.filename, e)}
                            disabled={deletingFilename === img.filename}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                            title="حذف من السجل"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};
