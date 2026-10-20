// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import TechnicianEditModal from "../../TechnicianEditModal";
import type { TechnicianForm } from "../../../types/technicianTypes";
import type { DentalTechnician } from "../../../../shared";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "dentalLab.common.cancel": "إلغاء",
        "dentalLab.common.save": "حفظ",
        "dentalLab.common.saving": "جاري الحفظ...",
      };
      return translations[key] || key;
    },
  }),
}));

const mockNewTechnicianForm: TechnicianForm = {
  name: "",
  phone: "",
  role: "CAD_DESIGNER",
  wagePerStage: "",
  dailyCap: "",
  backupTechnicianId: "",
  workingDays: ["SATURDAY", "SUNDAY", "MONDAY"],
  vacations: [],
  email: "newtech@lab.com",
  password: "password123",
  isActive: true,
};

const mockExistingTechnicianForm: TechnicianForm = {
  id: "tech-101",
  name: "كريم عبد العزيز",
  phone: "01099887766",
  role: "CERAMIST",
  wagePerStage: "150",
  dailyCap: "10",
  backupTechnicianId: "tech-102",
  workingDays: ["SATURDAY", "SUNDAY", "TUESDAY", "WEDNESDAY"],
  vacations: [
    {
      startDate: "2026-11-01",
      endDate: "2026-11-05",
      reason: "إجازة زواج",
    },
  ],
  email: "karim@lab.com",
  password: "",
  isActive: true,
};

const mockRows: DentalTechnician[] = [
  {
    id: "tech-101",
    name: "كريم عبد العزيز",
    phone: "01099887766",
    role: "CERAMIST",
    isActive: true,
    activeCasesCount: 2,
    completedCasesCount: 45,
    wagePerStage: 150,
    dailyCap: 10,
    workingDays: ["SATURDAY", "SUNDAY"],
    vacations: [],
  },
  {
    id: "tech-102",
    name: "محمود الشامي",
    phone: "01234567890",
    role: "CAD_DESIGNER",
    isActive: true,
    activeCasesCount: 1,
    completedCasesCount: 30,
    wagePerStage: 120,
    dailyCap: 8,
    workingDays: ["SATURDAY", "SUNDAY", "MONDAY"],
    vacations: [],
  },
];

