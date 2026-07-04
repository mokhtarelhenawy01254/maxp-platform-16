// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();

vi.mock("../apiClient", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

import { aiAdminService } from "../aiAdminService";

describe("aiAdminService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getProviders returns data from apiClient", async () => {
    mockGet.mockResolvedValue({ data: ["OPENAI", "ANTHROPIC"] });

    const result = await aiAdminService.getProviders();

    expect(result).toEqual(["OPENAI", "ANTHROPIC"]);
    expect(mockGet).toHaveBeenCalledWith("/ai-admin/providers");
  });

  it("getKeys returns keys array", async () => {
    const keys = [
      {
        id: "1",
        name: "Test Key",
        provider: "OPENAI",
        api_key: "sk-...",
        key_type: "CENTRAL",
        is_active: true,
      },
    ];
    mockGet.mockResolvedValue({ data: keys });

    const result = await aiAdminService.getKeys();

    expect(result).toEqual(keys);
    expect(mockGet).toHaveBeenCalledWith("/ai-admin/keys");
  });

  it("createKey posts payload and returns created key", async () => {
    const payload = { provider: "OPENAI", name: "My Key", api_key: "sk-test" };
    const created = { id: "1", ...payload, key_type: "CENTRAL", is_active: true };
    mockPost.mockResolvedValue({ data: created });

    const result = await aiAdminService.createKey(payload);

    expect(result).toEqual(created);
    expect(mockPost).toHaveBeenCalledWith("/ai-admin/keys", payload);
  });

  it("setKeyStatus patches the correct endpoint with is_active flag", async () => {
    mockPatch.mockResolvedValue({ data: {} });

    await aiAdminService.setKeyStatus("key-1", false);

    expect(mockPatch).toHaveBeenCalledWith("/ai-admin/keys/key-1/status", {
      is_active: false,
    });
  });

  it("setKeyStatus encodes the id in the URL", async () => {
    mockPatch.mockResolvedValue({ data: {} });

    await aiAdminService.setKeyStatus("key/id+1", true);

    expect(mockPatch).toHaveBeenCalledWith(
      "/ai-admin/keys/key%2Fid%2B1/status",
      { is_active: true },
    );
  });

  it("deleteKey calls delete with the key id", async () => {
    mockDelete.mockResolvedValue({ data: {} });

    await aiAdminService.deleteKey("key-1");

    expect(mockDelete).toHaveBeenCalledWith("/ai-admin/keys/key-1");
  });

  it("testKey posts provider and api_key, returns result", async () => {
    const testResult = { ok: true, latency_ms: 200, model: "gpt-4", reply: "Hello" };
    mockPost.mockResolvedValue({ data: testResult });

    const result = await aiAdminService.testKey("OPENAI", "sk-test");

    expect(result).toEqual(testResult);
    expect(mockPost).toHaveBeenCalledWith("/ai-admin/test", {
      provider: "OPENAI",
      api_key: "sk-test",
    });
  });

  it("getKeys returns an empty array when API returns empty", async () => {
    mockGet.mockResolvedValue({ data: [] });

    const result = await aiAdminService.getKeys();

    expect(result).toEqual([]);
  });

  it("throws when API call fails", async () => {
    mockGet.mockRejectedValue(new Error("Network error"));

    await expect(aiAdminService.getProviders()).rejects.toThrow("Network error");
  });
});
