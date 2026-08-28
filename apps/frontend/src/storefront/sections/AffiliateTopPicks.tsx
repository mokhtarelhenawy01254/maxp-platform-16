import React from "react";

interface Product {
  badge?: string;
  title?: string;
  price?: string;
  image?: string;
  href?: string;
  cta?: string;
}

interface Props {
  settings?: {
    title?: string;
    subtitle?: string;
    products?: unknown;
  };
}

const parseProducts = (value: unknown): Product[] => {
  if (Array.isArray(value) && value.length > 0) {
    return (value as Product[]).slice(0, 3);
  }
  if (typeof value === "string" && value.trim()) {
    // textarea format: title|price|image|href|badge per line
    return value
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const [title, price, image, href, badge] = line.split("|").map((s) => s.trim());
        return { title, price, image, href, badge, cta: "Check Price" };
      })
      .slice(0, 3);
  }
  // demo fallback matching original site
  return [
    {
      badge: "Best Overall",
      title: "Ufree Professional Beard Trimmer for Men, Electric Shaver Razor, Men Gift",
      price: "$35.99",
      image: "https://m.media-amazon.com/images/I/51rmE5C51HL._SL500_.jpg",
      href: "https://www.amazon.com/dp/B0BMKLJW22?tag=mensgroomingpro-20",
      cta: "Check Price",
    },
    {
      badge: "Pick #2",
      title: "OLOV For Man Beard Trimmer, 21 Piece All-in-One Mens Grooming Kit and Hair Clipper",
      price: "$34.99",
      image: "https://m.media-amazon.com/images/I/41XhZ9ow1KL._SL500_.jpg",
      href: "https://www.amazon.com/dp/B0CGHWFF71?tag=mensgroomingpro-20",
      cta: "Check Price",
    },
    {
      badge: "Pick #3",
      title: "Ufree Beard Trimmer for Men, Waterproof Electric Razor, Grooming Kit",
      price: "$29.59",
      image: "https://m.media-amazon.com/images/I/51Ymz+xwYYL._SL500_.jpg",
      href: "https://www.amazon.com/dp/B08P4HHSZT?tag=mensgroomingpro-20",
      cta: "Check Price",
    },
  ];
};

const AffiliateTopPicks: React.FC<Props> = ({ settings }) => {
  const products = parseProducts(settings?.products);
  const title = settings?.title || "Our Top Picks";
  const subtitle =
    settings?.subtitle || "Affiliate disclosure: if you buy through these links, we may earn a commission at no extra cost to you.";

  return (
    <section className="w-full bg-background py-6">
      <div className="container px-4 md:px-6">
        <div className="mx-auto max-w-[1100px]">
          <h2 className="text-2xl font-bold text-[#1a1a1a]">{title}</h2>
          <p className="mt-1 text-sm italic text-[#666]">{subtitle}</p>
          <div className="mt-6 space-y-4">
            {products.map((p, i) => (
              <div
                key={i}
                className="flex flex-col gap-4 rounded-lg border border-[#e8e8e8] bg-white p-4 md:flex-row md:items-center md:gap-6"
              >
                <a
                  href={p.href}
                  target="_blank"
                  rel="nofollow noopener sponsored"
                  className="shrink-0"
                >
                  <img
                    src={p.image}
                    alt={p.title}
                    className="h-[140px] w-[140px] object-contain md:h-[120px] md:w-[120px]"
                    loading="lazy"
                  />
                </a>
                <div className="flex flex-1 flex-col gap-2">
                  {p.badge ? (
                    <span className="inline-flex w-fit rounded bg-[#19212B] px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
                      {p.badge}
                    </span>
                  ) : null}
                  <a
                    href={p.href}
                    target="_blank"
                    rel="nofollow noopener sponsored"
                    className="text-[15px] font-bold leading-5 text-[#19212B] hover:underline"
                  >
                    {p.title}
                  </a>
                  {p.price ? <span className="text-[15px] font-bold text-[#1a1a1a]">{p.price}</span> : null}
                </div>
                <a
                  href={p.href}
                  target="_blank"
                  rel="nofollow noopener sponsored"
                  className="inline-flex shrink-0 items-center justify-center rounded bg-[#19212B] px-6 py-3 text-sm font-bold uppercase tracking-wide text-white hover:bg-[#2d3a4a] md:w-[160px]"
                >
                  {p.cta || "Check Price"}
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AffiliateTopPicks;
