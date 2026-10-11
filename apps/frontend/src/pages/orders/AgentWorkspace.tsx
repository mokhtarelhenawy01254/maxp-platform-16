import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAgentWorkspace } from './workspace/useAgentWorkspace';
import { WorkspaceTopBar } from './workspace/WorkspaceTopBar';
import { SupervisorDispatchStrip } from './workspace/SupervisorDispatchStrip';
import { WorkspaceOrderQueue } from './workspace/WorkspaceOrderQueue';
import { WorkspaceInspector } from './workspace/WorkspaceInspector';
import { WorkspaceIntelligenceRail } from './workspace/WorkspaceIntelligenceRail';
import { WorkspaceCancelModal } from './workspace/WorkspaceCancelModal';
import { WorkspaceFollowUpModal } from './workspace/WorkspaceFollowUpModal';
import { WorkspaceOrder } from './workspace/types';
import { WorkspaceReportsTab } from './workspace/WorkspaceReportsTab';

export type WorkspaceView = 'queue' | 'inspector' | 'intelligence';

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
  } = useAgentWorkspace();

  const { i18n } = useTranslation();
  const isArabic = i18n.language.toLowerCase().startsWith('ar');

  const [activeModalOrder, setActiveModalOrder] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Active view on mobile/narrow screens: default to 'inspector' if order deep-link exists
  const [activeView, setActiveView] = useState<WorkspaceView>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('order')) return 'inspector';
    }
    return 'queue';
  });

  // Track if intelligence rail is open on desktop/tablet (defaults to true)
  const [isRailOpen, setIsRailOpen] = useState<boolean>(() => {
    try {
      const saved = window.localStorage.getItem('workspace-rail-open');
      if (saved !== null) return saved === 'true';
    } catch {
      // storage unavailable (private mode / non-browser env) → keep default
    }
    return true;
  });

  const handleToggleRail = () => {
    setIsRailOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('workspace-rail-open', String(next));
      } catch {}
      return next;
    });
  };

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setActiveView('inspector');
  };

  // Synchronize active view when order is deep-linked via URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('order') && activeView === 'queue') {
        setActiveView('inspector');
      }
    }
  }, [selectedOrderId]);

  const handleOpenDetailsModal = (order: WorkspaceOrder) => {
    setActiveModalOrder(order);
    setIsModalOpen(true);
  };

  const handleOrderUpdate = (_updated: any) => {
    void fetchOrders({ silent: true });
  };

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

      {/* 2.5 Mobile / Narrow View Switcher (< md) */}
      {activeTab !== 'reports' && (
        <div className="flex items-center justify-between border-b border-border/30 bg-muted/15 px-3 py-1.5 md:hidden shrink-0">
          <div className="flex items-center gap-1 rounded-lg bg-background/80 p-0.5 border border-border/40 text-xs font-semibold">
            <button
              type="button"
              data-testid="workspace-view-queue"
              onClick={() => setActiveView('queue')}
              className={`rounded-md px-2.5 py-1 transition-all ${
                activeView === 'queue'
                  ? 'bg-primary text-primary-foreground shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {isArabic ? 'الطابور' : 'Queue'} ({pagination.total || orders.length})
            </button>
            <button
              type="button"
              data-testid="workspace-view-inspector"
              onClick={() => setActiveView('inspector')}
              className={`rounded-md px-2.5 py-1 transition-all ${
                activeView === 'inspector'
                  ? 'bg-primary text-primary-foreground shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {isArabic ? 'التفاصيل' : 'Inspector'} {selectedOrder ? `(#${selectedOrder.orderNumber})` : ''}
            </button>
            <button
              type="button"
              data-testid="workspace-view-intelligence"
              onClick={() => setActiveView('intelligence')}
              className={`rounded-md px-2.5 py-1 transition-all ${
                activeView === 'intelligence'
                  ? 'bg-primary text-primary-foreground shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {isArabic ? 'سجل العميل' : 'Intelligence'}
            </button>
          </div>
        </div>
      )}

      {/* 3. Main Operational Cockpit Chassis */}
      <main className="flex min-h-0 flex-1 overflow-hidden">
        {activeTab === 'reports' ? (
          <WorkspaceReportsTab isManager={isManager} />
        ) : (
          <>
            {/* Stream Pane (Queue) */}
            <div
              className={`h-full border-e border-border/40 overflow-hidden shrink-0 flex-1 md:flex-none md:w-[250px] lg:w-[280px] xl:w-[320px] ${
                activeView === 'queue' ? 'block' : 'hidden md:block'
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

            {/* Center Execution Stage (Inspector) */}
            <div
              className={`h-full min-w-0 flex-1 overflow-hidden ${
                activeView === 'inspector' ? 'block' : 'hidden md:block'
              }`}
            >
              {/* Mobile navigation strip */}
              <div className="flex items-center justify-between border-b border-border/40 bg-card p-2 md:hidden">
                <button
                  type="button"
                  onClick={() => setActiveView('queue')}
                  className="flex items-center gap-1.5 text-xs font-bold text-primary"
                >
                  <span>←</span>
                  <span>{t('orders.workspaceSection')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('intelligence')}
                  className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground"
                >
                  <span>{isArabic ? 'سجل العميل والرادار' : 'Customer Dossier'}</span>
                  <span>→</span>
                </button>
              </div>

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
                isRailOpen={isRailOpen}
                onToggleRail={handleToggleRail}
                onOpenIntelligence={() => setActiveView('intelligence')}
              />
            </div>

            {/* Right Intelligence Rail */}
            <div
              className={`h-full shrink-0 overflow-hidden border-s border-border/40 transition-all duration-150 ${
                activeView === 'intelligence'
                  ? 'block w-full'
                  : isRailOpen
                  ? 'hidden md:block md:w-[250px] lg:w-[270px] xl:w-[300px]'
                  : 'hidden'
              }`}
            >
              <WorkspaceIntelligenceRail
                order={selectedOrder}
                perspective={perspective}
                stats={stats}
                onClose={() => setActiveView('inspector')}
              />
            </div>
          </>
        )}
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
