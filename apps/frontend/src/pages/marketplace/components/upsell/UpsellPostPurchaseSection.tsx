import React from "react";
import { Mail, CheckCircle2 } from "lucide-react";
import {
  PlacementCard,
  StatusPill,
  PlacementMetric,
  PlacementPreview,
  PreviewPill,
  ToggleField,
  TextField,
} from "../controls/SettingFields";
import { JsonRecord, formatRate } from "../../types/appSettingsTypes";

interface UpsellPostPurchaseSectionProps {
  active: boolean;
  modulesSettings: JsonRecord;
  thresholdsSettings: JsonRecord;
  copySettings: JsonRecord;
  upsellFallbackSummary: string;
  upsellCenterMetrics: {
    postPurchaseViews: number;
    postPurchaseClicks: number;
    postPurchaseAdds: number;
  };
  updateAtPath: (path: string, value: unknown) => void;
}

export const UpsellPostPurchaseSection: React.FC<UpsellPostPurchaseSectionProps> = ({
  active,
  modulesSettings,
  thresholdsSettings,
  copySettings,
  upsellFallbackSummary,
  upsellCenterMetrics,
  updateAtPath,
}) => {
  return (
    <div
      id="upsell-post-purchase"
      className={active ? "scroll-mt-24" : "hidden"}
    >
      <PlacementCard
        icon={<Mail size={20} />}
        eyebrow="Thank You Page"
        title="ما بعد الشراء"
        description="هنا تدير العرض الذي يظهر بعد نجاح الطلب. هذا هو أقرب مكان لتحويل إضافي سريع دون تشتيت العميل أثناء الدفع."
        status={
          <>
            <StatusPill
              active={Boolean(modulesSettings["postPurchaseUpsell"])}
              activeLabel="Post-purchase شغال"
              inactiveLabel="Post-purchase متوقف"
            />
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          <PlacementMetric
            label="Thank You Views"
            value={`${upsellCenterMetrics.postPurchaseViews}`}
            hint="مرات ظهور بلوك الـ upsell بعد نجاح الطلب."
          />
          <PlacementMetric
            label="Upsell CTR"
            value={formatRate(
              upsellCenterMetrics.postPurchaseClicks,
              upsellCenterMetrics.postPurchaseViews,
            )}
            hint="نسبة النقر على منتجات الـ upsell من صفحة الشكر."
          />
          <PlacementMetric
            label="Add-To-Cart Rate"
            value={formatRate(
              upsellCenterMetrics.postPurchaseAdds,
              upsellCenterMetrics.postPurchaseViews,
            )}
            hint="كم مشاهدة انتهت بإضافة منتج إضافي للسلة."
          />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <PlacementPreview
            title="كيف ستظهر بعد نجاح الطلب"
            description="المستخدم هنا أنهى الشراء بالفعل، لذلك العرض يجب أن يبدو كإضافة لطيفة بعد النجاح لا كتعطيل لرحلة الدفع."
            badge={<PreviewPill label="Thank You" tone="green" />}
          >
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-900/30 dark:bg-emerald-950/20">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-2xl bg-emerald-600 p-2 text-white">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white">
                      تم تأكيد الطلب بنجاح
                    </div>
                    <p className="mt-1 text-xs leading-6 text-gray-600 dark:text-gray-400">
                      Order #10482 has been placed and the customer is now on the thank-you page.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <PreviewPill
                        label={String(copySettings["postPurchaseUpsellBadge"] || "Recommended next")}
                        tone="blue"
                      />
                      <PreviewPill label={upsellFallbackSummary} tone="amber" />
                    </div>
                    <div className="mt-2 text-sm font-bold text-gray-900 dark:text-white">
                      {String(
                        copySettings["postPurchaseUpsellTitle"] || "You may also like after this order",
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-6 text-gray-600 dark:text-gray-400">
                      {String(
                        copySettings["postPurchaseUpsellDescription"] ||
                          "عرض إضافي بعد الشراء يعتمد على الربط اليدوي أولًا ثم fallback.",
                      )}
                    </p>
                  </div>
                  <PreviewPill
                    label={modulesSettings["postPurchaseUpsell"] ? "Active" : "Off"}
                    tone={modulesSettings["postPurchaseUpsell"] ? "green" : "neutral"}
                  />
                </div>

                <div className="mt-3 rounded-2xl border border-white/70 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <div className="grid grid-cols-[64px_1fr_auto] items-center gap-3">
                    <div className="h-16 rounded-xl bg-gradient-to-br from-slate-200 via-white to-slate-100 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800" />
                    <div>
                      <div className="h-3 w-2/3 rounded-full bg-gray-300 dark:bg-gray-700" />
                      <div className="mt-2 h-3 w-1/4 rounded-full bg-gray-200 dark:bg-gray-800" />
                    </div>
                    <div className="rounded-full bg-gray-900 px-3 py-1.5 text-[10px] font-bold text-white dark:bg-white dark:text-gray-900">
                      Add to cart
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </PlacementPreview>

          <div className="rounded-[28px] border border-gray-200 bg-gray-50/80 p-5 dark:border-gray-700 dark:bg-gray-900/60">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">
              UX Notes
            </div>
            <h3 className="mt-2 text-xl font-black text-gray-900 dark:text-white">
              كيف يشعر العميل هنا؟
            </h3>
            <div className="mt-4 space-y-3">
              {[
                "يرى أولًا رسالة النجاح ثم العرض الإضافي، لذلك لا يحدث تضارب بين التأكيد والبيع.",
                "وجود badge واضح وعرض واحد قوي أفضل من شبكة مزدحمة بعد إتمام الطلب.",
                "كلما كانت العلاقات اليدوية بين المنتجات أدق، زادت فرصة أن يبدو العرض منطقيًا لا عشوائيًا.",
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
              label="Post-purchase Upsell"
              description="يشغّل بلوك المنتجات المقترحة بعد نجاح الطلب داخل صفحة الشكر."
              checked={Boolean(modulesSettings["postPurchaseUpsell"])}
              onChange={(value) => updateAtPath("modules.postPurchaseUpsell", value)}
            />
            <TextField
              label="Upsell Price Range (%)"
              type="number"
              value={Number(thresholdsSettings["upsellPriceRangePercent"] || 20)}
              onChange={(value) =>
                updateAtPath("thresholds.upsellPriceRangePercent", Number(value) || 0)
              }
            />
            <div className="rounded-2xl border border-dashed border-gray-300 p-4 text-sm leading-7 text-gray-600 dark:border-gray-700 dark:text-gray-400">
              إذا لم تربط منتجات upsell يدويًا، سيحاول النظام اقتراح منتجات من نفس الفئة
              مع تفضيل سعري يصل إلى <span className="font-semibold">{upsellFallbackSummary}</span>.
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
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
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm leading-7 text-gray-600 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-400">
              أفضل نتيجة هنا تأتي من منتجات مرتبطة يدويًا لكل منتج، وليس من الـ fallback فقط.
            </div>
          </div>
        </div>
      </PlacementCard>
    </div>
  );
};
