import React, { useState, useEffect } from "react";
import {
  XMarkIcon,
  TicketIcon,
  PaperAirplaneIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { apiClient } from "../../../services/apiClient";
import { ShipmentRowItem } from "./ShipmentStatementTable";

interface TicketCategory {
  id: number | string;
  name: string;
  nameEn?: string;
  type?: number | string;
}

interface CreateTicketModalProps {
  isOpen?: boolean;
  onClose: () => void;
  shipment?: ShipmentRowItem | null;
  shipmentCode?: string;
  orderNumber?: string;
  customerName?: string;
  onSuccess?: () => void;
}

export const CreateTicketModal: React.FC<CreateTicketModalProps> = ({
  isOpen,
  onClose,
  shipment,
  shipmentCode,
  orderNumber,
  customerName,
  onSuccess,
}) => {
  const isModalOpen = isOpen !== undefined ? isOpen : Boolean(shipment || shipmentCode);
  const effectiveShipmentCode = shipment?.trackingNumber || shipment?.externalShipmentId || shipmentCode || "";
  const effectiveOrderNumber = shipment?.order?.orderNumber || orderNumber || "";
  const effectiveCustomerName = shipment?.order?.customer?.name || shipment?.order?.customerName || customerName || "";

  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | number>("");
  const [content, setContent] = useState("");
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    if (!isModalOpen) return;

    const fetchCategories = async () => {
      setLoadingCategories(true);
      try {
        const res = await apiClient.get<any>("/turbo/tickets/categories");
        const list = res.data?.types || res.data?.categories || res.data?.data || [];
        if (Array.isArray(list) && list.length > 0) {
          setCategories(list);
          setSelectedCategoryId(list[0]?.id || list[0]?.type || "");
        } else {
          // Fallback categories
          const fallback = [
            { id: 1, name: "استفسار عن موعد التسليم" },
            { id: 2, name: "شكوى من المندوب" },
            { id: 3, name: "طلب إيقاف تسليم أو إرجاع" },
            { id: 4, name: "تعديل عنوان أو هاتف العميل" },
            { id: 5, name: "أخرى / متابعة عامة" },
          ];
          setCategories(fallback);
          setSelectedCategoryId(fallback[0]?.id ?? 1);
        }
      } catch {
        const fallback = [
          { id: 1, name: "استفسار عن موعد التسليم" },
          { id: 2, name: "شكوى من المندوب" },
          { id: 3, name: "طلب إيقاف تسليم أو إرجاع" },
          { id: 4, name: "تعديل عنوان أو هاتف العميل" },
          { id: 5, name: "أخرى / متابعة عامة" },
        ];
        setCategories(fallback);
        setSelectedCategoryId(fallback[0]?.id ?? 1);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, [isModalOpen]);

  if (!isModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error("يرجى كتابة تفاصيل المشكلة أو الاستفسار");
      return;
    }
    if (!selectedCategoryId) {
      toast.error("يرجى اختيار تصنيف التذكرة");
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        content: content.trim(),
        categoryId: selectedCategoryId,
        category_id: selectedCategoryId,
        code: effectiveShipmentCode,
        relatedTo: "shipments",
      };

      let res;
      if (imageFile) {
        const formData = new FormData();
        formData.append("content", content.trim());
        formData.append("categoryId", String(selectedCategoryId));
        formData.append("category_id", String(selectedCategoryId));
        formData.append("code", String(effectiveShipmentCode));
        formData.append("relatedTo", "shipments");
        formData.append("image", imageFile);
        formData.append("media[0]", imageFile);
        res = await apiClient.post<any>("/turbo/tickets", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        res = await apiClient.post<any>("/turbo/tickets", payload);
      }

      if (res.data?.success) {
        toast.success(res.data.message || "تم فتح تذكرة الدعم مع شركة الشحن بنجاح");
        setContent("");
        setImageFile(null);
        if (onSuccess) onSuccess();
        onClose();
      } else {
        toast.error(res.data?.message || res.data?.error || "تعذر فتح التذكرة");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.response?.data?.error || "حدث خطأ أثناء إرسال التذكرة");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <TicketIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                فتح تذكرة دعم مع شركة الشحن
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                متابعة شحنة #{effectiveShipmentCode} {effectiveOrderNumber ? `(طلب ${effectiveOrderNumber})` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 overflow-y-auto">
          {/* Target Shipment Summary */}
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between">
            <div>
              <span className="text-gray-500 dark:text-gray-400">كود الشحنة: </span>
              <span className="font-mono font-bold text-gray-900 dark:text-gray-100">{effectiveShipmentCode}</span>
            </div>
            {effectiveCustomerName && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">العميل: </span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{effectiveCustomerName}</span>
              </div>
            )}
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              نوع المشكلة أو الاستفسار *
            </label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              disabled={loadingCategories}
              className="w-full text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2.5 text-gray-900 dark:text-white focus-visible:ring-2 focus-visible:ring-primary outline-hidden"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name || cat.nameEn}
                </option>
              ))}
            </select>
          </div>

          {/* Ticket Message / Details */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              تفاصيل التذكرة والملاحظات *
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="اكتب تفاصيل استفسارك أو مشكلتك مع توضيح أي ملاحظات للمتابعة..."
              className="w-full text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2.5 text-gray-900 dark:text-white focus-visible:ring-2 focus-visible:ring-primary outline-hidden resize-none"
            />
          </div>

          {/* Image Attachment */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              مرفق (صورة إيصال أو صورة المنتج - اختياري)
            </label>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 px-3 py-2 border border-dashed border-gray-300 dark:border-gray-700 hover:border-primary rounded-lg text-xs cursor-pointer text-gray-600 dark:text-gray-400 hover:text-primary transition">
                <PhotoIcon className="h-4 w-4" />
                <span>{imageFile ? imageFile.name : "اختر صورة للمرفق"}</span>
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

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white transition disabled:opacity-50 active:scale-97 shadow-xs"
            >
              <PaperAirplaneIcon className="h-3.5 w-3.5" />
              <span>{submitting ? "جاري الإرسال..." : "إرسال التذكرة لشركة الشحن"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
