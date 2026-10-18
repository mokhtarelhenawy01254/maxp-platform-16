import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter } from "react-router-dom";
import { AgentWorkspace } from "./AgentWorkspace";
import { WorkspaceMobileViewSwitcher } from "./workspace/WorkspaceMobileViewSwitcher";
import { WorkspaceActiveModals } from "./workspace/WorkspaceActiveModals";

jest.mock("../../i18n", () => ({
  getDirection: () => "rtl",
}));

jest.mock("../../services/apiClient", () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue({ data: {} }),
    post: jest.fn().mockResolvedValue({ data: {} }),
  },
}));

jest.mock("../../hooks/useCurrency", () => ({
  useCurrency: () => ({
    formatPrice: (amount: number) => `${amount} ج.م`,
  }),
}));

jest.mock("../../components/telephony/OrderCallButton", () => ({
  OrderCallButton: () => null,
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string, opt?: any) => opt?.defaultValue || k,
    i18n: { language: "ar" },
  }),
}));

const mockFetchOrders = jest.fn();

jest.mock("./workspace/useAgentWorkspace", () => ({
  useAgentWorkspace: () => ({
    t: (k: string) => k,
    isManager: false,
    orders: [
      {
        id: "ord-workspace-1",
        orderNumber: "ORD-WS-1",
        status: "PENDING",
        total: 500,
        customerName: "فادي سامي",
        customerPhone: "01011112222",
        items: [],
      },
    ],
    selectedOrderId: "ord-workspace-1",
    selectedOrder: {
      id: "ord-workspace-1",
      orderNumber: "ORD-WS-1",
      status: "PENDING",
      total: 500,
      customerName: "فادي سامي",
      customerPhone: "01011112222",
      items: [],
    },
    setSelectedOrderId: jest.fn(),
    loading: false,
    refreshing: false,
    loadingMore: false,
    fetchError: null,
    activeTab: "queue",
    selectTab: jest.fn(),
    perspective: "agent",
    searchQuery: "",
    handleSearchChange: jest.fn(),
    sortOption: "recent",
    setSortOption: jest.fn(),
    lastFetchedAt: new Date("2026-10-18T10:00:00Z"),
    stats: {
      pending: 10,
      confirmed: 20,
      cancelled: 2,
    },
    pagination: { total: 1, page: 1, limit: 20 },
    page: 1,
    busyOrders: {},
    cancellingOrder: null,
    setCancellingOrder: jest.fn(),
    cancelReasonText: "",
    setCancelReasonText: jest.fn(),
    confirmCancelOrder: jest.fn(),
    followUpOrder: null,
    setFollowUpOrder: jest.fn(),
    followUpDateValue: "",
    setFollowUpDateValue: jest.fn(),
    handleSaveFollowUp: jest.fn(),
    handleQuickAction: jest.fn(),
    handleLogCall: jest.fn(),
    fetchOrders: mockFetchOrders,
    teamWorkload: { unassignedCount: 0, agents: [] },
    loadingWorkload: false,
    isDistributing: false,
    selectedAgentId: null,
    handleSelectAgent: jest.fn(),
    handleAutoDistribute: jest.fn(),
    handleAssignOrder: jest.fn(),
    handleConvertIncomplete: jest.fn(),
    handleUpdateOrderItems: jest.fn(),
    handleUpdateCustomer: jest.fn(),
    confirmationDisabled: false,
  }),
}));

describe("AgentWorkspace Suite", () => {
  it("renders workspace cockpit chassis and selected order", () => {
    render(
      <BrowserRouter>
        <AgentWorkspace />
      </BrowserRouter>
    );

    expect(screen.getAllByText(/ORD-WS-1/).length).toBeGreaterThan(0);
  });

  it("renders WorkspaceMobileViewSwitcher and fires onSelectView", () => {
    const onSelectViewMock = jest.fn();
    render(
      <WorkspaceMobileViewSwitcher
        activeView="queue"
        onSelectView={onSelectViewMock}
        isArabic={true}
        totalOrdersCount={5}
        selectedOrder={null}
      />
    );

    const inspectorBtn = screen.getByTestId("workspace-view-inspector");
    fireEvent.click(inspectorBtn);
    expect(onSelectViewMock).toHaveBeenCalledWith("inspector");
  });
});
