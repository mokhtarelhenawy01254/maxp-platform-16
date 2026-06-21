jest.mock("../components/FacebookLookup", () => ({
  FacebookLookup: () => <div data-testid="facebook-lookup">FB Lookup</div>,
}));

import { render, screen, fireEvent } from "@testing-library/react";
import { CompanyFilters } from "../components/CompanyFilters";

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
  totalResults: 0,
  stats: {
    totalCompanies: 0, activeCompanies: 0, enterpriseCompanies: 0,
    connectedFacebookPages: 0, activated: 0, trackedCompanies: 0,
    untrackedCompanies: 0, registeredNoStart: 0, onboardingInProgress: 0,
    activationInProgress: 0, followUpNow: 0, escalationDue: 0,
    urgentEscalationDue: 0, stale72h: 0, myDueToday: 0,
  },
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

  it("renders status filter chips", () => {
    render(<CompanyFilters {...defaultProps} />);
    expect(screen.getByText("الكل")).toBeInTheDocument();
    expect(screen.getByText("نشطة")).toBeInTheDocument();
    expect(screen.getByText("متوقفة")).toBeInTheDocument();
  });

  it("calls onStatusChange when status chip clicked", () => {
    const onStatusChange = jest.fn();
    render(<CompanyFilters {...defaultProps} onStatusChange={onStatusChange} />);
    fireEvent.click(screen.getByText("نشطة"));
    expect(onStatusChange).toHaveBeenCalledWith("ACTIVE");
  });

  it("shows active filter badges when filters are applied", () => {
    render(<CompanyFilters {...defaultProps} filterCount={2} activeFilterLabels={["نشطة"]} />);
    expect(screen.getByText("الفلاتر النشطة:")).toBeInTheDocument();
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
    render(<CompanyFilters {...defaultProps} search="test" />);
    fireEvent.click(screen.getByRole("button", { name: "مسح البحث" }));
    expect(defaultProps.onSearchChange).toHaveBeenCalledWith("");
  });
});
