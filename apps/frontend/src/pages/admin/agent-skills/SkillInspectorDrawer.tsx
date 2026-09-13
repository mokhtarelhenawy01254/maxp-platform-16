import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  Sparkles,
  ExternalLink,
  Play,
  Zap,
  Eye,
  FileText,
  Wrench,
  Users,
  ShieldAlert,
  ShieldCheck,
  Check,
  Loader2,
  Copy,
  Info,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  SkillDefinition,
  AgentDefinition,
  ToolDefinition,
  getSkillMeta,
  VERTICAL_CONFIG,
} from "./types";

interface SkillInspectorDrawerProps {
  skill: SkillDefinition | null;
  open: boolean;
  onClose: () => void;
  agents: AgentDefinition[];
  toolsMap: Map<string, ToolDefinition>;
  onAgentToggled: (agentId: string, enabled: boolean) => Promise<void>;
  companyId?: string;
}

// Lightweight custom markdown renderer
const parseInlineMarkdown = (text: string): React.ReactNode[] => {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-bold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 rounded bg-muted font-mono text-[0.75rem] text-primary"
          dir="ltr"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
};

const renderMarkdownInstructions = (text: string) => {
  if (!text) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground">
        لا يتوفر ملف SKILL.md مخصص لهذه المهارة بعد.
      </div>
    );
  }

  const lines = text.split("\n");
  const renderedElements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeContent: string[] = [];
  let codeLang = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        inCodeBlock = false;
        renderedElements.push(
          <div
            key={`code-${i}`}
            className="my-3 rounded-xl bg-zinc-950 p-3.5 border border-zinc-800 text-zinc-100 font-mono text-xs overflow-auto"
            dir="ltr"
          >
            {codeLang && (
              <div className="text-[10px] text-zinc-500 uppercase font-bold border-b border-zinc-800 pb-1 mb-2">
                {codeLang}
              </div>
            )}
            <pre className="whitespace-pre-wrap">{codeContent.join("\n")}</pre>
          </div>
        );
        codeContent = [];
        codeLang = "";
      } else {
        inCodeBlock = true;
        codeLang = line.trim().substring(3);
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent.push(line);
      continue;
    }

    if (line.startsWith("# ")) {
      renderedElements.push(
        <h1 key={`h1-${i}`} className="text-base font-extrabold text-foreground border-b border-border/60 pb-1.5 mt-4 mb-2">
          {parseInlineMarkdown(line.substring(2))}
        </h1>
      );
      continue;
    }

    if (line.startsWith("## ")) {
      renderedElements.push(
        <h2 key={`h2-${i}`} className="text-sm font-bold text-foreground mt-3.5 mb-1.5 text-primary">
          {parseInlineMarkdown(line.substring(3))}
        </h2>
      );
      continue;
    }

    if (line.startsWith("### ")) {
      renderedElements.push(
        <h3 key={`h3-${i}`} className="text-xs font-bold text-foreground/90 mt-2.5 mb-1">
          {parseInlineMarkdown(line.substring(4))}
        </h3>
      );
      continue;
    }

    if (line.startsWith("> ")) {
      renderedElements.push(
        <blockquote key={`bq-${i}`} className="border-r-3 border-primary bg-primary/5 px-3 py-2 rounded-l-md my-2 text-xs text-muted-foreground italic">
          {parseInlineMarkdown(line.substring(2))}
        </blockquote>
      );
      continue;
    }

    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      const cleanLine = line.trim().substring(2);
      renderedElements.push(
        <ul key={`ul-${i}`} className="list-disc list-inside mr-2 my-1 text-xs text-muted-foreground leading-relaxed">
          <li>{parseInlineMarkdown(cleanLine)}</li>
        </ul>
      );
      continue;
    }

    if (line.trim() === "") continue;

    renderedElements.push(
      <p key={`p-${i}`} className="text-xs text-muted-foreground leading-relaxed mb-2">
        {parseInlineMarkdown(line)}
      </p>
    );
  }

  return <div className="space-y-1">{renderedElements}</div>;
};

