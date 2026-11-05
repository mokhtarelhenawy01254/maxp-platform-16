import React from "react";
import { AgencyProposal } from "../types";
import { stripParens } from "./ProposalUi";

interface ProposalHeroProps {
  proposal: AgencyProposal;
  agencyName: string;
  onAccept?: () => void;
}

export const ProposalHero: React.FC<ProposalHeroProps> = ({ proposal, agencyName, onAccept }) => {
  const lastTarget = proposal.targets?.rows?.length
    ? proposal.targets.rows[proposal.targets.rows.length - 1]
    : null;
  const activeTarget = lastTarget?.activeStudents || 400;
  const newPerMonth = lastTarget?.newStudents || 200;
  const groups = Math.round(activeTarget / 8);

  return (
    <section className="bg-black text-white px-5 sm:px-10 lg:px-16 pt-14 pb-20 sm:pt-20 sm:pb-28">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-[3fr_2fr] gap-12 lg:gap-8 items-center">
        <div>
          <p className="text-base sm:text-lg opacity-75 mb-6">
            {agencyName} تقدّم لـ {stripParens(proposal.clientName)} — {proposal.industry}
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.15] text-balance">
            {stripParens(proposal.title)}
          </h1>
          <p className="mt-6 text-lg sm:text-xl leading-9 max-w-2xl text-pretty">{proposal.executiveSummary}</p>

          <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
            <button
              onClick={onAccept}
              className="inline-flex items-center h-12 px-8 bg-[#FFD368] text-black font-black text-base transition-transform duration-150 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              اعتماد الخطة
            </button>
            <a
              href="#plan"
              className="text-base font-bold underline underline-offset-8 decoration-[#FFD368] focus-visible:ring-2 focus-visible:ring-white"
            >
              افتح الخطة بالتفصيل
            </a>
          </div>

          <dl className="mt-14 grid grid-cols-3 gap-4 max-w-2xl">
            <div>
              <dt className="text-xs sm:text-sm opacity-75">الهدف الشهري</dt>
              <dd className="mt-1 text-2xl sm:text-4xl font-black tabular-nums text-[#FFD368]">{activeTarget}</dd>
            </div>
            <div>
              <dt className="text-xs sm:text-sm opacity-75">جديد كل شهر</dt>
              <dd className="mt-1 text-2xl sm:text-4xl font-black tabular-nums text-[#FFD368]">{newPerMonth}</dd>
            </div>
            <div>
              <dt className="text-xs sm:text-sm opacity-75">مجموعات</dt>
              <dd className="mt-1 text-2xl sm:text-4xl font-black tabular-nums text-[#FFD368]">{groups}</dd>
            </div>
          </dl>
        </div>

        <div className="lg:order-last">
          {lastTarget ? (
            <div className="border-r-2 border-[#FFD368] pr-6 space-y-2">
              <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-[#FFD368]">
                الهدف المتفق عليه
              </div>
              <div className="font-mono text-6xl sm:text-7xl xl:text-8xl font-black tabular-nums leading-none">
                {lastTarget.activeStudents}
              </div>
              <div className="text-base font-bold text-white/80">طفل نشط في الشهر</div>
              <div className="text-xs text-white/50 leading-relaxed pt-2">
                بنضم {newPerMonth} طفل جديد كل شهر — لأن جزء بيسيب وجزء بيخلص مستوى.
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};
