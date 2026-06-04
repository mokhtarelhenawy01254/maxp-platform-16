// @vitest-environment jsdom

import { describe, expect, it, beforeEach } from "vitest";
import { getMarketplacePreviewCartItems } from "../marketplacePreviewCart";
import {
  hasMarketplacePreviewDataset,
  getMarketplacePreviewCategories,
  getMarketplacePreviewProduct,
  getMarketplacePreviewProductReviews,
  getMarketplacePreviewProducts,
  getMarketplacePreviewRecommendations,
  resolveMarketplacePreviewThemeId,
} from "../marketplaceSampleData";
import { getThemePreviewDataset } from "../themePreviewData";
import { getStorefrontThemePresetIds } from "../../themes";

const WOMEN_SNEAKER_IMAGE_IDS = [
  "1542291026-7eec264c27ff",
  "1600185365483-26d7a4cc7519",
  "1608231387042-66d1773070a5",
  "1608384177866-0bca0d225435",
  "1491553895911-0055eca6402d",
  "1621315271772-28b1f3a5df87",
  "1549298916-b41d501d3772",
  "1552346154-21d32810aba3",
];

const WOMEN_FLAT_IMAGE_IDS = [
  "1551779245-692374a8efe2",
  "1556004583-d2aaffbba592",
  "1616406432452-07bc5938759d",
  "1662541089338-c7d53b88be70",
];

const WOMEN_HEEL_IMAGE_IDS = [
  "1515347619252-60a4bf4fff4f",
  "1543163521-1bf539c55dd2",
  "1559334418-672d5a48531b",
  "1554062097-69c634085c6d",
];

const WOMEN_SANDAL_IMAGE_IDS = [
  "1603487742131-4160ec999306",
  "1577999499505-a4b64aaa9066",
  "1559334418-672d5a48531b",
  "1554062097-69c634085c6d",
];

const MEN_SNEAKER_IMAGE_IDS = [
  "1491553895911-0055eca6402d",
  "1525966222134-fcfa99b8ae77",
  "1542291026-7eec264c27ff",
  "1552346154-21d32810aba3",
  "1600185365483-26d7a4cc7519",
  "1600185365926-3a2ce3cdb9eb",
  "1608230164697-c791326d284c",
  "1608231387042-66d1773070a5",
  "1608384177866-0bca0d225435",
  "1621315271772-28b1f3a5df87",
];

const MEN_CASUAL_IMAGE_IDS = [
  "1515955656352-a1fa3ffcd111",
  "1543508282-6319a3e2621f",
  "1549298916-b41d501d3772",
  "1556004583-d2aaffbba592",
  "1576792741377-eb0f4f6d1a47",
  "1615979474401-8a6a344de5bd",
  "1662541089338-c7d53b88be70",
  "1676121270762-47c8d3a7b9d5",
];

const MEN_FORMAL_IMAGE_IDS = [
  "1556004583-d2aaffbba592",
  "1576792741377-eb0f4f6d1a47",
  "1608667508764-33cf0726b13a",
  "1614252235316-8c857d38b5f4",
  "1615979474401-8a6a344de5bd",
  "1616406432452-07bc5938759d",
  "1662541089338-c7d53b88be70",
  "1676121270762-47c8d3a7b9d5",
];

const MEN_RUNNING_IMAGE_IDS = [
  "1491553895911-0055eca6402d",
  "1542291026-7eec264c27ff",
  "1552346154-21d32810aba3",
  "1600185365483-26d7a4cc7519",
  "1608231387042-66d1773070a5",
  "1621315271772-28b1f3a5df87",
];

const imageMatchesAnyId = (
  image: string | undefined,
  candidateIds: string[],
): boolean =>
  typeof image === "string" &&
  candidateIds.some((candidateId) => image.includes(candidateId));

