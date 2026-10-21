import React from "react";
import { Boxes } from "lucide-react";
import { AgentStudioLayout, AgentStudioChatFeed } from "../../../components/agent-studio";
import { InventoryActionCanvas } from "./InventoryActionCanvas";
import { InventoryStudioDrawers } from "./components/InventoryStudioDrawers";
import { useInventoryStudioController } from "./useInventoryStudioController";
import { INVENTORY_QUICK_PROMPTS } from "./constants";

export const InventoryAiStudioPage: React.FC = () => {
  const {
    sessions,
    selectedProduct,
    setSelectedProduct,
    activeDraft,
    setActiveDraft,
    activeAgent,
    loading,
    isProductPickerOpen,
    setIsProductPickerOpen,
    isSessionsDrawerOpen,
    setIsSessionsDrawerOpen,
    mobileView,
    setMobileView,
    handleSendMessage,
    statusBadge,
  } = useInventoryStudioController();

  return (
    <AgentStudioLayout
      studioId="inventory"
      title="مركز المنتجات والمخزون الذكي"
      icon={Boxes}
      connectionBadgeText="متصل بالمخزن"
      selectedEntity={selectedProduct}
      entitySelectorPlaceholder="اختر منتجاً للفحص"
      onOpenEntityPicker={() => setIsProductPickerOpen(true)}
      sessionsCount={sessions.sessions.length}
      onOpenSessions={() => setIsSessionsDrawerOpen(true)}
      onNewSession={() => sessions.createNewSession()}
      activeAgent={activeAgent}
      agentRoutingHref="/admin/ai-hub?tab=routing"
      statusBadge={statusBadge}
      chatTabLabel="محادثة المخزون والتسعير"
      canvasTabLabel="لوحة العمليات"
      canvasTabIcon={Boxes}
      hasActiveDraft={!!activeDraft}
      mobileView={mobileView}
      onMobileViewChange={setMobileView}
      chatPanel={
        <AgentStudioChatFeed
          selectedEntity={selectedProduct}
          activeSession={sessions.activeSession}
          loading={loading}
          onSendMessage={handleSendMessage}
          quickPrompts={INVENTORY_QUICK_PROMPTS}
          emptyStateTitle="وكيل إدارة المنتجات والمخزون والتسعير"
          emptyStateSubtitle="اطرح أي سؤال حول الكميات، تكاليف المنتجات، هوامش الربح، أو اطلب تسوية جرد وتعديل أسعار."
          emptyStateIcon={Boxes}
          inputPlaceholder="اسأل وكيل المخزون والتسعير (مثلاً: افحص المنتجات التي قربت تخلص)..."
          onNewSession={() => sessions.createNewSession()}
        />
      }
      canvasPanel={
        <InventoryActionCanvas
          selectedProduct={selectedProduct}
          activeDraft={activeDraft}
          onDraftResolved={() => setActiveDraft(null)}
          onRequestAction={(actionPrompt) => handleSendMessage(actionPrompt)}
          onProductUpdated={(updated) =>
            setSelectedProduct((prev) => (prev ? { ...prev, ...updated } : null))
          }
        />
      }
      extraDrawers={
        <InventoryStudioDrawers
          isProductPickerOpen={isProductPickerOpen}
          onCloseProductPicker={() => setIsProductPickerOpen(false)}
          selectedProduct={selectedProduct}
          onSelectProduct={(p) => setSelectedProduct(p)}
          isSessionsDrawerOpen={isSessionsDrawerOpen}
          onCloseSessionsDrawer={() => setIsSessionsDrawerOpen(false)}
          sessions={sessions.sessions}
          activeSessionId={sessions.activeSessionId}
          onSelectSession={sessions.switchSession}
          onNewSession={() => sessions.createNewSession()}
          onDeleteSession={sessions.deleteSession}
        />
      }
    />
  );
};

export default InventoryAiStudioPage;
