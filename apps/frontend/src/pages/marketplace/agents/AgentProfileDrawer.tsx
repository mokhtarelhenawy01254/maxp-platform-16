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

import React from "react";
import { X } from "lucide-react";
import { AgentListing } from "./agentMarketplaceData";
import { useAgentProfileDrawer } from "./hooks/useAgentProfileDrawer";
import { AgentProfileHeader } from "./components/drawer/AgentProfileHeader";
import { AgentTelemetryStrip } from "./components/drawer/AgentTelemetryStrip";
import { AgentDossierSection } from "./components/drawer/AgentDossierSection";
import { AgentExecutionSimulator } from "./components/drawer/AgentExecutionSimulator";
import { AgentInteractiveSandbox } from "./components/drawer/AgentInteractiveSandbox";
import { AgentProfileFooter } from "./components/drawer/AgentProfileFooter";

export interface AgentProfileDrawerProps {
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
  const {
    simulationStep,
    simulating,
    imgError,
    setImgError,
    dragY,
    isDragging,
    sandboxQuery,
    setSandboxQuery,
    sandboxLoading,
    sandboxResult,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleRunSimulation,
    handleResetSimulation,
    handleRunSandbox,
  } = useAgentProfileDrawer({ agent, open, onClose });

  if (!open || !agent) return null;

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
        style={{
          transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
          transition: isDragging
            ? "none"
            : "transform 220ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        className="relative flex h-full w-full max-w-xl flex-col bg-background border-s border-border shadow-2xl transition-transform duration-200 overflow-hidden text-start select-none"
      >
        {/* Native Mobile Sheet Grabber with Drag Down Gesture */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="flex justify-center pt-2 pb-1.5 sm:hidden bg-muted/20 border-b border-border/30 cursor-grab active:cursor-grabbing touch-none"
        >
          <div
            className="h-1.5 w-12 rounded-full bg-muted-foreground/40"
            aria-hidden="true"
          />
        </div>

        {/* Top Header Bar */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="flex items-center justify-between border-b border-border/60 px-6 py-3.5 bg-muted/20 touch-none sm:touch-auto"
        >
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

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <AgentProfileHeader
            agent={agent}
            imgError={imgError}
            onImgError={() => setImgError(true)}
          />

          <AgentTelemetryStrip telemetry={agent.telemetry} />

          <AgentDossierSection
            dossier={agent.dossier}
            tools={agent.tools}
          />

          <AgentExecutionSimulator
            agentSlug={agent.slug}
            executionStream={agent.dossier.executionStream}
            simulationStep={simulationStep}
            simulating={simulating}
            onRunSimulation={handleRunSimulation}
            onResetSimulation={handleResetSimulation}
          />

          <AgentInteractiveSandbox
            agentSlug={agent.slug}
            agentName={agent.name}
            sandboxQuery={sandboxQuery}
            sandboxLoading={sandboxLoading}
            sandboxResult={sandboxResult}
            onQueryChange={setSandboxQuery}
            onRunSandbox={handleRunSandbox}
          />
        </div>

        {/* Sticky Bottom Action Bar */}
        <AgentProfileFooter
          agent={agent}
          isHired={isHired}
          onHire={onHire}
        />
      </div>
    </div>
  );
};