describe("marketplaceSampleData", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("activates restaurant sample data only for marketplace preview", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=restaurant-demo&previewSource=marketplace",
    );

    expect(resolveMarketplacePreviewThemeId()).toBe("restaurant-demo");
    expect(getMarketplacePreviewProducts({ limit: 3 })?.data).toHaveLength(3);
    expect(
      getMarketplacePreviewCategories()?.map((category) => category.name),
    ).toContain("الكومبوهات");
  });

  it("filters sample products by category and slug", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=restaurant-demo&previewSource=marketplace",
    );

    const combos = getMarketplacePreviewProducts({ category: "combos" });

    expect(
      combos?.data.every((product) => product.category?.name === "الكومبوهات"),
    ).toBe(true);
    expect(getMarketplacePreviewProduct("rush-combo")?.name).toBe("راش كومبو");
    expect(getMarketplacePreviewProduct("volcano-fries")?.category?.name).toBe(
      "الإضافات",
    );
  });

  it("activates cafe sample data with cafe-specific categories", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=cafe-demo&previewSource=marketplace",
    );

    const cafeProducts = getMarketplacePreviewProducts({ limit: 4 });

    expect(resolveMarketplacePreviewThemeId()).toBe("cafe-demo");
    expect(cafeProducts?.data.map((product) => product.id)).toContain(
      "house-blend-beans",
    );
    expect(cafeProducts?.data.map((product) => product.id)).toContain(
      "oat-latte-bottle",
    );
    expect(
      getMarketplacePreviewCategories()?.map((category) => category.name),
    ).toContain("أدوات التحضير");
    expect(getMarketplacePreviewProduct("pistachio-croissant")?.name).toBe(
      "كرواسون فستق طازج",
    );
  });

  it("returns Max Care Go sample data with the right categories in marketplace preview", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=max-care-go&previewSource=marketplace",
    );

    const pharmacyProducts = getMarketplacePreviewProducts({ limit: 4 });

    expect(resolveMarketplacePreviewThemeId()).toBe("max-care-go");
    expect(pharmacyProducts?.data.map((product) => product.id)).toContain(
      "omega-3-plus",
    );
    expect(pharmacyProducts?.data.map((product) => product.id)).toContain(
      "immune-support",
    );
    expect(
      getMarketplacePreviewCategories()?.map((category) => category.name),
    ).toContain("الأجهزة الطبية");
    expect(getMarketplacePreviewProduct("digital-thermometer")?.name).toBe(
      "ترمومتر رقمي سريع",
    );
  });

  it("activates Max Care Go sample data through marketplace preview", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=max-care-go&previewSource=marketplace",
    );

    const products = getMarketplacePreviewProducts({ limit: 3 });

    expect(resolveMarketplacePreviewThemeId()).toBe("max-care-go");
    expect(products?.data.map((product) => product.id)).toContain(
      "omega-3-plus",
    );
    expect(
      getMarketplacePreviewCategories()?.map((category) => category.name),
    ).toContain("الإسعافات الأولية");
  });

  it("returns themed recommendation sets for BiteRush preview", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=restaurant-demo&previewSource=marketplace",
    );

    expect(
      getMarketplacePreviewRecommendations("rush-combo", "related")?.map(
        (product) => product.id,
      ),
    ).toEqual(["volcano-fries", "citrus-fizz", "cookie-bomb"]);
    expect(
      getMarketplacePreviewRecommendations("firebird", "boughtTogether")?.map(
        (product) => product.id,
      ),
    ).toEqual(["volcano-fries", "citrus-fizz", "cookie-bomb"]);
  });

  it("returns themed recommendation sets for cafe preview", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=cafe-demo&previewSource=marketplace",
    );

    expect(
      getMarketplacePreviewRecommendations("house-blend-beans", "related")?.map(
        (product) => product.id,
      ),
    ).toEqual(["pistachio-croissant", "ceramic-v60-kit", "oat-latte-bottle"]);
    expect(
      getMarketplacePreviewRecommendations(
        "ethiopian-filter",
        "boughtTogether",
      )?.map((product) => product.id),
    ).toEqual(["ceramic-v60-kit", "caramel-roll", "milk-frother"]);
  });

  it("returns themed recommendation sets for Max Care Go preview", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=max-care-go&previewSource=marketplace",
    );

    expect(
      getMarketplacePreviewRecommendations("omega-3-plus", "related")?.map(
        (product) => product.id,
      ),
    ).toEqual(["immune-support", "digital-thermometer", "sensitive-sunscreen"]);
    expect(
      getMarketplacePreviewRecommendations(
        "digital-thermometer",
        "boughtTogether",
      )?.map((product) => product.id),
    ).toEqual(["first-aid-kit", "cough-relief-syrup", "immune-support"]);
  });

  it("returns themed recommendation sets for Max Care Go preview", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=max-care-go&previewSource=marketplace",
    );

    expect(
      getMarketplacePreviewRecommendations(
        "cough-relief-syrup",
        "related",
      )?.map((product) => product.id),
    ).toEqual(["immune-support", "first-aid-kit", "sensitive-sunscreen"]);
    expect(
      getMarketplacePreviewRecommendations(
        "digital-thermometer",
        "boughtTogether",
      )?.map((product) => product.id),
    ).toEqual(["first-aid-kit", "cough-relief-syrup", "immune-support"]);
  });

  it("activates District Market sample data through marketplace preview", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=district-market&previewSource=marketplace",
    );

    const products = getMarketplacePreviewProducts({ limit: 4 });

    expect(hasMarketplacePreviewDataset("district-market")).toBe(true);
    expect(resolveMarketplacePreviewThemeId()).toBe("district-market");
    expect(products?.data.map((product) => product.id)).toContain(
      "dm-clip-lid-set",
    );
    expect(products?.data.map((product) => product.id)).toContain(
      "dm-led-desk-lamp",
    );
    expect(
      products?.data.every((product) =>
        product.images?.[0]?.startsWith(
          "/assets/themes/district-market/products/",
        ),
      ),
    ).toBe(true);
    expect(
      getMarketplacePreviewCategories()?.map((category) => category.name),
    ).toContain("أساسيات يومية");
    expect(getMarketplacePreviewProduct("dm-travel-cubes")?.name).toBe(
      "طقم أكياس تنظيم سفر",
    );
  });

  it("returns themed recommendation sets for District Market preview", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=district-market&previewSource=marketplace",
    );

    expect(
      getMarketplacePreviewRecommendations("dm-clip-lid-set", "related")?.map(
        (product) => product.id,
      ),
    ).toEqual([
      "dm-drawer-organizer",
      "dm-laundry-basket",
      "dm-thermal-bottle",
    ]);
    expect(
      getMarketplacePreviewRecommendations(
        "dm-aroma-diffuser",
        "boughtTogether",
      )?.map((product) => product.id),
    ).toEqual(["dm-serving-tray-set", "dm-led-desk-lamp", "dm-laundry-basket"]);
  });

  it("returns preview reviews for District Market product pages", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=district-market&previewSource=marketplace",
    );

    const reviews = getMarketplacePreviewProductReviews("dm-clip-lid-set");

    expect(reviews?.totalCount).toBe(2);
    expect(reviews?.averageRating).toBeGreaterThan(4);
    expect(reviews?.reviews[0]?.author).toBeTruthy();
  });

  it("returns preview volume discounts for District Market product pages", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=district-market&previewSource=marketplace",
    );

    const product = getMarketplacePreviewProduct("dm-clip-lid-set");

    expect(product?.volumeDiscounts).toHaveLength(2);
    expect(product?.volumeDiscounts?.[0]).toMatchObject({
      minQuantity: 2,
      discountType: "percentage",
    });
  });

  it("activates men-shoes-eg sample data through marketplace preview", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=men-shoes-eg&previewSource=marketplace",
    );

    const products = getMarketplacePreviewProducts({ limit: 4 });

    expect(hasMarketplacePreviewDataset("men-shoes-eg")).toBe(true);
    expect(resolveMarketplacePreviewThemeId()).toBe("men-shoes-eg");
    expect(products?.data.map((product) => product.id)).toContain(
      "stride-core-runner",
    );
    expect(products?.data.map((product) => product.id)).toContain(
      "brown-casual-leather",
    );
    expect(
      getMarketplacePreviewCategories()?.map((category) => category.name),
    ).toContain("لوفر وشغل");
    expect(getMarketplacePreviewProduct("office-slip-loafer")?.name).toBe(
      "لوفر عملي سهل اللبس",
    );
    expect(
      getMarketplacePreviewProduct("stride-core-runner")?.images,
    ).toHaveLength(4);
    expect(
      getMarketplacePreviewProduct("city-white-court")?.images,
    ).toHaveLength(4);
    expect(getMarketplacePreviewProduct("clean-step-kit")?.images).toHaveLength(
      4,
    );
    expect(
      getMarketplacePreviewProduct("stride-core-runner")?.productVariants,
    ).toHaveLength(12);
    expect(
      getMarketplacePreviewProduct("stride-core-runner")?.volumeDiscounts,
    ).toHaveLength(2);
    expect(
      getMarketplacePreviewProduct("office-slip-loafer")?.volumeDiscounts?.[0],
    ).toMatchObject({
      minQuantity: 2,
      discountType: "percentage",
    });
    expect(
      getMarketplacePreviewProduct("stride-core-runner")?.productVariants?.map(
        (variant) => variant.attributes?.["المقاس"],
      ),
    ).toEqual([
      "41",
      "42",
      "43",
      "44",
      "41",
      "42",
      "43",
      "44",
      "41",
      "42",
      "43",
      "44",
    ]);
    expect(
      Array.from(
        new Set(
          getMarketplacePreviewProduct(
            "stride-core-runner",
          )?.productVariants?.map((variant) => variant.attributes?.["اللون"]) ||
            [],
        ),
      ),
    ).toEqual(["أحمر سباق", "رمادي جرافيت", "أبيض ثلجي"]);
    expect(
      getMarketplacePreviewProduct("office-slip-loafer")?.productVariants,
    ).toHaveLength(4);
  });

  it("returns themed recommendations and reviews for men-shoes-eg preview", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=men-shoes-eg&previewSource=marketplace",
    );

    expect(
      getMarketplacePreviewRecommendations(
        "stride-core-runner",
        "related",
      )?.map((product) => product.id),
    ).toEqual(["city-white-court", "flex-knit-runner", "brown-casual-leather"]);

    const reviews = getMarketplacePreviewProductReviews("office-slip-loafer");

    expect(reviews?.totalCount).toBe(2);
    expect(reviews?.averageRating).toBeGreaterThan(4);
  });

  it("activates women-fashion-eg sample data through marketplace preview", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=women-fashion-eg&previewSource=marketplace",
    );

    const products = getMarketplacePreviewProducts({ limit: 8 });

    expect(hasMarketplacePreviewDataset("women-fashion-eg")).toBe(true);
    expect(resolveMarketplacePreviewThemeId()).toBe("women-fashion-eg");
    expect(products?.data.map((product) => product.id)).toContain(
      "luna-city-sneaker",
    );
    expect(products?.data.map((product) => product.id)).toContain(
      "flow-midi-dress",
    );
    expect(
      getMarketplacePreviewCategories()?.map((category) => category.name),
    ).toContain("فساتين");
    expect(
      getMarketplacePreviewCategories()?.map((category) => category.name),
    ).toContain("شنط وإكسسوارات");
    expect(
      getMarketplacePreviewProduct("luna-city-sneaker")?.images,
    ).toHaveLength(4);
    expect(
      getMarketplacePreviewProduct("berry-crossbody-bag")?.images,
    ).toHaveLength(4);
    expect(
      getMarketplacePreviewProduct("luna-city-sneaker")?.productVariants,
    ).toHaveLength(12);
    expect(
      getMarketplacePreviewProduct("flow-midi-dress")?.productVariants,
    ).toHaveLength(12);
    expect(
      getMarketplacePreviewProduct("berry-crossbody-bag")?.productVariants,
    ).toHaveLength(3);
    expect(
      getMarketplacePreviewProduct("luna-city-sneaker")?.volumeDiscounts,
    ).toHaveLength(2);
    expect(
      Array.from(
        new Set(
          getMarketplacePreviewProduct(
            "luna-city-sneaker",
          )?.productVariants?.map((variant) => variant.attributes?.["اللون"]) ||
            [],
        ),
      ),
    ).toEqual(["أبيض لؤلؤي", "وردي هادئ", "بيج رملي"]);
  });

  it("returns themed recommendations and reviews for women-fashion-eg preview", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=women-fashion-eg&previewSource=marketplace",
    );

    expect(
      getMarketplacePreviewRecommendations("luna-city-sneaker", "related")?.map(
        (product) => product.id,
      ),
    ).toEqual(["soft-stride-runner", "marina-ballet-flat", "linen-coord-set"]);

    const reviews = getMarketplacePreviewProductReviews("flow-midi-dress");
    const heelReviews = getMarketplacePreviewProductReviews("dusk-block-heel");

    expect(reviews?.totalCount).toBe(2);
    expect(reviews?.averageRating).toBeGreaterThan(4);
    expect(
      reviews?.reviews.every(
        (review) =>
          !/[A-Za-z]/.test(review.author) &&
          !/[A-Za-z]/.test(review.comment) &&
          (!review.title || !/[A-Za-z]/.test(review.title)),
      ),
    ).toBe(true);
    expect(heelReviews?.totalCount).toBe(2);
    expect(heelReviews?.averageRating).toBeGreaterThan(4);
    expect(heelReviews?.reviews[0]?.title).toBeTruthy();
  });

  it("keeps Solea Femme recommendations shoes-first in marketplace preview", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=solea-femme&previewSource=marketplace",
    );

    const products = getMarketplacePreviewProducts({ limit: 8 });
    const related = getMarketplacePreviewRecommendations(
      "solea-femme-cloud-sneaker",
      "related",
    );
    const boughtTogether = getMarketplacePreviewRecommendations(
      "solea-femme-brace-heel",
      "boughtTogether",
    );
    const heelProduct = getMarketplacePreviewProduct("solea-femme-brace-heel");

    expect(resolveMarketplacePreviewThemeId()).toBe("solea-femme");
    expect(products?.data.map((product) => product.id)).toContain(
      "solea-femme-cloud-sneaker",
    );
    expect(
      getMarketplacePreviewCategories()?.map((category) => category.name),
    ).toEqual(
      expect.arrayContaining([
        "سنيكرز يومي",
        "فلات ناعمة",
        "كعب ومساء",
        "صنادل",
      ]),
    );
    expect(products?.data.some((product) => product.id.includes("bag"))).toBe(false);
    expect(related?.map((product) => product.id)).toEqual([
      "solea-femme-weekend-court",
      "solea-femme-city-ballerina",
      "solea-femme-brace-heel",
    ]);
    expect(boughtTogether?.map((product) => product.id)).toEqual([
      "solea-femme-cloud-sneaker",
      "solea-femme-city-ballerina",
      "solea-femme-summer-sandal",
    ]);
    expect(heelProduct?.mainImage).toContain("1559334418");
    expect(heelProduct?.images).not.toContain(
      "/assets/themes/modern-minimal/preview.svg",
    );
    expect(
      heelProduct?.variants.find(
        (variant) => variant.id === "solea-femme-brace-heel-rose-size-38",
      )?.image,
    ).toContain("1515347619252");
    expect(
      [...(related || []), ...(boughtTogether || [])].every((product) =>
        ["daily-sneakers", "soft-flats", "evening-heels", "open-sandals"].includes(
          String(product.category?.id || product.categoryId || ""),
        ),
      ),
    ).toBe(true);
  });

  it("keeps women shoe preview galleries tied to the shoe family", () => {
    const themeCategoryExpectations: Record<string, Record<string, string[]>> = {
      "men-shoes-eg": {
        sneakers: MEN_SNEAKER_IMAGE_IDS,
        "casual-leather": MEN_CASUAL_IMAGE_IDS,
        loafers: MEN_FORMAL_IMAGE_IDS,
        "running-daily": MEN_RUNNING_IMAGE_IDS,
      },
      "women-fashion-eg": {
        sneakers: WOMEN_SNEAKER_IMAGE_IDS,
        flats: WOMEN_FLAT_IMAGE_IDS,
        heels: WOMEN_HEEL_IMAGE_IDS,
      },
      "solea-femme": {
        "daily-sneakers": WOMEN_SNEAKER_IMAGE_IDS,
        "soft-flats": WOMEN_FLAT_IMAGE_IDS,
        "evening-heels": WOMEN_HEEL_IMAGE_IDS,
        "open-sandals": WOMEN_SANDAL_IMAGE_IDS,
      },
      "modern-minimal": {
        "daily-sneakers": WOMEN_SNEAKER_IMAGE_IDS,
        "soft-flats": WOMEN_FLAT_IMAGE_IDS,
        "evening-heels": WOMEN_HEEL_IMAGE_IDS,
        "open-sandals": WOMEN_SANDAL_IMAGE_IDS,
      },
      "elegant-luxe": {
        "luxury-heels": WOMEN_HEEL_IMAGE_IDS,
      },
    };

    const issues: string[] = [];

    Object.entries(themeCategoryExpectations).forEach(
      ([themeId, categoryExpectations]) => {
        window.history.replaceState(
          {},
          "",
          `/?previewTheme=${themeId}&previewSource=marketplace`,
        );

        const categories = getMarketplacePreviewCategories() || [];
        const products = getMarketplacePreviewProducts({ limit: 40 })?.data || [];

        Object.entries(categoryExpectations).forEach(
          ([categoryId, allowedImageIds]) => {
            const category = categories.find((entry) => entry.id === categoryId);
            if (!category || !imageMatchesAnyId(category.image, allowedImageIds)) {
              issues.push(`${themeId}:${categoryId}:category-image`);
            }

            const categoryProducts = products.filter(
              (product) => (product.category?.id || product.categoryId) === categoryId,
            );

            if (categoryProducts.length === 0) {
              issues.push(`${themeId}:${categoryId}:missing-products`);
              return;
            }

            categoryProducts.forEach((product) => {
              const gallery = Array.isArray(product.images)
                ? product.images.filter(Boolean)
                : [];

              if (
                gallery.length === 0 ||
                gallery.some((image) => !imageMatchesAnyId(image, allowedImageIds))
              ) {
                issues.push(`${themeId}:${categoryId}:${product.id}`);
              }
            });
          },
        );
      },
    );

    expect(issues).toEqual([]);
  });

  it("activates rose-boutique-eg sample data through marketplace preview", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=rose-boutique-eg&previewSource=marketplace",
    );

    const products = getMarketplacePreviewProducts({ limit: 8 });

    expect(hasMarketplacePreviewDataset("rose-boutique-eg")).toBe(true);
    expect(resolveMarketplacePreviewThemeId()).toBe("rose-boutique-eg");
    expect(products?.data.map((product) => product.id)).toContain(
      "rose-midi-dress",
    );
    expect(products?.data.map((product) => product.id)).toContain(
      "arc-mini-bag",
    );
    expect(
      getMarketplacePreviewCategories()?.map((category) => category.name),
    ).toContain("فساتين");
    expect(
      getMarketplacePreviewCategories()?.map((category) => category.name),
    ).toContain("إكسسوارات");
    expect(
      getMarketplacePreviewProduct("rose-midi-dress")?.images,
    ).toHaveLength(4);
    expect(
      getMarketplacePreviewProduct("tailored-cream-blazer")?.productVariants,
    ).toHaveLength(6);
    expect(
      getMarketplacePreviewProduct("arc-mini-bag")?.productVariants,
    ).toHaveLength(3);
  });

  it("returns themed recommendations and reviews for rose-boutique-eg preview", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=rose-boutique-eg&previewSource=marketplace",
    );

    expect(
      getMarketplacePreviewRecommendations("rose-midi-dress", "related")?.map(
        (product) => product.id,
      ),
    ).toEqual(["ivory-pleat-dress", "arc-mini-bag", "silk-ribbon-scarf"]);

    const reviews = getMarketplacePreviewProductReviews(
      "tailored-cream-blazer",
    );

    expect(reviews?.totalCount).toBe(2);
    expect(reviews?.averageRating).toBeGreaterThan(4);
  });

  it("activates elegant-luxe sample data through marketplace preview", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=elegant-luxe&previewSource=marketplace",
    );

    const products = getMarketplacePreviewProducts({ limit: 6 });
    const categories = getMarketplacePreviewCategories();

    expect(hasMarketplacePreviewDataset("elegant-luxe")).toBe(true);
    expect(resolveMarketplacePreviewThemeId()).toBe("elegant-luxe");
    expect(products?.data.map((product) => product.id)).toContain(
      "elegant-luxe-satin-signature-dress",
    );
    expect(products?.data.map((product) => product.id)).toContain(
      "elegant-luxe-structured-class-bag",
    );
    expect(
      getMarketplacePreviewProduct("elegant-luxe-satin-signature-dress")?.images,
    ).toHaveLength(4);
    expect(
      getMarketplacePreviewProduct("elegant-luxe-night-silk-wrap")
        ?.productVariants,
    ).toHaveLength(2);
    expect(
      categories?.every(
        (category) =>
          typeof category.description === "string" &&
          !category.description.includes("تصنيف معاينة"),
      ),
    ).toBe(true);
  });

  it("returns themed recommendations and reviews for elegant-luxe preview", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=elegant-luxe&previewSource=marketplace",
    );

    expect(
      getMarketplacePreviewRecommendations(
        "elegant-luxe-satin-signature-dress",
        "related",
      )?.map((product) => product.id),
    ).toEqual([
      "elegant-luxe-lumi-evening-set",
      "elegant-luxe-structured-class-bag",
      "elegant-luxe-night-silk-wrap",
    ]);

    const reviews = getMarketplacePreviewProductReviews(
      "elegant-luxe-structured-class-bag",
    );

    expect(reviews?.totalCount).toBe(2);
    expect(reviews?.averageRating).toBeGreaterThan(4);
    expect(reviews?.reviews[0]?.title).toBeTruthy();
  });

  it("hydrates elegant-luxe preview cart items with real product imagery", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=elegant-luxe&previewSource=marketplace",
    );

    const cartItems = getMarketplacePreviewCartItems("elegant-luxe");

    expect(cartItems).toHaveLength(3);
    expect(
      cartItems.every(
        (item) =>
          typeof item.imageUrl === "string" &&
          item.imageUrl.includes("images.unsplash.com") &&
          !item.imageUrl.includes("/assets/themes/elegant-luxe/preview.png"),
      ),
    ).toBe(true);
  });

  it("keeps elegant-luxe preview imagery on-brand across products and categories", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=elegant-luxe&previewSource=marketplace",
    );

    const serializedPreview = JSON.stringify({
      categories: getMarketplacePreviewCategories(),
      products: getMarketplacePreviewProducts({ limit: 12 })?.data,
    });
    const rejectedImageIds = [
      "1515886657613-9f3515b0c78f",
      "1529139574466-a303027c1d8b",
      "1512436991641-6745cdb1723f",
      "1521572267360-ee0c2909d518",
      "1551232864-3f0890e580d9",
      "1544441893-675973e31985",
    ];

    rejectedImageIds.forEach((imageId) => {
      expect(serializedPreview).not.toContain(imageId);
    });
  });

  it("activates atelier-nova sample data through marketplace preview", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=atelier-nova&previewSource=marketplace",
    );

    const products = getMarketplacePreviewProducts({ limit: 8 });

    expect(hasMarketplacePreviewDataset("atelier-nova")).toBe(true);
    expect(resolveMarketplacePreviewThemeId()).toBe("atelier-nova");
    expect(products?.data.map((product) => product.id)).toContain(
      "atelier-nova-midi-flow-dress",
    );
    expect(products?.data.map((product) => product.id)).toContain(
      "atelier-nova-arc-hobo-bag",
    );
    expect(
      getMarketplacePreviewCategories()?.map((category) => category.name),
    ).toContain("فساتين");
    expect(
      getMarketplacePreviewCategories()?.map((category) => category.name),
    ).toContain("إكسسوارات");
    expect(
      getMarketplacePreviewProduct("atelier-nova-midi-flow-dress")?.images,
    ).toHaveLength(4);
    expect(
      getMarketplacePreviewProduct("atelier-nova-cropped-jacket")
        ?.productVariants,
    ).toHaveLength(6);
    expect(
      getMarketplacePreviewProduct("atelier-nova-arc-hobo-bag")
        ?.productVariants,
    ).toHaveLength(3);
    expect(
      getMarketplacePreviewProduct("atelier-nova-courtyard-set")
        ?.volumeDiscounts,
    ).toHaveLength(2);
  });

  it("returns themed recommendations and reviews for atelier-nova preview", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=atelier-nova&previewSource=marketplace",
    );

    expect(
      getMarketplacePreviewRecommendations(
        "atelier-nova-midi-flow-dress",
        "related",
      )?.map((product) => product.id),
    ).toEqual([
      "atelier-nova-ink-shift-dress",
      "atelier-nova-arc-hobo-bag",
      "atelier-nova-silk-scene-scarf",
    ]);

    const reviews = getMarketplacePreviewProductReviews(
      "atelier-nova-cropped-jacket",
    );

    expect(reviews?.totalCount).toBe(2);
    expect(reviews?.averageRating).toBeGreaterThan(4);
    expect(reviews?.reviews[0]?.title).toBeTruthy();
  });

  it("activates closet-os sample data through marketplace preview", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=closet-os&previewSource=marketplace",
    );

    const products = getMarketplacePreviewProducts({ limit: 6 });

    expect(hasMarketplacePreviewDataset("closet-os")).toBe(true);
    expect(resolveMarketplacePreviewThemeId()).toBe("closet-os");
    expect(products?.data.map((product) => product.id)).toContain(
      "closet-weekday-poplin",
    );
    expect(products?.data.map((product) => product.id)).toContain(
      "closet-weekend-capsule",
    );
    expect(
      products?.data.every((product) =>
        product.images?.[0]?.startsWith("/assets/themes/closet-os/products/"),
      ),
    ).toBe(true);
    expect(
      getMarketplacePreviewCategories()?.map((category) => category.name),
    ).toContain("قمصان يومية");
    expect(getMarketplacePreviewProduct("closet-laundry-tote")?.name).toBe(
      "شنطة قماش يومية",
    );
    expect(
      getMarketplacePreviewProduct("closet-weekday-poplin")?.productVariants,
    ).toHaveLength(8);
    expect(
      getMarketplacePreviewProduct("closet-relay-tee")?.productVariants,
    ).toHaveLength(4);
    expect(
      getMarketplacePreviewProduct("closet-weekend-capsule")?.volumeDiscounts,
    ).toHaveLength(2);
    expect(
      Array.from(
        new Set(
          getMarketplacePreviewProduct(
            "closet-weekday-poplin",
          )?.productVariants?.map((variant) => variant.attributes?.["اللون"]) ||
            [],
        ),
      ),
    ).toEqual(["أبيض سحابي", "رمادي سلايت"]);
  });

  it("returns themed recommendations for closet-os preview", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=closet-os&previewSource=marketplace",
    );

    expect(
      getMarketplacePreviewRecommendations(
        "closet-weekday-poplin",
        "related",
      )?.map((product) => product.id),
    ).toEqual([
      "closet-commute-trouser",
      "closet-slot-overshirt",
      "closet-laundry-tote",
    ]);

    expect(
      getMarketplacePreviewProductReviews("closet-weekday-poplin"),
    ).toBeNull();
  });

  it("activates pc-hub-eg sample data through marketplace preview", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=pc-hub-eg&previewSource=marketplace",
    );

    const products = getMarketplacePreviewProducts({ limit: 8 });

    expect(hasMarketplacePreviewDataset("pc-hub-eg")).toBe(true);
    expect(resolveMarketplacePreviewThemeId()).toBe("pc-hub-eg");
    expect(products?.data.map((product) => product.id)).toContain(
      "workbook-14-air",
    );
    expect(products?.data.map((product) => product.id)).toContain(
      "quadview-27-qhd",
    );
    expect(
      getMarketplacePreviewCategories()?.map((category) => category.name),
    ).toContain("تجميعات جاهزة");
    expect(
      getMarketplacePreviewCategories()?.map((category) => category.name),
    ).toContain("إكسسوارات");
    expect(
      getMarketplacePreviewProduct("workbook-14-air")?.images,
    ).toHaveLength(4);
    expect(getMarketplacePreviewProduct("battlebox-r7")?.images).toHaveLength(
      4,
    );
    expect(
      getMarketplacePreviewProduct("workbook-14-air")?.productVariants,
    ).toHaveLength(3);
    expect(
      getMarketplacePreviewProduct("creator-pro-16")?.productVariants,
    ).toHaveLength(2);
    expect(
      getMarketplacePreviewProduct("precision-mouse-lite")?.productVariants,
    ).toHaveLength(3);
    expect(
      getMarketplacePreviewProduct("dockstation-9in1")?.productVariants,
    ).toHaveLength(0);
    expect(
      getMarketplacePreviewProduct("workbook-14-air")?.productVariants?.[0],
    ).toMatchObject({
      attributes: {
        الرام: "16GB",
        التخزين: "512GB SSD",
      },
    });
  });

  it("returns themed recommendations and reviews for pc-hub-eg preview", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=pc-hub-eg&previewSource=marketplace",
    );

    expect(
      getMarketplacePreviewRecommendations("workbook-14-air", "related")?.map(
        (product) => product.id,
      ),
    ).toEqual(["creator-pro-16", "quadview-27-qhd", "dockstation-9in1"]);

    expect(
      getMarketplacePreviewRecommendations(
        "battlebox-r7",
        "boughtTogether",
      )?.map((product) => product.id),
    ).toEqual(["quadview-27-qhd", "mechboard-pro", "precision-mouse-lite"]);

    const reviews = getMarketplacePreviewProductReviews("workbook-14-air");

    expect(reviews?.totalCount).toBe(2);
    expect(reviews?.averageRating).toBeGreaterThan(4);
  });

  it("activates perfume-eg sample data through marketplace preview", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=perfume-eg&previewSource=marketplace",
    );

    const products = getMarketplacePreviewProducts({ limit: 8 });

    expect(hasMarketplacePreviewDataset("perfume-eg")).toBe(true);
    expect(resolveMarketplacePreviewThemeId()).toBe("perfume-eg");
    expect(products?.data.map((product) => product.id)).toContain(
      "amber-veil-elixir",
    );
    expect(products?.data.map((product) => product.id)).toContain(
      "signature-discovery-set",
    );
    expect(
      getMarketplacePreviewCategories()?.map((category) => category.name),
    ).toContain("منعش وحمضي");
    expect(
      getMarketplacePreviewCategories()?.map((category) => category.name),
    ).toContain("هدايا ومجموعات");
    expect(
      getMarketplacePreviewProduct("amber-veil-elixir")?.images,
    ).toHaveLength(4);
    expect(getMarketplacePreviewProduct("iris-musk-veil")?.images).toHaveLength(
      4,
    );
    expect(
      (getMarketplacePreviewProduct("amber-veil-elixir")?.productVariants || [])
        .length,
    ).toBeGreaterThan(0);
    expect(
      (getMarketplacePreviewProduct("iris-musk-veil")?.productVariants || [])
        .length,
    ).toBeGreaterThan(0);
  });

  it("returns themed recommendations and reviews for perfume-eg preview", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=perfume-eg&previewSource=marketplace",
    );

    expect(
      getMarketplacePreviewRecommendations("iris-musk-veil", "related")?.map(
        (product) => product.id,
      ),
    ).toEqual(["citrus-dawn-edp", "amber-veil-elixir", "velvet-gift-box"]);

    const reviews = getMarketplacePreviewProductReviews("iris-musk-veil");

    expect(reviews?.totalCount).toBe(2);
    expect(reviews?.averageRating).toBeGreaterThan(4);
    expect(reviews?.reviews[0]?.title).toBeTruthy();
  });

  it("activates kids-play sample data through marketplace preview", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=kids-play&previewSource=marketplace",
    );

    const products = getMarketplacePreviewProducts({ limit: 8 });

    expect(hasMarketplacePreviewDataset("kids-play")).toBe(true);
    expect(resolveMarketplacePreviewThemeId()).toBe("kids-play");
    expect(products?.data.map((product) => product.id)).toContain(
      "rocket-blocks-lab",
    );
    expect(products?.data.map((product) => product.id)).toContain(
      "junior-scooter-lite",
    );
    expect(
      getMarketplacePreviewCategories()?.map((category) => category.name),
    ).toContain("تركيب وبناء");
    expect(
      getMarketplacePreviewCategories()?.map((category) => category.name),
    ).toContain("لعب تمثيلي");
    expect(
      getMarketplacePreviewCategories()?.find(
        (category) => category.id === "building-toys",
      )?.image,
    ).toContain("images.unsplash.com");
    expect(
      getMarketplacePreviewProduct("rocket-blocks-lab")?.images,
    ).toHaveLength(4);
    expect(
      getMarketplacePreviewProduct("junior-scooter-lite")?.productVariants,
    ).toHaveLength(3);
    expect(
      getMarketplacePreviewProduct("alphabet-puzzle-board")?.productVariants,
    ).toHaveLength(3);
    expect(
      getMarketplacePreviewProduct("splash-art-kit")?.volumeDiscounts,
    ).toHaveLength(2);
  });

  it("returns themed recommendations and reviews for kids-play preview", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=kids-play&previewSource=marketplace",
    );

    expect(
      getMarketplacePreviewRecommendations("rocket-blocks-lab", "related")?.map(
        (product) => product.id,
      ),
    ).toEqual([
      "woodland-train-blocks",
      "alphabet-puzzle-board",
      "splash-art-kit",
    ]);

    const reviews = getMarketplacePreviewProductReviews("junior-scooter-lite");

    expect(reviews?.totalCount).toBe(2);
    expect(reviews?.averageRating).toBeGreaterThan(4);
    expect(reviews?.reviews[0]?.title).toBeTruthy();
  });

  it("provides variant-level stock in women fashion preview products", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=women-fashion-eg&previewSource=marketplace",
    );

    const heelProduct = getMarketplacePreviewProduct("dusk-block-heel");
    const scarfProduct = getMarketplacePreviewProduct("silk-print-scarf");
    const heelStocks = new Set(
      (heelProduct?.variants || [])
        .map((variant) => Number(variant.stock))
        .filter((stock) => Number.isFinite(stock)),
    );
    const scarfStocks = new Set(
      (scarfProduct?.variants || [])
        .map((variant) => Number(variant.stock))
        .filter((stock) => Number.isFinite(stock)),
    );

    expect(heelStocks.size).toBeGreaterThan(1);
    expect(scarfStocks.size).toBeGreaterThan(1);
  });

  it("keeps marketplace preview coverage for every storefront theme", () => {
    const missingThemeIds = getStorefrontThemePresetIds().filter(
      (themeId) =>
        !hasMarketplacePreviewDataset(themeId) &&
        !getThemePreviewDataset(themeId),
    );

    expect(missingThemeIds).toEqual([]);
  });

  it("generates dedicated preview products for themes that used to fall back to live store data", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=modern-minimal&previewSource=marketplace",
    );

    const generatedProducts = getMarketplacePreviewProducts({ limit: 5 });
    const generatedReviews = getMarketplacePreviewProductReviews(
      "modern-minimal-cloud-sneaker",
    );

    expect(resolveMarketplacePreviewThemeId()).toBe("modern-minimal");
    expect(generatedProducts?.data.map((product) => product.id)).toContain(
      "modern-minimal-cloud-sneaker",
    );
    expect(
      getMarketplacePreviewCategories()?.map((category) => category.name),
    ).toContain("سنيكرز يومي");
    expect(
      getMarketplacePreviewRecommendations(
        "modern-minimal-cloud-sneaker",
        "related",
      )?.length,
    ).toBeGreaterThan(0);
    expect(generatedReviews?.totalCount).toBe(2);
    expect(
      new Set(
        (generatedProducts?.data || []).map(
          (product) => product.mainImage || product.images?.[0] || "",
        ),
      ).size,
    ).toBe((generatedProducts?.data || []).length);
  });

  it("keeps generated fashion category images aligned with the first product in that category", () => {
    ["solea-femme", "modern-minimal"].forEach((themeId) => {
      window.history.replaceState(
        {},
        "",
        `/?previewTheme=${themeId}&previewSource=marketplace`,
      );

      const categories = getMarketplacePreviewCategories() || [];
      const products = getMarketplacePreviewProducts({ limit: 12 })?.data || [];
      const firstProductImageByCategory = new Map<string, string>();

      products.forEach((product) => {
        if (!firstProductImageByCategory.has(product.categoryId)) {
          firstProductImageByCategory.set(
            product.categoryId,
            product.mainImage || product.images?.[0] || "",
          );
        }
      });

      categories.forEach((category) => {
        expect(category.image || "").toBe(
          firstProductImageByCategory.get(category.id) || "",
        );
      });
    });
  });

  it("generates dedicated preview products for uncovered restaurant themes", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=nile-bistro&previewSource=marketplace",
    );

    const generatedProducts = getMarketplacePreviewProducts({ limit: 5 });

    expect(resolveMarketplacePreviewThemeId()).toBe("nile-bistro");
    expect(generatedProducts?.data.map((product) => product.id)).toContain(
      "nile-bistro-signature-combo",
    );
    expect(
      getMarketplacePreviewCategories()?.map((category) => category.name),
    ).toContain("كومبوهات");
  });

  it("returns null outside marketplace preview mode", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=restaurant-demo&previewSource=settings",
    );

    expect(resolveMarketplacePreviewThemeId()).toBeNull();
    expect(hasMarketplacePreviewDataset()).toBe(false);
    expect(getMarketplacePreviewProducts()).toBeNull();
    expect(getMarketplacePreviewCategories()).toBeNull();
  });
});
