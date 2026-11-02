import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AgentProfilesPage from "./AgentProfilesPage";
import { useAgentProfilesState } from "./useAgentProfilesState";

jest.mock("./useAgentProfilesState");

describe("AgentProfilesPage", () => {
  const mockState = {
    t: (key: string, fallback?: string) => fallback || key,
    isMobile: false,
    mobileDrawerOpen: false,
    setMobileDrawerOpen: jest.fn(),
    companyId: "company_1",
    agents: [{ id: "agent_active_1", name: "Agent Active 1", role: "SUPPORT" }],
    agentsLoading: false,
    selectedId: "agent_active_1",
    setSelectedId: jest.fn(),
    searchQuery: "",
    setSearchQuery: jest.fn(),
    agentsListTab: "active" as const,
    setAgentsListTab: jest.fn(),
    tab: "settings" as const,
    setTab: jest.fn(),
    profile: {
      agent: {
        id: "agent_active_1",
        name: "Agent Active 1",
        role: "SUPPORT",
        status: "ACTIVE",
        templateSlug: null,
      },
      skills: [],
      allowedTools: [],
    },
    setProfile: jest.fn(),
    profileLoading: false,
    profileError: null,
    setProfileError: jest.fn(),
    statusSaving: false,
    actionConfirm: null,
    setActionConfirm: jest.fn(),
    deleting: false,
    editing: false,
    setEditing: jest.fn(),
    draftName: "Agent Active 1",
    setDraftName: jest.fn(),
    draftIcon: "🤖",
    setDraftIcon: jest.fn(),
    draftDescription: "",
    setDraftDescription: jest.fn(),
    draftFiles: {},
    setDraftFiles: jest.fn(),
    draftConfig: {},
    setDraftConfig: jest.fn(),
    profileSaving: false,
    createOpen: false,
    setCreateOpen: jest.fn(),
    templates: [],
    templatesLoading: false,
    hasUnsavedChanges: false,
    selectedAgent: { id: "agent_active_1", name: "Agent Active 1", role: "SUPPORT" },
    channels: [],
    filteredAgents: [{ id: "agent_active_1", name: "Agent Active 1", role: "SUPPORT" }],
    loadAgents: jest.fn(),
    loadProfileData: jest.fn(),
    toggleStatus: jest.fn(),
    saveProfile: jest.fn(),
    discardChanges: jest.fn(),
    handleArchiveAgent: jest.fn(),
    handleDeleteAgent: jest.fn(),
    setSearchParams: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders with ?agent=agent_active_1 and asserts level 1 heading text is فريق الايجنت", () => {
    (useAgentProfilesState as jest.Mock).mockReturnValue(mockState);

    render(
      <MemoryRouter initialEntries={["/admin/agent-profiles?agent=agent_active_1"]}>
        <AgentProfilesPage />
      </MemoryRouter>,
    );

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toBe("فريق الايجنت");
    expect(screen.getByRole("heading", { level: 1 }).textContent === "فريق الايجنت").toBe(true);

    const h2s = screen.getAllByRole("heading", { level: 2 });
    expect(h2s.some((h) => h.textContent === "Agent Active 1")).toBe(true);
  });

  it("renders level 1 page heading even when no agent is selected", () => {
    (useAgentProfilesState as jest.Mock).mockReturnValue({
      ...mockState,
      selectedId: null,
      selectedAgent: null,
      profile: null,
    });

    render(
      <MemoryRouter initialEntries={["/admin/agent-profiles"]}>
        <AgentProfilesPage />
      </MemoryRouter>,
    );

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toBe("فريق الايجنت");
  });
});
