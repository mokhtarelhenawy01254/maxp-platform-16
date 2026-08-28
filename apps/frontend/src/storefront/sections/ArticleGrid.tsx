import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getStorefrontScope } from "../../utils/storefrontApi";

interface Article {
  title: string;
  excerpt: string;
  image: string;
  href: string;
  date?: string;
  badge?: string;
}

interface Props {
  settings?: {
    title?: string;
    subtitle?: string;
    articles?: unknown;
    limit?: number;
  };
}

const demoArticles: Article[] = [
  {
    title: "How To Choose The Right Electric Beard Trimmers",
    excerpt: "Let's be honest: most guys treat their beard trimmer like a blunt instrument. You grab whatever is in the drawer, crank it to the highest setting, and hope for the best.",
    image: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&q=80&w=800",
    href: "#articles",
    badge: "Editor's Pick",
  },
  {
    title: "Winter To Spring Mens Grooming Transition Guide",
    excerpt: "As spring approaches, you'll need to adjust your grooming routine for warmer weather and increasing humidity.",
    image: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=800",
    href: "#articles",
    badge: "Guide",
  },
  {
    title: "Winter Lip Care For Men",
    excerpt: "Your lips need extra protection during winter since men's skin is naturally thinner with fewer oil glands.",
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=800",
    href: "#articles",
    badge: "Guide",
  },
  {
    title: "Winter Hand Cracking Skincare Fix",
    excerpt: "Your hands are especially vulnerable to winter's harsh assault, losing up to 25% of moisture in cold weather.",
    image: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&q=80&w=800",
    href: "#articles",
  },
  {
    title: "Winter Beard Care Guide Top Picks For Men",
    excerpt: "Winter skin and beard respond to oils that mimic natural sebum. Look for base oils like jojoba, argan, and squalane.",
    image: "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&q=80&w=800",
    href: "#articles",
  },
  {
    title: "Why Your Beard Feels Brittle In Cold Weather",
    excerpt: "Your beard feels brittle in cold weather because winter conditions reduce your skin's natural oil production.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800",
    href: "#articles",
  },
];

const ArticleGrid: React.FC<Props> = ({ settings }) => {
  const limit = Number(settings?.limit) || 6;
  const location = useLocation();
  const [liveArticles, setLiveArticles] = useState<Article[] | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const companyId = params.get("companyId") || getStorefrontScope();
    if (!companyId || companyId === "server" || companyId.includes("localhost")) return;
    fetch(`/api/v1/public/articles?companyId=${encodeURIComponent(companyId)}&limit=${limit}`, { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (j?.success && Array.isArray(j.data?.items) && j.data.items.length > 0) {
          const mapped: Article[] = j.data.items.map((a: any, idx: number) => ({
            title: a.title,
            excerpt: a.excerpt || "",
            image: a.heroImage || demoArticles[idx % demoArticles.length].image,
            href: `/store/articles/${a.slug}?companyId=${encodeURIComponent(companyId)}`,
            badge: idx === 0 ? "Editor's Pick" : a.category || "Guide",
            date: a.publishedAt,
          }));
          setLiveArticles(mapped);
        }
      })
      .catch(() => {});
  }, [limit, location.search]);

  const articles = (liveArticles && liveArticles.length > 0 ? liveArticles : demoArticles).slice(0, limit);

  return (
    <section className="w-full bg-background py-8" id="articles">
      <div className="container px-4 md:px-6">
        <div className="mx-auto max-w-[1100px]">
          {articles[0] ? (
            <Link
              to={articles[0].href}
              className="mb-8 block overflow-hidden rounded-lg border border-[#e8e8e8] bg-white transition hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)]"
            >
              <div className="grid md:grid-cols-2">
                <img src={articles[0].image} alt={articles[0].title} className="h-[280px] w-full object-cover md:h-full" />
                <div className="p-6 md:p-8">
                  <span className="inline-flex rounded bg-[#19212B] px-2 py-1 text-xs font-bold uppercase tracking-wide text-white">
                    {articles[0].badge}
                  </span>
                  <h2 className="mt-3 text-2xl font-extrabold leading-tight text-[#1a1a1a]">{articles[0].title}</h2>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#666]">{articles[0].excerpt}</p>
                  <span className="mt-4 inline-flex text-sm font-bold text-[#19212B]">Read Now →</span>
                </div>
              </div>
            </Link>
          ) : null}

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {articles.slice(1).map((a, i) => (
              <Link
                key={`${a.title}-${i}`}
                to={a.href}
                className="group overflow-hidden rounded-lg border border-[#e8e8e8] bg-white transition hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)]"
              >
                <img src={a.image} alt={a.title} className="h-[200px] w-full object-cover" loading="lazy" />
                <div className="p-5">
                  {a.badge ? (
                    <span className="mb-2 inline-flex text-xs font-bold uppercase tracking-wide text-[#19212B]">{a.badge}</span>
                  ) : null}
                  <h3 className="line-clamp-2 text-[15px] font-bold leading-5 text-[#1a1a1a] group-hover:text-[#19212B]">{a.title}</h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-5 text-[#666]">{a.excerpt}</p>
                  <span className="mt-3 inline-flex text-xs font-bold uppercase tracking-wide text-[#19212B]">Read More</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ArticleGrid;
