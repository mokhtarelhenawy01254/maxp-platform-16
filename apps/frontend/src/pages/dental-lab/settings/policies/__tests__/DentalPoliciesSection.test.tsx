// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import DentalPoliciesSection from "../../DentalPoliciesSection";
import { apiClient } from "@/services/apiClient";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

// Mock DentalDryRunModal
vi.mock("../../DentalDryRunModal", () => ({
  default: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? (
      <div data-testid="dry-run-modal">
        <p>Dry Run Modal</p>
        <button onClick={onClose}>إغلاق المحاكاة</button>
      </div>
    ) : null,
}));

// Mock apiClient
vi.mock("@/services/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
  },
}));

const mockLoadedPolicies = {
  assignment: {
    mode: "SUGGEST",
    strategy: "LEAST_LOADED",
    respectSchedule: true,
    dailyCapPerTechnician: 10,
  },
  dueDate: {
    defaultLeadDays: 4,
    urgentRule: "PERCENT",
    urgentValue: 40,
    minDays: 2,
  },
  fields: {
    patientPhoneRequired: true,
    requireToothAndShade: false,
  },
  escalation: {
    enabled: true,
    afterHoursInStage: 48,
    target: "BACKUP_ROLE",
    notify: true,
  },
  notify: {
    doctorEnabled: true,
    patientEnabled: true,
  },
};

describe("DentalPoliciesSection (Batch 346 Modular Deconstruction)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: { policies: mockLoadedPolicies } },
    });
    (apiClient.put as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { success: true },
    });
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: { escalatedCount: 2 } },
    });
  });

  afterEach(() => {
    cleanup();
  });

  const renderSection = () => {
    return render(<DentalPoliciesSection />);
  };

  it("1. renders header, title, and calls GET /dental-lab/policies", async () => {
    renderSection();

    await waitFor(() => {
      expect(
        screen.getByText("الأتمتة والسياسات التشغيلية")
      ).toBeInTheDocument();
      expect(screen.getByText("محاكاة حالة (Dry-Run)")).toBeInTheDocument();
      expect(screen.getByText("حفظ السياسات")).toBeInTheDocument();
      expect(apiClient.get).toHaveBeenCalledWith("/dental-lab/policies");
      expect(screen.getByText("سياسة إسناد الفنيين")).toBeInTheDocument();
    });
  });

  it("2. populates assignment card and changes assignment mode", async () => {
    renderSection();

    await waitFor(() => {
      expect(screen.getByDisplayValue("10")).toBeInTheDocument();
    });

    const selects = screen.getAllByRole("combobox");
    const modeSelect = selects[0]; // first select is assignment mode
    fireEvent.change(modeSelect, { target: { value: "AUTO" } });

    expect(screen.getByText("إسناد تلقائي فوري")).toBeInTheDocument();
  });

  it("3. populates due date card with lead time and urgent settings", async () => {
    renderSection();

    await waitFor(() => {
      expect(
        screen.getByText("قواعد حساب موعد التسليم (Lead Time & Due Date)")
      ).toBeInTheDocument();
      expect(screen.getByDisplayValue("4")).toBeInTheDocument(); // defaultLeadDays
      expect(screen.getByDisplayValue("40")).toBeInTheDocument(); // urgentValue
    });
  });

  it("4. populates fields validation card and toggles options", async () => {
    renderSection();

    await waitFor(() => {
      expect(
        screen.getByText("سياسات حقول الإدخال الإلزامية")
      ).toBeInTheDocument();
    });

    const phoneCheckbox = screen.getByRole("checkbox", {
      name: /إلزامية رقم هاتف المريض/i,
    });
    expect(phoneCheckbox).toBeChecked();

    fireEvent.click(phoneCheckbox);
    expect(phoneCheckbox).not.toBeChecked();
  });

  it("5. calls POST /dental-lab/escalation/run when clicking escalation check", async () => {
    renderSection();

    await waitFor(() => {
      expect(
        screen.getByText("تصعيد التأخير التلقائي (Automated Escalation)")
      ).toBeInTheDocument();
    });

    const runEscalationBtn = screen.getByText("فحص التصعيد الآن");
    fireEvent.click(runEscalationBtn);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        "/dental-lab/escalation/run"
      );
    });
  });

  it("6. opens dry run modal when clicking Dry-Run button", async () => {
    renderSection();

    await waitFor(() => {
      expect(screen.getByText("محاكاة حالة (Dry-Run)")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("محاكاة حالة (Dry-Run)"));

    expect(screen.getByTestId("dry-run-modal")).toBeInTheDocument();
    fireEvent.click(screen.getByText("إغلاق المحاكاة"));
    expect(screen.queryByTestId("dry-run-modal")).not.toBeInTheDocument();
  });

  it("7. saves policies with PUT /dental-lab/policies on save click", async () => {
    renderSection();

    await waitFor(() => {
      expect(screen.getByText("حفظ السياسات")).toBeInTheDocument();
    });

    const saveBtn = screen.getByText("حفظ السياسات");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith(
        "/dental-lab/policies",
        expect.objectContaining({
          assignment: expect.any(Object),
          dueDate: expect.any(Object),
          fields: expect.any(Object),
          escalation: expect.any(Object),
        })
      );
    });
  });
});
