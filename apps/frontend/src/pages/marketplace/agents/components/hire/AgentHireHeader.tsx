import React from "react";
import { X } from "lucide-react";
import { AgentListing, getArabicInitials } from "../../agentMarketplaceData";

interface AgentHireHeaderProps {
  agent: AgentListing;
  imgError: boolean;
  onImgError: () => void;
  onClose: () => void;
}

export const AgentHireHeader: React.FC<AgentHireHeaderProps> = ({
  agent,
  imgError,
  onImgError,
  onClose,
}) => {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
      <div className="flex items-center gap-3">
        <div className="size-12 rounded-xl overflow-hidden border border-border shrink-0 bg-muted">
          {imgError ? (
            <div className="size-full flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-950 text-white font-bold text-sm tracking-wider select-none">
              <span>{getArabicInitials(agent.name)}</span>
            </div>
          ) : (
            <img
              src={agent.avatarUrl}
              alt={agent.name}
              onError={onImgError}
              className="size-full object-cover"
            />
          )}
        </div>
        <div>
          <h2 id="hire-modal-title" className="text-base font-bold text-foreground">
            توظيف {agent.name}
          </h2>
          <p className="text-xs text-muted-foreground line-clamp-1">{agent.position}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground active:scale-[0.97] transition-all"
        aria-label="إلغاء"
      >
        <X className="size-4 stroke-[1.5]" />
      </button>
    </div>
  );
};
