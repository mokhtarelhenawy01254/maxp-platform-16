import React from "react";
import type { ShipmentRowItem } from "./ShipmentStatementTable";
import { TicketModalHeader } from "./tickets/TicketModalHeader";
import { TicketModalTabs } from "./tickets/TicketModalTabs";
import { TicketNewTab } from "./tickets/TicketNewTab";
import { TicketListTab } from "./tickets/TicketListTab";
import { TicketDetailTab } from "./tickets/TicketDetailTab";
import { useCreateTicketModal } from "./tickets/useCreateTicketModal";

export interface CreateTicketModalProps {
  isOpen?: boolean;
  onClose: () => void;
  shipment?: ShipmentRowItem | null;
  shipmentCode?: string;
  orderNumber?: string;
  customerName?: string;
  onSuccess?: (createdTicketId?: unknown) => void;
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
  const effectiveCustomerName =
    shipment?.order?.customer?.name ||
    shipment?.order?.customerName ||
    customerName ||
    "";

  const {
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
  } = useCreateTicketModal({
    isModalOpen,
    shipment,
    shipmentCode,
    orderNumber,
    onSuccess,
  });

  if (!isModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="w-full max-w-xl bg-card rounded-3xl border border-border/70 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <TicketModalHeader
          effectiveOrderNumber={effectiveOrderNumber}
          onClose={onClose}
        />

        {/* Tab Navigation */}
        <TicketModalTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          existingTicketsCount={existingTickets.length}
        />

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* TAB 1: New Ticket Form */}
          {activeTab === "new" && (
            <TicketNewTab
              code={code}
              setCode={setCode}
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              setSelectedCategoryId={setSelectedCategoryId}
              loadingCategories={loadingCategories}
              priority={priority}
              setPriority={setPriority}
              content={content}
              setContent={setContent}
              imageFile={imageFile}
              setImageFile={setImageFile}
              submitting={submitting}
              onSubmit={handleSubmitNew}
              onClose={onClose}
            />
          )}

          {/* TAB 2: Existing Tickets List */}
          {activeTab === "list" && (
            <TicketListTab
              loadingTickets={loadingTickets}
              existingTickets={existingTickets}
              onOpenNewTab={() => setActiveTab("new")}
              onOpenDetail={handleOpenDetail}
            />
          )}

          {/* TAB 3: Active Ticket Detail & Chat Thread */}
          {activeTab === "detail" && ticketDetail && (
            <TicketDetailTab
              ticketDetail={ticketDetail}
              loadingDetail={loadingDetail}
              onRefreshDetail={() => loadTicketDetail(ticketDetail.id)}
              replyContent={replyContent}
              setReplyContent={setReplyContent}
              replyImage={replyImage}
              setReplyImage={setReplyImage}
              sendingReply={sendingReply}
              onSendReply={handleSendReply}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-border/70 flex items-center justify-between bg-card/60 shrink-0">
          <div className="text-xs text-muted-foreground">
            {effectiveCustomerName ? `العميل: ${effectiveCustomerName}` : ""}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-foreground hover:bg-muted active:scale-95 transition cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateTicketModal;
