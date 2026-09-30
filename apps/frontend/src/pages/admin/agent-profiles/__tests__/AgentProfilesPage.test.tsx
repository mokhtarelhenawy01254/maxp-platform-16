// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import React from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AgentProfilesPage from "../AgentProfilesPage";
import { sandboxApi } from "../../ai-agent-sandbox/services/sandboxApi";

const mockT = (_key: string, fallback?: string) => fallback || _key;
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: mockT,
  }),
}));

vi.mock("../../ai-agent-sandbox/services/sandboxApi", () => ({
  sandboxApi: {
    getAgents: vi.fn(),
    getAgentProfile: vi.fn(),
  },
}));

vi.mock("../AgentSettingsTab", () => ({
  default: ({ draftName }: { draftName: string }) => (
    <div data-testid="agent-settings-tab">Settings for {draftName}</div>
  ),
}));

vi.mock("../AgentSkillsTab", () => ({
  default: () => <div data-testid="agent-skills-tab">Skills</div>,
}));

vi.mock("../AgentToolsTab", () => ({
  default: () => <div data-testid="agent-tools-tab">Tools</div>,
}));

vi.mock("../AgentGuardrailsTab", () => ({
  default: () => <div data-testid="agent-guardrails-tab">Guardrails</div>,
}));

vi.mock("../CreateAgentDialog", () => ({
  default: () => null,
}));

const activeAgents = [
  {
    id: "agent_active_1",
    name: "سارة — خدمة العملاء",
    role: "CUSTOMER_SUPPORT",
    icon: "🎧",
    status: "ACTIVE",
    tools: [],
    skills: [],
  },
];

const archivedAgents = [
  {
    id: "agent_BUNRcG0ZXFY4dj2tH0GheQ",
    name: "منى — منسقة تأكيد الطلبات",
    role: "ORDER_CONFIRMATION",
    icon: "🤖",
    status: "ARCHIVED",
  },
];

describe("AgentProfilesPage — Active / Archived tabs navigation", () => {
  beforeAll(() => {
    Object.defineProperty(window, "innerWidth", { value: 1440, configurable: true });
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("user", JSON.stringify({ companyId: "comp_1" }));

    vi.mocked(sandboxApi.getAgents).mockResolvedValue({
      success: true,
      agents: activeAgents,
    });

    vi.mocked(sandboxApi.getAgentProfile).mockImplementation(async (id: string) => {
      const isArchived = id === "agent_BUNRcG0ZXFY4dj2tH0GheQ";
      return {
        success: true,
        agent: {
          id,
          name: isArchived ? "منى — منسقة تأكيد الطلبات" : "سارة — خدمة العملاء",
          role: isArchived ? "ORDER_CONFIRMATION" : "CUSTOMER_SUPPORT",
          icon: "🤖",
          description: "Test description",
          model: "gemini-2.5-flash",
          status: isArchived ? "ARCHIVED" : "ACTIVE",
          templateSlug: "order-confirmation-agent",
        },
        files: {
          "SOUL.md": "",
          "AGENTS.md": "",
          "TOOLS.md": "",
          "PERSONA.md": "",
        },
        allowedTools: [],
        skills: [],
        skillIds: [],
        modelPolicy: null,
      };
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/agent/agents?status=ARCHIVED")) {
        return new Response(
          JSON.stringify({ success: true, agents: archivedAgents }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.includes("/status") && init?.method === "PATCH") {
        return new Response(
          JSON.stringify({ success: true, agent: { status: "ACTIVE" } }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  test("switches cleanly from Archived tab to Active tab when opened with an archived agent in URL", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/admin/agent-profiles?agent=agent_BUNRcG0ZXFY4dj2tH0GheQ"]}>
        <Routes>
          <Route path="/admin/agent-profiles" element={<AgentProfilesPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Initially resolves the archived agent from URL and shows archived notice
    await waitFor(() => {
      expect(screen.getByText("استعادة الوكيل")).toBeInTheDocument();
    });

    // Click the "النشطين" (Active) tab button in the sidebar
    const activeTabBtn = screen.getByRole("button", { name: "النشطين" });
    await user.click(activeTabBtn);

    // Must switch to Active tab and load the active agent ("سارة — خدمة العملاء") without bouncing back to Archived
    await waitFor(() => {
      expect(screen.getByTestId("agent-settings-tab")).toHaveTextContent("Settings for سارة — خدمة العملاء");
    });

    expect(screen.queryByText("استعادة الوكيل")).not.toBeInTheDocument();

    // Switch back to "المؤرشفين" and then back to "النشطين" again
    const archivedTabBtn = screen.getByRole("button", { name: "المؤرشفين" });
    await user.click(archivedTabBtn);

    await waitFor(() => {
      expect(screen.getByText("استعادة الوكيل")).toBeInTheDocument();
    });

    await user.click(activeTabBtn);
    await waitFor(() => {
      expect(screen.getByTestId("agent-settings-tab")).toHaveTextContent("Settings for سارة — خدمة العملاء");
    });
  });

  test("clears selected profile when switching to Active tab with zero active agents", async () => {
    const user = userEvent.setup();
    vi.mocked(sandboxApi.getAgents).mockResolvedValue({
      success: true,
      agents: [],
    });

    render(
      <MemoryRouter initialEntries={["/admin/agent-profiles?agent=agent_BUNRcG0ZXFY4dj2tH0GheQ"]}>
        <Routes>
          <Route path="/admin/agent-profiles" element={<AgentProfilesPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("استعادة الوكيل")).toBeInTheDocument();
    });

    const activeTabBtn = screen.getByRole("button", { name: "النشطين" });
    await user.click(activeTabBtn);

    await waitFor(() => {
      expect(screen.getByText("اختر وكيلاً لعرض التفاصيل")).toBeInTheDocument();
    });
    expect(screen.queryByText("استعادة الوكيل")).not.toBeInTheDocument();
  });
});
