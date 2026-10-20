// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HRSettings from "../../HRSettings";

const mockUser = {
  id: "admin-1",
  name: "HR Admin",
  role: "COMPANY_ADMIN",
};
const mockAuthReturn = { user: mockUser };

// Mock useAuthSimple
vi.mock("../../../../hooks/useAuthSimple", () => ({
  useAuth: () => mockAuthReturn,
}));
vi.mock("@/hooks/useAuthSimple", () => ({
  useAuth: () => mockAuthReturn,
}));

// Mock AutoDeductionSettings
vi.mock("../../../../components/hr/AutoDeductionSettings", () => ({
  PunctualityRules: () => <div data-testid="punctuality-rules" />,
  FinancialPenalties: () => <div data-testid="financial-penalties" />,
  CalculationEngine: () => <div data-testid="calculation-engine" />,
  PunctualityNotifications: () => <div data-testid="punctuality-notifications" />,
}));
vi.mock("@/components/hr/AutoDeductionSettings", () => ({
  PunctualityRules: () => <div data-testid="punctuality-rules" />,
  FinancialPenalties: () => <div data-testid="financial-penalties" />,
  CalculationEngine: () => <div data-testid="calculation-engine" />,
  PunctualityNotifications: () => <div data-testid="punctuality-notifications" />,
}));

const { mockApiGet, mockApiPut } = vi.hoisted(() => {
  const get = vi.fn((url: string) => {
    if (url.includes("/v1/hr/settings")) {
      return Promise.resolve({
        data: {
          settings: {
            workingDays: ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday"],
            annualLeaveDefault: 21,
            sickLeaveDefault: 15,
            carryOverLimit: 5,
            requireApproval: true,
            minAdvanceNotice: 3,
            payrollDay: 25,
            currency: "EGP",
            taxRate: 10,
            socialInsuranceRate: 11,
            overtimeRate: 1.5,
            transportationAllowance: 500,
            housingAllowance: 1000,
            phoneAllowance: 200,
            mealAllowance: 300,
            maxAdvancePercentage: 50,
            maxActiveAdvances: 1,
            minMonthsForAdvance: 3,
            advanceRepaymentMonths: 6,
            allowRemoteCheckIn: true,
            requireLocation: false,
            earlyLeaveThreshold: 15,
            monthlyLateLimit: 3,
            lateWarningLevels: [
              { count: 1, deductionFactor: 0.25 },
              { count: 2, deductionFactor: 0.5 },
            ],
            geofenceEnabled: false,
            officeLatitude: "30.0444",
            officeLongitude: "31.2357",
            geofenceRadius: 200,
            verbalWarningThreshold: 3,
            writtenWarningThreshold: 5,
            deductionWarningThreshold: 7,
            suspensionThreshold: 10,
            terminationThreshold: 15,
            warningExpiryMonths: 12,
            autoWarningOnLateness: true,
            autoWarningOnAbsence: true,
            probationPeriodMonths: 3,
            probationEvaluationRequired: true,
            reducedLeavesDuringProbation: true,
            probationLeavePercentage: 50,
            noticePeriodDays: 30,
            contractRenewalNoticeDays: 30,
            retirementAge: 60,
            requireClearance: true,
            remoteWorkAllowed: true,
            maxRemoteDaysPerWeek: 2,
            remoteWorkApprovalRequired: true,
            remoteWorkEquipmentProvided: false,
            dataRetentionYears: 7,
            employeeDataAccessLevel: "own_data_only",
            requireTwoFactorAuth: false,
            sessionTimeoutMinutes: 30,
            notifyOnLeaveRequest: true,
            notifyOnAttendanceIssue: true,
            notifyOnPayrollGeneration: true,
            notifyManagers: true,
            notifyOnWarning: true,
            notifyOnProbationEnd: true,
            notifyOnContractExpiry: true,
            aiOwnerNotificationsEnabled: false,
            ownerWhatsAppNumber: "01001234567",
            notificationRecipients: [],
          },
          notificationHealth: {
            connectedSessionCount: 1,
            hasConnectedSession: true,
            hasPrimaryRecipientConfigured: true,
            hasCompanyPhoneFallback: true,
            additionalRecipientsCount: 0,
            hasAnyRecipientConfigured: true,
            isReadyForWhatsAppDelivery: true,
            issues: [],
          },
        },
      });
    }
    if (url.includes("/hr/employees")) {
      return Promise.resolve({
        data: {
          employees: [
            {
              id: "emp-1",
              firstName: "أحمد",
              lastName: "علي",
              phone: "01011112222",
              employeeNumber: "EMP001",
              department: "الموارد البشرية",
            },
          ],
        },
      });
    }
    return Promise.resolve({ data: {} });
  });

  const put = vi.fn(() => Promise.resolve({ data: { success: true } }));

  return { mockApiGet: get, mockApiPut: put };
});

