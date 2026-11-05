import React from "react";
import { AgencyProposal } from "../types";
import { H2MLuxuryLogo } from "../../visual-identity/H2MLuxuryLogo";
import { money, stripParens } from "./ProposalUi";

interface ProposalHeroProps {
  proposal: AgencyProposal;
  agencyName: string;
}

const lastDay = (proposal: AgencyProposal) => {
  const numbers = proposal.timeline
    .flatMap((phase) => phase.days.match(/\d+/g) || [])
    .map(Number)
    .filter((n) => Number.isFinite(n));
  return numbers.length ? Math.max(...numbers) : 0;
};

export const ProposalHero: React.FC<ProposalHeroProps> = ({ proposal, agencyName }) => {
  const days = lastDay(proposal);
  const streams = proposal.workstreams?.length || proposal.solutionModules.length;
  const startPrice = proposal.packages.length ? Math.min(...proposal.packages.map((p) => p.price)) : 0;

  return (
    <section className="bg-black text-white px-5 sm:px-10 lg:px-16 pt-14 pb-20 sm:pt-20 sm:pb-28">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-[3fr_2fr] gap-12 lg:gap-8 items-center">
        <div>
          <p className="text-base sm:text-lg opacity-75 mb-6">
            {agencyName} تقدّم لـ {stripParens(proposal.clientName)}
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.15] text-balance">
            {stripParens(proposal.title)}
          </h1>
          <p className="mt-6 text-lg sm:text-xl leading-9 max-w-2xl text-pretty">{proposal.executiveSummary}</p>

          <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
            <a
              href="#packages"
              className="inline-flex items-center h-12 px-8 bg-[#FFD368] text-black font-black text-base transition-transform duration-150 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              اعتماد الخطة
            </a>
            <a
              href="#scope"
              className="text-base font-bold underline underline-offset-8 decoration-[#FFD368] focus-visible:ring-2 focus-visible:ring-white"
            >
              ماذا سننفذ بالضبط
            </a>
          </div>

          <dl className="mt-14 grid grid-cols-3 gap-6 max-w-2xl">
            {days > 0 && (
              <div>
                <dt className="text-sm opacity-75">مدة التشغيل الأولى</dt>
                <dd className="mt-1 text-3xl sm:text-4xl font-black tabular-nums text-[#FFD368]">{days} يوماً</dd>
              </div>
            )}
            {streams > 0 && (
              <div>
                <dt className="text-sm opacity-75">محاور العمل</dt>
                <dd className="mt-1 text-3xl sm:text-4xl font-black tabular-nums text-[#FFD368]">{streams}</dd>
              </div>
            )}
            {startPrice > 0 && (
              <div>
                <dt className="text-sm opacity-75">تبدأ من شهرياً</dt>
                <dd className="mt-1 text-3xl sm:text-4xl font-black tabular-nums text-[#FFD368]">
                  {money(startPrice)}
                  <span className="text-base font-bold mr-1">{proposal.currency}</span>
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="order-first lg:order-last">
          <H2MLuxuryLogo className="w-full max-w-sm lg:max-w-none mx-auto mix-blend-lighten select-none" />
        </div>
      </div>
    </section>
  );
};
