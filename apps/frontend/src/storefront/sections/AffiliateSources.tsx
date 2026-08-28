import React from "react";

interface Props {
  settings?: {
    title?: string;
    items?: unknown;
    updatedAt?: string;
    authorName?: string;
    authorTitle?: string;
  };
}

const parseItems = (value: unknown): { label: string; href?: string }[] => {
  if (Array.isArray(value)) return value as any;
  if (typeof value === "string" && value.trim()) {
    return value
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const [label, href] = line.split("|").map((s) => s.trim());
        return { label: label || line, href };
      });
  }
  return [
    { label: "How To Use a Beard Trimmer: Prep, Guards, & More - The Beard Club", href: "https://thebeardclub.com/blogs/beard-culture/how-to-use-a-beard-trimmer" },
    { label: "Trimming & Styling Beard Tips - Electric Shaver GURU", href: "https://www.electric-shaver-guru.com/trimming-styling-beard-tips" },
    { label: "7 Best Beard Trimmers for Professional Styling (2026 Reviews)", href: "https://menreviewhub.com/best-beard-trimmers-for-professional-styling/" },
  ];
};

const AffiliateSources: React.FC<Props> = ({ settings }) => {
  const items = parseItems(settings?.items);
  const title = settings?.title || "Sources & References";
  const updatedAt = settings?.updatedAt || "August 11, 2026";
  const authorName = settings?.authorName || "Jake Morrison";
  const authorTitle = settings?.authorTitle || "Jake spent 8 years behind the barber chair before moving into full-time product writing.";

  return (
    <section className="w-full bg-background py-6">
      <div className="container px-4 md:px-6">
        <div className="mx-auto max-w-[1100px] space-y-6">
          <div>
            <h2 className="text-base font-bold text-[#1a1a1a]">{title}</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              {items.map((it, i) => (
                <li key={i} className="text-sm text-[#19212B]">
                  {it.href ? (
                    <a href={it.href} target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">
                      {it.label}
                    </a>
                  ) : (
                    it.label
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-[#888]">Last updated: {updatedAt}</p>
          </div>

          <div className="rounded-lg border border-[#e8e8e8] bg-[#f8f8f8] p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-[#666]">About the Author: {authorName}</p>
            <p className="mt-2 text-sm leading-6 text-[#444]">{authorTitle} He&apos;s tested hundreds of beard oils, shavers, and skincare lines and cuts through the marketing noise to tell you what actually works for real guys.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AffiliateSources;
