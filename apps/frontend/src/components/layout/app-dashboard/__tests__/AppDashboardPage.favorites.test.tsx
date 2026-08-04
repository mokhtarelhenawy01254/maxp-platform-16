import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AppDashboardPage from "../AppDashboardPage";
import type { SidebarSection } from "../../../../types/layout";

const mockGet = jest.fn();
const mockPut = jest.fn();

const createStorageMock = (): Storage => {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: jest.fn(() => store.clear()),
    getItem: jest.fn((key: string) => store.get(key) ?? null),
    key: jest.fn((index: number) => Array.from(store.keys())[index] ?? null),
    removeItem: jest.fn((key: string) => {
      store.delete(key);
    }),
    setItem: jest.fn((key: string, value: string) => {
      store.set(key, String(value));
    }),
  };
};

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "ar" },
  }),
}));

jest.mock("../../../../services/apiClient", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    put: (...args: unknown[]) => mockPut(...args),
  },
}));

const whatsappSection: SidebarSection = {
  id: "whatsapp",
  title: "WhatsApp",
  items: [
    { to: "/whatsapp", label: "Inbox" },
    { to: "/whatsapp/settings", label: "Settings" },
  ],
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/apps"]}>
      <AppDashboardPage userId="user-1" companyId="company-1" allSections={[whatsappSection]} />
    </MemoryRouter>,
  );

describe("AppDashboardPage favorites sync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage = createStorageMock();
    mockGet.mockResolvedValue({
      data: { success: true, data: { appDashboardFavorites: {} } },
    });
    mockPut.mockResolvedValue({ data: { success: true } });
  });

  it("loads server-side favorites for the current company on mount", async () => {
    mockGet.mockResolvedValue({
      data: {
        success: true,
        data: { appDashboardFavorites: { "company-1": ["whatsapp"] } },
      },
    });

    renderPage();

    const favoriteButton = await screen.findByRole("button", { name: /removeFromFavorites/ });
    expect(favoriteButton).toHaveAttribute("aria-pressed", "true");
    expect(mockGet).toHaveBeenCalledWith(
      "/user/settings",
      expect.objectContaining({ _skipErrorToast: true }),
    );
  });

  it("persists a toggled favorite to the server scoped by company", async () => {
    renderPage();

    const favoriteButton = await screen.findByRole("button", { name: /addToFavorites/ });
    fireEvent.click(favoriteButton);

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith("/user/settings", {
        settings: { appDashboardFavorites: { "company-1": ["whatsapp"] } },
      });
    });

    expect(screen.getByRole("button", { name: /removeFromFavorites/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("keeps local favorites when the server has no entry for this company", async () => {
    window.localStorage.setItem(
      "app-dashboard-favorites:company-1:user-1",
      JSON.stringify(["whatsapp"]),
    );

    renderPage();

    const favoriteButton = await screen.findByRole("button", { name: /removeFromFavorites/ });
    expect(favoriteButton).toHaveAttribute("aria-pressed", "true");
  });
});
