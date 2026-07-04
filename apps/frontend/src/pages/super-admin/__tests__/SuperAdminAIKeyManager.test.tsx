// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import SuperAdminAIKeyManager from "../SuperAdminAIKeyManager";

const { mockUseAiProviders, mockUseAiKeys, mockUseCreateKey, mockUseToggleKeyStatus, mockUseDeleteKey, mockUseTestKey } = vi.hoisted(() => ({
  mockUseAiProviders: vi.fn(),
  mockUseAiKeys: vi.fn(),
  mockUseCreateKey: vi.fn(),
  mockUseToggleKeyStatus: vi.fn(),
  mockUseDeleteKey: vi.fn(),
  mockUseTestKey: vi.fn(),
}));

vi.mock("../../../hooks/useAiAdminData", () => ({
  useAiProviders: mockUseAiProviders,
  useAiKeys: mockUseAiKeys,
}));

vi.mock("../../../hooks/useKeyMutations", () => ({
  useCreateKey: mockUseCreateKey,
  useToggleKeyStatus: mockUseToggleKeyStatus,
  useDeleteKey: mockUseDeleteKey,
  useTestKey: mockUseTestKey,
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

const mockProviders = ["OPENAI", "ANTHROPIC", "GOOGLE"];

const mockKeys = [
  {
    id: "k1",
    name: "Production GPT-4",
    provider: "OPENAI",
    api_key: "sk-prod-abc123",
    key_type: "CENTRAL",
    is_active: true,
  },
  {
    id: "k2",
    name: "Dev Claude",
    provider: "ANTHROPIC",
    api_key: "sk-dev-xyz789",
    key_type: "CENTRAL",
    is_active: false,
  },
];

function buildMockMutation(overrides = {}) {
  return {
    mutate: vi.fn(),
    isPending: false,
    ...overrides,
  };
}

function renderPage() {
  return render(
    <BrowserRouter>
      <SuperAdminAIKeyManager />
    </BrowserRouter>,
  );
}

function mockDataState(providers = mockProviders, keys = mockKeys) {
  mockUseAiProviders.mockReturnValue({
    data: providers,
    isLoading: false,
    error: null,
  });
  mockUseAiKeys.mockReturnValue({ data: keys, isLoading: false, error: null });
  mockUseCreateKey.mockReturnValue(buildMockMutation());
  mockUseToggleKeyStatus.mockReturnValue(buildMockMutation());
  mockUseDeleteKey.mockReturnValue(buildMockMutation());
  mockUseTestKey.mockReturnValue(buildMockMutation());
}

describe("SuperAdminAIKeyManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders page title in Arabic", async () => {
    mockDataState();
    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText("إدارة مفاتيح الذكاء الاصطناعي"),
      ).toBeInTheDocument();
    });
  });

  it("shows loading spinner initially", async () => {
    mockUseAiProviders.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
    mockUseAiKeys.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
    mockUseCreateKey.mockReturnValue(buildMockMutation());
    mockUseToggleKeyStatus.mockReturnValue(buildMockMutation());
    mockUseDeleteKey.mockReturnValue(buildMockMutation());
    mockUseTestKey.mockReturnValue(buildMockMutation());

    renderPage();

    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows error alert when API fails", async () => {
    mockUseAiProviders.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Failed"),
    });
    mockUseAiKeys.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });
    mockUseCreateKey.mockReturnValue(buildMockMutation());
    mockUseToggleKeyStatus.mockReturnValue(buildMockMutation());
    mockUseDeleteKey.mockReturnValue(buildMockMutation());
    mockUseTestKey.mockReturnValue(buildMockMutation());

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText("فشل تحميل البيانات. يرجى المحاولة مرة أخرى."),
      ).toBeInTheDocument();
    });
  });

  it("displays stats cards with correct counts", async () => {
    mockDataState();
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText("3").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("renders key names in the table", async () => {
    mockDataState();
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText("Production GPT-4").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Dev Claude").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows empty state when no keys", async () => {
    mockDataState(mockProviders, []);
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText("لا توجد مفاتيح").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows add key button and opens dialog on click", async () => {
    mockDataState();
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText("إضافة مفتاح").length).toBeGreaterThanOrEqual(1);
    });

    await userEvent.click(screen.getAllByText("إضافة مفتاح")[0]);

    await waitFor(() => {
      expect(
        screen.getAllByText("إضافة مفتاح API جديد").length,
      ).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows active and inactive status badges", async () => {
    mockDataState();
    renderPage();

    await waitFor(() => {
      const activeBtns = screen.getAllByText("نشط");
      const inactiveBtns = screen.getAllByText("غير نشط");
      expect(activeBtns.length).toBeGreaterThanOrEqual(1);
      expect(inactiveBtns.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows provider badges in table", async () => {
    mockDataState();
    renderPage();

    await waitFor(() => {
      const providers = screen.getAllByText("OPENAI");
      expect(providers.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows key type in table cells", async () => {
    mockDataState();
    renderPage();

    await waitFor(() => {
      const typeBadges = screen.getAllByText("CENTRAL");
      expect(typeBadges.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("filters keys by search query", async () => {
    mockDataState();
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText("Production GPT-4").length).toBeGreaterThanOrEqual(1);
    });

    const searchInput = screen.getAllByPlaceholderText("بحث بالاسم...")[0];
    await userEvent.type(searchInput, "Claude");

    await waitFor(() => {
      const names = screen.getAllByText("Dev Claude");
      expect(names.length).toBeGreaterThanOrEqual(1);
    });
  });
});
