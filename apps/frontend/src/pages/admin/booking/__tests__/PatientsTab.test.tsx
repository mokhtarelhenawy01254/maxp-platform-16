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
  { ...basePatient, id: "1", firstName: "╪ú╪¡┘à╪»", phone: "01000000001", source: "whatsapp", status: "ACTIVE" },
  { ...basePatient, id: "2", firstName: "┘à╪¡┘à╪»", phone: "01000000002", source: "facebook", status: "REVIEW" },
  { ...basePatient, id: "3", firstName: "╪│╪º╪▒╪⌐", phone: "01000000003", source: "whatsapp", status: "INACTIVE", isActive: false },
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
    expect(screen.getAllByText("┘é┘è╪» ╪º┘ä┘à╪▒╪º╪¼╪╣╪⌐").length).toBeGreaterThan(0);
    expect(screen.getAllByText("┘å╪┤╪╖").length).toBeGreaterThan(0);
    expect(screen.getAllByText("╪║┘è╪▒ ┘å╪┤╪╖").length).toBeGreaterThan(0);
  });

  test("source filter narrows the list", async () => {
    const user = userEvent.setup();
    const { container } = render(<PatientsTab {...makeProps()} />);
    const selects = container.querySelectorAll<HTMLSelectElement>("select");
    expect(selects.length).toBeGreaterThan(0);
    await user.selectOptions(selects[0], "whatsapp");
    expect(screen.queryByText("┘à╪¡┘à╪»")).not.toBeInTheDocument();
    expect(screen.getAllByText("╪ú╪¡┘à╪»").length).toBeGreaterThan(0);
  });

  test("merge flow calls POST merge with targetPatientId", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn(async () => ({ json: async () => ({ success: true, data: [] }) }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { container } = render(<PatientsTab {...makeProps()} />);
    await user.click(screen.getAllByTitle("╪»┘à╪¼")[0]);

    const selects = container.querySelectorAll<HTMLSelectElement>("select");
    const targetSelect = selects[selects.length - 1];
    await user.selectOptions(targetSelect, "2");
    await user.click(screen.getByText("╪¬╪ú┘â┘è╪» ╪º┘ä╪»┘à╪¼"));

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/booking/patients/1/merge"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ targetPatientId: "2" }),
      })
    );
    expect(toast.success).toHaveBeenCalledWith("╪¬┘à ╪»┘à╪¼ ╪º┘ä┘à╪▒┘è╪╢ ╪¿┘å╪¼╪º╪¡");
  });

  test("merge flow refreshes the patient list after success", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn(async () => ({ json: async () => ({ success: true, data: [] }) }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { container } = render(<PatientsTab {...makeProps()} />);
    await user.click(screen.getAllByTitle("╪»┘à╪¼")[0]);

    const selects = container.querySelectorAll<HTMLSelectElement>("select");
    const targetSelect = selects[selects.length - 1];
    await user.selectOptions(targetSelect, "2");
    await user.click(screen.getByText("╪¬╪ú┘â┘è╪» ╪º┘ä╪»┘à╪¼"));

    const refreshed = fetchMock.mock.calls.some(([url]) => String(url).includes("patients?includeInactive=true"));
    expect(refreshed).toBe(true);
  });

  test("merge confirm double-click fires only one merge POST", async () => {
    const user = userEvent.setup();
    let resolveMerge!: () => void;
    const fetchMock = jest.fn(() => new Promise((resolve) => {
      resolveMerge = () => resolve({ json: async () => ({ success: true, data: [] }) });
    }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { container } = render(<PatientsTab {...makeProps()} />);
    await user.click(screen.getAllByTitle("╪»┘à╪¼")[0]);

    const selects = container.querySelectorAll<HTMLSelectElement>("select");
    const targetSelect = selects[selects.length - 1];
    await user.selectOptions(targetSelect, "2");
    const confirmBtn = screen.getByText("╪¬╪ú┘â┘è╪» ╪º┘ä╪»┘à╪¼");
    await user.click(confirmBtn);
    await user.click(confirmBtn);

    const mergeCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes("/merge")).length;
    expect(mergeCalls).toBe(1);
    resolveMerge();
  });

  test("shows PatientModal when modalPatient is set", () => {
    render(<PatientsTab {...makeProps({ modalPatient: {} })} />);
    expect(screen.getByTestId("patient-modal")).toBeInTheDocument();
  });
});
