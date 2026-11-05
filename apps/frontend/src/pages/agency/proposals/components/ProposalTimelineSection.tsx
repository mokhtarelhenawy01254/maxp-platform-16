import React from "react";
import { Calendar, CheckCircle2 } from "lucide-react";
import { Badge } from "../../../../components/ui/badge";
import { ProposalTimelinePhase } from "../types";

interface ProposalTimelineSectionProps {
  timeline: ProposalTimelinePhase[];
}

export const ProposalTimelineSection: React.FC<ProposalTimelineSectionProps> = ({ timeline }) => {
  if (!timeline || timeline.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Calendar className="size-4" />
            </div>
            <h2 className="text-lg sm:text-xl font-black">الجدول الزمني وخريطة التنفيذ (14-Day Roadmap)</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            خطة العمل الميدانية من لحظة البدء حتى إطلاق أول حملات وحضور أولياء الأمور
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {timeline.map((step, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-border/70 bg-card p-5 space-y-3 relative overflow-hidden flex flex-col justify-between shadow-xs"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="font-bold text-xs tabular-nums">
                  {step.days}
                </Badge>
                <span className="text-xs font-bold text-muted-foreground">
                  خطوة {idx + 1}
                </span>
              </div>

              <h3 className="font-black text-sm text-foreground leading-snug">
                {step.phase}
              </h3>

              <ul className="space-y-2 text-xs text-muted-foreground">
                {step.tasks.map((task, tIdx) => (
                  <li key={tIdx} className="flex items-start gap-1.5 leading-relaxed">
                    <CheckCircle2 className="size-3.5 text-primary shrink-0 mt-0.5" />
                    <span>{task}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
