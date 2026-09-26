import React, { useState, useEffect } from "react";
import {
  XMarkIcon,
  TicketIcon,
  PaperAirplaneIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { apiClient } from "../../../services/apiClient";
import { TurboTicketCategory, TurboAccountItem } from "./types";

interface TurboNewTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (createdTicketId?: any) => void;
  initialShipmentCode?: string;
  accounts?: TurboAccountItem[];
}

export const TurboNewTicketModal: React.FC<TurboNewTicketModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialShipmentCode = "",
  accounts,
}) => {
  const [categories, setCategories] = useState<TurboTicketCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | number>("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [shipmentCode, setShipmentCode] = useState(initialShipmentCode);
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageFile]);

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type && items[i].type.startsWith("image/")) {
        const blob = items[i].getAsFile();
        if (blob) {
          e.preventDefault();
          const ext = blob.type.split("/")[1] || "png";
          const file = new File([blob], `screenshot_${Date.now()}.${ext}`, {
            type: blob.type || "image/png",
          });
          setImageFile(file);
          toast.success("تم لصق لقطة الشاشة بنجاح!");
          return;
        }
      }
    }
  };

  useEffect(() => {
    if (isOpen && accounts && accounts.length > 0) {
      const cur = accounts.find((a) => a.isCurrent) || accounts[0];
      if (cur) setSelectedCompanyId(cur.id);
    }
  }, [isOpen, accounts]);

  useEffect(() => {
    if (isOpen && initialShipmentCode) {
      setShipmentCode(initialShipmentCode);
      setPriority("medium");
    }
  }, [isOpen, initialShipmentCode]);

  function flattenCategories(list: any[], parentName = ""): TurboTicketCategory[] {
    let result: TurboTicketCategory[] = [];
    for (const item of list) {
      const currentName = parentName ? `${parentName} › ${item.name || item.nameEn}` : (item.name || item.nameEn);
      if (item.children && Array.isArray(item.children) && item.children.length > 0) {
        result = result.concat(flattenCategories(item.children, currentName));
      } else {
        result.push({ id: item.id ?? item.type, name: currentName, type: item.related_to || item.type || "shipments" });
      }
    }
    return result;
  }

  const fallbackCategoriesList: TurboTicketCategory[] = [
    { id: 26, name: "شكوى › تسليم الطرد › مشكلة مع الكابتن", type: "shipments" },
    { id: 19, name: "شكوى › تسليم الطرد › تأخير التسليم", type: "shipments" },
    { id: 65, name: "شكوى › تسليم الطرد › إفادة وهمية", type: "shipments" },
    { id: 23, name: "شكوى › تسليم الطرد › تلف الطرد", type: "shipments" },
    { id: 22, name: "شكوى › تسليم الطرد › تبديل فى التسليم", type: "shipments" },
    { id: 63, name: "شكوى › تسليم الطرد › طرد مفقود", type: "shipments" },
    { id: 64, name: "شكوى › تسليم الطرد › جزء من الطرد مفقود", type: "shipments" },
    { id: 67, name: "شكوى › تسليم الطرد › مرتجع على الراسل غير مستحق", type: "shipments" },
    { id: 2, name: "شكوى عامة", type: "others" },
    { id: 1, name: "استفسار عام", type: "others" },
  ];

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
          const preferred = flat.find((c) => String(c.id) === "26") || flat[0];
          setSelectedCategoryId(preferred?.id || "");
        } else {
          setCategories(fallbackCategoriesList);
          setSelectedCategoryId(fallbackCategoriesList[0]?.id ?? "");
        }
      } catch {
        setCategories(fallbackCategoriesList);
        setSelectedCategoryId(fallbackCategoriesList[0]?.id ?? "");
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!content.trim()) {
      toast.error("يرجى كتابة تفاصيل المشكلة أو الاستفسار");
      return;
    }

    try {
      setSubmitting(true);
      const trimmedCode = shipmentCode.trim();
      const selectedCat = categories.find((c) => String(c.id) === String(selectedCategoryId));
      const relatedTo = (selectedCat?.type as string) || (trimmedCode ? "shipments" : "others");

      const payload: Record<string, any> = {
        content: content.trim(),
        categoryId: selectedCategoryId,
        category_id: selectedCategoryId,
        priority,
        relatedTo,
        related_to: relatedTo,
      };

      if (selectedCompanyId) {
        payload["targetCompanyId"] = selectedCompanyId;
      }

      if (trimmedCode) {
        payload["code"] = trimmedCode;
      }

      let res;
      if (imageFile) {
        const formData = new FormData();
        Object.entries(payload).forEach(([k, v]) => formData.append(k, String(v)));
        formData.append("image", imageFile);
        res = await apiClient.post<any>("/turbo/tickets", formData);
      } else {
        res = await apiClient.post<any>("/turbo/tickets", payload);
      }

      if (res.data?.success) {
        toast.success(res.data?.message || "تم فتح التذكرة بنجاح مع شركة تربو");
        setContent("");
        setShipmentCode("");
        setImageFile(null);
        onSuccess(res.data?.ticketId || res.data?.data?.ticket_id);
        onClose();
      } else {
        toast.error(
          res.data?.error || res.data?.message || "تعذر فتح التذكرة"
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
          {/* Store Account Selector */}
          {accounts && accounts.length > 1 && (
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                المتجر / حساب الشحن *
              </label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2.5 text-zinc-900 dark:text-white focus:outline-hidden focus:border-zinc-500"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} {acc.clientCode ? `(كود ${acc.clientCode})` : ""}{" "}
                    {acc.isCurrent ? "★ (الحالي)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

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
                <option value="medium">عادية / متوسطة</option>
                <option value="low">منخفضة</option>
                <option value="high">عاجلة / قصوى</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                تفاصيل المشكلة أو الاستفسار *
              </label>
              <span className="text-[10px] text-zinc-400">
                يدعم لصق لقطة الشاشة مباشرة (Ctrl+V)
              </span>
            </div>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onPaste={handlePaste}
              placeholder="اكتب كل التفاصيل والملاحظات المطلوب متابعتها، ويمكنك لصق لقطة الشاشة هنا مباشرة (Ctrl+V)..."
              className="w-full text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2.5 text-zinc-900 dark:text-white focus:outline-hidden focus:border-zinc-500 resize-none"
            />
          </div>

          {/* Image Attachment */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                صورة أو لقطة شاشة (اختياري)
              </label>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                {imageFile ? "جاهزة للإرسال" : ""}
              </span>
            </div>

            {imageFile && imagePreview ? (
              <div className="flex items-center gap-3 p-2.5 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-xs shadow-xs">
                <img
                  src={imagePreview}
                  alt="معاينة المرفق"
                  className="w-12 h-12 object-cover rounded-lg border border-zinc-300 dark:border-zinc-700 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                    {imageFile.name}
                  </p>
                  <p className="text-[10px] text-zinc-400 font-mono">
                    ({(imageFile.size / 1024).toFixed(0)} KB)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setImageFile(null)}
                  className="text-zinc-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                  title="إلغاء المرفق"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 p-3 border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-500 rounded-xl text-xs cursor-pointer text-zinc-600 dark:text-zinc-400 transition bg-zinc-50/50 dark:bg-zinc-800/40">
                <PhotoIcon className="h-4 w-4 text-zinc-400" />
                <span>اختر صورة أو اسحبها هنا، أو الصق لقطة الشاشة (Ctrl+V)</span>
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
            )}
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
