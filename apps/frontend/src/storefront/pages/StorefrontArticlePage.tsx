import React, { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import { getStorefrontScope } from "../../utils/storefrontApi";

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  heroImage?: string;
  authorName?: string;
  authorTitle?: string;
  category?: string;
  publishedAt?: string;
  createdAt?: string;
  amazonProducts?: string;
  faqItems?: string;
  tocItems?: string;
  sources?: string;
}

const parseJSON = (val?: string | null, fallback: any = null) => {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
};

interface StorefrontArticlePageProps {
  embedded?: boolean;
}

const StorefrontArticlePage: React.FC<StorefrontArticlePageProps> = ({
  embedded = false,
}) => {
  const { slug } = useParams();
  const location = useLocation();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const companyId = params.get('companyId') || getStorefrontScope();
    if (!slug || !companyId) { setError("Missing slug or company"); setLoading(false); return; }
    fetch(`/api/v1/public/articles/${encodeURIComponent(slug)}?companyId=${encodeURIComponent(companyId)}`, { credentials: 'include' })
      .then(r => r.json())
      .then(j => {
        if (j.success && j.data) setArticle(j.data);
        else setError(j.message || "Not found");
      }).catch(e => setError(e.message))
      .finally(()=>setLoading(false));
  }, [slug, location.search]);

  if (loading) return <div className="container py-20 text-center">جاري التحميل...</div>;
  if (error || !article) return <div className="container py-20 text-center">المقال غير موجود: {error} <Link to={`/store?companyId=${new URLSearchParams(location.search).get('companyId')||''}`} className="underline">العودة</Link></div>;

  const blocks = parseJSON(article.content, []);
  const products = parseJSON(article.amazonProducts, []);
  const faqs = parseJSON(article.faqItems, []);
  const toc = parseJSON(article.tocItems, []);
  const sources = parseJSON(article.sources, []);

  return (
    <div className="w-full bg-white" dir="ltr">
      {/* Dark navy header matching mensgroomingpro.com (only when standalone) */}
      {!embedded && (
        <header className="sticky top-0 z-50 w-full bg-[#19212B] text-white shadow-[0_2px_8px_rgba(0,0,0,.2)]">
        <div className="mx-auto flex h-[60px] max-w-[1100px] items-center justify-between px-4 md:px-6">
          <Link to={`/store?companyId=${new URLSearchParams(location.search).get('companyId')||''}`} className="text-[19px] font-bold tracking-[-0.5px] text-white">
            Mens Grooming Pro
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link to={`/store?companyId=${new URLSearchParams(location.search).get('companyId')||''}`} className="text-[14px] font-medium text-white/85 hover:text-white">Home</Link>
            <a href={`/store/about?companyId=${new URLSearchParams(location.search).get('companyId')||''}`} className="text-[14px] font-medium text-white/85 hover:text-white">About</a>
            <a href={`/store/contact?companyId=${new URLSearchParams(location.search).get('companyId')||''}`} className="text-[14px] font-medium text-white/85 hover:text-white">Contact</a>
            <a href={`/store/affiliate-disclaimer?companyId=${new URLSearchParams(location.search).get('companyId')||''}`} className="text-[14px] font-medium text-white/85 hover:text-white">Disclosure</a>
          </nav>
        </div>
      </header>
      )}
      {/* Breadcrumbs */}
      <div className="container px-4 md:px-6 py-3">
        <div className="mx-auto max-w-[1100px] text-[13px] text-[#888]">
          <Link to={`/store?companyId=${new URLSearchParams(location.search).get('companyId')||''}`} className="text-[#19212B] hover:underline">Home</Link>
          <span className="mx-1.5 text-[#bbb]">›</span>
          <span className="text-[#555]">{article.category || 'Guides'}</span>
          <span className="mx-1.5 text-[#bbb]">›</span>
          <span className="text-[#555]">{article.title}</span>
        </div>
      </div>

      {/* Hero */}
      {article.heroImage && (
        <div className="container px-4 md:px-6">
          <div className="mx-auto max-w-[1100px]">
            <img src={article.heroImage} alt={article.title} className="w-full h-[380px] md:h-[420px] object-cover rounded-lg" />
          </div>
        </div>
      )}

      {/* Title */}
      <div className="container px-4 md:px-6 py-6">
        <div className="mx-auto max-w-[1100px]">
          <h1 className="text-[28px] md:text-[32px] font-extrabold leading-tight text-[#1a1a1a]">{article.title}</h1>
          <p className="mt-2 text-sm text-[#666]">Published {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : new Date(article.createdAt || '').toLocaleDateString()} • {article.authorName || 'Mens Grooming Pro'}</p>

          {/* Disclosure */}
          <div className="mt-6 rounded-[6px] border border-[#f0d060] bg-[#fffbea] px-4 py-3 text-[13px] leading-6 text-[#7a6000]">
            <span className="font-bold">⚠️ Affiliate Disclosure:</span> This post contains affiliate links. If you purchase through our links, we may earn a small commission at no extra cost to you. <Link to={`/store/affiliate-disclaimer?companyId=${new URLSearchParams(location.search).get('companyId')||''}`} className="font-bold underline">Full disclosure here.</Link>
          </div>

          {/* Top Picks */}
          {products.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-bold text-[#1a1a1a]">Our Top Picks</h2>
              <p className="text-sm italic text-[#666]">Affiliate disclosure: if you buy through these links, we may earn a commission at no extra cost to you.</p>
              <div className="mt-4 space-y-4">
                {products.map((p: any, i: number) => (
                  <div key={i} className="flex flex-col md:flex-row gap-4 md:items-center rounded-lg border border-[#e8e8e8] bg-white p-4">
                    <a href={p.href} target="_blank" rel="nofollow noopener sponsored" className="shrink-0"><img src={p.image} alt={p.title} className="w-[120px] h-[120px] object-contain" loading="lazy" /></a>
                    <div className="flex-1">
                      {p.badge && <span className="inline-flex bg-[#19212B] text-white text-xs font-bold px-2 py-0.5 rounded uppercase">{p.badge}</span>}
                      <a href={p.href} target="_blank" rel="nofollow noopener sponsored" className="block mt-2 text-[15px] font-bold text-[#1a1a1a] hover:underline">{p.title}</a>
                      <span className="text-sm font-bold">{p.price}</span>
                    </div>
                    <a href={p.href} target="_blank" rel="nofollow noopener sponsored" className="inline-flex justify-center bg-[#19212B] text-white px-6 py-3 rounded text-sm font-bold uppercase shrink-0">Check Price</a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TOC */}
          {toc.length > 0 && (
            <div className="mt-8 rounded-lg border border-[#e8e8e8] bg-[#f8f8f8] p-5">
              <h3 className="text-sm font-bold uppercase tracking-wide">Table of Contents</h3>
              <ul className="mt-3 space-y-2">
                {toc.map((t: string, idx: number) => (
                  <li key={idx}><a href={`#section-${idx}`} className="text-sm text-[#19212B] hover:underline">• {t}</a></li>
                ))}
              </ul>
            </div>
          )}

          {/* Content blocks */}
          <div className="mt-8 prose prose-neutral max-w-none">
            {Array.isArray(blocks) ? blocks.map((b: any, idx: number) => {
              if (b.type === 'h2') return <h2 key={idx} id={`section-${idx}`} className="text-xl font-bold mt-8 mb-3 text-[#1a1a1a]">{b.text}</h2>;
              if (b.type === 'proTip') return <div key={idx} className="border-l-4 border-[#19212B] bg-[#f0f4f8] px-4 py-3 my-4 text-sm leading-6"><span className="font-bold">💡 Pro Tip:</span> {b.text}</div>;
              if (b.type === 'image') return <img key={idx} src={b.src} alt={b.alt || ''} className="my-6 rounded-lg w-full object-cover" />;
              return <p key={idx} className="text-[15px] leading-7 text-[#333] my-4">{b.text}</p>;
            }) : <div className="whitespace-pre-wrap text-[15px] leading-7">{article.content}</div>}
          </div>

          {/* FAQ */}
          {faqs.length > 0 && (
            <div className="mt-10">
              <h3 className="text-xl font-bold">Frequently Asked Questions</h3>
              <div className="mt-4 divide-y border rounded-lg bg-white">
                {faqs.map((f: any, i: number) => (
                  <details key={i} className="px-5 py-4" open={i===0}>
                    <summary className="font-bold text-sm cursor-pointer list-none flex justify-between">{f.q}<span>{i===0 ? '−' : '+'}</span></summary>
                    <p className="mt-2 text-sm leading-6 text-[#444]">{f.a}</p>
                  </details>
                ))}
              </div>
              <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify({ "@context":"https://schema.org","@type":"FAQPage", mainEntity: faqs.map((f:any)=>({ "@type":"Question", name:f.q, acceptedAnswer:{ "@type":"Answer", text:f.a}}))})}} />
            </div>
          )}

          {/* Sources */}
          {sources.length > 0 && (
            <div className="mt-10 border-t pt-6">
              <h3 className="font-bold">Sources & References</h3>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                {sources.map((s: string, i:number)=><li key={i} className="text-sm text-[#19212B] underline">{s}</li>)}
              </ul>
              <p className="text-xs text-[#888] mt-3">By {article.authorName} • {article.authorTitle}</p>
            </div>
          )}

          {/* JSON-LD Article */}
          <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify({
            "@context":"https://schema.org","@type":"Article",
            headline: article.title,
            description: article.excerpt || article.title,
            image: article.heroImage,
            author: { "@type":"Person", name: article.authorName || 'Jake Morrison' },
            publisher: { "@type":"Organization", name:"Mens Grooming Pro", logo:{ "@type":"ImageObject", url:"https://mensgroomingpro.com/img/logo.svg"}},
            datePublished: article.publishedAt || article.createdAt
          })}} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify({
            "@context":"https://schema.org","@type":"BreadcrumbList",
            itemListElement:[
              {"@type":"ListItem", position:1, name:"Home", item:"https://mensgroomingpro.com/"},
              {"@type":"ListItem", position:2, name: article.category || 'Guides', item:"https://mensgroomingpro.com/category"},
              {"@type":"ListItem", position:3, name: article.title}
            ]
          })}} />
        </div>
      </div>

      {/* Footer matching mensgroomingpro.com (only when standalone) */}
      {!embedded && (
        <footer className="mt-12 border-t border-[#e8e8e8] bg-white py-8">
        <div className="mx-auto flex max-w-[1100px] flex-col items-center justify-between gap-4 px-4 md:flex-row md:px-6">
          <p className="text-sm text-[#666]">© 2026 Mens Grooming Pro</p>
          <nav className="flex flex-wrap items-center justify-center gap-5">
            <Link to={`/store?companyId=${new URLSearchParams(location.search).get('companyId')||''}`} className="text-sm text-[#19212B] hover:underline">About</Link>
            <a href={`/store/contact?companyId=${new URLSearchParams(location.search).get('companyId')||''}`} className="text-sm text-[#19212B] hover:underline">Contact</a>
            <a href={`/store/privacy?companyId=${new URLSearchParams(location.search).get('companyId')||''}`} className="text-sm text-[#19212B] hover:underline">Privacy Policy</a>
            <a href={`/store/terms?companyId=${new URLSearchParams(location.search).get('companyId')||''}`} className="text-sm text-[#19212B] hover:underline">Terms of Use</a>
            <a href={`/store/affiliate-disclaimer?companyId=${new URLSearchParams(location.search).get('companyId')||''}`} className="text-sm text-[#19212B] hover:underline">Affiliate Disclaimer</a>
          </nav>
          <div className="flex items-center gap-3">
            {[
              { label: 'Facebook', d: 'M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8v-6.93H7.9V12H10V9.8c0-2.07 1.23-3.22 3.12-3.22.9 0 1.85.16 1.85.16v2.03h-1.04c-1.03 0-1.35.64-1.35 1.29V12h2.3l-.37 2.87h-1.93v6.93c4.56-.93 8-4.96 8-9.8Z', href: 'https://facebook.com/mensgroomingpro' },
              { label: 'Instagram', d: 'M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.72 3.72 0 0 1-1.38-.9 3.72 3.72 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07Zm0 4.5a5.34 5.34 0 1 0 0 10.68 5.34 5.34 0 0 0 0-10.68Zm0 8.8a3.46 3.46 0 1 1 0-6.92 3.46 3.46 0 0 1 0 6.92Zm6.8-9.2a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Z', href: 'https://instagram.com/mensgroomingpro' },
              { label: 'Twitter', d: 'M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.67l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23Zm-1.16 17.52h1.83L7.08 4.13H5.12l11.96 15.64Z', href: 'https://twitter.com/mensgroomingpro' },
              { label: 'YouTube', d: 'M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.81ZM9.55 15.57V8.43L15.82 12l-6.27 3.57Z', href: 'https://youtube.com/@mensgroomingpro' },
            ].map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#f1f1f1] text-[#19212B] transition-colors hover:bg-[#19212B] hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d={s.d} /></svg>
              </a>
            ))}
          </div>
        </div>
      </footer>
      )}
    </div>
  );
};

export default StorefrontArticlePage;
