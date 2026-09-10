import { CheckCircle2, Cog, Loader2, Package, Sparkles, Layers, Zap } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Separator } from "../../../components/ui/separator";
import { Switch } from "../../../components/ui/switch";
import { EmptyState } from "./EmptyState";
import { formatCurrency } from "./helpers";

interface ActivationItem {
  slug: string;
  name: string;
  description?: string;
  isInstalled?: boolean;
  pricingModel?: string;
  monthlyPrice?: number;
  requiredApps?: string[];
  appSlugs?: string[];
  installedCount?: number;
  totalApps?: number;
  isComplete?: boolean;
}

function AppItemRow({ app, onInstall, action }: { app: ActivationItem; onInstall: (app: ActivationItem) => void; action: string }) {
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Zap className="size-4" />
        </div>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{app.name}</p>
            {app.isInstalled ? (
              <Badge variant="outline" className="rounded-full border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-300">مفعل</Badge>
            ) : null}
            {app.pricingModel ? (
              <Badge variant="outline" className="rounded-full border-border/50 bg-muted/30 px-2 py-0.5 text-[11px]">{app.pricingModel === "FREE" ? "مجاني" : app.pricingModel === "PAY_PER_USE" ? "حسب الاستخدام" : "اشتراك"}</Badge>
            ) : null}
          </div>
          {app.description ? <p className="text-xs text-muted-foreground line-clamp-1">{app.description}</p> : null}
          <p className="text-xs font-bold text-foreground/70">{app.monthlyPrice ? formatCurrency(app.monthlyPrice) : "—"}</p>
        </div>
      </div>
      <Button type="button" variant={app.isInstalled ? "outline" : "default"} size="sm" className="h-9 shrink-0 rounded-lg px-4 text-xs font-semibold"
        onClick={() => onInstall(app)} disabled={app.isInstalled || action === app.slug}
      >
        {action === app.slug ? <Loader2 className="ml-1.5 size-3.5 animate-spin" /> : app.isInstalled ? <CheckCircle2 className="ml-1.5 size-3.5" /> : <Zap className="ml-1.5 size-3.5" />}
        {app.isInstalled ? "مفعلة" : "تفعيل"}
      </Button>
    </div>
  );
}

function BundleItemRow({ bundle, onSubscribe, action }: { bundle: ActivationItem; onSubscribe: (slug: string) => void; action: string }) {
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
          <Layers className="size-4" />
        </div>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{bundle.name}</p>
            {bundle.isComplete ? (
              <Badge variant="outline" className="rounded-full border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-300">مكتملة</Badge>
            ) : null}
            <Badge variant="outline" className="rounded-full border-border/50 bg-muted/30 px-2 py-0.5 text-[11px]">{bundle.installedCount ?? 0}/{bundle.totalApps ?? 0}</Badge>
          </div>
          {bundle.description ? <p className="text-xs text-muted-foreground line-clamp-1">{bundle.description}</p> : null}
        </div>
      </div>
      <Button type="button" variant={bundle.isComplete ? "outline" : "default"} size="sm" className="h-9 shrink-0 rounded-lg px-4 text-xs font-semibold"
        onClick={() => onSubscribe(bundle.slug)} disabled={bundle.isComplete || action === bundle.slug}
      >
        {action === bundle.slug ? <Loader2 className="ml-1.5 size-3.5 animate-spin" /> : bundle.isComplete ? <CheckCircle2 className="ml-1.5 size-3.5" /> : <Layers className="ml-1.5 size-3.5" />}
        {bundle.isComplete ? "مشترك" : "اشتراك"}
      </Button>
    </div>
  );
}

export function CompanyActivationCenter({
  orderedCatalogApps, resolvedBundles, appAction, bundleAction, installAllLoading, activationLoading, activationError,
  handleInstallApp, handleSubscribeBundle, handleActivateAllTools,
  company, handleToggleFeature, toggleFeatureLoading,
}: {
  orderedCatalogApps: ActivationItem[];
  resolvedBundles: ActivationItem[];
  appAction: string; bundleAction: string;
  installAllLoading: boolean; activationLoading: boolean; activationError: string;
  handleInstallApp: (app: ActivationItem) => void;
  handleSubscribeBundle: (slug: string) => void;
  handleActivateAllTools: () => void;
  company: any;
  handleToggleFeature: (feature: string, enabled: boolean) => void;
  toggleFeatureLoading: boolean;
}) {
  const uninstalledCount = orderedCatalogApps.filter((a) => !a.isInstalled).length;
  const aiToolsEnabled = (() => {
    if (!company?.settings) return false;
    try { const s = JSON.parse(company.settings); return s.aiToolsEnabled === true; } catch { return false; }
  })();

  return (
    <Card className="rounded-2xl border" id="company-activation-center">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold">مركز التفعيل</CardTitle>
          <CardDescription>تصفح وفعّل الأدوات والباقات المتاحة لهذه الشركة بنقرة واحدة.</CardDescription>
        </div>
        {uninstalledCount > 0 ? (
          <Button type="button" className="rounded-2xl" onClick={handleActivateAllTools} disabled={installAllLoading}>
            {installAllLoading ? <Loader2 className="ml-1.5 size-4 animate-spin" /> : <Sparkles className="ml-1.5 size-4" />}
            تفعيل الكل ({uninstalledCount})
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {activationError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/30 dark:text-rose-300">{activationError}</div>
        ) : null}

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Cog className="size-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold text-foreground">خاصيات إضافية</h4>
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-4 py-3">
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-foreground">أدوات الذكاء الاصطناعي</p>
              <p className="text-xs text-muted-foreground">السماح للشركة باستخدام أدوات AI المخصصة (AI Skills & AI Tools)</p>
            </div>
            <Switch
              checked={aiToolsEnabled}
              onCheckedChange={(checked) => handleToggleFeature("aiToolsEnabled", checked)}
              disabled={toggleFeatureLoading}
            />
          </div>
        </div>

        {activationLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-primary/60" />
          </div>
        ) : (
          <>
            {resolvedBundles.length ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Layers className="size-4 text-amber-600" />
                  <h4 className="text-sm font-semibold text-foreground">الباقات المتاحة</h4>
                </div>
                <Separator />
                <div className="divide-y divide-border/20">
                  {resolvedBundles.map((bundle) => (
                    <BundleItemRow key={bundle.slug} bundle={bundle} onSubscribe={handleSubscribeBundle} action={bundleAction} />
                  ))}
                </div>
              </div>
            ) : null}

            {orderedCatalogApps.length ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Package className="size-4 text-primary" />
                  <h4 className="text-sm font-semibold text-foreground">الأدوات المتاحة ({orderedCatalogApps.length})</h4>
                </div>
                <Separator />
                <div className="divide-y divide-border/20">
                  {orderedCatalogApps.map((app) => (
                    <AppItemRow key={app.slug} app={app} onInstall={handleInstallApp} action={appAction} />
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState message="لا توجد أدوات متاحة للتفعيل حاليًا." icon={Package} />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
