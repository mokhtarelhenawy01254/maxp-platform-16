import React from "react";
import { Link } from "react-router-dom";
import { WHATSAPP_CONSULT_URL, ANNUAL_SAVING, csbFmt } from "./csbData";

interface Props {
  onPrimary: () => void;
}

export const CsbFooter: React.FC<Props> = ({ onPrimary }) => {
  return (
    <>
      <section className="csb-section" style={{ paddingTop: 8 }}>
        <div className="csb-final csb-reveal">
          <div style={{ minWidth: 0 }}>
            <h2>
              {csbFmt(ANNUAL_SAVING)} ج.م الفرق لو كملت سنة على اشتراكات متفرقة
            </h2>
            <p>
              أو تبعتها في اشتراك واحد بيجمع متجرك كله. التجربة 7 أيام — والقرار بيرجعلك.
            </p>
          </div>
          <button type="button" className="csb-btn" onClick={onPrimary}>
            ابدأ التجربة المجانية
          </button>
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
