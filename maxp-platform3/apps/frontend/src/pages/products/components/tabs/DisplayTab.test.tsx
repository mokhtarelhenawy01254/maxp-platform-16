// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProductAttribute, ProductVariantSettings } from "../../types";
import { DisplayTab } from "./DisplayTab";

const colorAttribute: ProductAttribute = {
  id: "attr-color",
  name: "اللون",
  slug: "color",
  values: ["برجاندي", "رمادي", "أسود"],
  visible: true,
  forVariations: true,
};

const t = (key: string) => {
  const labels: Record<string, string> = {
    "products.display.title": "تخصيص عرض المتغيرات",
    "products.display.description": "اختر كيف تظهر المتغيرات",
    "products.display.default": "افتراضي",
    "products.display.buttons": "أزرار",
    "products.display.circles": "دوائر ألوان",
    "products.display.dropdown": "قائمة",
    "products.display.thumbnails": "صور مصغرة",
    "products.display.radio": "خيارات",
  };

  return labels[key] || key;
};

afterEach(() => {
  cleanup();
});

const renderDisplayTab = (initialSettings?: ProductVariantSettings) => {
  let latestSettings: ProductVariantSettings = initialSettings || {
    styles: {},
    attributeImages: {},
    attributeColors: {},
  };

  const Wrapper = () => {
    const [settings, setSettings] =
      React.useState<ProductVariantSettings>(latestSettings);

    return (
      <DisplayTab
        attributes={[colorAttribute]}
        variants={[]}
        variantSettings={settings}
        setVariantSettings={(next) => {
          setSettings((previous) => {
            const resolved =
              typeof next === "function" ? next(previous) : next;
            latestSettings = resolved;
            return resolved;
          });
        }}
        setActiveTab={vi.fn()}
        uploadFiles={vi.fn()}
        t={t}
      />
    );
  };

  return {
    ...render(<Wrapper />),
    getLatestSettings: () => latestSettings,
  };
};

describe("DisplayTab color circle picker", () => {
  it("stores every display style selected from the admin dropdown", () => {
    const { getLatestSettings } = renderDisplayTab();
    const select = screen.getByRole("combobox");

    fireEvent.change(select, { target: { value: "dropdown" } });

    expect(getLatestSettings().styles).toEqual({
      اللون: "dropdown",
    });
    expect(
      screen.queryByText("اختاري لون الدائرة لكل قيمة"),
    ).not.toBeInTheDocument();

    fireEvent.change(select, { target: { value: "radio" } });

    expect(getLatestSettings().styles).toEqual({
      اللون: "radio",
    });

    fireEvent.change(select, { target: { value: "buttons" } });

    expect(getLatestSettings().styles).toEqual({
      اللون: "buttons",
    });
  });

  it("clears thumbnail images when the admin switches to another style", () => {
    const { getLatestSettings } = renderDisplayTab({
      styles: { اللون: "thumbnails" },
      attributeImages: {
        اللون: {
          برجاندي: "/uploads/products/burgundy.png",
        },
      },
      attributeColors: {},
    });

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "dropdown" },
    });

    expect(getLatestSettings()).toMatchObject({
      styles: { اللون: "dropdown" },
      attributeImages: {},
    });
  });

  it("shows the color palette and stores selected swatches when circles are selected", () => {
    const { getLatestSettings } = renderDisplayTab();

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "circles" },
    });

    expect(screen.getByText("اختاري لون الدائرة لكل قيمة")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "رمادي تلقائي" }));
    fireEvent.click(screen.getByRole("button", { name: "اختيار بترولي لـ رمادي" }));

    expect(getLatestSettings().attributeColors).toEqual({
      اللون: {
        رمادي: "#155e75",
      },
    });
  });
});
