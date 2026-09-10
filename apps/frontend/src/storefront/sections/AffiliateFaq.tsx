import React, { useState } from "react";

interface FaqItem {
  q: string;
  a: string;
}

interface Props {
  settings?: {
    badge?: string;
    title?: string;
    subtitle?: string;
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
  const badge = settings?.badge;
  const title = settings?.title || "Frequently Asked Questions";
  const subtitle = settings?.subtitle;
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
    <section className="w-full bg-background py-12 md:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="container px-4 md:px-6">
        <div className="mx-auto max-w-[1000px]">
          <div className="text-start mb-8">
            {badge && (
              <span className="inline-block px-3.5 py-1 text-xs font-black uppercase tracking-wider rounded-full bg-primary/10 text-primary border border-primary/20 mb-3">
                {badge}
              </span>
            )}
            <h2 className="text-2xl md:text-4xl font-black text-foreground font-heading tracking-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-2 text-sm md:text-base text-muted-foreground max-w-2xl leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>

          <div className="divide-y divide-border/60 rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
            {faqs.map((f, i) => {
              const isOpen = open === i;
              return (
                <div key={i} className="transition-colors">
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center justify-between px-6 py-5 text-start transition-colors hover:bg-muted/40 group focus:outline-none"
                    aria-expanded={isOpen}
                  >
                    <span className="text-base md:text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                      {f.q}
                    </span>
                    <span className={`ms-4 shrink-0 flex items-center justify-center w-8 h-8 rounded-full border border-border/60 text-foreground transition-all duration-200 ${isOpen ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/40 group-hover:border-primary/50'}`}>
                      {isOpen ? (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                      ) : (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                      )}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 pt-1 text-sm md:text-base leading-relaxed text-muted-foreground border-t border-border/20 animate-in fade-in-50 duration-200">
                      {f.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AffiliateFaq;
