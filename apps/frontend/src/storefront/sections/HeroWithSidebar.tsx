import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { buildStorefrontPath } from '../utils/paths';
import { useStorefrontTheme } from '../engine/ThemeProvider';

interface HeroWithSidebarProps {
  settings?: {
    categories?: string[];
    categoryTitle?: string;
    slides?: Array<{
      image: string;
      title: string;
      subtitle: string;
      buttonText: string;
      eyebrow?: string;
      buttonLink?: string;
    }>;
  };
}

const HeroWithSidebar: React.FC<HeroWithSidebarProps> = ({ settings }) => {
  const location = useLocation();
  const { theme } = useStorefrontTheme();
  const isRtl = theme.direction === 'rtl';
  
  const categories =
    settings?.categories ||
    (isRtl
      ? ['فساتين يومية', 'جاكيتات خفيفة', 'حقائب مرتبة', 'وصل حديثًا']
      : ['Dresses', 'Tops', 'Bottoms', 'Accessories']);
  const slides = settings?.slides || [
    {
      image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=2070',
      title: isRtl ? 'وصل جديد هذا الأسبوع' : 'New Season Arrivals',
      subtitle: isRtl
        ? 'واجهة كتالوج مرتبة للقطع اليومية والجديد الذي يستحق الظهور أولًا.'
        : 'Discover the latest in high fashion minimalism.',
      buttonText: isRtl ? 'شاهدي الجديد' : 'Shop Now',
      eyebrow: isRtl ? 'اختيار المحرر' : 'Limited Edition',
      buttonLink: '/shop?sortBy=createdAt&sortOrder=desc',
    }
  ];

  const mainSlide = slides[0] || {
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=2070',
    title: isRtl ? 'وصل جديد هذا الأسبوع' : 'New Season Arrivals',
    subtitle: isRtl
      ? 'واجهة كتالوج مرتبة للقطع اليومية والجديد الذي يستحق الظهور أولًا.'
      : 'Discover the latest in high fashion minimalism.',
    buttonText: isRtl ? 'شاهدي الجديد' : 'Shop Now',
    eyebrow: isRtl ? 'اختيار المحرر' : 'Limited Edition',
    buttonLink: '/shop?sortBy=createdAt&sortOrder=desc',
  };
  const categoryTitle =
    settings?.categoryTitle || (isRtl ? 'روابط سريعة' : 'Categories');
  const eyebrow = mainSlide.eyebrow || (isRtl ? 'اختيار المحرر' : 'Limited Edition');
  const buttonLink =
    typeof mainSlide.buttonLink === 'string' && mainSlide.buttonLink.trim()
      ? mainSlide.buttonLink.trim()
      : '/shop';

  return (
    <section className="container py-6 md:py-10">
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
        <aside className="hidden lg:block border border-border rounded-[var(--button-radius,0px)] overflow-hidden bg-card">
          <div className="bg-primary px-6 py-4">
            <h3 className="text-primary-foreground font-bold tracking-[0.12em] text-sm">
              {categoryTitle}
            </h3>
          </div>
          <nav className="p-2">
            <ul className="space-y-1">
              {categories.map((cat) => (
                <li key={cat}>
                  <Link
                    to={buildStorefrontPath(
                      location.pathname,
                      `/shop?search=${encodeURIComponent(cat)}`,
                      location.search,
                    )}
                    className="block px-4 py-2.5 text-sm hover:bg-muted font-medium transition-colors rounded-sm"
                  >
                    {cat}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="relative group overflow-hidden rounded-[var(--button-radius,0px)] bg-muted min-h-[320px] md:min-h-[500px] flex items-center">
          <img
            src={mainSlide.image}
            alt={mainSlide.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/28" />
          
          <div className="relative z-10 px-6 md:px-16 max-w-2xl space-y-5 md:space-y-6">
            <div className="space-y-2">
              <span className="inline-block text-primary font-bold tracking-[0.18em] text-xs mb-2">
                {eyebrow}
              </span>
              <h1 className="text-3xl md:text-6xl font-extrabold text-white font-heading leading-tight drop-shadow-md">
                {mainSlide.title}
              </h1>
              <p className="text-base md:text-xl text-white/90 font-sans max-w-lg drop-shadow-sm">
                {mainSlide.subtitle}
              </p>
            </div>
            
            <Link
              to={buildStorefrontPath(location.pathname, buttonLink, location.search)}
              className="inline-flex items-center justify-center px-8 py-3.5 bg-white text-black font-bold tracking-[0.08em] text-sm hover:bg-primary hover:text-primary-foreground transition-all active:scale-95 shadow-xl"
            >
              {mainSlide.buttonText}
            </Link>
          </div>

          <div className="absolute top-10 right-10 w-24 h-24 border border-white/20 rounded-full hidden md:block" />
          <div className="absolute bottom-10 right-20 w-12 h-12 border-2 border-primary rounded-full hidden md:block opacity-50" />
        </div>
      </div>
    </section>
  );
};

export default HeroWithSidebar;
