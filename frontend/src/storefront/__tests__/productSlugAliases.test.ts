import { describe, expect, it } from "vitest";

import { resolveLegacyProductSlugAlias } from "../utils/productSlugAliases";

describe("resolveLegacyProductSlugAlias", () => {
  it("maps Swan legacy ad slugs to their current product slug", () => {
    expect(
      resolveLegacyProductSlugAlias("kotshy-soan", {
        hostname: "swan.maxp.online",
      }),
    ).toBe("swan-sneaker-1775145033");
  });

  it("does not leak Swan aliases into other storefronts", () => {
    expect(
      resolveLegacyProductSlugAlias("kotshy-soan", {
        hostname: "example.maxp.online",
      }),
    ).toBeNull();
  });
});
