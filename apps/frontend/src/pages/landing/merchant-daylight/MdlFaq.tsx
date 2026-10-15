import React from "react";
import { MDL_QUESTIONS } from "./merchantDaylightData";

export const MdlFaq: React.FC = () => {
  return (
    <section id="mdl-faq" className="mdl-section">
      <div className="mdl-shell grid gap-8 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-4">
          <p className="mdl-eyebrow">قبل القرار</p>
          <h2 className="mdl-h2 mt-2">الأسئلة اللي بتتسأل فعلًا.</h2>
          <p className="mdl-body mt-3">
            لو سؤالك مش هنا، ابعته على واتساب وهنجاوبك بالأرقام — من غير عرض ولا ضغط.
          </p>
        </div>

        <div className="min-w-0 lg:col-span-8">
          <div className="mdl-surface px-5">
            {MDL_QUESTIONS.map((item) => (
              <details key={item.q} className="mdl-faq border-b border-[#E6E8EC] last:border-b-0">
                <summary>{item.q}</summary>
                <p className="mdl-body pb-4">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default MdlFaq;
