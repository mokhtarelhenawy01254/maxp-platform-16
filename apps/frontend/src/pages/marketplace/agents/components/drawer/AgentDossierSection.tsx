import React from "react";
import { Zap, Lock } from "lucide-react";
import { AgentListing } from "../../agentMarketplaceData";

interface AgentDossierSectionProps {
  dossier: AgentListing["dossier"];
  tools: string[];
}

export const AgentDossierSection: React.FC<AgentDossierSectionProps> = ({
  dossier,
  tools,
}) => {
  return (
    <div className="space-y-6">
      {/* Operational Bio & Persona */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
          السيرة المهنية وأسلوب التواصل
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {dossier.bio}
        </p>
        <div className="rounded-lg border border-border/40 bg-card p-3 space-y-1 text-xs">
          <div className="flex gap-2">
            <span className="font-semibold text-foreground shrink-0">الشخصية:</span>
            <span className="text-muted-foreground">{dossier.persona}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold text-foreground shrink-0">اللهجة:</span>
            <span className="text-muted-foreground">{dossier.dialect}</span>
          </div>
        </div>
      </div>

      {/* Superpower Tool Arsenal */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
          ترسانة الأدوات وصلاحيات النظام (Authorized Tool Arsenal)
        </h3>
        <div className="grid grid-cols-1 gap-1.5">
          {tools.map((tool, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 px-3 py-2 text-xs"
            >
              <div className="flex items-center gap-2 font-mono text-[11px] text-foreground">
                <Zap className="size-3 text-primary stroke-[1.5]" />
                <span>{tool}</span>
              </div>
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                صلاحية مؤكدة
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Governance & Boundaries */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Lock className="size-3 stroke-[1.5] text-amber-500" />
          <span>حدود الأمان الصارمة (Governance Boundaries)</span>
        </h3>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-2 text-xs">
          {dossier.boundaries.map((boundary, idx) => (
            <div key={idx} className="flex items-start gap-2 text-muted-foreground">
              <span className="text-amber-500 text-xs shrink-0 font-bold">•</span>
              <span>{boundary}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
