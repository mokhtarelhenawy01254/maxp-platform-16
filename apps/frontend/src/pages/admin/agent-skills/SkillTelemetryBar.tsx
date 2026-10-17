import React from "react";
import { Sparkles, ShieldAlert, Cpu, Wrench } from "lucide-react";
import { SkillDefinition, AgentDefinition, ToolDefinition } from "./types";

interface SkillTelemetryBarProps {
  skills: SkillDefinition[];
  agents: AgentDefinition[];
  tools: ToolDefinition[];
}

export const SkillTelemetryBar: React.FC<SkillTelemetryBarProps> = ({
  skills,
  agents,
  tools,
}) => {
  const totalSkills = skills.length;
  const autonomousCount = skills.filter((s) => !s.requiresHumanApproval).length;
  const approvalCount = skills.filter((s) => s.requiresHumanApproval).length;

  const equippedAgentIds = new Set<string>();
  agents.forEach((a) => {
    if (a.allowedSkills && a.allowedSkills.length > 0) {
      equippedAgentIds.add(a.id);
    }
  });

  const uniqueToolsCount = tools.length || new Set(skills.flatMap((s) => s.allowedTools || [])).size;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 rounded-xl border border-border/80 bg-card/40 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border/60 overflow-hidden shadow-xs">
      {/* 1. Total Skills */}
      <div className="p-3 flex flex-col justify-between hover:bg-muted/10 transition-colors">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span className="font-medium text-[11px]">القدرات الذكية</span>
          <Sparkles className="size-3.5 text-primary" />
        </div>
        <div className="flex items-baseline gap-1.5 mt-0.5">
          <span className="text-xl font-bold font-mono tabular-nums text-foreground">{totalSkills}</span>
          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
            جاهزة
          </span>
        </div>
        <p className="mt-1 text-[10px] font-mono text-muted-foreground truncate">
          مهام تجارية وتشغيلية
        </p>
      </div>

      {/* 2. Equipped Agents */}
      <div className="p-3 flex flex-col justify-between hover:bg-muted/10 transition-colors">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span className="font-medium text-[11px]">الوكلاء المزودون</span>
          <Cpu className="size-3.5 text-blue-500" />
        </div>
        <div className="flex items-baseline gap-1.5 mt-0.5">
          <span className="text-xl font-bold font-mono tabular-nums text-foreground">{equippedAgentIds.size}</span>
          <span className="text-[10px] font-mono text-muted-foreground tabular-nums">من أصل {agents.length || 0}</span>
        </div>
        <p className="mt-1 text-[10px] font-mono text-muted-foreground truncate">
          وكلاء مسلحون بمهارات
        </p>
      </div>

      {/* 3. Safety & Control */}
      <div className="p-3 flex flex-col justify-between hover:bg-muted/10 transition-colors">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span className="font-medium text-[11px]">الرقابة التجارية</span>
          <ShieldAlert className="size-3.5 text-amber-500" />
        </div>
        <div className="flex items-baseline gap-1.5 mt-0.5">
          <span className="text-xl font-bold font-mono tabular-nums text-foreground">{autonomousCount}</span>
          <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 tabular-nums">
            {approvalCount} بموافقة
          </span>
        </div>
        <p className="mt-1 text-[10px] font-mono text-muted-foreground truncate">
          تشغيل ذاتي محمي بضوابط
        </p>
      </div>

      {/* 4. Connected Tools */}
      <div className="p-3 flex flex-col justify-between hover:bg-muted/10 transition-colors">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span className="font-medium text-[11px]">الأدوات المتصلة</span>
          <Wrench className="size-3.5 text-purple-500" />
        </div>
        <div className="flex items-baseline gap-1.5 mt-0.5">
          <span className="text-xl font-bold font-mono tabular-nums text-foreground">{uniqueToolsCount}</span>
          <span className="text-[10px] font-mono text-muted-foreground">Tool Callings</span>
        </div>
        <p className="mt-1 text-[10px] font-mono text-muted-foreground truncate">
          واتساب، متجر، وفواتير
        </p>
      </div>
    </div>
  );
};
