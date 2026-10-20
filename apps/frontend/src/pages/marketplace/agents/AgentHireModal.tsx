/**
 * AgentHireModal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Minimalist, high-density modal for deploying an agent into the company.
 * Configures department routing, safety governance mode, and initiates
 * the backend spawn request via /api/agent-manager/hire.
 * 
 * Strict 2026 Anti-AI-Slop compliance:
 * - Zero Emojis
 * - Tactile buttons with physical active press
 * - Clear governance safety indicators
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from "react";
import { AgentListing } from "./agentMarketplaceData";
import { useAgentHireModal } from "./hooks/useAgentHireModal";
import { AgentHireHeader } from "./components/hire/AgentHireHeader";
import { AgentHirePricingGuard } from "./components/hire/AgentHirePricingGuard";
import { AgentHireFormFields } from "./components/hire/AgentHireFormFields";
import { AgentHireFooter } from "./components/hire/AgentHireFooter";

export interface AgentHireModalProps {
  agent: AgentListing | null;
  open: boolean;
  onClose: () => void;
  onHired: (agentSlug: string, agentName: string) => void;
}

export const AgentHireModal: React.FC<AgentHireModalProps> = ({
  agent,
  open,
  onClose,
  onHired,
}) => {
  const {
    customName,
    setCustomName,
    department,
    setDepartment,
    safetyMode,
    setSafetyMode,
    loading,
    imgError,
    setImgError,
    walletBalance,
    walletLoading,
    isPro,
    hasEnoughBalance,
    navigateToRecharge,
    handleConfirmHire,
  } = useAgentHireModal({ agent, open, onClose, onHired });

  if (!open || !agent) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hire-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 text-start select-none animate-fadeIn"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-2xl border border-border/80 bg-background p-6 shadow-2xl space-y-5"
      >
        <AgentHireHeader
          agent={agent}
          imgError={imgError}
          onImgError={() => setImgError(true)}
          onClose={onClose}
        />

        <AgentHirePricingGuard
          agent={agent}
          isPro={isPro}
          walletBalance={walletBalance}
          walletLoading={walletLoading}
          hasEnoughBalance={hasEnoughBalance}
          onNavigateToRecharge={navigateToRecharge}
        />

        <AgentHireFormFields
          customName={customName}
          department={department}
          safetyMode={safetyMode}
          onCustomNameChange={setCustomName}
          onDepartmentChange={setDepartment}
          onSafetyModeChange={setSafetyMode}
        />

        <AgentHireFooter
          loading={loading}
          isPro={isPro}
          hasEnoughBalance={hasEnoughBalance}
          onClose={onClose}
          onConfirmHire={handleConfirmHire}
        />
      </div>
    </div>
  );
};
