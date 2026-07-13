import { describe, expect, it } from "vitest";

import { appendPreviewFlag } from "../productLandingPageUrls";

describe("appendPreviewFlag", () => {
  it("adds preview to clean subdomain urls", () => {
    expect(
      appendPreviewFlag("https://swan.maxp.online/lp/demo-landing"),
    ).toBe("https://swan.maxp.online/lp/demo-landing?preview=1");
  });

  it("adds preview token when provided", () => {
    expect(
      appendPreviewFlag(
        "https://swan.maxp.online/lp/demo-landing",
        "signed-preview-token",
      ),
    ).toBe(
      "https://swan.maxp.online/lp/demo-landing?preview=1&previewToken=signed-preview-token",
    );
  });

  it("appends preview to urls with an existing query string", () => {
    expect(
      appendPreviewFlag(
        "https://maxp.online/store/lp/demo-landing?companyId=company-1",
      ),
    ).toBe(
      "https://maxp.online/store/lp/demo-landing?companyId=company-1&preview=1",
    );
  });

  it("overwrites stale preview values", () => {
    expect(
      appendPreviewFlag(
        "https://maxp.online/store/lp/demo-landing?companyId=company-1&preview=0",
      ),
    ).toBe(
      "https://maxp.online/store/lp/demo-landing?companyId=company-1&preview=1",
    );
  });

  it("overwrites stale preview tokens", () => {
    expect(
      appendPreviewFlag(
        "https://maxp.online/store/lp/demo-landing?companyId=company-1&preview=0&previewToken=old",
        "fresh-token",
      ),
    ).toBe(
      "https://maxp.online/store/lp/demo-landing?companyId=company-1&preview=1&previewToken=fresh-token",
    );
  });

  it("returns an empty string when no url is provided", () => {
    expect(appendPreviewFlag("")).toBe("");
  });
});
