import React, { useEffect, useMemo, useRef, useState } from "react";

interface Lane {
  id: string;
  label: string;
  badge: string;
  caption: string;
}

const LANES: Lane[] = [
  { id: "inbox", label: "الرسائل", badge: "38", caption: "ماسنجر وواتساب في صندوق واحد" },
  { id: "confirm", label: "التأكيد", badge: "24", caption: "تأكيد العنوان قبل التجهيز" },
  { id: "ship", label: "الشحن", badge: "21", caption: "بوليصة وتتبع مع شركة الشحن" },
  { id: "cash", label: "التحصيل", badge: "18,400", caption: "COD متحصّل ومنسوب لكل أوردر" },
];

const AUTO_ADVANCE_MS = 5200;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * لوحة تشغيل توضيحية بشكل شاشات المنصة — سطح واحد متصل، بدون صناديق داخل صناديق.
 * الأرقام هنا مثال تشغيلي (معلَّم عليها في الواجهة)، مش إحصائية منشورة.
 */
export const MdlOrderSurface: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [locked, setLocked] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (locked || prefersReducedMotion()) return;
    timer.current = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % LANES.length);
    }, AUTO_ADVANCE_MS);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [locked]);

  const active = LANES[activeIndex];
  const vignette = useMemo(() => {
    switch (active.id) {
      case "confirm":
        return (
          <div className="flex flex-col gap-2.5 p-4">
            <span className="mdl-bubble mdl-bubble--out">
              أهلاً يا فندم — أوردرك مؤكد: كوتشي أسود مقاس 43 · مدينة نصر · الدفع عند الاستلام
              <span className="mdl-num"> 850 </span>
              ج.م
            </span>
            <ul className="flex flex-wrap gap-1.5">
              <li className="mdl-chip">حالة الأوردر: مؤكد</li>
              <li className="mdl-chip">العنوان مُراجَع</li>
              <li className="mdl-chip">جاهز للتجهيز</li>
            </ul>
            <p className="mdl-body mdl-muted">
              الأوردر الوهمي بيتقفل هنا قبل ما ياخد مصاريف شحن.
            </p>
          </div>
        );
      case "ship":
        return (
          <div className="p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[13.5px] font-semibold">بوسطة · بوليصة صادرة</span>
              <span className="mdl-chip">
                <span className="mdl-code">BST-892401</span>
              </span>
            </div>
            <ol className="mt-3 flex flex-col gap-2">
              {["اتصدرت البوليصة", "استُلمت من المخزن", "خارج للتسليم"].map((step, index) => (
                <li key={step} className="flex items-center gap-2 text-[13px] text-[#39414D]">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: index < 2 ? "var(--mdl-money)" : "var(--mdl-line-strong)" }}
                    aria-hidden="true"
                  />
                  {step}
                </li>
              ))}
            </ol>
            <p className="mdl-body mdl-muted mt-3">
              التتبع بيتحدّث من شركة الشحن، ومصاريف الشحن بتتسجّل على الأوردر نفسه.
            </p>
          </div>
        );
      case "cash":
        return (
          <div className="p-4">
            <dl className="flex flex-col">
              {[
                { k: "مبيعات اليوم", v: "28,400", tone: "ink" },
                { k: "مصاريف شحن", v: "1,240", tone: "muted" },
                { k: "مصاريف إعلانات", v: "4,800", tone: "muted" },
                { k: "صافي بعد التكاليف", v: "9,120", tone: "money" },
              ].map((row) => (
                <div
                  key={row.k}
                  className="flex items-center justify-between border-b border-[#F1F3F6] py-2 last:border-b-0"
                >
                  <dt className="text-[13.5px] text-[#39414D]">{row.k}</dt>
                  <dd
                    className="mdl-num text-[15px] font-semibold"
                    style={{
                      color:
                        row.tone === "money"
                          ? "var(--mdl-money)"
                          : row.tone === "muted"
                            ? "var(--mdl-muted)"
                            : "var(--mdl-ink)",
                    }}
                  >
                    {row.v}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mdl-body mdl-muted mt-3">
              الربح بيتحسب من نفس بيانات الأوردر — مش من شيت إكسل آخر الشهر.
            </p>
          </div>
        );
      default:
        return (
          <div className="flex flex-col gap-2.5 p-4">
            <span className="mdl-bubble">مقاس 43 الأسود موجود؟ والشحن لمصر الجديدة بكام؟</span>
            <span className="mdl-bubble mdl-bubble--out">
              متاح يا فندم — الشحن <span className="mdl-num">45</span> ج.م والاستلام خلال
              <span className="mdl-num"> 24 </span>
              ساعة. أجهّز لحضرتك الأوردر؟
            </span>
            <p className="mdl-body mdl-muted">
              الرد الفوري بالأتمتة يشتغل وقت ما تكون مشغول — ونفس المحادثة بتتحوّل أوردر.
            </p>
          </div>
        );
    }
  }, [active.id]);

  return (
    <div className="mdl-surface" data-testid="mdl-order-surface">
      <div className="flex items-center justify-between gap-3 border-b border-[#E6E8EC] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#0B7A52]" aria-hidden="true" />
          <span className="text-[13.5px] font-semibold">لوحة اليوم</span>
        </div>
        <span className="text-[11.5px] text-[#6B7280]">عرض توضيحي من شاشات المنصة</span>
      </div>

      <div role="tablist" aria-label="مراحل دورة الأوردر" className="mdl-rail px-1">
        {LANES.map((lane, index) => (
          <button
            key={lane.id}
            type="button"
            role="tab"
            aria-selected={index === activeIndex}
            aria-controls="mdl-order-panel"
            onClick={() => {
              setLocked(true);
              setActiveIndex(index);
            }}
            className="mdl-rail-item"
          >
            {lane.label}
            <span className="mdl-num mr-1.5 hidden text-[11.5px] text-[#6B7280] sm:inline">
              {lane.badge}
            </span>
          </button>
        ))}
      </div>

      <div
        id="mdl-order-panel"
        role="tabpanel"
        aria-label={active.label}
        className="min-h-[210px] bg-[#FBFCFD]"
      >
        {vignette}
      </div>

      <p className="border-t border-[#E6E8EC] px-4 py-2.5 text-[12px] text-[#6B7280]">
        <span className="mdl-num sm:hidden">{active.badge}</span>
        <span className="sm:hidden"> · </span>
        {active.caption}
      </p>
    </div>
  );
};

export default MdlOrderSurface;
