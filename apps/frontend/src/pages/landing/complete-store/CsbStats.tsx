import React from "react";
import { PLATFORM_STATS, PLATFORM_STATS_DATE } from "./csbData";

/** أرقام المنصة الحقيقية من الإنتاج — بتاريخ ظاهر، من غير أي اختراع. */
export const CsbStats: React.FC = () => {
  return (
    <section className="csb-stats-wrap" aria-label="أرقام المنصة">
      <div className="csb-section" style={{ paddingTop: 0, paddingBottom: 40 }}>
        <div className="csb-stats csb-reveal">
          {PLATFORM_STATS.map((s) => (
            <div className="csb-stat" key={s.label}>
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
        <p className="csb-stats-date">{PLATFORM_STATS_DATE}</p>
      </div>
    </section>
  );
};
