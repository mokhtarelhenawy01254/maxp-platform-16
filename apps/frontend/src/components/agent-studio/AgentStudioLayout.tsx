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
  sessionsButtonLabel?: string;
  sessionsIcon?: LucideIcon;
  activeAgent?: StudioAgentInfo | null;
  agentRoutingHref?: string;
  statusBadge?: React.ReactNode;
  chatTabLabel?: string;
  canvasTabLabel?: string;
  canvasTabIcon?: LucideIcon;
  hasActiveDraft?: boolean;
  mobileView: "CHAT" | "CANVAS";
  onMobileViewChange: (view: "CHAT" | "CANVAS") => void;
  chatPanel: React.ReactNode;
  canvasPanel: React.ReactNode;
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
      className={`agent-studio-root studio-${studioId} h-full w-full flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-0 overflow-hidden select-none`}
    >
      {/* Top Ergonomic Unified Cockpit Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 backdrop-blur-md flex-shrink-0 z-10">
        {/* Desktop Header: Single Seamless Surface */}
        <div className="hidden lg:flex items-center justify-between gap-3 px-4 py-2">
          {/* Brand & Live Connection Indicator */}
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white shadow-xs flex-shrink-0">
              <StudioIcon className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tracking-tight">
                {title}
              </h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
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
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-[0.98] transition text-xs font-bold shadow-xs cursor-pointer"
                title="تحديد أو تغيير الكيان النشط"
              >
                {selectedEntity ? (
                  <>
                    <div className="w-5 h-5 rounded-md overflow-hidden bg-slate-200 dark:bg-slate-700 flex-shrink-0 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                      {selectedEntity.mainImage ? (
                        <img
                          src={selectedEntity.mainImage}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                    <span className="truncate max-w-[180px] text-slate-800 dark:text-slate-100">
                      {selectedEntity.name}
                    </span>
                    {typeof selectedEntity.price === "number" && (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-black tabular-nums">
                        {selectedEntity.price} ج.م
                      </span>
                    )}
                    {typeof selectedEntity.stock === "number" && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold tabular-nums ${
                          selectedEntity.stock < 10
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {selectedEntity.stock} ق
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <Package className="w-4 h-4 text-indigo-500" />
                    <span className="text-slate-700 dark:text-slate-300">
                      {entitySelectorPlaceholder}
                    </span>
                  </>
                )}
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              </button>
            )}

            {/* Sessions Drawer Trigger */}
            <button
              type="button"
              onClick={onOpenSessions}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-[0.98] transition text-xs font-bold text-slate-700 dark:text-slate-300 shadow-xs cursor-pointer"
              title={sessionsButtonLabel}
            >
              <SessionsIcon className="w-3.5 h-3.5 text-indigo-500" />
              <span>{sessionsButtonLabel}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 font-bold tabular-nums">
                {sessionsCount}
              </span>
            </button>

            {/* Active Agent Routing Badge */}
            <Link
              to={agentRoutingHref}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/80 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition text-xs font-bold text-indigo-700 dark:text-indigo-300 shadow-xs cursor-pointer group"
              title="توجيه أو تخصيص الوكيل المسؤول في مركز الذكاء الاصطناعي"
            >
              <Bot className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="hidden sm:inline text-[11px] text-indigo-500/90 dark:text-indigo-400/80 font-normal">
                الوكيل:
              </span>
              <span className="truncate max-w-[130px]">
                {activeAgent?.name || "الوكيل الذكي"}
              </span>
              <ExternalLink className="w-3 h-3 text-indigo-400 dark:text-indigo-500 opacity-60 group-hover:opacity-100 transition shrink-0" />
            </Link>

            {/* New Session Action */}
            <button
              type="button"
              onClick={onNewSession}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white transition text-xs font-bold shadow-xs cursor-pointer"
              title="بدء جلسة جديدة"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>جلسة جديدة</span>
            </button>
          </div>

          {/* Right Status / Telemetry badge */}
          <div className="flex items-center gap-2">
            {statusBadge}
          </div>
        </div>

        {/* Mobile Native App Bar (Compact 2-tier layout) */}
        <div className="flex lg:hidden flex-col">
          {/* Mobile Tier 1: Action Bar */}
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-100 dark:border-slate-800/80">
            {/* Entity Selector (Mobile compact) */}
            {onOpenEntityPicker && (
              <button
                type="button"
                onClick={onOpenEntityPicker}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-bold text-slate-800 dark:text-slate-100 min-w-0 flex-1 max-w-[220px]"
                title="تحديد الكيان"
              >
                <div className="w-5 h-5 rounded-md overflow-hidden bg-slate-200 dark:bg-slate-700 flex-shrink-0 flex items-center justify-center">
                  {selectedEntity?.mainImage ? (
                    <img
                      src={selectedEntity.mainImage}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
                <span className="truncate">
                  {selectedEntity ? selectedEntity.name : entitySelectorPlaceholder}
                </span>
                {typeof selectedEntity?.price === "number" && (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-black tabular-nums">
                    {selectedEntity.price} ج.م
                  </span>
                )}
                <ChevronDown className="w-3 h-3 text-slate-400 flex-shrink-0" />
              </button>
            )}

            {/* Mobile Session Actions */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={onOpenSessions}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-bold text-slate-700 dark:text-slate-300 active:scale-[0.98]"
                title={sessionsButtonLabel}
              >
                <SessionsIcon className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 font-bold tabular-nums">
                  {sessionsCount}
                </span>
              </button>

              <button
                type="button"
                onClick={onNewSession}
                className="p-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-bold shadow-xs cursor-pointer"
                title="جلسة جديدة"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Mobile Tier 2: iOS-Style Segmented Tab Switcher */}
          <div className="px-2.5 py-1.5 bg-slate-50/60 dark:bg-slate-900/60">
            <div className="grid grid-cols-2 p-0.5 bg-slate-200/70 dark:bg-slate-800/70 rounded-xl gap-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => onMobileViewChange("CHAT")}
                className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
                  mobileView === "CHAT"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{chatTabLabel}</span>
              </button>
              <button
                type="button"
                onClick={() => onMobileViewChange("CANVAS")}
                className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition relative ${
                  mobileView === "CANVAS"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
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
        </div>
      </header>

      {/* Main 2-Panel Unified Surface (One Seamless Chassis) */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-slate-200 dark:divide-slate-800">
        {/* Panel 1: Strategy & Chat Feed (58% desktop width) */}
        <section
          aria-label={chatTabLabel}
          className={`h-full lg:col-span-7 min-h-0 flex flex-col ${
            mobileView === "CHAT" ? "flex" : "hidden lg:flex"
          }`}
        >
          {chatPanel}
        </section>

        {/* Panel 2: Live Action Canvas & Draft Center (42% desktop width) */}
        <section
          aria-label={canvasTabLabel}
          className={`h-full lg:col-span-5 min-h-0 flex flex-col bg-slate-50/30 dark:bg-slate-900/30 ${
            mobileView === "CANVAS" ? "flex" : "hidden lg:flex"
          }`}
        >
          {canvasPanel}
        </section>
      </main>

      {/* Slide-over Drawers (Sessions, Entity Pickers, Modals) */}
      {extraDrawers}
    </div>
  );
};
