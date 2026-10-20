import React from "react";
import { Settings2 } from "lucide-react";
import {
  PlacementPreview,
  PreviewPill,
  ToggleField,
  SelectField,
  TextField,
} from "../controls/SettingFields";
import { JsonRecord } from "../../types/appSettingsTypes";

interface UpsellGeneralSectionProps {
  active: boolean;
  generalSettings: JsonRecord;
  modulesSettings: JsonRecord;
  copySettings: JsonRecord;
  cartPlacementEnabled: boolean;
  updateAtPath: (path: string, value: unknown) => void;
  applyPreset: (preset: string) => void;
}

export const UpsellGeneralSection: React.FC<UpsellGeneralSectionProps> = ({
  active,
  generalSettings,
  modulesSettings,
  copySettings,
  cartPlacementEnabled,
  updateAtPath,
  applyPreset,
}) => {
  return (
    <section
      id="upsell-general-settings"
      className={`scroll-mt-24 rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 ${
        active ? "" : "hidden"
      }`}
    >
      <div className="mb-6 flex items-center gap-3 text-gray-900 dark:text-white">
        <Settings2 size={20} />
        <div>
          <h2 className="text-2xl font-black">الإعدادات العامة والنصوص الثانوية</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            هذه الإعدادات أقل استخدامًا يوميًا، لكنها تؤثر على طريقة العرض الافتراضية
            والنسخ المساندة داخل الباندل والسلة.
          </p>
        </div>
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <PlacementPreview
          title="خريطة التحكم العامة"
          description="هذا القسم لا يخص مكان ظهور واحد، بل يحدد إذا كان المحرك كله يعمل وكيف يوزع النسخ والقوالب المشتركة عبر كل الـ placements."
          badge={<PreviewPill label="Engine" tone="blue" />}
        >
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              {[
                {
                  title: "Product Page",
                  status: modulesSettings["crossSell"] || modulesSettings["boughtTogether"],
                  note: "Related + Bundle",
                },
                {
                  title: "Cart Drawer",
                  status: cartPlacementEnabled,
                  note: "Quick add",
                },
                {
                  title: "Thank You",
                  status: modulesSettings["postPurchaseUpsell"],
                  note: "Post-purchase",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-950/60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-bold text-gray-900 dark:text-white">
                      {item.title}
                    </div>
                    <PreviewPill
                      label={item.status ? "Live" : "Off"}
                      tone={item.status ? "green" : "neutral"}
                    />
                  </div>
                  <p className="mt-2 text-xs leading-6 text-gray-600 dark:text-gray-400">
                    {item.note}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-dashed border-gray-300 p-4 dark:border-gray-700">
              <div className="flex flex-wrap items-center gap-2">
                <PreviewPill
                  label={generalSettings["enabled"] ? "Engine on" : "Engine off"}
                  tone={generalSettings["enabled"] ? "green" : "neutral"}
                />
                <PreviewPill
                  label={
                    generalSettings["renderInTemplates"]
                      ? "Templates ready"
                      : "Templates off"
                  }
                  tone={generalSettings["renderInTemplates"] ? "blue" : "neutral"}
                />
                <PreviewPill
                  label={String(generalSettings["preset"] || "balanced")}
                  tone="amber"
                />
              </div>
              <p className="mt-3 text-sm leading-7 text-gray-600 dark:text-gray-400">
                أي تغيير هنا ينعكس على أكثر من placement، لذلك هذه الشاشة مناسبة لصاحب
                المتجر أو المسؤول عن conversion logic بالكامل.
              </p>
            </div>
          </div>
        </PlacementPreview>

        <div className="rounded-[28px] border border-gray-200 bg-gray-50/80 p-5 dark:border-gray-700 dark:bg-gray-900/60">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">
            Admin Guidance
          </div>
          <h3 className="mt-2 text-xl font-black text-gray-900 dark:text-white">
            متى أستخدم هذا القسم؟
          </h3>
          <div className="mt-4 space-y-3">
            {[
              "عندما تريد تشغيل أو إيقاف المنطق كله بدل تعديل placement واحد فقط.",
              "عندما تريد تغيير الـ preset أو النصوص المشتركة المستخدمة في أكثر من مكان.",
              "عندما تحتاج التأكد أن الـ hooks جاهزة داخل القوالب قبل اختبار الظهور على المتجر.",
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

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-4 md:grid-cols-2">
          <ToggleField
            label="تفعيل الـ Conversion Suite"
            description="إذا أغلقت هذا الزر سيتوقف منطق الـ upsell بالكامل على المتجر."
            checked={Boolean(generalSettings["enabled"])}
            onChange={(value) => updateAtPath("general.enabled", value)}
          />
          <ToggleField
            label="إدخال داخل القوالب"
            description="يبقي الـ hooks الخاصة بالتوصيات جاهزة داخل القوالب والثيم الحالي."
            checked={Boolean(generalSettings["renderInTemplates"])}
            onChange={(value) => updateAtPath("general.renderInTemplates", value)}
          />
          <ToggleField
            label="الربط مع Shell"
            description="يشغّل المكونات المرتبطة بالـ storefront shell على مستوى المتجر."
            checked={Boolean(generalSettings["attachToThemeShell"])}
            onChange={(value) => updateAtPath("general.attachToThemeShell", value)}
          />
          <SelectField
            label="Preset"
            value={String(generalSettings["preset"] || "balanced")}
            options={[
              { value: "minimal", label: "Minimal" },
              { value: "balanced", label: "Balanced" },
              { value: "aggressive", label: "Aggressive" },
            ]}
            onChange={applyPreset}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
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
        </div>
      </div>
    </section>
  );
};