export const SkillInspectorDrawer: React.FC<SkillInspectorDrawerProps> = ({
  skill,
  open,
  onClose,
  agents,
  toolsMap,
  onAgentToggled,
  companyId,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"overview" | "tools" | "agents">("overview");
  const [togglingAgentId, setTogglingAgentId] = useState<string | null>(null);

  if (!skill) return null;

  const meta = getSkillMeta(skill);
  const verticalCfg = VERTICAL_CONFIG[meta.vertical] || VERTICAL_CONFIG.other;
  const isSupervised = skill.requiresHumanApproval || meta.isApprovalRequired;
  const allowedTools = skill.allowedTools || [];

  const handleToggleAgent = async (agent: AgentDefinition) => {
    const isCurrentlyAllowed = (agent.allowedSkills || []).includes(skill.id);
    setTogglingAgentId(agent.id);
    try {
      await onAgentToggled(agent.id, !isCurrentlyAllowed);
      toast.success(
        !isCurrentlyAllowed
          ? `تم تزويد الوكيل "${agent.name}" بالمهارة بنجاح`
          : `تم تعطيل المهارة عن الوكيل "${agent.name}"`
      );
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء تعديل حالة الوكيل");
    } finally {
      setTogglingAgentId(null);
    }
  };

  const handleOpenDedicatedPage = () => {
    navigate(`/admin/ai-hub/skills/${skill.id}`, {
      state: { skill, companyId },
    });
  };

  const handleLaunchSandbox = () => {
    navigate(`/admin/ai-hub?tab=sandbox&skill=${encodeURIComponent(skill.id)}`);
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="left"
        className="w-full sm:max-w-xl p-0 flex flex-col bg-background border-r border-border/80 shadow-2xl"
        dir="rtl"
      >
        {/* Top Header */}
        <SheetHeader className="border-b border-border/60 p-4 sm:p-5 bg-card/60 backdrop-blur-md">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">{verticalCfg.icon}</span>
              <div>
                <div className="flex items-center gap-2">
                  <SheetTitle className="text-base sm:text-lg font-black text-foreground">
                    {meta.titleAr}
                  </SheetTitle>
                  <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.65rem] text-muted-foreground">
                    v{skill.version || "1.0"}
                  </span>
                </div>
                <span className="font-mono text-xs text-muted-foreground block" dir="ltr">
                  {skill.id}
                </span>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground rounded-lg"
            >
              <X className="size-4" />
            </Button>
          </div>

          {/* Quick Action Badges Bar */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                {verticalCfg.labelAr}
              </span>

              {isSupervised ? (
                <Badge
                  variant="outline"
                  className="gap-1 border-amber-500/30 bg-amber-500/10 text-xs text-amber-600 dark:text-amber-400"
                >
                  <ShieldAlert className="size-3" />
                  <span>تتطلب موافقة التاجر</span>
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-600 dark:text-emerald-400"
                >
                  <Zap className="size-3" />
                  <span>تشغيل ذاتي (Autonomous)</span>
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="xs"
                onClick={handleOpenDedicatedPage}
                className="h-7 text-xs gap-1 border-border/80 hover:bg-muted"
                title="فتح الصفحة المخصصة للمهارة"
              >
                <ExternalLink className="size-3" />
                <span>صفحة كاملة</span>
              </Button>

              <Button
                variant="default"
                size="xs"
                onClick={handleLaunchSandbox}
                className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs"
                title="تجربة المهارة داخل الـ Sandbox"
              >
                <Play className="size-3 fill-current" />
                <span>اختبار في الـ Sandbox</span>
              </Button>
            </div>
          </div>

          {/* Sub-Navigation Tabs */}
          <div className="mt-4 flex rounded-xl bg-muted/60 p-1 border border-border/60">
            <button
              onClick={() => setActiveTab("overview")}
              className={cn(
                "flex-1 rounded-lg py-1.5 text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                activeTab === "overview"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <FileText className="size-3.5" />
              <span>التعليمات (SKILL.md)</span>
            </button>
            <button
              onClick={() => setActiveTab("tools")}
              className={cn(
                "flex-1 rounded-lg py-1.5 text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                activeTab === "tools"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Wrench className="size-3.5" />
              <span>الأدوات المسموحة ({allowedTools.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("agents")}
              className={cn(
                "flex-1 rounded-lg py-1.5 text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                activeTab === "agents"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className="size-3.5" />
              <span>الوكلاء المجهزون</span>
            </button>
          </div>
        </SheetHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Trigger Alert */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs">
                <div className="flex items-start gap-2">
                  <span className="text-base">🎯</span>
                  <div>
                    <h4 className="font-bold text-primary mb-0.5">متى يستدعي الوكيل هذه المهارة تلقائياً؟</h4>
                    <p className="text-muted-foreground">{meta.triggerAr}</p>
                  </div>
                </div>
              </div>

              {/* Commercial Description */}
              <div>
                <h4 className="text-xs font-bold text-foreground mb-1">الهدف التجاري والتشغيلي:</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {meta.descAr}
                </p>
              </div>

              {/* SKILL.md Markdown Content */}
              <div className="rounded-xl border border-border/80 bg-card p-4">
                <h4 className="text-xs font-mono font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2 border-b border-border/60 pb-2">
                  <FileText className="size-3.5 text-primary" />
                  <span>محتوى ملف التعليمات (Prompt Rules)</span>
                </h4>
                {renderMarkdownInstructions(skill.skillMd || "")}
              </div>
            </div>
          )}

          {activeTab === "tools" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                الأدوات التي يمتلك الوكيل صلاحية استدعائها عند تفعيل هذه المهارة:
              </p>

              {allowedTools.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
                  لا تتطلب هذه المهارة استدعاء أدوات خارجية (توجيه سلوكي خالص).
                </div>
              ) : (
                allowedTools.map((tName) => {
                  const toolDef = toolsMap.get(tName);
                  const isWrite = toolDef?.sideEffects === "write";
                  const reqApproval = toolDef?.requiresApproval;

                  return (
                    <div
                      key={tName}
                      className="flex flex-col gap-1.5 rounded-xl border border-border/70 bg-card p-3.5 hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "flex size-6 items-center justify-center rounded-lg text-xs",
                            isWrite ? "bg-amber-500/10 text-amber-600" : "bg-blue-500/10 text-blue-600"
                          )}>
                            {isWrite ? <Zap className="size-3" /> : <Eye className="size-3" />}
                          </div>
                          <span className="font-mono text-xs font-bold text-foreground" dir="ltr">
                            {tName}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          {isWrite ? (
                            <Badge variant="outline" className="h-5 text-[0.65rem] border-amber-500/30 text-amber-600">
                              إجراء وتنفيذ
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="h-5 text-[0.65rem] border-blue-500/30 text-blue-600">
                              قراءة واستعلام
                            </Badge>
                          )}

                          {reqApproval && (
                            <Badge variant="outline" className="h-5 text-[0.65rem] border-rose-500/30 text-rose-600">
                              موافقة التاجر
                            </Badge>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                        {toolDef?.description || "أداة ذكية مدمجة في مسار الذكاء الاصطناعي."}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === "agents" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                قم بتفعيل أو تعطيل هذه المهارة لكل وكيل بنقرة واحدة:
              </p>

              {agents.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
                  لا يوجد وكلاء مسجلون لهذه المنشأة بعد.
                </div>
              ) : (
                agents.map((agent) => {
                  const isEquipped = (agent.allowedSkills || []).includes(skill.id);
                  const isBusy = togglingAgentId === agent.id;

                  return (
                    <div
                      key={agent.id}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-xl border p-3 transition-all",
                        isEquipped
                          ? "border-primary/40 bg-primary/5"
                          : "border-border/70 bg-card hover:bg-muted/40"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-background border text-lg shadow-2xs">
                          {agent.icon || "🤖"}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-foreground truncate">{agent.name}</p>
                          <span className="text-[0.7rem] text-muted-foreground block truncate">{agent.role}</span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant={isEquipped ? "default" : "outline"}
                        disabled={isBusy}
                        onClick={() => handleToggleAgent(agent)}
                        className={cn(
                          "h-8 text-xs font-bold transition-all",
                          isEquipped
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "border-border/80 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {isBusy ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : isEquipped ? (
                          <>
                            <Check className="size-3.5 ml-1" />
                            <span>مجهز بالمهارة</span>
                          </>
                        ) : (
                          <span>تجهيز الوكيل</span>
                        )}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
