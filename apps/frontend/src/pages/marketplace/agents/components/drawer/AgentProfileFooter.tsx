import React from "react";
import { Check, ExternalLink } from "lucide-react";
import { AgentListing } from "../../agentMarketplaceData";

interface AgentProfileFooterProps {
  agent: AgentListing;
  isHired: boolean;
  onHire: (agent: AgentListing) => void;
}

export const AgentProfileFooter: React.FC<AgentProfileFooterProps> = ({
  agent,
  isHired,
  onHire,
}) => {
  const isPro = agent.tier === "pro";

  return (
    <div className="border-t border-border/60 bg-background px-6 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] flex items-center justify-between gap-4 shadow-lg">
      <div>
        <div className="text-[11px] text-muted-foreground">حالة التعيين بالشركة</div>
        <div className="text-xs font-semibold text-foreground">
          {isHired ? "معيّن بالفعل في فريقك" : "جاهز للتوظيف الفوري"}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onHire(agent)}
        disabled={isHired}
        className={`flex items-center justify-center gap-2 h-10 px-6 rounded-xl text-xs font-bold active:scale-[0.97] transition-all duration-160 shadow-md ${
          isHired
            ? "bg-muted text-muted-foreground border border-border cursor-not-allowed"
            : isPro
            ? "bg-foreground text-background hover:bg-foreground/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        }`}
      >
        {isHired ? (
          <>
            <Check className="size-4 stroke-[2]" />
            <span>مُعيّن في حسابك</span>
          </>
        ) : (
          <>
            <span>توظيف الإيجنت في فريقي</span>
            <ExternalLink className="size-3.5 stroke-[1.5]" />
          </>
        )}
      </button>
    </div>
  );
};
