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
    const providers = [
      { name: "OPENAI", display_name: "OpenAI", adapter_type: "openai_compat", base_url: "https://api.openai.com/v1", default_model: "gpt-4o-mini", is_active: true },
      { name: "ANTHROPIC", display_name: "Anthropic Claude", adapter_type: "anthropic_native", base_url: "https://api.anthropic.com", default_model: "claude-3-5-sonnet-20241022", is_active: true },
    ];
    mockGetProviders.mockResolvedValue(providers);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useAiProviders(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(providers);
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
