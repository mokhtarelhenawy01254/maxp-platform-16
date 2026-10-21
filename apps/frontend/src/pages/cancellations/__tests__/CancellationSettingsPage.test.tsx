// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import CancellationSettingsPage from "../CancellationSettingsPage";
import { cancellationService } from "../../../services/cancellationService";

vi.mock("../../../services/cancellationService", () => ({
  cancellationService: {
    getCategories: vi.fn(),
    getReasons: vi.fn(),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    createReason: vi.fn(),
    updateReason: vi.fn(),
    deleteReason: vi.fn(),
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "cancellations.k_43": "إعدادات أسباب الإلغاء",
        "cancellations.k_44": "إدارة تصنيفات وأسباب إلغاء الطلبات",
        "cancellations.k_45": "إضافة الأسباب الافتراضية",
        "cancellations.k_46": "التصنيفات",
        "cancellations.k_47": "+ إضافة تصنيف",
        "cancellations.k_48": "أسباب الإلغاء",
        "cancellations.k_49": "+ إضافة سبب",
        "cancellations.k_50": "نشط",
        "cancellations.k_51": "غير نشط",
        "cancellations.k_30": "جاري التحميل...",
        "cancellations.k_31": "لا توجد تصنيفات",
        "cancellations.k_32": "السبب",
        "cancellations.k_33": "التصنيف",
        "cancellations.k_34": "الحالة",
        "cancellations.k_35": "الإجراءات",
        "cancellations.k_36": "لا توجد أسباب مضافة",
        "cancellations.k_37": "غير محدد",
        "cancellations.k_38": "تعديل التصنيف",
        "cancellations.k_39": "إضافة تصنيف جديد",
        "cancellations.k_40": "تعديل السبب",
        "cancellations.k_41": "إضافة سبب جديد",
        "cancellations.k_42": "اختر التصنيف...",
        "cancellations.k_52": "اسم التصنيف",
        "cancellations.k_53": "إلغاء",
        "cancellations.k_54": "حفظ",
        "cancellations.k_55": "نص السبب",
        "cancellations.k_56": "الوصف (اختياري)",
      };
      return translations[key] || key;
    },
  }),
}));

const mockCategories = [
  { id: "cat-1", name: "مشاكل الشحن", createdAt: "2026-01-01" },
  { id: "cat-2", name: "تغيير رأي العميل", createdAt: "2026-01-02" },
];

const mockReasons = [
  {
    id: "res-1",
    reason: "تأخر الشحن",
    description: "تأخرت الشحنة أكثر من 5 أيام",
    categoryId: "cat-1",
    isActive: true,
    category: mockCategories[0],
  },
  {
    id: "res-2",
    reason: "وجد سعراً أفضل",
    description: "طلب العميل إلغاء الطلب لوجود عرض بديل",
    categoryId: "cat-2",
    isActive: false,
    category: mockCategories[1],
  },
];

describe("CancellationSettingsPage Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cancellationService.getCategories).mockResolvedValue({
      data: mockCategories,
    } as unknown as Awaited<ReturnType<typeof cancellationService.getCategories>>);
    vi.mocked(cancellationService.getReasons).mockResolvedValue({
      data: mockReasons,
    } as unknown as Awaited<ReturnType<typeof cancellationService.getReasons>>);
  });

  afterEach(() => {
    cleanup();
  });

  it("renders categories and cancellation reasons table cleanly", async () => {
    render(<CancellationSettingsPage />);

    expect(screen.getAllByText("جاري التحميل...").length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getAllByText("مشاكل الشحن").length).toBeGreaterThan(0);
      expect(screen.getAllByText("تغيير رأي العميل").length).toBeGreaterThan(0);
      expect(screen.getByText("تأخر الشحن")).toBeInTheDocument();
      expect(screen.getByText("وجد سعراً أفضل")).toBeInTheDocument();
      expect(screen.getByText(/^\s*نشط\s*$/)).toBeInTheDocument();
      expect(screen.getByText(/^\s*غير نشط\s*$/)).toBeInTheDocument();
    });
  });

  it("opens CategoryModal, fills input, and saves new category", async () => {
    const user = userEvent.setup();
    vi.mocked(cancellationService.createCategory).mockResolvedValue({
      data: { id: "cat-3", name: "جودة المنتج" },
    } as unknown as Awaited<ReturnType<typeof cancellationService.createCategory>>);

    render(<CancellationSettingsPage />);
    await waitFor(() => expect(screen.getAllByText("مشاكل الشحن").length).toBeGreaterThan(0));

    const addCatBtn = screen.getByRole("button", { name: "+ إضافة تصنيف" });
    await user.click(addCatBtn);

    expect(screen.getByText("إضافة تصنيف جديد")).toBeInTheDocument();

    const input = screen.getByRole("textbox");
    await user.type(input, "جودة المنتج");

    const saveBtn = screen.getByRole("button", { name: "حفظ" });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(cancellationService.createCategory).toHaveBeenCalledWith({ name: "جودة المنتج" });
    });
  });

  it("opens ReasonModal, fills inputs, and creates new reason", async () => {
    const user = userEvent.setup();
    vi.mocked(cancellationService.createReason).mockResolvedValue({
      data: { id: "res-3", reason: "منتج تالف", categoryId: "cat-1" },
    } as unknown as Awaited<ReturnType<typeof cancellationService.createReason>>);

    render(<CancellationSettingsPage />);
    await waitFor(() => expect(screen.getAllByText("مشاكل الشحن").length).toBeGreaterThan(0));

    const addReasonBtn = screen.getByRole("button", { name: "+ إضافة سبب" });
    await user.click(addReasonBtn);

    expect(screen.getByText("إضافة سبب جديد")).toBeInTheDocument();

    const textInputs = screen.getAllByRole("textbox");
    await user.type(textInputs[0], "منتج تالف");

    const select = screen.getByRole("combobox");
    await user.selectOptions(select, "cat-1");

    const saveBtn = screen.getByRole("button", { name: "حفظ" });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(cancellationService.createReason).toHaveBeenCalledWith({
        reason: "منتج تالف",
        description: "",
        categoryId: "cat-1",
      });
    });
  });
});
