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

const StorefrontArticlePage: React.FC = () => {
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
    </div>
  );
};

export default StorefrontArticlePage;
