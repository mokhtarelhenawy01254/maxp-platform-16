import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { trackPlatformSitePurchase } from "../../utils/platformSiteMetaPixel";

const SUCCESS_STATUSES = new Set([
  "success",
  "SUCCESS",
  "CAPTURED",
  "APPROVED",
  "PAID",
]);

const FAILURE_STATUSES = new Set([
  "failed",
  "FAILED",
  "CANCELLED",
  "REJECTED",
  "DECLINED",
  "ERROR",
]);

const SubscriptionSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [ready, setReady] = useState(false);

  const status = searchParams.get("status");
  const paymentStatus = searchParams.get("paymentStatus") || searchParams.get("statusCode");
  const billingId = searchParams.get("billingId");
  const bundle = searchParams.get("bundle");

  const isStoreBundle =
    bundle === "store-complete-bundle" ||
    bundle === "clothing-store-bundle" ||
    bundle === "complete-store-bundle";

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 900);
    return () => clearTimeout(t);
  }, []);

  const isSuccess = SUCCESS_STATUSES.has(status || "") || SUCCESS_STATUSES.has(paymentStatus || "");
  const isFailure = FAILURE_STATUSES.has(status || "") || FAILURE_STATUSES.has(paymentStatus || "");

  useEffect(() => {
    if (!isSuccess) return;

    const transactionId =
      billingId ||
      searchParams.get("orderId") ||
      searchParams.get("transactionId") ||
      searchParams.get("paymentId") ||
      searchParams.get("merchantOrderId") ||
      searchParams.get("id");

    const eventId = transactionId
      ? `purchase_${transactionId}`
      : `purchase_${bundle || (isStoreBundle ? "store-complete-bundle" : "bundle")}_fallback`;

    const rawAmount =
      searchParams.get("amount") ||
      searchParams.get("value") ||
      searchParams.get("total");
    const parsedAmount = rawAmount ? parseFloat(rawAmount) : NaN;
    // ممنوع اختراع سعر: لو الـamount مش موجود/غير صالح منفعش نبعت حدث شراء بقيمة ثابتة
    const value = !isNaN(parsedAmount) && parsedAmount > 0 ? parsedAmount : null;
    if (value === null) {
      return;
    }

    const storageKey = `meta_pixel_purchase_${eventId}`;
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        if (window.sessionStorage.getItem(storageKey)) {
          return;
        }
        window.sessionStorage.setItem(storageKey, "1");
      }
    } catch {
      // ignore storage errors
    }

    const contentName =
      bundle || (isStoreBundle ? "store-complete-bundle" : "bundle");

    trackPlatformSitePurchase("subscription_success", {
      value,
      currency: "EGP",
      content_name: contentName,
      eventID: eventId,
      billingId: billingId || undefined,
      bundle: bundle || undefined,
    });
  }, [isSuccess, billingId, bundle, isStoreBundle, searchParams]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b1215] text-white" dir="rtl">
        <div className="text-center max-w-md p-8">
          <div className="w-12 h-12 rounded-full border-4 border-teal-500 border-t-transparent animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">جاري تأكيد تفعيل باقتك...</h2>
          <p className="text-sm opacity-60">يرجى الانتظار</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b1215] text-white" dir="rtl">
      <div className="text-center max-w-md p-8">
        {isSuccess ? (
          <>
            <div className="w-16 h-16 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto mb-5">
              <svg className="w-9 h-9 text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-3">
              {isStoreBundle ? "باقة المتجر الكاملة مفعّلة!" : "باقة AI + Inbox مفعّلة!"}
            </h1>
            <p className="text-sm opacity-80 mb-6 leading-relaxed">
              {isStoreBundle ? (
                <>
                  تم إتمام الاشتراك وتفعيل الـ 17 أداة بنجاح 🎉
                  <br />
                  متجرك الإلكتروني، إدارة الطلبات، بوالص الشحن، المخزون، والواتساب جاهزة للعمل الآن.
                </>
              ) : (
                <>
                  تم إتمام الاشتراك وتفعيل الباقة بنجاح 🎉
                  <br />
                  جميع أدوات التواصل جاهزة الآن للاستخدام.
                </>
              )}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  window.location.href = isStoreBundle ? "/store" : "/unified-inbox";
                }}
                className="px-8 py-3 rounded-full bg-teal-600 text-white font-bold text-sm hover:bg-teal-500 transition-colors"
              >
                {isStoreBundle ? "ابدأ الآن — لوحة تحكم المتجر" : "ابدأ الآن — صندوق الوارد"}
              </button>
              <button
                onClick={() => navigate("/marketplace/bundles")}
                className="px-8 py-2 rounded-full bg-white/10 text-white font-semibold text-sm hover:bg-white/20 transition-colors border border-white/20"
              >
                {isStoreBundle ? "الأدوات والباقات المفعلة" : "تصفح الباقات"}
              </button>
            </div>
            {isStoreBundle && (
              <p className="text-xs text-teal-200/70 mt-5 leading-relaxed">
                🎨 تم تجهيز متجرك بقالب افتراضي جاهز للعمل فوراً. يمكنك تخصيص الألوان والبنرات أو اختيار قالب متخصص لنشاطك في أي وقت من{" "}
                <button
                  type="button"
                  onClick={() => navigate("/marketplace/themes")}
                  className="underline hover:text-white transition-colors text-teal-300 font-semibold"
                >
                  استوديو الثيمات (30+ ثيم)
                </button>
              </p>
            )}
          </>
        ) : isFailure ? (
          <>
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-5">
              <svg className="w-9 h-9 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-3">لم يكتمل الدفع</h1>
            <p className="text-sm opacity-80 mb-6 leading-relaxed">
              لم يتم تأكيد عملية الدفع. يمكنك المحاولة مرة أخرى أو التحقق من بيانات الدفع.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() =>
                  navigate(isStoreBundle ? "/lp/store-complete-bundle" : "/checkout/messaging")
                }
                className="px-8 py-3 rounded-full bg-teal-600 text-white font-bold text-sm hover:bg-teal-500 transition-colors"
              >
                إعادة محاولة الدفع
              </button>
              <button
                onClick={() => navigate(isStoreBundle ? "/lp/store-complete-bundle" : "/marketplace/bundles")}
                className="px-8 py-2 rounded-full bg-white/10 text-white font-semibold text-sm hover:bg-white/20 transition-colors border border-white/20"
              >
                الرجوع للباقة
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-5">
              <svg className="w-9 h-9 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-3">جارٍ متابعة عملية الدفع</h1>
            <p className="text-sm opacity-80 mb-6 leading-relaxed">
              سنقوم بتأكيد العملية تلقائياً خلال لحظات.{billingId ? " برجاء الاحتفاظ برقم العملية للرجوع إليها عند الحاجة." : ""}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  window.location.href = isStoreBundle ? "/store" : "/unified-inbox";
                }}
                className="px-8 py-3 rounded-full bg-teal-600 text-white font-bold text-sm hover:bg-teal-500 transition-colors"
              >
                {isStoreBundle ? "متابعة للمتجر" : "متابعة لصندوق الوارد"}
              </button>
              <button
                onClick={() => navigate("/marketplace/bundles")}
                className="px-8 py-2 rounded-full bg-white/10 text-white font-semibold text-sm hover:bg-white/20 transition-colors border border-white/20"
              >
                تصفح الباقات
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SubscriptionSuccess;
