import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PatientsTab from "../PatientsTab";
import { BookingPatient } from "../shared";
import { toast } from "sonner";

jest.mock("../../../../utils/urlHelper", () => ({ buildApiUrl: jest.fn((p: string) => `http://localhost/api/v1/${p}`) }));
jest.mock("../../../../utils/tokenManager", () => ({
  __esModule: true, default: { createAuthHeaders: jest.fn() },
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn() }));
jest.mock("../PatientModal", () => ({
  __esModule: true,
  default: () => <div data-testid="patient-modal" />,
}));

const basePatient: BookingPatient = {
  id: "", firstName: "", phone: "", gender: "", isActive: true, createdAt: "2024-01-01",
};

const mockPatients: BookingPatient[] = [
  { ...basePatient, id: "1", firstName: "أحمد", phone: "01000000001", source: "whatsapp", status: "ACTIVE" },
  { ...basePatient, id: "2", firstName: "محمد", phone: "01000000002", source: "facebook", status: "REVIEW" },
  { ...basePatient, id: "3", firstName: "سارة", phone: "01000000003", source: "whatsapp", status: "INACTIVE", isActive: false },
];

type Props = Parameters<typeof PatientsTab>[0];

function makeProps(overrides: Partial<Props> = {}): Props {
  return {
    patients: mockPatients,
    search: "",
    onSearchChange: jest.fn(),
    onView: jest.fn(),
    onEdit: jest.fn(),
    onToggleActive: jest.fn(),
    onDelete: jest.fn(),
    modalPatient: undefined,
    onModalClose: jest.fn(),
    onSave: jest.fn(),
    ...overrides,
  };
}

afterEach(() => { jest.clearAllMocks(); cleanup(); });

describe("PatientsTab", () => {
  test("renders status badge using PATIENT_STATUS_MAP", () => {
    render(<PatientsTab {...makeProps()} />);
    expect(screen.getAllByText("قيد المراجعة").length).toBeGreaterThan(0);
    expect(screen.getAllByText("نشط").length).toBeGreaterThan(0);
    expect(screen.getAllByText("غير نشط").length).toBeGreaterThan(0);
  });

  test("source filter narrows the list", async () => {
    const user = userEvent.setup();
    const { container } = render(<PatientsTab {...makeProps()} />);
    const selects = container.querySelectorAll<HTMLSelectElement>("select");
    expect(selects.length).toBeGreaterThan(0);
    await user.selectOptions(selects[0], "whatsapp");
    expect(screen.queryByText("محمد")).not.toBeInTheDocument();
    expect(screen.getAllByText("أحمد").length).toBeGreaterThan(0);
  });

  test("merge flow calls POST merge with targetPatientId", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn(async () => ({ json: async () => ({ success: true, data: [] }) }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { container } = render(<PatientsTab {...makeProps()} />);
    await user.click(screen.getAllByTitle("دمج")[0]);

    const selects = container.querySelectorAll<HTMLSelectElement>("select");
    const targetSelect = selects[selects.length - 1];
    await user.selectOptions(targetSelect, "2");
    await user.click(screen.getByText("تأكيد الدمج"));

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/booking/patients/1/merge"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ targetPatientId: "2" }),
      })
    );
    expect(toast.success).toHaveBeenCalledWith("تم دمج المريض بنجاح");
  });

  test("merge flow refreshes the patient list after success", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn(async () => ({ json: async () => ({ success: true, data: [] }) }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { container } = render(<PatientsTab {...makeProps()} />);
    await user.click(screen.getAllByTitle("دمج")[0]);

    const selects = container.querySelectorAll<HTMLSelectElement>("select");
    const targetSelect = selects[selects.length - 1];
    await user.selectOptions(targetSelect, "2");
    await user.click(screen.getByText("تأكيد الدمج"));

    const refreshed = fetchMock.mock.calls.some(([url]) => String(url).includes("patients?includeInactive=true"));
    expect(refreshed).toBe(true);
  });

  test("shows PatientModal when modalPatient is set", () => {
    render(<PatientsTab {...makeProps({ modalPatient: {} })} />);
    expect(screen.getByTestId("patient-modal")).toBeInTheDocument();
  });
});