// Mock API
vi.mock("../../../../services/api", () => ({
  default: {
    get: mockApiGet,
    put: mockApiPut,
  },
}));
vi.mock("@/services/api", () => ({
  default: {
    get: mockApiGet,
    put: mockApiPut,
  },
}));

// Mock Sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

// Mock i18n toast
vi.mock("../../../../utils/i18n-toast", () => ({
  tToast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

describe("HRSettings Monolithic Deconstruction (Batch 327)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders header and working hours tab by default", async () => {
    render(
      <MemoryRouter initialEntries={["/hr/settings"]}>
        <HRSettings />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("إعدادات الموارد البشرية")).toBeInTheDocument();
    });

    expect(screen.getByText("أيام وأوقات العمل")).toBeInTheDocument();
    expect(screen.getAllByText("إدارة جدول العمل الأسبوعي").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("السبت")).toBeInTheDocument();
    expect(screen.getByText("الأحد")).toBeInTheDocument();
  });

  it("switches to leaves tab and renders leave settings with tabular numbers", async () => {
    render(
      <MemoryRouter initialEntries={["/hr/settings"]}>
        <HRSettings />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("إعدادات الموارد البشرية")).toBeInTheDocument();
    });

    // Click on leaves tab in sidebar
    const leavesTab = screen.getByText("الإجازات").closest("button");
    expect(leavesTab).toBeTruthy();
    fireEvent.click(leavesTab!);

    await waitFor(() => {
      expect(screen.getByText("إعدادات الإجازات الأساسية")).toBeInTheDocument();
    });

    expect(screen.getByText("أنواع الإجازات الإضافية")).toBeInTheDocument();
    expect(screen.getByText("رصيد الإجازة السنوية")).toBeInTheDocument();
    expect(screen.getByText("إجازة الأمومة")).toBeInTheDocument();
  });

  it("switches to payroll tab and displays correct options", async () => {
    render(
      <MemoryRouter initialEntries={["/hr/settings"]}>
        <HRSettings />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("إعدادات الموارد البشرية")).toBeInTheDocument();
    });

    const payrollTab = screen.getByText("الرواتب").closest("button");
    expect(payrollTab).toBeTruthy();
    fireEvent.click(payrollTab!);

    await waitFor(() => {
      expect(screen.getByText("إعدادات الرواتب")).toBeInTheDocument();
    });

    expect(screen.getByText("سياسات السلف المالية")).toBeInTheDocument();
    expect(screen.getByText("نسبة الضريبة (%)")).toBeInTheDocument();
  });

  it("filters tabs via sidebar search input", async () => {
    render(
      <MemoryRouter initialEntries={["/hr/settings"]}>
        <HRSettings />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("إعدادات الموارد البشرية")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("بحث في الأقسام...");
    fireEvent.change(searchInput, { target: { value: "أمان" } });

    expect(screen.getByText("الأمان")).toBeInTheDocument();
    expect(screen.queryByText("الرواتب")).not.toBeInTheDocument();
  });
});
