/** @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { InventoryAiStudioPage } from "../InventoryAiStudioPage";

// Mock dependencies
vi.mock("../../../../hooks/useAuthSimple", () => ({
  useAuth: () => ({
    user: { id: "usr_01", companyId: "comp_101", name: "المشرف" },
  }),
}));

vi.mock("../../../../services/inventoryAiService", () => ({
  chatWithInventoryAgent: vi.fn(),
  getInventoryActiveAgent: vi.fn().mockResolvedValue({
    success: true,
    agent: {
      id: "agent_inv_01",
      name: "أكرم — اختصاصي إدارة المنتجات",
      role: "PRODUCT_CREATOR",
    },
  }),
  getInventoryStudioSessions: vi.fn().mockResolvedValue([]),
  saveInventoryStudioSession: vi.fn().mockResolvedValue({ success: true }),
  deleteInventoryStudioSession: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("../../../../components/agent-studio", () => ({
  AgentStudioLayout: ({ title, chatPanel, canvasPanel, extraDrawers }: any) => (
    <div data-testid="agent-studio-layout">
      <h1>{title}</h1>
      <div data-testid="chat-panel">{chatPanel}</div>
      <div data-testid="canvas-panel">{canvasPanel}</div>
      <div data-testid="extra-drawers">{extraDrawers}</div>
    </div>
  ),
  AgentStudioChatFeed: ({ emptyStateTitle }: any) => (
    <div data-testid="chat-feed">{emptyStateTitle}</div>
  ),
  AgentStudioSessionsDrawer: () => <div data-testid="sessions-drawer" />,
  useAgentStudioSessions: () => ({
    sessions: [],
    activeSession: { id: "sess_01", title: "جلسة افتراضية", messages: [] },
    activeSessionId: "sess_01",
    addMessageToActiveSession: vi.fn(),
    createNewSession: vi.fn(),
    switchSession: vi.fn(),
    deleteSession: vi.fn(),
  }),
}));

vi.mock("../../advertising/marketing-studio/ProductOpportunityRadar", () => ({
  ProductOpportunityRadar: () => <div data-testid="product-radar" />,
}));

afterEach(() => {
  cleanup();
});

describe("InventoryAiStudioPage", () => {
  it("renders the studio layout with correct title and components", () => {
    render(<InventoryAiStudioPage />);

    expect(screen.getByText("مركز المنتجات والمخزون الذكي")).toBeInTheDocument();
    expect(screen.getByTestId("agent-studio-layout")).toBeInTheDocument();
    expect(screen.getByTestId("chat-feed")).toBeInTheDocument();
    expect(screen.getByTestId("canvas-panel")).toBeInTheDocument();
  });
});
