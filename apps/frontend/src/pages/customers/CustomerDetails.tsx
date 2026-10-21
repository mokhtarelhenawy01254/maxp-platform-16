import React from "react";
import { Link } from "react-router-dom";
import LoadingSpinner from "../../components/LoadingSpinner";
import CustomerLoyaltyTab from "./CustomerLoyaltyTab";
import CustomerJourneyTab from "./CustomerJourneyTab";
import { useCustomerDetailsController } from "./components/customer-details/useCustomerDetailsController";
import { CustomerDetailsHeader } from "./components/customer-details/CustomerDetailsHeader";
import { CustomerDetailsStats } from "./components/customer-details/CustomerDetailsStats";
import { CustomerDetailsTabsNav } from "./components/customer-details/CustomerDetailsTabsNav";
import { CustomerInfoTab } from "./components/customer-details/CustomerInfoTab";
import { CustomerOrdersTab } from "./components/customer-details/CustomerOrdersTab";
import { CustomerConversationsTab } from "./components/customer-details/CustomerConversationsTab";
import { CustomerNotesTab } from "./components/customer-details/CustomerNotesTab";
import { CustomerActivityTab } from "./components/customer-details/CustomerActivityTab";
import { CustomerBlockModal } from "./components/customer-details/CustomerBlockModal";
import { CustomerDeleteModal } from "./components/customer-details/CustomerDeleteModal";

const CustomerDetails: React.FC = () => {
  const ctrl = useCustomerDetailsController();

  if (ctrl.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (ctrl.error || !ctrl.data || !ctrl.data.customer) {
    return (
      <div className="text-center py-12">
        <p className="text-rose-500 text-sm font-medium">
          {ctrl.error || ctrl.t("customers.notFound")}
        </p>
        <Link
          to="/customers"
          className="text-zinc-900 dark:text-zinc-100 hover:underline mt-4 inline-block text-xs font-semibold"
        >
          {ctrl.t("common.backToList")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <CustomerDetailsHeader
        customer={ctrl.customer}
        stats={ctrl.stats}
        isAdmin={ctrl.isAdmin}
        isCustomerBlocked={ctrl.isCustomerBlocked}
        activeBlockRule={ctrl.activeBlockRule}
        isUnblocking={ctrl.isUnblocking}
        onStartWhatsApp={ctrl.handleStartWhatsApp}
        onUnblock={ctrl.handleUnblockCustomer}
        onOpenBlockModal={() => ctrl.setShowBlockModal(true)}
        onExport={ctrl.handleExportCustomer}
        onOpenDeleteModal={() => ctrl.setShowDeleteModal(true)}
        getStatusBadge={ctrl.getStatusBadge}
      />

      {/* Stats Cards */}
      <CustomerDetailsStats
        customer={ctrl.customer}
        stats={ctrl.stats}
        loyaltyPoints={ctrl.loyaltyPoints}
        cashbackAmount={ctrl.cashbackAmount}
        walletBalance={ctrl.walletBalance}
      />

      {/* Tabs Container */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xs border border-zinc-200/80 dark:border-zinc-800 overflow-hidden">
        <CustomerDetailsTabsNav
          activeTab={ctrl.activeTab}
          onTabChange={ctrl.setActiveTab}
        />

        <div className="p-4 sm:p-6">
          {ctrl.activeTab === "info" && (
            <CustomerInfoTab
              customer={ctrl.customer}
              customerTags={ctrl.customerTags}
              newTag={ctrl.newTag}
              onNewTagChange={ctrl.setNewTag}
              onAddTag={ctrl.handleAddTag}
              onRemoveTag={ctrl.handleRemoveTag}
              editingBirthday={ctrl.editingBirthday}
              onEditingBirthdayChange={ctrl.setEditingBirthday}
              tempBirthday={ctrl.tempBirthday}
              onTempBirthdayChange={ctrl.setTempBirthday}
              onSaveBirthday={ctrl.handleSaveBirthday}
            />
          )}

          {ctrl.activeTab === "orders" && (
            <CustomerOrdersTab orders={ctrl.recentOrders} />
          )}

          {ctrl.activeTab === "conversations" && (
            <CustomerConversationsTab conversations={ctrl.recentConversations} />
          )}

          {ctrl.activeTab === "notes" && (
            <CustomerNotesTab
              notes={ctrl.notes}
              newNote={ctrl.newNote}
              onNewNoteChange={ctrl.setNewNote}
              onAddNote={ctrl.handleAddNote}
              isAddingNote={ctrl.isAddingNote}
              deletingNoteId={ctrl.deletingNoteId}
              onDeleteNote={ctrl.handleDeleteNote}
            />
          )}

          {ctrl.activeTab === "activity" && (
            <CustomerActivityTab activities={ctrl.data.activities} />
          )}

          {ctrl.activeTab === "loyalty" && (
            <CustomerLoyaltyTab
              customerId={ctrl.customer.id}
              loyaltyRecords={ctrl.data.loyalty}
              isAdmin={ctrl.isAdmin}
            />
          )}

          {ctrl.activeTab === "journey" && (
            <CustomerJourneyTab customerId={ctrl.customer.id} />
          )}
        </div>
      </div>

      {/* Block Customer Modal */}
      <CustomerBlockModal
        isOpen={ctrl.showBlockModal}
        onClose={() => ctrl.setShowBlockModal(false)}
        form={ctrl.blockForm}
        onFormChange={ctrl.setBlockForm}
        onSubmit={ctrl.handleBlockCustomer}
        isBlocking={ctrl.isBlocking}
      />

      {/* Delete Confirmation Modal */}
      <CustomerDeleteModal
        isOpen={ctrl.showDeleteModal}
        onClose={() => ctrl.setShowDeleteModal(false)}
        customerName={`${ctrl.customer.firstName} ${ctrl.customer.lastName}`}
        onConfirm={ctrl.handleDeleteCustomer}
        isDeleting={ctrl.isDeleting}
      />
    </div>
  );
};

export default CustomerDetails;
