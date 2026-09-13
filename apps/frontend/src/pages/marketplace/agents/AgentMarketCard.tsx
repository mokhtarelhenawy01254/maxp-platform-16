/**
 * AgentMarketCard.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Machined 2026 Digital Workforce Card Component.
 * Engineered to strict Anti-AI-Slop standards:
 * - Zero Emojis (Pure typographic & precision vector icons: strokeWidth 1.25)
 * - Micro-typography: text-wrap: balance, tabular-nums, proper typographical glyphs
 * - Machined tactile chassis: Concentric radii, inner specular highlights
 * - Physical interaction: active:scale-[0.97] on press
 * - Clear Free Core vs Pro Specialist economic contrast
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from "react";
import { 
  Cpu, 
  Activity, 
  ArrowUpRight, 
  ShieldCheck, 
  Zap, 
  Check, 
  Layers,
  Sparkles
} from "lucide-react";
import { AgentListing, getArabicInitials } from "./agentMarketplaceData";

interface AgentMarketCardProps {
  agent: AgentListing;
  onViewProfile: (agent: AgentListing) => void;
  onHire: (agent: AgentListing) => void;
  isHired?: boolean;
}

export const AgentMarketCard: React.FC<AgentMarketCardProps> = ({
  agent,
  onViewProfile,
  onHire,
  isHired = false,
}) => {
  const [imgError, setImgError] = useState(false);
  const isPro = agent.tier === "pro";

  return (
    <div
      onClick={() => onViewProfile(agent)}
      className="group relative flex flex-col justify-between rounded-2xl border border-border/60 bg-card/75 p-5 transition-all duration-200 hover:border-border hover:bg-card hover:shadow-lg dark:bg-card/40 dark:hover:bg-card/70 dark:border-white/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] cursor-pointer text-start select-none"
    >
      {/* ── Top Row: Avatar + Status + Tier ── */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="relative shrink-0">
            <div className="relative size-14 overflow-hidden rounded-xl border border-border/80 bg-muted/50 shadow-sm">
              {imgError ? (
                <div className="size-full flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-950 text-white font-bold text-sm tracking-wider select-none border border-white/10 shadow-inner">
                  <span>{getArabicInitials(agent.name)}</span>
                </div>
              ) : (
                <img
                  src={agent.avatarUrl}
                  alt={agent.name}
                  onError={() => setImgError(true)}
                  className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              )}
            </div>
            <span
              className="absolute -bottom-1 -left-1 flex size-3.5 items-center justify-center rounded-full border-2 border-card bg-emerald-500 shadow-sm"
              title="نشط وجاهز للعمل الفوري"
              aria-label="جاهز للعمل"
            />
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {/* Pricing Tier Chip */}
            {isPro ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                <Sparkles className="size-3 stroke-[1.5]" aria-hidden="true" />
                <span>تخصصي Pro</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                <Check className="size-3 stroke-[1.5]" aria-hidden="true" />
                <span>أساسي متضمن</span>
              </span>
            )}

            {/* Price tag */}
            <div className="text-end">
              {isPro ? (
                <div className="text-xs font-semibold tabular-nums text-foreground">
                  {agent.priceMonthly}&nbsp;<span className="text-[10px] font-normal text-muted-foreground">{agent.currency || "ج.م"}/شهر</span>
                </div>
              ) : (
                <div className="text-[11px] font-medium text-muted-foreground">
                  مجاناً مع الباقة
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Identity & Position ── */}
        <div className="mb-3 space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold tracking-tight text-foreground text-wrap-balance group-hover:text-primary transition-colors">
              {agent.name}
            </h3>
            {agent.featured && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground uppercase tracking-wider">
                Elite
              </span>
            )}
          </div>
          <p className="text-xs font-medium text-muted-foreground line-clamp-1">
            {agent.position}
          </p>
        </div>

        {/* ── Summary ── */}
        <p className="text-xs text-muted-foreground/90 leading-relaxed line-clamp-2 mb-4">
          {agent.summary}
        </p>

        {/* ── Superpower Tools Arsenal ── */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {agent.tools.slice(0, 3).map((tool, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground border border-border/40 truncate max-w-[200px]"
            >
              <Zap className="size-2.5 shrink-0 opacity-70 stroke-[1.5]" aria-hidden="true" />
              <span className="truncate">{tool}</span>
            </span>
          ))}
          {agent.tools.length > 3 && (
            <span className="inline-flex items-center rounded-md bg-muted/30 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground border border-border/30">
              +{agent.tools.length - 3}
            </span>
          )}
        </div>
      </div>

      {/* ── Bottom Section: Hard Telemetry & Action Bar ── */}
      <div className="pt-3 border-t border-border/40">
        {/* Telemetry Row */}
        <div className="grid grid-cols-3 gap-2 py-2 mb-3 text-[10px] font-medium text-muted-foreground bg-muted/30 rounded-lg px-2.5 border border-border/20">
          <div className="flex flex-col">
            <span className="text-[9px] opacity-70 flex items-center gap-1">
              <Cpu className="size-2.5 stroke-[1.5]" aria-hidden="true" />
              المحرك
            </span>
            <span className="font-semibold text-foreground truncate mt-0.5">
              {agent.telemetry.engine}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[9px] opacity-70 flex items-center gap-1">
              <Activity className="size-2.5 stroke-[1.5]" aria-hidden="true" />
              الكمون
            </span>
            <span className="font-semibold text-foreground tabular-nums mt-0.5">
              {agent.telemetry.p95Latency}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[9px] opacity-70 flex items-center gap-1">
              <ShieldCheck className="size-2.5 stroke-[1.5]" aria-hidden="true" />
              الحوكمة
            </span>
            <span className="font-semibold text-foreground truncate mt-0.5">
              {agent.telemetry.governance === "human_in_loop" ? "مسودات آمنة" : "تنفيذ ذاتي"}
            </span>
          </div>
        </div>

        {/* Action Bar (Haptic Touch Buttons) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewProfile(agent);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-background text-xs font-medium text-foreground hover:bg-muted/80 active:scale-[0.97] transition-all duration-160 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            aria-label={`عرض السيرة التشغيلية لـ ${agent.name}`}
          >
            <span>الملف التنفيذي</span>
            <ArrowUpRight className="size-3.5 opacity-60 stroke-[1.5]" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onHire(agent);
            }}
            disabled={isHired}
            className={`flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg text-xs font-semibold active:scale-[0.97] transition-all duration-160 shadow-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
              isHired
                ? "bg-muted text-muted-foreground border border-border cursor-not-allowed"
                : isPro
                ? "bg-foreground text-background hover:bg-foreground/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
            aria-label={`توظيف ${agent.name} في فريق العمل`}
          >
            {isHired ? (
              <>
                <Check className="size-3.5 stroke-[2]" aria-hidden="true" />
                <span>مُعيّن بالشركة</span>
              </>
            ) : (
              <>
                <span>توظيف</span>
                <span className="size-1.5 rounded-full bg-current opacity-60" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
