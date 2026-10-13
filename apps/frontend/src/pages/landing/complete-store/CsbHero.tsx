import React from "react";
import { Check, MessageCircle, ArrowLeft } from "lucide-react";
import { TRIAL_DAYS, MONTHLY_SAVING, WHATSAPP_CONSULT_URL, csbFmt } from "./csbData";
import { CsbInvoice } from "./CsbInvoice";

interface Props {
  onPrimary: () => void;
}

export const CsbHero: React.FC<Props> = ({ onPrimary }) => {
  return (
    <header className="csb-hero">
      <div className="csb-hero-copy">
        <span className="csb-kicker">
          <i aria-hidden="true" />
          باقة المتجر الكاملة — 17 أداة في اشتراك واحد
        </span>

        <h1>
          اشتراك واحد بـ<span className="csb-h1-green">999 ج.م</span>{" "}
          بدل <span className="csb-h1-strike">17 اشتراك بـ2,936 ج.م</span>
        </h1>

        <p className="csb-hero-sub">
          المتجر ومسار الطلبات وواتساب الأوردرات والشحن الذكي والمخزون والمرتجعات
          وتحليلات الأرباح وإسناد الحملات — كل اللي بيدوّر عليه صاحب المتجر الأونلاين،
          في نظام واحد. الفاتورة جنبك شمال، افتح أي بند وشوف هو بيعمل إيه فعلًا.
        </p>

        <div className="csb-hero-ctas">
          <button type="button" className="csb-btn csb-btn-primary" onClick={onPrimary}>
            ابدأ {TRIAL_DAYS} أيام مجانًا
            <ArrowLeft size={16} strokeWidth={2.4} />
          </button>
          <a
            href={WHATSAPP_CONSULT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="csb-btn csb-btn-ghost"
          >
            <MessageCircle size={16} strokeWidth={2.2} />
            اسأل قبل ما تشترك
          </a>
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
            <Check size={13} strokeWidth={3} />
            توفير موثق {csbFmt(MONTHLY_SAVING)} ج.م شهريًا
          </span>
        </div>
      </div>

      <CsbInvoice />
    </header>
  );
};
