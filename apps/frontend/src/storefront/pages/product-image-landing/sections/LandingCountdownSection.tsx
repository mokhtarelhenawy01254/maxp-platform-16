import React from "react";
import LiveCountdownClock from "../components/LiveCountdownClock";

export interface LandingCountdownSectionProps {
  section: any;
  idx: number;
  countdownSection?: any;
}

export const LandingCountdownSection: React.FC<LandingCountdownSectionProps> = ({
  section,
  idx,
  countdownSection,
}) => {
  const content = section.content || {};
  const text =
    content.text ||
    content.bannerText ||
    countdownSection?.content?.text ||
    "عرض خاص لفترة محدودة — اطلب الآن قبل انتهاء الكمية المخصصة لهذا العرض";
  const lowStock =
    content.lowStockCount || countdownSection?.content?.lowStockCount || 7;

  return (
    <section
      key={section.id || idx}
      className="pil-countdown-card"
      aria-label="العد التنازلي للعرض المتبقي"
    >
      <div className="pil-countdown-inner">
        <div className="pil-countdown-header">
          <span className="pil-countdown-badge">
            <span className="pil-live-dot" />
            متبقي {lowStock} قطع فقط بهذا السعر
          </span>
          <p className="pil-countdown-title">{text}</p>
        </div>
        <LiveCountdownClock />
      </div>
    </section>
  );
};

export default LandingCountdownSection;
