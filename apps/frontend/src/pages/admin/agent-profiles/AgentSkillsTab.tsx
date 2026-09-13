import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Zap,
  Search,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AgentSkillDetail } from "../ai-agent-sandbox/services/sandboxApi";

interface AgentSkillsTabProps {
  skills: AgentSkillDetail[];
  agentId: string;
  agentName: string;
  onRefresh?: () => void;
}

function ToolChip({ name }: { name: string }) {
  const isWrite =
    name.includes("create") ||
    name.includes("update") ||
    name.includes("delete") ||
    name.includes("send") ||
    name.includes("cancel") ||
    name.includes("refund");

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono border",
        isWrite
          ? "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400"
          : "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400"
      )}
    >
      {name}
    </span>
  );
}

function SkillCard({ skill }: { skill: AgentSkillDetail }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const tools = Array.isArray(skill.allowedTools) ? skill.allowedTools : [];
  const requiresApproval =
    Boolean((skill as { requiresHumanApproval?: boolean }).requiresHumanApproval) ||
    skill.id.includes("finance") ||
    skill.id.includes("order_cancel");

  return (
    <div
      className={cn(
        "rounded-xl border transition-all duration-200 overflow-hidden bg-card",
        expanded ? "border-primary/40 shadow-sm" : "border-border/70 hover:border-border"
      )}
    >
      {/* Skill Card Header */}
      <div
        onClick={() => setExpanded((p) => !p)}
        className="p-4 flex items-start justify-between gap-3 cursor-pointer select-none bg-card hover:bg-muted/30 transition-colors"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded((p) => !p);
          }
        }}
      >
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="size-9 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
            <Zap className="size-4" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-foreground truncate">
                {skill.displayName || skill.id}
              </h3>
              <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 h-4">
                {skill.id}
              </Badge>
              {requiresApproval ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  <ShieldAlert className="size-3" />
                  {t("agentProfiles.skills.requiresApproval", "يتطلب موافقة")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="size-3" />
                  {t("agentProfiles.skills.autonomous", "تنفيذ تلقائي")}
                </span>
              )}
            </div>
            {skill.description ? (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {skill.description}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground/60 italic">
                {t("agentProfiles.skills.noDesc", "لا يوجد وصف محدد لهذه المهارة")}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground font-medium hidden sm:inline-block">
            {tools.length} {t("agentProfiles.skills.toolsCount", "أدوات")}
          </span>
          <div className="size-7 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground">
            {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-border/50 p-4 space-y-4 bg-muted/10 text-xs">
          {/* Instructions snippet */}
          {skill.instructions && (
            <div>
              <label className="block font-semibold text-muted-foreground uppercase tracking-wider text-[10px] mb-1.5">
                {t("agentProfiles.skills.instructions", "توجيهات وسير عمل المهارة")}
              </label>
              <pre className="p-3 rounded-lg bg-card border border-border/60 text-foreground/90 whitespace-pre-wrap font-sans text-xs leading-relaxed max-h-48 overflow-y-auto">
                {skill.instructions}
              </pre>
            </div>
          )}

          {/* Tools required by this skill */}
          <div>
            <label className="block font-semibold text-muted-foreground uppercase tracking-wider text-[10px] mb-1.5">
              {t("agentProfiles.skills.toolsUsed", "الأدوات المرتبطة بهذه المهارة")} ({tools.length})
            </label>
            {tools.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {tools.map((tName) => (
                  <ToolChip key={tName} name={tName} />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground/60 italic">
                {t("agentProfiles.skills.noTools", "لا تتطلب هذه المهارة أدوات خارجية")}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AgentSkillsTab({ skills, agentName }: AgentSkillsTabProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSkills = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return skills;
    return skills.filter(
      (s) =>
        s.displayName?.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.allowedTools?.some((tool) => tool.toLowerCase().includes(q))
    );
  }, [skills, searchQuery]);

  return (
    <div className="max-w-4xl space-y-5">
      {/* ── Toolbar: Search & Action ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/50 pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("agentProfiles.skills.searchPlaceholder", "بحث في المهارات والأدوات...")}
            className="h-8 pr-8 text-xs bg-card"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/admin/ai-hub?tab=skills")}
            className="h-8 text-xs gap-1.5 bg-card"
          >
            <SlidersHorizontal className="size-3 text-indigo-500" />
            <span>{t("agentProfiles.skills.manageSkills", "إدارة المهارات")}</span>
            <ExternalLink className="size-3 opacity-60 ml-0.5" />
          </Button>
        </div>
      </div>

      {/* ── Skills Count / Summary ── */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          {t("agentProfiles.skills.totalCount", "إجمالي المهارات المخصصة للوكيل:")}{" "}
          <strong className="text-foreground">{skills.length}</strong>
        </span>
        {searchQuery && (
          <span>
            {t("agentProfiles.skills.filteredCount", "النتائج المطابقة:")}{" "}
            <strong className="text-foreground">{filteredSkills.length}</strong>
          </span>
        )}
      </div>

      {/* ── Skills List / Empty State ── */}
      {filteredSkills.length > 0 ? (
        <div className="space-y-3">
          {filteredSkills.map((skill) => (
            <SkillCard key={skill.id} skill={skill} />
          ))}
        </div>
      ) : skills.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-card/50 p-8 text-center space-y-3">
          <div className="size-12 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <Sparkles className="size-6" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h4 className="text-sm font-bold text-foreground">
              {t("agentProfiles.skills.emptyTitle", "لا توجد مهارات مخصصة")}
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t(
                "agentProfiles.skills.emptyDesc",
                `لم يتم تعيين أي مهارات لـ ${agentName} حتى الآن. يمكنك تزويده بمهارات من مركز المهارات.`
              )}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => navigate("/admin/ai-hub?tab=skills")}
            className="h-8 text-xs gap-1.5"
          >
            <Zap className="size-3" />
            {t("agentProfiles.skills.assignSkills", "تخصيص مهارات للوكيل")}
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
          {t("agentProfiles.skills.noMatch", "لا توجد مهارات مطابقة لبحثك.")}
        </div>
      )}
    </div>
  );
}
