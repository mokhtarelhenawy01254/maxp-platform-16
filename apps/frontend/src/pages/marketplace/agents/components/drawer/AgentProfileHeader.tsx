import React from "react";
import { Sparkles, Check } from "lucide-react";
import { AgentListing, getArabicInitials } from "../../agentMarketplaceData";

interface AgentProfileHeaderProps {
  agent: AgentListing;
  imgError: boolean;
  onImgError: () => void;
}

export const AgentProfileHeader: React.FC<AgentProfileHeaderProps> = ({
  agent,
  imgError,
  onImgError,
}) => {
  const isPro = agent.tier === "pro";

  return (
    <div className="flex items-start gap-4">
      <div className="relative shrink-0">
        <div className="size-20 overflow-hidden rounded-2xl border border-border bg-muted shadow-md">
          {imgError ? (
            <div className="size-full flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-950 text-white font-bold text-lg tracking-wider select-none border border-white/10 shadow-inner">
              <span>{getArabicInitials(agent.name)}</span>
            </div>
          ) : (
            <img
              src={agent.avatarUrl}
              alt={agent.name}
              onError={onImgError}
              className="size-full object-cover contrast-125"
            />
          )}
        </div>
        <span className="absolute -bottom-1 -left-1 flex size-4 items-center justify-center rounded-full border-2 border-background bg-emerald-500 shadow-sm" />
      </div>

      <div className="space-y-1.5 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 id="agent-dossier-title" className="text-xl font-bold tracking-tight text-foreground">
            {agent.name}
          </h2>
          {isPro ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
              <Sparkles className="size-3 stroke-[1.5]" />
              <span>تخصصي Pro</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
              <Check className="size-3 stroke-[1.5]" />
              <span>أساسي متضمن</span>
            </span>
          )}
        </div>

        <p className="text-xs font-medium text-muted-foreground leading-relaxed">
          {agent.position}
        </p>

        {isPro ? (
          <div className="text-xs font-semibold tabular-nums text-foreground pt-1">
            {agent.priceMonthly}&nbsp;<span className="text-[11px] font-normal text-muted-foreground">{agent.currency || "ج.م"}/شهرياً</span>
          </div>
        ) : (
          <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 pt-1">
            مشمول مجاناً في باقة اشتراك المنصة
          </div>
        )}
      </div>
    </div>
  );
};
