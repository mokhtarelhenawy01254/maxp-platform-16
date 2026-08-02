import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AppShell from "../AppShell";
import type { SidebarSection } from "../../../../types/layout";

const mockUseAuth = jest.fn();

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "ar" },
  }),
}));

jest.mock("../../../../hooks/useAuthSimple", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("../../../../utils/storeUrl", () => ({
  buildStoreUrl: (slug: string, to: string) => `https://${slug}.example.com${to}`,
}));

const whatsappSection: SidebarSection = {
  id: "whatsapp",
  title: "WhatsApp",
  items: [
    { to: "/whatsapp", label: "Inbox" },
    { to: "/whatsapp/settings", label: "Settings" },
  ],
};

describe("AppShell mobile navigation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: {
        id: "user-1",
        role: "OWNER",
        company: { id: "company-1", slug: "my-shop" },
      },
    });
  });

  it("renders a mobile header whose button opens the app menu drawer", async () => {
    render(
      <MemoryRouter initialEntries={["/apps/whatsapp/inbox"]}>
        <Routes>
          <Route
            path="/apps/:appId/*"
            element={
              <AppShell allSections={[whatsappSection]}>
                <div>App content</div>
              </AppShell>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    const openButton = screen.getByRole("button", { name: /openAppMenu/ });
    expect(openButton).toBeInTheDocument();
    expect(openButton).toHaveAttribute("aria-expanded", "false");

    await act(async () => {
      fireEvent.click(openButton);
    });

    await waitFor(() => {
      expect(openButton).toHaveAttribute("aria-expanded", "true");
    });

    const drawer = screen.getByRole("dialog");
    expect(drawer).toHaveAttribute("aria-modal", "true");
    expect(drawer).toHaveAttribute("id", "app-shell-mobile-drawer");
  });

  it("renders the sidebar inside the mobile drawer with a fixed width so it is visible when open", async () => {
    render(
      <MemoryRouter initialEntries={["/apps/whatsapp/inbox"]}>
        <Routes>
          <Route
            path="/apps/:appId/*"
            element={
              <AppShell allSections={[whatsappSection]}>
                <div>App content</div>
              </AppShell>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    const openButton = screen.getByRole("button", { name: /openAppMenu/ });
    await act(async () => {
      fireEvent.click(openButton);
    });
    await waitFor(() => {
      expect(openButton).toHaveAttribute("aria-expanded", "true");
    });

    const drawer = screen.getByRole("dialog");
    const className = drawer.className ?? "";
    expect(className).toContain("w-72");
    expect(className).toContain("max-w-[85vw]");
    expect(className).toContain("translate-x-0");
  });

  it("closes the drawer on Escape and restores focus to the toggle", async () => {
    render(
      <MemoryRouter initialEntries={["/apps/whatsapp/inbox"]}>
        <Routes>
          <Route
            path="/apps/:appId/*"
            element={
              <AppShell allSections={[whatsappSection]}>
                <div>App content</div>
              </AppShell>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    const openButton = screen.getByRole("button", { name: /openAppMenu/ });

    await act(async () => {
      fireEvent.click(openButton);
    });
    await waitFor(() => {
      expect(openButton).toHaveAttribute("aria-expanded", "true");
    });

    await act(async () => {
      fireEvent.keyDown(document, { key: "Escape" });
    });

    await waitFor(() => {
      expect(openButton).toHaveAttribute("aria-expanded", "false");
    });
    expect(openButton).toHaveFocus();
  });
});
