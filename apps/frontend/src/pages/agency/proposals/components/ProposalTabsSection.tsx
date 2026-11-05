import React, { useState } from "react";
import { ProposalTab, ProposalTabBlock } from "../types";
import { Band, SectionTitle, Lead, Marker } from "./ProposalUi";

interface ProposalTabsSectionProps {
  tabs?: ProposalTab[];
}

const Block: React.FC<{ block: ProposalTabBlock }> = ({ block }) => {
  if (block.type === "text") {
    return <p className="text-sm sm:text-base text-white/75 leading-relaxed max-w-3xl">{block.text}</p>;
  }

  if (block.type === "note") {
    return (
      <p className="text-xs sm:text-sm text-white/60 leading-relaxed border-r-2 border-[#FFD368]/50 pr-3 max-w-3xl">
        {block.text}
      </p>
    );
  }

  if (block.type === "numbers") {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4">
        {block.items.map((item, i) => (
          <div key={i} className="border-t border-white/15 pt-2">
            <div className="font-mono text-2xl sm:text-3xl font-black text-[#FFD368] tabular-nums leading-none">
              {item.value}
            </div>
            <div className="text-[11px] text-white/50 mt-1.5 leading-snug">{item.label}</div>
          </div>
        ))}
      </div>
    );
  }

  if (block.type === "bullets") {
    return (
      <div className="space-y-3 max-w-3xl">
        {block.title && <div className="text-sm font-black text-white">{block.title}</div>}
        <ul className="space-y-2">
          {block.items.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-white/80 leading-relaxed">
              {block.ordered ? (
                <span className="font-mono text-[11px] text-[#FFD368] tabular-nums pt-0.5 shrink-0">{i + 1}.</span>
              ) : (
                <span aria-hidden="true" className="mt-2 size-1 shrink-0 bg-[#FFD368]" />
              )}
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // table
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-right">
        <thead>
          <tr className="text-[10px] sm:text-[11px] uppercase tracking-wider text-white/45 border-b border-white/10">
            {block.columns.map((col, i) => (
              <th key={i} className={`py-2.5 font-bold ${i === 0 ? "pr-2" : ""}`}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {block.rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (
                <td
                  key={c}
                  className={`py-2.5 align-top text-xs sm:text-sm leading-relaxed ${
                    c === 0 ? "pr-2 font-bold text-white whitespace-nowrap" : "text-white/70"
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * The deal room as tabs: one part per tab, mobile-first (a scrollable strip
 * of tab labels above a single panel, never all sections stacked).
 */
export const ProposalTabsSection: React.FC<ProposalTabsSectionProps> = ({ tabs }) => {
  const [activeId, setActiveId] = useState(tabs?.[0]?.id ?? "");
  if (!tabs || tabs.length === 0) return null;

  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0]!;

  return (
    <Band tone="black" id="plan">
      {/* Tab strip — scrolls sideways on a phone */}
      <div className="-mx-5 sm:-mx-10 lg:-mx-16 px-5 sm:px-10 lg:px-16 border-b border-white/10 sticky top-14 z-30 bg-black/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex gap-1 overflow-x-auto no-scrollbar py-3">
          {tabs.map((tab, idx) => {
            const isActive = tab.id === active.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveId(tab.id)}
                aria-current={isActive ? "page" : undefined}
                className={`shrink-0 px-3 py-2 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? "border-[#FFD368] text-[#FFD368]"
                    : "border-transparent text-white/55 hover:text-white"
                }`}
              >
                <span className="font-mono text-[10px] opacity-60 ml-1">{idx + 1}</span>
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active panel */}
      <div key={active.id} className="pt-10 space-y-8">
        <div className="space-y-4 max-w-3xl">
          {active.eyebrow && <Marker>{active.eyebrow}</Marker>}
          <SectionTitle>{active.title}</SectionTitle>
          {active.lead && <Lead>{active.lead}</Lead>}
        </div>

        <div className="space-y-8 pt-2">
          {active.blocks.map((block, idx) => (
            <Block key={idx} block={block} />
          ))}
        </div>
      </div>
    </Band>
  );
};
