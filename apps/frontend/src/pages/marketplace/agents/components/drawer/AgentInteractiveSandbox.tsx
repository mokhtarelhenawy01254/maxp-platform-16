import React from "react";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { getAgentSamplePrompts } from "../../agentMarketplaceData";
import { SandboxResult } from "../../hooks/useAgentProfileDrawer";

interface AgentInteractiveSandboxProps {
  agentSlug: string;
  agentName: string;
  sandboxQuery: string;
  sandboxLoading: boolean;
  sandboxResult: SandboxResult | null;
  onQueryChange: (query: string) => void;
  onRunSandbox: () => void;
}

export const AgentInteractiveSandbox: React.FC<AgentInteractiveSandboxProps> = ({
  agentSlug,
  agentName,
  sandboxQuery,
  sandboxLoading,
  sandboxResult,
  onQueryChange,
  onRunSandbox,
}) => {
  const samplePrompts = getAgentSamplePrompts(agentSlug);

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <MessageSquare className="size-3.5 stroke-[1.5] text-primary" />
          <span>اختبار الاستجابة الحية (Live Sandbox Test)</span>
        </h3>
        <span className="text-[10px] font-mono text-muted-foreground">تجربة فورية</span>
      </div>

      {/* Quick Prompt Suggestion Chips */}
      <div className="flex flex-wrap gap-1.5">
        {samplePrompts.map((sample, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onQueryChange(sample.prompt)}
            className="rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-muted/70 hover:text-foreground active:scale-[0.97] transition-all text-start"
          >
            {sample.label}
          </button>
        ))}
      </div>

      {/* Input + Action Bar */}
      <div className="flex gap-2">
        <input
          type="text"
          value={sandboxQuery}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onRunSandbox()}
          placeholder="اطرح سؤالاً أو مهمة تجريبية لاختبار الإيجنت…"
          className="flex-1 h-9 rounded-xl border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        />
        <button
          type="button"
          onClick={onRunSandbox}
          disabled={sandboxLoading || !sandboxQuery.trim()}
          className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 hover:bg-primary/90 active:scale-[0.97] transition-all disabled:opacity-50 shrink-0"
        >
          {sandboxLoading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <>
              <span>تجربة</span>
              <Send className="size-3 stroke-[1.5]" />
            </>
          )}
        </button>
      </div>

      {/* Sandbox Output Display */}
      {sandboxResult && (
        <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2 text-xs animate-fadeIn">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground border-b border-border/40 pb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              <span className="font-semibold text-foreground">{agentName}</span>
            </div>
            <span className="font-mono text-[9px] text-blue-500">
              {sandboxResult.toolUsed ? `الأداة: ${sandboxResult.toolUsed}` : "استجابة استراتيجية"}
            </span>
          </div>
          <p className="text-xs text-foreground/90 leading-relaxed font-sans select-text">
            {sandboxResult.response}
          </p>
        </div>
      )}
    </div>
  );
};
