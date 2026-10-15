import React, { useState } from "react";
import { MD_QUESTIONS } from "./merchantDossierData";

const TONES = ["#ebebeb", "#d9d9d2", "#0d2a1c", "#ebebeb", "#d9d9d2", "#0d2a1c"];

/** الأسئلة: كروت متكومة في درج، كل كرت حامل لسانه بموضوعه، والمفتوح واحد بس. */
export const MdCards: React.FC = () => {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="md-faq" className="md md-section" dir="rtl">
      <div className="md-shell">
        <h2 className="md-head md-rise mb-10 max-w-[16ch] md:mb-14">أسئلة قبل البداية</h2>

        <div className="md-rise mx-auto max-w-[860px]">
          {MD_QUESTIONS.map((item, index) => {
            const open = index === openIndex;
            const tone = TONES[index % TONES.length];
            const dark = tone === "#0d2a1c";
            return (
              <div
                key={item.topic}
                className="md-rise md-tabbed relative"
                style={
                  {
                    "--tab-x": `${index * 46}px`,
                    "--tab-w": "132px",
                    "--tab-h": "30px",
                    marginTop: index === 0 ? 0 : -14,
                    minHeight: open ? undefined : 118,
                    overflow: open ? "visible" : "hidden",
                    background: tone,
                    color: dark ? "#f7f7f7" : "#0d2a1c",
                  } as React.CSSProperties
                }
              >
                <span
                  className="absolute top-0 flex h-[30px] items-center text-[15px] font-semibold"
                  style={{ insetInlineStart: `calc(${index * 46}px + 16px)`, width: "132px" }}
                >
                  {item.topic}
                </span>

                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={`md-faq-${index}`}
                  onClick={() => setOpenIndex(open ? -1 : index)}
                  className="flex w-full items-start justify-between gap-6 px-6 pb-6 pt-[42px] text-start md:px-8"
                  style={{ background: "none", border: 0, color: "inherit", font: "inherit", cursor: "pointer" }}
                >
                  <span className="md-lead max-w-[34ch] font-semibold">{item.q}</span>
                  <span className="md-small mt-1 flex-none font-semibold">{open ? "اقفل" : "افتح"}</span>
                </button>

                {open && (
                  <p id={`md-faq-${index}`} className="md-body max-w-[50ch] px-6 pb-8 md:px-8">
                    {item.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default MdCards;
