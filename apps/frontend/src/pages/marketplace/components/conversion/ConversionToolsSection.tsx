import React from "react";
import { ToggleField, SelectField } from "../controls/SettingFields";
import { JsonRecord } from "../../types/appSettingsTypes";

interface ConversionToolsSectionProps {
  modulesSettings: JsonRecord;
  uiSettings: JsonRecord;
  updateAtPath: (path: string, value: unknown) => void;
}

export const ConversionToolsSection: React.FC<ConversionToolsSectionProps> = ({
  modulesSettings,
  uiSettings,
  updateAtPath,
}) => {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">أدوات صفحة المنتج</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <ToggleField
            label="Sale Countdown"
            description="عرض مؤقت العرض داخل PDP Conversion Stack."
            checked={Boolean(modulesSettings["saleCountdown"])}
            onChange={(value) => updateAtPath("modules.saleCountdown", value)}
          />
          <ToggleField
            label="Low Stock Notice"
            description="تنبيه انخفاض المخزون عندما يقترب المنتج من النفاد."
            checked={Boolean(modulesSettings["lowStockNotice"])}
            onChange={(value) => updateAtPath("modules.lowStockNotice", value)}
          />
          <ToggleField
            label="Bulk Savings"
            description="إظهار خصومات الكمية المتاحة على المنتج."
            checked={Boolean(modulesSettings["bulkSavings"])}
            onChange={(value) => updateAtPath("modules.bulkSavings", value)}
          />
          <ToggleField
            label="Trusted Badges"
            description="Visual reassurance badges for payment, delivery, and returns inside Conversion Stack."
            checked={Boolean(modulesSettings["trustedBadges"])}
            onChange={(value) => updateAtPath("modules.trustedBadges", value)}
          />
          <ToggleField
            label="Estimated Delivery"
            description="عرض مدة التوصيل المتوقعة بجانب معلومات التحويل."
            checked={Boolean(modulesSettings["estimatedDelivery"])}
            onChange={(value) => updateAtPath("modules.estimatedDelivery", value)}
          />
          <ToggleField
            label="Cross Sell"
            description="تجهيز hooks للبيع الإضافي بعد الإضافة للسلة."
            checked={Boolean(modulesSettings["crossSell"])}
            onChange={(value) => updateAtPath("modules.crossSell", value)}
          />
          <ToggleField
            label="Bought Together"
            description="تجهيز مساحة مخصصة لاقتراح المنتجات التي تشترى معًا."
            checked={Boolean(modulesSettings["boughtTogether"])}
            onChange={(value) => updateAtPath("modules.boughtTogether", value)}
          />
          <ToggleField
            label="Post-purchase Upsell"
            description="تشغيل اقتراحات الإضافة بعد إتمام الطلب داخل صفحة النجاح."
            checked={Boolean(modulesSettings["postPurchaseUpsell"])}
            onChange={(value) => updateAtPath("modules.postPurchaseUpsell", value)}
          />
          <ToggleField
            label="Back In Stock"
            description="تفعيل نموذج waitlist عند نفاد المنتج من Conversion Stack."
            checked={Boolean(modulesSettings["backInStock"])}
            onChange={(value) => updateAtPath("modules.backInStock", value)}
          />
          <ToggleField
            label="Sold Counter"
            description="Display lifetime purchase count using real order activity for this product."
            checked={Boolean(modulesSettings["soldCounter"])}
            onChange={(value) => updateAtPath("modules.soldCounter", value)}
          />
          <ToggleField
            label="Purchase FOMO"
            description="Show demand from active carts first, then recent orders, then waitlist fallback when needed."
            checked={Boolean(modulesSettings["purchaseFomo"])}
            onChange={(value) => updateAtPath("modules.purchaseFomo", value)}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">أدوات عامة على مستوى المتجر</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <ToggleField
            label="Free Shipping Bar"
            description="شريط ثابت يحفّز العميل للوصول إلى حد الشحن المجاني."
            checked={Boolean(modulesSettings["freeShippingBar"])}
            onChange={(value) => updateAtPath("modules.freeShippingBar", value)}
          />
          <ToggleField
            label="Sticky Add To Cart"
            description="تمكين الـ sticky host الخاص بزر الإضافة للسلة."
            checked={Boolean(modulesSettings["stickyAddToCart"])}
            onChange={(value) => updateAtPath("modules.stickyAddToCart", value)}
          />
          <ToggleField
            label="Exit Intent Popup"
            description="تجهيز popup عند نية الخروج للزائر."
            checked={Boolean(modulesSettings["exitIntentPopup"])}
            onChange={(value) => updateAtPath("modules.exitIntentPopup", value)}
          />
          <ToggleField
            label="Inactive Tab"
            description="تغيير عنوان التبويب عند مغادرة المستخدم للصفحة."
            checked={Boolean(modulesSettings["inactiveTab"])}
            onChange={(value) => updateAtPath("modules.inactiveTab", value)}
          />
          <ToggleField
            label="Fake Visitor Counter"
            description="إتاحة عداد الزوار المحاكى كجزء من social proof."
            checked={Boolean(modulesSettings["fakeVisitorCounter"])}
            onChange={(value) => updateAtPath("modules.fakeVisitorCounter", value)}
          />
          <ToggleField
            label="Fake Sale Popup"
            description="إتاحة popup مبيعات محاكى على مستوى المتجر."
            checked={Boolean(modulesSettings["fakeSalePopup"])}
            onChange={(value) => updateAtPath("modules.fakeSalePopup", value)}
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <SelectField
          label="PDP Variant"
          value={String(uiSettings["pdpVariant"] || "balanced")}
          options={[
            { value: "minimal", label: "Minimal" },
            { value: "balanced", label: "Balanced" },
            { value: "editorial", label: "Editorial" },
          ]}
          onChange={(value) => updateAtPath("ui.pdpVariant", value)}
        />
        <SelectField
          label="Popup Style"
          value={String(uiSettings["popupStyle"] || "minimal")}
          options={[
            { value: "minimal", label: "Minimal" },
            { value: "promo", label: "Promo" },
            { value: "coupon", label: "Coupon" },
          ]}
          onChange={(value) => updateAtPath("ui.popupStyle", value)}
        />
        <SelectField
          label="Countdown Style"
          value={String(uiSettings["countdownStyle"] || "timer")}
          options={[
            { value: "timer", label: "Timer" },
            { value: "split", label: "Split" },
            { value: "minimal", label: "Minimal" },
          ]}
          onChange={(value) => updateAtPath("ui.countdownStyle", value)}
        />
        <SelectField
          label="Trusted Badge Style"
          value={String(uiSettings["trustedBadgeStyle"] || "strip")}
          options={[
            { value: "strip", label: "Strip" },
            { value: "grid", label: "Grid" },
            { value: "minimal", label: "Minimal" },
          ]}
          onChange={(value) => updateAtPath("ui.trustedBadgeStyle", value)}
        />
        <SelectField
          label="Bought Together Style"
          value={String(uiSettings["boughtTogetherStyle"] || "stacked")}
          options={[
            { value: "stacked", label: "Stacked" },
            { value: "compact", label: "Compact" },
            { value: "editorial", label: "Editorial" },
          ]}
          onChange={(value) => updateAtPath("ui.boughtTogetherStyle", value)}
        />
        <SelectField
          label="Cart Upsell Style"
          value={String(uiSettings["cartUpsellStyle"] || "stacked")}
          options={[
            { value: "stacked", label: "Stacked" },
            { value: "compact", label: "Compact" },
            { value: "editorial", label: "Editorial" },
          ]}
          onChange={(value) => updateAtPath("ui.cartUpsellStyle", value)}
        />
        <SelectField
          label="Bar Position"
          value={String(uiSettings["barPosition"] || "top")}
          options={[
            { value: "top", label: "Top" },
            { value: "bottom", label: "Bottom" },
          ]}
          onChange={(value) => updateAtPath("ui.barPosition", value)}
        />
        <SelectField
          label="Sticky Add To Cart Style"
          value={String(uiSettings["stickyStyle"] || "compact")}
          options={[
            { value: "compact", label: "Compact" },
            { value: "balanced", label: "Balanced" },
            { value: "minimal", label: "Minimal" },
          ]}
          onChange={(value) => updateAtPath("ui.stickyStyle", value)}
        />
        <SelectField
          label="Low Stock Style"
          value={String(uiSettings["lowStockStyle"] || "alert")}
          options={[
            { value: "alert", label: "Alert" },
            { value: "meter", label: "Meter" },
            { value: "minimal", label: "Minimal" },
          ]}
          onChange={(value) => updateAtPath("ui.lowStockStyle", value)}
        />
        <SelectField
          label="Estimated Delivery Style"
          value={String(uiSettings["estimatedDeliveryStyle"] || "card")}
          options={[
            { value: "card", label: "Card" },
            { value: "timeline", label: "Timeline" },
            { value: "pill", label: "Pill" },
          ]}
          onChange={(value) => updateAtPath("ui.estimatedDeliveryStyle", value)}
        />
        <SelectField
          label="Fake Visitor Style"
          value={String(uiSettings["fakeVisitorStyle"] || "pulse")}
          options={[
            { value: "pulse", label: "Pulse" },
            { value: "ticker", label: "Ticker" },
            { value: "minimal", label: "Minimal" },
          ]}
          onChange={(value) => updateAtPath("ui.fakeVisitorStyle", value)}
        />
        <SelectField
          label="Sold Counter Style"
          value={String(uiSettings["soldCounterStyle"] || "spotlight")}
          options={[
            { value: "spotlight", label: "Spotlight" },
            { value: "badge", label: "Badge" },
            { value: "minimal", label: "Minimal" },
          ]}
          onChange={(value) => updateAtPath("ui.soldCounterStyle", value)}
        />
        <SelectField
          label="Purchase FOMO Style"
          value={String(uiSettings["purchaseFomoStyle"] || "alert")}
          options={[
            { value: "alert", label: "Alert" },
            { value: "timeline", label: "Timeline" },
            { value: "minimal", label: "Minimal" },
          ]}
          onChange={(value) => updateAtPath("ui.purchaseFomoStyle", value)}
        />
        <SelectField
          label="Back In Stock Style"
          value={String(uiSettings["backInStockStyle"] || "panel")}
          options={[
            { value: "panel", label: "Panel" },
            { value: "inline", label: "Inline" },
            { value: "accent", label: "Accent" },
          ]}
          onChange={(value) => updateAtPath("ui.backInStockStyle", value)}
        />
      </section>
    </div>
  );
};
