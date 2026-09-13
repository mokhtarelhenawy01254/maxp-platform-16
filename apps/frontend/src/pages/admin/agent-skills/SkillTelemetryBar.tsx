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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
      {/* 1. Total Skills */}
      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-3.5 sm:p-4 backdrop-blur-sm transition-all hover:border-primary/40 hover:shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">إجمالي القدرات الذكية</span>
          <div className="flex size-7 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="size-3.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">{totalSkills}</span>
          <span className="text-[0.7rem] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
            جاهزة للإنتاج
          </span>
        </div>
        <p className="mt-1 text-[0.7rem] text-muted-foreground truncate">
          مهام تجارية وتشغيلية للوكلاء
        </p>
      </div>

      {/* 2. Equipped Agents */}
      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-3.5 sm:p-4 backdrop-blur-sm transition-all hover:border-indigo-500/40 hover:shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">الوكلاء المزودون</span>
          <div className="flex size-7 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Cpu className="size-3.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">{equippedAgentIds.size}</span>
          <span className="text-[0.7rem] text-muted-foreground">من أصل {agents.length || 0} وكيل</span>
        </div>
        <p className="mt-1 text-[0.7rem] text-muted-foreground truncate">
          وكلاء تم تسليحهم بمهارات نشطة
        </p>
      </div>

      {/* 3. Safety & Control */}
      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-3.5 sm:p-4 backdrop-blur-sm transition-all hover:border-amber-500/40 hover:shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">الرقابة والأمان التجاري</span>
          <div className="flex size-7 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <ShieldAlert className="size-3.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">{autonomousCount}</span>
          <span className="text-[0.7rem] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20">
            {approvalCount} بموافقة التاجر
          </span>
        </div>
        <p className="mt-1 text-[0.7rem] text-muted-foreground truncate">
          تشغيل ذاتي محمي بضوابط الربحية
        </p>
      </div>

      {/* 4. Connected Tools */}
      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-3.5 sm:p-4 backdrop-blur-sm transition-all hover:border-teal-500/40 hover:shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">الأدوات المتصلة (Tools)</span>
          <div className="flex size-7 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
            <Wrench className="size-3.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">{uniqueToolsCount}</span>
          <span className="text-[0.7rem] font-mono text-muted-foreground">Tool Callings</span>
        </div>
        <p className="mt-1 text-[0.7rem] text-muted-foreground truncate">
          واتساب، متجر، حجز، وفواتير
        </p>
      </div>
    </div>
  );
};
