import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BranchesTab from "../BranchesTab";
import { BookingBranch } from "../shared";

jest.mock("../../../../utils/urlHelper", () => ({ buildApiUrl: jest.fn() }));
jest.mock("../../../../utils/tokenManager", () => ({
  __esModule: true, default: { createAuthHeaders: jest.fn() },
}));
jest.mock("../BranchModal", () => ({
  __esModule: true,
  default: () => <div data-testid="branch-modal" />,
}));

const baseBranch: BookingBranch = {
  id: "", name: "", address: "", phone: "", phones: [],
  workingDays: {}, workStart: "09:00", workEnd: "22:00",
  isActive: true, createdAt: "2024-01-01",
};

const mockBranches: BookingBranch[] = [
  { ...baseBranch, id: "1", name: "فرع الأندلس", address: "شارع الأندلس", phone: "01000000001", workingDays: { sat: "09:00-22:00" } },
  { ...baseBranch, id: "2", name: "فرع النيل", address: "شارع النيل", phone: "01000000002", workingDays: { sun: "09:00-22:00" } },
  { ...baseBranch, id: "3", name: "فرع الهرم", address: "شارع الهرم", phone: "01000000003", isActive: false, workingDays: { mon: "09:00-22:00" } },
];

type Props = Parameters<typeof BranchesTab>[0];

function makeProps(overrides: Partial<Props> = {}): Props {
  return {
    branches: mockBranches,
    selectedBranchId: undefined,
    onEdit: jest.fn(),
    onToggleActive: jest.fn(),
    onDelete: jest.fn(),
    modalBranch: undefined,
    onModalClose: jest.fn(),
    onSave: jest.fn(),
    ...overrides,
  };
}

afterEach(() => { jest.clearAllMocks(); cleanup(); });

describe("BranchesTab", () => {
  test("renders branch names in both mobile and desktop views", () => {
    render(<BranchesTab {...makeProps()} />);
    expect(screen.getAllByText("فرع الأندلس")).toHaveLength(2);
    expect(screen.getAllByText("فرع النيل")).toHaveLength(2);
  });

  test("shows empty state when no branches", () => {
    render(<BranchesTab {...makeProps({ branches: [] })} />);
    expect(screen.getByText("لا توجد فروع")).toBeInTheDocument();
  });

  test("filters by search", async () => {
    const user = userEvent.setup();
    render(<BranchesTab {...makeProps()} />);
    await user.type(screen.getByPlaceholderText("بحث..."), "نيل");
    // Only "فرع النيل" matches — visible in both views
    expect(screen.getAllByText("فرع النيل")).toHaveLength(2);
    expect(screen.queryByText("فرع الأندلس")).not.toBeInTheDocument();
  });

  test("search resets pagination to page 1", async () => {
    const user = userEvent.setup();
    const many = Array.from({ length: 15 }, (_, i) => ({
      ...baseBranch, id: `${i + 1}`, name: `فرع ${i + 1}`, workingDays: { sat: "09:00-22:00" },
    }));
    render(<BranchesTab {...makeProps({ branches: many })} />);
    await user.click(screen.getAllByText("التالي")[0]);
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("بحث..."), "فرع");
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });

  test("edit button fires onEdit", async () => {
    const user = userEvent.setup();
    const onEdit = jest.fn();
    render(<BranchesTab {...makeProps({ onEdit })} />);
    await user.click(screen.getAllByTitle("تعديل")[0]);
    expect(onEdit).toHaveBeenCalledWith(mockBranches[0]);
  });

  test("delete button fires onDelete", async () => {
    const user = userEvent.setup();
    const onDelete = jest.fn();
    render(<BranchesTab {...makeProps({ onDelete })} />);
    await user.click(screen.getAllByTitle("حذف")[0]);
    expect(onDelete).toHaveBeenCalledWith("1");
  });

  test("shows BranchModal when modalBranch is set", () => {
    render(<BranchesTab {...makeProps({ modalBranch: {} })} />);
    expect(screen.getByTestId("branch-modal")).toBeInTheDocument();
  });

  test("filters by selectedBranchId", () => {
    render(<BranchesTab {...makeProps({ selectedBranchId: "1" })} />);
    // Only branch 1 matches — appears twice (mobile + desktop)
    expect(screen.getAllByText("فرع الأندلس")).toHaveLength(2);
    expect(screen.queryByText("فرع النيل")).not.toBeInTheDocument();
  });
});
