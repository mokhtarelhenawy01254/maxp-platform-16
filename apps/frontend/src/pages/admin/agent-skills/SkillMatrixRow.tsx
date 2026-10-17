import React from "react";
import { Zap, ShieldAlert, UserPlus, Play, Eye, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SkillDefinition, AgentDefinition, ToolDefinition, getSkillMeta, VERTICAL_CONFIG } from "./types";

interface SkillMatrixRowProps {
  skill: SkillDefinition;
  equippedAgents: AgentDefinition[];
  toolsMap: Map<string, ToolDefinition>;
  onInspect: (skill: SkillDefinition) => void;
  onAssign: (skill: SkillDefinition) => void;
  onTestSandbox: (skill: SkillDefinition) => void;
}

export const SkillMatrixRow: React.FC<SkillMatrixRowProps> = ({
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

  return (
    <tr
      onClick={() => onInspect(skill)}
      className="group border-b border-border/60 hover:bg-muted/30 cursor-pointer transition-colors text-xs"
    >
      {/* Skill Name & ID */}
      <td className="py-2.5 px-3.5">
        <div className="flex items-center gap-2.5">
          <div className="size-7 rounded-md bg-muted/40 border border-border/60 flex items-center justify-center shrink-0">
            <Layers className="size-3.5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors truncate">
              {meta.titleAr}
            </p>
            <span className="font-mono text-[10px] text-muted-foreground block truncate" dir="ltr">
              {skill.id}
            </span>
          </div>
        </div>
      </td>

      {/* Sector / Vertical */}
      <td className="py-2.5 px-3 hidden sm:table-cell">
        <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 border border-border/50 px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
          {verticalCfg.labelAr}
        </span>
      </td>

      {/* Safety / Mode */}
      <td className="py-2.5 px-3 text-center">
        {isSupervised ? (
          <Badge
            variant="outline"
            className="gap-1 border-amber-500/30 bg-amber-500/10 text-[10px] font-mono text-amber-600 dark:text-amber-400"
          >
            <ShieldAlert className="size-2.5" />
            <span>موافقة</span>
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-[10px] font-mono text-emerald-600 dark:text-emerald-400"
          >
            <Zap className="size-2.5" />
            <span>ذاتي</span>
          </Badge>
        )}
      </td>

      {/* Allowed Tools Count */}
      <td className="py-2.5 px-3 hidden md:table-cell text-center">
        <span className="font-mono tabular-nums text-foreground font-semibold">{allowedTools.length}</span>
        <span className="text-[10px] text-muted-foreground mr-1">أداة</span>
      </td>

      {/* Equipped Agents */}
      <td className="py-2.5 px-3 hidden lg:table-cell">
        {equippedAgents.length > 0 ? (
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-1.5 space-x-reverse">
              {equippedAgents.slice(0, 2).map((a) => (
                <span
                  key={a.id}
                  className="size-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-mono font-bold text-primary border border-background shadow-2xs"
                  title={a.name}
                >
                  {a.name.charAt(0)}
                </span>
              ))}
            </div>
            <span className="text-[11px] font-mono tabular-nums text-foreground font-medium">
              {equippedAgents.length}
            </span>
          </div>
        ) : (
          <span className="text-[10px] font-mono text-muted-foreground">غير مسند</span>
        )}
      </td>

      {/* Actions */}
      <td className="py-2.5 px-3.5 text-left" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onInspect(skill)}
            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground active:scale-[0.98]"
          >
            <Eye className="size-3 ml-1" />
            <span className="hidden sm:inline">فحص</span>
          </Button>

          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onAssign(skill)}
            className="h-7 w-7 text-muted-foreground hover:text-foreground border-border/70 rounded-md active:scale-[0.98]"
            title="تعيين لوكيل"
          >
            <UserPlus className="size-3" />
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onTestSandbox(skill)}
            className="h-7 w-7 text-emerald-600 hover:bg-emerald-500/10 rounded-md active:scale-[0.98]"
            title="اختبار في Sandbox"
          >
            <Play className="size-3" />
          </Button>
        </div>
      </td>
    </tr>
  );
};
