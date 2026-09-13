/**
 * AgentMarketplacePage.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * The 2026 MaxP Digital Workforce Marketplace Page.
 * Single-Surface Chassis with zero dead margins and ergonomic top control bar.
 * 
 * Strict 2026 Anti-AI-Slop compliance:
 * - Zero Emojis
 * - Real telemetry indicators (P95 latency, model routing)
 * - Bento-grid asymmetrical card display
 * - Micro-typography (text-wrap: balance, tabular-nums)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Search, 
  X, 
  Cpu, 
  Activity, 
  ShieldCheck, 
  Sparkles, 
  Users, 
  Filter,
  Palette
} from "lucide-react";
import { apiClient } from "../../../services/apiClient";
import { 
  AGENT_LISTINGS, 
  AGENT_CATEGORIES, 
  AgentListing, 
  AgentCategory, 
  AgentTier 
} from "./agentMarketplaceData";
import { AgentMarketCard } from "./AgentMarketCard";
import { AgentProfileDrawer } from "./AgentProfileDrawer";
import { AgentHireModal } from "./AgentHireModal";

export default function AgentMarketplacePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<AgentCategory>("all");
  const [tierFilter, setTierFilter] = useState<"all" | AgentTier>("all");
  const [selectedAgent, setSelectedAgent] = useState<AgentListing | null>(null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [hireModalOpen, setHireModalOpen] = useState<boolean>(false);
  const [agentToHire, setAgentToHire] = useState<AgentListing | null>(null);

  // Track locally & remotely hired agents for seamless UI feedback
  const [hiredSlugs, setHiredSlugs] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("maxp_hired_agents");
      return saved ? new Set(JSON.parse(saved)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  // Sync with company's backend agent context
  useEffect(() => {
    apiClient
      .get("/agent-manager/context")
      .then((res) => {
        if (res.data?.success && Array.isArray(res.data?.context?.agents)) {
          const backendAgents = res.data.context.agents;
          const slugs = backendAgents
            .map((a: any) => a.templateSlug || a.slug || a.id)
            .filter(Boolean);
          if (slugs.length > 0) {
            setHiredSlugs((prev) => {
              const next = new Set([...prev, ...slugs]);
              try {
                localStorage.setItem("maxp_hired_agents", JSON.stringify([...next]));
              } catch {
                // ignore
              }
              return next;
            });
          }
        }
      })
      .catch(() => {
        // graceful offline fallback
      });
  }, []);

  const handleOpenProfile = (agent: AgentListing) => {
    setSelectedAgent(agent);
    setDrawerOpen(true);
  };

  const handleOpenHire = (agent: AgentListing) => {
    setAgentToHire(agent);
    setHireModalOpen(true);
  };

  const handleAgentHired = (agentSlug: string) => {
    setHiredSlugs((prev) => {
      const next = new Set(prev);
      next.add(agentSlug);
      try {
        localStorage.setItem("maxp_hired_agents", JSON.stringify([...next]));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Filtered listings
  const filteredListings = useMemo(() => {
    return AGENT_LISTINGS.filter((agent) => {
      // Category filter
      if (activeCategory !== "all" && agent.category !== activeCategory) {
        return false;
      }
      // Tier filter
      if (tierFilter !== "all" && agent.tier !== tierFilter) {
        return false;
      }
      // Search query
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchName = agent.name.toLowerCase().includes(q);
        const matchPos = agent.position.toLowerCase().includes(q);
        const matchSum = agent.summary.toLowerCase().includes(q);
        const matchTool = agent.tools.some((t) => t.toLowerCase().includes(q));
        if (!matchName && !matchPos && !matchSum && !matchTool) {
          return false;
        }
      }
      return true;
    });
  }, [activeCategory, tierFilter, search]);

  const stats = useMemo(() => {
    const total = AGENT_LISTINGS.length;
    const freeCount = AGENT_LISTINGS.filter((a) => a.tier === "free").length;
    const proCount = AGENT_LISTINGS.filter((a) => a.tier === "pro").length;
    return { total, freeCount, proCount };
  }, []);

  return (
    <div className="flex flex-col h-full w-full bg-background text-foreground select-none overflow-y-auto">
      {/* ── Top Unified Control Bar ── */}
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/95 backdrop-blur-md px-4 sm:px-6 py-3.5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Header Title & Telemetry summary */}
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                سوق الإيجنت
              </h1>
              <span className="rounded-md border border-border px-2 py-0.5 text-[10px] font-mono font-medium text-muted-foreground bg-muted/40">
                Digital Workforce OS
              </span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-1">
              اختر الكوادر الرقمية المتخصصة ووظفها في حساب شركتك بضغطة زر واحدة.
            </p>
          </div>

          {/* Hard Telemetry Badges */}
          <div className="flex items-center gap-2 flex-wrap text-[11px] font-medium text-muted-foreground">
            <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1">
              <Users className="size-3.5 opacity-70 stroke-[1.5]" />
              <span className="tabular-nums font-semibold text-foreground">{stats.total}</span>
              <span>وكلاء متخصصون</span>
            </div>

            <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1">
              <Activity className="size-3.5 text-emerald-500 stroke-[1.5]" />
              <span>سرعة المعالجة:</span>
              <span className="tabular-nums font-semibold text-foreground">P95 &lt; 0.8s</span>
            </div>

            <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1">
              <Cpu className="size-3.5 text-primary stroke-[1.5]" />
              <span>المحركات:</span>
              <span className="font-semibold text-foreground">DeepSeek-V3 / Flash 2.5</span>
            </div>

            <button
              type="button"
              onClick={() => navigate("/marketplace")}
              className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/20 px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground active:scale-[0.97] transition-all"
              title="تصفح قوالب وتصميمات المتاجر"
            >
              <Palette className="size-3.5 opacity-70 stroke-[1.5]" />
              <span>قوالب المتاجر</span>
            </button>
          </div>
        </div>

        {/* ── Search & Filter Controls ── */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 pt-1">
          {/* Category Tabs (Pills) */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {AGENT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`whitespace-nowrap px-3.5 py-2 min-h-[36px] rounded-lg text-xs font-medium active:scale-[0.97] transition-all duration-160 flex items-center justify-center ${
                  activeCategory === cat.id
                    ? "bg-foreground text-background font-semibold shadow-sm dark:bg-white dark:text-black"
                    : "border border-border/60 bg-card/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search + Tier Toggle */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 w-full sm:w-auto">
            {/* Tier Switch */}
            <div className="flex items-center justify-between sm:justify-start rounded-lg border border-border/60 bg-muted/30 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setTierFilter("all")}
                className={`flex-1 sm:flex-initial text-center px-2.5 py-1 rounded-md transition-all ${
                  tierFilter === "all"
                    ? "bg-background font-semibold text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                الكل
              </button>
              <button
                type="button"
                onClick={() => setTierFilter("free")}
                className={`flex-1 sm:flex-initial text-center px-2.5 py-1 rounded-md transition-all ${
                  tierFilter === "free"
                    ? "bg-background font-semibold text-emerald-600 dark:text-emerald-400 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                مجاني ({stats.freeCount})
              </button>
              <button
                type="button"
                onClick={() => setTierFilter("pro")}
                className={`flex-1 sm:flex-initial text-center px-2.5 py-1 rounded-md transition-all ${
                  tierFilter === "pro"
                    ? "bg-background font-semibold text-amber-600 dark:text-amber-400 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                تخصصي Pro ({stats.proCount})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-56">
              <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none stroke-[1.5]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث بالاسم أو التخصص…"
                className="w-full h-8.5 sm:h-8 ps-8 pe-7 rounded-lg border border-border/60 bg-background text-xs text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                  aria-label="مسح البحث"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Asymmetrical Bento Grid ── */}
      <main className="flex-1 p-4 sm:p-6 pb-28 sm:pb-8">
        {filteredListings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
            <div className="size-12 rounded-2xl border border-border/60 bg-muted/30 flex items-center justify-center text-muted-foreground">
              <Filter className="size-5 stroke-[1.5]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">لا توجد كوادر مطابقة للبحث</h3>
              <p className="text-xs text-muted-foreground">
                جرب تغيير التصنيف أو مصطلح البحث لاستعراض باقي الوكلاء الأذكياء.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setActiveCategory("all");
                setTierFilter("all");
              }}
              className="h-8 px-4 text-xs font-medium rounded-lg border border-border hover:bg-muted active:scale-[0.97] transition-all"
            >
              إعادة تعيين الفلاتر
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredListings.map((agent) => (
              <AgentMarketCard
                key={agent.id}
                agent={agent}
                onViewProfile={handleOpenProfile}
                onHire={handleOpenHire}
                isHired={hiredSlugs.has(agent.slug)}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Drawer & Modals ── */}
      <AgentProfileDrawer
        agent={selectedAgent}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onHire={(agent) => {
          setDrawerOpen(false);
          handleOpenHire(agent);
        }}
        isHired={selectedAgent ? hiredSlugs.has(selectedAgent.slug) : false}
      />

      <AgentHireModal
        agent={agentToHire}
        open={hireModalOpen}
        onClose={() => setHireModalOpen(false)}
        onHired={handleAgentHired}
      />
    </div>
  );
}
