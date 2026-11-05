import React from "react";
import { AgencyProposal } from "../types";
import { stripParens } from "./ProposalUi";

interface ProposalBrandBarProps {
  proposal: AgencyProposal;
  agencyName: string;
}

/** Edge-to-edge co-brand plate: the client's own mark opens the document. */
export const ProposalBrandBar: React.FC<ProposalBrandBarProps> = ({ proposal, agencyName }) => (
  <div className="bg-[#F7F5EF] text-[#1F2A78]">
    <div className="max-w-6xl mx-auto px-5 sm:px-10 lg:px-16 py-5 sm:py-6 flex items-center justify-between gap-6">
      {proposal.clientLogo ? (
        <img
          src={proposal.clientLogo}
          alt={stripParens(proposal.clientName)}
          className="h-11 sm:h-16 w-auto object-contain select-none"
          draggable={false}
        />
      ) : (
        <span className="text-xl sm:text-2xl font-black leading-tight">{stripParens(proposal.clientName)}</span>
      )}
      <div className="text-right shrink-0">
        <div className="font-mono text-[10px] tracking-[0.22em] uppercase opacity-50">Prepared by</div>
        <div className="text-xs sm:text-sm font-black leading-tight">{agencyName}</div>
      </div>
    </div>
  </div>
);
