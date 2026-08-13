import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  ChevronLeft, ChevronRight, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { AppCard } from "./AppCard";
import type { MarketplaceApp } from "@/types/marketplace";
import { getSectionIcon } from "@/utils/marketplace";

interface SectionRowProps {
  type: string;
  title: string;
  apps: MarketplaceApp[];
  icon?: LucideIcon;
  viewAllUrl?: string;
  className?: string;
}

export function SectionRow({
  type,
  title,
  apps,
  viewAllUrl,
  className,
}: SectionRowProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const Icon = getSectionIcon(type);

  if (!apps || apps.length === 0) return null;

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 300;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <section className={cn("mp-section-row", className)}>
      <div className="mp-section-header-v2">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={17} className="text-primary" />}
          <h2 className="text-base font-extrabold text-foreground tracking-tight">
            {title}
          </h2>
          <span className="mp-section-count-v2">{apps.length}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => scroll("left")}
            className="mp-scroll-btn"
            aria-label="Scroll left"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scroll("right")}
            className="mp-scroll-btn"
            aria-label="Scroll right"
          >
            <ChevronRight size={16} />
          </button>
          {viewAllUrl && (
            <Link
              to={viewAllUrl}
              className="ml-2 inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/80 transition-colors"
            >
              {t('marketplace.viewAll')}
              <ArrowRight size={12} />
            </Link>
          )}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="mp-section-scroll"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {apps.map((app, i) => (
          <div
            key={app.id}
            className="mp-section-card-wrapper"
            style={{ animationDelay: `${(i % 10) * 50}ms` }}
          >
            <AppCard
              app={app}
              variant="featured"
              showInstalls
              showFeatures
              animationDelay={i * 50}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export default SectionRow;
