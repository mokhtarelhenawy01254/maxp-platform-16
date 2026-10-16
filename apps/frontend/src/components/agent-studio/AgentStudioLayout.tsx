import React from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  FolderArchive,
  Package,
  Bot,
  ExternalLink,
  Plus,
  MessageSquare,
  Sparkles,
  Undo2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { StudioEntity, StudioAgentInfo } from "./types";

export interface AgentStudioLayoutProps {
  studioId: string;
  title: string;
  icon: LucideIcon;
  connectionBadgeText?: string;
  selectedEntity?: StudioEntity | null;
  entitySelectorPlaceholder?: string;
  onOpenEntityPicker?: () => void;
  sessionsCount: number;
  onOpenSessions: () => void;
  onNewSession: () => void;
  onRewind?: () => void;
  canRewind?: boolean;
  isRewinding?: boolean;
  telemetryBadge?: React.ReactNode;
  sessionsButtonLabel?: string;
  sessionsIcon?: LucideIcon;
  activeAgent?: StudioAgentInfo | null;
  agentRoutingHref?: string;
  statusBadge?: React.ReactNode;
  chatTabLabel?: string;
  canvasTabLabel?: string;
  canvasTabIcon?: LucideIcon;
  hasActiveDraft?: boolean;
  mobileView?: "CHAT" | "CANVAS";
  onMobileViewChange?: (view: "CHAT" | "CANVAS") => void;
  chatPanel: React.ReactNode;
  canvasPanel?: React.ReactNode;
  extraDrawers?: React.ReactNode;
}

