/* @vitest-environment jsdom */

import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ConversionToolPage from "../ConversionToolPage";

vi.mock("../../../hooks/useAuthSimple", () => ({
  useAuth: () => ({
    isLoading: false,
    isAuthenticated: true,
    user: {
      id: "user-1",
      companyId: "company-1",
      company: { slug: "mystore" },
    },
  }),
}));

vi.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({
      data: {
        data: [
          {
            id: "app-1",
            status: "ACTIVE",
            app: { slug: "conversion-suite", name: "Conversion Suite" },
            settings: {
              general: { enabled: true },
              modules: {
                boughtTogether: true,
              },
              copy: {
                boughtTogetherTitle: "اشترِ معًا ووفّر",
              },
            },
          },
        ],
      },
    }),
    put: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

vi.mock("../../../services/storefrontSettingsService", () => ({
  storefrontSettingsService: {
    getSettings: () => Promise.resolve({ data: { themeId: "default" } }),
  },
}));

describe("ConversionToolPage", () => {
  it("renders boughtTogether tool details, actions, and fields", async () => {
    render(
      <MemoryRouter initialEntries={["/settings/store/tools/boughtTogether"]}>
        <Routes>
          <Route
            path="/settings/store/tools/:toolId"
            element={<ConversionToolPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    // Title / Header
    expect((await screen.findAllByText(/اشترِ معًا/i)).length).toBeGreaterThan(0);

    // Link/Action to Upsell Hub
    expect(
      screen.getAllByText(/إدارة وربط منتجات الباقات/i).length,
    ).toBeGreaterThan(0);

    // Fields
    expect(screen.getByText(/عنوان قسم الباقة/i)).toBeTruthy();
    expect(screen.getByText(/شكل وتنسيق عرض الباقة/i)).toBeTruthy();
  });
});
