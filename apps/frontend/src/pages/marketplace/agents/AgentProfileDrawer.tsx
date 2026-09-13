/**
 * AgentProfileDrawer.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Executive Dossier & Live Execution Simulator Drawer.
 * Slides over smoothly from the right (RTL compliant) providing a deep
 * audit of the agent's capabilities, governance bounds, and reasoning loop.
 * 
 * Strict 2026 Anti-AI-Slop compliance:
 * - Zero Emojis
 * - Terminal stream showing real tool execution
 * - Hard telemetry & unit economics
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from "react";
import {
  X,
  Cpu,
  Activity,
  ShieldCheck,
  Zap,
  Terminal,
  Play,
  RotateCcw,
  Check,
  Lock,
  Layers,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { AgentListing } from "./agentMarketplaceData";

interface AgentProfileDrawerProps {
  agent: AgentListing | null;
  open: boolean;
  onClose: () => void;
  onHire: (agent: AgentListing) => void;
  isHired?: boolean;
}

export const AgentProfileDrawer: React.FC<AgentProfileDrawerProps> = ({
  agent,
  open,
  onClose,
  onHire,
  isHired = false,
}) => {
  const [simulationStep, setSimulationStep] = useState<number>(0);
  const [simulating, setSimulating] = useState<boolean>(false);

  if (!open || !agent) return null;

  const isPro = agent.tier === "pro";

  const handleRunSimulation = () => {
    setSimulating(true);
    setSimulationStep(0);
    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      if (current >= agent.dossier.executionStream.length) {
        setSimulationStep(agent.dossier.executionStream.length - 1);
        setSimulating(false);
        clearInterval(interval);
      } else {
        setSimulationStep(current);
      }
    }, 600);
  };

  const handleResetSimulation = () => {
    setSimulationStep(0);
    setSimulating(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="agent-dossier-title"
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex h-full w-full max-w-xl flex-col bg-background border-s border-border shadow-2xl transition-transform duration-200 overflow-hidden text-start select-none"
      >
        {/* ── Top Header Bar ── */}
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4 bg-muted/20">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              الملف الوظيفي التنفيذي (Dossier)
            </span>
            <span className="size-1.5 rounded-full bg-emerald-500" />
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground active:scale-[0.97] transition-all"
            aria-label="إغلاق الملف"
          >
            <X className="size-4 stroke-[1.5]" />
          </button>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Hero Profile Block */}
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <div className="size-20 overflow-hidden rounded-2xl border border-border bg-muted shadow-md">
                <img
                  src={agent.avatarUrl}
                  alt={agent.name}
                  className="size-full object-cover contrast-125"
                />
              </div>
              <span className="absolute -bottom-1 -left-1 flex size-4 items-center justify-center rounded-full border-2 border-background bg-emerald-500 shadow-sm" />
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id="agent-dossier-title" className="text-xl font-bold tracking-tight text-foreground">
                  {agent.name}
                </h2>
                {isPro ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                    <Sparkles className="size-3 stroke-[1.5]" />
                    <span>تخصصي Pro</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                    <Check className="size-3 stroke-[1.5]" />
                    <span>أساسي متضمن</span>
                  </span>
                )}
              </div>

              <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                {agent.position}
              </p>

              {isPro ? (
                <div className="text-xs font-semibold tabular-nums text-foreground pt-1">
                  {agent.priceMonthly}&nbsp;<span className="text-[11px] font-normal text-muted-foreground">{agent.currency || "ج.م"}/شهرياً</span>
                </div>
              ) : (
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 pt-1">
                  مشمول مجاناً في باقة اشتراك المنصة
                </div>
              )}
            </div>
          </div>

          {/* Hard Telemetry Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-xl border border-border/60 bg-muted/30 p-3">
            <div>
              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Cpu className="size-3 opacity-70 stroke-[1.5]" />
                <span>المحرك الأساسي</span>
              </div>
              <div className="text-xs font-semibold text-foreground mt-0.5">
                {agent.telemetry.engine}
              </div>
            </div>

            <div>
              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Activity className="size-3 opacity-70 stroke-[1.5]" />
                <span>زمن المعالجة (P95)</span>
              </div>
              <div className="text-xs font-semibold tabular-nums text-foreground mt-0.5">
                {agent.telemetry.p95Latency}
              </div>
            </div>

            <div>
              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="size-3 opacity-70 stroke-[1.5]" />
                <span>دقة المهام</span>
              </div>
              <div className="text-xs font-semibold tabular-nums text-foreground mt-0.5">
                {agent.telemetry.taskPrecision}
              </div>
            </div>

            <div>
              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Layers className="size-3 opacity-70 stroke-[1.5]" />
                <span>سعة الذاكرة</span>
              </div>
              <div className="text-xs font-semibold text-foreground mt-0.5">
                {agent.telemetry.contextWindow}
              </div>
            </div>
          </div>

          {/* Operational Bio & Persona */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              السيرة المهنية وأسلوب التواصل
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {agent.dossier.bio}
            </p>
            <div className="rounded-lg border border-border/40 bg-card p-3 space-y-1 text-xs">
              <div className="flex gap-2">
                <span className="font-semibold text-foreground shrink-0">الشخصية:</span>
                <span className="text-muted-foreground">{agent.dossier.persona}</span>
              </div>
              <div className="flex gap-2">
                <span className="font-semibold text-foreground shrink-0">اللهجة:</span>
                <span className="text-muted-foreground">{agent.dossier.dialect}</span>
              </div>
            </div>
          </div>

          {/* Superpower Tool Arsenal */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              ترسانة الأدوات وصلاحيات النظام (Authorized Tool Arsenal)
            </h3>
            <div className="grid grid-cols-1 gap-1.5">
              {agent.tools.map((tool, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2 font-mono text-[11px] text-foreground">
                    <Zap className="size-3 text-primary stroke-[1.5]" />
                    <span>{tool}</span>
                  </div>
                  <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    صلاحية مؤكدة
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Governance & Boundaries */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="size-3 stroke-[1.5] text-amber-500" />
              <span>حدود الأمان الصارمة (Governance Boundaries)</span>
            </h3>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-2 text-xs">
              {agent.dossier.boundaries.map((boundary, idx) => (
                <div key={idx} className="flex items-start gap-2 text-muted-foreground">
                  <span className="text-amber-500 text-xs shrink-0 font-bold">•</span>
                  <span>{boundary}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Live Execution Simulator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="size-3.5 stroke-[1.5]" />
                <span>المحاكاة الحية لسجل التفكير (Reasoning Stream)</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRunSimulation}
                  disabled={simulating}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline disabled:opacity-50"
                >
                  <Play className="size-3 stroke-[1.5]" />
                  <span>تشغيل المحاكاة</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetSimulation}
                  className="inline-flex items-center text-muted-foreground hover:text-foreground"
                  title="إعادة تعيين"
                  aria-label="إعادة تعيين المحاكاة"
                >
                  <RotateCcw className="size-3 stroke-[1.5]" />
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-[#0a0a0c] p-3 font-mono text-[11px] text-gray-300 space-y-2 shadow-inner">
              <div className="flex items-center justify-between pb-2 border-b border-white/10 text-[10px] text-gray-500">
                <span>EXECUTION_TRACER: {agent.slug}</span>
                <span>STATUS: {simulating ? "PROCESSING…" : "IDLE"}</span>
              </div>

              <div className="space-y-1.5 min-h-[140px]">
                {agent.dossier.executionStream.slice(0, simulationStep + 1).map((step, idx) => (
                  <div key={idx} className="space-y-0.5 animate-fadeIn">
                    <div className="text-[10px] text-gray-400 font-semibold">{step.step}</div>
                    <div
                      className={`ps-2 text-[11px] ${
                        step.type === "tool"
                          ? "text-blue-400"
                          : step.type === "output"
                          ? "text-emerald-400 font-sans"
                          : "text-amber-300/90 italic"
                      }`}
                    >
                      &gt; {step.action}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Sticky Bottom Action Bar ── */}
        <div className="border-t border-border/60 bg-background px-6 py-4 flex items-center justify-between gap-4 shadow-lg">
          <div>
            <div className="text-[11px] text-muted-foreground">حالة التعيين بالشركة</div>
            <div className="text-xs font-semibold text-foreground">
              {isHired ? "معيّن بالفعل في فريقك" : "جاهز للتوظيف الفوري"}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onHire(agent)}
            disabled={isHired}
            className={`flex items-center justify-center gap-2 h-10 px-6 rounded-xl text-xs font-bold active:scale-[0.97] transition-all duration-160 shadow-md ${
              isHired
                ? "bg-muted text-muted-foreground border border-border cursor-not-allowed"
                : isPro
                ? "bg-foreground text-background hover:bg-foreground/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {isHired ? (
              <>
                <Check className="size-4 stroke-[2]" />
                <span>مُعيّن في حسابك</span>
              </>
            ) : (
              <>
                <span>توظيف الإيجنت في فريقي</span>
                <ExternalLink className="size-3.5 stroke-[1.5]" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
