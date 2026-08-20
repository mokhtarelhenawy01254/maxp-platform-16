import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AppDashboardPage from "../AppDashboardPage";

const mockGet = jest.fn();

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "ar" },
  }),
}));

jest.mock("../../../../services/apiClient", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    put: jest.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

const renderPage = (props: { allSections?: unknown[]; isLoading?: boolean } = {}) =>
  render(
    <MemoryRouter initialEntries={["/apps"]}>
      <AppDashboardPage
        userId="user-1"
        companyId="company-1"
        allSections={(props.allSections ?? []) as never}
        isLoading={props.isLoading}
      />
    </MemoryRouter>,
  );

describe("AppDashboardPage empty state", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue({
      data: { success: true, data: { appDashboardFavorites: {} } },
    });
  });

  it("shows skeletons while loading and no sections have arrived yet", () => {
    renderPage({ isLoading: true, allSections: [] });

    expect(document.querySelectorAll("[class*=animate-pulse]").length).toBeGreaterThan(0);
    expect(screen.queryByText("appDashboard.noAppsTitle")).not.toBeInTheDocument();
  });

  it("shows the empty-state message instead of skeletons when there are no visible apps", () => {
    renderPage({ isLoading: false, allSections: [] });

    expect(screen.getByText("appDashboard.noAppsTitle")).toBeInTheDocument();
    expect(screen.getByText("appDashboard.noAppsDescription")).toBeInTheDocument();
    expect(document.querySelectorAll("[class*=animate-pulse]").length).toBe(0);
  });
});
