import React from "react";
import { Zap, Eye, UserPlus, Play, ChevronLeft, ShieldCheck, ShieldAlert } from "lucide-react";
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
      className="group relative flex flex-col rounded-2xl border border-border/80 bg-card p-1.5 transition-all duration-300 hover:border-primary/50 hover:shadow-md cursor-pointer"
    >
      {/* Outer subtle glow line on hover */}
      <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-b from-primary/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none" />

      {/* Inner Core Container */}
      <div className="flex flex-col flex-1 rounded-xl bg-background/60 p-4 border border-border/40">
        {/* Card Header: Sector pill + Version + Safety badge */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-sm leading-none">{verticalCfg.icon}</span>
            <span className="text-[0.7rem] font-bold text-muted-foreground uppercase tracking-wider">
              {verticalCfg.labelAr}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {isSupervised ? (
              <Badge
                variant="outline"
                className="h-5 gap-1 border-amber-500/30 bg-amber-500/10 px-1.5 text-[0.65rem] font-medium text-amber-600 dark:text-amber-400"
              >
                <ShieldAlert className="size-2.5" />
                <span>موافقة التاجر</span>
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="h-5 gap-1 border-emerald-500/30 bg-emerald-500/10 px-1.5 text-[0.65rem] font-medium text-emerald-600 dark:text-emerald-400"
              >
                <Zap className="size-2.5" />
                <span>تشغيل ذاتي</span>
              </Badge>
            )}

            <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.65rem] text-muted-foreground">
              v{skill.version || "1.0"}
            </span>
          </div>
        </div>

        {/* Title & Technical ID */}
        <div className="mb-2">
          <h3 className="text-base font-black tracking-tight text-foreground transition-colors group-hover:text-primary">
            {meta.titleAr}
          </h3>
          <span className="font-mono text-[0.65rem] text-muted-foreground/70 block truncate" dir="ltr">
            {skill.id}
          </span>
        </div>

        {/* Commercial Description */}
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 min-h-[36px] mb-3">
          {meta.descAr}
        </p>

        {/* Trigger Banner (When does the agent trigger this skill?) */}
        <div className="mb-3.5 rounded-lg bg-muted/30 border border-border/50 p-2 text-[0.7rem] text-muted-foreground">
          <div className="flex items-start gap-1.5">
            <span className="text-primary text-[0.75rem] shrink-0">🎯</span>
            <span className="line-clamp-1 leading-snug">
              <strong className="text-foreground/90 font-bold ml-1">الاستدعاء:</strong>
              {meta.triggerAr}
            </span>
          </div>
        </div>

        {/* Tool Chips Preview */}
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          {previewTools.map((tName) => {
            const toolDef = toolsMap.get(tName);
            const isWrite = toolDef?.sideEffects === "write";

            return (
              <span
                key={tName}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[0.65rem] border",
                  isWrite
                    ? "bg-amber-500/5 text-amber-700 dark:text-amber-300 border-amber-500/20"
                    : "bg-muted text-muted-foreground border-border/80"
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
                  <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[0.65rem] font-bold text-muted-foreground border border-border/60">
                    +{remainingToolsCount}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                  {allowedTools.slice(3).join(", ")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {allowedTools.length === 0 && (
            <span className="text-[0.65rem] text-muted-foreground italic">
              مهارة توجيهية بدون استدعاء أدوات
            </span>
          )}
        </div>

        {/* Equipped Agents Cluster */}
        <div className="mt-auto pt-3 border-t border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {equippedAgents.length > 0 ? (
              <div className="flex items-center gap-1">
                <div className="flex -space-x-1.5 space-x-reverse overflow-hidden">
                  {equippedAgents.slice(0, 3).map((agent) => (
                    <div
                      key={agent.id}
                      className="inline-flex size-6 items-center justify-center rounded-full border-2 border-background bg-primary/10 text-xs shadow-2xs"
                      title={`${agent.name} (${agent.role})`}
                    >
                      {agent.icon || "🤖"}
                    </div>
                  ))}
                </div>
                <span className="text-[0.7rem] font-bold text-foreground mr-1">
                  {equippedAgents.length} {equippedAgents.length === 1 ? "وكيل مجهز" : "وكلاء"}
                </span>
              </div>
            ) : (
              <span className="text-[0.7rem] text-muted-foreground">
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
              className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg"
              title="تعيين لوكيل"
            >
              <UserPlus className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onTestSandbox(skill)}
              className="h-7 w-7 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 rounded-lg"
              title="تجربة فورية في الـ Sandbox"
            >
              <Play className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
