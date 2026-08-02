import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiClient } from "../../services/apiClient";
import { toast } from "sonner";
import {
  X, CheckCircle2, Star, Download, Zap, Package,
  BarChart3, TrendingUp, Loader2, Shield, Users,
  ArrowRight, ChevronRight, MessageSquare, Clock,
  ExternalLink, ClipboardList, LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { MarketplaceApp } from "@/types/marketplace";
import { getMarketplaceFeatureItems } from "./featureCatalog";
import { appIconsBySlug, categoryIcons, appIcons, shouldUseTextIcon, getPrice, formatInstallCount, categoryCssClass } from "@/utils/marketplace";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export default function CompareApps() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [apps, setApps] = useState<MarketplaceApp[]>([]);
  const [loading, setLoading] = useState(true);

  const slugs = searchParams.get("apps")?.split(",").filter(Boolean) || [];

  useEffect(() => {
    if (slugs.length === 0) {
      setLoading(false);
      return;
    }
    const fetchApps = async () => {
      try {
        setLoading(true);
        const results = await Promise.all(
          slugs.map(slug => apiClient.get<ApiEnvelope<MarketplaceApp>>(`/marketplace/apps/${slug}`))
        );
        setApps(results.map(r => r.data.data));
      } catch { toast.error("Error loading app data"); }
      finally { setLoading(false); }
    };
    fetchApps();
  }, []);

  const allFeatureKeys = new Set<string>();
  const appFeatures: Record<string, Array<{ key: string; name: string; access: string }>> = {};

  apps.forEach(app => {
    const features = getMarketplaceFeatureItems(app);
    appFeatures[app.slug] = features;
    features.forEach(f => allFeatureKeys.add(f.key));
  });

  const sortedFeatures = [...allFeatureKeys];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (slugs.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <BarChart3 size={48} className="mx-auto mb-4 text-muted-foreground/40" />
          <h1 className="text-2xl font-extrabold text-foreground mb-2">{t('marketplace.compareTitle')}</h1>
          <p className="text-muted-foreground mb-6">Add apps from the marketplace to compare them side by side.</p>
          <Link to="/marketplace">
            <Button className="gap-2 rounded-xl"><ArrowRight size={15} />{t('marketplace.browseAll')}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={() => navigate('/marketplace')}
              className="inline-flex items-center gap-2 rounded-xl px-2 py-1 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight size={18} />
              {t('marketplace.browseAll')}
            </button>
            <h1 className="text-2xl font-extrabold text-foreground mt-2">{t('marketplace.compareTitle')}</h1>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border bg-card">
          <div className="min-w-[600px]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/40">
                  <th className="p-4 text-right text-xs font-bold text-muted-foreground w-[180px] sticky left-0 bg-card z-10"></th>
                  {apps.map(app => {
                    const BrandIcon = app.slug ? appIconsBySlug[app.slug] : undefined;
                    const IconComp = appIcons[app.icon?.trim().toLowerCase() || ""] || categoryIcons[app.category] || Package;
                    return (
                      <th key={app.slug} className="p-4 text-center align-top">
                        <Link to={`/marketplace/${app.slug}`} className="inline-flex flex-col items-center gap-2 group">
                          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border group-hover:shadow-lg transition-shadow">
                            {BrandIcon ? <BrandIcon className="size-7" /> : <IconComp size={26} />}
                          </div>
                          <span className="text-sm font-extrabold text-foreground group-hover:text-primary transition-colors">{app.name}</span>
                        </Link>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/20">
                  <td className="p-4 text-right text-xs font-bold text-muted-foreground sticky left-0 bg-card">{t('marketplace.sortPopular')}</td>
                  {apps.map(app => (
                    <td key={app.slug} className="p-4 text-center">
                      <div className="text-lg font-extrabold text-primary">{getPrice(app, t)}</div>
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-border/20">
                  <td className="p-4 text-right text-xs font-bold text-muted-foreground sticky left-0 bg-card">{t('marketplace.badges.aiPowered')}</td>
                  {apps.map(app => (
                    <td key={app.slug} className="p-4 text-center">
                      {app.pricingModel === "FREE" ? (
                        <Badge variant="success" className="gap-1"><CheckCircle2 size={11} />{t('marketplace.freePrice')}</Badge>
                      ) : app.pricingModel === "PAY_PER_USE" ? (
                        <Badge variant="warning" className="gap-1"><Zap size={11} />{t('marketplace.payPerUse')}</Badge>
                      ) : (
                        <Badge variant="default" className="gap-1"><CreditCardIcon size={11} />{t('marketplace.perMonth')}</Badge>
                      )}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-border/20">
                  <td className="p-4 text-right text-xs font-bold text-muted-foreground sticky left-0 bg-card">{t('marketplace.compareRating')}</td>
                  {apps.map(app => (
                    <td key={app.slug} className="p-4 text-center">
                      {app.rating ? (
                        <div className="inline-flex items-center gap-1">
                          <Star size={14} className="fill-amber-400 text-amber-400" />
                          <span className="text-sm font-extrabold">{app.rating.toFixed(1)}</span>
                        </div>
                      ) : <span className="text-sm text-muted-foreground">--</span>}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-border/20">
                  <td className="p-4 text-right text-xs font-bold text-muted-foreground sticky left-0 bg-card">{t('marketplace.compareReviews')}</td>
                  {apps.map(app => (
                    <td key={app.slug} className="p-4 text-center text-sm">{app.reviewCount}</td>
                  ))}
                </tr>
                <tr className="border-b border-border/20">
                  <td className="p-4 text-right text-xs font-bold text-muted-foreground sticky left-0 bg-card">{t('marketplace.compareInstalls')}</td>
                  {apps.map(app => (
                    <td key={app.slug} className="p-4 text-center text-sm font-bold">{formatInstallCount(app.installCount)}</td>
                  ))}
                </tr>
                <tr className="border-b border-border/40">
                  <td className="p-4 text-right text-xs font-bold text-muted-foreground sticky left-0 bg-card">{t('marketplace.trialDays', { count: '' })}</td>
                  {apps.map(app => (
                    <td key={app.slug} className="p-4 text-center text-sm">
                      {app.trialDays > 0 ? `${app.trialDays} ${t('marketplace.trialDays', { count: 0 }).replace('0 ', '')}` : '--'}
                    </td>
                  ))}
                </tr>

                {sortedFeatures.map(featureKey => (
                  <tr key={featureKey} className="border-b border-border/15 hover:bg-muted/20 transition-colors">
                    <td className="p-3 text-right text-xs font-bold text-muted-foreground sticky left-0 bg-card">
                      {appFeatures[apps[0]?.slug]?.find(f => f.key === featureKey)?.name || featureKey}
                    </td>
                    {apps.map(app => {
                      const feature = appFeatures[app.slug]?.find(f => f.key === featureKey);
                      return (
                        <td key={app.slug} className="p-3 text-center">
                          {feature ? (
                            <CheckCircle2 size={16} className="mx-auto text-success" />
                          ) : (
                            <X size={14} className="mx-auto text-muted-foreground/30" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreditCardIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  );
}
