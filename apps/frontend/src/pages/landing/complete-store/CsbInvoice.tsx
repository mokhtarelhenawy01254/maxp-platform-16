import React, { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  CSB_LINES,
  BUNDLE_PRICE,
  INDIVIDUAL_TOTAL,
  MONTHLY_SAVING,
  DISCOUNT_PCT,
  csbFmt,
} from "./csbData";
import { useCountUp } from "./csbHooks";

/**
 * الفاتورة التفاعلية: 17 بند بأسعارهم المنفردة، الإجمالي متشطب، والمجموع الجديد 999.
 * كل بند بيتفتح يورّح ميزة الأداة الفعلية.
 */
export const CsbInvoice: React.FC<{
  ctaRef?: React.RefObject<HTMLDivElement | null>;
  onSubscribe?: () => void;
}> = ({ ctaRef, onSubscribe }) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const { ref: oldTotalRef, value: animatedOld } = useCountUp(INDIVIDUAL_TOTAL, 1100);

  // خط الشطب بيتحط ككلاس على جذر الصفحة بعد ما الفاتورة تظهر
  useEffect(() => {
    const rootEl = wrapRef.current?.closest(".csb-root");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const delay = reduced ? 0 : 1250;
    const t = window.setTimeout(() => rootEl?.classList.add("csb-struck"), delay);
    return () => {
      window.clearTimeout(t);
      rootEl?.classList.remove("csb-struck");
    };
  }, []);

  return (
    <div className="csb-receipt-wrap" ref={(el) => {
      wrapRef.current = el;
      if (ctaRef) ctaRef.current = el;
    }}>
      <div className="csb-receipt" data-testid="csb-invoice">
        <div className="csb-receipt-head">
          <strong>فاتورة اشتراكات المتجر</strong>
          <span>15 أداة مدفوعة + 2 إضافة شاملة ببلاش</span>
        </div>

        <div className="csb-receipt-rows">
          {CSB_LINES.map((line) => {
            const open = openId === line.id;
            return (
              <div className="csb-row" data-open={open} key={line.id}>
                <button
                  type="button"
                  className="csb-row-btn"
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : line.id)}
                >
                  <span className="csb-row-name">
                    {line.name}
                    {line.price === 0 && <em>شاملة</em>}
                  </span>
                  <span className="csb-row-price">
                    {line.price === 0 ? (
                      "—"
                    ) : (
                      <>
                        <b>{csbFmt(line.price)}</b> ج.م
                      </>
                    )}
                  </span>
                  <span className="csb-row-chev">
                    <ChevronDown size={14} strokeWidth={2.2} />
                  </span>
                </button>
                <div className="csb-row-detail">
                  <div>
                    <p>{line.feature}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="csb-receipt-totals">
          <div className="csb-total-line">
            <span>الإجمالي لو اشتريت كل حاجة منفردة</span>
            <span className="csb-total-old">
              <span ref={oldTotalRef}>{csbFmt(animatedOld)}</span> ج.م
            </span>
          </div>
          <div className="csb-total-line">
            <span>اشتراك الباقة الشهري — كل الأدوات</span>
            <span style={{ color: "var(--csb-green)", fontWeight: 700 }}>فعّال من أول يوم</span>
          </div>
          <div className="csb-total-final">
            <strong>
              {csbFmt(BUNDLE_PRICE)} <small>ج.م / شهر — كل حاجة</small>
            </strong>
            <span className="csb-save-badge">
              وفّرت {csbFmt(MONTHLY_SAVING)} ج.م ({DISCOUNT_PCT}%)
            </span>
          </div>
        </div>

        <p className="csb-receipt-foot">الأسعار من كتالوج سوق MaxP الرسمي — اضغط على أي بند تعرف بيعمل إيه</p>

        {onSubscribe && (
          <div className="csb-receipt-ctas">
            <button type="button" className="csb-btn csb-btn-primary csb-btn-sm" onClick={onSubscribe}>
              اشترك الآن — تفعيل فوري
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
