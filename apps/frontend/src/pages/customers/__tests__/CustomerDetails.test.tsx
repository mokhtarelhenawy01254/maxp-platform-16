/** @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import CustomerDetails from "../CustomerDetails";
import { apiClient } from "@/services/apiClient";

const mockTranslations: Record<string, string> = {
  "customers.contactInfo": "معلومات الاتصال",
  "customers.tagsLabel": "الوسوم",
  "customers.noTags": "لا توجد وسوم",
  "customers.addTagPlaceholder": "أضف وسم جديد...",
  "customers.tabs.info": "المعلومات",
  "customers.tabs.notes": "الملاحظات",
  "customers.tabs.activity": "النشاط",
  "customers.tabs.loyalty": "الولاء والنقاط",
  "customers.tabs.journey": "رحلة العميل",
  "customers.totalSpent": "إجمالي المشتريات",
  "customers.averageOrder": "متوسط الطلب",
  "orders.title": "الطلبات",
  "orders.orderNumber": "رقم الطلب",
  "sidebar.conversations": "المحادثات",
  "sidebar.orders": "الطلبات",
  "common.export": "تصدير",
  "common.edit": "تعديل",
  "common.delete": "حذف",
  "common.backToList": "العودة للقائمة",
};

const mockT = (key: string) => mockTranslations[key] || key;

vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-i18next")>();
  return {
    ...actual,
    useTranslation: () => ({
      t: mockT,
      i18n: { language: "ar" },
    }),
  };
});

vi.mock("@/hooks/useAuthSimple", () => ({
  useAuth: () => ({
    user: { id: "u-1", role: "OWNER" },
  }),
}));

vi.mock("@/hooks/useDateFormat", () => ({
  useDateFormat: () => ({
    formatDate: (d: string) => (d ? d.substring(0, 10) : "-"),
  }),
}));

vi.mock("@/services/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../CustomerLoyaltyTab", () => ({
  default: () => <div data-testid="mock-loyalty-tab">Loyalty Content</div>,
}));

vi.mock("../CustomerJourneyTab", () => ({
  default: () => <div data-testid="mock-journey-tab">Journey Content</div>,
}));

describe("CustomerDetails Component", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();

    (apiClient.get as any).mockResolvedValue({
      data: {
        success: true,
        data: {
          customer: {
            id: "cust-123",
            firstName: "محمود",
            lastName: "عثمان",
            email: "mahmoud@example.com",
            phone: "+201099887766",
            address: "المعادي، القاهرة",
            city: "القاهرة",
            country: "مصر",
            status: "ACTIVE",
            tags: ["VIP", "Wholesale"],
            customerRating: "EXCELLENT",
            deliveryRate: 95,
            totalDelivered: 19,
            totalOrdersCount: 20,
            createdAt: "2026-01-15T12:00:00Z",
            updatedAt: "2026-10-18T10:00:00Z",
          },
          stats: {
            ordersCount: 20,
            conversationsCount: 14,
            totalSpent: 48000,
            averageOrderValue: 2400,
            deliveryRate: 95,
            totalDelivered: 19,
            totalOrdersCount: 20,
          },
          recentOrders: [
            {
              id: "ord-1",
              orderNumber: "1055",
              status: "DELIVERED",
              total: 2500,
              createdAt: "2026-10-15T10:00:00Z",
            },
          ],
          recentConversations: [
            {
              id: "conv-1",
              channel: "WHATSAPP",
              status: "CLOSED",
              lastMessageAt: "2026-10-16T14:00:00Z",
              createdAt: "2026-10-16T10:00:00Z",
            },
          ],
          notes: [
            {
              id: "note-1",
              content: "عميل منتظم ومفضل، يفضل التوصيل صباحاً",
              createdAt: "2026-10-10T12:00:00Z",
              author: {
                firstName: "سارة",
                lastName: "كمال",
              },
            },
          ],
          activities: [
            {
              type: "order",
              id: "act-1",
              title: "طلب جديد #1055",
              status: "تم التسليم",
              value: 2500,
              timestamp: "2026-10-15T10:00:00Z",
            },
          ],
          loyalty: [
            {
              programId: "p-1",
              programName: "برنامج النقاط الذهبي",
              points: 350,
              totalEarned: 500,
              status: "ACTIVE",
            },
          ],
          wallet: {
            balance: 150,
            totalEarned: 300,
            totalSpent: 150,
            currency: "EGP",
          },
          cashbackTotal: 250,
        },
      },
    });
  });

  it("renders customer details header, stats cards, and contact info", async () => {
    render(
      <MemoryRouter initialEntries={["/customers/cust-123"]}>
        <Routes>
          <Route path="/customers/:id" element={<CustomerDetails />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("محمود عثمان")).toBeDefined();
      expect(screen.getByText("ACTIVE")).toBeDefined();
      expect(screen.getByText("mahmoud@example.com")).toBeDefined();
      expect(screen.getByText("+201099887766")).toBeDefined();
      expect(screen.getByText(/المعادي/)).toBeDefined();
      expect(screen.getByText("95%")).toBeDefined();
    });
  });

  it("switches to orders tab and displays order rows", async () => {
    render(
      <MemoryRouter initialEntries={["/customers/cust-123"]}>
        <Routes>
          <Route path="/customers/:id" element={<CustomerDetails />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("محمود عثمان")).toBeDefined();
    });

    // Click Orders tab button
    const ordersTabBtn = screen.getByRole("button", { name: "الطلبات" });
    fireEvent.click(ordersTabBtn);

    await waitFor(() => {
      expect(screen.getByText("#1055")).toBeDefined();
      expect(screen.getByText("DELIVERED")).toBeDefined();
    });
  });

  it("switches to notes tab and displays existing notes", async () => {
    render(
      <MemoryRouter initialEntries={["/customers/cust-123"]}>
        <Routes>
          <Route path="/customers/:id" element={<CustomerDetails />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("محمود عثمان")).toBeDefined();
    });

    // Click Notes tab
    const notesTab = screen.getByText("الملاحظات");
    fireEvent.click(notesTab);

    await waitFor(() => {
      expect(
        screen.getByText("عميل منتظم ومفضل، يفضل التوصيل صباحاً"),
      ).toBeDefined();
      expect(screen.getByText(/سارة كمال/)).toBeDefined();
    });
  });
});
