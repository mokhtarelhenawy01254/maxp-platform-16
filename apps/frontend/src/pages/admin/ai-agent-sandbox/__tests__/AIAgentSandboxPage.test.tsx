// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import React from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import AIAgentSandboxPage from "../AIAgentSandboxPage";
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
  });

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    (useAgentSandbox as vi.Mock).mockReturnValue({
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
      runQuickScenario: vi.fn(),
      exportSession: vi.fn(),
      formatCost: (value: number) => `$${value.toFixed(4)}`,
      formatTokens: (value: number) => String(value),
      clearActivityLog: vi.fn(),
      clearError: vi.fn(),
    });
  });

  test("classifies dot-named write tools correctly in the inspector", () => {
    render(<AIAgentSandboxPage />);

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
    (useAgentSandbox as vi.Mock).mockReturnValueOnce({
      ...(useAgentSandbox as vi.Mock).getMockImplementation()?.(),
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
});
