import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { buildStorefrontPath } from '../utils/paths';

interface GlassmorphicGridProps {
  settings?: {
    title?: string;
    subtitle?: string;
    badge?: string;
    items?: Array<{
      icon?: string;
      label?: string;
      title: string;
      description?: string;
      image?: string;
      price?: string;
    }>;
    viewAllText?: string;
    itemCtaText?: string;
    blur?: number;
    borderGlow?: boolean;
  };
}

const GlassmorphicGrid: React.FC<GlassmorphicGridProps> = ({ settings }) => {
  const location = useLocation();

  const title = settings?.title || 'Trending Tech';
  const blur = settings?.blur || 12;
  const borderGlow = settings?.borderGlow !== false;
  const viewAllText = settings?.viewAllText || 'View All Gear';
  const itemCtaText = settings?.itemCtaText || 'Add to Rig';

  const demoItems = settings?.items || [
    { image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&q=80&w=400', title: 'Earbuds Pro', price: '$129' },
    { image: 'https://images.unsplash.com/photo-1510511459019-5dee2c1a7eaa?auto=format&fit=crop&q=80&w=400', title: 'Smart Watch', price: '$249' },
    { image: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&q=80&w=400', title: 'Gaming Headset', price: '$89' },
    { image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&q=80&w=400', title: 'Wireless Case', price: '$49' },
  ];

  return (
    <section className="container py-12 md:py-20 relative">
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-[150px] -z-10" />

      <div className="flex items-center justify-between mb-10">
        <h2 className="text-3xl md:text-5xl font-black text-foreground font-heading tracking-tight uppercase">
          {title}
        </h2>
        <Link 
          to={buildStorefrontPath(location.pathname, '/shop', location.search)}
          className="text-primary font-bold tracking-widest text-xs uppercase hover:underline"
        >
          {viewAllText}
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {demoItems.map((item, idx) => (
          <div 
            key={idx}
            className={`group relative overflow-hidden rounded-[var(--button-radius,8px)] border border-white/10 bg-surface/40 backdrop-blur-[${blur}px] p-4 transition-all duration-500 hover:scale-[1.02] ${borderGlow ? 'hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.3)] hover:border-primary/40' : ''}`}
          >
            <div className="aspect-square relative overflow-hidden rounded-[calc(var(--button-radius,8px)-4px)] mb-4">
               <img 
                 src={item.image} 
                 alt={item.title} 
                 loading="lazy"
                 width="400"
                 height="400"
                 className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
               />
               <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-foreground font-sans">
                {item.title}
              </h3>
              <p className="text-primary font-black tracking-widest text-sm uppercase">
                {item.price}
              </p>
            </div>

            <button className="mt-4 w-full py-2.5 bg-primary/10 text-primary border border-primary/20 rounded-md font-bold text-xs uppercase tracking-widest group-hover:bg-primary group-hover:text-black transition-colors">
              {itemCtaText}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};

export default GlassmorphicGrid;
