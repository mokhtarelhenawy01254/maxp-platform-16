import React, { useState } from "react";
import {
  Sparkles,
  Trash2,
  ExternalLink,
  Play,
  Eye,
  ShieldAlert,
  Zap,
  CheckCircle2,
  DownloadCloud,
  Plus,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  SkillDefinition,
  AgentDefinition,
  ToolDefinition,
  getSkillMeta,
  VERTICAL_CONFIG,
} from "./types";

interface SkillRowCardProps {
  skill: SkillDefinition;
  equippedAgents: AgentDefinition[];
  toolsMap: Map<string, ToolDefinition>;
  onInspect: (skill: SkillDefinition) => void;
  onToggle: (skill: SkillDefinition, enabled: boolean) => Promise<void>;
  onAssign: (skill: SkillDefinition) => void;
  onTestSandbox: (skill: SkillDefinition) => void;
}

export const SkillRowCard: React.FC<SkillRowCardProps> = ({
  skill,
  equippedAgents,
  toolsMap,
  onInspect,
  onToggle,
  onAssign,
  onTestSandbox,
}) => {
  const meta = getSkillMeta(skill);
  const verticalCfg = VERTICAL_CONFIG[meta.vertical] || VERTICAL_CONFIG.other;
  const isSupervised = skill.requiresHumanApproval || meta.isApprovalRequired;
  const isEquipped = equippedAgents.length > 0;
  const allowedTools = skill.allowedTools || [];

  const [toggling, setToggling] = useState(false);

  const handleSwitchChange = async (checked: boolean) => {
    setToggling(true);
    try {
      await onToggle(skill, checked);
    } finally {
      setToggling(false);
    }
  };

  return (
    <div
      onClick={() => onInspect(skill)}
      className={cn(
        "group relative flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 transition-all duration-200 cursor-pointer",
        isEquipped
          ? "border-border/80 border-s-4 border-s-emerald-500 bg-card hover:border-emerald-500/40 shadow-xs"
          : "border-border/50 border-s-4 border-s-muted-foreground/30 bg-card/40 opacity-85 hover:opacity-100 hover:border-border hover:bg-card/70"
      )}
    >
      {/* Left: Icon Box + Title + Truncated Single-Line Description */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Rounded Square Dark Icon Box (Image 1 Style) */}
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl border text-base shadow-2xs transition-transform group-hover:scale-105",
            isEquipped
              ? "border-emerald-500/30 bg-emerald-500/10 text-foreground"
              : "border-border/50 bg-muted/40 text-muted-foreground"
          )}
        >
          <span>{verticalCfg.icon}</span>
        </div>

        {/* Text Container: ID in bold + Title + 1-Line Trigger Hint */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="font-mono text-sm font-bold text-foreground group-hover:text-primary transition-colors tracking-tight"
              dir="ltr"
            >
              {skill.id}
            </span>

            <span className="text-xs font-semibold text-muted-foreground">
              • {meta.titleAr}
            </span>

            {/* Installed vs Uninstalled Status Badge */}
            {isEquipped ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.2 text-[0.65rem] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="size-2.5 text-emerald-500" />
                <span>مثبتة</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-1.5 py-0.2 text-[0.65rem] font-medium text-muted-foreground border border-border/60">
                <DownloadCloud className="size-2.5 opacity-70" />
                <span>متاحة للتثبيت</span>
              </span>
            )}

            <span className="rounded-md bg-muted/60 px-1.5 py-0.2 text-[0.65rem] font-semibold text-muted-foreground hidden sm:inline-block">
              {verticalCfg.labelAr}
            </span>

            {isSupervised ? (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-500/10 px-1.5 py-0.2 text-[0.65rem] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <ShieldAlert className="size-2.5" />
                <span>موافقة</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-500/10 px-1.5 py-0.2 text-[0.65rem] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Zap className="size-2.5" />
                <span>ذاتي</span>
              </span>
            )}
          </div>

          {/* Single-line truncated trigger description (Image 1 Style) */}
          <p className="mt-0.5 text-xs text-muted-foreground truncate leading-snug">
            <span className="text-muted-foreground/80 font-medium">عندما:</span>{" "}
            {meta.triggerAr}
          </p>
        </div>
      </div>

      {/* Right: Quick Badges + Install CTA / Toggle Switch + Action Icons */}
      <div
        className="flex items-center gap-2.5 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tools Count Badge */}
        <span
          className="hidden md:inline-flex items-center gap-1 rounded-lg bg-muted/60 px-2 py-1 text-[0.7rem] font-mono text-muted-foreground border border-border/60"
          title={`الأدوات: ${allowedTools.join(", ") || "لا توجد"}`}
        >
          <span>{allowedTools.length}</span>
          <span className="text-[0.65rem]">أدوات</span>
        </span>

        {/* Equipped Agents indicator */}
        {equippedAgents.length > 0 && (
          <div className="hidden lg:flex items-center gap-1" title={equippedAgents.map(a => a.name).join(", ")}>
            <div className="flex -space-x-1.5 space-x-reverse">
              {equippedAgents.slice(0, 2).map((a) => (
                <span
                  key={a.id}
                  className="size-5 rounded-full bg-primary/15 border border-background flex items-center justify-center text-[0.65rem]"
                >
                  {a.icon || "🤖"}
                </span>
              ))}
            </div>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mr-0.5">
              {equippedAgents.length} {equippedAgents.length === 1 ? "وكيل" : "وكلاء"}
            </span>
          </div>
        )}

        {/* If NOT equipped, show direct 1-click Install Button */}
        {!isEquipped && (
          <Button
            type="button"
            size="sm"
            disabled={toggling}
            onClick={(e) => {
              e.stopPropagation();
              handleSwitchChange(true);
            }}
            className="h-7 px-2.5 text-xs font-bold gap-1 bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer rounded-lg shadow-xs"
            title="تثبيت المهارة وتجهيزها للوكيل المناسب فوراً"
          >
            <Plus className="size-3" />
            <span>تثبيت</span>
          </Button>
        )}

        {/* Toggle Switch (Image 1 Style) */}
        <div className="flex items-center gap-1.5">
          <Switch
            checked={isEquipped}
            disabled={toggling}
            onCheckedChange={handleSwitchChange}
            aria-label={`تفعيل ${skill.id}`}
            title={isEquipped ? "مثبتة ومجهزة للوكلاء (انقر للتعطيل)" : "غير مثبتة (انقر للتثبيت)"}
          />
        </div>

        {/* Quick Details / Inspect Icon Button */}
        <button
          type="button"
          onClick={() => onInspect(skill)}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
          title="فحص محتوى المهارة وSKILL.md"
        >
          <Eye className="size-4" />
        </button>

        {/* Sandbox Quick Test Button */}
        <button
          type="button"
          onClick={() => onTestSandbox(skill)}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors cursor-pointer"
          title="اختبار في الـ Sandbox"
        >
          <Play className="size-3.5" />
        </button>
      </div>
    </div>
  );
};
