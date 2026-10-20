import React from "react";
import {
  ShoppingCart,
  BadgePercent,
  Sparkles,
  CheckCircle2,
  Mail,
  Package,
  BarChart3,
} from "lucide-react";
import { InsightCard } from "../controls/SettingFields";
import { formatRate } from "../../types/appSettingsTypes";

interface ConversionJourneySnapshotProps {
  conversionJourney: {
    checkoutViews: number;
    checkoutClicks: number;
    orderAttempts: number;
    ordersCreated: number;
    thankYouViews: number;
    couponAttempts: number;
    couponSuccesses: number;
    couponOrders: number;
    upsellViews: number;
    upsellClicks: number;
    upsellAdds: number;
    continueShopping: number;
    whatsappSupport: number;
    emailSupport: number;
    trackOrderClicks: number;
    trackOrderSuccesses: number;
    reorderClicks: number;
    reorderCompleted: number;
    postPurchaseActions: number;
  };
}

export const ConversionJourneySnapshot: React.FC<ConversionJourneySnapshotProps> = ({
  conversionJourney,
}) => {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
          <ShoppingCart size={18} />
          <span className="font-semibold">Journey Snapshot</span>
        </div>
        <div className="space-y-3">
          {[
            {
              label: "Checkout payment views",
              value: conversionJourney.checkoutViews,
              hint: "عدد مرات الوصول إلى خطوة الدفع النهائية داخل الـ storefront.",
            },
            {
              label: "Checkout CTA clicks",
              value: conversionJourney.checkoutClicks,
              hint: "ضغطات زر الانتقال من السلة إلى صفحة الـ checkout.",
            },
            {
              label: "Order submit attempts",
              value: conversionJourney.orderAttempts,
              hint: "محاولات تأكيد الطلب بعد اختيار الدفع والشحن.",
            },
            {
              label: "Orders created",
              value: conversionJourney.ordersCreated,
              hint: "طلبات تم إنشاؤها فعليًا من الـ storefront.",
            },
            {
              label: "Thank-you views",
              value: conversionJourney.thankYouViews,
              hint: "عملاء وصلوا فعلًا إلى صفحة نجاح الطلب.",
            },
            {
              label: "Upsell block views",
              value: conversionJourney.upsellViews,
              hint: "عدد مرات ظهور بلوك ما بعد الشراء داخل صفحة النجاح.",
            },
            {
              label: "Upsell clicks",
              value: conversionJourney.upsellClicks,
              hint: "النقرات على منتجات الـ upsell بعد إتمام الطلب.",
            },
            {
              label: "Track-order checks",
              value: conversionJourney.trackOrderClicks,
              hint: "How many times customers opened order tracking from thank-you.",
            },
            {
              label: "Reorders completed",
              value: conversionJourney.reorderCompleted,
              hint: "Completed reorder actions that pushed the original items back to cart.",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-700"
            >
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  {item.label}
                </div>
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {item.hint}
                </div>
              </div>
              <div className="text-2xl font-bold tabular-nums font-mono text-gray-900 dark:text-white">
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <InsightCard
            label="Coupon Success"
            value={`${conversionJourney.couponSuccesses}`}
            hint={`${formatRate(
              conversionJourney.couponSuccesses,
              conversionJourney.couponAttempts,
            )} success rate from coupon validations.`}
            icon={<BadgePercent size={18} />}
          />
          <InsightCard
            label="Coupon Orders"
            value={`${conversionJourney.couponOrders}`}
            hint="عدد الطلبات التي تم فيها تطبيق كوبون بنجاح عند الإرسال."
            icon={<Sparkles size={18} />}
          />
          <InsightCard
            label="Order Completion"
            value={formatRate(
              conversionJourney.ordersCreated,
              conversionJourney.orderAttempts,
            )}
            hint={`${conversionJourney.ordersCreated} orders from ${conversionJourney.orderAttempts} submit attempts.`}
            icon={<CheckCircle2 size={18} />}
          />
          <InsightCard
            label="Post-Purchase Actions"
            value={`${conversionJourney.postPurchaseActions}`}
            hint="إجمالي الرجوع للمتجر أو طلب الدعم بعد صفحة النجاح."
            icon={<Mail size={18} />}
          />
          <InsightCard
            label="Upsell Adds"
            value={`${conversionJourney.upsellAdds}`}
            hint="عدد الإضافات للسلة من بلوك ما بعد الشراء."
            icon={<ShoppingCart size={18} />}
          />
          <InsightCard
            label="Track Order Success"
            value={`${conversionJourney.trackOrderSuccesses}`}
            hint="Successful order lookups from the thank-you page."
            icon={<Package size={18} />}
          />
          <InsightCard
            label="Reorders"
            value={`${conversionJourney.reorderCompleted}`}
            hint="Completed reorder actions that sent the same items back to cart."
            icon={<ShoppingCart size={18} />}
          />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
            <BarChart3 size={18} />
            <span className="font-semibold">Key Rates</span>
          </div>
          <div className="space-y-4">
            {[
              {
                label: "Coupon validation success rate",
                value: formatRate(
                  conversionJourney.couponSuccesses,
                  conversionJourney.couponAttempts,
                ),
                hint: `${conversionJourney.couponAttempts} coupon checks recorded.`,
              },
              {
                label: "Order creation rate",
                value: formatRate(
                  conversionJourney.ordersCreated,
                  conversionJourney.orderAttempts,
                ),
                hint: "مقارنة بين محاولات الإرسال والطلبات التي تم إنشاؤها.",
              },
              {
                label: "Thank-you capture rate",
                value: formatRate(
                  conversionJourney.thankYouViews,
                  conversionJourney.ordersCreated,
                ),
                hint: "هل العميل وصل فعلًا لصفحة النجاح بعد إنشاء الطلب؟",
              },
              {
                label: "Post-purchase engagement rate",
                value: formatRate(
                  conversionJourney.postPurchaseActions,
                  conversionJourney.thankYouViews,
                ),
                hint: "تفاعل العملاء بعد الشراء عبر الرجوع للمتجر أو الدعم.",
              },
              {
                label: "Upsell CTR",
                value: formatRate(
                  conversionJourney.upsellClicks,
                  conversionJourney.upsellViews,
                ),
                hint: "نسبة النقر على بلوك الـ upsell بعد الشراء.",
              },
              {
                label: "Upsell add-to-cart rate",
                value: formatRate(
                  conversionJourney.upsellAdds,
                  conversionJourney.upsellViews,
                ),
                hint: "كم مرة تحولت مشاهدات بلوك الـ upsell إلى إضافة للسلة.",
              },
              {
                label: "Track-order success rate",
                value: formatRate(
                  conversionJourney.trackOrderSuccesses,
                  conversionJourney.trackOrderClicks,
                ),
                hint: "How many thank-you order checks returned a valid order status.",
              },
              {
                label: "Reorder completion rate",
                value: formatRate(
                  conversionJourney.reorderCompleted,
                  conversionJourney.reorderClicks,
                ),
                hint: "How often reorder clicks ended with items added back to cart.",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {item.label}
                  </div>
                  <div className="text-lg font-bold tabular-nums font-mono text-blue-600 dark:text-blue-300">
                    {item.value}
                  </div>
                </div>
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {item.hint}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
