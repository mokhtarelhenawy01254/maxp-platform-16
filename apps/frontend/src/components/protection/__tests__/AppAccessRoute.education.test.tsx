// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppAccessRoute } from "../AppAccessRoute";

const mockAuthState: { user: any; isAuthenticated: boolean } = {
  user: null,
  isAuthenticated: true,
};

vi.mock("../../../hooks/useAuthSimple", () => ({
  useAuth: () => mockAuthState,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string, fallback?: string) => fallback || k,
  }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

describe("AppAccessRoute education-app gating", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks direct access to /admin/education/* when company does not have education-app installed", () => {
    mockAuthState.isAuthenticated = true;
    mockAuthState.user = {
      role: "OWNER",
      company: {
        isCurrent: true,
        activeApps: ["academy-app"],
      },
    };

    render(
      <MemoryRouter initialEntries={["/admin/education/dashboard"]}>
        <AppAccessRoute requiredAppSlugs={["education-app"]}>
          <div>Education Workspace</div>
        </AppAccessRoute>
      </MemoryRouter>,
    );

    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(screen.getAllByText(/النظام التعليمي/).length).toBeGreaterThan(0);
  });

  it("allows access when company has education-app installed", () => {
    mockAuthState.isAuthenticated = true;
    mockAuthState.user = {
      role: "OWNER",
      company: {
        isCurrent: true,
        activeApps: ["education-app"],
      },
    };

    render(
      <MemoryRouter initialEntries={["/admin/education/dashboard"]}>
        <AppAccessRoute requiredAppSlugs={["education-app"]}>
          <div>Education Workspace</div>
        </AppAccessRoute>
      </MemoryRouter>,
    );

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.getByText("Education Workspace")).toBeTruthy();
  });
});
