// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAiProviders, useAiKeys } from "../useAiAdminData";

const { mockGetProviders, mockGetKeys } = vi.hoisted(() => ({
  mockGetProviders: vi.fn(),
  mockGetKeys: vi.fn(),
}));

vi.mock("../../services/aiAdminService", () => ({
  aiAdminService: {
    getProviders: mockGetProviders,
    getKeys: mockGetKeys,
  },
}));

describe("useAiAdminData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("useAiProviders returns provider list", async () => {
    mockGetProviders.mockResolvedValue(["OPENAI", "ANTHROPIC"]);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useAiProviders(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(["OPENAI", "ANTHROPIC"]);
  });

  it("useAiProviders returns empty array when API returns empty", async () => {
    mockGetProviders.mockResolvedValue([]);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useAiProviders(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it("useAiKeys returns keys array", async () => {
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
    mockGetKeys.mockResolvedValue(keys);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useAiKeys(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(keys);
  });

  it("useAiKeys starts in loading state", async () => {
    mockGetKeys.mockReturnValue(new Promise(() => {}));

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useAiKeys(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it("useAiKeys returns error when API fails", async () => {
    mockGetKeys.mockRejectedValue(new Error("API failure"));

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useAiKeys(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });
});
