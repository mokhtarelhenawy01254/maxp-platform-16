import { useState } from "react";
import { CheckCircle2, Loader2, Layers, Zap, AlertTriangle, Sparkles } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Separator } from "../../../components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { EmptyState } from "./EmptyState";
import { formatCurrency, formatNumber, getStatusMeta } from "./helpers";

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
  const pricingMeta = getStatusMeta("pricingModel", app.pricingModel);
  return (
    <div className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between border-b border-border/30 last:border-b-0">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Zap className="size-4" />
        </div>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-foreground">{app.name}</p>
            {app.isInstalled ? (
              <Badge variant="outline" className="rounded-full border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-300">مفعل</Badge>
            ) : null}
            {app.pricingModel ? (
              <Badge variant="outline" className={`rounded-full px-2 py-0.5 text-[11px] ${pricingMeta.className}`}>
                {pricingMeta.label}
              </Badge>
            ) : null}
          </div>
          {app.description ? <p className="text-xs text-muted-foreground line-clamp-1">{app.description}</p> : null}
          <p className="text-xs font-bold text-foreground/80">
            {app.monthlyPrice && app.monthlyPrice > 0 ? `${formatCurrency(app.monthlyPrice)} / شهرياً` : "بدون اشتراك شهري ثابت"}
          </p>
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
    <div className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between border-b border-border/30 last:border-b-0">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
          <Layers className="size-4" />
        </div>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-foreground">{bundle.name}</p>
            {bundle.isComplete ? (
              <Badge variant="outline" className="rounded-full border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-300">مكتملة</Badge>
            ) : null}
            <Badge variant="outline" className="rounded-full border-border/50 bg-muted/30 px-2 py-0.5 text-[11px] font-mono">
              {formatNumber(bundle.installedCount ?? 0)}/{formatNumber(bundle.totalApps ?? 0)} أداة
            </Badge>
          </div>
          {bundle.description ? <p className="text-xs text-muted-foreground line-clamp-1">{bundle.description}</p> : null}
        </div>
      </div>
      <Button type="button" variant={bundle.isComplete ? "outline" : "default"} size="sm" className="h-9 shrink-0 rounded-lg px-4 text-xs font-semibold"
        onClick={() => onSubscribe(bundle.slug)} disabled={bundle.isComplete || action === bundle.slug}
      >
        {action === bundle.slug ? <Loader2 className="ml-1.5 size-3.5 animate-spin" /> : bundle.isComplete ? <CheckCircle2 className="ml-1.5 size-3.5" /> : <Layers className="ml-1.5 size-3.5" />}
        {bundle.isComplete ? "مشترك" : "اشتراك في الباقة"}
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
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  const uninstalledApps = orderedCatalogApps.filter((a) => !a.isInstalled);
  const uninstalledCount = uninstalledApps.length;

  const totalMonthlyCost = uninstalledApps.reduce((acc, app) => acc + (Number(app.monthlyPrice) || 0), 0);
  const subscriptionAppsCount = uninstalledApps.filter((a) => a.pricingModel === "SUBSCRIPTION" || a.pricingModel === "HYBRID").length;
  const payPerUseCount = uninstalledApps.filter((a) => a.pricingModel === "PAY_PER_USE").length;
  const freeAppsCount = uninstalledApps.filter((a) => a.pricingModel === "FREE").length;

  const handleConfirmAndActivate = () => {
    setConfirmModalOpen(false);
    handleActivateAllTools();
  };

  return (
    <>
      <Card className="rounded-2xl border" id="company-activation-center">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold">مركز التفعيل والاشتراكات</CardTitle>
            <CardDescription>تصفح وفعّل الأدوات والباقات المتاحة لهذه الشركة بشكل فوري.</CardDescription>
          </div>
          {uninstalledCount > 0 ? (
            <Button
              type="button"
              className="rounded-xl font-bold bg-primary text-primary-foreground shadow-sm gap-1.5"
              onClick={() => setConfirmModalOpen(true)}
              disabled={installAllLoading}
            >
              {installAllLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              تفعيل الكل ({formatNumber(uninstalledCount)})
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-6">
          {activationError ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {activationError}
            </div>
          ) : null}

          {/* Apps Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <h3 className="text-sm font-black text-foreground">الأدوات المستقلة ({formatNumber(orderedCatalogApps.length)})</h3>
              <span className="text-xs text-muted-foreground">
                المفعل: {formatNumber(orderedCatalogApps.filter((a) => a.isInstalled).length)} أداة
              </span>
            </div>
            {orderedCatalogApps.length ? (
              <div className="divide-y divide-border/20">
                {orderedCatalogApps.map((app) => (
                  <AppItemRow key={app.slug} app={app} onInstall={handleInstallApp} action={appAction} />
                ))}
              </div>
            ) : (
              <EmptyState icon={Zap} message="لا توجد أدوات متاحة في المتجر حالياً." />
            )}
          </div>

          <Separator />

          {/* Bundles Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <h3 className="text-sm font-black text-foreground">الباقات المتكاملة ({formatNumber(resolvedBundles.length)})</h3>
              <span className="text-xs text-muted-foreground">مجموعات أدوات مخصصة للأنشطة المختلفة</span>
            </div>
            {resolvedBundles.length ? (
              <div className="divide-y divide-border/20">
                {resolvedBundles.map((bundle) => (
                  <BundleItemRow key={bundle.slug} bundle={bundle} onSubscribe={handleSubscribeBundle} action={bundleAction} />
                ))}
              </div>
            ) : (
              <EmptyState icon={Layers} message="لا توجد باقات جاهزة متاحة حالياً." />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Modal for Bulk Activation with Pricing Breakdown */}
      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2.5 text-primary">
              <Sparkles className="size-5" />
              <DialogTitle className="text-lg font-black">تأكيد التفعيل الجماعي للأدوات</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              أنت على وشك تفعيل كافة الأدوات غير المثبتة للشركة ({formatNumber(uninstalledCount)} أداة). يرجى مراجعة تفاصيل التكلفة أدناه قبل المتابعة.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            {/* Cost Breakdown Card */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground font-medium">عدد الأدوات المراد تفعيلها:</span>
                <span className="font-bold text-foreground">{formatNumber(uninstalledCount)} أداة</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground font-medium">إجمالي رسوم الاشتراكات الشهرية:</span>
                <span className="font-black text-primary text-base">
                  {totalMonthlyCost > 0 ? `${formatCurrency(totalMonthlyCost, company?.currency || "EGP")} / شهرياً` : "0.00 ج.م (مجاناً)"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-primary/10 text-xs">
                <Badge variant="outline" className="bg-background/80">
                  {formatNumber(subscriptionAppsCount)} باشتراك شهري
                </Badge>
                <Badge variant="outline" className="bg-background/80">
                  {formatNumber(payPerUseCount)} حسب الاستخدام
                </Badge>
                <Badge variant="outline" className="bg-background/80">
                  {formatNumber(freeAppsCount)} مجانية بالكامل
                </Badge>
              </div>
            </div>

            {/* List of tools to activate */}
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-muted-foreground">الأدوات التي سيتم تثبيتها:</p>
              <div className="max-h-48 overflow-y-auto rounded-xl border border-border/50 bg-muted/20 p-2 divide-y divide-border/20 text-xs">
                {uninstalledApps.map((app) => (
                  <div key={app.slug} className="flex items-center justify-between py-1.5 px-2">
                    <span className="font-medium text-foreground">{app.name}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {app.monthlyPrice && app.monthlyPrice > 0 ? formatCurrency(app.monthlyPrice, company?.currency || "EGP") : "مجاني"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200 border border-amber-200 dark:border-amber-800/60">
              <AlertTriangle className="size-4 shrink-0 mt-0.5 text-amber-600" />
              <p>
                سيتم تفعيل هذه الأدوات تلقائيًا للشركة، وستبدأ دورات الفوترة بحسب الشروط الخاصة بكل أداة.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setConfirmModalOpen(false)}>
              إلغاء
            </Button>
            <Button
              type="button"
              className="bg-primary text-primary-foreground font-bold shadow-sm"
              onClick={handleConfirmAndActivate}
            >
              تأكيد وتفعيل {formatNumber(uninstalledCount)} أداة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
