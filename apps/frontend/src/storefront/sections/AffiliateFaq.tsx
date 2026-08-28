import React, { useState } from "react";

interface FaqItem {
  q: string;
  a: string;
}

interface Props {
  settings?: {
    title?: string;
    faqs?: unknown;
  };
}

const parseFaqs = (value: unknown): FaqItem[] => {
  if (Array.isArray(value)) return value as FaqItem[];
  if (typeof value === "string" && value.trim()) {
    return value
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const [q, a] = line.split("|").map((s) => s.trim());
        return { q: q || line, a: a || "" };
      });
  }
  return [
    { q: "Do I need a cordless trimmer for precision?", a: "Yes. Cordless trimmers with lithium-ion batteries provide consistent power throughout the charge. Corded trimmers can have cord drag, which interferes with smooth, precise movements." },
    { q: "How often should I clean my trimmer blades?", a: "After every use. Hair buildup affects cutting performance and can harbor bacteria. Use the small brush and apply a drop of mineral oil monthly." },
    { q: "Can I use a beard trimmer on my head hair?", a: "Most beard trimmers are designed for facial hair density and may not handle head hair well. Use a dedicated hair clipper." },
    { q: "What is the best length for a first-time beard trim?", a: "Start with a longer guard (3mm or 4mm) and work your way down. It's easier to trim more than to fix a mistake." },
  ];
};

const AffiliateFaq: React.FC<Props> = ({ settings }) => {
  const faqs = parseFaqs(settings?.faqs);
  const title = settings?.title || "Frequently Asked Questions";
  const [open, setOpen] = useState<number | null>(0);

  // JSON-LD for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <section className="w-full bg-background py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="container px-4 md:px-6">
        <div className="mx-auto max-w-[1100px]">
          <h2 className="text-xl font-bold text-[#1a1a1a]">{title}</h2>
          <div className="mt-4 divide-y divide-[#e8e8e8] rounded-lg border border-[#e8e8e8] bg-white">
            {faqs.map((f, i) => (
              <div key={i} className="p-0">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left"
                >
                  <span className="text-sm font-bold text-[#1a1a1a]">{f.q}</span>
                  <span className="ml-4 shrink-0 text-[#666]">{open === i ? "−" : "+"}</span>
                </button>
                {open === i ? <div className="px-5 pb-4 text-sm leading-6 text-[#444]">{f.a}</div> : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AffiliateFaq;
