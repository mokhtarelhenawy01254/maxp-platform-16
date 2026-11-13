import React, { useEffect, useState } from "react";
import { User, ShoppingBag, Activity, Sparkles } from "lucide-react";
import { useCustomerProfile } from "../../../hooks/inbox/useCustomerProfile";
import { ConversationStatus } from "../../../types/inbox.types";
import { apiClient } from "../../../services/apiClient";
import EnhancedOrderModal from "../../orders/EnhancedOrderModal";
import {
  CustomerProfileProps,
  Tab,
  ApiErrorLike,
  CustomerProfileHeader,
  CustomerInfoTab,
  CustomerOrdersTab,
  CustomerTimelineTab,
  CustomerVerticalRecordsTab,
  CustomerVerticalActionsTab,
  extractVerticalRecords,
  BlockCustomerModal,
} from "./customer-profile";

const mapOrderItems = (rawItems: unknown) =>
  Array.isArray(rawItems)
    ? rawItems.map((item: any) => ({
        name: item.productName || item.name || "منتج",
        productName: item.productName || item.name || "منتج",
        quantity: Number(item.quantity || 1),
        price: Number(item.price || 0),
        image: item.productImage || item.image || null,
        productColor: item.productColor || item.color || null,
        productSize: item.productSize || item.size || null,
      }))
    : [];

