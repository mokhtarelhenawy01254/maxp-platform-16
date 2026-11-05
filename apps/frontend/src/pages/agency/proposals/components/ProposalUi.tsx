import React from "react";

export const GOLD = "#FFD368";

type Tone = "black" | "graphite" | "gold";

const TONE_CLASS: Record<Tone, string> = {
  black: "bg-black text-white",
  graphite: "bg-[#141414] text-white",
  gold: "bg-[#FFD368] text-black",
};

/** Full-bleed section: one flat field of colour, no borders, no cards. */
export const Band: React.FC<{ tone?: Tone; id?: string; children: React.ReactNode }> = ({
  tone = "black",
  id,
  children,
}) => (
  <section id={id} className={`${TONE_CLASS[tone]} px-5 sm:px-10 lg:px-16 py-20 sm:py-28 scroll-mt-14`}>
    <div className="max-w-6xl mx-auto">{children}</div>
  </section>
);

export const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-3xl sm:text-5xl font-black leading-[1.2] text-balance max-w-3xl">{children}</h2>
);

export const Lead: React.FC<{ children: React.ReactNode; muted?: boolean }> = ({ children, muted }) => (
  <p className={`mt-5 text-lg sm:text-xl leading-9 max-w-2xl text-pretty ${muted ? "opacity-75" : ""}`}>{children}</p>
);

/** Square gold marker used for list items instead of icons. */
export const Marker: React.FC<{ dark?: boolean }> = ({ dark }) => (
  <span aria-hidden="true" className={`mt-3 size-1.5 shrink-0 ${dark ? "bg-black" : "bg-[#FFD368]"}`} />
);

export const stripParens = (text: string) => text.replace(/\s*\([^)]*\)/g, "").trim();

export const money = (value: number) => Math.round(value).toLocaleString("en-US");
