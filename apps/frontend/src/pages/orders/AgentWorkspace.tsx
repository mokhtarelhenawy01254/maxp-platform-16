import React, { useState } from 'react';
import { useAgentWorkspace } from './workspace/useAgentWorkspace';
import { WorkspaceTopBar } from './workspace/WorkspaceTopBar';
import { SupervisorDispatchStrip } from './workspace/SupervisorDispatchStrip';
import { WorkspaceOrderQueue } from './workspace/WorkspaceOrderQueue';
import { WorkspaceInspector } from './workspace/WorkspaceInspector';
import { WorkspaceIntelligenceRail } from './workspace/WorkspaceIntelligenceRail';
import { WorkspaceCancelModal } from './workspace/WorkspaceCancelModal';
import { WorkspaceFollowUpModal } from './workspace/WorkspaceFollowUpModal';
import { WorkspaceOrder } from './workspace/types';

const EnhancedOrderModal = React.lazy(
  () => import('../../components/orders/EnhancedOrderModal'),
);

export const AgentWorkspace: React.FC = () => {
  const {
    t,
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
    setPerspective,
    searchQuery,
    handleSearchChange,
    sortOption,
    setSortOption,
    autoAdvance,
    setAutoAdvance,
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
  } = useAgentWorkspace();

  const [activeModalOrder, setActiveModalOrder] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mobileView, setMobileView] = useState<'queue' | 'inspector'>('queue');

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setMobileView('inspector');
  };

  const handleOpenDetailsModal = (order: WorkspaceOrder) => {
    setActiveModalOrder(order);
    setIsModalOpen(true);
  };

  const handleOrderUpdate = (_updated: any) => {
    void fetchOrders({ silent: true });
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background text-foreground">
      {/* 1. Cockpit Top Bar */}
      <WorkspaceTopBar
        activeTab={activeTab}
        onSelectTab={selectTab}
        stats={stats}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        perspective={perspective}
        onPerspectiveChange={setPerspective}
        refreshing={refreshing}
        onRefresh={() => void fetchOrders({ silent: true })}
        autoAdvance={autoAdvance}
        onToggleAutoAdvance={() => setAutoAdvance(!autoAdvance)}
        sortOption={sortOption}
        onSortChange={(nextSort) => {
          setSortOption(nextSort);
          void fetchOrders({ silent: true, sort: nextSort });
        }}
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
      <main className="flex min-h-0 flex-1 overflow-hidden">
        {/* Stream Pane (Queue) */}
        <div
          className={`h-full w-full border-e border-border/40 overflow-hidden md:w-[300px] lg:w-[340px] xl:w-[380px] shrink-0 ${
            mobileView === 'inspector' ? 'hidden md:block' : 'block'
          }`}
        >
          <WorkspaceOrderQueue
            orders={orders}
            selectedOrderId={selectedOrderId}
            onSelectOrder={handleSelectOrder}
            loading={loading}
            loadingMore={loadingMore}
            onLoadMore={() => void fetchOrders({ silent: true, page: page + 1, append: true })}
            pagination={pagination}
            page={page}
            fetchError={fetchError}
            onRetry={() => void fetchOrders()}
            activeTab={activeTab}
          />
        </div>

        {/* Center Execution Stage */}
        <div
          className={`h-full min-w-0 flex-1 overflow-hidden ${
            mobileView === 'queue' ? 'hidden md:block' : 'block'
          }`}
        >
          {/* Mobile back to queue button */}
          {mobileView === 'inspector' && (
            <div className="border-b border-border/40 bg-card p-2 md:hidden">
              <button
                type="button"
                onClick={() => setMobileView('queue')}
                className="flex items-center gap-1.5 text-xs font-bold text-primary"
              >
                <span>←</span>
                <span>{t('orders.workspaceSection')}</span>
              </button>
            </div>
          )}
          <WorkspaceInspector
            order={selectedOrder}
            busyAction={selectedOrder ? busyOrders[selectedOrder.id] : undefined}
            onConfirm={(o) => void handleQuickAction(o, 'confirm')}
            onCancel={(o) => setCancellingOrder(o)}
            onLogCall={(o, result) => void handleLogCall(o, result)}
            onOpenFollowUp={(o) => {
              setFollowUpDateValue(o.followUpDate ? o.followUpDate.slice(0, 10) : '');
              setFollowUpOrder(o);
            }}
            onOpenDetailsModal={handleOpenDetailsModal}
            isManager={isManager}
            agents={teamWorkload.agents}
            onAssignOrder={handleAssignOrder}
            onConvertIncomplete={handleConvertIncomplete}
            onSaveItems={handleUpdateOrderItems}
            onSaveCustomer={handleUpdateCustomer}
            onRefreshOrder={() => void fetchOrders({ silent: true })}
          />
        </div>

        {/* Right Intelligence Rail */}
        <div className="hidden h-full w-[260px] lg:w-[280px] xl:w-[320px] shrink-0 overflow-hidden md:block">
          <WorkspaceIntelligenceRail
            order={selectedOrder}
            perspective={perspective}
            stats={stats}
          />
        </div>
      </main>

      {/* 4. Accessible Modals */}
      <WorkspaceCancelModal
        order={cancellingOrder}
        reasonText={cancelReasonText}
        onReasonTextChange={setCancelReasonText}
        onConfirm={() => void confirmCancelOrder()}
        onClose={() => setCancellingOrder(null)}
        isSubmitting={Boolean(cancellingOrder && busyOrders[cancellingOrder.id] === 'cancel')}
      />

      <WorkspaceFollowUpModal
        order={followUpOrder}
        dateValue={followUpDateValue}
        onDateChange={setFollowUpDateValue}
        onSave={() => void handleSaveFollowUp()}
        onClose={() => setFollowUpOrder(null)}
        isSubmitting={Boolean(followUpOrder && busyOrders[followUpOrder.id] === 'follow-up')}
      />

      {activeModalOrder && (
        <React.Suspense
          fallback={
            <div className="flex items-center justify-center p-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
            </div>
          }
        >
          <EnhancedOrderModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            order={activeModalOrder}
            onOrderUpdate={handleOrderUpdate}
          />
        </React.Suspense>
      )}
    </div>
  );
};

export default AgentWorkspace;
