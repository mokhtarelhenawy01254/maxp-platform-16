import React, { useState, useEffect } from "react";
import {
  XMarkIcon,
  TicketIcon,
  PaperAirplaneIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { apiClient } from "../../../services/apiClient";
import { TurboTicketCategory } from "./types";

interface TurboNewTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (createdTicketId?: any) => void;
  initialShipmentCode?: string;
}

export const TurboNewTicketModal: React.FC<TurboNewTicketModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialShipmentCode = "",
}) => {
  const [categories, setCategories] = useState<TurboTicketCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | number>("");
  const [shipmentCode, setShipmentCode] = useState(initialShipmentCode);
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && initialShipmentCode) {
      setShipmentCode(initialShipmentCode);
    }
  }, [isOpen, initialShipmentCode]);

  function flattenCategories(list: any[], parentName = ""): TurboTicketCategory[] {
    let result: TurboTicketCategory[] = [];
    for (const item of list) {
      const currentName = parentName ? `${parentName} › ${item.name || item.nameEn}` : (item.name || item.nameEn);
      if (item.children && Array.isArray(item.children) && item.children.length > 0) {
        result = result.concat(flattenCategories(item.children, currentName));
      } else {
        result.push({ id: item.id ?? item.type, name: currentName, type: item.related_to || item.type });
      }
    }
    return result;
  }

  useEffect(() => {
    if (!isOpen) return;

    const loadCategories = async () => {
      setLoadingCategories(true);
      try {
        const res = await apiClient.get<any>("/turbo/tickets/categories");
        const list =
          res.data?.types || res.data?.categories || res.data?.data || [];
        const flat = Array.isArray(list) && list.length > 0 ? flattenCategories(list) : [];
        if (flat.length > 0) {
          setCategories(flat);
          setSelectedCategoryId(flat[0]?.id || "");
        } else {
          const fallback: TurboTicketCategory[] = [
            { id: 1, name: "استفسار عن موعد تسليم" },
            { id: 2, name: "شكوى من المندوب" },
            { id: 3, name: "طلب إيقاف تسليم أو إرجاع" },
            { id: 4, name: "تعديل عنوان أو هاتف العميل" },
            { id: 5, name: "استفسار عن تحصيل الفلوس (COD)" },
            { id: 6, name: "أخرى / متابعة عامة" },
          ];
          setCategories(fallback);
          setSelectedCategoryId(fallback[0]?.id ?? "");
        }
      } catch {
        const fallback: TurboTicketCategory[] = [
          { id: 1, name: "استفسار عن موعد تسليم" },
          { id: 2, name: "شكوى من المندوب" },
          { id: 3, name: "طلب إيقاف تسليم أو إرجاع" },
          { id: 4, name: "تعديل عنوان أو هاتف العميل" },
          { id: 5, name: "استفسار عن تحصيل الفلوس (COD)" },
          { id: 6, name: "أخرى / متابعة عامة" },
        ];
        setCategories(fallback);
        setSelectedCategoryId(fallback[0]?.id ?? "");
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error("يرجى كتابة تفاصيل المشكلة أو الاستفسار");
      return;
    }

    try {
      setSubmitting(true);
      const payload: Record<string, any> = {
        content: content.trim(),
        categoryId: selectedCategoryId,
        category_id: selectedCategoryId,
        priority,
        relatedTo: shipmentCode.trim() ? "shipments" : "others",
      };

      if (shipmentCode.trim()) {
        payload["code"] = shipmentCode.trim();
      }

      let res;
      if (imageFile) {
        const formData = new FormData();
        Object.entries(payload).forEach(([k, v]) => formData.append(k, String(v)));
        formData.append("image", imageFile);
        formData.append("media[0]", imageFile);
        res = await apiClient.post<any>("/turbo/tickets", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        res = await apiClient.post<any>("/turbo/tickets", payload);
      }

      if (res.data?.success) {
        toast.success("تم فتح التذكرة بنجاح مع شركة تربو");
        setContent("");
        setShipmentCode("");
        setImageFile(null);
        onSuccess(res.data?.ticketId || res.data?.data?.ticket_id);
        onClose();
      } else {
        toast.error(
          res.data?.message || res.data?.error || "تعذر فتح التذكرة"
        );
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          "حدث خطأ أثناء إرسال التذكرة"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-fadeIn"
    >
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-right">
        {/* Header */}
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
              <TicketIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                فتح تذكرة دعم جديدة
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                إرسال استفسار أو شكوى مباشرة لغرفة عمليات تربو
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 overflow-y-auto">
          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              تصنيف التذكرة *
            </label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              disabled={loadingCategories}
              className="w-full text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2.5 text-zinc-900 dark:text-white focus:outline-hidden focus:border-zinc-500"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.nameEn}
                </option>
              ))}
            </select>
          </div>

          {/* Shipment Code & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                كود الشحنة (اختياري)
              </label>
              <input
                type="text"
                value={shipmentCode}
                onChange={(e) => setShipmentCode(e.target.value)}
                placeholder="مثال: TRB-123456"
                className="w-full text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2.5 text-zinc-900 dark:text-white font-mono focus:outline-hidden focus:border-zinc-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                درجة الأهمية
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2.5 text-zinc-900 dark:text-white focus:outline-hidden focus:border-zinc-500"
              >
                <option value="low">منخفضة</option>
                <option value="normal">عادية</option>
                <option value="high">عاجلة / قصوى</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              تفاصيل المشكلة أو الاستفسار *
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="اكتب كل التفاصيل والملاحظات المطلوب من عمليات تربو متابعتها..."
              className="w-full text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2.5 text-zinc-900 dark:text-white focus:outline-hidden focus:border-zinc-500 resize-none"
            />
          </div>

          {/* Image Attachment */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              صورة أو إيصال (اختياري)
            </label>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 px-3 py-2 border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-500 rounded-xl text-xs cursor-pointer text-zinc-600 dark:text-zinc-400 transition">
                <PhotoIcon className="h-4 w-4" />
                <span className="truncate max-w-[200px]">
                  {imageFile ? imageFile.name : "اختر صورة للمرفق"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setImageFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
              </label>
              {imageFile && (
                <button
                  type="button"
                  onClick={() => setImageFile(null)}
                  className="text-xs text-rose-500 hover:underline"
                >
                  إلغاء المرفق
                </button>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 transition active:scale-97 disabled:opacity-40 shadow-xs"
            >
              <PaperAirplaneIcon className="h-3.5 w-3.5 rotate-180" />
              <span>{submitting ? "جاري الإرسال..." : "إرسال التذكرة"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
