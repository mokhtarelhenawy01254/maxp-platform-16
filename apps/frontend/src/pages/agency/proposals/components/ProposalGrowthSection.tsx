import React from "react";
import { ProposalGrowthPhase, ProposalRetention } from "../types";
import { Band, SectionTitle, Lead, Marker } from "./ProposalUi";

interface ProposalGrowthSectionProps {
  phases?: ProposalGrowthPhase[];
  retention?: ProposalRetention;
}

/**
 * The engagement as a timeline of stages plus the renewal ladder:
 * what we do each quarter, and what makes it irrational to leave.
 */
export const ProposalGrowthSection: React.FC<ProposalGrowthSectionProps> = ({ phases, retention }) => {
  const hasPhases = phases && phases.length > 0;
  const hasRetention = retention && (retention.steps?.length || retention.terms?.length);
  if (!hasPhases && !hasRetention) return null;

  return (
    <Band tone="black" id="growth">
      <div className="space-y-4 max-w-3xl pb-8 border-b border-white/10">
        <Marker>خطة النمو والاستمرارية</Marker>
        <SectionTitle>الشغل مش حملة. أربع مراحل، وكل مرحلة بتسلّم رقم</SectionTitle>
        <Lead>
          كل مرحلة لها ناتج محدد نقدر نحاسب نفسنا عليه، ولها قرار بيتاخد في آخرها: نكمل بنفس الخطة، ولا نعيد توزيع
          الميزانية على اللي بيجيب نتيجة.
        </Lead>
      </div>

      {hasPhases && (
        <div className="pt-10 overflow-x-auto">
          <table className="w-full min-w-[860px] text-right align-top">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-white/45 border-b border-white/10">
                <th className="py-3 pr-2 font-bold">المرحلة</th>
                <th className="py-3 font-bold">التركيز</th>
                <th className="py-3 font-bold">اللي بنعمله</th>
                <th className="py-3 font-bold">الناتج</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {phases!.map((phase, idx) => (
                <tr key={idx} className="align-top">
                  <td className="py-5 pr-2 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lg font-black text-[#FFD368] tabular-nums leading-none">
                        0{idx + 1}
                      </span>
                      <div>
                        <div className="text-sm font-black text-white leading-snug">{phase.name}</div>
                        <div className="font-mono text-[11px] text-white/40">{phase.window}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-5 text-xs text-white/70 leading-relaxed max-w-[180px]">{phase.focus}</td>
                  <td className="py-5">
                    <ul className="space-y-1.5">
                      {phase.actions.map((action, aIdx) => (
                        <li key={aIdx} className="flex items-start gap-2 text-xs text-white/75 leading-relaxed">
                          <span aria-hidden="true" className="mt-1.5 size-1 shrink-0 bg-[#FFD368]" />
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="py-5 text-xs font-bold text-white/90 leading-relaxed max-w-[200px]">
                    {phase.outcome}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasRetention && (
        <div className="pt-12 mt-4 border-t border-white/10">
          <div className="flex flex-col lg:flex-row lg:items-start gap-10">
            <div className="lg:w-2/5 space-y-3">
              <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-[#FFD368]">
                الاستمرارية
              </div>
              <h3 className="text-2xl sm:text-3xl font-black leading-snug">{retention!.headline}</h3>
              <p className="text-sm text-white/55 leading-relaxed">
                مفيش عقد بيخلي العميل يكمل. اللي بيخليه يكمل إن كل شهر بيسلّم حاجة يقدر يشوفها، وكل ربع بيضيف قدرة
                جديدة — فسعر سحب الشغل بيزيد كل شهر من غير ما نمنعه من حاجة.
              </p>
            </div>

            <div className="lg:w-3/5 space-y-6">
              {retention!.steps && retention!.steps.length > 0 && (
                <ol className="divide-y divide-white/10">
                  {retention!.steps.map((step, idx) => (
                    <li key={idx} className="py-3 flex items-start gap-3">
                      <span className="font-mono text-[11px] text-white/35 tabular-nums pt-1">0{idx + 1}</span>
                      <div>
                        <div className="text-sm font-bold text-white/90">{step.title}</div>
                        <div className="text-xs text-white/60 leading-relaxed">{step.detail}</div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}

              {retention!.terms && retention!.terms.length > 0 && (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 pt-4 border-t border-white/10">
                  {retention!.terms.map((term, idx) => (
                    <li key={idx} className="text-[11px] text-white/50 leading-relaxed flex items-start gap-2">
                      <span aria-hidden="true" className="mt-1.5 size-1 shrink-0 bg-white/40" />
                      <span>{term}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </Band>
  );
};
