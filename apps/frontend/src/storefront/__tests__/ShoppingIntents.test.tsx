// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import ShoppingIntents from "../sections/ShoppingIntents";

vi.mock("../engine/ThemeProvider", () => ({
  useStorefrontTheme: () => ({
    theme: {
      id: "redline-auto",
      tokens: {
        layout: {
          contentAlign: "center",
        },
      },
    },
  }),
}));

describe("ShoppingIntents", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders intent cards with explicit images from 8-segment pipe items", () => {
    const settings = {
      badge: "اختر باقة سيارتك",
      title: "باقات تناسب جميع موديلات السيارات",
      subtitle: "اختر الباقة الأنسب لاحتياجك",
      items:
        "باقة الصالون|طقم سيدان 5 قطع|عزل حراري كامل|/shop|primary|الأكثر طلباً|4 أبواب,عزل 98%|/assets/stores/red-line/full-kit-80.png\n" +
        "إصدار عملي|ستائر جرار بالسحاب|سحاب معدني سلس|/shop|primary|جرار بسحاب|سحاب معدني|/assets/stores/red-line/tint-80-movable.png",
    };

    render(
      <MemoryRouter>
        <ShoppingIntents settings={settings} />
      </MemoryRouter>,
    );

    expect(screen.getByText("باقات تناسب جميع موديلات السيارات")).toBeInTheDocument();
    expect(screen.getByText("طقم سيدان 5 قطع")).toBeInTheDocument();
    expect(screen.getByText("ستائر جرار بالسحاب")).toBeInTheDocument();

    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(2);
    expect(images[0]).toHaveAttribute("src", "/assets/stores/red-line/full-kit-80.png");
    expect(images[1]).toHaveAttribute("src", "/assets/stores/red-line/tint-80-movable.png");
  });

  it("automatically resolves contextual car curtain images when no explicit image is provided", () => {
    const settings = {
      badge: "اختر باقة سيارتك",
      title: "باقات تناسب جميع موديلات السيارات",
      items:
        "باقة الصالون|طقم سيدان 5 قطع|4 شبابيك جانبية وزجاج خلفي|/shop|primary|الأكثر طلباً|4 أبواب\n" +
        "باقة VIP|طقم SUV وجيب 7 قطع|تغطية شاملة لـ 4 أبواب و2 هواية|/shop|accent|تغطية 100%|VIP",
    };

    render(
      <MemoryRouter>
        <ShoppingIntents settings={settings} />
      </MemoryRouter>,
    );

    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(2);
    // Sedan resolves to full-kit-80.png
    expect(images[0]).toHaveAttribute("src", "/assets/stores/red-line/full-kit-80.png");
    // SUV resolves to redline-exterior-view.jpg
    expect(images[1]).toHaveAttribute("src", "/assets/stores/red-line/redline-exterior-view.jpg");
  });
});
