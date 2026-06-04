// @vitest-environment jsdom

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useAgentSandbox } from "../hooks/useAgentSandbox";

const sandboxApiMock = vi.hoisted(() => ({
  getAgents: vi.fn(),
  getModels: vi.fn(),
  listSessions: vi.fn(),
  getSession: vi.fn(),
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
});
