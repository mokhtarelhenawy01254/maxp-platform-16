import React, { useState } from "react";
import { Link } from "react-router-dom";
import { trackPlatformSiteLead } from "../../../utils/platformSiteMetaPixel";
import {
  KIT_QUESTIONS,
  KIT_SCREENS,
  KIT_TIERS,
  KIT_WHATSAPP,
  csbFmt,
  kitWhatsApp,
} from "../merchant-kit/kitData";

/** الأسعار: جدول كبير، والصف المختار بيتظلّل. */
export const AnnualPlans: React.FC<{ onPreloadRegister?: () => void }> = ({
  onPreloadRegister,
}) => {
  const [active, setActive] = useState("bundle");

  return (
    <section id="an-plans" className="an an-section">
      <div className="an-shell an-axis">
        <h2 className="an-head an-start">الأسعار في جدول واحد</h2>
        <p className="an-body an-note an-muted">
          ثلاث مستويات، والسعر بالجنيه المصري. مفيش مقدم ومفيش التزام سنوي.
        </p>

        <div className="an-note" style={{ overflowX: "auto" }}>
          <table className="an-table">
            <caption className="an-small an-muted" style={{ textAlign: "start", padding: "0 0 10px" }}>
              مستويات الاشتراك في MaxP
            </caption>
            <thead>
              <tr>
                <th>المستوى</th>
                <th>بيعمل إيه</th>
                <th>السعر</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {KIT_TIERS.map((tier) => (
                <tr key={tier.id} data-active={tier.id === active}>
                  <td className="font-bold">{tier.name}</td>
                  <td className="an-muted">{tier.line}</td>
                  <td className="an-price">
                    <span className="an-num">{tier.price}</span> {tier.unit}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => setActive(tier.id)}
                      className="an-small font-bold"
                      style={{
                        background: "transparent",
                        border: 0,
                        cursor: "pointer",
                        color: "var(--an-accent)",
                      }}
                    >
                      اختار
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="an-note flex flex-wrap items-center gap-4 pt-2">
          <Link
            to="/register"
            onMouseEnter={onPreloadRegister}
            onFocus={onPreloadRegister}
            onClick={() =>
              trackPlatformSiteLead("annual_plan", {
                tier: active,
                landing_variant: "merchant-annual",
              })
            }
            className="an-action"
          >
            ابدأ بـ0 ج.م ، والباقة {csbFmt(999)} ج.م لما تحتاجها
          </Link>
          <a
            href={kitWhatsApp("مرحباً، عايز أعرف أنهي مستوى يناسب شغلي")}
            target="_blank"
            rel="noopener noreferrer"
            className="an-small font-bold"
          >
            أو كلّمنا على واتساب
          </a>
        </div>
      </div>
    </section>
  );
};

/** الأسئلة: شريط لكل سؤال. */
export const AnnualFaq: React.FC = () => (
  <section className="an an-section">
    <div className="an-shell an-axis">
      <h2 className="an-head an-start">أسئلة القرّاء</h2>
      <div className="an-faq an-note">
        {KIT_QUESTIONS.map((item) => (
          <details key={item.q}>
            <summary>{item.q}</summary>
            <p className="an-body an-muted">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  </section>
);

/** الختام: ثلاث صور، وبعدها أرض كوبالت. */
export const AnnualClose: React.FC<{ onPreloadRegister?: () => void }> = ({
  onPreloadRegister,
}) => (
  <>
    <section className="an an-section">
      <div className="an-shell an-axis">
        <h2 className="an-head an-start">قبل ما تقرر</h2>
        <div className="an-note grid gap-3 md:grid-cols-3">
          {[KIT_SCREENS.orders, KIT_SCREENS.rows, KIT_SCREENS.ordersMobile].map((src, index) => (
            <figure key={src} style={{ margin: 0, background: "var(--an-surface)", overflow: "hidden" }}>
              <img
                src={src}
                alt={index === 2 ? "شاشة الطلبات على الموبايل" : "شاشة من المنصة"}
                loading="lazy"
                style={{ width: "100%", height: 210, objectFit: "cover" }}
              />
            </figure>
          ))}
        </div>
      </div>
    </section>

    <section className="an" style={{ background: "var(--an-accent)", color: "var(--an-accent-ink)" }}>
      <div className="an-shell an-axis" style={{ paddingBlock: "96px" }}>
        <h2 className="an-display an-start" style={{ color: "var(--an-accent-ink)" }}>
          ابدأ بملف فاضي
        </h2>
        <p className="an-lead an-note" style={{ maxWidth: "52ch" }}>
          تفتح المتجر بـ0 ج.م، وتشوف الأوردرات بتمشي إزاي. والباقة لما تحتاج الـ17 أداة كلهم.
        </p>
        <div className="an-note flex flex-wrap gap-4">
          <Link
            to="/register"
            onMouseEnter={onPreloadRegister}
            onFocus={onPreloadRegister}
            onClick={() =>
              trackPlatformSiteLead("annual_close", { landing_variant: "merchant-annual" })
            }
            className="an-action"
            style={{ background: "var(--an-accent-ink)", color: "var(--an-accent)" }}
          >
            افتح المتجر ، 0 ج.م
          </Link>
          <a
            href={kitWhatsApp("مرحباً، عايز أبدأ على MaxP")}
            target="_blank"
            rel="noopener noreferrer"
            className="an-small font-bold"
            style={{ alignSelf: "center", color: "var(--an-accent-ink)" }}
          >
            واتساب مباشر
          </a>
        </div>
      </div>
    </section>

    <footer className="an" style={{ paddingBlock: "48px" }}>
      <div className="an-shell grid gap-8 md:grid-cols-4">
        <div>
          <p className="an-body font-bold">MaxP</p>
          <p className="an-small an-muted" style={{ marginTop: 8 }}>
            نظام تشغيل واحد للمحل والأونلاين.
          </p>
        </div>
        <div>
          <p className="an-small font-bold">المنتج</p>
          <ul className="an-small an-muted" style={{ marginTop: 8, display: "grid", gap: 6 }}>
            <li>المتجر</li>
            <li>الأوردرات والشحن</li>
            <li>المخزون</li>
            <li>التقارير</li>
          </ul>
        </div>
        <div>
          <p className="an-small font-bold">القطاعات</p>
          <ul className="an-small an-muted" style={{ marginTop: 8, display: "grid", gap: 6 }}>
            <li>متاجر أونلاين</li>
            <li>مطاعم وكافيهات</li>
            <li>عيادات ومعامل</li>
            <li>شركات بموظفين</li>
          </ul>
        </div>
        <div>
          <p className="an-small font-bold">كلّمنا</p>
          <ul className="an-small an-muted" style={{ marginTop: 8, display: "grid", gap: 6 }}>
            <li className="an-num">+{KIT_WHATSAPP}</li>
            <li className="an-num">support@maxp.online</li>
          </ul>
        </div>
      </div>
      <div className="an-shell an-small an-muted" style={{ marginTop: 32 }}>
        © {new Date().getFullYear()} MaxP · الشاشات في الصفحة من المنصة نفسها ببيانات تجريبية.
      </div>
    </footer>
  </>
);
