import React from "react";
import { ProductOpportunityRadar } from "../../../advertising/marketing-studio/ProductOpportunityRadar";
import { AgentStudioSessionsDrawer } from "../../../../components/agent-studio";
import type { StudioEntity, StudioSession } from "../../../../components/agent-studio/types";

interface InventoryStudioDrawersProps {
  isProductPickerOpen: boolean;
  onCloseProductPicker: () => void;
  selectedProduct: StudioEntity | null;
  onSelectProduct: (product: StudioEntity) => void;
  isSessionsDrawerOpen: boolean;
  onCloseSessionsDrawer: () => void;
  sessions: StudioSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
}

export const InventoryStudioDrawers: React.FC<InventoryStudioDrawersProps> = ({
  isProductPickerOpen,
  onCloseProductPicker,
  selectedProduct,
  onSelectProduct,
  isSessionsDrawerOpen,
  onCloseSessionsDrawer,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
}) => {
  return (
    <>
      <ProductOpportunityRadar
        isOpen={isProductPickerOpen}
        onClose={onCloseProductPicker}
        selectedProduct={selectedProduct as any}
        onSelectProduct={(p: any) => onSelectProduct(p)}
      />

      <AgentStudioSessionsDrawer
        isOpen={isSessionsDrawerOpen}
        onClose={onCloseSessionsDrawer}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={onSelectSession}
        onNewSession={onNewSession}
        onDeleteSession={onDeleteSession}
        title="جلسات استوديو المخزون"
      />
    </>
  );
};
