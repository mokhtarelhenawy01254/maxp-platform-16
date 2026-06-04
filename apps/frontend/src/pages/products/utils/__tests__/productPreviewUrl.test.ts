import { describe, expect, it } from "vitest";

import {
  buildProductPreviewUrl,
  resolveProductPreviewCompanyId,
} from "../productPreviewUrl";

describe("product preview url helpers", () => {
  it("prefers the edited product company when resolving preview scope", () => {
    expect(
      resolveProductPreviewCompanyId({
        productCompanyId: "product-company",
        userCompanyId: "user-company",
        storedCompanyId: "stored-company",
        queryCompanyId: "query-company",
      }),
    ).toBe("product-company");
  });

  it("falls back through user, stored, then query company ids", () => {
    expect(
      resolveProductPreviewCompanyId({
        productCompanyId: "   ",
        userCompanyId: "",
        storedCompanyId: "stored-company",
        queryCompanyId: "query-company",
      }),
    ).toBe("stored-company");
  });

  it("builds a production-safe preview url with the resolved company id", () => {
    expect(
      buildProductPreviewUrl({
        origin: "https://maxp.online",
        productId: "cmofn4xue0gsbjuabfhn3b35j",
        companyId: "cmlc7quet0000ju403h74m5o9",
      }),
    ).toBe(
      "https://maxp.online/store/product/cmofn4xue0gsbjuabfhn3b35j?companyId=cmlc7quet0000ju403h74m5o9&productPreview=1&previewSource=admin&previewProductId=cmofn4xue0gsbjuabfhn3b35j",
    );
  });

  it("uses the product slug for the storefront path while keeping the product id as preview identity", () => {
    expect(
      buildProductPreviewUrl({
        origin: "https://maxp.online",
        productId: "cmoqxdziw01pkju2i5gvhgc9c",
        productSlug: "nova-sneakers",
        companyId: "cmleybpf70028juo2wwpmp8rt",
      }),
    ).toBe(
      "https://maxp.online/store/product/nova-sneakers?companyId=cmleybpf70028juo2wwpmp8rt&productPreview=1&previewSource=admin&previewProductId=cmoqxdziw01pkju2i5gvhgc9c",
    );
  });
});
