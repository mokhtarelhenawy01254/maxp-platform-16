import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, ArrowRight, Star, Zap, Gift, TrendingUp,
  Package, ChevronLeft, ChevronRight, BadgeCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MarketplaceApp } from "@/types/marketplace";
import { appIconsBySlug, categoryCssClass, getPrice } from "@/utils/marketplace";

interface HeroBannerProps {
  featuredApps: MarketplaceApp[];
  className?: string;
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
};

export function HeroBanner({ featuredApps, className }: HeroBannerProps) {
  const { t } = useTranslation();
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const total = featuredApps.length;

  const next = useCallback(() => {
    if (total <= 1) return;
    setDirection(1);
    setCurrent(prev => (prev + 1) % total);
  }, [total]);

  const prev = useCallback(() => {
    if (total <= 1) return;
    setDirection(-1);
    setCurrent(prev => (prev - 1 + total) % total);
  }, [total]);

  useEffect(() => {
    if (!isAutoPlaying || total <= 1) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [isAutoPlaying, next, total]);

  if (total === 0) return null;

  const app = featuredApps[current];
  if (!app) return null;

  const BrandIcon = app.slug ? appIconsBySlug[app.slug] : undefined;
  const catCls = categoryCssClass[app.category] || "";

  return (
    <div
      className={cn(
        "mp-hero-banner",
        catCls,
        className
      )}
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
        <div className="mp-hero-glow" />
        <div className="mp-hero-glow-secondary" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-primary/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-chart-2/10 to-transparent rounded-full translate-y-1/2 -translate-x-1/4 blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row items-center gap-6 lg:gap-10 min-h-[280px] lg:min-h-[300px] p-6 lg:p-10">
        <div className="flex-1 min-w-0 text-center lg:text-right">
          <div className="flex items-center justify-center lg:justify-end gap-2 mb-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              <Sparkles size={12} />
              {t('marketplace.featured')}
            </span>
            {app.rating && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600">
                <Star size={12} className="fill-current" />
                {app.rating.toFixed(1)}
              </span>
            )}
          </div>

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={app.slug}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <h2 className="text-2xl lg:text-4xl font-extrabold text-foreground leading-tight tracking-tight">
                {app.name}
              </h2>
              <p className="mt-3 text-sm lg:text-base text-muted-foreground max-w-xl mx-auto lg:mr-0 leading-relaxed">
                {app.description}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-center lg:justify-end gap-3 mt-5">
            <Link
              to={`/marketplace/${app.slug}`}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:scale-[1.02]"
            >
              {t('marketplace.details')}
              <ArrowRight size={15} />
            </Link>
            <span className="mp-price-hero">{getPrice(app, t)}</span>
          </div>

          <div className="flex items-center justify-center lg:justify-end gap-1.5 mt-4">
            {featuredApps.map((_, i) => (
              <button
                key={i}
                onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  i === current
                    ? "bg-primary w-6"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </div>

        <div className="flex-shrink-0">
          <div className="mp-hero-icon-box">
            {BrandIcon ? (
              <BrandIcon className="size-12 lg:size-16" />
            ) : (
              <Package size={48} />
            )}
          </div>
        </div>
      </div>

      {total > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex size-10 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm text-foreground hover:bg-background transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex size-10 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm text-foreground hover:bg-background transition-colors"
            aria-label="Next"
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}
    </div>
  );
}

export default HeroBanner;
