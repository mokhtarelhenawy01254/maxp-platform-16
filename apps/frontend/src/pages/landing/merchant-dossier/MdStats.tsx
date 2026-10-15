import React from "react";
import { MD_FACTS } from "./merchantDossierData";

const TILE_STYLE: Record<string, { tone: string; ink: string; top: string; height: string }> = {
  stores: { tone: "#f6e016", ink: "#0d2a1c", top: "0", height: "70vh" },
  orders: { tone: "#0d2a1c", ink: "#f7f7f7", top: "14vh", height: "44vh" },
  tools: { tone: "#d9d9d2", ink: "#0d2a1c", top: "26vh", height: "34vh" },
};

const TAB_CLIP = {
  "--tab-h": "26px",
  "--tab-w": "88px",
} as React.CSSProperties;

/** الأرقام: ثلاث بلاطات متفاوتة الارتفاع، كل واحدة مقصوصة بشكل اللسان. */
export const MdStats: React.FC = () => (
  <section id="md-facts" className="md md-section md-tone-surface" dir="rtl">
    <div className="md-shell">
      <h2 className="md-head md-rise mb-10 max-w-[24ch] md:mb-14">أرقام إنتاج المنصة</h2>

      {/* شاشات متوسطة وأكبر: ثلاث بلاطات متدرجة */}
      <div className="hidden gap-2 md:grid md:grid-cols-12">
        {MD_FACTS.map((fact, index) => {
          const config = TILE_STYLE[fact.id];
          const span = index === 0 ? "col-span-6" : index === 1 ? "col-span-3" : "col-span-3";
          return (
            <div
              key={fact.id}
              className={`md-tabbed md-rise relative p-7 ${span} ${index > 0 ? "self-start" : ""}`}
              style={
                {
                  ...TAB_CLIP,
                  "--tab-x": index === 0 ? "0px" : "22%",
                  marginTop: config.top,
                  height: config.height,
                  minHeight: 220,
                  background: config.tone,
                  color: config.ink,
                } as React.CSSProperties
              }
            >
              <p className="md-num md-display">
                {fact.value}
              </p>
              <p className="md-lead absolute bottom-7 max-w-[22ch]" style={{ insetInlineStart: 28 }}>
                {fact.caption}
              </p>
            </div>
          );
        })}
      </div>

      {/* الهاتف: كل رقم وجنبه وصفه في سطر واحد — مفيش لافتة صغيرة فوق رقم */}
      <div className="md:hidden flex flex-col gap-3">
        {MD_FACTS.map((fact, index) => (
          <div
            key={fact.id}
            className="md-tabbed flex flex-col justify-center gap-2 p-5"
            style={
              {
                ...TAB_CLIP,
                "--tab-x": `${index * 12}%`,
                minHeight: 104,
                background: [TILE_STYLE.stores.tone, TILE_STYLE.orders.tone, TILE_STYLE.tools.tone][index],
                color: [TILE_STYLE.stores.ink, TILE_STYLE.orders.ink, TILE_STYLE.tools.ink][index],
              } as React.CSSProperties
            }
          >
            <p className="md-display flex flex-col gap-1">
              <span className="md-num">{fact.value}</span>
              <span style={{ fontSize: "var(--step-body)", fontWeight: 400 }}>{fact.caption}</span>
            </p>
          </div>
        ))}
      </div>

      <p className="md-small md-muted mt-6">
        الأرقام دي من إنتاج المنصة نفسها (آخر تحديث 13 أكتوبر 2026) ، مش تقديرات تسويق.
      </p>
    </div>
  </section>
);

export default MdStats;
