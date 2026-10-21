/** @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CustomerList from "../CustomerList";
import { customerService } from "@/services/customerService";

const mockTranslations: Record<string, string> = {
  "customers.pageTitle": "قائمة العملاء",
  "customers.pageSubtitle": "إدارة وتتبع بيانات العملاء والطلبات",
  "customers.addCustomer": "إضافة عميل",
  "customers.importCSV": "استيراد CSV",
  "customers.exportCSV": "تصدير CSV",
  "customers.searchPlaceholder": "بحث بالاسم، البريد أو الهاتف...",
  "customers.tableCustomer": "العميل",
  "customers.tableContactInfo": "بيانات الاتصال",
  "customers.tableStatus": "الحالة",
  "customers.tableStats": "الإحصائيات",
  "customers.tableUpdatedAt": "آخر تحديث",
  "customers.tableActions": "إجراءات",
  "customers.conversations": "المحادثات",
  "customers.orders": "الطلبات",
  "customers.allTags": "كل الوسوم",
  "customers.withOrdersOnly": "مع طلبات فقط",
  "customers.showAllCustomers": "كل العملاء",
  "customers.showing": "عرض",
  "customers.to": "إلى",
  "customers.of": "من",
  "customers.result": "نتيجة",
  "customers.previous": "السابق",
  "customers.next": "التالي",
  "customers.cancelSelection": "إلغاء التحديد",
  "customers.selectedCount": "تم تحديد {{count}} عميل",
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

vi.mock("@/services/customerService", () => ({
  customerService: {
    getCustomers: vi.fn(),
    getDistinctTags: vi.fn().mockResolvedValue([
      { name: "VIP", count: 5 },
      { name: "Cairo", count: 12 },
    ]),
    getStatusOptions: vi.fn().mockReturnValue([
      { value: "ACTIVE", label: "نشط", color: "green" },
      { value: "INACTIVE", label: "غير نشط", color: "gray" },
      { value: "LEAD", label: "محتمل", color: "yellow" },
    ]),
    exportCustomers: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("../CustomerImportModal", () => ({
  default: () => <div data-testid="mock-import-modal" />,
}));

describe("CustomerList Component", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();

    (customerService.getCustomers as any).mockResolvedValue({
      data: [
        {
          id: "cust-1",
          firstName: "أحمد",
          lastName: "علي",
          email: "ahmed@example.com",
          phone: "+201012345678",
          status: "ACTIVE",
          tags: ["VIP", "Cairo"],
          customerRating: "EXCELLENT",
          updatedAt: "2026-10-20T10:00:00Z",
          _count: {
            conversations: 3,
            orders: 7,
          },
        },
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    });
  });

  it("renders page header and customer list table rows", async () => {
    render(
      <MemoryRouter>
        <CustomerList />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("قائمة العملاء")).toBeDefined();
      expect(screen.getByText("إضافة عميل")).toBeDefined();
      expect(screen.getByText("أحمد علي")).toBeDefined();
      expect(screen.getByText("ahmed@example.com")).toBeDefined();
      expect(screen.getByText("+201012345678")).toBeDefined();
      expect(screen.getByText("عميل ممتاز")).toBeDefined();
      expect(screen.getByText("نشط")).toBeDefined();
    });
  });

  it("handles status tab change when clicking tabs", async () => {
    render(
      <MemoryRouter>
        <CustomerList />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("أحمد علي")).toBeDefined();
    });

    const activeTab = screen.getByText("نشطون");
    fireEvent.click(activeTab);

    await waitFor(() => {
      expect(customerService.getCustomers).toHaveBeenCalled();
    });
  });

  it("toggles select all and customer row selection", async () => {
    render(
      <MemoryRouter>
        <CustomerList />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("أحمد علي")).toBeDefined();
    });

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBeGreaterThanOrEqual(2);

    // Toggle row checkbox
    fireEvent.click(checkboxes[1]);

    await waitFor(() => {
      expect(screen.getByText("إلغاء التحديد")).toBeDefined();
    });
  });
});
