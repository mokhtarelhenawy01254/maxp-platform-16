jest.mock("../../../services/apiClient", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

jest.mock("react-hot-toast", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("../../../utils/companyFunnelAnalytics", () => ({
  getCompaniesFunnelStats: jest.fn(() => ({ activated: 0, trackedCompanies: 0, untrackedCompanies: 0, registeredNoStart: 0, onboardingInProgress: 0, activationInProgress: 0 })),
  getCompaniesFunnelFollowUpStats: jest.fn(() => ({ followUpNow: 0, escalationDue: 0, urgentEscalationDue: 0, stale72h: 0 })),
  getCompanyFunnelAttentionScore: jest.fn(() => 0),
  getCompanyFunnelLastActivity: jest.fn(() => ({ label: "-", relativeLabel: "-", sortValue: "" })),
  getCompanyFunnelSummary: jest.fn(() => ({ stageKey: "untracked", label: "بدون مسار", progressLabel: "-", hint: "", badgeClassName: "" })),
  getCompanyFunnelStaleStatus: jest.fn(() => ({ label: "", badgeClassName: "", isPending: false, needsFollowUpNow: false, isStale72h: false })),
  getCompanyInterventionAction: jest.fn(() => null),
}));

jest.mock("../../../utils/companyFollowUp", () => ({
  getCompaniesFollowUpAutomationStats: jest.fn(() => ({})),
  getCompanyFollowUpState: jest.fn(() => ({ status: "unassigned", statusMeta: { label: "", className: "" }, assignedOwner: { id: null, label: "" }, updatedAt: null, nextActionAt: null, lastReminderSentAt: null, lastEscalatedAt: null, history: [] })),
  getCompanyFollowUpAutomationState: jest.fn(() => ({ level: "idle", label: "", badgeClassName: "", description: "", needsReminder: false, needsEscalation: false, needsUrgentEscalation: false })),
  getCompanyFollowUpReminderState: jest.fn(() => ({ isActionable: false, badgeClassName: "", nextActionLabel: "", isMine: false, needsFollowUpToday: false })),
  getCompaniesFollowUpReminderStats: jest.fn(() => ({ myDueToday: 0 })),
}));

import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { apiClient } from "../../../services/apiClient";

const mockedGet = apiClient.get as jest.Mock;
const mockedPost = apiClient.post as jest.Mock;
const mockedPut = apiClient.put as jest.Mock;
const mockedDelete = apiClient.delete as jest.Mock;

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useCompanies", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it("fetches companies on mount", async () => {
    const companies = [
      { id: "1", name: "Test Co", email: "test@test.com", plan: "BASIC", currency: "EGP", isActive: true, createdAt: "2024-01-01" },
    ];
    mockedGet.mockResolvedValueOnce({ data: { success: true, data: { companies } } });

    const { useCompanies } = await import("../hooks/useCompanies");
    const { result } = renderHook(() => useCompanies(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.companies).toHaveLength(1);
    expect(mockedGet).toHaveBeenCalledWith("/admin/companies");
  });

  it("returns empty array on API failure", async () => {
    mockedGet.mockResolvedValueOnce({ data: { success: false, message: "Error" } });

    const { useCompanies } = await import("../hooks/useCompanies");
    const { result } = renderHook(() => useCompanies(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.companies).toEqual([]);
  });

  it("throws on network error", async () => {
    mockedGet.mockRejectedValueOnce(new Error("Network error"));

    const { useCompanies } = await import("../hooks/useCompanies");
    const { result } = renderHook(() => useCompanies(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });
});

describe("useBulkMutations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGet.mockResolvedValue({ data: { success: true, data: { companies: [] } } });
  });

  it("calls bulk-status API on activate", async () => {
    mockedPut.mockResolvedValueOnce({ data: { success: true } });

    const { useBulkMutations } = await import("../hooks/useCompanies");
    const { result } = renderHook(() => useBulkMutations(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.bulkStatus.mutateAsync({ companyIds: ["1", "2"], isActive: true });
    });

    expect(mockedPut).toHaveBeenCalledWith("/admin/companies/bulk-status", { companyIds: ["1", "2"], isActive: true });
  });

  it("calls single delete for one company", async () => {
    mockedDelete.mockResolvedValueOnce({ data: { success: true } });

    const { useBulkMutations } = await import("../hooks/useCompanies");
    const { result } = renderHook(() => useBulkMutations(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.bulkDelete.mutateAsync(["1"]);
    });

    expect(mockedDelete).toHaveBeenCalledWith("/admin/companies/1");
  });

  it("calls bulk-delete for multiple companies", async () => {
    mockedPost.mockResolvedValueOnce({ data: { success: true } });

    const { useBulkMutations } = await import("../hooks/useCompanies");
    const { result } = renderHook(() => useBulkMutations(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.bulkDelete.mutateAsync(["1", "2"]);
    });

    expect(mockedPost).toHaveBeenCalledWith("/admin/companies/bulk-delete", { companyIds: ["1", "2"] });
  });
});

