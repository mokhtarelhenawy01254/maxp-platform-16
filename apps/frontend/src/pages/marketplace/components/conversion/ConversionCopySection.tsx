import React from "react";
import { TextField } from "../controls/SettingFields";
import { JsonRecord } from "../../types/appSettingsTypes";

interface ConversionCopySectionProps {
  thresholdsSettings: JsonRecord;
  countdownSettings: JsonRecord;
  copySettings: JsonRecord;
  updateAtPath: (path: string, value: unknown) => void;
}

export const ConversionCopySection: React.FC<ConversionCopySectionProps> = ({
  thresholdsSettings,
  countdownSettings,
  copySettings,
  updateAtPath,
}) => {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      <TextField
        label="حد المخزون المنخفض"
        type="number"
        value={Number(thresholdsSettings["lowStockLimit"] || 5)}
        onChange={(value) => updateAtPath("thresholds.lowStockLimit", Number(value) || 0)}
      />
      <TextField
        label="حد الشحن المجاني"
        type="number"
        value={Number(thresholdsSettings["freeShippingAmount"] || 0)}
        onChange={(value) =>
          updateAtPath("thresholds.freeShippingAmount", Number(value) || 0)
        }
      />
      <TextField
        label="Upsell price range (%)"
        type="number"
        value={Number(thresholdsSettings["upsellPriceRangePercent"] || 20)}
        onChange={(value) =>
          updateAtPath("thresholds.upsellPriceRangePercent", Number(value) || 0)
        }
      />
      <TextField
        label="نافذة السلات النشطة (بالساعات)"
        type="number"
        value={Number(thresholdsSettings["purchaseFomoCartWindowHours"] || 24)}
        onChange={(value) =>
          updateAtPath("thresholds.purchaseFomoCartWindowHours", Number(value) || 0)
        }
      />
      <TextField
        label="نافذة الطلبات الحديثة (بالساعات)"
        type="number"
        value={Number(thresholdsSettings["purchaseFomoRecentPurchaseWindowHours"] || 48)}
        onChange={(value) =>
          updateAtPath(
            "thresholds.purchaseFomoRecentPurchaseWindowHours",
            Number(value) || 0,
          )
        }
      />
      <TextField
        label="حد انتظار الطلب عند fallback"
        type="number"
        value={Number(thresholdsSettings["purchaseFomoWaitlistFallbackLimit"] || 18)}
        onChange={(value) =>
          updateAtPath(
            "thresholds.purchaseFomoWaitlistFallbackLimit",
            Number(value) || 0,
          )
        }
      />
      <TextField
        label="حد الزوار الوهمي الأدنى"
        type="number"
        value={Number(thresholdsSettings["fakeVisitorMin"] || 6)}
        onChange={(value) =>
          updateAtPath("thresholds.fakeVisitorMin", Number(value) || 0)
        }
      />
      <TextField
        label="حد الزوار الوهمي الأقصى"
        type="number"
        value={Number(thresholdsSettings["fakeVisitorMax"] || 22)}
        onChange={(value) =>
          updateAtPath("thresholds.fakeVisitorMax", Number(value) || 0)
        }
      />
      <TextField
        label="نهاية العد التنازلي"
        type="datetime-local"
        value={String(countdownSettings["endsAt"] || "")}
        onChange={(value) => updateAtPath("countdown.endsAt", value)}
      />
      <TextField
        label="رسالة التبويب غير النشط"
        value={String(copySettings["inactiveTabTitle"] || "")}
        onChange={(value) => updateAtPath("copy.inactiveTabTitle", value)}
      />
      <TextField
        label="رسالة الشحن المجاني"
        value={String(copySettings["freeShippingMessage"] || "")}
        onChange={(value) => updateAtPath("copy.freeShippingMessage", value)}
      />
      <TextField
        label="رسالة FOMO للسلات"
        value={String(copySettings["purchaseFomoCartMessage"] || "")}
        onChange={(value) => updateAtPath("copy.purchaseFomoCartMessage", value)}
        placeholder="{{count}} shoppers currently have this in their cart"
      />
      <TextField
        label="رسالة FOMO للطلبات الحديثة"
        value={String(copySettings["purchaseFomoRecentMessage"] || "")}
        onChange={(value) => updateAtPath("copy.purchaseFomoRecentMessage", value)}
        placeholder="{{count}} orders included this product in the last {{hours}} hours"
      />
      <TextField
        label="رسالة FOMO للانتظار"
        value={String(copySettings["purchaseFomoWaitlistMessage"] || "")}
        onChange={(value) => updateAtPath("copy.purchaseFomoWaitlistMessage", value)}
        placeholder="{{count}} shoppers asked to be notified when this product returns"
      />
      <TextField
        label="Back In Stock Title"
        value={String(copySettings["backInStockTitle"] || "")}
        onChange={(value) => updateAtPath("copy.backInStockTitle", value)}
      />
      <TextField
        label="Back In Stock Description"
        value={String(copySettings["backInStockDescription"] || "")}
        onChange={(value) => updateAtPath("copy.backInStockDescription", value)}
      />
      <TextField
        label="Back In Stock Success"
        value={String(copySettings["backInStockSuccessMessage"] || "")}
        onChange={(value) => updateAtPath("copy.backInStockSuccessMessage", value)}
      />
      <TextField
        label="Trusted Badge Title"
        value={String(copySettings["trustedBadgeTitle"] || "")}
        onChange={(value) => updateAtPath("copy.trustedBadgeTitle", value)}
      />
      <TextField
        label="Trusted Badge Subtitle"
        value={String(copySettings["trustedBadgeSubtitle"] || "")}
        onChange={(value) => updateAtPath("copy.trustedBadgeSubtitle", value)}
      />
      <TextField
        label="Trusted Badge Items"
        value={String(copySettings["trustedBadgeItems"] || "")}
        onChange={(value) => updateAtPath("copy.trustedBadgeItems", value)}
        placeholder="Secure checkout, Visa & Mastercard, Cash on delivery"
      />
      <TextField
        label="Cart Upsell Badge"
        value={String(copySettings["cartUpsellBadge"] || "")}
        onChange={(value) => updateAtPath("copy.cartUpsellBadge", value)}
      />
      <TextField
        label="Cart Upsell Title"
        value={String(copySettings["cartUpsellTitle"] || "")}
        onChange={(value) => updateAtPath("copy.cartUpsellTitle", value)}
      />
      <TextField
        label="Cart Upsell Description"
        value={String(copySettings["cartUpsellDescription"] || "")}
        onChange={(value) => updateAtPath("copy.cartUpsellDescription", value)}
      />
      <TextField
        label="Post-purchase Upsell Badge"
        value={String(copySettings["postPurchaseUpsellBadge"] || "")}
        onChange={(value) => updateAtPath("copy.postPurchaseUpsellBadge", value)}
      />
      <TextField
        label="Post-purchase Upsell Title"
        value={String(copySettings["postPurchaseUpsellTitle"] || "")}
        onChange={(value) => updateAtPath("copy.postPurchaseUpsellTitle", value)}
      />
      <TextField
        label="Post-purchase Upsell Description"
        value={String(copySettings["postPurchaseUpsellDescription"] || "")}
        onChange={(value) => updateAtPath("copy.postPurchaseUpsellDescription", value)}
      />
      <TextField
        label="Cross Sell Title"
        value={String(copySettings["crossSellTitle"] || "")}
        onChange={(value) => updateAtPath("copy.crossSellTitle", value)}
      />
      <TextField
        label="Cross Sell Description"
        value={String(copySettings["crossSellDescription"] || "")}
        onChange={(value) => updateAtPath("copy.crossSellDescription", value)}
      />
      <TextField
        label="Bought Together Title"
        value={String(copySettings["boughtTogetherTitle"] || "")}
        onChange={(value) => updateAtPath("copy.boughtTogetherTitle", value)}
      />
      <TextField
        label="Bought Together Description"
        value={String(copySettings["boughtTogetherDescription"] || "")}
        onChange={(value) => updateAtPath("copy.boughtTogetherDescription", value)}
      />
      <TextField
        label="Bundle Add Label"
        value={String(copySettings["bundleAddLabel"] || "")}
        onChange={(value) => updateAtPath("copy.bundleAddLabel", value)}
      />
      <TextField
        label="Bundle Total Label"
        value={String(copySettings["bundleTotalLabel"] || "")}
        onChange={(value) => updateAtPath("copy.bundleTotalLabel", value)}
      />
      <TextField
        label="Current Product Label"
        value={String(copySettings["bundleCurrentLabel"] || "")}
        onChange={(value) => updateAtPath("copy.bundleCurrentLabel", value)}
      />
      <TextField
        label="Recommendation Label"
        value={String(copySettings["bundleRecommendationLabel"] || "")}
        onChange={(value) => updateAtPath("copy.bundleRecommendationLabel", value)}
      />
      <TextField
        label="Bundle Variant Hint"
        value={String(copySettings["bundleVariantHint"] || "")}
        onChange={(value) => updateAtPath("copy.bundleVariantHint", value)}
      />
      <TextField
        label="Quick Add Label"
        value={String(copySettings["quickAddLabel"] || "")}
        onChange={(value) => updateAtPath("copy.quickAddLabel", value)}
      />
      <TextField
        label="Choose Options Label"
        value={String(copySettings["chooseOptionsLabel"] || "")}
        onChange={(value) => updateAtPath("copy.chooseOptionsLabel", value)}
      />
      <TextField
        label="Exit Intent Title"
        value={String(copySettings["exitIntentTitle"] || "")}
        onChange={(value) => updateAtPath("copy.exitIntentTitle", value)}
      />
      <TextField
        label="Exit Intent Description"
        value={String(copySettings["exitIntentDescription"] || "")}
        onChange={(value) => updateAtPath("copy.exitIntentDescription", value)}
      />
      <TextField
        label="Exit Intent Coupon"
        value={String(copySettings["exitIntentCouponCode"] || "")}
        onChange={(value) => updateAtPath("copy.exitIntentCouponCode", value)}
      />
      <TextField
        label="Exit Intent CTA"
        value={String(copySettings["exitIntentPrimaryLabel"] || "")}
        onChange={(value) => updateAtPath("copy.exitIntentPrimaryLabel", value)}
      />
      <TextField
        label="Exit Intent Secondary"
        value={String(copySettings["exitIntentSecondaryLabel"] || "")}
        onChange={(value) => updateAtPath("copy.exitIntentSecondaryLabel", value)}
      />
    </section>
  );
};
