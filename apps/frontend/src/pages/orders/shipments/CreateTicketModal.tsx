import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  XMarkIcon,
  TicketIcon,
  PaperAirplaneIcon,
  PhotoIcon,
  ArrowTopRightOnSquareIcon,
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
  onSuccess?: (createdTicketId?: any) => void;
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
  const navigate = useNavigate();
  const isModalOpen = isOpen !== undefined ? isOpen : Boolean(shipment || shipmentCode);
  const initialShipmentCode =
    shipment?.trackingNumber ||
    shipment?.externalShipmentId ||
    shipmentCode ||
    orderNumber ||
    "";
  const effectiveOrderNumber = shipment?.order?.orderNumber || orderNumber || "";
  const effectiveCustomerName =
    shipment?.order?.customer?.name ||
    shipment?.order?.customerName ||
    customerName ||
    "";

  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | number>("");
  const [code, setCode] = useState(initialShipmentCode);
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");
  const [content, setContent] = useState("");
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    if (isModalOpen) {
      setCode(initialShipmentCode);
    }
  }, [isModalOpen, initialShipmentCode]);

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
      const trimmedCode = code.trim();
      const payload: Record<string, any> = {
        content: content.trim(),
        categoryId: selectedCategoryId,
        category_id: selectedCategoryId,
        priority,
        relatedTo: trimmedCode ? "shipments" : "others",
      };

      if (trimmedCode) {
        payload["code"] = trimmedCode;
      }

      let res;
      if (imageFile) {
        const formData = new FormData();
        formData.append("content", content.trim());
        formData.append("categoryId", String(selectedCategoryId));
        formData.append("category_id", String(selectedCategoryId));
        formData.append("priority", priority);
        formData.append("relatedTo", trimmedCode ? "shipments" : "others");
        if (trimmedCode) {
          formData.append("code", trimmedCode);
        }
        formData.append("image", imageFile);
        formData.append("media[0]", imageFile);
        res = await apiClient.post<any>("/turbo/tickets", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        res = await apiClient.post<any>("/turbo/tickets", payload);
      }

      if (res.data?.success) {
        const ticketId = res.data?.ticketId || res.data?.data?.ticketId || res.data?.data?.ticket_id;
        toast.success(res.data?.message || "تم فتح تذكرة الدعم بنجاح", {
          action: {
            label: "الانتقال للتذاكر",
            onClick: () => navigate(`/tickets?search=${encodeURIComponent(trimmedCode || effectiveOrderNumber)}`),
          },
        });
        setContent("");
        setImageFile(null);
        if (onSuccess) onSuccess(ticketId);
        onClose();
      } else {
        toast.error(res.data?.message || res.data?.error || "تعذر فتح التذكرة");
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "حدث خطأ أثناء إرسال التذكرة"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const targetSearchCode = code.trim() || effectiveOrderNumber;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs animate-fadeIn" dir="rtl">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <TicketIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                فتح تذكرة دعم للطلب
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                {effectiveOrderNumber ? `طلب #${effectiveOrderNumber}` : "تذكرة جديدة"}
                {effectiveCustomerName ? ` • ${effectiveCustomerName}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={`/tickets${targetSearchCode ? `?search=${encodeURIComponent(targetSearchCode)}` : ""}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40 transition"
              title="فتح صفحة التذاكر الكاملة (/tickets)"
            >
              <span>مركز التذاكر</span>
              <ArrowTopRightOnSquareIcon className="h-3 w-3" />
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 overflow-y-auto">
          {/* Tracking / Order Reference Code */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              كود الشحنة أو رقم الطلب المرجعي
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="مثال: ORD-920609-745 أو كود بوليصة الشحن..."
              className="w-full text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2.5 font-mono text-zinc-900 dark:text-white focus-visible:ring-2 focus-visible:ring-primary outline-hidden"
            />
          </div>

          {/* Category & Priority Selector Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                نوع المشكلة أو الاستفسار *
              </label>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                disabled={loadingCategories}
                className="w-full text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2.5 text-zinc-900 dark:text-white focus-visible:ring-2 focus-visible:ring-primary outline-hidden"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name || cat.nameEn}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                درجة الأولوية
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as "low" | "normal" | "high")}
                className="w-full text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2.5 text-zinc-900 dark:text-white focus-visible:ring-2 focus-visible:ring-primary outline-hidden"
              >
                <option value="low">منخفضة</option>
                <option value="normal">عادية</option>
                <option value="high">عاجلة / قصوى</option>
              </select>
            </div>
          </div>

          {/* Ticket Message / Details */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              تفاصيل التذكرة والملاحظات *
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="اكتب تفاصيل استفسارك أو مشكلتك مع توضيح أي ملاحظات للمتابعة..."
              className="w-full text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2.5 text-zinc-900 dark:text-white focus-visible:ring-2 focus-visible:ring-primary outline-hidden resize-none"
            />
          </div>

          {/* Image Attachment */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              مرفق (صورة إيصال أو بوليصة أو المنتج - اختياري)
            </label>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 px-3 py-2 border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-primary rounded-lg text-xs cursor-pointer text-zinc-600 dark:text-zinc-400 hover:text-primary transition">
                <PhotoIcon className="h-4 w-4" />
                <span className="truncate max-w-[200px]">{imageFile ? imageFile.name : "اختر صورة للمرفق"}</span>
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
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <Link
              to={`/tickets${targetSearchCode ? `?search=${encodeURIComponent(targetSearchCode)}` : ""}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 transition"
            >
              عرض التذاكر السابقة
            </Link>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={submitting || !content.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white transition disabled:opacity-50 active:scale-97 shadow-xs"
              >
                <PaperAirplaneIcon className="h-3.5 w-3.5" />
                <span>{submitting ? "جاري الإرسال..." : "إرسال التذكرة"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
