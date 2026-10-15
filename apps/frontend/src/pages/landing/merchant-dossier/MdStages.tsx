import React from "react";
import { MD_STAGES, type MdStage } from "./merchantDossierData";

const TONES: Record<MdStage["tone"], { bg: string; ink: string }> = {
  accent: { bg: "#f6e016", ink: "#0d2a1c" },
  surface: { bg: "#ebebeb", ink: "#0d2a1c" },
  field2: { bg: "#d9d9d2", ink: "#0d2a1c" },
  ink: { bg: "#0d2a1c", ink: "#f7f7f7" },
};

const Segment: React.FC<{ stage: MdStage; grown: boolean }> = ({ stage, grown }) => {
  const tone = TONES[stage.tone];
  return (
    <div
      className="md-rise relative flex flex-col justify-start p-4 sm:p-5"
      style={{
        background: tone.bg,
        color: tone.ink,
        ...(grown ? { flexGrow: stage.weight, flexBasis: 0 } : {}),
      }}
    >
      <p className="md-small font-semibold">{stage.name}</p>
      <p className="md-num md-lead mt-1 font-semibold">
        {stage.duration}
      </p>
      <p className="md-small mt-3 max-w-[22ch]">{stage.clause}</p>
    </div>
  );
};

/** الرحلة: شريط التقدّم نفسه مكبَّر ، عرض كل مرحلة على قد طولها الحقيقي. */
export const MdStages: React.FC = () => (
  <section id="md-stages" className="md md-section" dir="rtl">
    <div className="md-shell">
      <h2 className="md-head md-rise max-w-[18ch]">من الرسالة للكاش</h2>

      <div
        className="md-rise mt-12 hidden h-[22vh] min-h-[170px] gap-1.5 md:flex"
        data-ui="order-lifecycle"
        aria-label="مراحل دورة الأوردر"
      >
        {MD_STAGES.map((stage) => (
          <Segment key={stage.id} stage={stage} grown />
        ))}
      </div>

      <div className="mt-10 flex flex-col gap-1.5 md:hidden" data-ui="order-lifecycle">
        {MD_STAGES.map((stage) => (
          <div key={stage.id} style={{ minHeight: 96 }}>
            <Segment stage={stage} grown={false} />
          </div>
        ))}
      </div>

      <p className="md-body mt-8 max-w-[52ch]">
        الأوردر مايتحركش لخطوة تانية غير لما الخطوة اللي قبلها تخلص ، عشان كده التأكيد أول حاجة،
        والتحصيل آخر حاجة.
      </p>
    </div>
  </section>
);

export default MdStages;
