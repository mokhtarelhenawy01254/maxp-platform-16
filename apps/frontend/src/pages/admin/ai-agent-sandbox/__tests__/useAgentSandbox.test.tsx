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
});
