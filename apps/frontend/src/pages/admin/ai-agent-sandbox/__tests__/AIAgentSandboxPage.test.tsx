// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import React from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi, afterAll } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AIAgentSandboxPage from "../AIAgentSandboxPage";
import { InspectorPanel } from "../components/InspectorPanel";
import { useAgentSandbox } from "../hooks/useAgentSandbox";

vi.mock("../hooks/useAgentSandbox", () => ({
  useAgentSandbox: vi.fn(),
}));

const selectedAgent = {
  id: "agent_sales",
  name: "Sales Agent",
  icon: "S",
  role: "SALES",
  description: "Sales support",
  defaultModel: "gemini-2.5-flash",
  allowedTools: ["agent.spawn", "product.search"],
};

describe("AIAgentSandboxPage", () => {
  beforeAll(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    vi.stubGlobal("innerWidth", 1920);
    Object.defineProperty(window, "innerWidth", { value: 1920, configurable: true });
  });

  afterAll(() => {
    Object.defineProperty(window, "innerWidth", { value: 1024, configurable: true });
  });

  afterEach(() => {
    cleanup();
  });

  const createMockSandboxState = () => ({
    sessions: [],
    activeSession: null,
    activeSessionId: null,
    selectedAgentId: selectedAgent.id,
    selectedModel: "gemini-2.5-flash",
    selectedProvider: "GOOGLE",
    selectedKeyId: "central_key",
    isLoading: false,
    isStreaming: false,
    error: null,
    activityLog: [],
    currentEval: null,
    safetyChecks: [],
    agents: [selectedAgent],
    models: [
      {
        provider: "GOOGLE",
        model: "gemini-2.5-flash",
        label: "Gemini 2.5 Flash",
        keyId: "central_key",
        keyName: "Central Test Key",
        keyType: "CENTRAL",
        scope: "central",
        keyIsActive: true,
        isSelectable: true,
        maxTokens: 1000000,
        costPer1kInput: 0,
        costPer1kOutput: 0,
      },
    ],
    centralKeys: [
      {
        id: "central_key",
        name: "Central Test Key",
        provider: "GOOGLE",
        keyType: "CENTRAL",
        scope: "central",
        isActive: true,
      },
    ],
    toolsMetadata: [
      { name: "agent.spawn", description: "Spawn agent", sideEffects: "write" },
      { name: "product.search", description: "Search products", sideEffects: "read" },
    ],
    quickScenarios: [],
    costBreakdown: [],
    selectedAgent,
    setSelectedAgentId: vi.fn(),
    setSelectedModel: vi.fn(),
    setSelectedProvider: vi.fn(),
    setSelectedKeyId: vi.fn(),
    setActiveSessionId: vi.fn(),
    createSession: vi.fn(),
    deleteSession: vi.fn(),
    updateSessionTitle: vi.fn(),
    sendMessage: vi.fn(),
    evaluateLastResponse: vi.fn(),
    runQuickScenario: vi.fn(),
    exportSession: vi.fn(),
    formatCost: (value: number) => `$${value.toFixed(4)}`,
    formatTokens: (value: number) => String(value),
    clearActivityLog: vi.fn(),
    clearError: vi.fn(),
  });

  beforeEach(() => {
    (useAgentSandbox as vi.Mock).mockReturnValue(createMockSandboxState());
  });

  test("classifies dot-named write tools correctly in the inspector", async () => {
    const user = userEvent.setup();
    render(<AIAgentSandboxPage />);

    await user.click(screen.getByText("Inspector"));

    expect(screen.getByText("agent.spawn")).toBeInTheDocument();
    expect(screen.getByText("product.search")).toBeInTheDocument();
    expect(screen.getByText("write")).toBeInTheDocument();
    expect(screen.getByText("read")).toBeInTheDocument();
  });

  test("shows the central key used by the selected model", () => {
    render(<AIAgentSandboxPage />);

    expect(screen.getAllByText(/Central Test Key/).length).toBeGreaterThan(0);
  });

  test("shows inactive central keys for testing visibility", () => {
    (useAgentSandbox as vi.Mock).mockReturnValue({
      ...createMockSandboxState(),
      selectedKeyId: null,
      models: [
        {
          provider: "GOOGLE",
          model: "gemini-2.5-flash",
          label: "Gemini 2.5 Flash",
          keyId: "inactive_central_key",
          keyName: "Inactive Central Key",
          keyType: "CENTRAL",
          scope: "central",
          keyIsActive: false,
          isSelectable: false,
          maxTokens: 1000000,
          costPer1kInput: 0,
          costPer1kOutput: 0,
        },
      ],
      centralKeys: [
        {
          id: "inactive_central_key",
          name: "Inactive Central Key",
          provider: "GOOGLE",
          keyType: "CENTRAL",
          scope: "central",
          isActive: false,
        },
      ],
    });

    render(<AIAgentSandboxPage />);

    expect(screen.getAllByText(/Inactive Central Key/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Inactive/).length).toBeGreaterThan(0);
  });

  test("shows active skill from pipeline trace in the InspectorPanel", async () => {
    const user = userEvent.setup();
    render(<InspectorPanel
      tools={[
        { name: "product_search", description: "Search", sideEffect: "read", enabled: true },
      ]}
      activityLog={[]}
      traceSummary={{
        runtime: "python-agent",
        model: "gemini-2.5-flash",
        provider: "GOOGLE",
        toolCalls: [{ id: "t1", name: "product_search", input: {}, status: "success", timestamp: new Date().toISOString() }],
        pipelineTrace: {
          activeSkill: { skillId: "catalog-search", requiresHumanApproval: false, maxToolCount: 2 },
          intentClassification: { intent: "product.search", confidence: 0.95, confidenceLevel: "high", ambiguous: false },
          toolPlan: { intent: "product.search", primaryTool: "product_search", reason: "catalog search" },
        },
      }}
      onClearLog={vi.fn()}
      agentName="Test Agent"
      agentRole="SALES"
      agentDescription=""
      modelName="gemini-2.5-flash"
      providerName="GOOGLE"
      conversationMessages={[]}
      agentSkills={[]}
      collapsed={false}
      width={288}
    />);

    // Switch to System tab where active skill is shown in prompt sections
    await user.click(screen.getByText("System")); // tab=2
    expect(screen.getByText("ACTIVE SKILL — Last Turn")).toBeInTheDocument();
    expect(screen.getByText(/catalog-search/)).toBeInTheDocument();
  });

  test("shows Python run trace summary for the latest assistant message", async () => {
    const user = userEvent.setup();
    render(<InspectorPanel
      tools={[
        { name: "inventory_check", description: "Check inventory", sideEffect: "read", enabled: true },
      ]}
      activityLog={[]}
      traceSummary={{
        runtime: "python-agent",
        model: "gemini-2.5-flash",
        provider: "GOOGLE",
        keyName: "",
        keyId: "",
        toolCalls: [{ id: "tool_1", name: "inventory_check", input: {}, status: "success", timestamp: new Date().toISOString() }],
        pipelineTrace: {
          intentClassification: { intent: "inventory.check", confidence: 0.91, confidenceLevel: "high", ambiguous: false },
          toolPlan: { intent: "inventory.check", primaryTool: "inventory_check", reason: "classified by model" },
        },
      }}
      onClearLog={vi.fn()}
      agentName="Test Agent"
      agentRole="SALES"
      agentDescription=""
      modelName="gemini-2.5-flash"
      providerName="GOOGLE"
      conversationMessages={[]}
      agentSkills={[]}
      collapsed={false}
      width={320}
    />);

    await user.click(screen.getByText("Log"));

    expect(screen.getByText("aiHub.sandbox.trace.title")).toBeInTheDocument();
    expect(screen.getByText("aiHub.sandbox.trace.pythonRuntime")).toBeInTheDocument();
    expect(screen.getByText(/inventory\.check/)).toBeInTheDocument();
    expect(screen.getAllByText(/inventory_check/).length).toBeGreaterThan(0);
  });
});
