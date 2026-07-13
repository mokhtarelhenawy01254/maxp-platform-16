import { resolveShippingClassSettingsCompanyId } from "../shippingClassCompany";

describe("resolveShippingClassSettingsCompanyId", () => {
  it("prefers the product company while editing an existing product", () => {
    expect(
      resolveShippingClassSettingsCompanyId({
        isEditMode: true,
        productCompanyId: "product-company",
        userCompanyId: "user-company",
      }),
    ).toBe("product-company");
  });

  it("falls back to the authenticated company when creating a product", () => {
    expect(
      resolveShippingClassSettingsCompanyId({
        isEditMode: false,
        productCompanyId: "product-company",
        userCompanyId: "user-company",
      }),
    ).toBe("user-company");
  });

  it("falls back to the authenticated company when the edited product has no company yet", () => {
    expect(
      resolveShippingClassSettingsCompanyId({
        isEditMode: true,
        productCompanyId: "   ",
        userCompanyId: "user-company",
      }),
    ).toBe("user-company");
  });
});
