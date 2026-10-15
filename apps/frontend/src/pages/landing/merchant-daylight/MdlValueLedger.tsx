import React, { useState } from "react";
import {
  ANNUAL_SAVING,
  BUNDLE_PRICE,
  CSB_FAMILIES,
  CSB_LINES,
  DISCOUNT_PCT,
  INDIVIDUAL_TOTAL,
  MONTHLY_SAVING,
  PRICE_PER_DAY,
  csbFmt,
} from "./merchantDaylightData";

const money = (value: number) => (value === 0 ? "شاملة" : csbFmt(value));

export const MdlValueLedger: React.FC = () => {
  const [openFamily, setOpenFamily] = useState(CSB_FAMILIES[0].id);

  return (
    <section id="mdl-value" className="mdl-section">
      <div className="mdl-shell">
        <p className="mdl-eyebrow">دفتر القيمة</p>
        <h2 className="mdl-h2 mt-2 max-w-[38ch]">
          الأدوات الـ<span className="mdl-num">{CSB_LINES.length}</span> بأسعارها لو اشتركتها فرادى —
          وبعدين سعر الباقة.
        </h2>

        <div className="mt-8 grid gap-6 lg:grid-cols-12 lg:gap-8">
          <div className="min-w-0 lg:col-span-8">
            <div className="mdl-surface">
              {CSB_FAMILIES.map((family) => {
                const isOpen = openFamily === family.id;
                const lines = CSB_LINES.filter((line) => family.lineIds.includes(line.id));
                const familyTotal = lines.reduce((sum, line) => sum + line.price, 0);
                return (
                  <div key={family.id} className="border-b border-[#E6E8EC] last:border-b-0">
                    <button
                      type="button"
                      onClick={() => setOpenFamily(isOpen ? "" : family.id)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-right transition-colors hover:bg-[#FBFCFD]"
                    >
                      <span className="min-w-0">
                        <span className="block text-[14.5px] font-semibold">{family.name}</span>
                        <span className="mt-0.5 block truncate text-[12px] text-[#6B7280]">
                          {family.tagline}
                        </span>
                      </span>
                      <span className="flex flex-none items-center gap-3">
                        <span className="mdl-num text-[13.5px] font-semibold text-[#39414D]">
                          {csbFmt(familyTotal)}
                        </span>
                        <span className="text-[#9AA1AC]" aria-hidden="true">
                          {isOpen ? "–" : "+"}
                        </span>
                      </span>
                    </button>

                    {isOpen && (
                      <ul className="border-t border-[#F1F3F6] bg-[#FBFCFD]">
                        {lines.map((line) => (
                          <li
                            key={line.id}
                            className="flex items-start justify-between gap-4 border-b border-[#F1F3F6] px-4 py-2.5 last:border-b-0"
                          >
                            <span className="min-w-0">
                              <span className="block text-[13.5px] font-semibold">{line.name}</span>
                              <span className="block text-[12px] text-[#6B7280]">{line.feature}</span>
                            </span>
                            <span
                              className="mdl-num flex-none text-[13px] font-semibold"
                              style={{ color: line.price === 0 ? "var(--mdl-money)" : "var(--mdl-ink)" }}
                            >
                              {money(line.price)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="mt-3 text-[12px] text-[#6B7280]">
              الأسعار دي أسعار تطبيقات المنصة نفسها لو اشتركتها فرادى — مش تقديرات سوق، ولا أرقام
              من برّه.
            </p>
          </div>

          <div className="min-w-0 lg:col-span-4">
            <div className="mdl-surface lg:sticky lg:top-[78px]">
              <dl className="p-4">
                <div className="flex items-baseline justify-between gap-3 border-b border-[#F1F3F6] pb-3">
                  <dt className="text-[13px] text-[#6B7280]">المجموع فرادى</dt>
                  <dd className="mdl-num text-[17px] font-semibold text-[#6B7280] line-through">
                    {csbFmt(INDIVIDUAL_TOTAL)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 border-b border-[#F1F3F6] py-3">
                  <dt className="text-[13px] font-semibold">الباقة الكاملة</dt>
                  <dd>
                    <span className="mdl-num text-[30px] font-bold leading-none">
                      {csbFmt(BUNDLE_PRICE)}
                    </span>
                    <span className="text-[13px] text-[#6B7280]"> ج.م / شهر</span>
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 border-b border-[#F1F3F6] py-3">
                  <dt className="text-[13px] text-[#6B7280]">توفير شهري</dt>
                  <dd className="mdl-num text-[15px] font-semibold text-[#0B7A52]">
                    {csbFmt(MONTHLY_SAVING)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 border-b border-[#F1F3F6] py-3">
                  <dt className="text-[13px] text-[#6B7280]">توفير سنوي</dt>
                  <dd className="mdl-num text-[15px] font-semibold text-[#0B7A52]">
                    {csbFmt(ANNUAL_SAVING)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 pt-3">
                  <dt className="text-[13px] text-[#6B7280]">يعني في اليوم</dt>
                  <dd className="mdl-num text-[15px] font-semibold">
                    ≈ {csbFmt(PRICE_PER_DAY)} ج.م
                  </dd>
                </div>
              </dl>
              <p className="border-t border-[#E6E8EC] px-4 py-3 text-[12px] text-[#6B7280]">
                فرق <span className="mdl-num">{DISCOUNT_PCT}%</span> مقابل شراء نفس الأدوات واحدة
                واحدة.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MdlValueLedger;
