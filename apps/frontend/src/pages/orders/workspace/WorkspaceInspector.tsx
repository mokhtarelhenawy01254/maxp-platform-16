import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../../../hooks/useCurrency';
import { OrderAction, WorkspaceOrder, AgentWorkload, WorkspaceOrderItem } from './types';
import { parseCleanAddress } from './WorkspaceCustomerEditor';
export { parseCleanAddress };
import { WorkspaceCallHistory } from './WorkspaceCallHistory';
import { WorkspaceWhatsAppDrawer } from './WorkspaceWhatsAppDrawer';
import { WorkspaceInspectorEmptyState } from './components/inspector/WorkspaceInspectorEmptyState';
import { WorkspaceInspectorHeader } from './components/inspector/WorkspaceInspectorHeader';
import { WorkspaceInspectorItemsSection } from './components/inspector/WorkspaceInspectorItemsSection';
import { WorkspaceInspectorDispositions } from './components/inspector/WorkspaceInspectorDispositions';
import { WorkspaceInspectorActionBar } from './components/inspector/WorkspaceInspectorActionBar';

export interface WorkspaceInspectorProps {
  order: WorkspaceOrder | null;
  busyAction: OrderAction | undefined;
  onConfirm: (order: WorkspaceOrder) => void;
  onCancel: (order: WorkspaceOrder) => void;
  onLogCall: (order: WorkspaceOrder, result: string) => void;
  onOpenFollowUp: (order: WorkspaceOrder) => void;
  onOpenDetailsModal: (order: WorkspaceOrder) => void;
  onRefreshOrder?: () => void;
  isManager?: boolean;
  agents?: AgentWorkload[];
  onAssignOrder?: (orderId: string, targetUserId: string) => Promise<void>;
  onConvertIncomplete?: (cartId: string) => Promise<void>;
  onSaveItems?: (
    orderId: string,
    items: WorkspaceOrderItem[],
    financials: { shipping: number; discount: number; notes?: string }
  ) => Promise<void>;
  onSaveCustomer?: (
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
  isRailOpen?: boolean;
  onToggleRail?: () => void;
  onOpenIntelligence?: () => void;
  confirmationDisabled?: boolean;
}

export const WorkspaceInspector: React.FC<WorkspaceInspectorProps> = ({
  order,
  busyAction,
  onConfirm,
  onCancel,
  onLogCall,
  onOpenFollowUp,
  onOpenDetailsModal,
  onRefreshOrder,
  isManager = false,
  agents = [],
  onAssignOrder,
  onConvertIncomplete,
  onSaveItems,
  onSaveCustomer,
  isRailOpen,
  onToggleRail,
  confirmationDisabled = false,
}) => {
  const { t, i18n } = useTranslation();
  const { formatPrice } = useCurrency();
  const isArabic = i18n.language.toLowerCase().startsWith('ar');

  const [isEditingItems, setIsEditingItems] = useState(false);
  const [isWhatsAppDrawerOpen, setIsWhatsAppDrawerOpen] = useState(false);

  // Close WhatsApp drawer whenever order switches
  useEffect(() => {
    setIsWhatsAppDrawerOpen(false);
  }, [order?.id]);

  if (!order) {
    return (
      <WorkspaceInspectorEmptyState
        confirmationDisabled={confirmationDisabled}
        isArabic={isArabic}
        t={t}
      />
    );
  }

  const isCancelled = order.status === 'CANCELLED';
  const isReadOnly = isCancelled;
  const isBusy = Boolean(busyAction);

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-card p-4 text-xs space-y-4 dark:bg-slate-900/60 text-foreground dark:text-slate-100">
      {/* 1. Customer & Header Controls */}
      <WorkspaceInspectorHeader
        order={order}
        isReadOnly={isReadOnly}
        onOpenDetailsModal={onOpenDetailsModal}
        onOpenWhatsAppDrawer={() => setIsWhatsAppDrawerOpen(true)}
        onConfirm={onConfirm}
        onCancel={onCancel}
        onLogCall={onLogCall}
        onOpenFollowUp={onOpenFollowUp}
        onRefreshOrder={onRefreshOrder}
        isRailOpen={isRailOpen}
        onToggleRail={onToggleRail}
        isManager={isManager}
        agents={agents}
        onAssignOrder={onAssignOrder}
        onSaveCustomer={onSaveCustomer}
        isArabic={isArabic}
      />

      {/* 2. Order Items Section (Live Editor or Static Display) */}
      <WorkspaceInspectorItemsSection
        order={order}
        isEditingItems={isEditingItems}
        onToggleEditItems={() => setIsEditingItems(!isEditingItems)}
        onSaveItems={onSaveItems}
        busyAction={busyAction}
        formatPrice={formatPrice}
        isArabic={isArabic}
        t={t}
      />

      {/* 3. Instant Call Dispositions */}
      {!isReadOnly && (
        <WorkspaceInspectorDispositions
          order={order}
          isBusy={isBusy}
          onLogCall={onLogCall}
          isArabic={isArabic}
        />
      )}

      {/* 3.5 Dedicated Call History and Timeline */}
      <WorkspaceCallHistory order={order} isArabic={isArabic} />

      {/* 4. Action Command Bar (Sticky Bottom) */}
      <WorkspaceInspectorActionBar
        order={order}
        busyAction={busyAction}
        isReadOnly={isReadOnly}
        onConfirm={onConfirm}
        onCancel={onCancel}
        onOpenFollowUp={onOpenFollowUp}
        onConvertIncomplete={onConvertIncomplete}
        isArabic={isArabic}
        t={t}
      />

      {/* Embedded Platform WhatsApp Drawer */}
      <WorkspaceWhatsAppDrawer
        isOpen={isWhatsAppDrawerOpen}
        onClose={() => setIsWhatsAppDrawerOpen(false)}
        order={order}
      />
    </div>
  );
};

export default WorkspaceInspector;
