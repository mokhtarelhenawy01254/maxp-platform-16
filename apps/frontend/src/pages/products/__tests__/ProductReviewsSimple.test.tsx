/** @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import ProductReviewsSimple from "../ProductReviewsSimple";

vi.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock("../../../hooks/useAuthSimple", () => ({
  useAuth: () => ({
    user: {
      company: { slug: "test-store" },
      companyId: "comp-123",
    },
  }),
}));

vi.mock("../../../hooks/useDateFormat", () => ({
  useDateFormat: () => ({
    formatDate: (d: string) => d,
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import { apiClient } from "../../../services/apiClient";

describe("ProductReviewsSimple Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders header, stats cards, filters, and fetched reviews list", async () => {
    const mockReviews = [
      {
        id: "rev-1",
        productId: "prod-1",
        productName: "ساعة فاخرة",
        customerName: "أحمد علي",
        rating: 5,
        title: "ممتازة جداً",
        comment: "جودة عالية وسرعة توصيل ممتازة",
        isApproved: true,
        helpfulCount: 3,
        createdAt: "2026-10-20",
      },
      {
        id: "rev-2",
        productId: "prod-2",
        productName: "حذاء رياضي",
        customerName: "سارة محمد",
        rating: 4,
        title: "مريح ومناسب",
        comment: "المقاس مضبوط تماماً",
        isApproved: false,
        helpfulCount: 0,
        createdAt: "2026-10-21",
      },
    ];

    (apiClient.get as any).mockResolvedValue({
      data: {
        success: true,
        data: {
          reviews: mockReviews,
          pagination: {
            page: 1,
            limit: 20,
            total: 2,
            pages: 1,
          },
        },
      },
    });

    render(<ProductReviewsSimple />);

    // Header and Stats
    expect(screen.getByText("productReviews.k_22")).toBeInTheDocument();
    expect(screen.getByText("productReviews.k_24")).toBeInTheDocument();

    // Filters
    expect(screen.getByPlaceholderText("productReviews.k_10")).toBeInTheDocument();

    // Reviews list after fetch
    await waitFor(() => {
      expect(screen.getByText("أحمد علي")).toBeInTheDocument();
      expect(screen.getByText("سارة محمد")).toBeInTheDocument();
      expect(screen.getByText("ممتازة جداً")).toBeInTheDocument();
      expect(screen.getByText("مريح ومناسب")).toBeInTheDocument();
    });
  });
});
