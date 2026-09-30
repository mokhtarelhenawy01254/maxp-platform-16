/* @vitest-environment jsdom */

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import {
  ConversionToolPreviewProvider,
  renderConversionToolPreview,
} from "../conversionToolPreviews";
import { ALL_CONVERSION_TOOLS } from "../conversionToolMeta";

/**
 * اختبار انحدار: مكوّنات المتجر المستوردة (ConversionBlocks / TrustedBadgePanel /
 * BackInStockSignupCard) تستهلك useStorefrontTheme — من غير StorefrontThemeProvider
 * الصفحة كلها بتحطّ في الإنتاج (كارثة 2026-08-31). أي معاينة جديدة لازم تعدّي الرندر ده.
 */

const PREVIEW_SETTINGS = { thresholds: { freeShippingAmount: 750 } };

describe("conversion tool previews render inside the storefront theme provider", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders one sample of every previewKind without crashing", () => {
    const samplesByKind: Record<string, string> = {
      block: "saleCountdown",
      component: "trustedBadges",
      mock: "freeShippingBar",
      note: "inactiveTab",
    };

    for (const [kind, toolKey] of Object.entries(samplesByKind)) {
      const node = renderConversionToolPreview(toolKey, { settings: PREVIEW_SETTINGS });
      expect(node, `no node for ${kind} sample ${toolKey}`).toBeTruthy();
      expect(() =>
        render(<ConversionToolPreviewProvider>{node}</ConversionToolPreviewProvider>),
        `${toolKey} (${kind}) crashed while rendering — missing theme context?`,
      ).not.toThrow();
      cleanup();
    }
  });

  it("renders every single tool preview inside the provider without throwing (24/24)", () => {
    for (const { tool } of ALL_CONVERSION_TOOLS) {
      const node = renderConversionToolPreview(tool.key, { settings: PREVIEW_SETTINGS });
      expect(node, `no node for ${tool.key}`).toBeTruthy();
      expect(() =>
        render(<ConversionToolPreviewProvider>{node}</ConversionToolPreviewProvider>),
        `${tool.key} preview crashed while rendering`,
      ).not.toThrow();
      cleanup();
    }
  });
});