export const CustomerProfile: React.FC<CustomerProfileProps> = ({
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
  soundEnabled = true,
  notificationsEnabled = true,
  onSoundToggle,
  onNotificationsToggle,
  onCreateOrder,
  compactHeader = false,
  verticalCapabilities,
  verticalContext,
  onPrimaryAction,
  onOpenServiceOrder,
  onOpenTasks,
  onInsertSnippet,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>("actions");
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
      setPhoneUpdateMessage("يرجى إدخال رقم الهاتف");
      return;
    }
    setSavingPhone(true);
    setPhoneUpdateMessage(null);
    const result = await updateCustomerPhone(phone);
    setSavingPhone(false);
    if (result.success) {
      setEditingPhone(false);
      setPhoneUpdateMessage(`تم الحفظ: ${result.message}`);
      setTimeout(() => setPhoneUpdateMessage(null), 4000);
      loadCustomerData(customer?.id || conversation?.customerId || "", {
        conversationId: conversation?.id,
        phone,
      });
    } else {
      setPhoneUpdateMessage(`خطأ: ${result.message}`);
      setTimeout(() => setPhoneUpdateMessage(null), 5000);
    }
  };

  useEffect(() => {
    loadCustomerData(conversation?.customerId || "", {
      conversationId: conversation?.id,
      phone: conversation?.customerPhone || customer?.phone || undefined,
    });
  }, [conversation?.customerId, conversation?.id, conversation?.customerPhone, loadCustomerData]);

  useEffect(() => {
    const onOrderEvt = (event: Event) => {
      const detail = (event as CustomEvent<any>).detail;
      if (!detail) return;
      const match =
        (detail.conversationId && detail.conversationId === conversation?.id) ||
        (detail.order?.customerId && detail.order.customerId === conversation?.customerId) ||
        (detail.order?.customerPhone &&
          (detail.order.customerPhone === conversation?.customerPhone ||
            detail.order.customerPhone === customer?.phone));
      if (!match) return;

      if (detail.order) {
        const raw = detail.order;
        prependOrder({
          id: String(raw.id || detail.orderId),
          orderNumber: String(raw.orderNumber || detail.orderNumber || raw.id),
          status: String(raw.status || "CONFIRMED"),
          total: Number(raw.totalAmount || raw.total || 0),
          createdAt: raw.createdAt || new Date().toISOString(),
          conversationId: raw.conversationId || detail.conversationId || conversation?.id,
          items: mapOrderItems(raw.orderItems || raw.products || raw.items),
        });
      }
      loadCustomerData(conversation?.customerId || "", {
        conversationId: conversation?.id,
        phone: conversation?.customerPhone || customer?.phone || undefined,
      });
    };

    window.addEventListener("inbox:order-created", onOrderEvt);
    return () => window.removeEventListener("inbox:order-created", onOrderEvt);
  }, [conversation?.id, conversation?.customerId, conversation?.customerPhone, customer?.phone, loadCustomerData, prependOrder]);

  const handleSyncMessages = async () => {
    if (!conversation?.id || conversation.platform !== "facebook") return;
    setSyncingMessages(true);
    setSyncMessage(null);
    try {
      const response = await apiClient.post<{ success?: boolean; message?: string }>(
        `/conversations/${conversation.id}/sync-messages`,
        {},
        { timeout: 90000 },
      );
      if (response.data?.success) {
        setSyncMessage(`تم: ${response.data.message || "تم جلب الرسائل بنجاح"}`);
        if (conversation.customerId) loadCustomerData(conversation.customerId);
      } else {
        setSyncMessage(`خطأ: ${response.data?.message || "فشل في جلب الرسائل"}`);
      }
    } catch (error: unknown) {
      const apiError = error as ApiErrorLike;
      const msg = apiError.response?.data?.message || apiError.response?.data?.error || apiError.message || "حدث خطأ أثناء جلب الرسائل";
      const info = apiError.response?.data?.info ? ` (${apiError.response.data.info})` : "";
      setSyncMessage(`خطأ: ${msg}${info}`);
    } finally {
      setSyncingMessages(false);
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  const ltv = calculateLTV();
  const effectiveStatus: ConversationStatus =
    currentStatus === "open" || currentStatus === "pending" || currentStatus === "resolved" || currentStatus === "done"
      ? currentStatus
      : conversation.status;

  const isNonCommerceVertical = Boolean(
    verticalCapabilities && verticalCapabilities.vertical !== "commerce" && verticalCapabilities.vertical !== "cafe",
  );
  const verticalRecords = extractVerticalRecords(verticalContext);
  const recordsTabLabel = verticalCapabilities?.recordsTabLabel || "طلبات";
  const recordsCount = isNonCommerceVertical ? verticalRecords.length || orders.length : orders.length;

  return (
    <div className={["business-inbox-column business-inbox-column--profile h-full bg-card/80", className].filter(Boolean).join(" ")}>
      <CustomerProfileHeader
        conversation={conversation}
        compactHeader={compactHeader}
        ordersCount={orders.length}
        ltv={ltv}
        effectiveStatus={effectiveStatus}
        currentAssignee={currentAssignee}
        currentAssigneeName={currentAssigneeName}
        onStatusChange={onStatusChange}
        onAssign={onAssign}
        disabled={disabled}
        soundEnabled={soundEnabled}
        notificationsEnabled={notificationsEnabled}
        onSoundToggle={onSoundToggle}
        onNotificationsToggle={onNotificationsToggle}
        onCreateOrder={onCreateOrder}
        checkingBlockStatus={checkingBlockStatus}
        isBlocked={isBlocked}
        blocking={blocking}
        onBlockClick={onBlockClick}
        onUnblockClick={onUnblockClick}
        verticalCapabilities={verticalCapabilities}
        verticalContext={verticalContext}
        onPrimaryAction={onPrimaryAction}
        onOpenServiceOrder={onOpenServiceOrder}
        onOpenTasks={onOpenTasks}
      />

      <div className="business-inbox-tabs mx-2 my-1">
        <button type="button" onClick={() => setActiveTab("actions")} className="business-inbox-tab" data-active={activeTab === "actions" ? "true" : "false"}>
          <span className="flex items-center justify-center gap-1"><Sparkles size={13} className="text-primary" /> أدوات النشاط</span>
        </button>
        <button type="button" onClick={() => setActiveTab("orders")} className="business-inbox-tab" data-active={activeTab === "orders" ? "true" : "false"}>
          <span className="flex items-center justify-center gap-1">
            <ShoppingBag size={13} /> {recordsTabLabel}
            {recordsCount > 0 && <span className="business-inbox-tab-count tabular-nums">{recordsCount}</span>}
          </span>
        </button>
        <button type="button" onClick={() => setActiveTab("info")} className="business-inbox-tab" data-active={activeTab === "info" ? "true" : "false"}>
          <span className="flex items-center justify-center gap-1"><User size={13} /> معلومات</span>
        </button>
        <button type="button" onClick={() => setActiveTab("timeline")} className="business-inbox-tab" data-active={activeTab === "timeline" ? "true" : "false"}>
          <span className="flex items-center justify-center gap-1"><Activity size={13} /> سجل</span>
        </button>
      </div>

      <div className="business-chat-stage flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex justify-center p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            {activeTab === "actions" && (
              <CustomerVerticalActionsTab
                conversation={conversation}
                verticalCapabilities={verticalCapabilities}
                onPrimaryAction={onPrimaryAction}
                onCreateOrder={onCreateOrder}
                onOpenServiceOrder={onOpenServiceOrder}
                onOpenTasks={onOpenTasks}
                onInsertSnippet={onInsertSnippet}
                syncMessage={syncMessage}
                syncingMessages={syncingMessages}
                onSyncMessages={handleSyncMessages}
              />
            )}
            {activeTab === "info" && (
              <CustomerInfoTab
                customer={customer}
                conversation={conversation}
                editingPhone={editingPhone}
                phoneDraft={phoneDraft}
                setPhoneDraft={setPhoneDraft}
                savingPhone={savingPhone}
                phoneUpdateMessage={phoneUpdateMessage}
                handleStartEditPhone={handleStartEditPhone}
                handleSavePhone={handleSavePhone}
                setEditingPhone={setEditingPhone}
                setPhoneUpdateMessage={setPhoneUpdateMessage}
                onTagsChange={onTagsChange}
                updatingTags={updatingTags}
              />
            )}
            {activeTab === "orders" && (
              <div className="space-y-4">
                {(isNonCommerceVertical || verticalRecords.length > 0) && (
                  <CustomerVerticalRecordsTab
                    verticalContext={verticalContext}
                    verticalCapabilities={verticalCapabilities}
                    onPrimaryAction={onPrimaryAction}
                  />
                )}
                {(!isNonCommerceVertical || orders.length > 0) && (
                  <CustomerOrdersTab
                    orders={orders}
                    customer={customer}
                    conversation={conversation}
                    editingPhone={editingPhone}
                    phoneDraft={phoneDraft}
                    setPhoneDraft={setPhoneDraft}
                    savingPhone={savingPhone}
                    phoneUpdateMessage={phoneUpdateMessage}
                    handleStartEditPhone={handleStartEditPhone}
                    handleSavePhone={handleSavePhone}
                    setEditingPhone={setEditingPhone}
                    setPhoneUpdateMessage={setPhoneUpdateMessage}
                    searchOrderPhone={searchOrderPhone}
                    setSearchOrderPhone={setSearchOrderPhone}
                    loadCustomerData={loadCustomerData}
                    setPreviewOrder={setPreviewOrder}
                  />
                )}
              </div>
            )}
            {activeTab === "timeline" && (
              <CustomerTimelineTab
                conversation={conversation}
                activities={activities}
                syncMessage={syncMessage}
                syncingMessages={syncingMessages}
                onSyncMessages={handleSyncMessages}
              />
            )}
          </>
        )}
      </div>

      {showBlockModal && onBlockConfirm && onBlockCancel && (
        <BlockCustomerModal
          isOpen={showBlockModal}
          blockReason={blockReason}
          blocking={blocking}
          onBlockReasonChange={onBlockReasonChange || (() => {})}
          onBlockConfirm={onBlockConfirm}
          onBlockCancel={onBlockCancel}
        />
      )}

      {previewOrder && (
        <EnhancedOrderModal order={previewOrder} isOpen={Boolean(previewOrder)} onClose={() => setPreviewOrder(null)} />
      )}
    </div>
  );
};

export default CustomerProfile;
