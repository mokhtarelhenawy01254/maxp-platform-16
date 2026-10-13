import React from "react";
import { ShieldCheck, XCircle, CreditCard, LifeBuoy } from "lucide-react";
import { CSB_COMPARE } from "./csbData";

export const CsbCompare: React.FC = () => {
  return (
    <section className="csb-section" id="compare">
      <div className="csb-section-head csb-reveal">
        <span className="csb-sec-eyebrow">قبل وبعد</span>
        <h2>الفرق مش في الأدوات — في إن كل حاجة بقت في مكان واحد</h2>
      </div>

      <div className="csb-compare csb-reveal">
        <div className="csb-compare-row csb-compare-head">
          <div className="csb-compare-before">الوضع الحالي</div>
          <div>مع باقة المتجر الكاملة</div>
        </div>
        {CSB_COMPARE.map((row) => (
          <div className="csb-compare-row" key={row.before}>
            <div className="csb-compare-before">{row.before}</div>
            <div className="csb-compare-after">{row.after}</div>
          </div>
        ))}
      </div>

      <div className="csb-risk csb-reveal" style={{ marginTop: 14 }}>
        <div className="csb-risk-item">
          <ShieldCheck size={18} strokeWidth={2} aria-hidden="true" />
          <strong>تجربة 7 أيام كاملة</strong>
          <span>كل الـ17 أداة شغالة من أول دقيقة — من غير كارت بنكي.</span>
        </div>
        <div className="csb-risk-item">
          <XCircle size={18} strokeWidth={2} aria-hidden="true" />
          <strong>إلغاء في أي وقت</strong>
          <span>من لوحة الاشتراكات، من غير مكالمات ولا إقناع.</span>
        </div>
        <div className="csb-risk-item">
          <CreditCard size={18} strokeWidth={2} aria-hidden="true" />
          <strong>دفع آمن عبر Kashier</strong>
          <span>بطاقة أو محفظة — والبيانات بتاعتك مع بوابة دفع مرخصة.</span>
        </div>
        <div className="csb-risk-item">
          <LifeBuoy size={18} strokeWidth={2} aria-hidden="true" />
          <strong>دعم مصري على واتساب</strong>
          <span>فريق بيفهم التجارة الإلكترونية المصرية، مش ردود آلية.</span>
        </div>
      </div>
    </section>
  );
};
