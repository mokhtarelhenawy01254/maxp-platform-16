import React from "react";
import { Link } from "react-router-dom";

interface Props {
  onTrial: () => void;
}

export const CsbNavbar: React.FC<Props> = ({ onTrial }) => {
  return (
    <nav className="csb-nav">
      <div className="csb-nav-inner">
        <Link to="/" className="csb-brand" aria-label="MaxP — الصفحة الرئيسية">
          <span className="csb-brand-mark" aria-hidden="true">
            M
          </span>
          <span>
            <strong>MaxP</strong>
            <small>منظومة التجارة المتكاملة</small>
          </span>
        </Link>

        <div className="csb-nav-links">
          <a href="#invoice">الفاتورة</a>
          <a href="#journey">رحلة الأوردر</a>
          <a href="#families">الأدوات</a>
          <a href="#calculator">احسب توفيرك</a>
          <a href="#faq">أسئلة شائعة</a>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link to="/auth/login" className="csb-btn csb-btn-ghost csb-btn-sm">
            دخول
          </Link>
          <button type="button" className="csb-btn csb-btn-primary csb-btn-sm" onClick={onTrial}>
            ابدأ مجانًا
          </button>
        </div>
      </div>
    </nav>
  );
};
