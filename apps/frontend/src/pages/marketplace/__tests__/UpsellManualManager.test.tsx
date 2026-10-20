// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import UpsellManualManager from "../UpsellManualManager";

const { mockApiGet, mockApiPatch } = vi.hoisted(() => ({
  mockApiGet: vi.fn(),
  mockApiPatch: vi.fn(),
}));

vi.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockApiGet(...args),
    patch: (...args: unknown[]) => mockApiPatch(...args),
  },
}));

vi.mock("../../../utils/i18n-toast", () => ({
  tToast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockProducts = [
  {
    id: "prod-1",
    name: "تيشيرت بيسك أبيض",
    sku: "TSH-WHT-01",
    price: 350,
    isActive: true,
    category: { name: "ملابس" },
    metadata: {
      relatedProducts: ["prod-2"],
      crossSellProducts: [],
      upsellProducts: [],
    },
  },
  {
    id: "prod-2",
    name: "بنطلون جينز أسود",
    sku: "JNZ-BLK-02",
    price: 650,
    isActive: true,
    category: { name: "ملابس" },
    metadata: {},
  },
];

function renderUpsellManualManager(active = true) {
  return render(
    <MemoryRouter>
      <UpsellManualManager active={active} />
    </MemoryRouter>,
  );
}

describe("UpsellManualManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders manual links header and guidance", async () => {
    mockApiGet.mockResolvedValueOnce({
      data: {
        data: mockProducts,
      },
    });

    renderUpsellManualManager(true);

    expect(screen.getByText("مدير ربط المنتجات")).toBeInTheDocument();
    expect(screen.getByText("Manual Links")).toBeInTheDocument();
    expect(screen.getByText("Link Builder")).toBeInTheDocument();
    expect(screen.getByText("كيف يعمل هذا الربط؟")).toBeInTheDocument();
  });

  it("loads and displays product catalog items", async () => {
    mockApiGet.mockResolvedValueOnce({
      data: {
        data: mockProducts,
      },
    });

    renderUpsellManualManager(true);

    await waitFor(() => {
      expect(screen.getByText("تيشيرت بيسك أبيض")).toBeInTheDocument();
      expect(screen.getByText("بنطلون جينز أسود")).toBeInTheDocument();
    });
  });

  it("renders relation type tabs with badges", async () => {
    mockApiGet.mockResolvedValueOnce({
      data: {
        data: mockProducts,
      },
    });

    renderUpsellManualManager(true);

    expect(screen.getAllByText("Related").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Cross-sell").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Upsell").length).toBeGreaterThanOrEqual(1);
  });
});
