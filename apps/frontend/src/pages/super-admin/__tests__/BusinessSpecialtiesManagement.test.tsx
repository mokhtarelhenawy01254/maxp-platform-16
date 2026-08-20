import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import BusinessSpecialtiesManagement from "../BusinessSpecialtiesManagement";

const listSpecialtiesMock = jest.fn();
const listAppOptionsMock = jest.fn();
const createSpecialtyMock = jest.fn();
const updateSpecialtyMock = jest.fn();
const removeSpecialtyMock = jest.fn();

jest.mock("sonner", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("../../../components/ui/scroll-area", () => ({
  ScrollArea: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>{children}</div>
  ),
}));

jest.mock("../../../services/businessSpecialtyService", () => ({
  __esModule: true,
  businessSpecialtyService: {
    listSpecialties: (...args: unknown[]) => listSpecialtiesMock(...args),
    listAppOptions: (...args: unknown[]) => listAppOptionsMock(...args),
    createSpecialty: (...args: unknown[]) => createSpecialtyMock(...args),
    updateSpecialty: (...args: unknown[]) => updateSpecialtyMock(...args),
    removeSpecialty: (...args: unknown[]) => removeSpecialtyMock(...args),
  },
  default: {
    listSpecialties: (...args: unknown[]) => listSpecialtiesMock(...args),
    listAppOptions: (...args: unknown[]) => listAppOptionsMock(...args),
    createSpecialty: (...args: unknown[]) => createSpecialtyMock(...args),
    updateSpecialty: (...args: unknown[]) => updateSpecialtyMock(...args),
    removeSpecialty: (...args: unknown[]) => removeSpecialtyMock(...args),
  },
}));

const sampleSpecialty = {
  id: "bizsp_ecommerce_retail",
  slug: "ecommerce-retail",
  nameAr: "التجارة والمتاجر",
  nameEn: "E-commerce & Retail",
  descriptionAr: "متجر إلكتروني ومنتجات وطلبات.",
  descriptionEn: "Online store, products and orders.",
  icon: "ShoppingBag",
  appSlugs: ["store-basic", "crm-lite", "analytics-basic"],
  autoInstallOnSignup: true,
  sortOrder: 10,
  isActive: true,
  companyCount: 4,
};

const sampleOptions = [
  {
    id: "app-store",
    slug: "store-basic",
    name: "المتجر الأساسي",
    nameEn: "Store Basic",
    category: "ECOMMERCE",
    icon: "Store",
  },
  {
    id: "app-crm",
    slug: "crm-lite",
    name: "إدارة العملاء",
    nameEn: "CRM Lite",
    category: "crm",
    icon: "Users",
  },
  {
    id: "app-analytics",
    slug: "analytics-basic",
    name: "التحليلات",
    nameEn: "Analytics",
    category: "general",
    icon: "BarChart",
  },
];

describe("BusinessSpecialtiesManagement page", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    listSpecialtiesMock.mockResolvedValue([sampleSpecialty]);
    listAppOptionsMock.mockResolvedValue(sampleOptions);
    removeSpecialtyMock.mockResolvedValue({
      specialty: null,
    });
  });

  test("loads specialties and app options and renders the surface", async () => {
    render(<BusinessSpecialtiesManagement />);

    await waitFor(() => {
      expect(listSpecialtiesMock).toHaveBeenCalled();
      expect(listAppOptionsMock).toHaveBeenCalled();
    });

    expect(
      (await screen.findAllByText(/التجارة والمتاجر/i)).length,
    ).toBeGreaterThan(0);
    expect(
      (await screen.findAllByText(/المتجر الأساسي/i)).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: /إنشاء نشاط/i }),
    ).toBeInTheDocument();
  });

  test("opens create dialog from the hero action", async () => {
    render(<BusinessSpecialtiesManagement />);

    expect((await screen.findAllByText(/التجارة والمتاجر/i)).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /إنشاء نشاط/i }));

    expect(
      await screen.findByText(/إنشاء نشاط تجاري جديد/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/الاسم بالعربي/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/الاسم بالإنجليزي/i)).toBeInTheDocument();
  });

  test("shows existing app selections inside the edit dialog", async () => {
    render(<BusinessSpecialtiesManagement />);

    expect((await screen.findAllByText(/التجارة والمتاجر/i)).length).toBeGreaterThan(0);

    fireEvent.click(
      screen.getAllByRole("button", { name: /تعديل النشاط التجارة والمتاجر/i })[0]!,
    );

    expect(
      await screen.findByText(/تعديل النشاط التجاري/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/الاسم بالعربي/i)).toHaveValue(
      "التجارة والمتاجر",
    );
  });

  test("opens delete confirmation for a specialty row", async () => {
    render(<BusinessSpecialtiesManagement />);

    expect((await screen.findAllByText(/التجارة والمتاجر/i)).length).toBeGreaterThan(0);

    fireEvent.click(
      screen.getAllByRole("button", { name: /حذف النشاط التجارة والمتاجر/i })[0]!,
    );

    expect(
      await screen.findByText(/حذف النشاط التجاري/i),
    ).toBeInTheDocument();
  });
});