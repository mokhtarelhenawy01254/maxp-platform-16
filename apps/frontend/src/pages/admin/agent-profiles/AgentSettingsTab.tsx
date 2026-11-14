import React from "react";
import { useTranslation } from "react-i18next";
import { Zap, Sparkles, Gauge, Scale, Brain, Cpu, Flame } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface AgentSettingsTabProps {
  editing: boolean;
  draftName: string;
  setDraftName: (val: string) => void;
  draftDescription: string;
  setDraftDescription: (val: string) => void;
  draftConfig: Record<string, string>;
  setDraftConfig: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  draftFiles: Record<string, string>;
  setDraftFiles: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  agentId?: string;
  agentIcon?: string;
}

export default function AgentSettingsTab({
  editing,
  draftName,
  setDraftName,
  draftDescription,
  setDraftDescription,
  draftConfig,
  setDraftConfig,
  draftFiles,
  setDraftFiles,
}: AgentSettingsTabProps) {
  const { t } = useTranslation();

  const toneOptions = [
    { key: "friendly", label: t("agentProfiles.settings.toneFriendly", "ودود") },
    { key: "formal", label: t("agentProfiles.settings.toneFormal", "رسمي") },
    { key: "concise", label: t("agentProfiles.settings.toneConcise", "مختصر") },
    { key: "detailed", label: t("agentProfiles.settings.toneDetailed", "مفصل") },
  ];

  const reasoningOptions = [
    {
      key: "none",
      label: t("agentProfiles.settings.reasoningNone", "فوري (بدون تفكير)"),
      desc: t("agentProfiles.settings.reasoningNoneDesc", "إيقاف التفكير تماماً — استجابة فائقة السرعة (< ثانية واحدة) لخدمة العملاء والردود المباشرة"),
      icon: Zap,
      badge: "0 Token",
    },
    {
      key: "minimal",
      label: t("agentProfiles.settings.reasoningMinimal", "تدقيق خاطف"),
      desc: t("agentProfiles.settings.reasoningMinimalDesc", "استدلال خفيف جداً لتصنيف النوايا والتحقق السريع من المدخلات بدون استهلاك توكنز"),
      icon: Sparkles,
      badge: "~1K",
    },
    {
      key: "low",
      label: t("agentProfiles.settings.reasoningLow", "تفكير سريع وموجز"),
      desc: t("agentProfiles.settings.reasoningLowDesc", "تفكير موجز للتحقق من المنتجات، بيانات الشحن، والأسئلة الشائعة"),
      icon: Gauge,
      badge: "~2K",
    },
    {
      key: "medium",
      label: t("agentProfiles.settings.reasoningMedium", "تفكير متزن"),
      desc: t("agentProfiles.settings.reasoningMediumDesc", "استدلال متوازن للقرارات متعددة الخطوات وفحص الخصومات وسياسات الاسترجاع"),
      icon: Scale,
      badge: "~4K",
    },
    {
      key: "high",
      label: t("agentProfiles.settings.reasoningHigh", "استدلال عميق"),
      desc: t("agentProfiles.settings.reasoningHighDesc", "تحليل منطقي مكثف وحسابات دقيقة للميديا باير، نسب العائد، ومطابقة البيانات المعقدة"),
      icon: Brain,
      badge: "~8K",
    },
    {
      key: "xhigh",
      label: t("agentProfiles.settings.reasoningXHigh", "استدلال فائق"),
      desc: t("agentProfiles.settings.reasoningXHighDesc", "سلاسل تفكير موسعة لحل النزاعات المالية، تسوية المخزون المتشابك، وتخطيط مسارات العمل"),
      icon: Cpu,
      badge: "~16K",
    },
    {
      key: "max",
      label: t("agentProfiles.settings.reasoningMax", "أقصى استدلال منطقي"),
      desc: t("agentProfiles.settings.reasoningMaxDesc", "أقصى ميزانية استدلال ممكنة للنموذج — مخصص للتدقيق المالي الشامل والعمليات الحساسة"),
      icon: Flame,
      badge: "~32K+",
    },
  ];

  const currentToneKey = draftConfig.soul_tone || "friendly";
  const currentToneLabel = toneOptions.find((o) => o.key === currentToneKey)?.label || currentToneKey;

  const currentReasoningKey = draftConfig.reasoning_effort || "none";
  const currentReasoningOpt = reasoningOptions.find((o) => o.key === currentReasoningKey) || reasoningOptions[0];

  const handleToneChange = (key: string) => {
    setDraftConfig((prev) => ({ ...prev, soul_tone: key }));
  };

  const handleReasoningChange = (key: string) => {
    setDraftConfig((prev) => ({ ...prev, reasoning_effort: key }));
  };

  const handleCustomInstructionsChange = (val: string) => {
    setDraftFiles((prev) => ({ ...prev, "PERSONA.md": val }));
  };

  return (
    <div className="max-w-3xl space-y-4 sm:space-y-6">
      {/* ── Settings Form ── */}
      <div className="rounded-xl border border-border/60 bg-card p-3.5 sm:p-5 space-y-4 sm:space-y-5 shadow-sm">
        {!editing ? (
          <div className="space-y-4 sm:space-y-5">
            {/* اسم الوكيل */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                {t("agentProfiles.settings.agentName", "اسم الوكيل")}
              </label>
              <p className={`text-sm font-medium ${draftName ? "text-foreground" : "text-muted-foreground/40 italic"}`}>
                {draftName || "—"}
              </p>
            </div>

            <hr className="border-t border-border/40" />

            {/* وصف الوكيل ودوره */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                {t("agentProfiles.settings.description", "وصف الوكيل ودوره")}
              </label>
              <p className={`text-sm leading-relaxed ${draftDescription ? "text-foreground/90" : "text-muted-foreground/40 italic"}`}>
                {draftDescription || "—"}
              </p>
            </div>

            <hr className="border-t border-border/40" />

            {/* أسلوب ونبرة الرد */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                {t("agentProfiles.settings.tone", "نبرة الرد")}
              </label>
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary">
                {currentToneLabel}
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                {t("agentProfiles.settings.toneHint", "تحدد الأسلوب العام الذي يتبعه الوكيل عند الرد على العملاء")}
              </p>
            </div>

            <hr className="border-t border-border/40" />

            {/* مستوى التفكير والاستدلال */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                {t("agentProfiles.settings.reasoningTitle", "مستوى التفكير والاستدلال المنطقي (DeepSeek Flash 4)")}
              </label>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                  <currentReasoningOpt.icon className="size-3.5" />
                  <span>{currentReasoningOpt.label}</span>
                  <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded font-mono">
                    {currentReasoningOpt.badge}
                  </span>
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {currentReasoningOpt.desc}
              </p>
            </div>

            <hr className="border-t border-border/40" />

            {/* التعليمات والتوجيهات الخاصة بالمتجر */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                {t("agentProfiles.settings.personaLabel", "تعليمات وتوجيهات خاصة بالمتجر")}
              </label>
              <p className={`text-sm whitespace-pre-wrap leading-relaxed ${draftFiles["PERSONA.md"] ? "text-foreground/90" : "text-muted-foreground/40 italic"}`}>
                {draftFiles["PERSONA.md"] || "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("agentProfiles.settings.personaOverrideHint", "تعليمات إضافية يلتزم بها الوكيل في ردوده لتعكس سياسة متجرك الخاصة")}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-5">
            {/* اسم الوكيل */}
            <div>
              <label htmlFor="agent-name-input" className="block text-xs font-semibold text-foreground mb-1.5">
                {t("agentProfiles.settings.agentName", "اسم الوكيل")}
              </label>
              <Input
                id="agent-name-input"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder={t("agentProfiles.settings.agentNamePlaceholder", "أدخل اسم الوكيل")}
                className="h-10 sm:h-9 text-base sm:text-sm"
              />
            </div>

            <hr className="border-t border-border/40" />

            {/* وصف الوكيل */}
            <div>
              <label htmlFor="agent-desc-input" className="block text-xs font-semibold text-foreground mb-1.5">
                {t("agentProfiles.settings.description", "وصف الوكيل ودوره")}
              </label>
              <Input
                id="agent-desc-input"
                value={draftDescription}
                onChange={(e) => setDraftDescription(e.target.value)}
                placeholder={t("agentProfiles.settings.descriptionPlaceholder", "وصف مختصر للوكيل ودوره في المتجر")}
                className="h-10 sm:h-9 text-base sm:text-sm"
              />
            </div>

            <hr className="border-t border-border/40" />

            {/* نبرة الرد */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                {t("agentProfiles.settings.tone", "نبرة الرد")}
              </label>
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5 bg-muted/40 p-1 rounded-lg w-full sm:w-fit border border-border/40">
                {toneOptions.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    className={`px-3 py-2 sm:py-1.5 min-h-[38px] sm:min-h-[32px] rounded-md text-xs font-medium transition-all cursor-pointer flex items-center justify-center ${
                      currentToneKey === opt.key
                        ? "bg-background text-foreground shadow-sm font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => handleToneChange(opt.key)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t("agentProfiles.settings.toneHint", "تحدد الأسلوب العام الذي يتبعه الوكيل عند الرد على العملاء")}
              </p>
            </div>

            <hr className="border-t border-border/40" />

            {/* مستوى التفكير والاستدلال */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                {t("agentProfiles.settings.reasoningTitle", "مستوى التفكير والاستدلال المنطقي (DeepSeek Flash 4)")}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 w-full">
                {reasoningOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = currentReasoningKey === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      className={`p-2.5 rounded-lg border text-start transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/30"
                          : "border-border/60 bg-muted/20 hover:border-border hover:bg-muted/40"
                      }`}
                      onClick={() => handleReasoningChange(opt.key)}
                    >
                      <div className="flex items-center justify-between gap-1.5 mb-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Icon className={`size-3.5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                          <span className={`text-xs font-semibold truncate ${isSelected ? "text-primary" : "text-foreground"}`}>
                            {opt.label}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                          {opt.badge}
                        </span>
                      </div>
                      <p className="text-[0.7rem] text-muted-foreground leading-snug">
                        {opt.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {t("agentProfiles.settings.reasoningHint", "يحدد عمق تفكير النموذج وميزانية التوكنز المخصصة للاستدلال قبل إصدار الرد أو تنفيذ القرارات")}
              </p>
            </div>

            <hr className="border-t border-border/40" />

            {/* التعليمات والتوجيهات الخاصة بالمتجر */}
            <div>
              <label htmlFor="custom-instructions-input" className="block text-xs font-semibold text-foreground mb-1.5">
                {t("agentProfiles.settings.personaLabel", "تعليمات وتوجيهات خاصة بالمتجر")}
              </label>
              <Textarea
                id="custom-instructions-input"
                value={draftFiles["PERSONA.md"] || ""}
                onChange={(e) => handleCustomInstructionsChange(e.target.value)}
                placeholder={t("agentProfiles.settings.personaPlaceholder", "اكتب أي توجيهات إضافية تريد من الوكيل الالتزام بها (مثال: ركز على العروض، لا تعرض تقسيط، كلم العميل بلباقة...)")}
                className="text-base sm:text-sm min-h-[120px] sm:min-h-[130px] resize-y leading-relaxed"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("agentProfiles.settings.personaOverrideHint", "تعليمات إضافية يلتزم بها الوكيل في ردوده لتعكس سياسة متجرك الخاصة")}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
