// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import DentalLabSettingsTab from "../../DentalLabSettingsTab";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

// Mock policy child sections
vi.mock("../DentalPoliciesSection", () => ({
  default: () => <div data-testid="dental-policies-section">DentalPoliciesSection</div>,
}));

vi.mock("../DentalFinancialPoliciesSection", () => ({
  default: () => <div data-testid="dental-financial-policies-section">DentalFinancialPoliciesSection</div>,
}));

// Hoisted mock data
const { mockSettings, mockCustomFields } = vi.hoisted(() => {
  const mockSettings = {
    workOrderHeader: {
      labName: "معمل النخبة لتعويضات الأسنان",
      address: "مدينة نصر - القاهرة",
      phone: "+201001234567",
    },
    stageTemplates: {
      CROWN: ["صب القالب", "المسح والتصميم CAD", "الخراطة CAM", "التلبين والتلوين"],
    },
    whatsappTemplates: {
      ready: "مرحباً دكتور، طلبكم جاهز للتسليم.",
      received: "تم استلام المقاس وسنبدأ العمل فوراً.",
      overdue: "تنبيه: الحالة متأخرة في مرحلة التصميم.",
    },
    wages: {
      defaultPerStage: 45,
    },
    notifications: {
      dunningEnabled: true,
      dunningAgingDays: 20,
    },
    billingPolicy: {
      invoiceMode: "AUTO_ON_DELIVERY",
      requireInvoiceBeforeDelivery: true,
      requireFullPaymentBeforeDelivery: false,
      enforceCreditLimit: true,
    },
    guards: {
      requireQualityCheckBeforeReady: true,
    },
  };

  const mockCustomFields = [
    {
      id: "cf-1",
      name: "لون العضة الشمعية",
      fieldType: "TEXT",
      isActive: true,
    },
    {
      id: "cf-2",
      name: "تاريخ تجربة التجنيح",
      fieldType: "DATE",
      isActive: false,
    },
  ];

  return { mockSettings, mockCustomFields };
});

// Mock shared API methods
vi.mock("../../shared", () => ({
  fetchSettings: vi.fn(async () => JSON.parse(JSON.stringify(mockSettings))),
  saveSettings: vi.fn(async () => ({ success: true })),
  fetchCustomFields: vi.fn(async () => JSON.parse(JSON.stringify(mockCustomFields))),
  createCustomField: vi.fn(async (data: unknown) => ({ id: "cf-new", ...(data as object) })),
  updateCustomField: vi.fn(async (id: string, data: unknown) => ({ id, ...(data as object) })),
  deleteCustomField: vi.fn(async () => ({ success: true })),
  WORK_TYPE_CATEGORIES: ["CROWN", "BRIDGE", "REMOVABLE", "IMPLANT", "ORTHO"],
  tKey: (_t: unknown, key: string) => key,
  MODAL_INPUT_CLS: "w-full border rounded-lg px-3 py-2 text-sm",
  fmtMoney: (v: number) => `${Number(v).toLocaleString("en-US")} ج.م`,
}));

describe("DentalLabSettingsTab (Batch 342 Modular Deconstruction)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const renderComponent = (initialRoute = "/dental-lab/settings/general") => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/dental-lab/settings/*" element={<DentalLabSettingsTab />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it("1. renders settings tab header and sidebar navigation", async () => {
    renderComponent();

    expect(screen.getByText("dentalLab.tabs.settings")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("dentalLab.settings.sections.general")).toBeInTheDocument();
      expect(screen.getByText("dentalLab.settings.sections.stages")).toBeInTheDocument();
      expect(screen.getByText("dentalLab.settings.sections.whatsapp")).toBeInTheDocument();
      expect(screen.getByText("dentalLab.settings.sections.fields")).toBeInTheDocument();
      expect(screen.getByText("dentalLab.settings.sections.wages")).toBeInTheDocument();
      expect(screen.getByText("dentalLab.settings.sections.dunning")).toBeInTheDocument();
      expect(screen.getByText("dentalLab.settings.sections.billing")).toBeInTheDocument();
    });
  });

  it("2. loads and populates initial general settings in input fields", async () => {
    renderComponent("/dental-lab/settings/general");

    await waitFor(() => {
      const labNameInput = screen.getByDisplayValue("معمل النخبة لتعويضات الأسنان");
      expect(labNameInput).toBeInTheDocument();
      expect(screen.getByDisplayValue("مدينة نصر - القاهرة")).toBeInTheDocument();
      expect(screen.getByDisplayValue("+201001234567")).toBeInTheDocument();
    });
  });

  it("3. switches to wages section when clicking wages navigation item", async () => {
    renderComponent("/dental-lab/settings/general");

    await waitFor(() => {
      expect(screen.getByText("dentalLab.settings.sections.wages")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("dentalLab.settings.sections.wages"));

    await waitFor(() => {
      expect(screen.getByText("dentalLab.settings.wages.title")).toBeInTheDocument();
      expect(screen.getByDisplayValue("45")).toBeInTheDocument();
    });
  });

  it("4. switches to dunning section and reflects notification settings", async () => {
    renderComponent("/dental-lab/settings/dunning");

    await waitFor(() => {
      expect(screen.getByText("dentalLab.settings.dunning.title")).toBeInTheDocument();
      expect(screen.getByDisplayValue("20")).toBeInTheDocument();
    });
  });

  it("5. switches to whatsapp section and displays templates", async () => {
    renderComponent("/dental-lab/settings/whatsapp");

    await waitFor(() => {
      expect(screen.getByText("dentalLab.settings.whatsappTemplates")).toBeInTheDocument();
      expect(
        screen.getByDisplayValue("مرحباً دكتور، طلبكم جاهز للتسليم.")
      ).toBeInTheDocument();
    });
  });

  it("6. updates general settings, marks dirty, and saves successfully", async () => {
    const { saveSettings } = await import("../../shared");

    renderComponent("/dental-lab/settings/general");

    await waitFor(() => {
      expect(screen.getByDisplayValue("معمل النخبة لتعويضات الأسنان")).toBeInTheDocument();
    });

    // Save button should initially be disabled because there are no changes
    const saveBtn = screen.getByRole("button", { name: /dentalLab.common.save/i });
    expect(saveBtn).toBeDisabled();

    // Edit lab name
    const labNameInput = screen.getByDisplayValue("معمل النخبة لتعويضات الأسنان");
    fireEvent.change(labNameInput, { target: { value: "معمل النخبة الدولي المطور" } });

    // Now save button should be enabled
    expect(saveBtn).not.toBeDisabled();

    // Click save
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          workOrderHeader: expect.objectContaining({
            labName: "معمل النخبة الدولي المطور",
          }),
        })
      );
    });
  });

  it("7. renders custom fields and indicates active state", async () => {
    renderComponent("/dental-lab/settings/fields");

    await waitFor(() => {
      expect(screen.getByText("dentalLab.settings.customFields")).toBeInTheDocument();
      expect(screen.getByText("لون العضة الشمعية")).toBeInTheDocument();
      expect(screen.getByText("تاريخ تجربة التجنيح")).toBeInTheDocument();
    });
  });
});
