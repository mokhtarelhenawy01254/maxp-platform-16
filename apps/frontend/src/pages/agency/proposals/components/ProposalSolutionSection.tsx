import React from "react";
import { Check, Sparkles, Layers, ArrowLeft } from "lucide-react";
import { ProposalSolutionModule, ProposalWorkstream } from "../types";
import { Band, SectionTitle, Lead, Marker, stripParens } from "./ProposalUi";

interface ProposalSolutionSectionProps {
  workstreams?: ProposalWorkstream[];
  modules?: ProposalSolutionModule[];
}

export const ProposalSolutionSection: React.FC<ProposalSolutionSectionProps> = ({
  workstreams,
  modules = [],
}) => {
  // If workstreams are provided, use them; otherwise adapt modules into rich workstream view
  const items: ProposalWorkstream[] =
    workstreams && workstreams.length > 0
      ? workstreams
      : modules.map((m, idx) => ({
          id: m.id || `ws-${idx}`,
          number: `0${idx + 1}`,
          category: m.category,
          title: m.title,
          description: m.description,
          deliverables: [
            "تجهيز وتهيئة البيئة السحابية وتكامل الأنظمة على MaxP",
            "اختبار مسار ولي الأمر خطوة بخطوة لضمان سلاسة التجربة",
            "ربط إشعارات المتابعة والتقارير الأسبوعية الفورية",
          ],
          tools: ["MaxP Platform", "WhatsApp Cloud", "Meta Pixel & CAPI"],
          outcome: "أتمتة كاملة للعملية وخفض التدخل البشري اليدوي بنسبة تتجاوز 70%",
        }));

  if (items.length === 0) return null;

  return (
    <Band tone="graphite" id="workstreams">
      <div className="space-y-4 max-w-3xl pb-10 border-b border-white/10">
        <Marker>خطة العمل والتسليمات التنفيذية</Marker>
        <SectionTitle>
          ماذا سنبني وننفذ لأكاديمية كود تريبس بالتحديد؟
        </SectionTitle>
        <Lead>
          أربعة محاور تنفيذية مترابطة، نتحمل فيها المسؤولية الفنية والتسويقية الكاملة — من إعداد قنوات الاستقطاب الرقمي،
          وحتى أتمتة قبول وتأكيد مواعيد الطلاب في فرع فؤاد.
        </Lead>
      </div>

      {/* Sequential Editorial Workstreams — Single Surface */}
      <div className="divide-y divide-white/10">
        {items.map((ws, idx) => (
          <div
            key={ws.id || idx}
            className="py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start hover:bg-white/[0.015] transition-colors"
          >
            {/* Col 1: Workstream Identity & Number (4 cols) */}
            <div className="lg:col-span-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-2xl font-black text-[#FFD368] tabular-nums">
                  {ws.number || `0${idx + 1}`}
                </span>
                <span className="text-[11px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-[#FFD368]/10 text-[#FFD368] border border-[#FFD368]/20">
                  {ws.category}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white leading-snug">
                {stripParens(ws.title)}
              </h3>
              <p className="text-sm text-white/70 leading-relaxed font-normal">
                {ws.description}
              </p>

              {/* Tools Chips */}
              {ws.tools && ws.tools.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {ws.tools.map((tool, tIdx) => (
                    <span
                      key={tIdx}
                      className="text-[10px] font-mono text-white/50 bg-white/5 px-2 py-0.5 rounded border border-white/10"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Col 2: Tangible Deliverables (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="text-xs font-bold text-white/50 uppercase tracking-wider">
                التسليمات الملموسة (Deliverables)
              </div>
              <ul className="space-y-2.5">
                {ws.deliverables?.map((deliv, dIdx) => (
                  <li key={dIdx} className="flex items-start gap-2.5 text-sm text-white/90">
                    <span className="p-0.5 rounded-full bg-[#FFD368]/20 text-[#FFD368] mt-1 shrink-0">
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                    <span className="leading-relaxed">{deliv}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 3: Direct Business Outcome (3 cols) */}
            <div className="lg:col-span-3 space-y-2 border-r-2 border-[#FFD368]/30 pr-4">
              <div className="text-xs font-bold text-[#FFD368] uppercase tracking-wider">
                الأثر التشغيلي المحقق
              </div>
              <p className="text-sm text-white/80 font-medium leading-relaxed">
                {ws.outcome}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Band>
  );
};
