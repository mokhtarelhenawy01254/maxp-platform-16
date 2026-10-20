import React from "react";
import { useAgentWorkspace } from "./workspace/useAgentWorkspace";
import { WorkspaceTopBar } from "./workspace/WorkspaceTopBar";
import { SupervisorDispatchStrip } from "./workspace/SupervisorDispatchStrip";
import { type WorkspaceView } from "./workspace/WorkspaceMobileViewSwitcher";
import { WorkspaceActiveModals } from "./workspace/WorkspaceActiveModals";
import { WorkspaceCockpitBody } from "./workspace/WorkspaceCockpitBody";
import { useWorkspaceUiState } from "./workspace/hooks/useWorkspaceUiState";

export type { WorkspaceView };

export const AgentWorkspace: React.FC = () => {
  const {
    isManager,
    orders,
    selectedOrderId,
    selectedOrder,
    setSelectedOrderId,
    loading,
    refreshing,
    loadingMore,
    fetchError,
    activeTab,
    selectTab,
    perspective,
    searchQuery,
    handleSearchChange,
    sortOption,
    setSortOption,
    lastFetchedAt,
    stats,
    pagination,
    page,
    busyOrders,
    cancellingOrder,
    setCancellingOrder,
    cancelReasonText,
    setCancelReasonText,
    confirmCancelOrder,
    followUpOrder,
    setFollowUpOrder,
    followUpDateValue,
    setFollowUpDateValue,
    handleSaveFollowUp,
    handleQuickAction,
    handleLogCall,
    fetchOrders,
    // Supervisor capabilities
    teamWorkload,
    loadingWorkload,
    isDistributing,
    selectedAgentId,
    handleSelectAgent,
    handleAutoDistribute,
    handleAssignOrder,
    handleConvertIncomplete,
    handleUpdateOrderItems,
    handleUpdateCustomer,
    handleUpdateRating,
    confirmationDisabled,
  } = useAgentWorkspace();

  const {
    activeModalOrder,
    isModalOpen,
    setIsModalOpen,
    activeView,
    setActiveView,
    isRailOpen,
    handleToggleRail,
    handleSelectOrder,
    handleOpenDetailsModal,
    handleOrderUpdate,
  } = useWorkspaceUiState({
    selectedOrderId,
    setSelectedOrderId,
    fetchOrders,
  });

  return (
    <div className="workspace-cockpit flex h-full w-full flex-col overflow-hidden bg-background text-foreground">
      {/* 1. Cockpit Top Bar */}
      <WorkspaceTopBar
        activeTab={activeTab}
        onSelectTab={selectTab}
        stats={stats}
        totalOrdersCount={pagination.total}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        refreshing={refreshing}
        onRefresh={() => void fetchOrders({ silent: true })}
        sortOption={sortOption}
        onSortChange={(nextSort) => {
          setSortOption(nextSort);
          void fetchOrders({ silent: true, sort: nextSort });
        }}
        lastFetchedAt={lastFetchedAt}
        isManager={isManager}
      />

      {/* 2. Supervisor Fleet Command Strip (Only rendered for Managers/Team Leads) */}
      {isManager && (
        <SupervisorDispatchStrip
          unassignedCount={teamWorkload.unassignedCount}
          agents={teamWorkload.agents}
          selectedAgentId={selectedAgentId}
          onSelectAgent={handleSelectAgent}
          onAutoDistribute={handleAutoDistribute}
          isDistributing={isDistributing}
          loadingWorkload={loadingWorkload}
        />
      )}

      {/* 3. Main Operational Cockpit Chassis */}
      <WorkspaceCockpitBody
        activeTab={activeTab}
        isManager={isManager}
        activeView={activeView}
        setActiveView={setActiveView}
        orders={orders}
        selectedOrderId={selectedOrderId}
        selectedOrder={selectedOrder}
        onSelectOrder={handleSelectOrder}
        loading={loading}
        loadingMore={loadingMore}
        fetchOrders={fetchOrders}
        pagination={pagination}
        page={page}
        fetchError={fetchError}
        confirmationDisabled={confirmationDisabled}
        busyOrders={busyOrders}
        handleQuickAction={handleQuickAction}
        setCancellingOrder={setCancellingOrder}
        handleLogCall={handleLogCall}
        setFollowUpDateValue={setFollowUpDateValue}
        setFollowUpOrder={setFollowUpOrder}
        handleOpenDetailsModal={handleOpenDetailsModal}
        teamWorkload={teamWorkload}
        handleAssignOrder={handleAssignOrder}
        handleConvertIncomplete={handleConvertIncomplete}
        handleUpdateOrderItems={handleUpdateOrderItems}
        handleUpdateCustomer={handleUpdateCustomer}
        isRailOpen={isRailOpen}
        handleToggleRail={handleToggleRail}
        perspective={perspective}
        stats={stats}
        handleUpdateRating={handleUpdateRating}
      />

      {/* 4. Accessible Modals */}
      <WorkspaceActiveModals
        cancellingOrder={cancellingOrder}
        cancelReasonText={cancelReasonText}
        onCancelReasonTextChange={setCancelReasonText}
        onConfirmCancel={() => void confirmCancelOrder()}
        onCloseCancel={() => setCancellingOrder(null)}
        isCancelSubmitting={Boolean(
          cancellingOrder && busyOrders[cancellingOrder.id] === "cancel"
        )}
        followUpOrder={followUpOrder}
        followUpDateValue={followUpDateValue}
        onFollowUpDateChange={setFollowUpDateValue}
        onSaveFollowUp={() => void handleSaveFollowUp()}
        onCloseFollowUp={() => setFollowUpOrder(null)}
        isFollowUpSubmitting={Boolean(
          followUpOrder && busyOrders[followUpOrder.id] === "follow-up"
        )}
        activeModalOrder={activeModalOrder}
        isModalOpen={isModalOpen}
        onCloseModal={() => setIsModalOpen(false)}
        onOrderUpdate={handleOrderUpdate}
      />
    </div>
  );
};

export default AgentWorkspace;
