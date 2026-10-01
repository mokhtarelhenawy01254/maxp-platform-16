// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useAgentSandbox } from "../hooks/useAgentSandbox";

const sandboxApiMock = vi.hoisted(() => ({
  getAgents: vi.fn(),
  getModels: vi.fn(),
  listSessions: vi.fn(),
  getSession: vi.fn(),
  createSession: vi.fn(),
  streamMessage: vi.fn(),
  getTools: vi.fn(),
  getAgentProfile: vi.fn(),
  evaluateResponse: vi.fn(),
  deleteSession: vi.fn(),
  updateSessionTitle: vi.fn(),
  exportSession: vi.fn(),
}));

vi.mock("../services/sandboxApi", () => ({
  sandboxApi: sandboxApiMock,
}));

describe("useAgentSandbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sandboxApiMock.getAgents.mockResolvedValue({
      success: true,
      agents: [
        {
          id: "agent_fb",
          name: "Facebook Agent",
          role: "FACEBOOK_SALES_SUPPORT",
          icon: "F",
          description: "Sales support",
          allowedTools: ["inventory.check"],
        },
      ],
    });
    sandboxApiMock.getModels.mockResolvedValue({
      success: true,
      providers: [
        {
          name: "GOOGLE",
          label: "Google",
          models: [
            {
              id: "gemini-2.5-flash",
              label: "Gemini 2.5 Flash",
              keyId: "central_key",
              keyName: "Central Key",
              keyType: "CENTRAL",
              scope: "central",
              keyIsActive: true,
              isPreferred: true,
              isEnabled: true,
              isSelectable: true,
            },
          ],
        },
      ],
      centralKeys: [
        {
          id: "central_key",
          name: "Central Key",
          provider: "GOOGLE",
          keyType: "CENTRAL",
          scope: "central",
          isActive: true,
        },
      ],
    });
    sandboxApiMock.getTools.mockResolvedValue({
      success: true,
      tools: [],
    });
    sandboxApiMock.listSessions.mockResolvedValue({
      success: true,
      sessions: [],
      count: 0,
    });
    sandboxApiMock.createSession.mockResolvedValue({
      success: true,
      session: {
        id: "session_1",
        title: "Test Session",
        createdAt: new Date().toISOString(),
      },
    });
  });

  test("mounts and loads initial sandbox data without a hook initialization crash", async () => {
    const { result } = renderHook(() => useAgentSandbox());

    await waitFor(() => {
      expect(result.current.isSessionsLoading).toBe(false);
    });

    expect(result.current.selectedAgentId).toBe("agent_fb");
    expect(result.current.selectedModel).toBe("gemini-2.5-flash");
    expect(result.current.selectedKeyId).toBe("central_key");
  });

  test("surfaces stream done errors instead of leaving the sandbox with no visible reply state", async () => {
    sandboxApiMock.streamMessage.mockImplementation(async (
      _sessionId: string,
      _message: string,
      _agentId: string,
      _model: string,
      _provider: string,
      _keyId: string | null,
      _attachments: unknown,
      onEvent?: (event: { done: boolean; error: string; reason: string }) => void
    ) => {
      onEvent?.({
        done: true,
        error: "AI_SANDBOX_EMPTY_REPLY",
        reason: "The selected model returned no assistant text",
      });
    });

    const { result } = renderHook(() => useAgentSandbox());

    await waitFor(() => {
      expect(result.current.isSessionsLoading).toBe(false);
    });

    await act(async () => {
      await result.current.sendMessage("Hello");
    });

    expect(result.current.error).toBe("AI_SANDBOX_EMPTY_REPLY: The selected model returned no assistant text");
    expect(result.current.activityLog.some((entry) => (
      entry.type === "error" && entry.details === "AI_SANDBOX_EMPTY_REPLY: The selected model returned no assistant text"
    ))).toBe(true);
  });

  test("adds skill activation entry to activity log when pipeline trace has activeSkill", async () => {
    sandboxApiMock.streamMessage.mockImplementation(async (
      _sessionId: string,
      _message: string,
      _agentId: string,
      _model: string,
      _provider: string,
      _keyId: string | null,
      _attachments: unknown,
      onEvent?: (event: Record<string, unknown>) => void
    ) => {
      onEvent?.({
        type: "agent_reply",
        reply: "Found 3 laptops.",
        isIncremental: false,
      });
      onEvent?.({
        done: true,
        tokens: { input: 1, output: 2, total: 3 },
        latencyMs: 25,
        model: "gemini-2.5-flash",
        provider: "GOOGLE",
        keyId: "central_key",
        keyName: "Central Key",
        cost: 0,
        sessionId: "session_1",
        runtime: "python-agent",
        pipelineTrace: {
          activeSkill: {
            skillId: "catalog-search",
            requiresHumanApproval: false,
            maxToolCount: 2,
          },
          toolPlan: {
            intent: "product.search",
            primaryTool: "product_search",
            allowedTools: ["product_search"],
            reason: "classified by model",
          },
          toolExecutions: [{
            name: "product_search",
            params: { query: "laptops" },
            output: { count: 3 },
            success: true,
          }],
        },
      });
    });

    const { result } = renderHook(() => useAgentSandbox());

    await waitFor(() => {
      expect(result.current.isSessionsLoading).toBe(false);
    });

    await act(async () => {
      await result.current.sendMessage("search laptops");
    });

    expect(result.current.activityLog.some((entry) => (
      entry.title === "Skill Activated" && entry.details?.includes("catalog-search")
    ))).toBe(true);
  });

  test("adds Python pipeline trace details from the final stream event to the activity log", async () => {
    sandboxApiMock.streamMessage.mockImplementation(async (
      _sessionId: string,
      _message: string,
      _agentId: string,
      _model: string,
      _provider: string,
      _keyId: string | null,
      _attachments: unknown,
      onEvent?: (event: Record<string, unknown>) => void
    ) => {
      onEvent?.({
        type: "agent_reply",
        reply: "Need exact product model",
        isIncremental: false,
      });
      onEvent?.({
        done: true,
        tokens: { input: 1, output: 2, total: 3 },
        latencyMs: 25,
        model: "gemini-2.5-flash",
        provider: "GOOGLE",
        keyId: "central_key",
        keyName: "Central Key",
        cost: 0,
        sessionId: "session_1",
        runtime: "python-agent",
        pipelineTrace: {
          toolPlan: {
            intent: "inventory.check",
            primaryTool: "inventory_check",
            allowedTools: ["inventory.check"],
            reason: "classified by model",
          },
          toolExecutions: [{
            name: "inventory_check",
            params: { product_name_or_sku: "black shoes" },
            output: { status: "NOT_FOUND" },
            success: true,
          }],
        },
      });
    });

    const { result } = renderHook(() => useAgentSandbox());

    await waitFor(() => {
      expect(result.current.isSessionsLoading).toBe(false);
    });

    await act(async () => {
      await result.current.sendMessage("Check inventory");
    });

    expect(result.current.activityLog.some((entry) => (
      entry.title === "Tool Plan" && entry.metadata?.primaryTool === "inventory_check"
    ))).toBe(true);
    expect(result.current.activityLog.some((entry) => (
      entry.title === "Tool: inventory_check"
      && (entry.metadata as any)?.params?.product_name_or_sku === "black shoes"
    ))).toBe(true);
  });

  test("creates a fresh session before sending when the active session belongs to another agent", async () => {
    sandboxApiMock.listSessions.mockResolvedValue({
      success: true,
      sessions: [{
        id: "old_session",
        title: "Old Agent Session",
        agentId: "agent_other",
        model: "gemini-2.5-flash",
        provider: "GOOGLE",
        messageCount: 0,
        toolCallCount: 0,
        totalCost: 0,
        totalTokens: 0,
        avgLatency: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }],
      count: 1,
    });
    sandboxApiMock.getSession.mockResolvedValue({
      success: true,
      session: {
        id: "old_session",
        title: "Old Agent Session",
        agentId: "agent_other",
        model: "gemini-2.5-flash",
        provider: "GOOGLE",
        messageCount: 0,
        toolCallCount: 0,
        totalCost: 0,
        totalTokens: 0,
        avgLatency: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [],
      },
    });
    sandboxApiMock.createSession.mockResolvedValue({
      success: true,
      session: {
        id: "new_agent_session",
        title: "Test Session",
        createdAt: new Date().toISOString(),
      },
    });
    sandboxApiMock.streamMessage.mockImplementation(async (
      _sessionId: string,
      _message: string,
      _agentId: string,
      _model: string,
      _provider: string,
      _keyId: string | null,
      _attachments: unknown,
      onEvent?: (event: Record<string, unknown>) => void
    ) => {
      onEvent?.({
        type: "agent_reply",
        reply: "Fresh session reply",
        isIncremental: false,
      });
      onEvent?.({
        done: true,
        tokens: { input: 1, output: 2, total: 3 },
        latencyMs: 25,
        model: "gemini-2.5-flash",
        provider: "GOOGLE",
        keyId: "central_key",
        keyName: "Central Key",
        cost: 0,
        sessionId: "new_agent_session",
        runtime: "python-agent",
      });
    });

    const { result } = renderHook(() => useAgentSandbox());

    await waitFor(() => {
      expect(result.current.isSessionsLoading).toBe(false);
    });

    await act(async () => {
      await result.current.sendMessage("Hello from the selected agent");
    });

    expect(sandboxApiMock.createSession).toHaveBeenCalledWith(expect.objectContaining({
      agentId: "agent_fb",
    }));
    expect(sandboxApiMock.streamMessage).toHaveBeenCalledWith(
      "new_agent_session",
      "Hello from the selected agent",
      "agent_fb",
      "gemini-2.5-flash",
      "GOOGLE",
      "central_key",
      undefined,
      expect.any(Function)
    );
  });

  test("generates and copies conversation direct link", async () => {
    const { result } = renderHook(() => useAgentSandbox());

    await waitFor(() => {
      expect(result.current.isSessionsLoading).toBe(false);
    });

    const link = result.current.getConversationLink("session_abc");
    expect(link).toContain("/admin/ai-hub?tab=sandbox&sessionId=session_abc");

    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    let success = false;
    await act(async () => {
      success = await result.current.copyConversationLink("session_abc");
    });

    expect(success).toBe(true);
    expect(writeTextMock).toHaveBeenCalledWith(link);
  });
});
