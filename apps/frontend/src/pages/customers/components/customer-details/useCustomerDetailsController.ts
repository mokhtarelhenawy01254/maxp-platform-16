import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/services/apiClient";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuthSimple";
import {
  customerBlocklistService,
  CustomerBlockAction,
  CustomerBlockReasonCode,
} from "@/services/customerBlocklistService";
import {
  CustomerDetailsData,
  CustomerDetailTabKey,
  CustomerBlockFormState,
} from "./types";

export const useCustomerDetailsController = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = ["OWNER", "COMPANY_ADMIN", "SUPER_ADMIN", "MANAGER", "ADMIN"].includes(
    user?.role || "",
  );

  const [data, setData] = useState<CustomerDetailsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<CustomerDetailTabKey>("info");
  const [newNote, setNewNote] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Modals and additional state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [customerTags, setCustomerTags] = useState<string[]>([]);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  // Birthday state
  const [editingBirthday, setEditingBirthday] = useState(false);
  const [tempBirthday, setTempBirthday] = useState("");

  // Block modal state
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [isUnblocking, setIsUnblocking] = useState(false);
  const [blockForm, setBlockForm] = useState<CustomerBlockFormState>({
    reasonCode: "REPEATED_REFUSAL" as CustomerBlockReasonCode,
    reasonNote: "",
    action: "BLOCK_ORDERS" as CustomerBlockAction,
    expiresAt: "",
  });

  const loadCustomerDetails = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError("");
      const response = await apiClient.get(`/customers/${id}`);

      let customerData = response.data?.data || response.data;

      if (customerData && !customerData.customer && customerData.firstName) {
        customerData = {
          customer: customerData,
          stats: {
            ordersCount: 0,
            conversationsCount: 0,
            totalSpent: 0,
            averageOrderValue: 0,
          },
          recentOrders: [],
          recentConversations: [],
          notes: [],
          activities: [],
        };
      }

      if (customerData?.customer?.metadata) {
        try {
          const parsedMeta =
            typeof customerData.customer.metadata === "string"
              ? JSON.parse(customerData.customer.metadata)
              : customerData.customer.metadata;

          if (parsedMeta) {
            customerData.customer.address =
              customerData.customer.address || parsedMeta.address;
            customerData.customer.city =
              customerData.customer.city || parsedMeta.city;
            customerData.customer.country =
              customerData.customer.country || parsedMeta.country;
            if (parsedMeta.birthday) {
              customerData.customer.birthday = parsedMeta.birthday;
            }
          }
        } catch (e) {
          console.error("Error parsing customer metadata:", e);
        }
      }

      setData(customerData);
    } catch (err: any) {
      console.error("Error loading customer:", err);
      setError(
        err.response?.data?.message || err.message || t("customers.loadError"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    loadCustomerDetails();
  }, [loadCustomerDetails]);

  // Initialize tags when data loads
  useEffect(() => {
    if (data?.customer?.tags) {
      try {
        const parsedTags =
          typeof data.customer.tags === "string"
            ? JSON.parse(data.customer.tags)
            : data.customer.tags;
        setCustomerTags(Array.isArray(parsedTags) ? parsedTags : []);
      } catch {
        setCustomerTags([]);
      }
    }
  }, [data?.customer?.tags]);

  const handleAddNote = async () => {
    if (!newNote.trim() || !id) return;
    setIsAddingNote(true);
    try {
      const res = await apiClient.post(`/customers/${id}/notes`, {
        content: newNote,
      });
      setNewNote("");
      if (res.data?.data) {
        setData((prev) =>
          prev
            ? { ...prev, notes: [...(prev.notes || []), res.data.data] }
            : prev,
        );
      } else {
        loadCustomerDetails();
      }
    } catch (err: any) {
      console.error("Error adding note:", err);
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/customers/${id}`);
      navigate("/customers", { replace: true });
    } catch (err: any) {
      console.error("Error deleting customer:", err);
      toast.error(t("customers.deleteError"));
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    setDeletingNoteId(noteId);
    try {
      await apiClient.delete(`/customers/notes/${noteId}`);
      setData((prev) =>
        prev
          ? {
              ...prev,
              notes: (prev.notes || []).filter((n) => n.id !== noteId),
            }
          : prev,
      );
    } catch (err: any) {
      console.error("Error deleting note:", err);
      toast.error(t("customers.deleteNoteError"));
    } finally {
      setDeletingNoteId(null);
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim() || !id) return;
    const updatedTags = [...customerTags, newTag.trim()];
    try {
      await apiClient.put(`/customers/${id}/tags`, { tags: updatedTags });
      setCustomerTags(updatedTags);
      setNewTag("");
    } catch (err: any) {
      console.error("Error adding tag:", err);
      alert(err.response?.data?.message || t("customers.addTagError"));
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!id) return;
    const updatedTags = customerTags.filter((tag) => tag !== tagToRemove);
    try {
      await apiClient.put(`/customers/${id}/tags`, { tags: updatedTags });
      setCustomerTags(updatedTags);
    } catch (err: any) {
      console.error("Error removing tag:", err);
      alert(err.response?.data?.message || t("customers.removeTagError"));
    }
  };

  const handleSaveBirthday = async () => {
    if (!data?.customer || !id) return;
    const c = data.customer;
    try {
      await apiClient.put(`/customers/${id}`, {
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
        address: c.address,
        city: c.city,
        country: c.country,
        status: c.status,
        notes: c.notes,
        birthday: tempBirthday,
      });
      setEditingBirthday(false);
      loadCustomerDetails();
    } catch (err: any) {
      console.error("Error saving birthday:", err);
      alert(err.response?.data?.message || "حدث خطأ أثناء حفظ تاريخ الميلاد");
    }
  };

  const handleBlockCustomer = async () => {
    if (!data?.customer) return;
    setIsBlocking(true);
    try {
      await customerBlocklistService.createRule({
        customerId: data.customer.id,
        phone: data.customer.phone,
        email: data.customer.email,
        reasonCode: blockForm.reasonCode,
        reasonNote: blockForm.reasonNote,
        action: blockForm.action,
        expiresAt: blockForm.expiresAt || undefined,
      });
      setShowBlockModal(false);
      await loadCustomerDetails();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "فشل في حظر العميل");
    } finally {
      setIsBlocking(false);
    }
  };

  const handleUnblockCustomer = async () => {
    const rule = data?.customerBlock?.rule;
    if (!rule?.id) return;

    setIsUnblocking(true);
    try {
      await customerBlocklistService.liftRule(
        rule.id,
        "تم فك الحظر من صفحة العميل",
      );
      await loadCustomerDetails();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "فشل في فك الحظر");
    } finally {
      setIsUnblocking(false);
    }
  };

  const handleExportCustomer = () => {
    if (!data) return;
    const exportData = {
      customer: data.customer,
      stats: data.stats,
      orders: data.recentOrders,
      conversations: data.recentConversations,
      notes: data.notes,
      activities: data.activities,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customer_${data.customer.firstName}_${data.customer.lastName}_${
      new Date().toISOString().split("T")[0]
    }.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleStartWhatsApp = () => {
    const phone = data?.customer?.phone;
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, "");
      window.open(`https://wa.me/${cleanPhone}`, "_blank");
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      LEAD: "bg-yellow-100 text-yellow-800",
      ACTIVE: "bg-green-100 text-green-800",
      INACTIVE: "bg-gray-100 text-gray-800",
      VIP: "bg-purple-100 text-purple-800",
      BLOCKED: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const customer = data?.customer || ({} as CustomerDetailsData["customer"]);
  const stats = data?.stats || {
    ordersCount: 0,
    conversationsCount: 0,
    totalSpent: 0,
    averageOrderValue: 0,
  };
  const recentOrders = data?.recentOrders || [];
  const recentConversations = data?.recentConversations || [];
  const notes = data?.notes || [];
  const activeBlockRule = data?.customerBlock?.rule || null;
  const isCustomerBlocked = Boolean(
    data?.customerBlock?.isBlocked && activeBlockRule,
  );
  const loyaltyPoints = (data?.loyalty || []).reduce(
    (sum, r) => sum + r.points,
    0,
  );
  const cashbackAmount = data?.cashbackTotal || 0;
  const walletBalance = data?.wallet?.balance || 0;

  return {
    id,
    t,
    navigate,
    isAdmin,
    data,
    isLoading,
    error,
    activeTab,
    setActiveTab,
    newNote,
    setNewNote,
    isAddingNote,
    showDeleteModal,
    setShowDeleteModal,
    isDeleting,
    newTag,
    setNewTag,
    customerTags,
    deletingNoteId,
    editingBirthday,
    setEditingBirthday,
    tempBirthday,
    setTempBirthday,
    showBlockModal,
    setShowBlockModal,
    isBlocking,
    isUnblocking,
    blockForm,
    setBlockForm,
    customer,
    stats,
    recentOrders,
    recentConversations,
    notes,
    activeBlockRule,
    isCustomerBlocked,
    loyaltyPoints,
    cashbackAmount,
    walletBalance,
    loadCustomerDetails,
    handleAddNote,
    handleDeleteCustomer,
    handleDeleteNote,
    handleAddTag,
    handleRemoveTag,
    handleSaveBirthday,
    handleBlockCustomer,
    handleUnblockCustomer,
    handleExportCustomer,
    handleStartWhatsApp,
    getStatusBadge,
  };
};
