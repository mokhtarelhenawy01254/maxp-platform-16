import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRightIcon,
  PencilIcon,
  TrashIcon,
  ChatBubbleLeftRightIcon,
  ShoppingBagIcon,
  DocumentTextIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  TagIcon,
  PlusIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  NoSymbolIcon,
  CheckCircleIcon,
  StarIcon,
  BanknotesIcon,
  ClockIcon,
  SparklesIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { apiClient } from "../../services/apiClient";
import { toast } from "sonner";
import LoadingSpinner from "../../components/LoadingSpinner";
import { useDateFormat } from "../../hooks/useDateFormat";
import { formatCurrency } from "../../utils/currency";
import { useAuth } from "../../hooks/useAuthSimple";
import {
  customerBlocklistService,
  CustomerBlockAction,
  CustomerBlockReasonCode,
  CustomerBlockRule,
} from "../../services/customerBlocklistService";
import { CustomerRatingBadge } from "../../components/orders/CustomerRatingBadge";
import CustomerLoyaltyTab from "./CustomerLoyaltyTab";
import CustomerJourneyTab from "./CustomerJourneyTab";

interface CustomerDetailsData {
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    tags: string[];
    notes?: string;
    birthday?: string;
    status: string;
    customerRating?: string;
    deliveryRate?: number;
    totalDelivered?: number;
    totalOrdersCount?: number;
    createdAt: string;
    updatedAt: string;
  };
  stats: {
    ordersCount: number;
    conversationsCount: number;
    totalSpent: number;
    averageOrderValue: number;
    deliveryRate?: number;
    totalDelivered?: number;
    totalOrdersCount?: number;
    customerRating?: string;
  };
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    createdAt: string;
  }>;
  recentConversations: Array<{
    id: string;
    channel: string;
    status: string;
    lastMessageAt: string;
    createdAt: string;
  }>;
  notes: Array<{
    id: string;
    content: string;
    createdAt: string;
    author?: {
      firstName: string;
      lastName: string;
    };
  }>;
  activities: Array<{
    type: string;
    id: string;
    title: string;
    status?: string;
    value?: number;
    content?: string;
    author?: string;
    timestamp: string;
  }>;
  customerBlock?: {
    isBlocked: boolean;
    rule?: CustomerBlockRule | null;
  };
  loyalty?: Array<{
    programId: string;
    programName?: string | null;
    programType?: string;
    points: number;
    totalEarned: number;
    tierName?: string | null;
    status?: string;
  }>;
  wallet?: {
    balance: number;
    totalEarned: number;
    totalSpent: number;
    currency: string;
  } | null;
  cashbackTotal?: number;
}

const CustomerDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = ["OWNER", "COMPANY_ADMIN", "SUPER_ADMIN", "MANAGER", "ADMIN"].includes(
    user?.role || "",
  );

  const [data, setData] = useState<CustomerDetailsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<
    "info" | "orders" | "conversations" | "notes" | "activity" | "loyalty" | "journey"
  >("info");
  const [newNote, setNewNote] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);

  // New state for additional features
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [customerTags, setCustomerTags] = useState<string[]>([]);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  
  // Birthday state
  const [editingBirthday, setEditingBirthday] = useState(false);
  const [tempBirthday, setTempBirthday] = useState("");
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [isUnblocking, setIsUnblocking] = useState(false);
  const [blockForm, setBlockForm] = useState({
    reasonCode: "REPEATED_REFUSAL" as CustomerBlockReasonCode,
    reasonNote: "",
    action: "BLOCK_ORDERS" as CustomerBlockAction,
    expiresAt: "",
  });

  useEffect(() => {
    loadCustomerDetails();
  }, [id]);

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

  const loadCustomerDetails = async () => {
    try {
      setIsLoading(true);
      setError("");
      const response = await apiClient.get(`/customers/${id}`);
      console.log(
        "Customer API Response:",
        JSON.stringify(response.data, null, 2),
      );

      // Normalize the response data structure
      let customerData = response.data?.data || response.data;

      // If the response is { customer: {...} } use it directly
      // If the response IS the customer object (has firstName), wrap it
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
          const parsedMeta = typeof customerData.customer.metadata === 'string' 
            ? JSON.parse(customerData.customer.metadata) 
            : customerData.customer.metadata;
          
          if (parsedMeta) {
            customerData.customer.address = customerData.customer.address || parsedMeta.address;
            customerData.customer.city = customerData.customer.city || parsedMeta.city;
            customerData.customer.country = customerData.customer.country || parsedMeta.country;
            if (parsedMeta.birthday) {
              customerData.customer.birthday = parsedMeta.birthday;
            }
          }
        } catch (e) {
          console.error("Error parsing customer metadata:", e);
        }
      }

      console.log(
        "Normalized customer data:",
        JSON.stringify(customerData, null, 2),
      );
      setData(customerData);
    } catch (err: any) {
      console.error("Error loading customer:", err);
      setError(
        err.response?.data?.message ||
        err.message ||
        t("customers.loadError"),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setIsAddingNote(true);
    try {
      const res = await apiClient.post(`/customers/${id}/notes`, { content: newNote });
      setNewNote("");
      if (res.data?.data) {
        setData(prev => prev ? { ...prev, notes: [...(prev.notes || []), res.data.data] } : prev);
      } else {
        loadCustomerDetails();
      }
    } catch (err: any) {
      console.error("Error adding note:", err);
    } finally {
      setIsAddingNote(false);
    }
  };

  // 🗑️ Delete customer handler
  const handleDeleteCustomer = async () => {
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

  // 🗑️ Delete note handler
  const handleDeleteNote = async (noteId: string) => {
    setDeletingNoteId(noteId);
    try {
      await apiClient.delete(`/customers/notes/${noteId}`);
      setData(prev => prev ? { ...prev, notes: (prev.notes || []).filter(n => n.id !== noteId) } : prev);
    } catch (err: any) {
      console.error("Error deleting note:", err);
      toast.error(t("customers.deleteNoteError"));
    } finally {
      setDeletingNoteId(null);
    }
  };

  // 🏷️ Add tag handler
  const handleAddTag = async () => {
    if (!newTag.trim()) return;
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

  // 🏷️ Remove tag handler
  const handleRemoveTag = async (tagToRemove: string) => {
    const updatedTags = customerTags.filter((tag) => tag !== tagToRemove);
    try {
      await apiClient.put(`/customers/${id}/tags`, { tags: updatedTags });
      setCustomerTags(updatedTags);
    } catch (err: any) {
      console.error("Error removing tag:", err);
      alert(err.response?.data?.message || t("customers.removeTagError"));
    }
  };

  // 🎂 Save birthday inline
  const handleSaveBirthday = async () => {
    if (!customer) return;
    try {
      await apiClient.put(`/customers/${id}`, {
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        city: customer.city,
        country: customer.country,
        status: customer.status,
        notes: customer.notes,
        birthday: tempBirthday
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
      await customerBlocklistService.liftRule(rule.id, "تم فك الحظر من صفحة العميل");
      await loadCustomerDetails();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "فشل في فك الحظر");
    } finally {
      setIsUnblocking(false);
    }
  };

  // 📤 Export customer data
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
    a.download = `customer_${data.customer.firstName}_${data.customer.lastName}_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 💬 Start WhatsApp conversation
  const handleStartWhatsApp = () => {
    const phone = data?.customer?.phone;
    if (phone) {
      // Remove any non-digit characters and ensure it starts with country code
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

  const getRatingBadge = (rating?: string) => {
    if (!rating) return null;
    const r = rating.toUpperCase();

    // Define styles mapping
    const styles: Record<string, string> = {
      EXCELLENT: "bg-purple-100 text-purple-700",
      GOOD: "bg-blue-100 text-blue-700",
      AVERAGE: "bg-gray-100 text-gray-700",
      BAD: "bg-red-100 text-red-700",
    };

    // Define translation key mapping
    const translationKeys: Record<string, string> = {
      EXCELLENT: "customers.rating.excellent",
      GOOD: "customers.rating.good",
      AVERAGE: "customers.rating.average",
      BAD: "customers.rating.bad",
    };

    const style = styles[r] || "bg-gray-100 text-gray-700";
    const key = translationKeys[r];

    if (!key) return null;

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${style}`}>
        {t(key)}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !data || !data.customer) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error || t("customers.notFound")}</p>
        <Link
          to="/customers"
          className="text-indigo-600 hover:underline mt-4 inline-block"
        >
          {t("common.backToList")}
        </Link>
      </div>
    );
  }

  const customer = data.customer || {};
  const stats = data.stats || {
    ordersCount: 0,
    conversationsCount: 0,
    totalSpent: 0,
    averageOrderValue: 0,
  };
  const recentOrders = data.recentOrders || [];
  const recentConversations = data.recentConversations || [];
  const notes = data.notes || [];
  const activeBlockRule = data.customerBlock?.rule || null;
  const isCustomerBlocked = Boolean(data.customerBlock?.isBlocked && activeBlockRule);
  const loyaltyPoints = (data.loyalty || []).reduce((sum, r) => sum + r.points, 0);
  const cashbackAmount = data.cashbackTotal || 0;
  const walletBalance = data.wallet?.balance || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/customers" className="text-gray-500 hover:text-gray-700">
            <ArrowRightIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {customer.firstName} {customer.lastName}
            </h1>
            <div className="flex gap-2 mt-1 items-center flex-wrap">
              <span
                className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(customer.status)}`}
              >
                {customer.status}
              </span>
              <CustomerRatingBadge
                rating={customer.customerRating}
                deliveryRate={customer.deliveryRate ?? stats.deliveryRate}
                totalDelivered={customer.totalDelivered ?? stats.totalDelivered}
                totalAttempts={customer.totalOrdersCount ?? stats.totalOrdersCount}
                variant="badge"
                size="sm"
              />
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* WhatsApp Button */}
          {customer.phone && (
            <button
              onClick={handleStartWhatsApp}
              className="inline-flex items-center px-4 py-2 border border-green-300 rounded-md text-sm font-medium text-green-700 bg-white hover:bg-green-50"
            >
              <ChatBubbleLeftRightIcon className="h-4 w-4 ml-2" />
              WhatsApp
            </button>
          )}
          {isAdmin && (
            isCustomerBlocked ? (
              <button
                onClick={handleUnblockCustomer}
                disabled={isUnblocking}
                className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
              >
                <CheckCircleIcon className="h-4 w-4 ml-2" />
                {isUnblocking ? "جاري فك الحظر..." : "فك الحظر"}
              </button>
            ) : (
              <button
                onClick={() => setShowBlockModal(true)}
                className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50"
              >
                <NoSymbolIcon className="h-4 w-4 ml-2" />
                حظر العميل
              </button>
            )
          )}
          {/* Export Button */}
          <button
            onClick={handleExportCustomer}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowDownTrayIcon className="h-4 w-4 ml-2" />
            {t("common.export")}
          </button>
          {/* Edit Button */}
          <button
            onClick={() => navigate(`/customers/${id}/edit`)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <PencilIcon className="h-4 w-4 ml-2" />
            {t("common.edit")}
          </button>
          {/* Delete Button */}
          <button
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50"
          >
            <TrashIcon className="h-4 w-4 ml-2" />
            {t("common.delete")}
          </button>
        </div>
      </div>

      {isCustomerBlocked && activeBlockRule && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
          <div className="flex items-start gap-3">
            <NoSymbolIcon className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">
                العميل محظور من الطلبات
              </p>
              <p className="mt-1 text-sm">
                الأكشن:{" "}
                {activeBlockRule.action === "REQUIRE_MANAGER_APPROVAL"
                  ? "موافقة مدير قبل الطلب"
                  : activeBlockRule.action === "BLOCK_COD_ONLY"
                    ? "منع الدفع عند الاستلام فقط"
                    : "منع الطلبات"}
                {activeBlockRule.reasonNote ? ` - ${activeBlockRule.reasonNote}` : ""}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Delivery Reliability Card */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-slate-100 dark:border-slate-700/60">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <CheckCircleIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">مستوى العميل ونسبة الاستلام</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
                    {Math.round((customer.deliveryRate ?? stats.deliveryRate ?? 0) * 10) / 10}%
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    ({customer.totalDelivered ?? stats.totalDelivered ?? 0} من {customer.totalOrdersCount ?? stats.totalOrdersCount ?? stats.ordersCount} طلب)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <ShoppingBagIcon className="h-8 w-8 text-indigo-500" />
            <div>
              <p className="text-sm text-gray-500">{t("sidebar.orders")}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.ordersCount}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <ChatBubbleLeftRightIcon className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm text-gray-500">{t("sidebar.conversations")}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.conversationsCount}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
              $
            </div>
            <div>
              <p className="text-sm text-gray-500">{t("customers.totalSpent")}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(stats.totalSpent)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
              ~
            </div>
            <div>
              <p className="text-sm text-gray-500">{t("customers.averageOrder")}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(stats.averageOrderValue)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <StarIcon className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-sm text-gray-500">نقاط الولاء</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {loyaltyPoints}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <BanknotesIcon className="h-8 w-8 text-emerald-500" />
            <div>
              <p className="text-sm text-gray-500">الكاش باك (رصيد المحفظة)</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(cashbackAmount)}
              </p>
              <p className="text-xs text-gray-400">
                رصيد المحفظة: {formatCurrency(walletBalance)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            {[
              { key: "info", label: t("customers.tabs.info"), icon: UserIcon },
              { key: "orders", label: t("orders.title"), icon: ShoppingBagIcon },
              {
                key: "conversations",
                label: t("sidebar.conversations"),
                icon: ChatBubbleLeftRightIcon,
              },
              { key: "notes", label: t("customers.tabs.notes"), icon: DocumentTextIcon },
              { key: "activity", label: t("customers.tabs.activity", "النشاط"), icon: ClockIcon },
              { key: "loyalty", label: t("customers.tabs.loyalty", "الولاء والنقاط"), icon: StarIcon },
              { key: "journey", label: t("customers.tabs.journey", "رحلة العميل"), icon: SparklesIcon },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 ${activeTab === tab.key
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Info Tab */}
          {activeTab === "info" && (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t("customers.contactInfo")}
                </h3>
                <div className="space-y-3">
                  {customer.phone && (
                    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                      <PhoneIcon className="h-5 w-5" />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                      <EnvelopeIcon className="h-5 w-5" />
                      <span>{customer.email}</span>
                    </div>
                  )}
                  {(customer.address || customer.city || customer.country) && (
                    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                      <MapPinIcon className="h-5 w-5" />
                      <span>
                        {[customer.address, customer.city, customer.country]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </div>
                  )}
                  {/* Birthday Inline Editor */}
                  <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                    <CalendarIcon className="h-5 w-5" />
                    {editingBirthday ? (
                      <div className="flex gap-2 w-full max-w-xs items-center">
                        <input
                          type="date"
                          value={tempBirthday}
                          onChange={(e) => setTempBirthday(e.target.value)}
                          className="flex-1 px-3 py-1 border border-gray-300 rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <button
                          onClick={handleSaveBirthday}
                          className="px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
                        >
                          حفظ
                        </button>
                        <button
                          onClick={() => setEditingBirthday(false)}
                          className="px-3 py-1 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm"
                        >
                          إلغاء
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group">
                        <span className="text-sm">
                          {customer.birthday
                            ? new Date(customer.birthday).toLocaleDateString("ar-EG")
                            : "تاريخ الميلاد غير مسجل"}
                        </span>
                        <button
                          onClick={() => {
                            setTempBirthday(customer.birthday || "");
                            setEditingBirthday(true);
                          }}
                          className="text-gray-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="إضافة / تعديل تاريخ الميلاد"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  {customer.customerRating &&
                    customer.customerRating !== "UNKNOWN" && (
                      <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                        <StarIcon className="h-5 w-5" />
                        <span>التقييم: {customer.customerRating}</span>
                      </div>
                    )}
                  {customer.createdAt && (
                    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                      <CalendarIcon className="h-5 w-5" />
                      <span>عميل منذ {formatDate(customer.createdAt)}</span>
                    </div>
                  )}
                  {customer.updatedAt && (
                    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                      <CalendarIcon className="h-5 w-5" />
                      <span>آخر تحديث {formatDate(customer.updatedAt)}</span>
                    </div>
                  )}
                  {customer.notes ? (
                    <div className="flex items-start gap-3 text-gray-600 dark:text-gray-300">
                      <DocumentTextIcon className="h-5 w-5 mt-0.5" />
                      <span>{customer.notes}</span>
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t("customers.tagsLabel")}
                </h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {customerTags.length > 0 ? (
                    customerTags.map((tag, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm group"
                      >
                        <TagIcon className="h-3 w-3" />
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <XMarkIcon className="h-3 w-3" />
                        </button>
                      </span>
                    ))
                  ) : (
                    <p className="text-gray-500">{t("customers.noTags")}</p>
                  )}
                </div>
                {/* Add new tag */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                    placeholder={t("customers.addTagPlaceholder")}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <button
                    onClick={handleAddTag}
                    disabled={!newTag.trim()}
                    className="inline-flex items-center px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            </>
          )}

          {/* Orders Tab */}
          {activeTab === "orders" && (
            <div>
              {recentOrders.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        {t("orders.orderNumber")}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        {t("common.status")}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        {t("orders.amount")}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        {t("common.date")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {recentOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <td className="px-4 py-3">
                          <Link
                            to={`/orders/${encodeURIComponent(String(order.id))}`}
                            className="text-indigo-600 hover:underline"
                          >
                            #{order.orderNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 rounded text-xs bg-gray-100">
                            {order.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {formatCurrency(order.total)}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {formatDate(order.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-center text-gray-500 py-8">{t("customers.noOrders")}</p>
              )}
            </div>
          )}

          {/* Conversations Tab */}
          {activeTab === "conversations" && (
            <div>
              {recentConversations.length > 0 ? (
                <div className="space-y-3">
                  {recentConversations.map((conv) => (
                    <div
                      key={conv.id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {conv.channel}
                          </p>
                          <p className="text-sm text-gray-500">{conv.status}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">
                        {formatDate(conv.lastMessageAt || conv.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  {t("customers.noConversations")}
                </p>
              )}
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === "notes" && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder={t("customers.notesPlaceholder")}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600"
                />
                <button
                  onClick={handleAddNote}
                  disabled={isAddingNote || !newNote.trim()}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  <PlusIcon className="h-4 w-4 ml-2" />
                  {t("common.add")}
                </button>
              </div>
              {notes.length > 0 ? (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-r-4 border-yellow-400 relative group"
                    >
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        disabled={deletingNoteId === note.id}
                        className="absolute top-2 left-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                      >
                        {deletingNoteId === note.id ? (
                          <span className="animate-spin">⏳</span>
                        ) : (
                          <TrashIcon className="h-4 w-4" />
                        )}
                      </button>
                      <p className="text-gray-800 dark:text-gray-200">
                        {note.content}
                      </p>
                      <div className="mt-2 text-sm text-gray-500">
                        {note.author &&
                          `${note.author.firstName} ${note.author.lastName} • `}
                        {formatDate(note.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  {t("customers.noNotes")}
                </p>
              )}
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === "activity" && (
            <div>
              {data.activities && data.activities.length > 0 ? (
                <ol className="relative space-y-6 border-r-2 border-gray-200 dark:border-gray-700 pr-6">
                  {data.activities.map((act, index) => (
                    <li key={act.id || index} className="relative">
                      <span
                        className={`absolute -right-[31px] top-1 h-4 w-4 rounded-full ring-4 ring-white dark:ring-gray-800 ${
                          act.type === "order"
                            ? "bg-indigo-500"
                            : act.type === "conversation"
                              ? "bg-green-500"
                              : "bg-yellow-500"
                        }`}
                      />
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          {act.type === "order" ? (
                            <ShoppingBagIcon className="h-4 w-4 text-indigo-500" />
                          ) : act.type === "conversation" ? (
                            <ChatBubbleLeftRightIcon className="h-4 w-4 text-green-500" />
                          ) : (
                            <DocumentTextIcon className="h-4 w-4 text-yellow-500" />
                          )}
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {act.title}
                          </span>
                          {act.status && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                              {act.status}
                            </span>
                          )}
                          {typeof act.value === "number" && (
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                              {formatCurrency(act.value)}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">
                          {formatDate(act.timestamp)}
                        </span>
                      </div>
                      {act.content && (
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          {act.content}
                          {act.author ? ` — ${act.author}` : ""}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  {t("customers.noActivity", "لا يوجد نشاط لهذا العميل")}
                </p>
              )}
            </div>
          )}

          {/* Loyalty Tab */}
          {activeTab === "loyalty" && (
            <CustomerLoyaltyTab
              customerId={customer.id}
              loyaltyRecords={data.loyalty}
              isAdmin={isAdmin}
            />
          )}

          {/* Journey Tab */}
          {activeTab === "journey" && <CustomerJourneyTab customerId={customer.id} />}
        </div>
      </div>

      {/* Block Customer Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <NoSymbolIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                حظر العميل
              </h3>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  الأكشن
                </span>
                <select
                  value={blockForm.action}
                  onChange={(event) =>
                    setBlockForm((current) => ({
                      ...current,
                      action: event.target.value as CustomerBlockAction,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="BLOCK_ORDERS">منع الطلبات</option>
                  <option value="REQUIRE_MANAGER_APPROVAL">
                    موافقة مدير قبل الطلب
                  </option>
                  <option value="BLOCK_COD_ONLY">
                    منع الدفع عند الاستلام فقط
                  </option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  السبب
                </span>
                <select
                  value={blockForm.reasonCode}
                  onChange={(event) =>
                    setBlockForm((current) => ({
                      ...current,
                      reasonCode: event.target.value as CustomerBlockReasonCode,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="FAKE_ORDERS">طلبات وهمية</option>
                  <option value="REPEATED_REFUSAL">رفض استلام متكرر</option>
                  <option value="ABUSE">إساءة للدعم</option>
                  <option value="FRAUD">احتيال</option>
                  <option value="WRONG_DATA">بيانات غير صحيحة</option>
                  <option value="OTHER">سبب آخر</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  مدة الحظر
                </span>
                <input
                  type="date"
                  value={blockForm.expiresAt}
                  onChange={(event) =>
                    setBlockForm((current) => ({
                      ...current,
                      expiresAt: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  ملاحظة السبب
                </span>
                <textarea
                  value={blockForm.reasonNote}
                  onChange={(event) =>
                    setBlockForm((current) => ({
                      ...current,
                      reasonNote: event.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                />
              </label>
            </div>

            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setShowBlockModal(false)}
                disabled={isBlocking}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                إلغاء
              </button>
              <button
                onClick={handleBlockCustomer}
                disabled={isBlocking}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
              >
                <NoSymbolIcon className="h-4 w-4" />
                {isBlocking ? "جاري الحظر..." : "تأكيد الحظر"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t("customers.deleteConfirmTitle")}
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {t("customers.deleteConfirmMessage", { name: `${customer.firstName} ${customer.lastName}` })}
              <br />
              <span className="text-red-500 text-sm">
                {t("customers.deleteWarning")}
              </span>
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                إلغاء
              </button>
              <button
                onClick={handleDeleteCustomer}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    جاري الحذف...
                  </>
                ) : (
                  <>
                    <TrashIcon className="h-4 w-4" />
                    حذف العميل
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDetails;
