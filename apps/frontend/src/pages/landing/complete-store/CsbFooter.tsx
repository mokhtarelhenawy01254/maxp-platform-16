import React from "react";
import { Link } from "react-router-dom";
import { WHATSAPP_CONSULT_URL, csbFmt } from "./csbData";

interface Props {
  onTrial: () => void;
  onSubscribe: () => void;
  /** توفير السنة المحسوب من حاسبة المستخدم — null لو لسه ما دخلش رقم */
  annualSaving: number | null;
}

export const CsbFooter: React.FC<Props> = ({ onTrial, onSubscribe, annualSaving }) => {
  const headline =
    annualSaving && annualSaving > 0
      ? `${csbFmt(annualSaving)} ج.م اللي هتدفعها زيادة في سنة لو فضلت على اشتراكاتك المتفرقة`
      : "كل شهر تشتغل بأنظمة مفروقة = وقت ضايع وأوردرات بتقع بين الثنوب";

  const sub =
    annualSaving && annualSaving > 0
      ? "الرقم ده محسوب من اللي دخّلته في الحاسبة فوق — والتجربة 7 أيام بتفضح كل حاجة قبل ما تدفع."
      : "اكتب إنفاقك الشهري الحالي في الحاسبة فوق وشوف الفرق على سنة بأرقامك انت — مش بأرقامنا.";

  return (
    <>
      <section className="csb-section" style={{ paddingTop: 8 }}>
        <div className="csb-final csb-reveal">
          <div style={{ minWidth: 0 }}>
            <h2>{headline}</h2>
            <p>{sub}</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" className="csb-btn" onClick={onTrial}>
              ابدأ التجربة المجانية
            </button>
            <button
              type="button"
              onClick={onSubscribe}
              className="csb-btn"
              style={{ background: "transparent", color: "#f2f7f2", border: "1px solid rgba(242,247,242,0.5)" }}
            >
              اشترك الآن
            </button>
          </div>
        </div>
      </section>

      <footer className="csb-footer">
        <div className="csb-footer-inner">
          <span>
            MaxP — منظومة التجارة المتكاملة · باقة المتجر الكاملة (17 أداة)
          </span>
          <div className="csb-footer-links">
            <Link to="/">الرئيسية</Link>
            <Link to="/marketplace">سوق التطبيقات</Link>
            <a href={WHATSAPP_CONSULT_URL} target="_blank" rel="noopener noreferrer">
              واتساب المبيعات
            </a>
          </div>
        </div>
      </footer>
    </>
  );
};
