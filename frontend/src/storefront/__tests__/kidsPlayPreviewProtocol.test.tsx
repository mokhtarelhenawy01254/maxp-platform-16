// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import HeroBanner from "../sections/HeroBanner";
import FeaturedCollections from "../sections/FeaturedCollections";

vi.mock("../hooks/useCategories", () => ({
  useCategories: () => ({
    categories: [],
    isLoading: false,
  }),
}));

vi.mock("../engine/ThemeProvider", () => ({
  useStorefrontTheme: () => ({
    theme: {
      id: "kids-play",
    },
  }),
}));

describe("Kids Play preview protocol", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders the layered-parallax-sky hero with the themed CTA instead of fallback English copy", () => {
    render(
      <MemoryRouter initialEntries={["/store?previewTheme=kids-play&previewSource=marketplace"]}>
        <HeroBanner
          section={{ variant: "layered-parallax-sky" }}
          settings={{
            title: "عالم من المرح الخيالي",
            subtitle:
              "اكتشف ألعابًا تعليمية وحركية بصور واضحة وخامات مطمئنة تساعدك تختار الأنسب لطفلك بسرعة.",
            primaryCtaText: "تسوق الألعاب الآن",
            primaryCtaLink: "/shop",
            panelImage:
              "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=1200&q=80",
          }}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("link", { name: "تسوق الألعاب الآن" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("SHOP NOW")).not.toBeInTheDocument();
  });

  it("renders floating-bubbles with kids-specific subtitle instead of shoe fallback copy", () => {
    render(
      <MemoryRouter initialEntries={["/store?previewTheme=kids-play&previewSource=marketplace"]}>
        <FeaturedCollections
          section={{ variant: "floating-bubbles" }}
          settings={{
            title: "تسوق حسب العمر ونمط اللعب",
          }}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByText("ابدأ من نوع اللعب أو المرحلة العمرية لتصل للعبة المناسبة بسرعة ووضوح."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/نوع الحذاء المناسب/)).not.toBeInTheDocument();
  });
});
