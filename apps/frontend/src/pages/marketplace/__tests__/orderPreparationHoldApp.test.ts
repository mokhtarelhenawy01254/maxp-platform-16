import { describe, expect, it } from "vitest";
import { getAppDestination, APP_ROUTE_MAP } from "@/utils/marketplace";
import {
  getMarketplaceFeatureItems,
  getMarketplacePositioning,
} from "../featureCatalog";
import type { MarketplaceApp } from "@/types/marketplace";

describe("order-preparation-hold marketplace integration", () => {
  it("resolves the correct route destination for order-preparation-hold app", () => {
    expect(APP_ROUTE_MAP["order-preparation-hold"]).toBe(
      "/orders/preparation?pageSize=96&activeStage=ON_HOLD_PREP"
    );

    const appWithExplicitRoute: Partial<MarketplaceApp> = {
      slug: "order-preparation-hold",
      mainRoute: "/orders/preparation?pageSize=96&activeStage=ON_HOLD_PREP",
    };

    expect(getAppDestination(appWithExplicitRoute as MarketplaceApp)).toBe(
      "/orders/preparation?pageSize=96&activeStage=ON_HOLD_PREP"
    );

    const appWithoutExplicitRoute: Partial<MarketplaceApp> = {
      slug: "order-preparation-hold",
      mainRoute: null,
    };

    expect(getAppDestination(appWithoutExplicitRoute as MarketplaceApp)).toBe(
      "/orders/preparation?pageSize=96&activeStage=ON_HOLD_PREP"
    );
  });

  it("extracts features and positioning for order-preparation-hold app", () => {
    const app: Partial<MarketplaceApp> = {
      slug: "order-preparation-hold",
      pricingModel: "FREE",
      features: {
        onHoldQueue: {
          enabled: true,
          name: "طابور التجهيز المعلق",
          description: "عرض 96 طلب معلق في مرحلة التجهيز لمتابعتها بنقرة واحدة.",
          access: "FREE",
        },
        fastResolution: {
          enabled: true,
          name: "معالجة النواقص والتوريد",
          description: "تحديث حالات التجهيز ومتابعة أسباب التعليق لتسريع الشحن.",
          access: "FREE",
        },
      },
    };

    const items = getMarketplaceFeatureItems(app);
    expect(items.length).toBe(2);
    expect(items[0].key).toBe("onHoldQueue");
    expect(items[0].access).toBe("FREE");
    expect(items[1].key).toBe("fastResolution");
    expect(items[1].access).toBe("FREE");

    const positioning = getMarketplacePositioning(app);
    expect(positioning).not.toBeNull();
    expect(positioning?.audience).toContain("التجهيز");
    expect(positioning?.surface).toContain("تجهيز الطلبات المعلقة");
  });
});
