// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import StorefrontPageSectionsEditor from "../../components/store/StorefrontPageSectionsEditor";
import { getStorefrontPageOverridesFromDesignTokens } from "../utils/pageOverrides";
import { validateStorefrontPageOverrides } from "../utils/pageOverrideValidation";

vi.mock("../../services/imageGalleryService", () => ({
  default: {
    listImages: vi.fn().mockResolvedValue([
      {
        id: "gallery-1",
        url: "https://cdn.example.com/gallery/lookbook-card.jpg",
        filename: "lookbook-card.jpg",
      },
    ]),
    uploadImage: vi.fn(),
  },
  imageGalleryService: {
    listImages: vi.fn().mockResolvedValue([
      {
        id: "gallery-1",
        url: "https://cdn.example.com/gallery/lookbook-card.jpg",
        filename: "lookbook-card.jpg",
      },
    ]),
    uploadImage: vi.fn(),
  },
}));

afterEach(() => {
  cleanup();
});

describe("StorefrontPageSectionsEditor", () => {
  const availableCategories = [
    {
      id: "heels",
      name: "Heels",
      slug: "heels",
      image: "https://cdn.example.com/categories/heels.jpg",
      description: "Sharp heels for polished looks.",
    },
    {
      id: "sandals",
      name: "Sandals",
      slug: "sandals",
      image: "https://cdn.example.com/categories/sandals.jpg",
      description: "Day-to-night sandals for lighter outfits.",
    },
    {
      id: "flats",
      name: "Flats",
      slug: "flats",
      image: "https://cdn.example.com/categories/flats.jpg",
      description: "Flats built for longer work days.",
    },
  ];

  const availableProducts = [
    {
      id: "prod-crystal-heel",
      name: "Crystal Heel",
      slug: "crystal-heel",
      categoryId: "heels",
      categoryName: "Heels",
    },
    {
      id: "prod-velvet-mule",
      name: "Velvet Mule",
      slug: "velvet-mule",
      categoryId: "flats",
      categoryName: "Flats",
    },
  ];

  const StatefulEditor = ({
    themeId = "modern-minimal",
    categories = [],
    products = [],
    catalogLoading = false,
    autoValidate = false,
  }: {
    themeId?: string;
    categories?: Array<{
      id: string;
      name: string;
      slug: string;
      image?: string;
      description?: string;
    }>;
    products?: Array<{
      id: string;
      name: string;
      slug: string;
      categoryId?: string;
      categoryName?: string;
    }>;
    catalogLoading?: boolean;
    autoValidate?: boolean;
  }) => {
    const [designTokens, setDesignTokens] = React.useState<Record<string, unknown>>({
      themeId,
    });
    const validationIssues = React.useMemo(
      () =>
        autoValidate
          ? validateStorefrontPageOverrides({
              overrides: getStorefrontPageOverridesFromDesignTokens(designTokens),
              categories,
              products,
            }).issues
          : [],
      [autoValidate, categories, designTokens, products],
    );

    return (
      <>
        <StorefrontPageSectionsEditor
          themeId={themeId}
          designTokens={designTokens}
          availableCategories={categories}
          availableProducts={products}
          catalogLoading={catalogLoading}
          validationIssues={validationIssues}
          onChange={setDesignTokens}
        />
        <pre data-testid="design-tokens">{JSON.stringify(designTokens)}</pre>
      </>
    );
  };

  const readDesignTokens = (): Record<string, unknown> =>
    JSON.parse(screen.getByTestId("design-tokens").textContent || "{}");

  const readPageOverrideSections = (pageKey: string) =>
    getStorefrontPageOverridesFromDesignTokens(readDesignTokens())[pageKey]?.sections ?? [];

  const findSectionOverride = (pageKey: string, sectionType: string) => {
    const sections = readPageOverrideSections(pageKey);

    return sections.find(
      (section): section is Record<string, unknown> =>
        typeof section === "object" &&
        section !== null &&
        !Array.isArray(section) &&
        section["type"] === sectionType,
    );
  };

  it("writes section variants and settings into page overrides", async () => {
    const user = userEvent.setup();

    render(<StatefulEditor />);

    await user.click(screen.getByRole("button", { name: /المتجر/i }));
    const shopGridSection = screen
      .getByText("منتجات التصنيف")
      .closest(".rounded-xl")!;
    await user.selectOptions(
      within(shopGridSection as HTMLElement).getByLabelText("النسخة البصرية"),
      "overlay-card",
    );
    await user.clear(screen.getByLabelText("عنوان الشبكة"));
    await user.type(screen.getByLabelText("عنوان الشبكة"), "Latest Drops");
    await user.clear(screen.getByLabelText("العدد في الصفحة"));
    await user.type(screen.getByLabelText("العدد في الصفحة"), "6");

    expect(
      getStorefrontPageOverridesFromDesignTokens(readDesignTokens()),
    ).toEqual({
      shop: {
        sections: [
          {
            type: "product-grid",
            variant: "overlay-card",
            settings: {
              title: "Latest Drops",
              limit: 6,
            },
          },
          "filters-sidebar",
        ],
      },
    });
  });

  it("removes page overrides when section settings are cleared back to defaults", async () => {
    const user = userEvent.setup();

    render(<StatefulEditor />);

    await user.click(screen.getByRole("button", { name: /السلة/i }));
    const checkoutButtonTextInput = screen.getByLabelText("نص زر إكمال الشراء");
    await user.type(checkoutButtonTextInput, "Complete order");

    expect(
      getStorefrontPageOverridesFromDesignTokens(readDesignTokens()),
    ).toEqual({
      cart: {
        sections: [
          {
            type: "cart-items",
            variant: "compact",
            settings: {
              title: "Your selection",
              subtitle: "A clean cart review before the final checkout step.",
            },
          },
          {
            type: "order-summary",
            variant: "minimal",
            settings: {
              checkoutButtonText: "Complete order",
              subtitle:
                "Minimal summary copy with free-shipping progress and coupon entry.",
              showTrustRow: "true",
            },
          },
        ],
      },
    });

    await user.clear(checkoutButtonTextInput);

    expect(getStorefrontPageOverridesFromDesignTokens(readDesignTokens())).toEqual(
      {},
    );
  });

  it("shows the extra theme pages that come from Solea Femme", () => {
    render(<StatefulEditor themeId="solea-femme" />);

    expect(screen.getByRole("button", { name: /التخفيضات/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /التصنيفات/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /اللوك بوك/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /دليل المقاسات/i })).toBeInTheDocument();
  });

  it("persists custom pages that are created from the editor", async () => {
    const user = userEvent.setup();
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("about-us");

    render(<StatefulEditor />);

    await user.click(screen.getByRole("button", { name: /\+ إضافة صفحة جديدة/i }));

    expect(getStorefrontPageOverridesFromDesignTokens(readDesignTokens())).toEqual({
      "about-us": {
        sections: ["hero-banner", "product-grid", "newsletter"],
      },
    });
    expect(
      screen.getByRole("button", { name: /About Us \(3\)/i }),
    ).toBeInTheDocument();

    promptSpy.mockRestore();
  });

  it("edits lookbook category cards through the structured editor UI", async () => {
    const user = userEvent.setup();

    render(<StatefulEditor themeId="solea-femme" />);

    await user.click(screen.getByRole("button", { name: /\+ إضافة بطاقة Lookbook/i }));

    const categoryInputs = screen.getAllByLabelText("مفتاح التصنيف");
    const titleInputs = screen.getAllByLabelText("عنوان البطاقة");
    const subtitleInputs = screen.getAllByLabelText("الوصف القصير");
    const moodInputs = screen.getAllByLabelText("الـ Mood");
    const linkInputs = screen.getAllByLabelText("رابط البطاقة");

    const lastIndex = titleInputs.length - 1;

    await user.type(categoryInputs[lastIndex]!, "mules");
    await user.type(titleInputs[lastIndex]!, "SoftMuleEdit");
    await user.type(subtitleInputs[lastIndex]!, "LightEveningLook");
    await user.type(moodInputs[lastIndex]!, "EveningMood");
    await user.type(linkInputs[lastIndex]!, "/shop?category=mules");

    expect(findSectionOverride("home", "lookbook-showcase")).toEqual(
      expect.objectContaining({
        type: "lookbook-showcase",
        settings: expect.objectContaining({
          categoryCards: expect.stringContaining(
            "mules|SoftMuleEdit|LightEveningLook|EveningMood||/shop?category=mules",
          ),
        }),
      }),
    );
  });

  it("edits dynamic size guide rows through the structured editor UI", async () => {
    const user = userEvent.setup();

    render(<StatefulEditor themeId="solea-femme" />);

    await user.click(screen.getByRole("button", { name: /صفحة المنتج/i }));

    await user.click(screen.getByRole("button", { name: /\+ إضافة صف مقاس/i }));

    const cmInputs = screen.getAllByLabelText("CM");

    const lastIndex = cmInputs.length - 1;
    const rowCard = screen
      .getByText(`صف مقاس #${lastIndex + 1}`)
      .closest("div.rounded-xl");

    expect(rowCard).not.toBeNull();

    const rowScope = within(rowCard as HTMLElement);

    await user.selectOptions(rowScope.getByLabelText("نوع Target"), "product");
    await user.type(rowScope.getByLabelText("المنتج المستهدف"), "velvet-mule");
    await user.type(rowScope.getByLabelText("EU"), "40");
    await user.type(rowScope.getByLabelText("UK"), "7");
    await user.type(rowScope.getByLabelText("US"), "9");
    await user.type(rowScope.getByLabelText("CM"), "25.1");

    expect(findSectionOverride("pdp", "size-guide")).toEqual(
      expect.objectContaining({
        type: "size-guide",
        settings: expect.objectContaining({
          guideRows: expect.stringContaining("product:velvet-mule|40|7|9|25.1"),
        }),
      }),
    );
  });

  it("shows an explicit PDP checkout visibility status and toggles the section", async () => {
    const user = userEvent.setup();

    render(<StatefulEditor />);

    await user.click(screen.getByRole("button", { name: /صفحة المنتج/i }));

    expect(
      screen.getByText("حالة الشيك أوت داخل صفحة المنتج"),
    ).toBeInTheDocument();
    expect(screen.getByText("غير ظاهر حاليًا")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "إظهار الشيك أوت" }));

    expect(readPageOverrideSections("pdp")).toContain("pdp-checkout");
    expect(screen.getByText("ظاهر الآن")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "الانتقال للقسم" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "إخفاء الشيك أوت" }));

    expect(readPageOverrideSections("pdp")).not.toContain("pdp-checkout");
    expect(screen.getByText("غير ظاهر حاليًا")).toBeInTheDocument();
  });

  it("selects lookbook categories from loaded storefront data", async () => {
    const user = userEvent.setup();

    render(
      <StatefulEditor
        themeId="solea-femme"
        categories={availableCategories}
      />,
    );

    const categorySelects = screen.getAllByLabelText("التصنيف");
    await user.selectOptions(categorySelects[0]!, "sandals");

    expect(findSectionOverride("home", "lookbook-showcase")).toEqual(
      expect.objectContaining({
        type: "lookbook-showcase",
        settings: expect.objectContaining({
          categoryCards: expect.stringContaining("sandals|من المكتب إلى العشاء|"),
        }),
      }),
    );
  });

  it("autofills a new lookbook card and replaces its image from the media picker", async () => {
    const user = userEvent.setup();

    render(
      <StatefulEditor
        themeId="solea-femme"
        categories={availableCategories}
      />,
    );

    await user.click(screen.getByRole("button", { name: /\+ إضافة بطاقة Lookbook/i }));

    const categorySelects = screen.getAllByLabelText("التصنيف");
    await user.selectOptions(categorySelects[categorySelects.length - 1]!, "sandals");

    await user.click(
      screen.getAllByLabelText(/اختيار صورة البطاقة/i).slice(-1)[0]!,
    );

    await screen.findByText("lookbook-card.jpg");
    await user.click(screen.getByRole("button", { name: /lookbook-card.jpg/i }));

    expect(findSectionOverride("home", "lookbook-showcase")).toEqual(
      expect.objectContaining({
        type: "lookbook-showcase",
        settings: expect.objectContaining({
          categoryCards: expect.stringContaining(
            "sandals|Sandals|Day-to-night sandals for lighter outfits.|Category Edit|https://cdn.example.com/gallery/lookbook-card.jpg|/shop?category=sandals",
          ),
        }),
      }),
    );
  });

  it("duplicates and reorders lookbook cards through structured actions", async () => {
    const user = userEvent.setup();

    render(
      <StatefulEditor
        themeId="solea-femme"
        categories={availableCategories}
      />,
    );

    await user.click(screen.getByRole("button", { name: /\+ إضافة بطاقة Lookbook/i }));

    const categorySelects = screen.getAllByLabelText("التصنيف");
    await user.selectOptions(categorySelects[categorySelects.length - 1]!, "flats");

    await user.click(screen.getByLabelText("نسخ البطاقة 5"));

    const titleInputs = screen.getAllByLabelText("عنوان البطاقة");
    await user.clear(titleInputs[titleInputs.length - 1]!);
    await user.type(titleInputs[titleInputs.length - 1]!, "FlatsCopy");

    await user.click(screen.getByLabelText("تحريك البطاقة 6 لأعلى"));

    const lookbookSection = findSectionOverride("home", "lookbook-showcase");
    const categoryCards = String(
      (lookbookSection?.settings as Record<string, unknown>)?.categoryCards || "",
    )
      .split("\n")
      .slice(-2);

    expect(categoryCards[0]).toContain("flats|FlatsCopy|");
    expect(categoryCards[1]).toContain("flats|Flats|");
  });

  it("selects size guide targets from loaded storefront products", async () => {
    const user = userEvent.setup();

    render(
      <StatefulEditor
        themeId="solea-femme"
        categories={availableCategories}
        products={availableProducts}
      />,
    );

    await user.click(screen.getByRole("button", { name: /صفحة المنتج/i }));
    await user.click(screen.getByRole("button", { name: /\+ إضافة صف مقاس/i }));

    const cmInputs = screen.getAllByLabelText("CM");
    const lastIndex = cmInputs.length - 1;
    const rowCard = screen
      .getByText(`صف مقاس #${lastIndex + 1}`)
      .closest("div.rounded-xl");

    expect(rowCard).not.toBeNull();

    const rowScope = within(rowCard as HTMLElement);

    await user.selectOptions(rowScope.getByLabelText("نوع Target"), "product");
    await user.selectOptions(rowScope.getByLabelText("المنتج المستهدف"), "velvet-mule");
    await user.type(rowScope.getByLabelText("EU"), "40");
    await user.type(rowScope.getByLabelText("UK"), "7");
    await user.type(rowScope.getByLabelText("US"), "9");
    await user.type(rowScope.getByLabelText("CM"), "25.1");

    expect(findSectionOverride("pdp", "size-guide")).toEqual(
      expect.objectContaining({
        type: "size-guide",
        settings: expect.objectContaining({
          guideRows: expect.stringContaining("product:velvet-mule|40|7|9|25.1"),
        }),
      }),
    );
  });

  it("autofills size guide override copy from selected product targets", async () => {
    const user = userEvent.setup();

    render(
      <StatefulEditor
        themeId="solea-femme"
        categories={availableCategories}
        products={availableProducts}
      />,
    );

    await user.click(screen.getByRole("button", { name: /صفحة المنتج/i }));
    await user.click(screen.getByRole("button", { name: /\+ إضافة تخصيص عنوان/i }));

    const overrideCard = screen
      .getByText("تخصيص عنوان #4")
      .closest("div.rounded-xl");

    expect(overrideCard).not.toBeNull();

    const overrideScope = within(overrideCard as HTMLElement);

    await user.selectOptions(overrideScope.getByLabelText("نوع Target"), "product");
    await user.selectOptions(
      overrideScope.getByLabelText("المنتج المستهدف"),
      "velvet-mule",
    );

    expect(overrideScope.getByDisplayValue("Velvet Mule Fit")).toBeInTheDocument();
    expect(findSectionOverride("pdp", "size-guide")).toEqual(
      expect.objectContaining({
        type: "size-guide",
        settings: expect.objectContaining({
          guideOverrides: expect.stringContaining("product:velvet-mule|Velvet Mule Fit|"),
        }),
      }),
    );
  });

  it("shows validation summaries for incomplete dynamic rows", async () => {
    const user = userEvent.setup();

    render(
      <StatefulEditor
        themeId="solea-femme"
        categories={availableCategories}
        products={availableProducts}
        autoValidate
      />,
    );

    await user.click(screen.getByRole("button", { name: /صفحة المنتج/i }));
    await user.click(screen.getByRole("button", { name: /\+ إضافة صف مقاس/i }));

    expect(
      screen.getByText(/مراجعة صفحة صفحة المنتج/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/كل صف مقاس يجب أن يحتوي على Target وEU وUK وUS وCM قبل الحفظ/i)
        .length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("أخطاء: 1")).toBeInTheDocument();
  });

  it("removes incomplete size guide rows through quick-fix actions", async () => {
    const user = userEvent.setup();

    render(
      <StatefulEditor
        themeId="solea-femme"
        categories={availableCategories}
        products={availableProducts}
        autoValidate
      />,
    );

    await user.click(screen.getByRole("button", { name: /صفحة المنتج/i }));
    await user.click(screen.getByRole("button", { name: /\+ إضافة صف مقاس/i }));

    await user.click(screen.getByRole("button", { name: /إزالة الصف غير المكتمل/i }));

    expect(
      screen.queryByText(/كل صف مقاس يجب أن يحتوي على Target وEU وUK وUS وCM قبل الحفظ/i),
    ).not.toBeInTheDocument();
    expect(getStorefrontPageOverridesFromDesignTokens(readDesignTokens())).toEqual({});
  });

  it("restores incomplete lookbook cards from category quick fixes", async () => {
    const user = userEvent.setup();

    render(
      <StatefulEditor
        themeId="solea-femme"
        categories={availableCategories}
        products={availableProducts}
        autoValidate
      />,
    );

    await user.click(screen.getByRole("button", { name: /\+ إضافة بطاقة Lookbook/i }));

    const categorySelects = screen.getAllByLabelText("التصنيف");
    const lastCategorySelect = categorySelects[categorySelects.length - 1]!;
    await user.selectOptions(lastCategorySelect, "sandals");

    const titleInputs = screen.getAllByLabelText("عنوان البطاقة");
    const lastTitleInput = titleInputs[titleInputs.length - 1]!;
    await user.clear(lastTitleInput);

    expect(
      screen.getAllByText(/بطاقة الـ Lookbook يجب أن تحتوي على التصنيف والعنوان والوصف والمود قبل الحفظ/i)
        .length,
    ).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /إكمال تلقائي من التصنيف/i }));

    expect(screen.queryByText(/بطاقة الـ Lookbook يجب أن تحتوي على التصنيف والعنوان والوصف والمود قبل الحفظ/i)).not.toBeInTheDocument();
    expect(findSectionOverride("home", "lookbook-showcase")).toEqual(
      expect.objectContaining({
        type: "lookbook-showcase",
        settings: expect.objectContaining({
          categoryCards: expect.stringContaining(
            "sandals|Sandals|Day-to-night sandals for lighter outfits.|Category Edit|https://cdn.example.com/categories/sandals.jpg|/shop?category=sandals",
          ),
        }),
      }),
    );
  });
});
