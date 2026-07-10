import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BranchModal from "../BranchModal";
import { BranchFormData } from "../shared";

jest.mock("../../../../utils/urlHelper", () => ({ buildApiUrl: jest.fn() }));
jest.mock("../../../../utils/tokenManager", () => ({
  __esModule: true, default: { createAuthHeaders: jest.fn() },
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const mockImage = { onload: null as (() => void) | null, onerror: null as (() => void) | null, src: "" };
beforeAll(() => {
  (globalThis as unknown as Record<string, unknown>).Image = jest.fn(() => mockImage);
  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    drawImage: jest.fn(), toDataURL: jest.fn(() => "data:image/jpeg;base64,mock"),
  })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
});

const mockOnSave = jest.fn<(d: BranchFormData) => Promise<void>>();
const mockOnClose = jest.fn();

afterEach(() => { jest.clearAllMocks(); cleanup(); });

describe("BranchModal", () => {
  test("renders 'إضافة فرع' for new branch", () => {
    render(<BranchModal branch={null} onClose={mockOnClose} onSave={mockOnSave} />);
    expect(screen.getByText("إضافة فرع")).toBeInTheDocument();
  });

  test("renders 'تعديل فرع' for existing branch", () => {
    render(<BranchModal branch={{ id: "1", name: "Test" } as Partial<import("../shared").BookingBranch>} onClose={mockOnClose} onSave={mockOnSave} />);
    expect(screen.getByText("تعديل فرع")).toBeInTheDocument();
  });

  test("shows name/address validation on empty submit", async () => {
    const user = userEvent.setup();
    render(<BranchModal branch={null} onClose={mockOnClose} onSave={mockOnSave} />);
    await user.click(screen.getByText("حفظ"));
    expect(screen.getByText("الاسم مطلوب")).toBeInTheDocument();
    expect(screen.getByText("العنوان مطلوب")).toBeInTheDocument();
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  test("calls onSave with valid data", async () => {
    mockOnSave.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    const { container } = render(<BranchModal branch={null} onClose={mockOnClose} onSave={mockOnSave} />);
    const inputs = container.querySelectorAll<HTMLInputElement>('input:not([type])');
    await user.type(inputs[0], "فرع جديد");
    await user.type(container.querySelector('textarea')!, "عنوان");
    await user.click(screen.getByText("حفظ"));
    expect(mockOnSave).toHaveBeenCalledTimes(1);
    expect(mockOnSave.mock.calls[0][0].name).toBe("فرع جديد");
  });

  test("adds phone on + button click", async () => {
    const user = userEvent.setup();
    render(<BranchModal branch={null} onClose={mockOnClose} onSave={mockOnSave} />);
    await user.click(screen.getByText("+ إضافة رقم هاتف"));
    expect(screen.getByPlaceholderText("010xxxxxxxx")).toBeInTheDocument();
  });

  test("toggles working day", async () => {
    const user = userEvent.setup();
    render(<BranchModal branch={null} onClose={mockOnClose} onSave={mockOnSave} />);
    const [sunBtn] = screen.getAllByText("الأحد");
    expect(sunBtn.className).not.toContain("bg-blue-600");
    await user.click(sunBtn);
    expect(sunBtn.className).toContain("bg-blue-600");
  });

  test("closes on overlay click", async () => {
    const user = userEvent.setup();
    render(<BranchModal branch={null} onClose={mockOnClose} onSave={mockOnSave} />);
    await user.click(document.querySelector(".fixed.inset-0")!);
    expect(mockOnClose).toHaveBeenCalled();
  });
});
