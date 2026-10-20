import React from "react";
import { Sparkles, Package, ShoppingCart, Mail } from "lucide-react";
import { RelationBadge } from "./RelationBadge";
import {
  RELATION_ORDER,
  RELATION_CONFIG_DATA,
  type ManagedRelationType,
} from "../../types/upsellManualTypes";

const getRelationIcon = (type: ManagedRelationType) => {
  switch (type) {
    case "related":
      return <Package size={16} />;
    case "crossSell":
      return <ShoppingCart size={16} />;
    case "upsell":
      return <Mail size={16} />;
  }
};

export function RelationImpactMap() {
  return (
    <div className="rounded-[24px] border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-950/30">
      <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
        <Sparkles size={14} />
        كيف يعمل هذا الربط؟
      </div>
      <h3 className="mt-3 text-2xl font-black text-gray-900 dark:text-white">
        خريطة تأثير كل نوع
      </h3>
      <p className="mt-2 text-sm leading-7 text-gray-600 dark:text-gray-400">
        الصفحة لا تغيّر مجرد النصوص، بل تحدد أي منتجات ستظهر فعليًا لكل مكان في
        رحلة الشراء. الترتيب دائمًا: الربط اليدوي أولًا ثم fallback تلقائي إذا لم
        يوجد ربط.
      </p>

      <div className="mt-5 space-y-3">
        {RELATION_ORDER.map((relationType) => (
          <div
            key={relationType}
            className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-900/60"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 font-bold text-gray-900 dark:text-white">
                {getRelationIcon(relationType)}
                {RELATION_CONFIG_DATA[relationType].title}
              </div>
              <RelationBadge
                label={RELATION_CONFIG_DATA[relationType].placementLabel}
                tone={relationType === "upsell" ? "amber" : "blue"}
              />
            </div>
            <p className="mt-2 text-sm leading-7 text-gray-600 dark:text-gray-400">
              {RELATION_CONFIG_DATA[relationType].help}
            </p>
            <div className="mt-3 rounded-2xl border border-dashed border-gray-300 px-4 py-3 text-xs leading-6 text-gray-600 dark:border-gray-700 dark:text-gray-400">
              {RELATION_CONFIG_DATA[relationType].placementNote}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-sm leading-7 text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-100">
        زر الحفظ هنا مستقل عن زر حفظ إعدادات الـ app. أي تعديل على الربط اليدوي
        يحفظ مباشرة داخل Metadata المنتج نفسه.
      </div>
    </div>
  );
}
