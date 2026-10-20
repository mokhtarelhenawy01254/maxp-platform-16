import React from "react";
import { Terminal, Play, RotateCcw } from "lucide-react";
import { AgentListing } from "../../agentMarketplaceData";

interface AgentExecutionSimulatorProps {
  agentSlug: string;
  executionStream: AgentListing["dossier"]["executionStream"];
  simulationStep: number;
  simulating: boolean;
  onRunSimulation: () => void;
  onResetSimulation: () => void;
}

export const AgentExecutionSimulator: React.FC<AgentExecutionSimulatorProps> = ({
  agentSlug,
  executionStream,
  simulationStep,
  simulating,
  onRunSimulation,
  onResetSimulation,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Terminal className="size-3.5 stroke-[1.5]" />
          <span>المحاكاة الحية لسجل التفكير (Reasoning Stream)</span>
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRunSimulation}
            disabled={simulating}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline disabled:opacity-50"
          >
            <Play className="size-3 stroke-[1.5]" />
            <span>تشغيل المحاكاة</span>
          </button>
          <button
            type="button"
            onClick={onResetSimulation}
            className="inline-flex items-center text-muted-foreground hover:text-foreground"
            title="إعادة تعيين"
            aria-label="إعادة تعيين المحاكاة"
          >
            <RotateCcw className="size-3 stroke-[1.5]" />
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-[#0a0a0c] p-3 font-mono text-[11px] text-gray-300 space-y-2 shadow-inner">
        <div className="flex items-center justify-between pb-2 border-b border-white/10 text-[10px] text-gray-500">
          <span>EXECUTION_TRACER: {agentSlug}</span>
          <span>STATUS: {simulating ? "PROCESSING…" : "IDLE"}</span>
        </div>

        <div className="space-y-1.5 min-h-[140px]">
          {executionStream.slice(0, simulationStep + 1).map((step, idx) => (
            <div key={idx} className="space-y-0.5 animate-fadeIn">
              <div className="text-[10px] text-gray-400 font-semibold">{step.step}</div>
              <div
                className={`ps-2 text-[11px] ${
                  step.type === "tool"
                    ? "text-blue-400"
                    : step.type === "output"
                    ? "text-emerald-400 font-sans"
                    : "text-amber-300/90 italic"
                }`}
              >
                &gt; {step.action}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
