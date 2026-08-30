import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { buildStorefrontPath } from '../utils/paths';

interface Hotspot {
  x?: number | string;
  y?: number | string;
  label?: string;
  title?: string;
  description?: string;
  image?: string;
  link?: string;
}

interface LookTab {
  label?: string;
  title?: string;
  image?: string;
  hotspots?: Hotspot[];
}

interface ShopTheLookProps {
  section?: { variant?: string };
  settings?: {
    badge?: string;
    title?: string;
    subtitle?: string;
    image?: string;
    tabs?: LookTab[] | string;
    ctaText?: string;
    ctaLink?: string;
  };
}

const parseTabs = (value: ShopTheLookProps['settings'] extends undefined ? never : unknown): LookTab[] => {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value !== 'string') {
    return [];
  }
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label = '', title = '', image = '', hotspotsRaw = ''] = line.split('|').map((part) => part.trim());
      const hotspots = hotspotsRaw
        ? hotspotsRaw.split(';').map((h) => {
            const [x = '', y = '', label = '', hTitle = '', hDesc = '', hImg = '', hLink = ''] = h.split(':').map((part) => part.trim());
            return { x, y, label, title: hTitle, description: hDesc, image: hImg, link: hLink };
          })
        : [];
      return { label, title, image, hotspots };
    });
};

const DEFAULT_TABS: LookTab[] = [
  { label: 'Men', title: 'Urban Rider Leather Jacket', image: 'https://texture-a2xirfpg.myshopify.com/cdn/shop/files/Rectangle_33_12.png?v=1787286499&width=900', hotspots: [
    { x: '60', y: '28', title: 'Refined Craftsmanship', description: 'Premium stitching and tailored finishing.', link: '/shop?category=mens' },
    { x: '42', y: '46', title: 'Premium Fabrics', description: 'Soft, durable materials built to last.', link: '/shop?category=mens' },
    { x: '70', y: '64', title: 'Everyday Comfort', description: 'Designed for effortless daily wear.', link: '/shop?category=mens' },
  ] },
  { label: 'Women', title: 'Classic White Belted Shirt Dress', image: 'https://texture-a2xirfpg.myshopify.com/cdn/shop/files/white-pinstripe-blazer-dress.png?v=1787655842&width=900', hotspots: [
    { x: '48', y: '30', title: 'Tailored Silhouette', description: 'A relaxed, feminine fit.', link: '/shop?category=womens' },
    { x: '65', y: '52', title: 'Polished Detail', description: 'Collared neckline and refined finish.', link: '/shop?category=womens' },
  ] },
  { label: 'Kids', title: 'Little Sunshine Ruffle Dress', image: 'https://texture-a2xirfpg.myshopify.com/cdn/shop/files/Rectangle45542.png?v=1787663167&width=900', hotspots: [
    { x: '50', y: '40', title: 'Soft Comfort', description: 'Gentle fabrics for little ones.', link: '/shop?category=kids' },
  ] },
];

const LOOK_IMAGES: Record<string, string> = {
  Men: 'https://texture-a2xirfpg.myshopify.com/cdn/shop/files/Rectangle_33_12.png?v=1787286499&width=900',
  Women: 'https://texture-a2xirfpg.myshopify.com/cdn/shop/files/white-pinstripe-blazer-dress.png?v=1787655842&width=900',
  Kids: 'https://texture-a2xirfpg.myshopify.com/cdn/shop/files/Rectangle45542.png?v=1787663167&width=900',
};

