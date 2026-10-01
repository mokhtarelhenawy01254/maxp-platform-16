import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getStatusDisplay } from "../../../utils/statusRegistry";
import {
  User,
  Phone,
  Mail,
  Clock,
  ShoppingBag,
  Activity,
  RefreshCw,
  ExternalLink,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  SquarePen,
  X,
  Plus,
  Check,
  MapPin,
  FileText,
  Star,
  Award,
} from "lucide-react";
import { NoSymbolIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { useCustomerProfile } from "../../../hooks/inbox/useCustomerProfile";
import {
  ConversationStatus,
  InboxConversation,
} from "../../../types/inbox.types";
import TagInput from "../TagInput/TagInput";
import { apiClient } from "../../../services/apiClient";
import {
  getInboxCustomerAvatarUrl,
  getInboxExternalImageUrl,
} from "../../../utils/imageUrl";

import StatusDropdown from "../StatusDropdown/StatusDropdown";
import AssignmentDropdown from "../AssignmentDropdown/AssignmentDropdown";
import EnhancedOrderModal from "../../orders/EnhancedOrderModal";

interface CustomerProfileProps {
  conversation: InboxConversation;
  className?: string;
  onTagsChange: (tags: string[]) => void;
  updatingTags: boolean;
  currentStatus?: string;
  onStatusChange?: (status: string) => void;
  currentAssignee?: string | null;
  currentAssigneeName?: string | null;
  onAssign?: (userId: string | null) => void;
  disabled?: boolean;
  // 🆕 Open Conversation Callback
  onOpenConversation?: (conversationId: string) => void;
  // 🆕 Block Customer Props
  isBlocked?: boolean;
  checkingBlockStatus?: boolean;
  blocking?: boolean;
  showBlockModal?: boolean;
  blockReason?: string;
  onBlockClick?: () => void;
  onUnblockClick?: () => void;
  onBlockReasonChange?: (reason: string) => void;
  onBlockConfirm?: () => void;
  onBlockCancel?: () => void;
  // 🆕 Sound & Notifications Props
  soundEnabled?: boolean;
  notificationsEnabled?: boolean;
  onSoundToggle?: () => void;
  onNotificationsToggle?: () => void;
  // 🆕 Copy Conversation Link
  onCopyConversationLink?: (conversationId: string) => void;
  // 🆕 Quick Order
  onCreateOrder?: () => void;
  compactHeader?: boolean;
}

type Tab = "info" | "orders" | "timeline";

interface ApiErrorLike {
  response?: {
    data?: {
      message?: string;
      error?: string;
      info?: string;
    };
  };
  message?: string;
}

const CustomerProfile: React.FC<CustomerProfileProps> = ({
  conversation,
  className,
  onTagsChange,
  updatingTags,
  currentStatus,
  onStatusChange,
  currentAssignee,
  currentAssigneeName,
  onAssign,
  disabled = false,
  // 🆕 Block Customer
  isBlocked = false,
  checkingBlockStatus = false,
  blocking = false,
  showBlockModal = false,
  blockReason = "",
  onBlockClick,
  onUnblockClick,
  onBlockReasonChange,
  onBlockConfirm,
  onBlockCancel,
  // 🆕 Sound & Notifications
  soundEnabled = true,
  notificationsEnabled = true,
  onSoundToggle,
  onNotificationsToggle,
  // 🆕 Copy Conversation Link (passed but unused)
  // onCopyConversationLink,
  // 🆕 Quick Order
  onCreateOrder,
  compactHeader = false,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("timeline");
  const [syncingMessages, setSyncingMessages] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneUpdateMessage, setPhoneUpdateMessage] = useState<string | null>(null);
  const [previewOrder, setPreviewOrder] = useState<any | null>(null);
  const [searchOrderPhone, setSearchOrderPhone] = useState("");
  const {
    orders,
    activities,
    loading,
    loadCustomerData,
    prependOrder,
    updateCustomerPhone,
    calculateLTV,
    customer,
  } = useCustomerProfile();

  const handleStartEditPhone = () => {
    setPhoneDraft(customer?.phone || "");
    setEditingPhone(true);
    setPhoneUpdateMessage(null);
  };

  const handleSavePhone = async () => {
    const phone = phoneDraft.trim();
    if (!phone) {
      setPhoneUpdateMessage("❌ يرجى إدخال رقم الهاتف");
      return;
    }
    setSavingPhone(true);
    setPhoneUpdateMessage(null);
    const result = await updateCustomerPhone(phone);
    setSavingPhone(false);
    if (result.success) {
      setEditingPhone(false);
      setPhoneUpdateMessage(`✅ ${result.message}`);
      setTimeout(() => setPhoneUpdateMessage(null), 4000);
      // إعادة تحميل بيانات العميل والأوردرات فوراً
      // حتى تظهر طلبات رقم الهاتف الجديد في تبويب الطلبات
      loadCustomerData(customer?.id || conversation?.customerId || "", {
        conversationId: conversation?.id,
        phone,
      });
    } else {
      setPhoneUpdateMessage(`❌ ${result.message}`);
      setTimeout(() => setPhoneUpdateMessage(null), 5000);
    }
  };

  // Initial and reactive load of customer orders & activity
  useEffect(() => {
    loadCustomerData(conversation?.customerId || "", {
      conversationId: conversation?.id,
      phone: conversation?.customerPhone || customer?.phone || undefined,
    });
  }, [
    conversation?.customerId,
    conversation?.id,
    conversation?.customerPhone,
    loadCustomerData,
  ]);

  // Real-time synchronization when order is created from QuickOrderModal
  useEffect(() => {
    const handleInboxOrderCreated = (event: Event) => {
      const customEvent = event as CustomEvent<{
        order: any;
        orderId: string;
        orderNumber?: string;
        conversationId?: string;
      }>;
      const detail = customEvent.detail;
      if (!detail) return;

      const isCurrentConv =
        detail.conversationId &&
        conversation?.id &&
        detail.conversationId === conversation.id;
      const isCurrentCustomer =
        detail.order?.customerId &&
        conversation?.customerId &&
        detail.order.customerId === conversation.customerId;
      const isCurrentPhone =
        detail.order?.customerPhone &&
        (conversation?.customerPhone || customer?.phone) &&
        (detail.order.customerPhone === conversation?.customerPhone ||
          detail.order.customerPhone === customer?.phone);

      if (isCurrentConv || isCurrentCustomer || isCurrentPhone) {
        if (detail.order) {
          const rawOrder = detail.order;
          prependOrder({
            id: String(rawOrder.id || detail.orderId),
            orderNumber: String(rawOrder.orderNumber || detail.orderNumber || rawOrder.id),
            status: String(rawOrder.status || "CONFIRMED"),
            total: Number(rawOrder.totalAmount || rawOrder.total || 0),
            createdAt: rawOrder.createdAt || new Date().toISOString(),
            conversationId: rawOrder.conversationId || detail.conversationId || conversation?.id,
            items: Array.isArray(rawOrder.orderItems || rawOrder.products || rawOrder.items)
              ? (rawOrder.orderItems || rawOrder.products || rawOrder.items).map((item: any) => ({
                  name: item.productName || item.name || "منتج",
                  productName: item.productName || item.name || "منتج",
                  quantity: Number(item.quantity || 1),
                  price: Number(item.price || 0),
                  image: item.productImage || item.image || null,
                  productColor: item.productColor || item.color || null,
                  productSize: item.productSize || item.size || null,
                }))
              : [],
          });
        }

        // Also fetch to guarantee server consistency
        loadCustomerData(conversation?.customerId || "", {
          conversationId: conversation?.id,
          phone: conversation?.customerPhone || customer?.phone || undefined,
        });
      }
    };

    window.addEventListener("inbox:order-created", handleInboxOrderCreated);
    return () => {
      window.removeEventListener("inbox:order-created", handleInboxOrderCreated);
    };
  }, [
    conversation?.id,
    conversation?.customerId,
    conversation?.customerPhone,
    customer?.phone,
    loadCustomerData,
    prependOrder,
  ]);

  const handleSyncMessages = async () => {
    if (!conversation?.id || conversation.platform !== "facebook") {
      return;
    }

    setSyncingMessages(true);
    setSyncMessage(null);

    try {
      // Increase timeout for sync operation (can take longer due to Facebook API calls)
      const response = await apiClient.post(
        `/conversations/${conversation.id}/sync-messages`,
        {},
        {
          timeout: 90000, // 90 seconds timeout for sync operation
        },
      );

      if (response.data.success) {
        setSyncMessage(`✅ ${response.data.message || "تم جلب الرسائل بنجاح"}`);
        // Reload customer data to refresh activities
        if (conversation.customerId) {
          loadCustomerData(conversation.customerId);
        }
      } else {
        setSyncMessage(`❌ ${response.data.message || "فشل في جلب الرسائل"}`);
      }
    } catch (error: unknown) {
      const apiError = error as ApiErrorLike;
      console.error("Error syncing messages:", error);
      const errorMessage =
        apiError.response?.data?.message ||
        apiError.response?.data?.error ||
        apiError.message ||
        "حدث خطأ أثناء جلب الرسائل";
      const errorInfo = apiError.response?.data?.info
        ? ` (${apiError.response.data.info})`
        : "";
      setSyncMessage(`❌ ${errorMessage}${errorInfo}`);
    } finally {
      setSyncingMessages(false);
      // Clear message after 5 seconds
      setTimeout(() => {
        setSyncMessage(null);
      }, 5000);
    }
  };

  const ltv = calculateLTV();
  const effectiveStatus: ConversationStatus =
    currentStatus === "open" ||
    currentStatus === "pending" ||
    currentStatus === "resolved" ||
    currentStatus === "done"
      ? currentStatus
      : conversation.status;

  const sectionSurfaceStyle: React.CSSProperties = {
    background: "var(--business-surface-subtle)",
    border: "1px solid var(--business-card-border)",
    boxShadow: "var(--business-card-shadow)",
  };

  const mutedHeadingStyle: React.CSSProperties = {
    color: "var(--color-muted-foreground)",
  };

  const customerAvatarUrl = getInboxCustomerAvatarUrl(
    conversation.customerId,
    conversation.customerAvatar,
  );

  const getOrderStatusTheme = (status?: string) => {
    if (!status) return { background: '#f3f4f6', color: '#374151' };
    const info = getStatusDisplay(status);
    const colorMatch = info.colorClass.match(/text-([a-z]+)-(\d+)/);
    const colorMap: Record<string, string> = {
      'green': '#16a34a', 'red': '#dc2626', 'yellow': '#ca8a04',
      'blue': '#2563eb', 'indigo': '#4f46e5', 'purple': '#9333ea',
      'orange': '#ea580c', 'amber': '#d97706', 'gray': '#6b7280',
      'cyan': '#06b6d4', 'teal': '#0d9488', 'rose': '#e11d48',
      'sky': '#0284c7', 'emerald': '#059669', 'pink': '#db2777',
      'stone': '#78716c',
    };
    const colorName = colorMatch ? colorMatch[1] : 'gray';
    const color = colorMap[colorName] || '#6b7280';
    return {
      background: `color-mix(in srgb, ${color} 12%, var(--color-card, #ffffff))`,
      color,
    };
  };

  const statsSummary = (
    <div
      className={[
        "grid grid-cols-2 overflow-hidden rounded-lg text-center",
        compactHeader ? "w-full" : "shrink-0",
      ].join(" ")}
      style={{
        border: "1px solid var(--business-card-border)",
        background: "var(--business-surface-subtle)",
      }}
    >
      <div className="min-w-[46px] px-2 py-1">
        <p className="text-[10px] leading-4" style={mutedHeadingStyle}>
          الطلبات
        </p>
        <p
          className="text-sm font-semibold leading-5"
          style={{ color: "var(--color-foreground)" }}
        >
          {orders.length}
        </p>
      </div>
      <div
        className="min-w-[58px] px-2 py-1"
        style={{ borderRight: "1px solid var(--business-muted-line)" }}
      >
        <p className="text-[10px] leading-4" style={mutedHeadingStyle}>
          القيمة
        </p>
        <p
          className="text-sm font-semibold leading-5"
          style={{ color: "var(--business-success)" }}
        >
          {ltv.toLocaleString()} ج.م
        </p>
      </div>
    </div>
  );
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => setIsMobileViewport(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const useCompactActions = compactHeader || isMobileViewport;
  const compactActionClassName =
    "business-chip-button flex h-8 w-8 shrink-0 items-center justify-center rounded-xl p-0 text-xs font-medium transition-colors";
  const expandedActionClassName =
    "business-chip-button flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-medium transition-colors";
  const actionLabelClassName = useCompactActions ? "sr-only" : "truncate";

  return (
    <div
      className={[
        "business-inbox-column business-inbox-column--profile h-full",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Header / Avatar */}
      <div
        className="business-inbox-header px-3 py-2.5 text-right"
        style={{ borderBottom: "1px solid var(--business-muted-line)" }}
      >
        {compactHeader ? (
          statsSummary
        ) : (
          <div className="flex items-center gap-2.5">
            {customerAvatarUrl ? (
              <img
                src={customerAvatarUrl}
                alt={conversation.customerName}
                className="h-12 w-12 shrink-0 rounded-full object-cover shadow-sm"
                style={{ border: "1px solid var(--business-card-border)" }}
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                  const fallback = e.currentTarget.nextElementSibling;
                  if (fallback) (fallback as HTMLElement).style.display = "flex";
                }}
              />
            ) : null}
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white shadow-sm"
              style={{
                display: customerAvatarUrl ? "none" : "flex",
                background:
                  "linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)",
              }}
            >
              {conversation.customerName?.charAt(0)?.toUpperCase() || "؟"}
            </div>

            <div className="min-w-0 flex-1">
              <h3
                className="truncate text-sm font-bold leading-5"
                style={{ color: "var(--color-foreground)" }}
              >
                {conversation.customerName}
              </h3>
              <div
                className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]"
                style={mutedHeadingStyle}
              >
                <span>عميل منذ {format(new Date(), "yyyy")}</span>
                {conversation.platform === "facebook" && (
                  <span className="truncate font-medium">
                    {conversation.pageName || "Facebook"}
                  </span>
                )}
              </div>
            </div>

            {statsSummary}
          </div>
        )}

        {/* Status & Assignment - compact controls */}
        {(onStatusChange || onAssign) && (
          <div
            className="mt-2 grid gap-1.5"
            style={{
              gridTemplateColumns:
                onStatusChange && onAssign
                  ? "minmax(0, 1fr) minmax(0, 1fr)"
                  : "minmax(0, 1fr)",
            }}
          >
            {onStatusChange && (
              <div className="min-w-0 [&>div>button]:w-full [&>div>button]:justify-between [&>div>button]:overflow-hidden [&>div>button]:rounded-xl [&>div>button]:px-2 [&>div>button]:py-1 [&>div>button]:text-xs [&>div>button_span]:truncate">
                <StatusDropdown
                  currentStatus={effectiveStatus}
                  onStatusChange={onStatusChange}
                  disabled={disabled}
                />
              </div>
            )}
            {onAssign && (
              <div className="min-w-0 [&>div>button]:w-full [&>div>button]:justify-between [&>div>button]:overflow-hidden [&>div>button]:rounded-xl [&>div>button]:px-2 [&>div>button]:py-1 [&>div>button]:text-xs [&>div>button_span]:truncate">
                <AssignmentDropdown
                  currentAssignee={currentAssignee ?? conversation.assignedTo}
                  currentAssigneeName={
                    currentAssigneeName ?? conversation.assignedToName
                  }
                  onAssign={onAssign}
                  disabled={disabled}
                />
              </div>
            )}
          </div>
        )}

        {(onSoundToggle ||
          onNotificationsToggle ||
          onCreateOrder ||
          (conversation.pageId && (onBlockClick || onUnblockClick))) && (
          <div className="mt-2 flex items-center gap-1.5">
            {onSoundToggle && (
              <button
                onClick={onSoundToggle}
                className="business-chip-button flex h-8 w-8 shrink-0 items-center justify-center rounded-xl p-0 transition-colors"
                style={
                  soundEnabled
                    ? {
                        color: "var(--color-primary)",
                        background:
                          "color-mix(in srgb, var(--color-primary) 10%, var(--color-card, #ffffff))",
                      }
                    : undefined
                }
                title={soundEnabled ? "كتم الصوت" : "تفعيل الصوت"}
                aria-label={soundEnabled ? "كتم الصوت" : "تفعيل الصوت"}
              >
                {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
              </button>
            )}

            {onNotificationsToggle && (
              <button
                onClick={onNotificationsToggle}
                className="business-chip-button flex h-8 w-8 shrink-0 items-center justify-center rounded-xl p-0 transition-colors"
                style={
                  notificationsEnabled
                    ? {
                        color: "var(--color-primary)",
                        background:
                          "color-mix(in srgb, var(--color-primary) 10%, var(--color-card, #ffffff))",
                      }
                    : undefined
                }
                title={
                  notificationsEnabled ? "كتم الإشعارات" : "تفعيل الإشعارات"
                }
                aria-label={
                  notificationsEnabled ? "كتم الإشعارات" : "تفعيل الإشعارات"
                }
              >
                {notificationsEnabled ? (
                  <Bell size={15} />
                ) : (
                  <BellOff size={15} />
                )}
              </button>
            )}

            {onCreateOrder && (
              <button
                onClick={onCreateOrder}
                className={
                  useCompactActions
                    ? compactActionClassName
                    : expandedActionClassName
                }
                style={{
                  color: "var(--business-warning)",
                  background:
                    "color-mix(in srgb, var(--business-warning) 10%, var(--color-card, #ffffff))",
                  borderColor:
                    "color-mix(in srgb, var(--business-warning) 20%, transparent)",
                }}
                title="إنشاء طلب سريع لهذا العميل"
                aria-label="إنشاء طلب سريع لهذا العميل"
              >
                <ShoppingBag className="h-4 w-4 shrink-0" />
                <span className={actionLabelClassName}>طلب</span>
              </button>
            )}

            {conversation.pageId && (onBlockClick || onUnblockClick) && (
              checkingBlockStatus ? (
                <div
                  className={[
                    "flex h-8 items-center justify-center rounded-xl",
                    useCompactActions ? "w-8 shrink-0" : "min-w-0 flex-1",
                  ].join(" ")}
                  style={{
                    border: "1px solid var(--business-card-border)",
                    background: "var(--business-surface-subtle)",
                  }}
                >
                  <div
                    className="h-4 w-4 animate-spin rounded-full border-b-2"
                    style={{ borderColor: "var(--color-muted-foreground)" }}
                  ></div>
                </div>
              ) : isBlocked ? (
                <button
                  onClick={onUnblockClick}
                  disabled={blocking}
                  className={`${useCompactActions ? compactActionClassName : expandedActionClassName} disabled:cursor-not-allowed disabled:opacity-50`}
                  style={{
                    color: "var(--business-success)",
                    background:
                      "color-mix(in srgb, var(--business-success) 10%, var(--color-card, #ffffff))",
                    borderColor:
                      "color-mix(in srgb, var(--business-success) 20%, transparent)",
                  }}
                  title="إلغاء حظر العميل على الصفحة"
                  aria-label="إلغاء حظر العميل على الصفحة"
                >
                  <CheckCircleIcon className="h-4 w-4 shrink-0" />
                  <span className={actionLabelClassName}>فتح</span>
                </button>
              ) : (
                <button
                  onClick={onBlockClick}
                  className={
                    useCompactActions
                      ? compactActionClassName
                      : expandedActionClassName
                  }
                  style={{
                    color: "var(--business-danger)",
                    background:
                      "color-mix(in srgb, var(--business-danger) 10%, var(--color-card, #ffffff))",
                    borderColor:
                      "color-mix(in srgb, var(--business-danger) 20%, transparent)",
                  }}
                  title="حظر العميل على الصفحة"
                  aria-label="حظر العميل على الصفحة"
                >
                  <NoSymbolIcon className="h-4 w-4 shrink-0" />
                  <span className={actionLabelClassName}>حظر</span>
                </button>
              )
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="business-inbox-tabs mx-2 my-1">
        <button
          onClick={() => setActiveTab("timeline")}
          className="business-inbox-tab"
          data-active={activeTab === "timeline" ? "true" : "false"}
        >
          <span className="flex items-center justify-center gap-1">
            <Activity size={14} /> نشاط
          </span>
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className="business-inbox-tab"
          data-active={activeTab === "orders" ? "true" : "false"}
        >
          <span className="flex items-center justify-center gap-1">
            <ShoppingBag size={14} /> طلبات
            {orders.length > 0 && (
              <span className="business-inbox-tab-count">{orders.length}</span>
            )}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("info")}
          className="business-inbox-tab"
          data-active={activeTab === "info" ? "true" : "false"}
        >
          <span className="flex items-center justify-center gap-1">
            <User size={14} /> معلومات
          </span>
        </button>
      </div>

      {/* Content area */}
      <div className="business-chat-stage flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex justify-center p-6">
            <div
              className="animate-spin rounded-full h-8 w-8 border-b-2"
              style={{ borderColor: "var(--color-primary)" }}
            ></div>
          </div>
        ) : (
          <>
            {/* INFO TAB */}
            {activeTab === "info" && (
              <div className="space-y-4">
                {/* Contact Info */}
                <div className="p-3 rounded-lg" style={sectionSurfaceStyle}>
                  <h4
                    className="text-xs font-semibold uppercase mb-2"
                    style={mutedHeadingStyle}
                  >
                    التواصل
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone
                        size={15}
                        style={{ color: "var(--color-muted-foreground)" }}
                      />
                      {editingPhone ? (
                        <input
                          autoFocus
                          type="tel"
                          dir="ltr"
                          value={phoneDraft}
                          onChange={(e) => setPhoneDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSavePhone();
                            if (e.key === "Escape") {
                              setEditingPhone(false);
                              setPhoneUpdateMessage(null);
                            }
                          }}
                          className="business-chat-input flex-1 min-w-0 px-2 py-1 text-sm font-medium font-mono"
                          placeholder="01xxxxxxxxx"
                          disabled={savingPhone}
                        />
                      ) : customer?.phone ? (
                        <span
                          className="font-medium font-mono flex-1 min-w-0 truncate"
                          style={{ color: "var(--color-foreground)" }}
                          dir="ltr"
                        >
                          {customer.phone}
                        </span>
                      ) : null}
                      {editingPhone ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={handleSavePhone}
                            disabled={savingPhone}
                          className="business-chip-button flex h-8 w-8 items-center justify-center rounded-lg transition-all disabled:opacity-50"
                          style={{
                            color: "#ffffff",
                            background: "var(--business-success)",
                            borderColor: "transparent",
                            boxShadow:
                              "0 10px 20px -12px color-mix(in srgb, var(--business-success) 70%, transparent)",
                          }}
                          title="حفظ رقم الهاتف"
                          aria-label="حفظ رقم الهاتف"
                        >
                          {savingPhone ? (
                            <div
                              className="h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent"
                            ></div>
                          ) : (
                            <Check size={20} strokeWidth={3} />
                          )}
                        </button>
                          <button
                            onClick={() => {
                              setEditingPhone(false);
                              setPhoneUpdateMessage(null);
                            }}
                            disabled={savingPhone}
                            className="business-chip-button flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-50"
                            style={{
                              color: "var(--business-danger)",
                              background:
                                "color-mix(in srgb, var(--business-danger) 12%, var(--color-card, #ffffff))",
                              borderColor:
                                "color-mix(in srgb, var(--business-danger) 30%, transparent)",
                            }}
                            title="إلغاء"
                            aria-label="إلغاء"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ) : customer?.phone ? (
                        <button
                          onClick={handleStartEditPhone}
                          className="business-chip-button flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors"
                          style={{
                            color: "var(--color-primary)",
                            background:
                              "color-mix(in srgb, var(--color-primary) 12%, var(--color-card, #ffffff))",
                            borderColor:
                              "color-mix(in srgb, var(--color-primary) 30%, transparent)",
                          }}
                          title="تعديل رقم الهاتف"
                          aria-label="تعديل رقم الهاتف"
                        >
                          <SquarePen size={16} />
                        </button>
                      ) : null}
                    </div>
                    {!customer?.phone && !editingPhone && (
                      <button
                        onClick={handleStartEditPhone}
                        className="business-chip-button w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold transition-all"
                        style={{
                          color: "#ffffff",
                          background:
                            "linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)",
                          border: "none",
                          boxShadow:
                            "0 18px 34px -22px color-mix(in srgb, var(--color-primary) 65%, transparent)",
                        }}
                        title="إضافة رقم الهاتف"
                        aria-label="إضافة رقم الهاتف"
                      >
                        <Plus size={16} />
                        إضافة رقم الهاتف
                      </button>
                    )}
                    {phoneUpdateMessage && (
                      <p
                        className="text-xs"
                        style={{
                          color: phoneUpdateMessage.includes("✅")
                            ? "var(--business-success)"
                            : "var(--business-danger)",
                        }}
                      >
                        {phoneUpdateMessage}
                      </p>
                    )}
                    {customer?.email &&
                      !customer.email.endsWith("@example.com") && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail
                            size={15}
                            style={{ color: "var(--color-muted-foreground)" }}
                          />
                          <span
                            className="truncate"
                            style={{ color: "var(--color-foreground)" }}
                          >
                            {customer.email}
                          </span>
                        </div>
                      )}
                  </div>
                </div>

                {/* Customer Classification & Summary */}
                {(customer?.customerRating || customer?.deliveryRate != null || (customer?.totalOrdersCount != null && customer.totalOrdersCount > 0)) && (
                  <div className="p-3 rounded-lg" style={sectionSurfaceStyle}>
                    <h4
                      className="text-xs font-semibold uppercase mb-2"
                      style={mutedHeadingStyle}
                    >
                      تصنيف وسجل العميل
                    </h4>
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      {customer?.customerRating && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                          <Star size={13} className="text-amber-500 fill-amber-500" />
                          <span>{customer.customerRating}</span>
                        </span>
                      )}
                      {customer?.totalOrdersCount != null && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                          <ShoppingBag size={13} />
                          <span>{customer.totalOrdersCount} طلبات مسجلة</span>
                        </span>
                      )}
                      {customer?.deliveryRate != null && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                          <Award size={13} className="text-emerald-600" />
                          <span>{customer.deliveryRate}% نسبة التسليم</span>
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Customer Address */}
                {(customer?.address || customer?.governorate || customer?.city || customer?.area) && (
                  <div className="p-3 rounded-lg" style={sectionSurfaceStyle}>
                    <h4
                      className="text-xs font-semibold uppercase mb-2"
                      style={mutedHeadingStyle}
                    >
                      العنوان وموقع التوصيل
                    </h4>
                    <div className="space-y-1.5 text-xs">
                      {(customer.governorate || customer.city) && (
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <MapPin size={14} className="text-primary shrink-0" />
                          <span>{[customer.governorate, customer.city, customer.area].filter(Boolean).join(" - ")}</span>
                        </div>
                      )}
                      {customer.address && (
                        <div className="text-muted-foreground pr-5 leading-relaxed">
                          {customer.address}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Customer Notes */}
                {customer?.notes && (
                  <div className="p-3 rounded-lg" style={sectionSurfaceStyle}>
                    <h4
                      className="text-xs font-semibold uppercase mb-2"
                      style={mutedHeadingStyle}
                    >
                      ملاحظات العميل
                    </h4>
                    <div className="flex items-start gap-1.5 text-xs text-muted-foreground leading-relaxed">
                      <FileText size={14} className="text-amber-500 shrink-0 mt-0.5" />
                      <span>{customer.notes}</span>
                    </div>
                  </div>
                )}

                {/* Tags */}
                <div className="p-3 rounded-lg" style={sectionSurfaceStyle}>
                  <h4
                    className="text-xs font-semibold uppercase mb-2"
                    style={mutedHeadingStyle}
                  >
                    التصنيفات
                  </h4>
                  <TagInput
                    conversationId={conversation.id}
                    currentTags={conversation.tags}
                    onTagsChange={onTagsChange}
                    disabled={updatingTags}
                  />
                </div>

                {/* Metadata / Custom Fields */}
                <div className="p-3 rounded-lg" style={sectionSurfaceStyle}>
                  <h4
                    className="text-xs font-semibold uppercase mb-2"
                    style={mutedHeadingStyle}
                  >
                    بيانات أخرى
                  </h4>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span style={{ color: "var(--color-muted-foreground)" }}>
                        آخر ظهور:
                      </span>
                      <span
                        className="font-medium"
                        style={{ color: "var(--color-foreground)" }}
                      >
                        {format(
                          new Date(conversation.lastMessageTime),
                          "MMM d, HH:mm",
                          { locale: arSA },
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ORDERS TAB */}
            {activeTab === "orders" && (
              <div className="space-y-4">
                {/* رقم الهاتف - بيظهر دايماً فوق الأوردرات حتى لو مفيش طلبات */}
                <div
                  className="p-3 rounded-lg"
                  style={{
                    background:
                      "color-mix(in srgb, var(--color-primary) 7%, var(--color-card, #ffffff))",
                    border:
                      "1px solid color-mix(in srgb, var(--color-primary) 18%, transparent)",
                  }}
                >
                  <h4
                    className="text-xs font-semibold uppercase mb-2"
                    style={mutedHeadingStyle}
                  >
                    رقم الهاتف
                  </h4>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone
                      size={15}
                      className="shrink-0"
                      style={{ color: "var(--color-primary)" }}
                    />
                    {editingPhone ? (
                      <input
                        autoFocus
                        type="tel"
                        dir="ltr"
                        value={phoneDraft}
                        onChange={(e) => setPhoneDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSavePhone();
                          if (e.key === "Escape") {
                            setEditingPhone(false);
                            setPhoneUpdateMessage(null);
                          }
                        }}
                        className="business-chat-input flex-1 min-w-0 px-2 py-1 text-sm font-medium font-mono"
                        placeholder="01xxxxxxxxx"
                        disabled={savingPhone}
                      />
                    ) : customer?.phone ? (
                      <span
                        className="flex-1 min-w-0 truncate font-mono font-medium"
                        style={{ color: "var(--color-primary)" }}
                        dir="ltr"
                      >
                        {customer.phone}
                      </span>
                    ) : (
                      <span
                        className="flex-1 min-w-0 text-xs"
                        style={{ color: "var(--color-muted-foreground)" }}
                      >
                        لم يتم إضافة رقم هاتف بعد
                      </span>
                    )}
                    {editingPhone ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={handleSavePhone}
                          disabled={savingPhone}
                          className="business-chip-button flex h-8 w-8 items-center justify-center rounded-lg transition-all disabled:opacity-50"
                          style={{
                            color: "#ffffff",
                            background: "var(--business-success)",
                            borderColor: "transparent",
                            boxShadow:
                              "0 10px 20px -12px color-mix(in srgb, var(--business-success) 70%, transparent)",
                          }}
                          title="حفظ رقم الهاتف"
                          aria-label="حفظ رقم الهاتف"
                        >
                          {savingPhone ? (
                            <div
                              className="h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent"
                            ></div>
                          ) : (
                            <Check size={20} strokeWidth={3} />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setEditingPhone(false);
                            setPhoneUpdateMessage(null);
                          }}
                          disabled={savingPhone}
                          className="business-chip-button flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-50"
                          style={{
                            color: "var(--business-danger)",
                            background:
                              "color-mix(in srgb, var(--business-danger) 12%, var(--color-card, #ffffff))",
                            borderColor:
                              "color-mix(in srgb, var(--business-danger) 30%, transparent)",
                          }}
                          title="إلغاء"
                          aria-label="إلغاء"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ) : customer?.phone ? (
                      <button
                        onClick={handleStartEditPhone}
                        className="business-chip-button flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors"
                        style={{
                          color: "var(--color-primary)",
                          background:
                            "color-mix(in srgb, var(--color-primary) 12%, var(--color-card, #ffffff))",
                          borderColor:
                            "color-mix(in srgb, var(--color-primary) 30%, transparent)",
                        }}
                        title="تعديل رقم الهاتف"
                        aria-label="تعديل رقم الهاتف"
                      >
                        <SquarePen size={16} />
                      </button>
                    ) : null}
                  </div>
                  {!customer?.phone && !editingPhone && (
                    <button
                      onClick={handleStartEditPhone}
                      className="business-chip-button mt-2 w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold transition-all"
                      style={{
                        color: "#ffffff",
                        background:
                          "linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)",
                        border: "none",
                        boxShadow:
                          "0 18px 34px -22px color-mix(in srgb, var(--color-primary) 65%, transparent)",
                      }}
                      title="إضافة رقم الهاتف"
                      aria-label="إضافة رقم الهاتف"
                    >
                      <Plus size={16} />
                      إضافة رقم الهاتف
                    </button>
                  )}
                  {phoneUpdateMessage && (
                    <p
                      className="text-xs mt-2"
                      style={{
                        color: phoneUpdateMessage.includes("✅")
                          ? "var(--business-success)"
                          : "var(--business-danger)",
                      }}
                    >
                      {phoneUpdateMessage}
                    </p>
                  )}
                </div>

                {/* Orders Summary Header & Quick Phone Search */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="بحث برقم هاتف عن طلبات سابقة..."
                      className="business-control-input flex-1 text-xs py-1.5 font-mono"
                      dir="ltr"
                      value={searchOrderPhone}
                      onChange={(e) => setSearchOrderPhone(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && searchOrderPhone.trim()) {
                          loadCustomerData(customer?.id || "", {
                            conversationId: conversation?.id,
                            phone: searchOrderPhone.trim(),
                          });
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (searchOrderPhone.trim()) {
                          loadCustomerData(customer?.id || "", {
                            conversationId: conversation?.id,
                            phone: searchOrderPhone.trim(),
                          });
                        }
                      }}
                      className="business-chip-button px-3 py-1.5 text-xs font-medium"
                    >
                      بحث
                    </button>
                    {searchOrderPhone && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchOrderPhone("");
                          loadCustomerData(conversation?.customerId || "", {
                            conversationId: conversation?.id,
                            phone: conversation?.customerPhone || customer?.phone || undefined,
                          });
                        }}
                        className="business-chip-button px-2 py-1.5 text-xs"
                        title="إعادة تعيين"
                      >
                        إلغاء
                      </button>
                    )}
                  </div>

                  {/* Customer Information Card (from phone lookup) */}
                  {(customer?.name || customer?.address || customer?.governorate || customer?.city || customer?.customerRating) && (
                    <div
                      className="p-3 rounded-lg text-xs space-y-1.5 border"
                      style={{
                        background: "var(--business-surface-subtle)",
                        borderColor: "var(--business-card-border)",
                      }}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 font-bold text-sm" style={{ color: "var(--color-foreground)" }}>
                          <User size={15} className="text-primary shrink-0" />
                          <span>{customer.name || conversation.customerName}</span>
                        </div>
                        {customer.customerRating && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                            <Star size={11} className="text-amber-500 fill-amber-500" />
                            {customer.customerRating}
                          </span>
                        )}
                      </div>

                      {(customer.governorate || customer.city || customer.address) && (
                        <div className="flex items-start gap-1.5 text-muted-foreground">
                          <MapPin size={13} className="text-primary shrink-0 mt-0.5" />
                          <span className="leading-snug">
                            {[customer.governorate, customer.city, customer.address].filter(Boolean).join(" · ")}
                          </span>
                        </div>
                      )}

                      {customer.notes && (
                        <div className="flex items-start gap-1.5 text-muted-foreground">
                          <FileText size={13} className="text-amber-500 shrink-0 mt-0.5" />
                          <span className="leading-snug">{customer.notes}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {orders.length > 0 && (
                    <div
                      className="p-3 rounded-lg"
                      style={{
                        background:
                          "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 10%, var(--color-card, #ffffff)) 0%, color-mix(in srgb, var(--color-secondary) 8%, var(--color-card, #ffffff)) 100%)",
                        border:
                          "1px solid color-mix(in srgb, var(--color-primary) 18%, transparent)",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShoppingBag
                            size={18}
                            style={{ color: "var(--color-primary)" }}
                          />
                          <span
                            className="font-semibold text-sm"
                            style={{ color: "var(--color-primary)" }}
                          >
                            سجل الطلبات
                          </span>
                        </div>
                        <span
                          className="text-white text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background: "var(--color-primary)" }}
                        >
                          {orders.length} طلب
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {orders.length === 0 ? (
                  <div
                    className="text-center py-8"
                    style={{ color: "var(--color-muted-foreground)" }}
                  >
                    <ShoppingBag
                      size={44}
                      className="mx-auto mb-2 opacity-20"
                    />
                    <p className="text-sm">لا توجد طلبات سابقة لهذا الرقم</p>
                  </div>
                ) : (
                  orders.map((order) => {
                    const isFromThisConv = Boolean(
                      order.conversationId &&
                      conversation?.id &&
                      String(order.conversationId) === String(conversation.id)
                    );

                    return (
                      <div
                        key={order.id}
                        className="p-3 rounded-lg transition-colors space-y-2.5"
                        style={sectionSurfaceStyle}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p
                                className="font-bold text-sm"
                                style={{ color: "var(--color-foreground)" }}
                              >
                                #{order.orderNumber}
                              </p>
                              {isFromThisConv && (
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                  💬 من هذه المحادثة
                                </span>
                              )}
                            </div>
                            <p
                              className="text-xs mt-0.5"
                              style={{ color: "var(--color-muted-foreground)" }}
                            >
                              {format(new Date(order.createdAt), "dd MMM yyyy - HH:mm", {
                                locale: arSA,
                              })}
                            </p>
                          </div>
                          <span
                            className="px-2 py-0.5 text-xs rounded-full shrink-0 font-medium"
                            style={getOrderStatusTheme(order.status)}
                          >
                            {(() => {
                              const info = getStatusDisplay(order.status);
                              return t(info.labelKey) || info.label;
                            })()}
                          </span>
                        </div>

                        {/* Order Items Breakdown */}
                        {order.items && order.items.length > 0 && (
                          <div
                            className="pt-2 space-y-1.5"
                            style={{
                              borderTop: "1px dashed var(--business-muted-line)",
                            }}
                          >
                            {order.items.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex justify-between items-center text-xs gap-2"
                              >
                                <span
                                  className="truncate font-medium flex-1 text-right"
                                  style={{ color: "var(--color-foreground)" }}
                                >
                                  {item.quantity}× {item.productName || item.name}
                                  {(item.productColor || item.productSize) && (
                                    <span className="text-[11px] opacity-75 mr-1 font-normal">
                                      ({[item.productColor, item.productSize].filter(Boolean).join(" - ")})
                                    </span>
                                  )}
                                </span>
                                <span
                                  className="font-mono shrink-0 text-left font-medium"
                                  style={{ color: "var(--color-foreground)" }}
                                >
                                  {(item.price * item.quantity).toLocaleString()} ج.م
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div
                          className="flex justify-between items-center pt-2"
                          style={{
                            borderTop: "1px solid var(--business-muted-line)",
                          }}
                        >
                          <span
                            className="text-xs font-medium"
                            style={{ color: "var(--color-muted-foreground)" }}
                          >
                            الإجمالي:
                          </span>
                          <span
                            className="font-bold text-sm"
                            style={{ color: "var(--color-primary)" }}
                          >
                            {order.total?.toLocaleString() || 0} ج.م
                          </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setPreviewOrder(order)}
                            className="business-chip-button flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                            style={{
                              color: "var(--color-primary)",
                              background:
                                "color-mix(in srgb, var(--color-primary) 8%, var(--color-card, #ffffff))",
                            }}
                          >
                            معاينة سريعة
                          </button>
                          <a
                            href={`/orders/${order.orderNumber || order.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="business-chip-button flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                            style={{
                              borderColor: "var(--business-card-border)",
                              color: "var(--business-text-primary)",
                            }}
                          >
                            <ExternalLink size={12} />
                            صفحة الطلب
                          </a>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TIMELINE TAB */}
            {activeTab === "timeline" && (
              <div
                className="relative pl-4 space-y-6 mr-2"
                style={{ borderRight: "2px solid var(--business-muted-line)" }}
              >
                {/* Using marginRight and borderRight for RTL timeline effect */}

                {/* Sync Facebook Messages Button - Only for Facebook conversations */}
                {conversation.platform === "facebook" && (
                  <div className="relative pr-6 mb-4">
                    <div
                      className="absolute -right-[29px] top-1 w-3 h-3 rounded-full border-2"
                      style={{
                        background: "var(--business-success)",
                        borderColor: "var(--business-card-border)",
                        boxShadow:
                          "0 0 0 4px color-mix(in srgb, var(--business-success) 10%, var(--color-card, #ffffff))",
                      }}
                    ></div>
                    <div
                      className="rounded-lg p-3"
                      style={{
                        background:
                          "color-mix(in srgb, var(--business-success) 8%, var(--color-card, #ffffff))",
                        border:
                          "1px solid color-mix(in srgb, var(--business-success) 18%, transparent)",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p
                            className="text-sm font-semibold mb-1"
                            style={{ color: "var(--business-success)" }}
                          >
                            جلب الرسائل من Facebook
                          </p>
                          <p
                            className="text-xs"
                            style={{ color: "var(--business-success)" }}
                          >
                            احضر جميع الرسائل القديمة للمحادثة من Facebook
                          </p>
                          {syncMessage && (
                            <p
                              className="text-xs mt-2"
                              style={{
                                color: syncMessage.includes("✅")
                                  ? "var(--business-success)"
                                  : "var(--business-danger)",
                              }}
                            >
                              {syncMessage}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={handleSyncMessages}
                          disabled={syncingMessages}
                          className="business-chip-button flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                          style={
                            syncingMessages
                              ? {
                                  background:
                                    "color-mix(in srgb, var(--business-success) 16%, var(--color-card, #ffffff))",
                                  color: "var(--business-success)",
                                }
                              : {
                                  background: "var(--business-success)",
                                  borderColor: "transparent",
                                  color: "white",
                                }
                          }
                        >
                          <RefreshCw
                            size={16}
                            className={syncingMessages ? "animate-spin" : ""}
                          />
                          {syncingMessages ? "جاري الجلب..." : "جلب الرسائل"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Post Details Section - Show if postId exists */}
                {conversation.postId && (
                  <div className="relative pr-6 mb-4">
                    <div
                      className="absolute -right-[29px] top-1 w-3 h-3 rounded-full border-2"
                      style={{
                        background: "var(--color-secondary)",
                        borderColor: "var(--business-card-border)",
                        boxShadow:
                          "0 0 0 4px color-mix(in srgb, var(--color-secondary) 10%, var(--color-card, #ffffff))",
                      }}
                    ></div>
                    <div
                      className="rounded-lg p-3"
                      style={{
                        background:
                          "color-mix(in srgb, var(--color-secondary) 8%, var(--color-card, #ffffff))",
                        border:
                          "1px solid color-mix(in srgb, var(--color-secondary) 18%, transparent)",
                      }}
                    >
                      <div className="flex items-start space-x-2 space-x-reverse mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 text-sm mb-1">
                            <span
                              className="font-semibold"
                              style={{ color: "var(--color-secondary)" }}
                            >
                              📌 جاء من منشور
                            </span>
                            {!conversation.postDetails &&
                              !conversation.postDetailsUnavailable && (
                              <span
                                className="text-xs"
                                style={{ color: "var(--color-secondary)" }}
                              >
                                جاري تحميل التفاصيل...
                              </span>
                            )}
                            {conversation.postDetailsUnavailable && (
                              <span
                                className="text-xs"
                                style={{ color: "var(--color-secondary)" }}
                              >
                                تفاصيل المنشور غير متاحة
                              </span>
                            )}
                            {conversation.postDetails?.permalinkUrl && (
                              <a
                                href={conversation.postDetails.permalinkUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs underline flex items-center space-x-1"
                                style={{ color: "var(--color-secondary)" }}
                              >
                                <span>عرض المنشور</span>
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                  />
                                </svg>
                              </a>
                            )}
                          </div>
                          {conversation.postDetails?.message && (
                            <p
                              className="text-xs mb-2 line-clamp-3"
                              style={{ color: "var(--color-secondary)" }}
                            >
                              {conversation.postDetails.message}
                            </p>
                          )}
                          {conversation.postDetails?.hasImages &&
                            conversation.postDetails?.imageUrls &&
                            conversation.postDetails.imageUrls.length > 0 && (
                              <div className="flex space-x-1 space-x-reverse mb-2">
                                {conversation.postDetails.imageUrls
                                  .slice(0, 3)
                                  .map((imageUrl: string, idx: number) => (
                                    <img
                                      key={idx}
                                      src={getInboxExternalImageUrl(imageUrl)}
                                      alt={`Post image ${idx + 1}`}
                                      className="w-12 h-12 object-cover rounded border"
                                      style={{
                                        borderColor:
                                          "color-mix(in srgb, var(--color-secondary) 18%, transparent)",
                                      }}
                                      onError={(e) => {
                                        (
                                          e.target as HTMLImageElement
                                        ).style.display = "none";
                                      }}
                                    />
                                  ))}
                                {conversation.postDetails.imageUrls.length >
                                  3 && (
                                  <div
                                    className="w-12 h-12 rounded flex items-center justify-center text-xs font-medium"
                                    style={{
                                      background:
                                        "color-mix(in srgb, var(--color-secondary) 10%, var(--color-card, #ffffff))",
                                      border:
                                        "1px solid color-mix(in srgb, var(--color-secondary) 18%, transparent)",
                                      color: "var(--color-secondary)",
                                    }}
                                  >
                                    +
                                    {conversation.postDetails.imageUrls.length -
                                      3}
                                  </div>
                                )}
                              </div>
                            )}
                          <p
                            className="text-xs mt-1"
                            style={{ color: "var(--color-secondary)" }}
                          >
                            Post ID: {conversation.postId.substring(0, 20)}...
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activities.length === 0 && !conversation.postId ? (
                  <div
                    className="text-center py-8 pr-4"
                    style={{ color: "var(--color-muted-foreground)" }}
                  >
                    <Clock size={48} className="mx-auto mb-2 opacity-20" />
                    <p>لا يوجد نشاط مسجل</p>
                  </div>
                ) : (
                  activities.map((activity) => {
                    return (
                      <div key={activity.id} className="relative pr-6">
                        <div
                          className="absolute -right-[29px] top-1 w-3 h-3 rounded-full border-2"
                          style={{
                            background: "var(--color-primary)",
                            borderColor: "var(--business-card-border)",
                            boxShadow:
                              "0 0 0 4px color-mix(in srgb, var(--color-primary) 10%, var(--color-card, #ffffff))",
                          }}
                        ></div>
                        <div>
                          <p
                            className="text-sm font-medium"
                            style={{ color: "var(--color-foreground)" }}
                          >
                            {activity.description}
                          </p>
                          <p
                            className="text-xs mt-1"
                            style={{ color: "var(--color-muted-foreground)" }}
                          >
                            {format(
                              new Date(activity.createdAt),
                              "dd MMM, HH:mm",
                              { locale: arSA },
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* 🆕 Block Customer Modal */}
      {showBlockModal && onBlockConfirm && onBlockCancel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="business-modal-surface rounded-lg p-6 w-full max-w-md mx-4">
            <h3
              className="text-lg font-semibold mb-4"
              style={{ color: "var(--color-foreground)" }}
            >
              حظر العميل على صفحة الفيس بوك
            </h3>
            <p
              className="text-sm mb-4"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              سيتم حظر هذا العميل على صفحة الفيس بوك المحددة ولن يتم استقبال
              رسائله.
            </p>

            <div className="mb-4">
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--color-foreground)" }}
              >
                سبب الحظر (اختياري)
              </label>
              <textarea
                value={blockReason}
                onChange={(e) => onBlockReasonChange?.(e.target.value)}
                className="business-chat-input"
                rows={3}
                placeholder="أدخل سبب الحظر..."
              />
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={onBlockCancel}
                className="business-chip-button px-4 py-2 rounded-lg"
              >
                إلغاء
              </button>
              <button
                onClick={onBlockConfirm}
                disabled={blocking}
                className="business-chip-button px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: "var(--business-danger)",
                  borderColor: "transparent",
                  color: "white",
                }}
              >
                {blocking ? "جاري الحظر..." : "تأكيد الحظر"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🆕 Order Preview Modal */}
      {previewOrder && (
        <EnhancedOrderModal
          order={previewOrder}
          isOpen={Boolean(previewOrder)}
          onClose={() => setPreviewOrder(null)}
        />
      )}
    </div>
  );
};

export default CustomerProfile;
