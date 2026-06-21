jest.mock("../components/FacebookLookup", () => ({
  FacebookLookup: () => <div data-testid="facebook-lookup">FB Lookup</div>,
}));

import { render, screen, fireEvent, act } from "@testing-library/react";
import { CompanyFilters } from "../components/CompanyFilters";
import type { QuickStats } from "../types";

const baseStats: QuickStats = {
  totalCompanies: 50, activeCompanies: 30,
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
  onSavedViewChange: jest.fn(),
  status: "ALL", onStatusChange: jest.fn(),
  sort: "createdAt:desc", onSortChange: jest.fn(),
  rowsPerPage: "10", onRowsPerPageChange: jest.fn(),
  onClearAll: jest.fn(),
  stats: baseStats, totalResults: 50,
  filterCount: 0, activeFilterLabels: [],
  facebookLookup: fbLookupProps,
};

describe("CompanyFilters", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders search input", () => {
    render(<CompanyFilters {...defaultProps} />);
    expect(screen.getByPlaceholderText(/ابحث\.\.\./)).toBeInTheDocument();
  });

  it("renders status filter chips", () => {
    render(<CompanyFilters {...defaultProps} />);
    // "الكل" matches both saved view and status chips
    expect(screen.getAllByText("الكل").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("نشطة")).toBeInTheDocument();
    expect(screen.getByText("متوقفة")).toBeInTheDocument();
  });

  it("calls onStatusChange when status chip clicked", () => {
    const onStatusChange = jest.fn();
    render(<CompanyFilters {...defaultProps} onStatusChange={onStatusChange} />);
    const chips = screen.getAllByText("نشطة");
    fireEvent.click(chips[0]);
    expect(onStatusChange).toHaveBeenCalledWith("ACTIVE");
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

});
