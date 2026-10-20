// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import WhatsAppSettings from "../../WhatsAppSettings";

// Mock apiClient
// Mock apiClient
vi.mock("@/services/apiClient", () => ({
  apiClient: {
    get: vi.fn((url: string) => {
      if (url === "/whatsapp/sessions") {
        return Promise.resolve({
          data: {
            sessions: [
              {
                id: "sess_1",
                name: "Customer Support 1",
                phoneNumber: "201001234567",
                status: "CONNECTED",
                liveStatus: "connected",
                qrCode: null,
                autoReply: true,
                welcomeMessage: "Welcome!",
                awayMessage: "We are away",
                workingHoursEnabled: false,
                workingHours: null,
                isDefault: true,
                createdAt: "2026-01-01T00:00:00Z",
                provider: "BAILEYS",
                _count: {
                  messages: 1420,
                  contacts: 350,
                },
              },
              {
                id: "sess_2",
                name: "Sales Meta Cloud",
                phoneNumber: "201119876543",
                status: "DISCONNECTED",
                liveStatus: "disconnected",
                qrCode: null,
                autoReply: false,
                welcomeMessage: null,
                awayMessage: null,
                workingHoursEnabled: false,
                workingHours: null,
                isDefault: false,
                createdAt: "2026-02-01T00:00:00Z",
                provider: "META_CLOUD",
                metaPhoneNumberId: "1234567890",
                metaWabaId: "987654321",
                metaBusinessId: "555444333",
                metaDisplayPhoneNumber: "+20 111 987 6543",
                _count: {
                  messages: 80,
                  contacts: 15,
                },
              },
            ],
          },
        });
      }
      if (url === "/whatsapp/settings") {
        return Promise.resolve({
          data: {
            settings: {
              id: "ws_1",
              isEnabled: true,
              maxSessions: 5,
              notificationSound: true,
              browserNotifications: true,
              maxImageSize: 10,
              maxVideoSize: 25,
              maxDocumentSize: 50,
              autoCompressImages: true,
              autoArchiveDays: 30,
            },
          },
        });
      }
      if (url === "/whatsapp/quick-replies") {
        return Promise.resolve({
          data: {
            quickReplies: [
              {
                id: "qr_1",
                title: "مرحباً بكم",
                shortcut: "/hi",
                content: "أهلاً بك في متجرنا",
                category: "welcome",
                usageCount: 42,
                isActive: true,
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: {} });
    }),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

// Mock useSocket
vi.mock("../../../../hooks/useSocket", () => ({
  default: () => ({
    socket: {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    },
  }),
}));

// Mock indexedDBStorage
vi.mock("../../../../services/indexedDBStorage", () => ({
  indexedDBStorage: {
    getItem: vi.fn(() => Promise.resolve(null)),
    setItem: vi.fn(() => Promise.resolve()),
    removeItem: vi.fn(() => Promise.resolve()),
  },
}));

const mockTranslations: Record<string, string> = {
  "whatsappSettings.title": "إعدادات واتساب",
  "whatsappSettings.description": "إدارة جلسات واتساب والربط المباشر",
  "whatsappSettings.sidebarTitle": "جلسات واتساب",
  "whatsappSettings.generalSettings": "الإعدادات العامة",
  "whatsappSettings.quickReplies": "الردود السريعة",
  "whatsappSettings.businessProfile": "الملف التجاري",
  "whatsappSettings.privacy": "الخصوصية",
  "whatsappSettings.privacySettings": "إعدادات الخصوصية",
  "whatsappSettings.labels": "التصنيفات",
  "whatsappSettings.manageLabels": "إدارة التصنيفات",
  "whatsappSettings.connected": "متصل",
  "whatsappSettings.disconnected": "غير متصل",
  "whatsappSettings.messages": "الرسائل",
  "whatsappSettings.addSession": "إضافة جلسة",
  "whatsappSettings.update": "تحديث",
  "whatsappSettings.default": "افتراضي",
  "common.back": "رجوع",
};

const stableT = (key: string, opts?: Record<string, unknown>) => {
  if (key === "whatsappSettings.usedTimes" && opts?.count) {
    return `استخدمت ${opts.count} مرة`;
  }
  return mockTranslations[key] || key;
};

const stableI18n = {
  language: "ar",
  dir: () => "rtl",
};

// Mock i18next
vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-i18next")>();
  return {
    ...actual,
    useTranslation: () => ({
      t: stableT,
      i18n: stableI18n,
    }),
  };
});

describe("WhatsAppSettings Monolithic Deconstruction (Batch 326)", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  it("renders page header, metric cards, and sessions correctly", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/whatsapp/settings?tab=sessions"]}>
          <WhatsAppSettings />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Verify session names render
    await waitFor(() => {
      expect(screen.getByText("Customer Support 1")).toBeInTheDocument();
      expect(screen.getByText("Sales Meta Cloud")).toBeInTheDocument();
    });

    // Verify provider badges
    expect(screen.getByText("ربط الهاتف المباشر (QR)")).toBeInTheDocument();
    expect(screen.getByText("ميتا كلاود الرسمي")).toBeInTheDocument();

    // Verify phone numbers with tabular numbers
    expect(screen.getByText("201001234567")).toBeInTheDocument();
    expect(screen.getByText("+20 111 987 6543")).toBeInTheDocument();
  });

  it("renders metric cards with correct counts", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/whatsapp/settings?tab=sessions"]}>
          <WhatsAppSettings />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Customer Support 1")).toBeInTheDocument();
    });

    // Total messages = 1420 + 80 = 1500
    expect(screen.getAllByText("1500").length).toBeGreaterThan(0);
    // Contacts = 350 + 15 = 365
    expect(screen.getAllByText("365").length).toBeGreaterThan(0);
  });

  it("renders sidebar navigation with all tabs", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/whatsapp/settings?tab=sessions"]}>
          <WhatsAppSettings />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getAllByText("جلسات واتساب").length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText("الإعدادات العامة").length).toBeGreaterThan(0);
    expect(screen.getAllByText("نافذة 24 ساعة و SMS").length).toBeGreaterThan(0);
    expect(screen.getAllByText("الردود السريعة").length).toBeGreaterThan(0);
    expect(screen.getAllByText("الملف التجاري").length).toBeGreaterThan(0);
    expect(screen.getAllByText("الخصوصية").length).toBeGreaterThan(0);
    expect(screen.getAllByText("التصنيفات").length).toBeGreaterThan(0);
  });
});
