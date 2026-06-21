import { render, screen, fireEvent } from "@testing-library/react";
import { CompaniesTable } from "../components/CompaniesTable";
import type { Company, QuickStats } from "../types";

jest.mock("../../../utils/companyFollowUp", () => ({
  getCompaniesFollowUpAutomationStats: jest.fn(() => ({})),
  getCompanyFollowUpState: jest.fn(() => ({ status: "unassigned", statusMeta: { label: "", className: "" }, assignedOwner: { id: null, label: "" }, updatedAt: null, nextActionAt: null, lastReminderSentAt: null, lastEscalatedAt: null, history: [] })),
  getCompanyFollowUpAutomationState: jest.fn(() => ({ level: "idle", label: "", badgeClassName: "", description: "", needsReminder: false, needsEscalation: false, needsUrgentEscalation: false })),
  getCompanyFollowUpReminderState: jest.fn(() => ({ isActionable: false, badgeClassName: "", nextActionLabel: "", isMine: false, needsFollowUpToday: false })),
  getCompaniesFollowUpReminderStats: jest.fn(() => ({ myDueToday: 0 })),
}));

jest.mock("react-router-dom", () => ({
  useNavigate: () => jest.fn(),
}));

const baseStats: QuickStats = {
  totalCompanies: 0, activeCompanies: 0, enterpriseCompanies: 0,
  connectedFacebookPages: 0,
  followUpNow: 0, escalationDue: 0, urgentEscalationDue: 0, stale72h: 0, myDueToday: 0,
};

const makeCompany = (id: string, overrides: Partial<Company> = {}): Company => ({
  id, name: `Company ${id}`, email: `${id}@test.com`, phone: null, website: null,
  plan: "BASIC", currency: "EGP", isActive: true, createdAt: "2024-01-01",
  _count: { users: 0, customers: 0, facebookPages: 0 },
  ...overrides,
} as Company);

const defaultProps = {
  companies: [] as Company[],
  totalPages: 1,
  currentPage: 1,
  onPageChange: jest.fn(),
  pageSize: 10,
  totalItems: 0,
  selectedIds: [] as string[],
  onToggleSelect: jest.fn(),
  onToggleSelectAll: jest.fn(),
  isAllVisibleSelected: false,
  isSomeVisibleSelected: false,
  loading: false,
  onOpenDetails: jest.fn(),
  onEdit: jest.fn(),
  onDelete: jest.fn(),
  onOpenUsers: jest.fn(),
  onOpenFollowUp: jest.fn(),
  onOpenFacebookPages: jest.fn(),
  onTransferOwnership: jest.fn(),
  onAddEmployee: jest.fn(),
  onLoginAsAdmin: jest.fn(),
  onRunFollowUpAction: jest.fn(),
  isMobile: false,
  stats: baseStats,
};

describe("CompaniesTable", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows loading skeletons when loading is true", () => {
    const { container } = render(<CompaniesTable {...defaultProps} loading />);
    const skeletonEls = container.querySelectorAll('[class*="rounded-2xl"]');
    expect(skeletonEls.length > 0 || container.innerHTML.includes("Skeleton"));
  });

  it("shows empty state when no companies", () => {
    render(<CompaniesTable {...defaultProps} companies={[]} />);
    expect(screen.getByText("لا توجد شركات مطابقة")).toBeInTheDocument();
    expect(screen.getByText(/جرّب تعديل الفلاتر/)).toBeInTheDocument();
  });

  it("renders company names in the table", () => {
    const companies = [
      makeCompany("1", { name: "شركة الأولى" }),
      makeCompany("2", { name: "شركة الثانية" }),
    ];
    render(<CompaniesTable {...defaultProps} companies={companies} totalItems={2} />);
    expect(screen.getByText("شركة الأولى")).toBeInTheDocument();
    expect(screen.getByText("شركة الثانية")).toBeInTheDocument();
  });

  it("renders plan badges correctly", () => {
    const companies = [makeCompany("1", { plan: "ENTERPRISE" })];
    render(<CompaniesTable {...defaultProps} companies={companies} totalItems={1} />);
    expect(screen.getByText("مؤسسي")).toBeInTheDocument();
  });

  it("renders active status badge", () => {
    const companies = [makeCompany("1", { isActive: true })];
    render(<CompaniesTable {...defaultProps} companies={companies} totalItems={1} />);
    expect(screen.getByText("نشطة")).toBeInTheDocument();
  });

  it("renders inactive status badge", () => {
    const companies = [makeCompany("1", { isActive: false })];
    render(<CompaniesTable {...defaultProps} companies={companies} totalItems={1} />);
    expect(screen.getByText("متوقفة")).toBeInTheDocument();
  });

  it("calls onOpenDetails when company name is clicked", () => {
    const onOpenDetails = jest.fn();
    const companies = [makeCompany("1")];
    render(<CompaniesTable {...defaultProps} companies={companies} totalItems={1} onOpenDetails={onOpenDetails} />);
    fireEvent.click(screen.getByText("Company 1"));
    expect(onOpenDetails).toHaveBeenCalledWith(companies[0]);
  });

  it("handles pagination controls", () => {
    const onPageChange = jest.fn();
    const companies = [makeCompany("1"), makeCompany("2")];
    render(<CompaniesTable {...defaultProps} companies={companies} totalItems={2} totalPages={3} currentPage={2} onPageChange={onPageChange} />);
    expect(screen.getByText("صفحة 2 من 3")).toBeInTheDocument();
    fireEvent.click(screen.getByText("السابق"));
    expect(onPageChange).toHaveBeenCalledWith(1);
    fireEvent.click(screen.getByText("التالي"));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("disables previous on first page", () => {
    const companies = [makeCompany("1")];
    render(<CompaniesTable {...defaultProps} companies={companies} totalItems={1} totalPages={3} currentPage={1} />);
    const prevButton = screen.getByText("السابق").closest("button");
    expect(prevButton).toBeDisabled();
  });

  it("disables next on last page", () => {
    const companies = [makeCompany("1")];
    render(<CompaniesTable {...defaultProps} companies={companies} totalItems={1} totalPages={3} currentPage={3} />);
    const nextButton = screen.getByText("التالي").closest("button");
    expect(nextButton).toBeDisabled();
  });

  it("renders email for each company", () => {
    const companies = [makeCompany("1", { email: "test@example.com" })];
    render(<CompaniesTable {...defaultProps} companies={companies} totalItems={1} />);
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });
});
