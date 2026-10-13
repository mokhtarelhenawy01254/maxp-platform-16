import React, { useMemo } from "react";
import { BUNDLE_PRICE, INDIVIDUAL_TOTAL, WHATSAPP_CONSULT_URL, csbFmt } from "./csbData";

const CHIPS = [1000, 1500, 2000, 2936];

interface Props {
  spend: number;
  onSpendChange: (v: number) => void;
}

/** حاسبة صادقة: العميل يدخل إنفاقه الشهري الحالي — والفرق بيتحسب قدامه على أساس سنة. */
export const CsbCalculator: React.FC<Props> = ({ spend, onSpendChange }) => {
  const setSpend = onSpendChange;

  const { monthly, annual, below } = useMemo(() => {
    const diff = Math.max(0, Math.round(spend) - BUNDLE_PRICE);
    return { monthly: diff, annual: diff * 12, below: Math.round(spend) <= BUNDLE_PRICE };
  }, [spend]);

  return (
    <section className="csb-section" id="calculator">
      <div className="csb-section-head csb-reveal">
        <span className="csb-sec-eyebrow">احسبها بنفسك</span>
        <h2>إنت بتدفع كام في الشهر على الأدوات دي؟</h2>
        <p>
          اكتب تقديرك للإنفاق الشهري الحالي على الاشتراكات المتفرقة (أو سيبها على إجمالي
          الكتالوج) — والفرق بيتحسب على أساس سنة كاملة.
        </p>
      </div>

      <div className="csb-calc csb-reveal">
        <div className="csb-calc-input">
          <label htmlFor="csb-spend">إنفاقك الشهري الحالي (ج.م)</label>
          <p className="csb-hint">
            اجمع اشتراكات المتجر والواتساب والشحن والتحليلات اللي بتدفعها لأدوات منفصلة.
          </p>
          <input
            id="csb-spend"
            type="number"
            inputMode="numeric"
            min={0}
            step={50}
            value={spend}
            onChange={(e) => setSpend(Math.max(0, Number(e.target.value) || 0))}
            dir="ltr"
            style={{ textAlign: "right" }}
          />
          <div className="csb-calc-chips" role="group" aria-label="قيم جاهزة">
            {CHIPS.map((c) => (
              <button
                key={c}
                type="button"
                className={spend === c ? "csb-chip csb-chip-on" : "csb-chip"}
                onClick={() => setSpend(c)}
              >
                {csbFmt(c)}
              </button>
            ))}
          </div>
        </div>

        <div className="csb-calc-out">
          {below ? (
            <>
              <div className="csb-calc-out-row">
                <span>الرقم بتاعك أقل من سعر الباقة</span>
                <strong style={{ fontSize: 18 }}>عادي — مش مجبوش عليك</strong>
              </div>
              <p className="csb-calc-note" style={{ fontSize: 13, color: "rgba(245,241,232,0.75)" }}>
                الباقة بتحسب لما تجمع الوقت الضايع والأوردرات اللي بتقع بين الأنظمة المفروقة.
                لو عايز رأي صريح في وضعك، كلمنا:
              </p>
              <a
                href={WHATSAPP_CONSULT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="csb-btn csb-btn-sm"
                style={{ background: "#fbfdfb", color: "var(--csb-green)", alignSelf: "flex-start" }}
              >
                استشارة واتساب — من غير التزام
              </a>
            </>
          ) : (
            <>
              <div className="csb-calc-out-row csb-calc-save">
                <span>توفيرك الشهري مع الباقة</span>
                <strong>
                  {csbFmt(monthly)} <em>ج.م</em>
                </strong>
              </div>
              <div className="csb-calc-out-row">
                <span>توفيرك في سنة كاملة</span>
                <strong>
                  {csbFmt(annual)} <em>ج.م</em>
                </strong>
              </div>
              <p className="csb-calc-note">
                الحساب: ({csbFmt(Math.round(spend))} − {csbFmt(BUNDLE_PRICE)}) × 12 — الفلوس دي
                بتفضل في جيبك مش في اشتراكات متفرقة.
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
};
