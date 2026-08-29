import React from "react";
import { Link } from "react-router-dom";

interface Props {
  settings?: {
    items?: unknown;
  };
}

const parseItems = (value: unknown): { label: string; href?: string }[] => {
  if (Array.isArray(value)) return value as any;
  if (typeof value === "string" && value.trim()) {
    return value
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((label, i, arr) => ({
        label,
        href: i === arr.length - 1 ? undefined : i === 0 ? "/" : `/${label.toLowerCase().replace(/\s+/g, "-")}`,
      }));
  }
  return [
    { label: "Home", href: "/" },
    { label: "Guides", href: "/collections" },
    { label: "How To Choose The Right Electric Beard Trimmers" },
  ];
};

const AffiliateBreadcrumbs: React.FC<Props> = ({ settings }) => {
  const items = parseItems(settings?.items);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.label,
      ...(it.href ? { item: `https://mensgroomingpro.com${it.href}` } : {}),
    })),
  };

  return (
    <section className="w-full bg-background py-2">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="container px-4 md:px-6">
        <div className="mx-auto max-w-[1100px]">
          <nav className="flex items-center gap-1.5 text-[13px] text-[#888]">
            {items.map((it, i) => (
              <React.Fragment key={i}>
                {i > 0 ? <span className="text-[#bbb]">›</span> : null}
                {it.href ? (
                  <Link to={it.href} className="text-[#19212B] hover:underline">
                    {it.label}
                  </Link>
                ) : (
                  <span className="text-[#555]">{it.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        </div>
      </div>
    </section>
  );
};

export default AffiliateBreadcrumbs;
