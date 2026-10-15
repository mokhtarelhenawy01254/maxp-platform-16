import React from "react";
import { MDL_COMPARE } from "./merchantDaylightData";

export const MdlBeforeAfter: React.FC = () => {
  return (
    <section className="mdl-section">
      <div className="mdl-shell">
        <p className="mdl-eyebrow">قبل وبعد</p>
        <h2 className="mdl-h2 mt-2 max-w-[34ch]">نفس الشغل اليومي — بس من غير اللف والدوران.</h2>

        <div className="mdl-surface mt-8">
          <div className="mdl-row-divide">
            {MDL_COMPARE.map((row) => (
              <div
                key={row.before}
                className="grid gap-2 p-4 sm:grid-cols-2 sm:gap-6 sm:items-start sm:p-5"
              >
                <p className="flex min-w-0 items-start gap-2 text-[13.5px] text-[#6B7280]">
                  <span className="mt-0.5 flex-none rounded bg-[#F1F3F6] px-1.5 py-0.5 text-[11px] font-semibold text-[#6B7280]">
                    قبل
                  </span>
                  <span className="min-w-0">{row.before}</span>
                </p>
                <p className="flex min-w-0 items-start gap-2 text-[13.5px] font-semibold text-[#0E1116]">
                  <span className="mt-0.5 flex-none rounded bg-[#ECF7F2] px-1.5 py-0.5 text-[11px] font-semibold text-[#0B7A52]">
                    بعد
                  </span>
                  <span className="min-w-0">{row.after}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default MdlBeforeAfter;
