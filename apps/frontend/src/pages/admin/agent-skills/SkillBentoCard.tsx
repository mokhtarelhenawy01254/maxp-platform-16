import React from "react";
import { Zap, Eye, UserPlus, Play, ShieldAlert, Sparkles, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SkillDefinition, AgentDefinition, ToolDefinition, getSkillMeta, VERTICAL_CONFIG } from "./types";

interface SkillBentoCardProps {
  skill: SkillDefinition;
  equippedAgents: AgentDefinition[];
  toolsMap: Map<string, ToolDefinition>;
  onInspect: (skill: SkillDefinition) => void;
  onAssign: (skill: SkillDefinition) => void;
  onTestSandbox: (skill: SkillDefinition) => void;
}

export const SkillBentoCard: React.FC<SkillBentoCardProps> = ({
  skill,
  equippedAgents,
  toolsMap,
  onInspect,
  onAssign,
  onTestSandbox,
}) => {
  const meta = getSkillMeta(skill);
  const verticalCfg = VERTICAL_CONFIG[meta.vertical] || VERTICAL_CONFIG.other;
  const isSupervised = skill.requiresHumanApproval || meta.isApprovalRequired;

  const allowedTools = skill.allowedTools || [];
  const previewTools = allowedTools.slice(0, 3);
  const remainingToolsCount = Math.max(0, allowedTools.length - previewTools.length);

  return (
    <div
      onClick={() => onInspect(skill)}
      className="group relative flex flex-col justify-between rounded-xl border border-border/70 bg-card p-4 transition-all duration-200 hover:border-primary/50 shadow-xs cursor-pointer space-y-3"
    >
      {/* Card Header: Sector pill + Version + Safety badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <div className="size-5 rounded-md bg-muted/50 border border-border/60 flex items-center justify-center shrink-0">
            <Layers className="size-3 text-muted-foreground" />
          </div>
          <span className="text-[11px] font-mono font-medium text-muted-foreground">
            {verticalCfg.labelAr}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {isSupervised ? (
            <Badge
              variant="outline"
              className="h-5 gap-1 border-amber-500/30 bg-amber-500/10 px-1.5 text-[10px] font-mono font-medium text-amber-600 dark:text-amber-400"
            >
              <ShieldAlert className="size-2.5" />
              <span>موافقة التاجر</span>
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="h-5 gap-1 border-emerald-500/30 bg-emerald-500/10 px-1.5 text-[10px] font-mono font-medium text-emerald-600 dark:text-emerald-400"
            >
              <Zap className="size-2.5" />
              <span>تشغيل ذاتي</span>
            </Badge>
          )}

          <span className="rounded-md bg-muted/60 border border-border/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            v{skill.version || "1.0"}
          </span>
        </div>
      </div>

      {/* Title & Technical ID */}
      <div>
        <h3 className="text-sm font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
          {meta.titleAr}
        </h3>
        <span className="font-mono text-[10px] text-muted-foreground/70 block truncate mt-0.5" dir="ltr">
          {skill.id}
        </span>
      </div>

      {/* Commercial Description */}
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
        {meta.descAr}
      </p>

      {/* Trigger Banner */}
      <div className="rounded-lg bg-muted/20 border border-border/60 p-2 text-[11px] text-muted-foreground">
        <div className="flex items-start gap-1.5">
          <Zap className="size-3 text-primary shrink-0 mt-0.5" />
          <span className="line-clamp-1 leading-snug">
            <strong className="text-foreground/90 font-medium ml-1">الاستدعاء:</strong>
            {meta.triggerAr}
          </span>
        </div>
      </div>

      {/* Tool Chips Preview */}
      <div className="flex flex-wrap items-center gap-1.5">
        {previewTools.map((tName) => {
          const toolDef = toolsMap.get(tName);
          const isWrite = toolDef?.sideEffects === "write";

          return (
            <span
              key={tName}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[10px] border",
                isWrite
                  ? "bg-amber-500/5 text-amber-700 dark:text-amber-300 border-amber-500/20"
                  : "bg-muted/40 text-muted-foreground border-border/70"
              )}
              title={toolDef?.description || tName}
            >
              {isWrite ? <Zap className="size-2.5 text-amber-500" /> : <Eye className="size-2.5 text-blue-500" />}
              <span className="truncate max-w-[110px]" dir="ltr">{tName}</span>
            </span>
          );
        })}

        {remainingToolsCount > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] font-mono font-bold text-muted-foreground border border-border/60">
                  +{remainingToolsCount}
                </span>
              </TooltipTrigger>
              <TooltipContent className="text-xs font-mono">
                {allowedTools.slice(3).join(", ")}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {allowedTools.length === 0 && (
          <span className="text-[10px] text-muted-foreground font-mono">
            مهارة توجيهية بدون استدعاء أدوات
          </span>
        )}
      </div>

      {/* Equipped Agents Cluster & Footer */}
      <div className="pt-2.5 border-t border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {equippedAgents.length > 0 ? (
            <div className="flex items-center gap-1.5">
              <div className="flex -space-x-1.5 space-x-reverse overflow-hidden">
                {equippedAgents.slice(0, 3).map((agent) => (
                  <div
                    key={agent.id}
                    className="inline-flex size-5 items-center justify-center rounded-full border border-background bg-primary/10 text-[9px] font-mono text-primary font-bold shadow-2xs"
                    title={`${agent.name} (${agent.role})`}
                  >
                    {agent.name.charAt(0)}
                  </div>
                ))}
              </div>
              <span className="text-[11px] font-mono font-medium text-foreground mr-1 tabular-nums">
                {equippedAgents.length} {equippedAgents.length === 1 ? "وكيل مجهز" : "وكلاء"}
              </span>
            </div>
          ) : (
            <span className="text-[11px] font-mono text-muted-foreground">
              غير مسندة لوكلاء
            </span>
          )}
        </div>

        {/* Quick Action Icons */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onAssign(skill)}
            className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg active:scale-[0.98]"
            title="تعيين لوكيل"
          >
            <UserPlus className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onTestSandbox(skill)}
            className="h-7 w-7 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 rounded-lg active:scale-[0.98]"
            title="تجربة فورية في الـ Sandbox"
          >
            <Play className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
