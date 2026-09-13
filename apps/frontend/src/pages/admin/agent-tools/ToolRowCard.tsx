import React, { useState } from "react";
import {
  Play,
  Eye,
  ShieldAlert,
  Zap,
  CheckCircle2,
  DownloadCloud,
  Plus,
  Lock,
  Unlock,
  Wrench,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ToolDefinition,
  AgentDefinition,
  AgentToolInfo,
  getToolGroupMeta,
} from "./types";

interface ToolRowCardProps {
  tool: ToolDefinition;
  equippedAgents: AgentToolInfo[];
  onInspect: (tool: ToolDefinition) => void;
  onToggle: (tool: ToolDefinition, enabled: boolean) => Promise<void>;
  onAssign: (tool: ToolDefinition) => void;
  onTestSandbox: (tool: ToolDefinition) => void;
}

export const ToolRowCard: React.FC<ToolRowCardProps> = ({
  tool,
  equippedAgents,
  onInspect,
  onToggle,
  onAssign,
  onTestSandbox,
}) => {
  const groupMeta = getToolGroupMeta(tool.group);
  const isWrite = tool.sideEffects === "write";
  const isEquipped = equippedAgents.length > 0;
  const isSupervised = tool.requiresApproval;

  const [toggling, setToggling] = useState(false);

  const handleSwitchChange = async (checked: boolean) => {
    setToggling(true);
    try {
      await onToggle(tool, checked);
    } finally {
      setToggling(false);
    }
  };

  return (
    <div
      onClick={() => onInspect(tool)}
      className={cn(
        "group relative flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 transition-all duration-200 cursor-pointer",
        isEquipped
          ? "border-border/80 border-s-4 border-s-emerald-500 bg-card hover:border-emerald-500/40 shadow-xs"
          : "border-border/50 border-s-4 border-s-muted-foreground/30 bg-card/40 opacity-85 hover:opacity-100 hover:border-border hover:bg-card/70"
      )}
    >
      {/* Left: Icon Box + Name + Badges + Truncated Description */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Rounded Square Dark Icon Box (Image 1 Style) */}
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl border text-base shadow-2xs transition-transform group-hover:scale-105",
            isEquipped
              ? "border-emerald-500/30 bg-emerald-500/10 text-foreground"
              : isWrite
              ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
              : "border-border/50 bg-muted/40 text-muted-foreground"
          )}
        >
          <span>{groupMeta.icon}</span>
        </div>

        {/* Text Container: ID in bold + Status + Side Effects + Truncated Description */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="font-mono text-sm font-bold text-foreground group-hover:text-primary transition-colors tracking-tight"
              dir="ltr"
            >
              {tool.name}
            </span>

            {/* Installed / Equipped Status Badge */}
            {isEquipped ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.2 text-[0.65rem] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="size-2.5 text-emerald-500" />
                <span>مجهزة</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-1.5 py-0.2 text-[0.65rem] font-medium text-muted-foreground border border-border/60">
                <DownloadCloud className="size-2.5 opacity-70" />
                <span>متاحة</span>
              </span>
            )}

            {/* Side-effect Badge (Read vs Write) */}
            {isWrite ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.2 text-[0.65rem] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <Lock className="size-2.5" />
                <span>تنفيذ/كتابة</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 px-1.5 py-0.2 text-[0.65rem] font-bold text-sky-600 dark:text-sky-400 border border-sky-500/20">
                <Unlock className="size-2.5" />
                <span>استعلام/قراءة</span>
              </span>
            )}

            {/* Approval Badge */}
            {isSupervised ? (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-500/10 px-1.5 py-0.2 text-[0.65rem] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20 hidden sm:inline-flex">
                <ShieldAlert className="size-2.5" />
                <span>موافقة بشرية</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-500/10 px-1.5 py-0.2 text-[0.65rem] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hidden sm:inline-flex">
                <Zap className="size-2.5" />
                <span>تنفيذ ذاتي</span>
              </span>
            )}

            {/* Group Domain Tag */}
            <span className="rounded-md bg-muted/60 px-1.5 py-0.2 text-[0.65rem] font-semibold text-muted-foreground hidden md:inline-block">
              {groupMeta.labelAr}
            </span>

            {/* Source Protocol Tag */}
            {tool.source === "mcp" && (
              <span className="rounded-md bg-violet-500/10 px-1.5 py-0.2 text-[0.65rem] font-mono font-bold text-violet-600 dark:text-violet-400 border border-violet-500/20">
                MCP
              </span>
            )}
          </div>

          {/* Single-line truncated tool description (Image 1 Style) */}
          <p className="mt-0.5 text-xs text-muted-foreground truncate leading-snug">
            {tool.description || "أداة تنفيذية برمجية معتمدة للوكلاء."}
          </p>
        </div>
      </div>

      {/* Right: Agents stack + 1-Click Equip CTA / Toggle Switch + Actions */}
      <div
        className="flex items-center gap-2.5 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Equipped Agents indicator */}
        {equippedAgents.length > 0 && (
          <div
            className="hidden lg:flex items-center gap-1"
            title={equippedAgents.map((a) => a.name).join(", ")}
          >
            <div className="flex -space-x-1.5 space-x-reverse">
              {equippedAgents.slice(0, 3).map((a) => (
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

        {/* If NOT equipped, show direct 1-click Equip Button */}
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
            title="تجهيز الأداة فورياً للوكيل المناسب في هذا القطاع"
          >
            <Plus className="size-3" />
            <span>تجهيز</span>
          </Button>
        )}

        {/* Toggle Switch (Image 1 Style) */}
        <div className="flex items-center gap-1.5">
          <Switch
            checked={isEquipped}
            disabled={toggling}
            onCheckedChange={handleSwitchChange}
            aria-label={`تفعيل ${tool.name}`}
            title={
              isEquipped
                ? "مجهزة ومفعلة للوكلاء (انقر لإلغاء التجهيز)"
                : "غير مجهزة (انقر للتجهيز)"
            }
          />
        </div>

        {/* Quick Details / Inspect Icon Button */}
        <button
          type="button"
          onClick={() => onInspect(tool)}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
          title="فحص معطيات الأداة ومخطط المدخلات (Schema)"
        >
          <Eye className="size-4" />
        </button>

        {/* Sandbox Quick Test Button */}
        <button
          type="button"
          onClick={() => onTestSandbox(tool)}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors cursor-pointer"
          title="تشغيل تجريبي في الـ Sandbox"
        >
          <Play className="size-3.5" />
        </button>
      </div>
    </div>
  );
};
