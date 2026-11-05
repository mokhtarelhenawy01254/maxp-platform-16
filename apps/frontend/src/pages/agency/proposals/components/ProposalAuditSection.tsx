import React from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { ProposalAuditItem } from "../types";
import { Band, SectionTitle, Lead, Marker, stripParens } from "./ProposalUi";

interface ProposalAuditSectionProps {
  auditItems: ProposalAuditItem[];
}

export const ProposalAuditSection: React.FC<ProposalAuditSectionProps> = ({ auditItems }) => {
  if (!auditItems || auditItems.length === 0) return null;

  return (
    <Band tone="graphite" id="audit">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-8 border-b border-white/10">
        <div className="space-y-3 max-w-3xl">
          <Marker>التشخيص التشغيلي وتحديد فجوات التسرب</Marker>
          <SectionTitle>
            أين تتسرب الميزانية الإعلانية وأولياء الأمور قبل حجز المقابلة؟
          </SectionTitle>
          <Lead>
            فحص تفصيلي للمنظومة الحالية في فرع فؤاد بالإسكندرية، كشف عن {auditItems.length} فجوات تتسبب في
            ضياع أولياء أمور بعد ما دفعوا تمن الإعلان اللي جابهم.
          </Lead>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono text-3xl font-black text-[#FFD368] tabular-nums">
            {auditItems.length}
          </div>
          <div className="text-xs text-white/50 font-medium">فجوات مرصودة ومحلولة في الخطة</div>
        </div>
      </div>

      {/* Editorial Diagnosis Ledger — Flat Single Surface, No Box-in-Box */}
      <div className="divide-y divide-white/10">
        {auditItems.map((item, index) => {
          const isHigh = item.severity === "HIGH";
          return (
            <div
              key={item.id || index}
              className="py-7 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start hover:bg-white/[0.02] transition-colors"
            >
              {/* Col 1: Index + Title + Severity (4 cols) */}
              <div className="lg:col-span-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#FFD368]/80 tabular-nums">
                    0{index + 1}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      isHigh
                        ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    }`}
                  >
                    {isHigh ? "أثر فوري حرج" : "أثر تشغيلي متوسط"}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white leading-snug">
                  {stripParens(item.title)}
                </h3>
              </div>

              {/* Col 2: The Gap & Root Cause (4 cols) */}
              <div className="lg:col-span-4 space-y-2">
                <div className="text-[11px] font-bold text-rose-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <AlertCircle className="size-3.5 shrink-0" />
                  <span>الملاحظة والأثر الميداني</span>
                </div>
                <p className="text-sm text-white/70 leading-relaxed font-normal">
                  {item.finding}
                </p>
                {item.impact && (
                  <div className="text-xs text-rose-300/80 font-medium pt-1">
                    <span className="text-rose-400 font-bold">الخسارة المقدرة:</span> {item.impact}
                  </div>
                )}
              </div>

              {/* Col 3: The Engineered MaxP Fix (4 cols) */}
              <div className="lg:col-span-4 space-y-2 border-r-2 border-[#FFD368]/40 pr-4">
                <div className="text-[11px] font-bold text-[#FFD368] flex items-center gap-1.5 uppercase tracking-wider">
                  <CheckCircle2 className="size-3.5 shrink-0" />
                  <span>الحل التنفيذي المباشر من H2M</span>
                </div>
                <p className="text-sm text-white/90 leading-relaxed font-normal">
                  {item.solution}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Band>
  );
};
