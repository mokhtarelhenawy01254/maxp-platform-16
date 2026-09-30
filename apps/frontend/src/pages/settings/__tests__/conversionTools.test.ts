/* @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import arTranslation from "../../../locales/ar/translation.json";
import enTranslation from "../../../locales/en/translation.json";
import { ALL_CONVERSION_TOOLS, findToolById } from "../conversionToolMeta";
import {
  CONVERSION_TOOL_PREVIEWS,
  renderConversionToolPreview,
} from "../conversionToolPreviews";

type TranslationNamespace = Record<string, any>;

describe("conversion tools catalog", () => {
  it("exposes all 24 tools across the 5 pages", () => {
    expect(ALL_CONVERSION_TOOLS).toHaveLength(24);
  });

  it("findToolById resolves existing keys and rejects unknown ones", () => {
    expect(findToolById("saleCountdown")?.tool.key).toBe("saleCountdown");
    expect(findToolById("verifiedBadge")?.tool.key).toBe("verifiedBadge");
    expect(findToolById("definitely-not-a-tool")).toBeNull();
    expect(findToolById("")).toBeNull();
  });

  it("every tool has meta (icon + previewKind) and a preview renderer", () => {
    for (const { tool, meta } of ALL_CONVERSION_TOOLS) {
      expect(meta.icon, `missing icon for ${tool.key}`).toBeTruthy();
      expect(["block", "component", "mock", "note"]).toContain(meta.previewKind);
      expect(CONVERSION_TOOL_PREVIEWS[tool.key], `missing preview for ${tool.key}`).toBeDefined();
    }
  });

  it("renders a preview node for every tool (24/24)", () => {
    for (const { tool } of ALL_CONVERSION_TOOLS) {
      const node = renderConversionToolPreview(tool.key, {
        settings: { thresholds: { freeShippingAmount: 750 } },
      });
      expect(node, `empty preview for ${tool.key}`).toBeTruthy();
    }
  });

  it("free shipping preview handles zero threshold without crashing", () => {
    const withThreshold = renderConversionToolPreview("freeShippingBar", {
      settings: { thresholds: { freeShippingAmount: 500 } },
    });
    const withoutThreshold = renderConversionToolPreview("freeShippingBar", {
      settings: {},
    });
    expect(withThreshold).toBeTruthy();
    expect(withoutThreshold).toBeTruthy();
  });

  it("has complete ar/en label+benefit translations for every tool", () => {
    const arNamespace = (arTranslation as TranslationNamespace).storeConversionSettings;
    const enNamespace = (enTranslation as TranslationNamespace).storeConversionSettings;

    for (const { tool } of ALL_CONVERSION_TOOLS) {
      expect(arNamespace.tool?.[tool.key]?.label, `ar label for ${tool.key}`).toBeTruthy();
      expect(arNamespace.tool?.[tool.key]?.benefit, `ar benefit for ${tool.key}`).toBeTruthy();
      expect(enNamespace.tool?.[tool.key]?.label, `en label for ${tool.key}`).toBeTruthy();
      expect(enNamespace.tool?.[tool.key]?.benefit, `en benefit for ${tool.key}`).toBeTruthy();
    }
  });
});
