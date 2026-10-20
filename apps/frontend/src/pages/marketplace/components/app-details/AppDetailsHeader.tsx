import React from "react";
import { ChevronRight, Sparkles, Clock, Star, Package } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { MarketplaceApp as MPA } from "@/types/marketplace";
import {
  appIconsBySlug,
  categoryIcons,
  appIcons,
  shouldUseTextIcon,
} from "@/utils/marketplace";
import {
  getFeatureAccessKind,
  getFeatureAccessLabel,
} from "../../featureCatalog";
import { formatNumber, isLikelyImageUrl } from "../../types/appDetailsTypes";

interface AppDetailsHeaderProps {
  app: MPA;
  onBack: () => void;
}

export const AppDetailsHeader: React.FC<AppDetailsHeaderProps> = ({
  app,
  onBack,
}) => {
  const { t } = useTranslation();
  const accessKind = getFeatureAccessKind(app.pricingModel);
  const BrandIcon = app.slug ? appIconsBySlug[app.slug] : undefined;
  const IconComp =
    appIcons[app.icon?.trim().toLowerCase() || ""] ||
    categoryIcons[app.category] ||
    Package;
  const textIcon = shouldUseTextIcon(app.icon) ? app.icon?.trim() : null;

  return (
    <div>
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 rounded-xl px-2 py-1 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronRight size={18} />
        الرجوع إلى التطبيقات
      </button>

      <section className="rounded-[1.75rem] bg-card mt-4 overflow-hidden border border-border/30">
        {isLikelyImageUrl(app.coverImage) && (
          <div className="relative h-44 w-full overflow-hidden bg-muted/40 sm:h-56">
            <img
              src={app.coverImage}
              alt={app.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        )}

        <div className="p-5 lg:p-6 text-right">
          <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
            <span className="rounded-full bg-muted/50 px-3 py-1 text-xs font-bold text-muted-foreground">
              {getFeatureAccessLabel(accessKind)}
            </span>
            {app.isFeatured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-600 border px-3 py-1 text-xs font-bold">
                <Sparkles size={13} />
                مميز
              </span>
            )}
            {app.trialDays > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-600 border px-3 py-1 text-xs font-bold">
                <Clock size={13} />
                تجربة {app.trialDays} يوم
              </span>
            )}
          </div>

          <div className="flex flex-col items-end gap-4 sm:flex-row-reverse sm:items-start">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 text-primary border text-3xl">
              {app.logo ? (
                <img
                  src={app.logo}
                  alt={app.name}
                  className="size-full object-cover"
                  loading="lazy"
                />
              ) : BrandIcon ? (
                <BrandIcon className="size-8" />
              ) : (
                textIcon || <IconComp size={30} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-extrabold text-foreground leading-tight sm:text-4xl">
                {app.name}
              </h1>
              <p className="text-muted-foreground mt-3 max-w-3xl text-sm font-semibold leading-7 sm:text-base">
                {app.description}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-end gap-2 text-xs font-bold">
                {app.rating > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-3 py-1 text-xs font-bold tabular-nums font-mono">
                    <Star size={14} className="fill-amber-400 text-amber-400" />
                    {app.rating.toFixed(1)}
                    <span className="text-muted-foreground font-sans">
                      ({formatNumber(app.reviewCount)} {t("marketplace.reviews")})
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
