import React from "react";
import { Package } from "lucide-react";
import {
  PlacementCard,
  StatusPill,
  PlacementMetric,
  PlacementPreview,
  PreviewPill,
  ToggleField,
  SelectField,
  TextField,
} from "../controls/SettingFields";
import { JsonRecord, formatRate } from "../../types/appSettingsTypes";

interface UpsellProductPageSectionProps {
  active: boolean;
  modulesSettings: JsonRecord;
  uiSettings: JsonRecord;
  copySettings: JsonRecord;
  upsellCenterMetrics: {
    crossSellViews: number;
    boughtTogetherViews: number;
    boughtTogetherQuickAdds: number;
    boughtTogetherBundleAdds: number;
  };
  updateAtPath: (path: string, value: unknown) => void;
}

export const UpsellProductPageSection: React.FC<UpsellProductPageSectionProps> = ({
  active,
  modulesSettings,
  uiSettings,
  copySettings,
  upsellCenterMetrics,
  updateAtPath,
}) => {
  return (
    <div
      id="upsell-product-page"
      className={active ? "scroll-mt-24" : "hidden"}
    >
      <PlacementCard
        icon={<Package size={20} />}
        eyebrow="Product Page"
        title="صفحة المنتج"
        description="من هنا تدير ما يظهر أسفل المنتج مباشرة: related / cross-sell و bought together. هذا هو المكان الأساسي لرفع قيمة السلة قبل الوصول للدفع."
        status={
          <>
            <StatusPill
              active={Boolean(modulesSettings["crossSell"])}
              activeLabel="Cross-sell شغال"
              inactiveLabel="Cross-sell متوقف"
            />
            <StatusPill
              active={Boolean(modulesSettings["boughtTogether"])}
              activeLabel="Bundle شغال"
              inactiveLabel="Bundle متوقف"
            />
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          <PlacementMetric
            label="Cross-sell Views"
            value={`${upsellCenterMetrics.crossSellViews}`}
            hint="مرات ظهور بلوك related/cross-sell على صفحة المنتج."
          />
          <PlacementMetric
            label="Bundle Views"
            value={`${upsellCenterMetrics.boughtTogetherViews}`}
            hint="مرات ظهور بلوك bought together على صفحة المنتج."
          />
          <PlacementMetric
            label="Bundle Add Rate"
            value={formatRate(
              upsellCenterMetrics.boughtTogetherQuickAdds +
                upsellCenterMetrics.boughtTogetherBundleAdds,
              upsellCenterMetrics.boughtTogetherViews,
            )}
            hint="تحويلات سريعة من الباندل سواء Quick Add أو Add Bundle."
          />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <PlacementPreview
            title="كيف سيظهر أسفل المنتج"
            description="المعاينة هنا تختصر للمستخدم شكل البلوكين الأساسيين في صفحة المنتج: منتجات مكملة، ثم باقة bought together."
            badge={<PreviewPill label="PDP" tone="blue" />}
          >
            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-950/60">
                <div className="grid grid-cols-[84px_1fr] gap-4">
                  <div className="h-24 rounded-2xl bg-gradient-to-br from-slate-200 via-slate-100 to-slate-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900" />
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="h-3 w-24 rounded-full bg-blue-100 dark:bg-blue-900/40" />
                      <div className="h-4 w-3/4 rounded-full bg-gray-300 dark:bg-gray-700" />
                      <div className="h-3 w-1/2 rounded-full bg-gray-200 dark:bg-gray-800" />
                    </div>
                    <div className="flex items-center gap-2">
                      <PreviewPill label="المنتج الحالي" tone="neutral" />
                      <PreviewPill label="قبل المراجعات" tone="amber" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white">
                      {String(copySettings["crossSellTitle"] || "You may also like")}
                    </div>
                    <p className="mt-1 text-xs leading-6 text-gray-600 dark:text-gray-400">
                      {String(
                        copySettings["crossSellDescription"] ||
                          "اقتراحات مكملة تظهر مباشرة بعد وصف المنتج.",
                      )}
                    </p>
                  </div>
                  <PreviewPill
                    label={modulesSettings["crossSell"] ? "cross-sell" : "related"}
                    tone="green"
                  />
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {[1, 2].map((item) => (
                    <div
                      key={`product-preview-card-${item}`}
                      className="rounded-2xl border border-white/70 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                    >
                      <div className="h-20 rounded-xl bg-gradient-to-br from-slate-200 via-white to-slate-100 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800" />
                      <div className="mt-3 h-3 w-3/4 rounded-full bg-gray-300 dark:bg-gray-700" />
                      <div className="mt-2 flex items-center justify-between">
                        <div className="h-3 w-12 rounded-full bg-gray-200 dark:bg-gray-800" />
                        <div className="rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-bold text-white">
                          {String(copySettings["quickAddLabel"] || "Quick add")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/30 dark:bg-amber-950/20">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                    {String(copySettings["boughtTogetherTitle"] || "Frequently bought together")}
                  </div>
                  <PreviewPill
                    label={String(uiSettings["boughtTogetherStyle"] || "stacked")}
                    tone="amber"
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400">
                  <span className="rounded-full bg-white px-3 py-1.5 dark:bg-gray-900">
                    المنتج الحالي
                  </span>
                  <span>+</span>
                  <span className="rounded-full bg-white px-3 py-1.5 dark:bg-gray-900">
                    إضافة مقترحة
                  </span>
                  <span>+</span>
                  <span className="rounded-full bg-white px-3 py-1.5 dark:bg-gray-900">
                    منتج ثالث
                  </span>
                </div>
                <div className="mt-3 inline-flex rounded-full bg-gray-900 px-4 py-2 text-xs font-bold text-white dark:bg-white dark:text-gray-900">
                  {String(copySettings["bundleAddLabel"] || "Add selected bundle")}
                </div>
              </div>
            </div>
          </PlacementPreview>

          <div className="rounded-[28px] border border-gray-200 bg-gray-50/80 p-5 dark:border-gray-700 dark:bg-gray-900/60">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">
              User Flow
            </div>
            <h3 className="mt-2 text-xl font-black text-gray-900 dark:text-white">
              ما الذي يفهمه العميل هنا؟
            </h3>
            <div className="mt-4 space-y-3">
              {[
                "يشاهد المنتج الأساسي أولًا ثم يرى اقتراحات مرتبطة بدون أن يترك الصفحة.",
                "يستوعب الفرق بين اقتراح مكمل سريع وبين باقة كاملة ترفع قيمة السلة.",
                "يعرف الإجراء المطلوب فورًا لأن الـ CTA ظاهر داخل كل بطاقة أو داخل الباندل.",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-gray-200 bg-white p-4 text-sm leading-7 text-gray-600 dark:border-gray-700 dark:bg-gray-950/50 dark:text-gray-400"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="space-y-4">
            <ToggleField
              label="Cross-sell / Related"
              description="يشغّل بلوك المنتجات المكملة داخل صفحة المنتج، ويغذي أيضًا جزءًا من اقتراحات السلة."
              checked={Boolean(modulesSettings["crossSell"])}
              onChange={(value) => updateAtPath("modules.crossSell", value)}
            />
            <ToggleField
              label="Bought Together"
              description="يشغّل باقة المنتجات التي تشتري مع المنتج الحالي داخل صفحة المنتج."
              checked={Boolean(modulesSettings["boughtTogether"])}
              onChange={(value) => updateAtPath("modules.boughtTogether", value)}
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
            <div className="rounded-2xl border border-dashed border-gray-300 p-4 text-sm leading-7 text-gray-600 dark:border-gray-700 dark:text-gray-400">
              الربط اليدوي للمنتجات لا يتم من هذا الجزء. افتح تبويب
              <span className="font-semibold text-gray-900 dark:text-white">
                {" "}
                ربط المنتجات
              </span>{" "}
              لإدارة Related / Cross-sell / Upsell، أو افتح صفحة المنتج لو أردت تعديل
              باقي إعداداته.
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
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
          </div>
        </div>
      </PlacementCard>
    </div>
  );
};
