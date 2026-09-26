/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from "react";
import {
  XMarkIcon,
  TicketIcon,
  PaperAirplaneIcon,
  PhotoIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  ClockIcon,
  CheckCircleIcon,
  ChatBubbleLeftRightIcon,
  PlusIcon,
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

interface TicketMessage {
  id?: number | string;
  content?: string;
  message?: string;
  is_client_message?: boolean | number;
  created_at?: string;
  attachment?: string | null;
  user?: { name?: string };
}

interface OrderTicketItem {
  id: number;
  code?: string;
  status?: any;
  priority?: string;
  subject?: string;
  created_at?: string;
  updated_at?: string;
  last_message?: any;
  messages?: TicketMessage[];
  replies?: TicketMessage[];
  type?: string;
  category?: { name?: string };
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

const getStatusBadge = (status: any) => {
  let val = "";
  let label = "";

  if (status && typeof status === "object") {
    val = String(status.value || "").toLowerCase().trim();
    label = status.label || "";
  } else if (status !== undefined && status !== null) {
    val = String(status).toLowerCase().trim();
  }

  if (val === "0" || val === "open" || val === "new") {
    return {
      label: label || "جديدة",
      className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    };
  }
  if (val === "3" || val === "on_hold" || val === "hold" || val === "pending") {
    return {
      label: label || "معلقة",
      className: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
    };
  }
  if (val === "1" || val === "in_progress" || val === "processing") {
    return {
      label: label || "قيد المعالجة",
      className: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
    };
  }
  if (val === "2" || val === "closed" || val === "resolved" || val === "solved") {
    return {
      label: label || "مغلقة",
      className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    };
  }

  return {
    label: label || "نشطة",
    className: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20",
  };
};

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

  // Tab State: 'new' | 'list' | 'detail'
  const [activeTab, setActiveTab] = useState<"new" | "list" | "detail">("new");

  // Form State
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | number>("");
  const [code, setCode] = useState(initialShipmentCode);
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [content, setContent] = useState("");
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Existing Tickets for this Order
  const [existingTickets, setExistingTickets] = useState<OrderTicketItem[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  // Active Ticket Details View
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [ticketDetail, setTicketDetail] = useState<OrderTicketItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [replyImage, setReplyImage] = useState<File | null>(null);

  // Reset form on open
  useEffect(() => {
    if (isModalOpen) {
      setCode(initialShipmentCode);
      setContent("");
      setImageFile(null);
      setPriority("medium");
    }
  }, [isModalOpen, initialShipmentCode]);

  // Flatten nested category tree with hierarchical labels
  const flattenCategories = useCallback((list: any[], parentName = ""): TicketCategory[] => {
    let result: TicketCategory[] = [];
    for (const item of list) {
      const currentName = parentName
        ? `${parentName} › ${item.name || item.nameEn}`
        : (item.name || item.nameEn);
      if (item.children && Array.isArray(item.children) && item.children.length > 0) {
        result = result.concat(flattenCategories(item.children, currentName));
      } else {
        result.push({
          id: item.id ?? item.type,
          name: currentName,
          type: item.related_to || item.type || "shipments",
        });
      }
    }
    return result;
  }, []);

  const fallbackCategories: TicketCategory[] = [
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

  // 1. Fetch Categories
  useEffect(() => {
    if (!isModalOpen) return;

    const fetchCategories = async () => {
      setLoadingCategories(true);
      try {
        const res = await apiClient.get<any>("/turbo/tickets/categories");
        const list = res.data?.types || res.data?.categories || res.data?.data || [];
        const flat = Array.isArray(list) && list.length > 0 ? flattenCategories(list) : [];
        if (flat.length > 0) {
          setCategories(flat);
          // Prefer category 26 ("مشكلة مع الكابتن") or first available
          const preferred = flat.find((c) => String(c.id) === "26") || flat[0];
          setSelectedCategoryId(preferred?.id || "");
        } else {
          setCategories(fallbackCategories);
          setSelectedCategoryId(fallbackCategories[0].id);
        }
      } catch {
        setCategories(fallbackCategories);
        setSelectedCategoryId(fallbackCategories[0].id);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, [isModalOpen, flattenCategories]);

  // 2. Fetch Existing Tickets for this order / code
  const fetchOrderTickets = useCallback(async () => {
    const target = (initialShipmentCode || effectiveOrderNumber || "").trim();
    if (!target) return;

    setLoadingTickets(true);
    try {
      const res = await apiClient.get<any>(
        `/turbo/tickets?search=${encodeURIComponent(target)}&per_page=15`
      );
      if (res.data?.success) {
        const list: OrderTicketItem[] =
          res.data.data?.tickets || res.data.tickets || res.data.data?.feed?.data || [];
        setExistingTickets(Array.isArray(list) ? list : []);
        if (list.length > 0 && activeTab !== "detail") {
          // Keep current tab or show list if already had tickets
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingTickets(false);
    }
  }, [initialShipmentCode, effectiveOrderNumber, activeTab]);

  useEffect(() => {
    if (isModalOpen) {
      fetchOrderTickets();
    }
  }, [isModalOpen, fetchOrderTickets]);

  // 3. Load specific ticket detail
  const loadTicketDetail = useCallback(async (ticketId: number) => {
    setLoadingDetail(true);
    try {
      const res = await apiClient.get<any>(`/turbo/tickets/${ticketId}`);
      if (res.data?.success) {
        const data = res.data.data?.ticket || res.data.ticket || res.data.data;
        setTicketDetail(data);
      }
    } catch {
      toast.error("تعذر تحميل بيانات التذكرة");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const handleOpenDetail = (t: OrderTicketItem) => {
    setSelectedTicketId(t.id);
    setTicketDetail(t);
    setActiveTab("detail");
    loadTicketDetail(t.id);
  };

  // 4. Submit New Ticket
  const handleSubmitNew = async (e: React.FormEvent) => {
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
        formData.append("relatedTo", relatedTo);
        formData.append("related_to", relatedTo);
        if (trimmedCode) formData.append("code", trimmedCode);
        formData.append("image", imageFile);
        res = await apiClient.post<any>("/turbo/tickets", formData);
      } else {
        res = await apiClient.post<any>("/turbo/tickets", payload);
      }

      if (res.data?.success) {
        const newTicketId =
          res.data?.ticketId || res.data?.data?.ticketId || res.data?.data?.ticket_id;
        toast.success(res.data?.message || "تم إرسال التذكرة بنجاح!");
        setContent("");
        setImageFile(null);

        // Refresh existing list and switch to it or detail
        await fetchOrderTickets();
        if (newTicketId) {
          setSelectedTicketId(Number(newTicketId));
          setActiveTab("detail");
          loadTicketDetail(Number(newTicketId));
        } else {
          setActiveTab("list");
        }

        if (onSuccess) onSuccess(newTicketId);
      } else {
        toast.error(res.data?.error || res.data?.message || "تعذر فتح التذكرة");
      }
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "حدث خطأ أثناء إرسال التذكرة";
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // 5. Send Reply to Active Ticket
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!replyContent.trim() && !replyImage) || !selectedTicketId) return;

    setSendingReply(true);
    try {
      let res;
      if (replyImage) {
        const formData = new FormData();
        const text = replyContent.trim() || "مرفق لقطة شاشة / صورة";
        formData.append("message", text);
        formData.append("content", text);
        formData.append("image", replyImage);
        res = await apiClient.post<any>(
          `/turbo/tickets/${selectedTicketId}/reply`,
          formData
        );
      } else {
        res = await apiClient.post<any>(
          `/turbo/tickets/${selectedTicketId}/reply`,
          { message: replyContent.trim() }
        );
      }

      if (res.data?.success) {
        toast.success("تم إرسال ردك بنجاح");
        setReplyContent("");
        setReplyImage(null);
        loadTicketDetail(selectedTicketId);
        fetchOrderTickets();
      } else {
        toast.error(res.data?.message || res.data?.error || "تعذر إرسال الرد");
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "حدث خطأ أثناء إرسال الرد"
      );
    } finally {
      setSendingReply(false);
    }
  };

  if (!isModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-fadeIn"
      dir="rtl"
    >
      <div className="w-full max-w-xl bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-850/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <TicketIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                <span>تذاكر الدعم والمتابعة</span>
                {effectiveOrderNumber && (
                  <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                    طلب #{effectiveOrderNumber}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                متابعة شحنات وطلبات الدعم مع شركة الشحن مباشرة من هذه الصفحة
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            title="إغلاق النافذة"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 pt-2.5 pb-2 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2 bg-zinc-50/40 dark:bg-zinc-900/40 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("new")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "new"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            <PlusIcon className="h-3.5 w-3.5" />
            <span>فتح تذكرة جديدة</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("list")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "list" || activeTab === "detail"
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            <ChatBubbleLeftRightIcon className="h-3.5 w-3.5" />
            <span>تذاكر هذا الطلب</span>
            {existingTickets.length > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold tabular-nums ${
                  activeTab === "list" || activeTab === "detail"
                    ? "bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900"
                    : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                }`}
              >
                {existingTickets.length}
              </span>
            )}
          </button>

          {activeTab === "detail" && (
            <button
              type="button"
              onClick={() => setActiveTab("list")}
              className="mr-auto inline-flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition"
            >
              <ArrowRightIcon className="h-3 w-3" />
              <span>العودة للقائمة</span>
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* TAB 1: New Ticket Form */}
          {activeTab === "new" && (
            <form onSubmit={handleSubmitNew} className="p-4 space-y-3.5">
              {/* Reference Code */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  كود الشحنة أو رقم الطلب المرجعي
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="مثال: ORD-920609-745 أو رقم بوليصة الشحن..."
                  className="w-full text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2.5 font-mono text-zinc-900 dark:text-white focus-visible:ring-2 focus-visible:ring-primary outline-hidden"
                />
              </div>

              {/* Category & Priority Grid */}
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
                    onChange={(e) =>
                      setPriority(e.target.value as "low" | "medium" | "high")
                    }
                    className="w-full text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2.5 text-zinc-900 dark:text-white focus-visible:ring-2 focus-visible:ring-primary outline-hidden"
                  >
                    <option value="medium">عادية / متوسطة</option>
                    <option value="low">منخفضة</option>
                    <option value="high">عاجلة / قصوى</option>
                  </select>
                </div>
              </div>

              {/* Ticket Details */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  تفاصيل التذكرة والملاحظات *
                </label>
                <textarea
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="اكتب تفاصيل استفسارك أو مشكلتك لمتابعتها مع خدمة عملاء الشحن..."
                  className="w-full text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2.5 text-zinc-900 dark:text-white focus-visible:ring-2 focus-visible:ring-primary outline-hidden resize-none"
                />
              </div>

              {/* Attachment */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  مرفق (صورة إيصال أو بوليصة أو المنتج - اختياري)
                </label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 px-3 py-2 border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-primary rounded-lg text-xs cursor-pointer text-zinc-600 dark:text-zinc-400 hover:text-primary transition">
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

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
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
            </form>
          )}

          {/* TAB 2: Existing Tickets List */}
          {activeTab === "list" && (
            <div className="p-4 space-y-3">
              {loadingTickets ? (
                <div className="p-8 text-center text-xs text-zinc-500 dark:text-zinc-400 space-y-2">
                  <ArrowPathIcon className="h-5 w-5 animate-spin mx-auto text-zinc-400" />
                  <p>جاري البحث عن تذاكر هذا الطلب...</p>
                </div>
              ) : existingTickets.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500 dark:text-zinc-400 space-y-3">
                  <div className="h-10 w-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 mx-auto flex items-center justify-center">
                    <TicketIcon className="h-5 w-5" />
                  </div>
                  <p className="font-semibold text-zinc-700 dark:text-zinc-300">
                    لا توجد تذاكر مسجلة لهذا الطلب حتى الآن
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    يمكنك فتح تذكرة جديدة للاستفسار عن موعد التسليم أو تقديم شكوى.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("new")}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white transition active:scale-97 shadow-xs"
                  >
                    <PlusIcon className="h-3.5 w-3.5" />
                    <span>فتح تذكرة الآن</span>
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                  {existingTickets.map((t) => {
                    const badge = getStatusBadge(t.status);
                    const lastMsg =
                      t.last_message?.content ||
                      t.last_message?.message ||
                      t.subject ||
                      "لا توجد رسائل";

                    return (
                      <div
                        key={t.id}
                        onClick={() => handleOpenDetail(t)}
                        className="p-3 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-850/60 cursor-pointer transition flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-zinc-900 dark:text-white tabular-nums">
                              #{t.id}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                            {t.code && (
                              <span className="text-[10px] font-mono text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.2 rounded">
                                {t.code}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-700 dark:text-zinc-300 truncate">
                            {lastMsg}
                          </p>
                          {t.created_at && (
                            <p className="text-[10px] text-zinc-400 tabular-nums flex items-center gap-1">
                              <ClockIcon className="h-3 w-3" />
                              <span>{new Date(t.created_at).toLocaleString("ar-EG")}</span>
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-amber-600 dark:text-amber-400 shrink-0 font-medium">
                          عرض المحادثة ←
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Active Ticket Detail & Chat Thread */}
          {activeTab === "detail" && ticketDetail && (
            <div className="flex flex-col h-full">
              {/* Ticket Top Info */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-850 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs tabular-nums text-zinc-900 dark:text-white">
                    تذكرة #{ticketDetail.id}
                  </span>
                  {(() => {
                    const badge = getStatusBadge(ticketDetail.status);
                    return (
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    );
                  })()}
                </div>
                <button
                  type="button"
                  onClick={() => loadTicketDetail(ticketDetail.id)}
                  disabled={loadingDetail}
                  className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition"
                  title="تحديث الردود"
                >
                  <ArrowPathIcon
                    className={`h-3.5 w-3.5 ${loadingDetail ? "animate-spin" : ""}`}
                  />
                  <span>تحديث</span>
                </button>
              </div>

              {/* Messages Thread */}
              <div className="p-3 space-y-3 overflow-y-auto max-h-[350px] bg-zinc-50/30 dark:bg-zinc-950/30">
                {/* Initial Ticket Message */}
                {ticketDetail.subject && (
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
                    <p className="font-semibold mb-0.5">موضوع التذكرة / البداية:</p>
                    <p className="leading-relaxed whitespace-pre-wrap">
                      {ticketDetail.subject}
                    </p>
                  </div>
                )}

                {/* Messages List */}
                {(() => {
                  const msgs = ticketDetail.messages || ticketDetail.replies || [];
                  if (msgs.length === 0 && !ticketDetail.subject) {
                    return (
                      <p className="text-center text-xs text-zinc-400 py-6">
                        لا توجد رسائل مسجلة بعد.
                      </p>
                    );
                  }

                  return msgs.map((msg, idx) => {
                    const isClient =
                      msg.is_client_message === 1 ||
                      msg.is_client_message === true ||
                      Boolean(msg.user?.name);
                    const msgContent = msg.content || msg.message || "";

                    return (
                      <div
                        key={msg.id || idx}
                        className={`flex flex-col ${
                          isClient ? "items-end" : "items-start"
                        }`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                            isClient
                              ? "bg-amber-600 text-white rounded-br-xs"
                              : "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-bl-xs shadow-2xs"
                          }`}
                        >
                          <div className="text-[10px] opacity-75 font-semibold mb-1">
                            {isClient ? "أنت (المتجر)" : "خدمة العملاء / تربو"}
                          </div>
                          <p className="whitespace-pre-wrap">{msgContent}</p>
                          {msg.attachment && (
                            <a
                              href={msg.attachment}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 block text-[11px] underline opacity-90"
                            >
                              عرض المرفق ↗
                            </a>
                          )}
                        </div>
                        {msg.created_at && (
                          <span className="text-[9px] text-zinc-400 mt-0.5 px-1 tabular-nums">
                            {new Date(msg.created_at).toLocaleTimeString("ar-EG", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Reply Form Input */}
              <form
                onSubmit={handleSendReply}
                className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    onPaste={(e) => {
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
                            setReplyImage(file);
                            toast.success("تم لصق لقطة الشاشة بنجاح!");
                            return;
                          }
                        }
                      }
                    }}
                    placeholder={
                      replyImage
                        ? "اكتب تعليقاً على الصورة (اختياري) أو اضغط رد..."
                        : "اكتب رداً على التذكرة، أو الصق لقطة الشاشة (Ctrl+V)..."
                    }
                    className="flex-1 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-white focus-visible:ring-2 focus-visible:ring-primary outline-hidden"
                  />
                  <label
                    className="p-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:text-primary cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
                    title="إرفاق صورة أو لقطة شاشة"
                  >
                    <PhotoIcon className="h-4 w-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setReplyImage(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={sendingReply || (!replyContent.trim() && !replyImage)}
                    className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white transition disabled:opacity-50 active:scale-97 shadow-xs"
                  >
                    <PaperAirplaneIcon className="h-3.5 w-3.5" />
                    <span>{sendingReply ? "إرسال..." : "رد"}</span>
                  </button>
                </div>
                {replyImage && (
                  <div className="flex items-center justify-between text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded-md">
                    <span>مرفق جاهز: {replyImage.name}</span>
                    <button
                      type="button"
                      onClick={() => setReplyImage(null)}
                      className="text-rose-500 hover:underline"
                    >
                      إلغاء
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-850/50 shrink-0">
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {effectiveCustomerName ? `العميل: ${effectiveCustomerName}` : ""}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
