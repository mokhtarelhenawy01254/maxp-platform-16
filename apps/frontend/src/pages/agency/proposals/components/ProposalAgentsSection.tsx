import React from "react";
import { ProposalAgent, ProposalAgentOrg, ProposalTool, ProposalToolGroup } from "../types";
import { Band, SectionTitle, Lead, Marker } from "./ProposalUi";

interface ProposalAgentsSectionProps {
  agents?: ProposalAgent[];
  tools?: ProposalTool[];
  agentOrg?: ProposalAgentOrg;
  toolGroups?: ProposalToolGroup[];
}

/**
 * Where AI actually sits in the operation: the org chart of agents, what each
 * one does step by step, who supervises them, and the modules that run them.
 */
export const ProposalAgentsSection: React.FC<ProposalAgentsSectionProps> = ({
  agents,
  tools,
  agentOrg,
  toolGroups,
}) => {
  const hasAgents = agents && agents.length > 0;
  const hasTools = (tools && tools.length > 0) || (toolGroups && toolGroups.length > 0);
  if (!hasAgents && !hasTools && !agentOrg) return null;

  return (
    <Band tone="graphite" id="agents">
      <div className="space-y-4 max-w-3xl pb-8 border-b border-white/10">
        <Marker>الذكاء الاصطناعي — هنا بالظبط</Marker>
        <SectionTitle>مش شات بوت على الموقع. وكلاء بيمسكوا المسار من أول إعلان لحد تجديد المستوى</SectionTitle>
        <Lead>
          كل وكيل له مدخل واضح، خطوات محددة، وناتج بيتقاس. المهام اليدوية اللي بتاكل وقت الاستقبال والمبيعات
          بتتنقل للنظام، والفريق يفضل مركز على الطفل وولي الأمر.
        </Lead>
      </div>

      {agentOrg && (
        <div className="pt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-4 flex items-start gap-4">
            <div className="font-mono text-6xl font-black text-[#FFD368] tabular-nums leading-none">
              {agentOrg.total}
            </div>
            <div className="pt-1">
              <div className="text-sm font-black text-white leading-snug">وكلاء داخل الأكاديمية</div>
              <div className="text-xs text-white/55 leading-relaxed pt-1">{agentOrg.headline}</div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-3">
              {agentOrg.layers.map((layer, idx) => (
                <div key={idx} className="border-t border-white/15 pt-2">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-xl font-black text-white tabular-nums">{layer.count}</span>
                    <span className="text-xs font-bold text-white/80">{layer.name}</span>
                  </div>
                  <div className="text-[11px] text-white/50 leading-relaxed pt-1">{layer.detail}</div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-white/45 leading-relaxed border-r-2 border-[#FFD368]/40 pr-3">
              {agentOrg.oversight}
            </p>
          </div>
        </div>
      )}

      {hasAgents && (
        <div className="divide-y divide-white/10">
          {agents!.map((agent, idx) => (
            <div key={idx} className="py-8 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              <div className="lg:col-span-4 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-2xl font-black text-[#FFD368] tabular-nums leading-none">
                    0{idx + 1}
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-white leading-snug">{agent.name}</h3>
                  {agent.alwaysOn && (
                    <span className="text-[10px] font-bold px-2 py-0.5 border border-emerald-500/30 text-emerald-400">
                      24/7
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/70 leading-relaxed">{agent.job}</p>
                {agent.layer && (
                  <div className="text-[10px] font-mono uppercase tracking-wider text-white/35">{agent.layer}</div>
                )}
              </div>

              <div className="lg:col-span-5">
                <div className="text-[11px] font-bold text-white/40 uppercase tracking-wider pb-2">
                  خطواته
                </div>
                <ol className="space-y-1.5">
                  {agent.steps.map((step, sIdx) => (
                    <li key={sIdx} className="flex items-start gap-2 text-xs text-white/75 leading-relaxed">
                      <span className="font-mono text-[10px] text-white/35 tabular-nums mt-0.5 shrink-0">
                        {sIdx + 1}.
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="lg:col-span-3 border-r-2 border-[#FFD368]/40 pr-4">
                <div className="text-[11px] font-bold text-[#FFD368] uppercase tracking-wider pb-1">
                  المؤشر
                </div>
                <p className="text-xs text-white/70 leading-relaxed">{agent.kpi}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasTools && (
        <div className="pt-10 mt-2 border-t border-white/10">
          <div className="flex items-baseline justify-between gap-4 pb-4 flex-wrap">
            <h3 className="text-lg font-black text-white">الأدوات اللي بتشغّل المنظومة</h3>
            <span className="text-[11px] text-white/40">
              وحدات فعليّة على منصة MaxP + أدوات خارجية محددة الوظيفة
            </span>
          </div>
          {toolGroups && toolGroups.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10">
              {toolGroups.map((group, idx) => (
                <div key={idx} className="py-3 border-t border-white/10">
                  <div className="text-[11px] font-bold text-[#FFD368] pb-1.5">{group.name}</div>
                  <div className="text-xs text-white/70 leading-relaxed">{group.items.join(" · ")}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10">
              {tools!.map((tool, idx) => (
                <div
                  key={idx}
                  className="py-3 border-t border-white/10 flex items-start justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white/90">{tool.name}</div>
                    <div className="text-xs text-white/55 leading-relaxed">{tool.purpose}</div>
                  </div>
                  {tool.owner && (
                    <span className="text-[10px] font-mono text-white/40 whitespace-nowrap pt-0.5">
                      {tool.owner}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Band>
  );
};
