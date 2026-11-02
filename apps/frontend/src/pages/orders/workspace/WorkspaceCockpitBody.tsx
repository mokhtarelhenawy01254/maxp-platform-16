import React from "react";
import { useTranslation } from "react-i18next";
import { WorkspaceReportsTab } from "./WorkspaceReportsTab";
import { WorkspaceOrderQueue } from "./WorkspaceOrderQueue";
import { WorkspaceInspector } from "./WorkspaceInspector";
import { WorkspaceIntelligenceRail } from "./WorkspaceIntelligenceRail";
import type { WorkspaceView } from "./WorkspaceMobileViewSwitcher";
import type {
  WorkspaceOrder,
  AgentWorkload,
  PerspectiveMode,
  WorkspaceStats,
  OrderAction,
  WorkspaceOrderItem,
} from "./types";
import type { CustomerRatingLevel } from "../../../components/orders/CustomerRatingBadge";

export interface WorkspaceCockpitBodyProps {
  activeTab: string;
  isManager: boolean;
  activeView: WorkspaceView;
  setActiveView: React.Dispatch<React.SetStateAction<WorkspaceView>>;
  orders: WorkspaceOrder[];
  selectedOrderId: string | null;
  selectedOrder: WorkspaceOrder | null;
  onSelectOrder: (orderId: string) => void;
  loading: boolean;
  loadingMore: boolean;
  fetchOrders: (options?: {
    silent?: boolean;
    page?: number;
    append?: boolean;
    sort?: string;
  }) => Promise<unknown>;
  pagination: { page: number; limit: number; total: number; pages: number };
  page: number;
  fetchError: string | null;
  confirmationDisabled: boolean;
  busyOrders: Record<string, OrderAction>;
  handleQuickAction: (order: WorkspaceOrder, action: string) => Promise<void>;
  setCancellingOrder: (order: WorkspaceOrder | null) => void;
  handleLogCall: (order: WorkspaceOrder, result: string) => Promise<void>;
  setFollowUpDateValue: (val: string) => void;
  setFollowUpOrder: (order: WorkspaceOrder | null) => void;
  handleOpenDetailsModal: (order: WorkspaceOrder) => void;
  teamWorkload: { unassignedCount: number; agents: AgentWorkload[] };
  handleAssignOrder: (orderId: string, agentId: string) => Promise<void>;
  handleConvertIncomplete: (cartId: string) => Promise<void>;
  handleUpdateOrderItems: (
    orderId: string,
    items: WorkspaceOrderItem[],
    financials: { shipping: number; discount: number; notes?: string }
  ) => Promise<void>;
  handleUpdateCustomer: (
    orderId: string,
    customerData: {
      customerName?: string;
      customerPhone?: string;
      secondaryPhone?: string;
      governorate?: string;
      city?: string;
      shippingAddress?: string;
      notes?: string;
    }
  ) => Promise<void>;
  isRailOpen: boolean;
  handleToggleRail: () => void;
  perspective: PerspectiveMode;
  stats: WorkspaceStats | null;
  handleUpdateRating: (
    orderId: string,
    rating: CustomerRatingLevel,
    phone?: string,
    customerId?: string
  ) => Promise<void>;
}

