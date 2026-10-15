import React, { useState } from "react";
import { CSB_JOURNEY } from "./merchantDaylightData";

export const MdlJourney: React.FC = () => {
  const [activeId, setActiveId] = useState(CSB_JOURNEY[0].id);
  const active = CSB_JOURNEY.find((step) => step.id === activeId) || CSB_JOURNEY[0];

  return (
    <section id="mdl-journey" className="mdl-section">
      <div className="mdl-shell">
        <p className="mdl-eyebrow">دورة الأوردر كاملة</p>
        <h2 className="mdl-h2 mt-2 max-w-[36ch]">
          من الرسالة لحد ما الفلوس توصل — كل خطوة على نفس البيانات.
        </h2>

        <div className="mdl-surface mt-8">
          <div className="mdl-rail px-1" role="tablist" aria-label="خطوات دورة الأوردر">
            {CSB_JOURNEY.map((step, index) => (
              <button
                key={step.id}
                type="button"
                role="tab"
                aria-selected={step.id === activeId}
                aria-controls="mdl-journey-panel"
                onClick={() => setActiveId(step.id)}
                className="mdl-rail-item"
              >
                <span className="mdl-num ms-1.5 text-[11.5px] text-[#9AA1AC]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {step.title}
              </button>
            ))}
          </div>

          <div id="mdl-journey-panel" role="tabpanel" className="p-5" aria-label={active.title}>
            <h3 className="mdl-h3">{active.title}</h3>
            <p className="mdl-lead mt-2 max-w-[62ch]">{active.caption}</p>
            <p className="mt-3 text-[12.5px] text-[#6B7280]">
              الأدوات الشغّالة في الخطوة: <span className="font-semibold text-[#39414D]">{active.tools}</span>
            </p>
          </div>
        </div>

        <ol className="mt-4 grid gap-2 text-[12.5px] text-[#6B7280] sm:grid-cols-3">
          <li>العميل بيكلّمك من مكانه: واتساب أو ماسنجر أو المتجر.</li>
          <li>التأكيد بيحصل قبل الشحن — مش بعده.</li>
          <li>القياس بيرجع على الأوردر والحملة، مش على إحساس.</li>
        </ol>
      </div>
    </section>
  );
};

export default MdlJourney;