describe("TechnicianEditModal", () => {
  const setModal = vi.fn();
  const onSave = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders new technician modal with correct title and empty states", () => {
    render(
      <TechnicianEditModal
        modal={mockNewTechnicianForm}
        setModal={setModal}
        rows={mockRows}
        saving={false}
        error={null}
        onSave={onSave}
        onClose={onClose}
      />
    );

    expect(screen.getByText("إضافة فني جديد وحساب المنصة")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("مثال: أحمد مصطفى")).toHaveValue("");
    expect(screen.getByText("لا توجد إجازات استثنائية مسجلة حالياً (الفني متاح للعمل حسب جدوله الأسبوعي).")).toBeInTheDocument();
    expect(screen.queryByLabelText("عضو نشط (متاح لتعيين مراحل الشغل له)")).not.toBeInTheDocument();
  });

  it("renders existing technician modal with data, active checkbox, and vacations", () => {
    render(
      <TechnicianEditModal
        modal={mockExistingTechnicianForm}
        setModal={setModal}
        rows={mockRows}
        saving={false}
        error={null}
        onSave={onSave}
        onClose={onClose}
      />
    );

    expect(screen.getByText("تعديل بيانات عضو فريق العمل")).toBeInTheDocument();
    expect(screen.getByDisplayValue("كريم عبد العزيز")).toBeInTheDocument();
    expect(screen.getByDisplayValue("01099887766")).toBeInTheDocument();
    expect(screen.getByDisplayValue("150")).toBeInTheDocument();
    expect(screen.getByDisplayValue("10")).toBeInTheDocument();
    expect(screen.getByDisplayValue("إجازة زواج")).toBeInTheDocument();
    expect(screen.getByLabelText("عضو نشط (متاح لتعيين مراحل الشغل له)")).toBeChecked();
  });

  it("displays error message when error prop is provided", () => {
    render(
      <TechnicianEditModal
        modal={mockNewTechnicianForm}
        setModal={setModal}
        rows={mockRows}
        saving={false}
        error="البريد الإلكتروني مستخدم بالفعل لفني آخر"
        onSave={onSave}
        onClose={onClose}
      />
    );

    expect(screen.getByText("البريد الإلكتروني مستخدم بالفعل لفني آخر")).toBeInTheDocument();
  });

  it("handles basic input changes and updates state", () => {
    render(
      <TechnicianEditModal
        modal={mockNewTechnicianForm}
        setModal={setModal}
        rows={mockRows}
        saving={false}
        error={null}
        onSave={onSave}
        onClose={onClose}
      />
    );

    // Change Name
    fireEvent.change(screen.getByPlaceholderText("مثال: أحمد مصطفى"), {
      target: { value: "ياسر جلال" },
    });
    expect(setModal).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ياسر جلال" })
    );

    // Change Phone
    fireEvent.change(screen.getByPlaceholderText("01xxxxxxxxx"), {
      target: { value: "01122334455" },
    });
    expect(setModal).toHaveBeenCalledWith(
      expect.objectContaining({ phone: "01122334455" })
    );
  });

  it("toggles working days when day button is clicked", () => {
    render(
      <TechnicianEditModal
        modal={mockNewTechnicianForm}
        setModal={setModal}
        rows={mockRows}
        saving={false}
        error={null}
        onSave={onSave}
        onClose={onClose}
      />
    );

    // Click on a working day button (e.g., السبت)
    const saturdayBtn = screen.getByRole("button", { name: "السبت" });
    fireEvent.click(saturdayBtn);
    expect(setModal).toHaveBeenCalled();
  });

  it("adds and deletes exceptional vacations", () => {
    render(
      <TechnicianEditModal
        modal={mockExistingTechnicianForm}
        setModal={setModal}
        rows={mockRows}
        saving={false}
        error={null}
        onSave={onSave}
        onClose={onClose}
      />
    );

    // Add vacation
    const addVacBtn = screen.getByRole("button", { name: /إضافة فترة إجازة/ });
    fireEvent.click(addVacBtn);
    expect(setModal).toHaveBeenCalledWith(
      expect.objectContaining({
        vacations: expect.arrayContaining([
          expect.objectContaining({ reason: "إجازة زواج" }),
        ]),
      })
    );

    // Delete existing vacation
    const deleteVacBtn = screen.getByTitle("حذف هذه الإجازة");
    fireEvent.click(deleteVacBtn);
    expect(setModal).toHaveBeenCalledWith(
      expect.objectContaining({
        vacations: [],
      })
    );
  });

  it("handles cancel and save triggers", () => {
    render(
      <TechnicianEditModal
        modal={mockExistingTechnicianForm}
        setModal={setModal}
        rows={mockRows}
        saving={false}
        error={null}
        onSave={onSave}
        onClose={onClose}
      />
    );

    // Click Cancel
    fireEvent.click(screen.getByRole("button", { name: "إلغاء" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    // Click Close icon
    fireEvent.click(screen.getByRole("button", { name: "إغلاق" }));
    expect(onClose).toHaveBeenCalledTimes(2);

    // Click Save
    fireEvent.click(screen.getByRole("button", { name: "حفظ" }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("disables save button when name is empty or during saving", () => {
    const { rerender } = render(
      <TechnicianEditModal
        modal={{ ...mockNewTechnicianForm, name: "   " }}
        setModal={setModal}
        rows={mockRows}
        saving={false}
        error={null}
        onSave={onSave}
        onClose={onClose}
      />
    );

    expect(screen.getByRole("button", { name: "حفظ" })).toBeDisabled();

    rerender(
      <TechnicianEditModal
        modal={mockExistingTechnicianForm}
        setModal={setModal}
        rows={mockRows}
        saving={true}
        error={null}
        onSave={onSave}
        onClose={onClose}
      />
    );

    expect(screen.getByRole("button", { name: "جاري الحفظ..." })).toBeDisabled();
  });
});