describe("useCompanyMutations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGet.mockResolvedValue({ data: { success: true, data: { companies: [] } } });
  });

  it("calls create company API", async () => {
    mockedPost.mockResolvedValueOnce({ data: { success: true } });
    const payload = { name: "New Co", email: "new@test.com", plan: "BASIC", currency: "EGP" };

    const { useCompanyMutations } = await import("../hooks/useCompanies");
    const { result } = renderHook(() => useCompanyMutations(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.createCompany.mutateAsync(payload);
    });

    expect(mockedPost).toHaveBeenCalledWith("/admin/companies", payload);
  });

  it("calls edit company API", async () => {
    mockedPut.mockResolvedValueOnce({ data: { success: true } });
    const payload = { id: "1", name: "Updated", email: "u@test.com", plan: "PRO", currency: "USD" };

    const { useCompanyMutations } = await import("../hooks/useCompanies");
    const { result } = renderHook(() => useCompanyMutations(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.editCompany.mutateAsync(payload);
    });

    expect(mockedPut).toHaveBeenCalledWith("/admin/companies/1", { name: "Updated", email: "u@test.com", plan: "PRO", currency: "USD" });
  });
});

describe("useFacebookLookup", () => {
  it("searches Facebook pages", async () => {
    const results = [{ id: "fb1", pageId: "123", pageName: "Test Page", isRegistered: false, company: null }];
    mockedGet.mockResolvedValueOnce({ data: { success: true, data: { results } } });

    const { useFacebookLookup } = await import("../hooks/useCompanies");
    const { result } = renderHook(() => useFacebookLookup(), { wrapper: createWrapper() });

    await act(async () => {
      const data = await result.current.mutateAsync("test page");
      expect(data).toEqual(results);
    });

    expect(mockedGet).toHaveBeenCalledWith("/admin/companies/facebook-pages/search?query=test%20page");
  });
});

describe("useFollowUpOwners", () => {
  it("fetches follow-up owners", async () => {
    const owners = [{ id: "u1", firstName: "Admin", lastName: "User", role: "COMPANY_ADMIN" }];
    mockedGet.mockResolvedValueOnce({ data: { success: true, data: { owners } } });

    const { useFollowUpOwners } = await import("../hooks/useCompanies");
    const { result } = renderHook(() => useFollowUpOwners(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(owners);
  });
});

describe("useCompanyUsers", () => {
  it("fetches company users when companyId is provided", async () => {
    const users = [{ id: "u1", firstName: "User", lastName: "One", email: "u@test.com", role: "MANAGER" }];
    mockedGet.mockResolvedValueOnce({ data: { success: true, data: { users } } });

    const { useCompanyUsers } = await import("../hooks/useCompanies");
    const { result } = renderHook(() => useCompanyUsers("company-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(users);
  });

  it("does not fetch when companyId is null", async () => {
    const { useCompanyUsers } = await import("../hooks/useCompanies");
    renderHook(() => useCompanyUsers(null), { wrapper: createWrapper() });

    expect(mockedGet).not.toHaveBeenCalled();
  });
});

describe("useSaveFollowUp", () => {
  it("saves follow-up data", async () => {
    mockedPut.mockResolvedValueOnce({ data: { success: true, data: { followUp: {} } } });

    const { useSaveFollowUp } = await import("../hooks/useCompanies");
    const { result } = renderHook(() => useSaveFollowUp(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ companyId: "1", status: "in_progress", note: "Contacted" });
    });

    expect(mockedPut).toHaveBeenCalledWith("/admin/companies/1/follow-up", { status: "in_progress", note: "Contacted" });
  });
});

describe("useAddEmployee", () => {
  it("adds employee to company", async () => {
    mockedPost.mockResolvedValueOnce({ data: { success: true } });
    const payload = { companyId: "1", firstName: "Emp", lastName: "One", email: "emp@test.com", password: "123456", role: "AGENT" };

    const { useAddEmployee } = await import("../hooks/useCompanies");
    const { result } = renderHook(() => useAddEmployee(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync(payload);
    });

    expect(mockedPost).toHaveBeenCalledWith("/admin/companies/1/employees", { firstName: "Emp", lastName: "One", email: "emp@test.com", password: "123456", role: "AGENT" });
  });
});

describe("useTransferOwnership", () => {
  it("transfers ownership", async () => {
    mockedPost.mockResolvedValueOnce({ data: { success: true } });

    const { useTransferOwnership } = await import("../hooks/useCompanies");
    const { result } = renderHook(() => useTransferOwnership(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ companyId: "1", targetUserId: "u2" });
    });

    expect(mockedPost).toHaveBeenCalledWith("/admin/companies/1/transfer-ownership", { targetUserId: "u2" });
  });
});
