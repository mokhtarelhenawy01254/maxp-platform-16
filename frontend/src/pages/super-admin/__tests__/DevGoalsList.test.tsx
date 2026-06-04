/**
 * @module DevGoalsList.test
 * @description Tests for DevGoalsList page
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import DevGoalsList from "../DevGoalsList";

jest.mock("../../../utils/urlHelper", () => ({
  buildApiUrl: (endpoint: string) => `/api/v1/${endpoint}`,
}));

jest.mock("../../../utils/tokenManager", () => ({
  __esModule: true,
  default: {
    createAuthHeaders: jest.fn(() => ({ Authorization: "Bearer test-token" })),
  },
}));

jest.mock("../../../hooks/useTheme", () => ({
  useTheme: () => ({ actualTheme: "light" }),
}));

const mockGoals = [
  {
    id: "g1",
    title: "Increase Revenue",
    description: "Grow revenue by 20%",
    type: "TEAM",
    status: "ACTIVE",
    priority: "HIGH",
    targetType: "NUMBER",
    targetValue: 100,
    currentValue: 65,
    unit: "%",
    progress: 65,
    confidence: "ON_TRACK",
    startDate: "2026-04-01",
    endDate: "2026-06-30",
    quarter: "Q2-2026",
    tags: ["revenue", "growth"],
    owner: { id: "m1", name: "Ahmed", userId: "u1" },
    project: { id: "p1", name: "Project A", color: "#6366f1" },
    _count: { keyResults: 3, linkedTasks: 5, childGoals: 1 },
  },
  {
    id: "g2",
    title: "Improve Customer Satisfaction",
    description: null,
    type: "COMPANY",
    status: "COMPLETED",
    priority: "MEDIUM",
    targetType: "NUMBER",
    targetValue: 4.8,
    currentValue: 4.9,
    unit: "rating",
    progress: 100,
    confidence: null,
    startDate: "2026-01-01",
    endDate: "2026-03-31",
    quarter: "Q1-2026",
    tags: [],
    owner: null,
    project: null,
    _count: { keyResults: 2, linkedTasks: 8, childGoals: 0 },
  },
];

const mockStats = {
  totalGoals: 10,
  activeGoals: 7,
  completedGoals: 2,
  avgProgress: 55,
  atRiskCount: 1,
  totalKeyResults: 15,
  completedKeyResults: 8,
  totalLinkedTasks: 25,
};

const mockFetch = (url: string) => {
  if (url.includes("dashboard")) {
    return Promise.resolve({ json: () => Promise.resolve({ success: true, data: mockStats }) });
  }
  return Promise.resolve({ json: () => Promise.resolve({ success: true, data: mockGoals }) });
};

describe("DevGoalsList", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockImplementation(mockFetch) as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("should render page title", async () => {
    render(
      <BrowserRouter>
        <DevGoalsList />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/OKRs/)).toBeInTheDocument();
    });
  });

  test("should display loading spinner initially", async () => {
    render(
      <BrowserRouter>
        <DevGoalsList />
      </BrowserRouter>,
    );

    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  test("should render goals after loading", async () => {
    render(
      <BrowserRouter>
        <DevGoalsList />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Increase Revenue")).toBeInTheDocument();
      expect(screen.getByText("Improve Customer Satisfaction")).toBeInTheDocument();
    });
  });

  test("should display stats cards", async () => {
    render(
      <BrowserRouter>
        <DevGoalsList />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("10")).toBeInTheDocument();
      expect(screen.getByText("55%")).toBeInTheDocument();
    });
  });

  test("should show goal type labels", async () => {
    render(
      <BrowserRouter>
        <DevGoalsList />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("هدف فريق")).toBeInTheDocument();
      expect(screen.getByText("هدف شركة")).toBeInTheDocument();
    });
  });

  test("should show progress percentages", async () => {
    render(
      <BrowserRouter>
        <DevGoalsList />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("65%")).toBeInTheDocument();
      expect(screen.getByText("100%")).toBeInTheDocument();
    });
  });

  test("should show status badges", async () => {
    render(
      <BrowserRouter>
        <DevGoalsList />
      </BrowserRouter>,
    );

    await waitFor(() => {
      const activeBadges = screen.getAllByText("نشط");
      expect(activeBadges.length).toBeGreaterThanOrEqual(1);
      const completedBadges = screen.getAllByText("مكتمل");
      expect(completedBadges.length).toBeGreaterThanOrEqual(1);
    });
  });

  test("should show owner names", async () => {
    render(
      <BrowserRouter>
        <DevGoalsList />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Ahmed")).toBeInTheDocument();
    });
  });

  test("should show key results count", async () => {
    render(
      <BrowserRouter>
        <DevGoalsList />
      </BrowserRouter>,
    );

    await waitFor(() => {
      const krElements = screen.getAllByText(/النتائج الرئيسية/);
      expect(krElements.length).toBeGreaterThan(0);
    });
  });

  test("should show empty state when no goals", async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes("dashboard")) {
        return Promise.resolve({ json: () => Promise.resolve({ success: true, data: mockStats }) });
      }
      return Promise.resolve({ json: () => Promise.resolve({ success: true, data: [] }) });
    }) as jest.Mock;

    render(
      <BrowserRouter>
        <DevGoalsList />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("لا توجد أهداف")).toBeInTheDocument();
    });
  });

  test("should show new goal button", async () => {
    render(
      <BrowserRouter>
        <DevGoalsList />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("هدف جديد")).toBeInTheDocument();
    });
  });

  test("should show alignment tree button", async () => {
    render(
      <BrowserRouter>
        <DevGoalsList />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("شجرة المحاذاة")).toBeInTheDocument();
    });
  });

  test("should display quarter tags", async () => {
    render(
      <BrowserRouter>
        <DevGoalsList />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Q2-2026")).toBeInTheDocument();
      expect(screen.getByText("Q1-2026")).toBeInTheDocument();
    });
  });

  test("should display target values", async () => {
    render(
      <BrowserRouter>
        <DevGoalsList />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("65/100 %")).toBeInTheDocument();
    });
  });
});
