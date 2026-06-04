// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import FeaturedCollections from "../sections/FeaturedCollections";

const runtimeCategories = [
  {
    id: "live-sneakers",
    name: "Live Sneakers",
    slug: "live-sneakers",
    description: "Runtime category from the storefront API.",
    image: "/runtime/live-sneakers.jpg",
  },
  {
    id: "live-flats",
    name: "Live Flats",
    slug: "live-flats",
    description: "Second runtime category.",
    image: "/runtime/live-flats.jpg",
  },
];

vi.mock("../hooks/useCategories", () => ({
  useCategories: () => ({
    categories: runtimeCategories,
    isLoading: false,
  }),
}));

vi.mock("../engine/ThemeProvider", () => ({
  useStorefrontTheme: () => ({
    theme: {
      id: "khemet-luxe-eg",
      direction: "rtl",
    },
  }),
}));

describe("KHEMET featured collections", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders runtime categories over configured manual collections in gallery columns", () => {
    render(
      <MemoryRouter initialEntries={["/store"]}>
        <FeaturedCollections
          section={{ variant: "gallery-columns" }}
          settings={{
            title: "KHEMET collections",
            limit: 2,
            collections: [
              {
                title: "Manual Run-Luxe",
                subtitle: "Fixed JSON collection.",
                image: "/manual/run-luxe.jpg",
                link: "/shop?category=sneakers",
              },
            ],
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Live Sneakers")).toBeInTheDocument();
    expect(screen.getByText("Live Flats")).toBeInTheDocument();
    expect(screen.queryByText("Manual Run-Luxe")).not.toBeInTheDocument();

    expect(screen.getByRole("link", { name: /Live Sneakers/i })).toHaveAttribute(
      "href",
      "/store/shop?category=live-sneakers",
    );
  });
});
