import React from "react";
import { Check, CheckCircle2 } from "lucide-react";
import { ProposalTimelinePhase } from "../types";
import { Band, SectionTitle, Lead, Marker, stripParens } from "./ProposalUi";

interface ProposalTimelineSectionProps {
  timeline: ProposalTimelinePhase[];
}

export const ProposalTimelineSection: React.FC<ProposalTimelineSectionProps> = ({ timeline }) => {
  if (!timeline || timeline.length === 0) return null;

  return (
    <Band tone="black" id="timeline">
      <div className="space-y-4 max-w-3xl pb-10 border-b border-white/10">
        <Marker>خريطة الإطلاق والتنفيذ</Marker>
        <SectionTitle>
          ١٤ يوماً من توقيع العقد وحتى استقبال أول طالب
        </SectionTitle>
        <Lead>
          جدول زمني محكم ومحدد الأيام، مع تسليمات واضحة في كل مرحلة لضمان الإطلاق السريع دون تعطيل لعمليات فرع فؤاد الحالية.
        </Lead>
      </div>

      {/* 4 Sequential Phases — Connected Single Surface */}
      <div className="py-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {timeline.map((step, idx) => (
          <div key={idx} className="space-y-4 relative">
            {/* Phase Header */}
            <div className="space-y-2 border-b border-white/10 pb-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#FFD368] uppercase tracking-wider">
                  المرحلة 0{idx + 1}
                </span>
                <span className="font-mono text-xs text-white/50 bg-white/5 px-2 py-0.5 rounded border border-white/10 tabular-nums">
                  {step.days}
                </span>
              </div>
              <h3 className="text-base font-black text-white leading-snug">
                {stripParens(step.phase)}
              </h3>
            </div>

            {/* Task Checklist */}
            <ul className="space-y-2.5 text-xs text-white/70">
              {step.tasks.map((task, tIdx) => (
                <li key={tIdx} className="flex items-start gap-2 leading-relaxed">
                  <span className="p-0.5 rounded-full bg-[#FFD368]/20 text-[#FFD368] mt-0.5 shrink-0">
                    <Check className="size-2.5" strokeWidth={3} />
                  </span>
                  <span>{task}</span>
                </li>
              ))}
            </ul>

            {/* Handover Statement */}
            {step.handover && (
              <div className="pt-2 text-[11px] text-white/50 font-medium border-t border-white/5">
                <span className="text-[#FFD368] font-bold">التسليم:</span> {step.handover}
              </div>
            )}
          </div>
        ))}
      </div>
    </Band>
  );
};
