jest.mock("../../../utils/companyFunnelAnalytics", () => ({
  getCompaniesFunnelStats: jest.fn(() => ({ activated: 0, trackedCompanies: 0, untrackedCompanies: 0, registeredNoStart: 0, onboardingInProgress: 0, activationInProgress: 0 })),
  getCompaniesFunnelFollowUpStats: jest.fn(() => ({ followUpNow: 0, escalationDue: 0, urgentEscalationDue: 0, stale72h: 0 })),
  getCompanyFunnelAttentionScore: jest.fn(() => 0),
  getCompanyFunnelLastActivity: jest.fn(() => ({ label: "-", relativeLabel: "-", sortValue: "" })),
  getCompanyFunnelSummary: jest.fn(() => ({ stageKey: "untracked", label: "بدون مسار", progressLabel: "-", hint: "", badgeClassName: "" })),
  getCompanyFunnelStaleStatus: jest.fn(() => ({ label: "", badgeClassName: "", isPending: false, needsFollowUpNow: false, isStale72h: false })),
  getCompanyInterventionAction: jest.fn(() => null),
}));

jest.mock("../../../utils/companyFollowUp", () => ({
  getCompaniesFollowUpAutomationStats: jest.fn(() => ({})),
  getCompanyFollowUpState: jest.fn(() => ({ status: "unassigned", statusMeta: { label: "", className: "" }, assignedOwner: { id: null, label: "" }, updatedAt: null, nextActionAt: null, lastReminderSentAt: null, lastEscalatedAt: null, history: [] })),
  getCompanyFollowUpAutomationState: jest.fn(() => ({ level: "idle", label: "", badgeClassName: "", description: "", needsReminder: false, needsEscalation: false, needsUrgentEscalation: false })),
  getCompanyFollowUpReminderState: jest.fn(() => ({ isActionable: false, badgeClassName: "", nextActionLabel: "", isMine: false, needsFollowUpToday: false })),
  getCompaniesFollowUpReminderStats: jest.fn(() => ({ myDueToday: 0 })),
}));

import { render, screen, fireEvent } from "@testing-library/react";
import { FacebookLookup } from "../components/FacebookLookup";
import type { FacebookPageResult } from "../types";

describe("FacebookLookup", () => {
  const defaultProps = {
    query: "",
    onQueryChange: jest.fn(),
    onSearch: jest.fn(),
    onClear: jest.fn(),
    loading: false,
    error: "",
    searched: false,
    results: [] as FacebookPageResult[],
  };

  beforeEach(() => jest.clearAllMocks());

  it("renders collapsed by default", () => {
    render(<FacebookLookup {...defaultProps} />);
    expect(screen.getByText("فحص صفحة فيسبوك")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/اسم الصفحة/)).not.toBeInTheDocument();
  });

  it("expands when clicked", () => {
    render(<FacebookLookup {...defaultProps} />);
    fireEvent.click(screen.getByText("فحص صفحة فيسبوك"));
    expect(screen.getByPlaceholderText(/اسم الصفحة/)).toBeInTheDocument();
    expect(screen.getByText("افحص الآن")).toBeInTheDocument();
  });

  it("calls onSearch on button click", () => {
    const onSearch = jest.fn();
    render(<FacebookLookup {...defaultProps} onSearch={onSearch} />);
    fireEvent.click(screen.getByText("فحص صفحة فيسبوك"));
    fireEvent.click(screen.getByText("افحص الآن"));
    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  it("calls onSearch on Enter key", () => {
    const onSearch = jest.fn();
    const onQueryChange = jest.fn();
    render(<FacebookLookup {...defaultProps} onSearch={onSearch} onQueryChange={onQueryChange} />);
    fireEvent.click(screen.getByText("فحص صفحة فيسبوك"));
    const input = screen.getByPlaceholderText(/اسم الصفحة/);
    fireEvent.change(input, { target: { value: "test" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  it("shows loading state", () => {
    render(<FacebookLookup {...defaultProps} loading searched />);
    fireEvent.click(screen.getByText("فحص صفحة فيسبوك"));
    expect(screen.getByText("جاري الفحص...")).toBeInTheDocument();
  });

  it("shows error message", () => {
    render(<FacebookLookup {...defaultProps} error="حدث خطأ" searched />);
    fireEvent.click(screen.getByText("فحص صفحة فيسبوك"));
    expect(screen.getByText("تعذر تنفيذ الفحص")).toBeInTheDocument();
    expect(screen.getByText("حدث خطأ")).toBeInTheDocument();
  });

  it("shows empty state when searched with no results", () => {
    render(<FacebookLookup {...defaultProps} searched results={[]} />);
    fireEvent.click(screen.getByText("فحص صفحة فيسبوك"));
    expect(screen.getByText("لا توجد نتائج مطابقة")).toBeInTheDocument();
  });

  it("shows result count badge when searched with results", () => {
    const results = [
      { id: "fb1", pageId: "123", pageName: "Test Page", isRegistered: true, company: { name: "Test Co" } },
      { id: "fb2", pageId: "456", pageName: "Other Page", isRegistered: false, company: null },
    ];
    render(<FacebookLookup {...defaultProps} searched results={results} />);
    expect(screen.getByText("2 نتائج")).toBeInTheDocument();
  });

  it("renders registered badge for registered pages", () => {
    const results: FacebookPageResult[] = [
      { id: "fb1", pageId: "123", pageName: "Test Page", isRegistered: true, company: { name: "Test Co" } },
    ];
    render(<FacebookLookup {...defaultProps} searched results={results} />);
    fireEvent.click(screen.getByText("فحص صفحة فيسبوك"));
    expect(screen.getByText("مسجلة")).toBeInTheDocument();
    expect(screen.getByText("Test Co")).toBeInTheDocument();
  });

  it("renders unregistered badge for unregistered pages", () => {
    const results: FacebookPageResult[] = [
      { id: "fb2", pageId: "789", pageName: "Unreg", isRegistered: false, company: null },
    ];
    render(<FacebookLookup {...defaultProps} searched results={results} />);
    fireEvent.click(screen.getByText("فحص صفحة فيسبوك"));
    expect(screen.getByText("غير مسجلة")).toBeInTheDocument();
    expect(screen.getByText("غير مرتبطة بأي شركة")).toBeInTheDocument();
  });

  it("calls onQueryChange when typing", () => {
    const onQueryChange = jest.fn();
    render(<FacebookLookup {...defaultProps} onQueryChange={onQueryChange} />);
    fireEvent.click(screen.getByText("فحص صفحة فيسبوك"));
    fireEvent.change(screen.getByPlaceholderText(/اسم الصفحة/), { target: { value: "my page" } });
    expect(onQueryChange).toHaveBeenCalledWith("my page");
  });

  it("calls onClear when clear button clicked", () => {
    const onClear = jest.fn();
    render(<FacebookLookup {...defaultProps} searched query="test" onClear={onClear} />);
    fireEvent.click(screen.getByText("فحص صفحة فيسبوك"));
    fireEvent.click(screen.getByText("مسح"));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("shows collapse chevron rotates when expanded", () => {
    const { container } = render(<FacebookLookup {...defaultProps} />);
    fireEvent.click(screen.getByText("فحص صفحة فيسبوك"));
    const chevron = container.querySelector('[class*="rotate-180"]');
    expect(chevron).toBeTruthy();
  });
});
