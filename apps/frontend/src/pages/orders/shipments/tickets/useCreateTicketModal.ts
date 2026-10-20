/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { apiClient } from "../../../../services/apiClient";
import type { ShipmentRowItem } from "../ShipmentStatementTable";
import {
  type TicketCategory,
  type OrderTicketItem,
  fallbackCategories,
} from "./ticketTypes";

export interface UseCreateTicketModalProps {
  isModalOpen: boolean;
  shipment?: ShipmentRowItem | null;
  shipmentCode?: string;
  orderNumber?: string;
  onSuccess?: (createdTicketId?: unknown) => void;
}

export function useCreateTicketModal({
  isModalOpen,
  shipment,
  shipmentCode,
  orderNumber,
  onSuccess,
}: UseCreateTicketModalProps) {
  const initialShipmentCode =
    shipment?.trackingNumber ||
    shipment?.externalShipmentId ||
    shipmentCode ||
    orderNumber ||
    "";
  const effectiveOrderNumber = shipment?.order?.orderNumber || orderNumber || "";

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
      }
    } catch {
      // ignore
    } finally {
      setLoadingTickets(false);
    }
  }, [initialShipmentCode, effectiveOrderNumber]);

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

  return {
    effectiveOrderNumber,
    activeTab,
    setActiveTab,
    categories,
    selectedCategoryId,
    setSelectedCategoryId,
    code,
    setCode,
    priority,
    setPriority,
    content,
    setContent,
    loadingCategories,
    submitting,
    imageFile,
    setImageFile,
    existingTickets,
    loadingTickets,
    ticketDetail,
    loadingDetail,
    loadTicketDetail,
    handleOpenDetail,
    handleSubmitNew,
    replyContent,
    setReplyContent,
    replyImage,
    setReplyImage,
    sendingReply,
    handleSendReply,
  };
}

export default useCreateTicketModal;
