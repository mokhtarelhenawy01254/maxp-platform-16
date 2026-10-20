// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AgentProfileDrawer } from "../agents/AgentProfileDrawer";
import { AgentHireModal } from "../agents/AgentHireModal";
import { AgentListing } from "../agents/agentMarketplaceData";

const { mockApiGet, mockApiPost } = vi.hoisted(() => ({
  mockApiGet: vi.fn(),
  mockApiPost: vi.fn(),
}));

vi.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: (...args: unknown[]) => mockApiPost(...args),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockAgent: AgentListing = {
  id: "agent-1",
  slug: "kareem-media-buyer",
  name: "كريم ميديا باير",
  position: "مدير الحملات الإعلانية ومسؤول ROAS",
  category: "marketing",
  tier: "pro",
  priceMonthly: 850,
  currency: "ج.م",
  avatarUrl: "/avatars/kareem.jpg",
  rating: 4.9,
  hiresCount: 142,
  summary: "خبير ميديا باير ومراقبة تكلفة الاستحواذ",
  telemetry: {
    engine: "MaxP Reasoning v4.2",
    p95Latency: "480ms",
    taskPrecision: "99.2%",
    contextWindow: "128k Tokens",
  },
  dossier: {
    bio: "سيرة مهنية متقدمة في إدارة حملات فيسبوك وتيك توك بدقة متناهية.",
    persona: "تحليلي ومباشر",
    dialect: "مصري فصيح مهني",
    boundaries: [
      "لا ينفق فوق الميزانية المحددة أبداً",
      "لا يوقف الحملات الرابحة دون مراجعة",
    ],
    executionStream: [
      { step: "Step 1: Check ROAS", action: "Query meta_insights table", type: "thought" },
      { step: "Step 2: Detect Ad Fatigue", action: "tools.calc_frequency(campaign_id)", type: "tool" },
      { step: "Step 3: Recommendation", action: "Scaling budget by 15%", type: "output" },
    ],
  },
  tools: ["meta_insights", "budget_allocator", "creative_fatigue_checker"],
};

describe("Agent Marketplace Modular Components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiGet.mockResolvedValue({
      data: {
        success: true,
        data: { balance: 3500 },
      },
    });
    mockApiPost.mockResolvedValue({
      status: 200,
      data: { success: true },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders AgentProfileDrawer with header, telemetry and action button", () => {
    const handleClose = vi.fn();
    const handleHire = vi.fn();

    render(
      <MemoryRouter>
        <AgentProfileDrawer
          agent={mockAgent}
          open={true}
          onClose={handleClose}
          onHire={handleHire}
          isHired={false}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("كريم ميديا باير")).toBeInTheDocument();
    expect(screen.getByText("تخصصي Pro")).toBeInTheDocument();
    expect(screen.getByText("MaxP Reasoning v4.2")).toBeInTheDocument();
    expect(screen.getByText("480ms")).toBeInTheDocument();
    expect(screen.getByText("99.2%")).toBeInTheDocument();
    expect(screen.getByText("128k Tokens")).toBeInTheDocument();
    expect(screen.getByText("meta_insights")).toBeInTheDocument();

    const hireBtn = screen.getByRole("button", { name: /توظيف الإيجنت في فريقي/i });
    expect(hireBtn).toBeInTheDocument();
    fireEvent.click(hireBtn);
    expect(handleHire).toHaveBeenCalledWith(mockAgent);
  });

  it("renders AgentHireModal and allows submitting hire request", async () => {
    const handleClose = vi.fn();
    const handleHired = vi.fn();

    render(
      <MemoryRouter>
        <AgentHireModal
          agent={mockAgent}
          open={true}
          onClose={handleClose}
          onHired={handleHired}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("توظيف كريم ميديا باير")).toBeInTheDocument();
    expect(screen.getByText("اشتراك تخصصي Pro")).toBeInTheDocument();

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith("/wallet/balance");
    });

    const submitBtn = screen.getByRole("button", { name: /تأكيد تعيين الإيجنت/i });
    expect(submitBtn).toBeInTheDocument();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith("/agent-manager/hire", expect.objectContaining({
        templateSlug: "kareem-media-buyer",
      }));
      expect(handleHired).toHaveBeenCalledWith("kareem-media-buyer", "كريم ميديا باير");
      expect(handleClose).toHaveBeenCalled();
    });
  });
});