const ShopTheLook: React.FC<ShopTheLookProps> = ({ section: _section, settings }) => {
  const location = useLocation();
  const badge = settings?.badge || 'Shop The Look';
  const title = settings?.title || 'Explore Every Detail of Your Perfect Outfit';
  const subtitle =
    settings?.subtitle ||
    'Click the hotspots to discover premium fabrics, refined craftsmanship, stylish details, and the carefully selected features that make every piece comfortable, durable, and effortlessly fashionable.';
  const tabs = parseTabs(settings?.tabs);
  const resolvedTabs = tabs.length > 0 ? tabs : DEFAULT_TABS;
  const [active, setActive] = useState(0);
  const [openHotspot, setOpenHotspot] = useState(-1);
  const activeTab: LookTab =
    resolvedTabs[Math.min(active, resolvedTabs.length - 1)] ??
    resolvedTabs[0] ?? { label: 'Men', title: '', image: '', hotspots: [] };
  const activeHotspots: Hotspot[] = activeTab.hotspots || [];
  const firstHotspotLink = activeHotspots[0]?.link || '';
  const image =
    activeTab.image || LOOK_IMAGES[activeTab.label || ''] || LOOK_IMAGES['Men'] || '';

  return (
    <section className="w-full bg-white py-14 md:py-20">
      <style>{`
        .sf-hotspot-dot { position: absolute; transform: translate(-50%,-50%); z-index: 3; }
        .sf-hotspot-dot::before { content:''; position:absolute; inset:-6px; border-radius:9999px; background:rgba(225,98,68,.35); animation: sfPing 1.8s ease-out infinite; }
        @keyframes sfPing { 0%{transform:scale(.6);opacity:.9} 70%{transform:scale(1.8);opacity:0} 100%{transform:scale(1.8);opacity:0} }
      `}</style>
      <div className="container mx-auto max-w-[176rem] px-5 md:px-10">
        <div
          className="overflow-hidden rounded-[22px] text-white"
          style={{ background: 'linear-gradient(135deg, #241812 0%, #120b08 55%, #1c110c 100%)' }}
        >
          <div className="grid lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.3fr)]">
            {/* Left column */}
            <div className="flex flex-col gap-6 p-7 md:p-12">
              <div>
                <span className="inline-block rounded-md bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/80">
                  {badge}
                </span>
                <h2 className="mt-3 font-heading text-2xl font-semibold leading-snug md:text-[2.1rem]">{title}</h2>
                {subtitle && <p className="mt-3 max-w-md text-sm leading-7 text-white/70">{subtitle}</p>}
              </div>

              {/* Tabs */}
              <div className="flex flex-col">
                {resolvedTabs.map((tab, index) => {
                  const isActive = index === active;
                  return (
                    <button
                      key={`${tab.label}-${index}`}
                      type="button"
                      onClick={() => { setActive(index); setOpenHotspot(-1); }}
                      className={`flex items-center justify-between border-b border-white/10 py-3.5 text-start transition-colors ${
                        isActive ? 'text-white' : 'text-white/55 hover:text-white/85'
                      }`}
                    >
                      <span className={`text-[15px] ${isActive ? 'font-semibold' : ''}`}>{tab.label}</span>
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full transition-all duration-300 ${
                          isActive ? 'bg-white text-[#171717]' : 'bg-white/10 text-white/70'
                        }`}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M5 12h14" />
                          <path d="m13 6 6 6-6 6" />
                        </svg>
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Product mini card */}
              <div className="mt-1 w-full max-w-[260px] overflow-hidden rounded-[14px] bg-white/[0.07] backdrop-blur-sm transition-colors hover:bg-white/[0.11]">
                <div className="aspect-[4/3] overflow-hidden">
                  {image ? (
                    <img src={image} alt={activeTab.title || 'look'} loading="lazy" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="p-4">
                  <p className="line-clamp-2 text-sm font-semibold leading-5 text-white">{activeTab.title}</p>
                  {firstHotspotLink ? (
                    <Link
                      to={buildStorefrontPath(location.pathname, firstHotspotLink.startsWith('/') ? firstHotspotLink : `/${firstHotspotLink}`, location.search)}
                      className="mt-2.5 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/85 transition-colors hover:text-white"
                    >
                      Shop this look
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Right image + hotspots */}
            <div className="relative min-h-[420px]">
              <img src={image} alt={activeTab.title || 'look'} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
              {activeHotspots.map((hotspot, index) => {
                const x = hotspot.x ? String(hotspot.x).replace('%', '') : '50';
                const y = hotspot.y ? String(hotspot.y).replace('%', '') : '50';
                const isOpen = openHotspot === index;
                return (
                  <div key={`${hotspot.title}-${index}`} className="sf-hotspot-dot" style={{ left: `${x}%`, top: `${y}%` }}>
                    <button
                      type="button"
                      onClick={() => setOpenHotspot(isOpen ? -1 : index)}
                      aria-label={hotspot.title || 'hotspot'}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e16244] text-white shadow-[0_8px_20px_rgba(0,0,0,0.35)] transition-transform hover:scale-110"
                    >
                      <span className="text-sm font-bold">+</span>
                    </button>
                    {isOpen && (
                      <div className="absolute left-1/2 top-9 z-10 w-56 -translate-x-1/2 rounded-[12px] border border-black/5 bg-white p-4 text-[#171717] shadow-[0_18px_44px_-24px_rgba(0,0,0,0.4)]">
                        {hotspot.image && <img src={hotspot.image} alt="" loading="lazy" className="mb-2 h-20 w-full rounded-md object-cover" />}
                        <p className="text-sm font-semibold">{hotspot.title}</p>
                        {hotspot.description && <p className="mt-1 text-xs leading-5 text-[#575757]">{hotspot.description}</p>}
                        {hotspot.link && (
                          <Link
                            to={buildStorefrontPath(location.pathname, hotspot.link.startsWith('/') ? hotspot.link : `/${hotspot.link}`, location.search)}
                            className="mt-2 inline-flex text-[11px] font-semibold uppercase tracking-[0.1em] text-[#e16244]"
                          >
                            Shop Now →
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ShopTheLook;
