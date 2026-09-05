import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Home, ShoppingBag } from 'lucide-react';
import { useStorefrontTheme } from '../engine/ThemeProvider';
import { useCategories } from '../hooks/useCategories';
import { buildStorefrontPath } from '../utils/paths';

interface StorefrontNotFoundProps {
  title?: string;
  message?: string;
}

export const StorefrontNotFound: React.FC<StorefrontNotFoundProps> = ({
  title,
  message,
}) => {
  const { theme } = useStorefrontTheme();
  const { categories } = useCategories();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');

  const isRtl = theme.direction === 'rtl';

  useEffect(() => {
    // 1. Guard against Soft 404: Set document title
    const prevTitle = document.title;
    document.title = isRtl ? '404 - الصفحة غير موجودة' : '404 - Page Not Found';

    // 2. Guard against Soft 404: Add noindex, follow
    let robotsMeta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    let created = false;
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.setAttribute('name', 'robots');
      document.head.appendChild(robotsMeta);
      created = true;
    }
    const prevRobots = robotsMeta.getAttribute('content');
    robotsMeta.setAttribute('content', 'noindex, follow');

    return () => {
      if (prevTitle) document.title = prevTitle;
      if (robotsMeta) {
        if (created) {
          robotsMeta.remove();
        } else if (prevRobots) {
          robotsMeta.setAttribute('content', prevRobots);
        }
      }
    };
  }, [isRtl]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    const targetPath = buildStorefrontPath(
      location.pathname,
      `/shop?search=${encodeURIComponent(query)}`,
      location.search,
    );
    navigate(targetPath);
  };

  const visibleCategories = (categories || []).slice(0, 6);

  return (
    <div
      className="container max-w-2xl mx-auto px-4 py-12 sm:py-20 text-center space-y-6"
      dir={theme.direction}
    >
      {/* 404 Badge & Heading */}
      <div className="space-y-2">
        <div className="inline-flex items-center justify-center px-4 py-1 rounded-full text-xs font-semibold tracking-wider uppercase bg-primary/10 text-primary mb-2">
          {isRtl ? 'خطأ 404' : 'Error 404'}
        </div>
        <h1 className="text-3xl sm:text-5xl font-black font-heading text-foreground tracking-tight">
          {title || (isRtl ? 'الصفحة غير موجودة' : 'Page Not Found')}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
          {message ||
            (isRtl
              ? 'عذراً، لم نتمكن من العثور على الصفحة التي تبحث عنها. ربما تم نقلها أو حذفها.'
              : "Sorry, we couldn't find the page you're looking for. It might have been moved or removed.")}
        </p>
      </div>

      {/* Instant Search Bar Recovery */}
      <form onSubmit={handleSearchSubmit} className="max-w-md mx-auto w-full">
        <div className="relative flex items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isRtl ? 'ابحث عن منتج أو تصنيف...' : 'Search products or categories...'}
            className="w-full h-11 sm:h-12 pl-4 pr-11 rtl:pr-4 rtl:pl-11 rounded-full border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-sm transition-all"
          />
          <button
            type="submit"
            aria-label={isRtl ? 'بحث' : 'Search'}
            className="absolute right-1 rtl:right-auto rtl:left-1 top-1 bottom-1 px-3 sm:px-4 rounded-full bg-primary text-primary-foreground text-xs sm:text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Category Quick Recovery Pills */}
      {visibleCategories.length > 0 && (
        <div className="space-y-2 pt-2">
          <p className="text-xs text-muted-foreground font-medium">
            {isRtl ? 'أو تصفح أحد الأقسام الشائعة:' : 'Or browse popular collections:'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {visibleCategories.map((cat) => (
              <Link
                key={cat.id}
                to={buildStorefrontPath(
                  location.pathname,
                  `/collections/${encodeURIComponent(cat.slug || cat.id)}`,
                  location.search,
                )}
                className="inline-flex items-center min-h-[38px] px-3.5 py-1.5 rounded-full border border-border bg-muted/30 hover:bg-muted text-xs font-medium text-foreground transition-colors"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Primary Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
        <Link
          to={buildStorefrontPath(location.pathname, '/', location.search)}
          className="inline-flex items-center justify-center min-h-[44px] px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm gap-2"
        >
          <Home className="w-4 h-4" />
          <span>{isRtl ? 'العودة للرئيسية' : 'Back to Home'}</span>
        </Link>
        <Link
          to={buildStorefrontPath(location.pathname, '/shop', location.search)}
          className="inline-flex items-center justify-center min-h-[44px] px-6 py-2.5 rounded-full border border-border bg-background text-foreground text-sm font-semibold hover:bg-muted transition-colors gap-2"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>{isRtl ? 'تصفح المتجر' : 'Browse Shop'}</span>
        </Link>
      </div>
    </div>
  );
};

export default StorefrontNotFound;
