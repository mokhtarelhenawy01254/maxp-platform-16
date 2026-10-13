import React from "react";
import { Check, MessageCircle, ArrowLeft, CreditCard } from "lucide-react";
import { TRIAL_DAYS, PRICE_PER_DAY, WHATSAPP_CONSULT_URL, csbFmt, INDIVIDUAL_TOTAL } from "./csbData";
import { CsbInvoice } from "./CsbInvoice";

interface Props {
  onTrial: () => void;
  onSubscribe: () => void;
  isCheckingOut: boolean;
}

export const CsbHero: React.FC<Props> = ({ onTrial, onSubscribe, isCheckingOut }) => {
  return (
    <header className="csb-hero">
      <div className="csb-hero-copy">
        <span className="csb-kicker">
          <i aria-hidden="true" />
          باقة المتجر الكاملة — نظام واحد لأي متجر أونلاين
        </span>

        <h1>
          متجرك كله في نظام واحد — <span className="csb-h1-green">999 ج.م</span> في الشهر
        </h1>

        <p className="csb-hero-sub">
          من رسالة العميل لحد صافي الربح: المتجر والواتساب والشحن والمخزون والمرتجعات
          والتحليلات — بـ{PRICE_PER_DAY} ج.م في اليوم تقريبًا، بدل {csbFmt(INDIVIDUAL_TOTAL)} لو
          اشتريت الأدوات واحدة واحدة.
        </p>

        <div className="csb-hero-ctas">
          <button type="button" className="csb-btn csb-btn-primary" onClick={onTrial}>
            ابدأ {TRIAL_DAYS} أيام مجانًا
            <ArrowLeft size={16} strokeWidth={2.4} />
          </button>
          <button
            type="button"
            className="csb-btn csb-btn-ghost"
            onClick={onSubscribe}
            disabled={isCheckingOut}
          >
            <CreditCard size={15} strokeWidth={2.2} />
            {isCheckingOut ? "بنجهز الدفع…" : "اشترك الآن — 999 ج.م/شهر"}
          </button>
        </div>

        <div className="csb-hero-trust">
          <span>
            <Check size={13} strokeWidth={3} />
            التجربة من غير كارت بنكي
          </span>
          <span>
            <Check size={13} strokeWidth={3} />
            إلغاء في أي وقت
          </span>
          <span>
            <Check size={13} strokeWidth={3} />
            دفع آمن عبر Kashier
          </span>
          <span>
            <MessageCircle size={13} strokeWidth={2.4} />
            <a
              href={WHATSAPP_CONSULT_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: 3 }}
            >
              اسأل قبل ما تشترك
            </a>
          </span>
        </div>
      </div>

      <CsbInvoice onTrial={onTrial} onSubscribe={onSubscribe} />
    </header>
  );
};
