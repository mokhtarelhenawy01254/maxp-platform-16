import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import RewardsList from "../RewardsList";

const mockNavigate = jest.fn();
const mockUseAuth = jest.fn();
const mockGet = jest.fn();
const mockDelete = jest.fn();
const mockPatch = jest.fn();

jest.mock("../../../../hooks/useAuthSimple", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("../../../../services/apiClient", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}));

jest.mock("react-hot-toast", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("../../../../components/hr/ConfirmDialog", () => ({
  ConfirmDialog: ({
    open,
    onConfirm,
    onOpenChange,
    title,
    description,
    confirmText,
    requireTyping,
  }: any) =>
    open ? (
      <div>
        <p>{title}</p>
        <p>{description}</p>
        {requireTyping ? <input placeholder="حذف" /> : null}
        <button onClick={onConfirm}>{confirmText || "تأكيد"}</button>
        <button onClick={() => onOpenChange(false)}>إلغاء</button>
      </div>
    ) : null,
}));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

const { toast } = require("react-hot-toast") as {
  toast: { success: jest.Mock; error: jest.Mock };
};

const baseStatistics = {
  total: 1,
  totalValue: 900,
  byStatus: [{ status: "PENDING", count: 1, value: 900 }],
  byCategory: [{ category: "OTHER", count: 1, value: 900 }],
};

const emptyStatistics = {
  total: 0,
  totalValue: 0,
  byStatus: [],
  byCategory: [],
};

const buildRewardRecord = (overrides: Record<string, unknown> = {}) =>
  ({
    id: "reward-1",
    rewardName: "مكافأة تميز",
    rewardCategory: "OTHER",
    calculatedValue: 900,
    appliedMonth: 5,
    appliedYear: 2026,
    periodStart: "2026-05-01T00:00:00.000Z",
    periodEnd: "2026-05-31T00:00:00.000Z",
    reason: "أداء استثنائي",
    createdAt: "2026-05-21T08:00:00.000Z",
    user: {
      id: "user-1",
      firstName: "Yomna",
      lastName: "Mohamed",
      employeeNumber: "EMP00008",
    },
    rewardType: {
      name: "Reward of Excellence",
      nameAr: "مكافأة تميز",
      category: "OTHER",
    },
    ...overrides,
  }) as any;

const renderPage = () =>
  render(
    <MemoryRouter>
      <RewardsList />
    </MemoryRouter>,
  );

describe("RewardsList delete actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockReset();
    mockUseAuth.mockReturnValue({
      user: { role: "HR_MANAGER" },
    });
    mockDelete.mockResolvedValue({ data: { success: true } });
    mockPatch.mockResolvedValue({ data: { success: true } });
  });

  test("shows the red delete action for pending rewards even when the API status is empty and refreshes the UI after deletion", async () => {
    let rewardFetchCount = 0;
    let statisticsFetchCount = 0;

    mockGet.mockImplementation((url: string) => {
      if (url.startsWith("/hr/rewards/records?")) {
        rewardFetchCount += 1;

        return Promise.resolve({
          data: {
            success: true,
            records:
              rewardFetchCount === 1
                ? [buildRewardRecord({ status: undefined })]
                : [],
            pagination: {
              page: 1,
              limit: 20,
              total: rewardFetchCount === 1 ? 1 : 0,
              totalPages: 1,
            },
          },
        });
      }

      if (url.startsWith("/hr/rewards/statistics?")) {
        statisticsFetchCount += 1;

        return Promise.resolve({
          data: {
            success: true,
            data: statisticsFetchCount === 1 ? baseStatistics : emptyStatistics,
          },
        });
      }

      throw new Error(`Unexpected GET request: ${url}`);
    });

    renderPage();

    await screen.findByText("Yomna Mohamed");

    const deleteButton = screen.getByRole("button", {
      name: "حذف المكافأة مكافأة تميز",
    });
    expect(deleteButton).toBeEnabled();

    fireEvent.click(deleteButton);
    expect(screen.getByRole("button", { name: "إلغاء" })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("حذف")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "تأكيد الحذف" }));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith("/hr/rewards/records/reward-1");
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("تم حذف المكافأة بنجاح");
    });

    await screen.findByText("لا توجد مكافآت");
  });

  test("keeps delete hidden for HR users who do not have delete permission", async () => {
    mockUseAuth.mockReturnValue({
      user: { role: "HR" },
    });

    mockGet.mockImplementation((url: string) => {
      if (url.startsWith("/hr/rewards/records?")) {
        return Promise.resolve({
          data: {
            success: true,
            records: [buildRewardRecord({ status: "PENDING" })],
            pagination: {
              page: 1,
              limit: 20,
              total: 1,
              totalPages: 1,
            },
          },
        });
      }

      if (url.startsWith("/hr/rewards/statistics?")) {
        return Promise.resolve({
          data: {
            success: true,
            data: baseStatistics,
          },
        });
      }

      throw new Error(`Unexpected GET request: ${url}`);
    });

    renderPage();

    await screen.findByText("Yomna Mohamed");

    expect(
      screen.queryByRole("button", { name: "حذف المكافأة مكافأة تميز" }),
    ).not.toBeInTheDocument();
  });

  test("allows deleting applied rewards when they are not locked and not linked to payroll", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.startsWith("/hr/rewards/records?")) {
        return Promise.resolve({
          data: {
            success: true,
            records: [
              buildRewardRecord({
                status: "GIVEN",
              }),
            ],
            pagination: {
              page: 1,
              limit: 20,
              total: 1,
              totalPages: 1,
            },
          },
        });
      }

      if (url.startsWith("/hr/rewards/statistics?")) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              ...baseStatistics,
              byStatus: [{ status: "GIVEN", count: 1, value: 900 }],
            },
          },
        });
      }

      throw new Error(`Unexpected GET request: ${url}`);
    });

    renderPage();

    const deleteButton = await screen.findByRole("button", {
      name: "حذف المكافأة مكافأة تميز",
    });

    expect(deleteButton).toBeEnabled();

    fireEvent.click(deleteButton);
    fireEvent.click(screen.getByRole("button", { name: "تأكيد الحذف" }));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith("/hr/rewards/records/reward-1");
    });
  });

  test("disables delete for rewards that are already included in payroll", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.startsWith("/hr/rewards/records?")) {
        return Promise.resolve({
          data: {
            success: true,
            records: [
              buildRewardRecord({
                status: "GIVEN",
                isIncludedInPayroll: true,
                isLocked: false,
              }),
            ],
            pagination: {
              page: 1,
              limit: 20,
              total: 1,
              totalPages: 1,
            },
          },
        });
      }

      if (url.startsWith("/hr/rewards/statistics?")) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              ...baseStatistics,
              byStatus: [{ status: "GIVEN", count: 1, value: 900 }],
            },
          },
        });
      }

      throw new Error(`Unexpected GET request: ${url}`);
    });

    renderPage();

    const deleteButton = await screen.findByRole("button", {
      name: "حذف المكافأة مكافأة تميز",
    });

    expect(deleteButton).toBeDisabled();
    expect(deleteButton).toHaveAttribute(
      "title",
      "لا يمكن حذف مكافأة مدرجة في كشف الرواتب",
    );
  });
});
