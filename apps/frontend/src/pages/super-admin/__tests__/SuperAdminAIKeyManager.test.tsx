// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
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

const mockProviders = [
  { name: "OPENAI", display_name: "OpenAI", adapter_type: "openai_compat", base_url: "https://api.openai.com/v1", default_model: "gpt-4o-mini", is_active: true },
  { name: "ANTHROPIC", display_name: "Anthropic Claude", adapter_type: "anthropic_native", base_url: "https://api.anthropic.com", default_model: "claude-3-5-sonnet-20241022", is_active: true },
  { name: "GOOGLE", display_name: "Google Gemini", adapter_type: "openai_compat", base_url: "https://generativelanguage.googleapis.com/v1beta/openai/", default_model: "gemma-3-27b-it", is_active: true },
];

const mockKeys = [
  {
    id: "k1",
    name: "Production GPT-4",
    provider: "OPENAI",
    api_key_masked: "sk-****...c123",
    key_type: "CENTRAL",
    is_active: true,
  },
  {
    id: "k2",
    name: "Dev Claude",
    provider: "ANTHROPIC",
    api_key_masked: "sk-****...789",
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

  afterEach(() => {
    cleanup();
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

  it("shows masked api_key in each key row", async () => {
    mockDataState();
    const { container } = render(
      <BrowserRouter>
        <SuperAdminAIKeyManager />
      </BrowserRouter>,
    );

    await waitFor(() => {
      const cells = container.querySelectorAll(".font-mono.text-xs");
      const maskedKeys = Array.from(cells).map((c) => c.textContent);
      expect(maskedKeys.filter((k) => k?.startsWith("sk-")).length).toBe(2);
      expect(maskedKeys.some((k) => k === "sk-****...c123")).toBe(true);
    });
  });

  it("renders test buttons for each key", async () => {
    mockDataState();
    const { container } = render(
      <BrowserRouter>
        <SuperAdminAIKeyManager />
      </BrowserRouter>,
    );

    await waitFor(() => {
      const testButtons = container.querySelectorAll('button[title="اختبار المفتاح"]');
      expect(testButtons.length).toBe(2);
    });
  });

  it("shows test result dialog on successful test", async () => {
    const testResult = { ok: true, latency_ms: 200, model: "gpt-4", reply: "Hello" };
    const testMutation = buildMockMutation({
      mutate: vi.fn((_keyId, { onSuccess }) => {
        onSuccess(testResult);
      }),
    });
    mockDataState();
    mockUseTestKey.mockReturnValue(testMutation);
    const { container } = render(
      <BrowserRouter>
        <SuperAdminAIKeyManager />
      </BrowserRouter>,
    );

    let testBtn: HTMLElement | null = null;
    await waitFor(() => {
      testBtn = container.querySelector('button[title="اختبار المفتاح"]');
      expect(testBtn).not.toBeNull();
    });

    await userEvent.click(testBtn!);

    expect(testMutation.mutate).toHaveBeenCalledWith("k1", expect.any(Object));

    await waitFor(() => {
      expect(screen.getByText("نتيجة الاختبار — Production GPT-4")).toBeInTheDocument();
      expect(screen.getByText("نجاح")).toBeInTheDocument();
      expect(screen.getByText("200ms")).toBeInTheDocument();
      expect(screen.getByText("gpt-4")).toBeInTheDocument();
    });
  });

  it("shows test error in result dialog", async () => {
    const testMutation = buildMockMutation({
      mutate: vi.fn((_keyId, { onError }) => {
        onError(new Error("Connection refused"));
      }),
    });
    mockDataState();
    mockUseTestKey.mockReturnValue(testMutation);
    const { container } = render(
      <BrowserRouter>
        <SuperAdminAIKeyManager />
      </BrowserRouter>,
    );

    let testBtn: HTMLElement | null = null;
    await waitFor(() => {
      testBtn = container.querySelector('button[title="اختبار المفتاح"]');
      expect(testBtn).not.toBeNull();
    });

    await userEvent.click(testBtn!);

    await waitFor(() => {
      expect(screen.getByText("Connection refused")).toBeInTheDocument();
    });
  });
});
