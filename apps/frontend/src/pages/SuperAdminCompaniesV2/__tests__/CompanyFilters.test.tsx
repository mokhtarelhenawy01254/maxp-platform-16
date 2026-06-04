jest.mock("../components/FacebookLookup", () => ({
  FacebookLookup: () => <div data-testid="facebook-lookup">FB Lookup</div>,
}));

import { render, screen, fireEvent, act } from "@testing-library/react";
import { CompanyFilters } from "../components/CompanyFilters";
import type { QuickStats } from "../types";

const baseStats: QuickStats = {
  totalCompanies: 50, activeCompanies: 30, enterpriseCompanies: 10,
  connectedFacebookPages: 25,
  activated: 15, trackedCompanies: 35, untrackedCompanies: 15,
  registeredNoStart: 8, onboardingInProgress: 12, activationInProgress: 5,
  followUpNow: 3, escalationDue: 2, urgentEscalationDue: 1, stale72h: 4, myDueToday: 6,
};

const fbLookupProps = {
  query: "", onQueryChange: jest.fn(), onSearch: jest.fn(), onClear: jest.fn(),
  loading: false, error: "", searched: false, results: [],
};

const defaultProps = {
  search: "", onSearchChange: jest.fn(),
  savedView: "ALL", onSavedViewChange: jest.fn(),
  status: "ALL", onStatusChange: jest.fn(),
  plan: "ALL", onPlanChange: jest.fn(),
  funnelStage: "ALL", onFunnelStageChange: jest.fn(),
  sort: "createdAt:desc", onSortChange: jest.fn(),
  rowsPerPage: "10", onRowsPerPageChange: jest.fn(),
  onClearAll: jest.fn(),
  stats: baseStats, totalResults: 50,
  filterCount: 0, activeFilterLabels: [],
  onOpenView: jest.fn(),
  facebookLookup: fbLookupProps,
};

describe("CompanyFilters", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders search input", () => {
    render(<CompanyFilters {...defaultProps} />);
    expect(screen.getByPlaceholderText(/ابحث باسم الشركة/)).toBeInTheDocument();
  });

  it("renders all saved view chips", () => {
    render(<CompanyFilters {...defaultProps} />);
    expect(screen.getByRole("button", { name: /كل الشركات.*50/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /تحتاج متابعة الآن.*3/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /متابعتي اليوم.*6/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /تصعيد مطلوب.*3/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /متوقف 72 ساعة\+.*4/ })).toBeInTheDocument();
  });

  it("renders status filter chips", () => {
    render(<CompanyFilters {...defaultProps} />);
    // "الكل" matches both saved view and status chips
    expect(screen.getAllByText("الكل").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("نشطة")).toBeInTheDocument();
    expect(screen.getByText("متوقفة")).toBeInTheDocument();
  });

  it("renders plan filter chips", () => {
    render(<CompanyFilters {...defaultProps} />);
    expect(screen.getByText("كل الخطط")).toBeInTheDocument();
    expect(screen.getByText("أساسي")).toBeInTheDocument();
    expect(screen.getByText("احترافي")).toBeInTheDocument();
    expect(screen.getByText("مؤسسي")).toBeInTheDocument();
  });

  it("renders funnel stage filter chips", () => {
    render(<CompanyFilters {...defaultProps} />);
    expect(screen.getByText(/سجل ولم يبدأ.*8/)).toBeInTheDocument();
    expect(screen.getByText(/مفعلة.*15/)).toBeInTheDocument();
  });

  it("calls onStatusChange when status chip clicked", () => {
    const onStatusChange = jest.fn();
    render(<CompanyFilters {...defaultProps} onStatusChange={onStatusChange} />);
    const chips = screen.getAllByText("نشطة");
    fireEvent.click(chips[0]);
    expect(onStatusChange).toHaveBeenCalledWith("ACTIVE");
  });

  it("calls onPlanChange when plan chip clicked", () => {
    const onPlanChange = jest.fn();
    render(<CompanyFilters {...defaultProps} onPlanChange={onPlanChange} />);
    fireEvent.click(screen.getByText("احترافي"));
    expect(onPlanChange).toHaveBeenCalledWith("PRO");
  });

  it("calls onOpenView when saved view chip clicked", () => {
    const onOpenView = jest.fn();
    render(<CompanyFilters {...defaultProps} onOpenView={onOpenView} />);
    fireEvent.click(screen.getByText(/تحتاج متابعة الآن/));
    expect(onOpenView).toHaveBeenCalledWith("FOLLOW_UP_NOW");
  });

  it("shows active filter badges when filters are applied", () => {
    render(<CompanyFilters {...defaultProps} filterCount={2} activeFilterLabels={["نشطة", "احترافي"]} />);
    const badges = screen.getAllByText("نشطة");
    expect(badges.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("مسح الفلاتر")).toBeInTheDocument();
  });

  it("shows search badge when search has a value", () => {
    render(<CompanyFilters {...defaultProps} search="test" />);
    expect(screen.getByText(/البحث: test/)).toBeInTheDocument();
  });

  it("calls onClearAll when clear filters button clicked", () => {
    const onClearAll = jest.fn();
    render(<CompanyFilters {...defaultProps} filterCount={1} activeFilterLabels={["نشطة"]} onClearAll={onClearAll} />);
    fireEvent.click(screen.getByText("مسح الفلاتر"));
    expect(onClearAll).toHaveBeenCalledTimes(1);
  });

  it("renders FacebookLookup child component", () => {
    render(<CompanyFilters {...defaultProps} />);
    expect(screen.getByTestId("facebook-lookup")).toBeInTheDocument();
  });

  it("clears search when clear button is clicked", () => {
    const onSearchChange = jest.fn();
    render(<CompanyFilters {...defaultProps} search="test" onSearchChange={onSearchChange} />);
    fireEvent.click(screen.getByRole("button", { name: "مسح البحث" }));
    expect(onSearchChange).toHaveBeenCalledWith("");
  });

  it("shows saved view counts correctly", () => {
    render(<CompanyFilters {...defaultProps} />);
    expect(screen.getByRole("button", { name: /كل الشركات.*50/ })).toBeInTheDocument();
  });
});
