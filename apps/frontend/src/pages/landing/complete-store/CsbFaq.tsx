import React, { useState } from "react";
import { Plus } from "lucide-react";
import { CSB_FAQ } from "./csbData";

export const CsbFaq: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section className="csb-section" id="faq">
      <div className="csb-section-head csb-reveal" style={{ marginInline: "auto" }}>
        <span className="csb-sec-eyebrow">أسئلة بتتسأل فعلًا</span>
        <h2>إجابات صريحة قبل ما تدفع جنيه</h2>
      </div>

      <div className="csb-faq csb-reveal">
        {CSB_FAQ.map((item, i) => {
          const open = openIdx === i;
          return (
            <div className="csb-faq-item" data-open={open} key={item.q}>
              <button
                type="button"
                className="csb-faq-q"
                aria-expanded={open}
                onClick={() => setOpenIdx(open ? null : i)}
              >
                {item.q}
                <Plus size={16} strokeWidth={2.2} aria-hidden="true" />
              </button>
              <div className="csb-faq-a">
                <div>
                  <p>{item.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
