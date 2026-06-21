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

import {
  extractErrorMessage, formatDate, formatDateTime, toDateTimeLocalValue,
  fromDateTimeLocalValue, normalizeWebsite, getCount, getRoleLabel,
  sortCompanies, addHoursToDateTimeLocal,
} from "../utils";

import type { Company } from "../types";

describe("extractErrorMessage", () => {
  it("returns fallback on null/undefined", () => {
    expect(extractErrorMessage(null, "def")).toBe("def");
    expect(extractErrorMessage(undefined, "def")).toBe("def");
  });

  it("extracts response.data string", () => {
    const err = { response: { data: "البريد موجود" } };
    expect(extractErrorMessage(err, "def")).toBe("البريد موجود");
  });

  it("extracts message property", () => {
    const err = { message: "Network error" };
    expect(extractErrorMessage(err, "def")).toBe("Network error");
  });

  it("falls back when no known shape", () => {
    expect(extractErrorMessage({ foo: "bar" }, "def")).toBe("def");
  });
});

describe("formatDate", () => {
  it("returns placeholder for null/undefined", () => {
    expect(formatDate(null)).toBe("غير متوفر");
    expect(formatDate(undefined)).toBe("غير متوفر");
  });

  it("formats a valid date", () => {
    const result = formatDate("2024-03-15T10:00:00.000Z");
    expect(result).toContain("مارس");
    // Locale-dependant digit (Arabic-Indic on this system)
    expect(result.length).toBeGreaterThan(5);
  });

  it("formats date+time", () => {
    const result = formatDateTime("2024-03-15T10:00:00.000Z");
    expect(result).toContain("مارس");
  });
});

describe("formatDateTime", () => {
  it("shows placeholder for null", () => {
    expect(formatDateTime(null)).toBe("غير متوفر");
  });

  it("formats date+time", () => {
    const result = formatDateTime("2024-03-15T10:00:00.000Z");
    expect(result).toContain("مارس");
  });
});

describe("toDateTimeLocalValue", () => {
  it("returns empty for null", () => {
    expect(toDateTimeLocalValue(null)).toBe("");
  });

  it("converts ISO to datetime-local format", () => {
    const result = toDateTimeLocalValue("2024-03-15T10:00:00.000Z");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });
});

describe("fromDateTimeLocalValue", () => {
  it("returns null for empty", () => {
    expect(fromDateTimeLocalValue("")).toBeNull();
  });

  it("converts back to ISO", () => {
    const result = fromDateTimeLocalValue("2024-03-15T12:00");
    expect(result).toBeTruthy();
    expect(result).toContain("2024");
  });
});

describe("normalizeWebsite", () => {
  it("returns null on null", () => {
    expect(normalizeWebsite(null)).toBeNull();
  });

  it("adds https:// when missing", () => {
    expect(normalizeWebsite("example.com")).toBe("https://example.com");
  });

  it("keeps existing protocol", () => {
    expect(normalizeWebsite("http://example.com")).toBe("http://example.com");
    expect(normalizeWebsite("https://example.com")).toBe("https://example.com");
  });
});

describe("getCount", () => {
  const company = { _count: { users: 5, customers: 3, facebookPages: 1 } } as Company;

  it("returns the count for a given key", () => {
    expect(getCount(company, "users")).toBe(5);
    expect(getCount(company, "customers")).toBe(3);
    expect(getCount(company, "facebookPages")).toBe(1);
  });

  it("returns 0 when _count is missing", () => {
    expect(getCount({} as Company, "users")).toBe(0);
  });
});

describe("getRoleLabel", () => {
  it("translates roles correctly", () => {
    expect(getRoleLabel("OWNER")).toBe("مالك");
    expect(getRoleLabel("COMPANY_ADMIN")).toBe("مدير شركة");
    expect(getRoleLabel("MANAGER")).toBe("مدير");
    expect(getRoleLabel("AGENT")).toBe("موظف");
    expect(getRoleLabel("OTHER")).toBe("موظف");
  });
});

describe("addHoursToDateTimeLocal", () => {
  it("returns a valid datetime-local string in the future", () => {
    const result = addHoursToDateTimeLocal(24);
    expect(result).toContain("T");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });
});

describe("sortCompanies", () => {
  const makeCompany = (overrides: Partial<Company>): Company => ({
    id: "1", name: "A", email: "a@a.com", phone: null, website: null,
    plan: "BASIC", currency: "EGP", isActive: true, createdAt: "2024-01-01",
    ...overrides,
  } as Company);

  it("sorts by name ascending", () => {
    const companies = [makeCompany({ name: "Z" }), makeCompany({ name: "A" })];
    const sorted = sortCompanies(companies, "name:asc");
    expect(sorted[0].name).toBe("A");
    expect(sorted[1].name).toBe("Z");
  });

  it("sorts by name descending", () => {
    const companies = [makeCompany({ name: "A" }), makeCompany({ name: "Z" })];
    const sorted = sortCompanies(companies, "name:desc");
    expect(sorted[0].name).toBe("Z");
    expect(sorted[1].name).toBe("A");
  });

  it("sorts by createdAt descending (default)", () => {
    const companies = [
      makeCompany({ id: "1", createdAt: "2024-01-01" }),
      makeCompany({ id: "2", createdAt: "2024-06-01" }),
    ];
    const sorted = sortCompanies(companies, "createdAt:desc");
    expect(sorted[0].id).toBe("2");
  });

  it("sorts by users count", () => {
    const a = makeCompany({ id: "1", _count: { users: 1, customers: 0, facebookPages: 0 } });
    const b = makeCompany({ id: "2", _count: { users: 10, customers: 0, facebookPages: 0 } });
    const sorted = sortCompanies([a, b], "users:asc");
    expect(sorted[0].id).toBe("1");
    expect(sorted[1].id).toBe("2");
  });

  it("handles null sort values for lastActivity", () => {
    const a = makeCompany({ id: "1" });
    const b = makeCompany({ id: "2" });
    expect(() => sortCompanies([a, b], "lastActivity:asc")).not.toThrow();
  });

  it("handles null attention scores", () => {
    const a = makeCompany({ id: "1" });
    const b = makeCompany({ id: "2" });
    expect(() => sortCompanies([a, b], "attention:desc")).not.toThrow();
  });
});
