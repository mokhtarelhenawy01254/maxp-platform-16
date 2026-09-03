/* @vitest-environment jsdom */

import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import DynamicStorefrontPage from "../pages/DynamicStorefrontPage";
import CollectionCategoryPage from "../pages/CollectionCategoryPage";
import { StorefrontThemeProvider } from "../engine/ThemeProvider";

vi.mock("../hooks/useStorefrontSettings", () => ({
  useStorefrontSettings: () => ({
    settings: {
      company: { id: "comp-1" },
    },
    isLoading: false,
  }),
}));

vi.mock("../../hooks/useStorePage", () => ({
  useStorePage: () => ({
    page: null,
    loading: false,
    error: "Not found",
  }),
}));

vi.mock("../hooks/useCategories", () => ({
  useCategories: () => ({
    categories: [],
    loading: false,
  }),
}));

describe("Storefront dynamic pages 404 & Link references", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders 404 on DynamicStorefrontPage without throwing Link is not defined", () => {
    expect(() => {
      render(
        <MemoryRouter initialEntries={["/settings"]}>
          <StorefrontThemeProvider>
            <Routes>
              <Route path="/:pageSlug" element={<DynamicStorefrontPage />} />
            </Routes>
          </StorefrontThemeProvider>
        </MemoryRouter>,
      );
    }).not.toThrow();

    expect(screen.getByText("404")).toBeTruthy();
    expect(screen.getByRole("link", { name: /العودة للرئيسية|Back to Home/ })).toBeTruthy();
  });

  it("renders 404 on CollectionCategoryPage without throwing Link is not defined", () => {
    expect(() => {
      render(
        <MemoryRouter initialEntries={["/collection/unknown-category"]}>
          <StorefrontThemeProvider>
            <Routes>
              <Route
                path="/collection/:categorySlug"
                element={<CollectionCategoryPage />}
              />
            </Routes>
          </StorefrontThemeProvider>
        </MemoryRouter>,
      );
    }).not.toThrow();

    expect(screen.getByText("404")).toBeTruthy();
    expect(screen.getByRole("link", { name: /العودة للرئيسية|Back to Home/ })).toBeTruthy();
  });
});