export const AgentStudioLayout: React.FC<AgentStudioLayoutProps> = ({
  studioId,
  title,
  icon: StudioIcon,
  connectionBadgeText = "متصل بالمتجر",
  selectedEntity,
  entitySelectorPlaceholder = "اختر المنتج",
  onOpenEntityPicker,
  sessionsCount,
  onOpenSessions,
  onNewSession,
  onRewind,
  canRewind = false,
  isRewinding = false,
  telemetryBadge,
  sessionsButtonLabel = "الجلسات",
  sessionsIcon: SessionsIcon = FolderArchive,
  activeAgent,
  agentRoutingHref = "/admin/ai-hub?tab=routing",
  statusBadge,
  chatTabLabel = "المحادثة والاستراتيجية",
  canvasTabLabel = "لوحة العمليات",
  canvasTabIcon: CanvasIcon = Sparkles,
  hasActiveDraft = false,
  mobileView,
  onMobileViewChange,
  chatPanel,
  canvasPanel,
  extraDrawers,
}) => {
  return (
    <div
      className={`agent-studio-root studio-${studioId} h-full w-full flex flex-col bg-background text-foreground min-h-0 overflow-hidden select-none`}
    >
      {/* Top Ergonomic Unified Cockpit Header */}
      <header className="border-b border-border/70 bg-card/95 backdrop-blur-md flex-shrink-0 z-10">
        {/* Desktop Header: Single Seamless Surface */}
        <div className="hidden lg:flex items-center justify-between gap-3 px-4 py-2">
          {/* Brand & Live Connection Indicator */}
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-primary/10 text-primary flex-shrink-0">
              <StudioIcon className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-sm font-bold text-foreground tracking-tight">
                {title}
              </h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {connectionBadgeText}
              </span>
            </div>
          </div>

          {/* Central Controls: Entity Picker + Sessions Switcher + Active Agent + New Session */}
          <div className="flex items-center gap-2">
            {/* Entity Selector (e.g. Product) */}
            {onOpenEntityPicker && (
              <button
                type="button"
                onClick={onOpenEntityPicker}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border/70 bg-card hover:bg-muted/60 active:scale-[0.98] transition text-xs font-semibold shadow-xs cursor-pointer text-foreground"
                title="تحديد أو تغيير الكيان النشط"
              >
                {selectedEntity ? (
                  <>
                    <div className="w-5 h-5 rounded-md overflow-hidden bg-muted flex-shrink-0 border border-border/60 flex items-center justify-center">
                      {selectedEntity.mainImage ? (
                        <img
                          src={selectedEntity.mainImage}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <span className="truncate max-w-[180px] text-foreground">
                      {selectedEntity.name}
                    </span>
                    {typeof selectedEntity.price === "number" && (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono tabular-nums font-bold">
                        {selectedEntity.price} ج.م
                      </span>
                    )}
                    {typeof selectedEntity.stock === "number" && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono tabular-nums font-semibold ${
                          selectedEntity.stock < 10
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25"
                            : "bg-muted text-muted-foreground border border-border/50"
                        }`}
                      >
                        {selectedEntity.stock} ق
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <Package className="w-4 h-4 text-primary" />
                    <span className="text-muted-foreground">
                      {entitySelectorPlaceholder}
                    </span>
                  </>
                )}
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              </button>
            )}

            {/* Sessions Drawer Trigger */}
            <button
              type="button"
              onClick={onOpenSessions}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/70 bg-card hover:bg-muted/60 active:scale-[0.98] transition text-xs font-semibold text-foreground shadow-xs cursor-pointer"
              title={sessionsButtonLabel}
            >
              <SessionsIcon className="w-3.5 h-3.5 text-primary" />
              <span>{sessionsButtonLabel}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted font-mono tabular-nums font-semibold text-muted-foreground">
                {sessionsCount}
              </span>
            </button>

            {/* Active Agent Routing Badge */}
            <Link
              to={agentRoutingHref}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition text-xs font-semibold text-primary shadow-xs cursor-pointer group"
              title="توجيه أو تخصيص الوكيل المسؤول في مركز الذكاء الاصطناعي"
            >
              <Bot className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="hidden sm:inline text-[11px] text-muted-foreground font-normal">
                الوكيل:
              </span>
              <span className="truncate max-w-[130px]">
                {activeAgent?.name || "الوكيل الذكي"}
              </span>
              <ExternalLink className="w-3 h-3 text-primary opacity-60 group-hover:opacity-100 transition shrink-0" />
            </Link>

            {/* Rewind / Undo Action */}
            {onRewind && (
              <button
                type="button"
                onClick={onRewind}
                disabled={!canRewind || isRewinding}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border/70 bg-card hover:bg-muted/60 active:scale-[0.97] transition text-xs font-semibold text-muted-foreground hover:text-foreground shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
                title="تراجع عن آخر خطوة (Undo)"
                aria-label="تراجع عن آخر خطوة"
              >
                <Undo2
                  className={`w-3.5 h-3.5 text-muted-foreground ${
                    isRewinding ? "animate-spin text-primary" : ""
                  }`}
                />
                <span className="hidden xl:inline">تراجع</span>
              </button>
            )}

            {/* New Session Action */}
            <button
              type="button"
              onClick={onNewSession}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground transition text-xs font-semibold shadow-xs cursor-pointer"
              title="بدء جلسة جديدة"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>جلسة جديدة</span>
            </button>
          </div>

          {/* Right Status / Telemetry badge */}
          <div className="flex items-center gap-2">
            {telemetryBadge}
            {statusBadge}
          </div>
        </div>

        {/* Mobile Native App Bar (Compact 2-tier layout) */}
        <div className="flex lg:hidden flex-col">
          {/* Mobile Tier 1: Action Bar */}
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border/60">
            {/* Entity Selector (Mobile compact) */}
            {onOpenEntityPicker && (
              <button
                type="button"
                onClick={onOpenEntityPicker}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border/70 bg-card text-xs font-semibold text-foreground min-w-0 flex-1 max-w-[220px]"
                title="تحديد الكيان"
              >
                <div className="w-5 h-5 rounded-md overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                  {selectedEntity?.mainImage ? (
                    <img
                      src={selectedEntity.mainImage}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </div>
                <span className="truncate">
                  {selectedEntity ? selectedEntity.name : entitySelectorPlaceholder}
                </span>
                {typeof selectedEntity?.price === "number" && (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono tabular-nums font-bold">
                    {selectedEntity.price} ج.م
                  </span>
                )}
                <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              </button>
            )}

            {/* Mobile Session Actions */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {onRewind && (
                <button
                  type="button"
                  onClick={onRewind}
                  disabled={!canRewind || isRewinding}
                  className="p-1.5 rounded-xl border border-border/70 bg-card text-muted-foreground active:scale-[0.97] transition disabled:opacity-40 disabled:active:scale-100"
                  title="تراجع عن آخر خطوة"
                  aria-label="تراجع عن آخر خطوة"
                >
                  <Undo2
                    className={`w-3.5 h-3.5 ${isRewinding ? "animate-spin text-primary" : ""}`}
                  />
                </button>
              )}

              <button
                type="button"
                onClick={onOpenSessions}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-border/70 bg-card text-xs font-semibold text-foreground active:scale-[0.98]"
                title={sessionsButtonLabel}
              >
                <SessionsIcon className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted font-mono tabular-nums font-semibold text-muted-foreground">
                  {sessionsCount}
                </span>
              </button>

              <button
                type="button"
                onClick={onNewSession}
                className="p-1.5 rounded-xl bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground text-xs font-semibold shadow-xs cursor-pointer"
                title="جلسة جديدة"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Mobile Tier 2: iOS-Style Segmented Tab Switcher (Only if canvasPanel exists) */}
          {canvasPanel && (
            <div className="px-2.5 py-1.5 bg-muted/30">
              <div className="grid grid-cols-2 p-0.5 bg-muted/70 rounded-xl gap-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => onMobileViewChange?.("CHAT")}
                  className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
                    mobileView === "CHAT"
                      ? "bg-card text-primary shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{chatTabLabel}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onMobileViewChange?.("CANVAS")}
                  className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition relative ${
                    mobileView === "CANVAS"
                      ? "bg-card text-primary shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <CanvasIcon className="w-3.5 h-3.5" />
                  <span>{canvasTabLabel}</span>
                  {hasActiveDraft && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Unified Surface (One Seamless Chassis) */}
      <main
        className={`flex-1 grid grid-cols-1 ${
          canvasPanel
            ? "lg:grid-cols-12 min-h-0 overflow-hidden divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-border/60"
            : "min-h-0 overflow-hidden"
        }`}
      >
        {/* Panel 1: Strategy & Chat Feed (100% full width if no canvasPanel, or 58% if canvasPanel present) */}
        <section
          aria-label={chatTabLabel}
          className={`h-full ${
            canvasPanel ? "lg:col-span-7" : "w-full"
          } min-h-0 flex flex-col ${
            !canvasPanel || mobileView === "CHAT" ? "flex" : "hidden lg:flex"
          }`}
        >
          {chatPanel}
        </section>

        {/* Panel 2: Live Action Canvas (Only rendered when canvasPanel is provided) */}
        {canvasPanel && (
          <section
            aria-label={canvasTabLabel}
            className={`h-full lg:col-span-5 min-h-0 flex flex-col bg-muted/20 ${
              mobileView === "CANVAS" ? "flex" : "hidden lg:flex"
            }`}
          >
            {canvasPanel}
          </section>
        )}
      </main>

      {/* Slide-over Drawers (Sessions, Entity Pickers, Modals) */}
      {extraDrawers}
    </div>
  );
};
