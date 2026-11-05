import React, { useEffect, useRef, useState } from "react";
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

  if (block.type === "tasks") {
    return (
      <div className="space-y-3">
        {block.title && <div className="text-sm font-black text-white">{block.title}</div>}
        <ul className="divide-y divide-white/10 border-t border-white/10">
          {block.items.map((item, i) => (
            <li key={i} className="py-3 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <span
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 border border-[#FFD368]/60 grid place-items-center"
                >
                  <span className="size-1.5 bg-[#FFD368]" />
                </span>
                <span className="text-sm text-white/85 leading-relaxed">{item.task}</span>
              </div>
              <div className="shrink-0 text-right space-y-0.5">
                {item.owner && (
                  <div className="text-[10px] font-mono text-[#FFD368]/90 whitespace-nowrap">{item.owner}</div>
                )}
                {item.when && <div className="text-[10px] text-white/40 whitespace-nowrap">{item.when}</div>}
              </div>
            </li>
          ))}
        </ul>
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
  const [sheetOpen, setSheetOpen] = useState(false);
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    const node = buttons.current[activeId];
    if (node) node.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeId]);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheetOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [sheetOpen]);

  if (!tabs || tabs.length === 0) return null;

  const index = Math.max(
    0,
    tabs.findIndex((tab) => tab.id === activeId)
  );
  const active = tabs[index] ?? tabs[0]!;
  const go = (target: number) => {
    const next = tabs[target];
    if (next) setActiveId(next.id);
  };

  const renderBody = () => (
    <>
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
    </>
  );

  return (
    <Band tone="black" id="plan">
      {/* Tab strip — scrolls sideways on a phone, active chip stays centred */}
      <div className="-mx-5 sm:-mx-10 lg:-mx-16 px-5 sm:px-10 lg:px-16 border-b border-white/15 sticky top-14 z-30 bg-black/95 backdrop-blur">
        <div
          role="tablist"
          aria-label="خطة العمل"
          className="max-w-6xl mx-auto flex gap-2 overflow-x-auto no-scrollbar py-3 snap-x snap-mandatory"
        >
          {tabs.map((tab, idx) => {
            const isActive = tab.id === active.id;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  buttons.current[tab.id] = el;
                }}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveId(tab.id)}
                className={`shrink-0 snap-center inline-flex items-center gap-2 h-10 px-4 text-xs sm:text-sm font-bold border transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-[#FFD368] text-black border-[#FFD368]"
                    : "bg-white/[0.04] text-white/70 border-white/15 hover:text-white hover:border-white/35"
                }`}
              >
                <span className={`font-mono text-[10px] ${isActive ? "opacity-70" : "opacity-50"}`}>
                  {String(idx + 1).padStart(2, "0")}
                </span>
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active panel */}
      <div key={active.id} className="pt-8 sm:pt-10 space-y-8">
        <div className="flex items-center justify-between gap-4 text-[11px] font-mono text-white/40">
          <span>
            التاب {index + 1} من {tabs.length}
          </span>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="h-9 px-3 border border-white/20 text-[11px] font-bold text-white/70 hover:text-white hover:border-white/40"
          >
            شاشة كاملة
          </button>
        </div>

        {renderBody()}

        {/* Phones: one obvious way forward, never a dead end */}
        <div className="flex items-center justify-between gap-3 pt-8 border-t border-white/15">
          <button
            type="button"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            className="h-11 px-4 border border-white/20 text-xs font-bold text-white/80 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            التاب السابق
          </button>
          <span className="font-mono text-[11px] text-white/40 tabular-nums">
            {index + 1} / {tabs.length}
          </span>
          <button
            type="button"
            onClick={() => go(index + 1)}
            disabled={index === tabs.length - 1}
            className="h-11 px-4 bg-[#FFD368] text-black text-xs font-black disabled:opacity-30 disabled:cursor-not-allowed"
          >
            التاب اللي بعده
          </button>
        </div>
      </div>

      {/* Full-screen sheet — same content, no page chrome around it */}
      {sheetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.label}
          className="fixed inset-0 z-[60] bg-[#0a0a0a] overflow-y-auto"
        >
          <div className="sticky top-0 z-10 bg-[#0d0d0d]/95 backdrop-blur border-b border-white/10">
            <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between gap-4">
              <span className="font-mono text-[11px] text-white/50 truncate">
                {index + 1} / {tabs.length} — {active.label}
              </span>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="h-9 px-4 border border-white/25 text-xs font-bold text-white/85"
              >
                إغلاق
              </button>
            </div>
          </div>

          <div className="max-w-3xl mx-auto px-5 py-8 space-y-8">
            {renderBody()}

            <div className="flex items-center justify-between gap-3 pt-6 border-t border-white/15">
              <button
                type="button"
                onClick={() => go(index - 1)}
                disabled={index === 0}
                className="h-11 px-4 border border-white/20 text-xs font-bold text-white/80 disabled:opacity-30"
              >
                السابق
              </button>
              <button
                type="button"
                onClick={() => go(index + 1)}
                disabled={index === tabs.length - 1}
                className="h-11 px-4 bg-[#FFD368] text-black text-xs font-black disabled:opacity-30"
              >
                اللي بعده
              </button>
            </div>
          </div>
        </div>
      )}
    </Band>
  );
};
