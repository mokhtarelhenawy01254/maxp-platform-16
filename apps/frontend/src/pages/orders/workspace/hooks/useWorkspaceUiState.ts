import { useState, useEffect } from "react";
import type { WorkspaceView } from "../WorkspaceMobileViewSwitcher";
import type { WorkspaceOrder } from "../types";

interface UseWorkspaceUiStateOptions {
  selectedOrderId: string | null;
  setSelectedOrderId: (id: string | null) => void;
  fetchOrders: (options?: { silent?: boolean }) => Promise<unknown>;
}

export const useWorkspaceUiState = ({
  selectedOrderId,
  setSelectedOrderId,
  fetchOrders,
}: UseWorkspaceUiStateOptions) => {
  const [activeModalOrder, setActiveModalOrder] = useState<WorkspaceOrder | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Active view on mobile/narrow screens: default to 'inspector' if order deep-link exists
  const [activeView, setActiveView] = useState<WorkspaceView>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("order")) return "inspector";
    }
    return "queue";
  });

  // Track if intelligence rail is open on desktop/tablet (defaults to true)
  const [isRailOpen, setIsRailOpen] = useState<boolean>(() => {
    try {
      const saved = window.localStorage.getItem("workspace-rail-open");
      if (saved !== null) return saved === "true";
    } catch {
      // storage unavailable (private mode / non-browser env)
    }
    return true;
  });

  const handleToggleRail = () => {
    setIsRailOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("workspace-rail-open", String(next));
      } catch {
        // ignore storage error
      }
      return next;
    });
  };

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setActiveView("inspector");
  };

  // Synchronize active view when order is deep-linked via URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("order") && activeView === "queue") {
        setActiveView("inspector");
      }
    }
  }, [selectedOrderId, activeView]);

  const handleOpenDetailsModal = (order: WorkspaceOrder) => {
    setActiveModalOrder(order);
    setIsModalOpen(true);
  };

  const handleOrderUpdate = (_updated: unknown) => {
    void fetchOrders({ silent: true });
  };

  return {
    activeModalOrder,
    setActiveModalOrder,
    isModalOpen,
    setIsModalOpen,
    activeView,
    setActiveView,
    isRailOpen,
    handleToggleRail,
    handleSelectOrder,
    handleOpenDetailsModal,
    handleOrderUpdate,
  };
};
