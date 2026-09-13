import React from "react";
import { Zap, ShieldAlert, UserPlus, Play, Eye } from "lucide-react";
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
      className="group border-b border-border/60 hover:bg-muted/40 cursor-pointer transition-colors"
    >
      {/* Skill Name & ID */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-2.5">
          <span className="text-lg leading-none">{verticalCfg.icon}</span>
          <div className="min-w-0">
            <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">
              {meta.titleAr}
            </p>
            <span className="font-mono text-[0.65rem] text-muted-foreground block truncate" dir="ltr">
              {skill.id}
            </span>
          </div>
        </div>
      </td>

      {/* Sector / Vertical */}
      <td className="py-3 px-3 hidden sm:table-cell">
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
          {verticalCfg.labelAr}
        </span>
      </td>

      {/* Safety / Mode */}
      <td className="py-3 px-3">
        {isSupervised ? (
          <Badge
            variant="outline"
            className="gap-1 border-amber-500/30 bg-amber-500/10 text-[0.65rem] text-amber-600 dark:text-amber-400"
          >
            <ShieldAlert className="size-2.5" />
            <span>موافقة</span>
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-[0.65rem] text-emerald-600 dark:text-emerald-400"
          >
            <Zap className="size-2.5" />
            <span>ذاتي</span>
          </Badge>
        )}
      </td>

      {/* Allowed Tools Count */}
      <td className="py-3 px-3 hidden md:table-cell">
        <div className="flex items-center gap-1.5">
          <span className="font-mono font-bold text-xs">{allowedTools.length}</span>
          <span className="text-[0.65rem] text-muted-foreground">أدوات</span>
        </div>
      </td>

      {/* Equipped Agents */}
      <td className="py-3 px-3 hidden lg:table-cell">
        {equippedAgents.length > 0 ? (
          <div className="flex items-center gap-1">
            <div className="flex -space-x-1.5 space-x-reverse">
              {equippedAgents.slice(0, 2).map((a) => (
                <span key={a.id} className="size-5 rounded-full bg-primary/10 flex items-center justify-center text-[0.65rem] border border-background" title={a.name}>
                  {a.icon || "🤖"}
                </span>
              ))}
            </div>
            <span className="text-xs font-semibold text-foreground">
              {equippedAgents.length}
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">غير مسند</span>
        )}
      </td>

      {/* Actions */}
      <td className="py-3 px-4 text-left" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onInspect(skill)}
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-primary"
          >
            <Eye className="size-3.5 ml-1" />
            <span className="hidden sm:inline">فحص</span>
          </Button>

          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onAssign(skill)}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title="تعيين لوكيل"
          >
            <UserPlus className="size-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onTestSandbox(skill)}
            className="h-8 w-8 text-emerald-600 hover:bg-emerald-500/10"
            title="اختبار في Sandbox"
          >
            <Play className="size-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
};
