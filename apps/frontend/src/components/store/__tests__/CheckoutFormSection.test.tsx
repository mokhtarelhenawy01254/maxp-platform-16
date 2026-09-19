/* @vitest-environment jsdom */

import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheckoutFormSection } from "../CheckoutFormSection";
import { DEFAULT_PDP_QUICK_ORDER_SETTINGS } from "../../../storefront/utils/pdpQuickOrderSettings";

describe("CheckoutFormSection", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows the merge mode selector for PDP quick order settings", () => {
    render(
      <CheckoutFormSection
        settings={{}}
        onChange={vi.fn()}
        onSave={vi.fn()}
        onReset={vi.fn()}
        productPageCheckoutEnabled={true}
        onProductPageCheckoutToggle={vi.fn()}
        pdpQuickOrderSettings={DEFAULT_PDP_QUICK_ORDER_SETTINGS}
        onPdpQuickOrderSettingsChange={vi.fn()}
      />,
    );

    expect(screen.getByText("أسلوب الدمج")).toBeTruthy();
    expect(screen.getByDisplayValue("كتلة مستقلة")).toBeTruthy();
    expect(
      screen.getByText("كتلة واحدة مع المتغيرات والشراء"),
    ).toBeTruthy();
  });

  it("updates the surface mode when the selector changes", () => {
    const handlePdpQuickOrderSettingsChange = vi.fn();

    render(
      <CheckoutFormSection
        settings={{}}
        onChange={vi.fn()}
        onSave={vi.fn()}
        onReset={vi.fn()}
        productPageCheckoutEnabled={true}
        onProductPageCheckoutToggle={vi.fn()}
        pdpQuickOrderSettings={DEFAULT_PDP_QUICK_ORDER_SETTINGS}
        onPdpQuickOrderSettingsChange={handlePdpQuickOrderSettingsChange}
      />,
    );

    const mergeModeLabel = screen.getByText("أسلوب الدمج");
    const mergeModeCard = mergeModeLabel.closest("div");
    const mergeModeSelect = mergeModeCard?.querySelector("select");

    expect(mergeModeSelect).toBeTruthy();

    fireEvent.change(mergeModeSelect as HTMLSelectElement, {
      target: { value: "merged-buybox" },
    });

    expect(handlePdpQuickOrderSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        surfaceMode: "merged-buybox",
      }),
    );
  });

  it("renders the storewide custom field row and allows toggling it", () => {
    const handlePdpQuickOrderSettingsChange = vi.fn();

    const { rerender } = render(
      <CheckoutFormSection
        settings={{}}
        onChange={vi.fn()}
        onSave={vi.fn()}
        onReset={vi.fn()}
        productPageCheckoutEnabled={true}
        onProductPageCheckoutToggle={vi.fn()}
        pdpQuickOrderSettings={DEFAULT_PDP_QUICK_ORDER_SETTINGS}
        onPdpQuickOrderSettingsChange={handlePdpQuickOrderSettingsChange}
      />,
    );

    expect(screen.getByText("على مستوى المتجر")).toBeTruthy();

    // Re-render with enabled: true to verify inputs appear
    rerender(
      <CheckoutFormSection
        settings={{}}
        onChange={vi.fn()}
        onSave={vi.fn()}
        onReset={vi.fn()}
        productPageCheckoutEnabled={true}
        onProductPageCheckoutToggle={vi.fn()}
        pdpQuickOrderSettings={{
          ...DEFAULT_PDP_QUICK_ORDER_SETTINGS,
          customField: {
            enabled: true,
            required: true,
            label: "نوع وموديل وسنة صنع السيارة",
            placeholder: "مثال: هيونداي توسان 2022",
          },
        }}
        onPdpQuickOrderSettingsChange={handlePdpQuickOrderSettingsChange}
      />,
    );

    expect(screen.getByPlaceholderText("مثال: نوع وموديل وسنة صنع السيارة")).toBeTruthy();
    expect(screen.getByPlaceholderText("مثال: اكتب موديل وسنة صنع السيارة...")).toBeTruthy();
  });
});
