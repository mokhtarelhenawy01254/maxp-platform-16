import React from "react";
import { Sparkles } from "lucide-react";
import type { MarketplaceApp as MPA } from "@/types/marketplace";
import {
  getMarketplaceFeatureItems,
  getFeatureAccessLabel,
} from "../../featureCatalog";

interface AppDetailsFeaturesTabProps {
  app: MPA;
}

export const AppDetailsFeaturesTab: React.FC<AppDetailsFeaturesTabProps> = ({
  app,
}) => {
  const featureItems = getMarketplaceFeatureItems(app);

  return (
    <div className="rounded-2xl border bg-card p-5 text-right">
      <h2 className="text-xl font-extrabold text-foreground mb-4">الميزات</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {featureItems.length > 0 ? (
          featureItems.map((feature) => (
            <article
              key={feature.key}
              className="rounded-xl border bg-background p-4 text-right group hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-full bg-muted/50 px-3 py-1 text-xs font-bold text-muted-foreground shrink-0">
                  {getFeatureAccessLabel(feature.access)}
                </span>
                <div className="min-w-0">
                  <h3 className="text-foreground text-base font-bold">
                    {feature.name}
                  </h3>
                  <p className="text-muted-foreground mt-1 text-sm leading-6">
                    {feature.description}
                  </p>
                </div>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border">
                  <Sparkles size={17} />
                </span>
              </div>
            </article>
          ))
        ) : (
          <div className="col-span-full rounded-2xl border border-dashed py-10 text-center text-sm text-muted-foreground">
            <Sparkles size={36} className="mx-auto mb-3 text-muted-foreground/40" />
            ميزات قادمة قريباً
          </div>
        )}
      </div>
    </div>
  );
};