export const WorkspaceCockpitBody: React.FC<WorkspaceCockpitBodyProps> = ({
  activeTab,
  isManager,
  activeView,
  setActiveView,
  orders,
  selectedOrderId,
  selectedOrder,
  onSelectOrder,
  loading,
  loadingMore,
  fetchOrders,
  pagination,
  page,
  fetchError,
  confirmationDisabled,
  busyOrders,
  handleQuickAction,
  setCancellingOrder,
  handleLogCall,
  setFollowUpDateValue,
  setFollowUpOrder,
  handleOpenDetailsModal,
  teamWorkload,
  handleAssignOrder,
  handleConvertIncomplete,
  handleUpdateOrderItems,
  handleUpdateCustomer,
  isRailOpen,
  handleToggleRail,
  perspective,
  stats,
  handleUpdateRating,
}) => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.toLowerCase().startsWith("ar");

  return (
    <main className="flex min-h-0 flex-1 overflow-hidden">
      {activeTab === "reports" ? (
        <WorkspaceReportsTab isManager={isManager} />
      ) : (
        <>
          {/* Stream Pane (Queue) */}
          <div
            className={`h-full border-e border-border/40 overflow-hidden shrink-0 flex-1 md:flex-none md:w-[250px] lg:w-[280px] xl:w-[320px] ${
              activeView === "queue" ? "block" : "hidden md:block"
            }`}
          >
            <WorkspaceOrderQueue
              orders={orders}
              selectedOrderId={selectedOrderId}
              onSelectOrder={onSelectOrder}
              loading={loading}
              loadingMore={loadingMore}
              onLoadMore={() =>
                void fetchOrders({
                  silent: true,
                  page: page + 1,
                  append: true,
                })
              }
              pagination={pagination}
              page={page}
              fetchError={fetchError}
              onRetry={() => void fetchOrders()}
              activeTab={activeTab}
              confirmationDisabled={confirmationDisabled}
            />
          </div>

          {/* Center Execution Stage (Inspector) */}
          <div
            className={`h-full min-w-0 flex-1 overflow-hidden ${
              activeView === "inspector" ? "block" : "hidden md:block"
            }`}
          >
            {/* Mobile navigation strip */}
            <div className="flex items-center justify-between border-b border-border/40 bg-card p-2 md:hidden">
              <button
                type="button"
                onClick={() => setActiveView("queue")}
                className="flex items-center gap-1.5 text-xs font-bold text-primary"
              >
                <span>←</span>
                <span>{t("orders.workspaceSection")}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView("intelligence")}
                className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                <span>
                  {isArabic ? "سجل العميل والرادار" : "Customer Dossier"}
                </span>
                <span>→</span>
              </button>
            </div>

            <WorkspaceInspector
              order={selectedOrder}
              confirmationDisabled={confirmationDisabled}
              busyAction={
                selectedOrder ? busyOrders[selectedOrder.id] : undefined
              }
              onConfirm={(o) => void handleQuickAction(o, "confirm")}
              onCancel={(o) => setCancellingOrder(o)}
              onLogCall={(o, result) => void handleLogCall(o, result)}
              onOpenFollowUp={(o) => {
                setFollowUpDateValue(
                  o.followUpDate ? o.followUpDate.slice(0, 10) : ""
                );
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
              onOpenIntelligence={() => setActiveView("intelligence")}
            />
          </div>

          {/* Right Intelligence Rail */}
          <div
            className={`h-full shrink-0 overflow-hidden border-s border-border/40 transition-all duration-150 ${
              activeView === "intelligence"
                ? "block w-full"
                : isRailOpen
                ? "hidden md:block md:w-[270px] lg:w-[300px] xl:w-[330px]"
                : "hidden"
            }`}
          >
            <WorkspaceIntelligenceRail
              order={selectedOrder}
              perspective={perspective}
              stats={stats}
              onClose={() => setActiveView("inspector")}
              onRatingChange={(newRating) => {
                if (selectedOrder) {
                  void handleUpdateRating(
                    selectedOrder.id,
                    newRating,
                    selectedOrder.customerPhone,
                    selectedOrder.customerId || undefined
                  );
                }
              }}
              onSelectOrder={(orderNumberOrId) => {
                const inQueue = orders.find(
                  (o) =>
                    o.id === orderNumberOrId || o.orderNumber === orderNumberOrId
                );
                if (inQueue) {
                  onSelectOrder(inQueue.id);
                } else {
                  window.open(
                    `/orders/${encodeURIComponent(orderNumberOrId)}`,
                    "_blank"
                  );
                }
              }}
            />
          </div>
        </>
      )}
    </main>
  );
};
