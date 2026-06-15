import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  CheckCircle2,
  Gift,
  Loader2,
  Package,
  Puzzle,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { Alert, AlertDescription, AlertTitle } from "../../../components/ui/alert";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Skeleton } from "../../../components/ui/skeleton";
import { MiniStat } from "./MiniStat";
import { SectionShell } from "./SectionShell";
import { EmptyState } from "./EmptyState";
import { ActivationItemRow } from "./ActivationItemRow";
import { SectionSubheader } from "./SectionSubheader";
import {
  formatNumber,
  formatCurrency,
  getStatusMeta,
  getPricingModelLabel,
  normalizeRequiredApps,
} from "./helpers";

function PlanRow({ plan, currentPlanType, planAction, handleAssignPlatformPlan }) {
  const isCurrentPlan = currentPlanType === plan.planType;
  return (
    <ActivationItemRow>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-black text-foreground">{plan.name}</p>
          {isCurrentPlan ? (
            <Badge variant="outline" className={cn("rounded-full px-2.5 py-1 text-[11px]", getStatusMeta("plan", currentPlanType).className)}>
              الخطة الحالية
            </Badge>
          ) : null}
        </div>
        <p className="text-xs leading-6 text-muted-foreground">{plan.description}</p>
        <div className="flex flex-wrap gap-2">
          {plan.highlights.map((h) => (
            <Badge key={`${plan.planType}-${h}`} variant="outline" className="rounded-full px-2.5 py-1 text-[11px]">{h}</Badge>
          ))}
        </div>
      </div>
      <Button type="button" variant={isCurrentPlan ? "outline" : "default"} className="rounded-2xl shrink-0"
        onClick={() => void handleAssignPlatformPlan(plan.planType)}
        disabled={isCurrentPlan || planAction === plan.planType}
      >
        {planAction === plan.planType ? <Loader2 className="size-4 animate-spin" /> : <CalendarClock className="size-4" />}
        {isCurrentPlan ? "مفعلة حاليًا" : "تفعيل الخطة"}
      </Button>
    </ActivationItemRow>
  );
}

function BundleRow({ bundle, review, reviewCurrency, appNameBySlug, bundleAction, openTopUpModal, handleSubscribeBundle }) {
  const bundlePrice = Number(bundle.price || bundle.monthlyPrice || 0);
  const walletShortage = bundlePrice > Number(review?.wallet?.balance || 0);
  return (
    <ActivationItemRow>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-black text-foreground">{bundle.name}</p>
          {bundle.isFeatured ? (
            <Badge variant="outline" className="rounded-full border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-300">
              باقة مميزة
            </Badge>
          ) : null}
          {bundle.isComplete ? (
            <Badge variant="outline" className="rounded-full border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-300">
              مكتملة على الشركة
            </Badge>
          ) : null}
        </div>
        <p className="text-xs leading-6 text-muted-foreground">{bundle.description}</p>
        <p className="text-xs text-muted-foreground">تضم {formatNumber(bundle.totalApps)} أداة، والمفعل منها الآن {formatNumber(bundle.installedCount)}.</p>
        {bundle.appSlugs.length ? (
          <p className="text-[11px] text-muted-foreground">تشمل: {bundle.appSlugs.map((slug) => appNameBySlug.get(slug) || slug).slice(0, 4).join("، ")}{bundle.appSlugs.length > 4 ? "..." : ""}</p>
        ) : null}
        <p className="text-sm font-bold text-foreground">{formatCurrency(bundlePrice, reviewCurrency)} / شهر</p>
        {walletShortage ? <p className="text-[11px] text-amber-700 dark:text-amber-300">الرصيد الحالي لا يكفي لهذه الباقة. يمكنك شحن المحفظة أولًا من نفس الصفحة.</p> : null}
      </div>
      <Button type="button" variant="outline" className="rounded-2xl shrink-0"
        onClick={() => walletShortage ? openTopUpModal() : void handleSubscribeBundle(bundle.slug)}
        disabled={bundle.isComplete || bundleAction === bundle.slug}
      >
        {bundleAction === bundle.slug ? <Loader2 className="size-4 animate-spin" /> : <Package className="size-4" />}
        {bundle.isComplete ? "مفعلة بالكامل" : walletShortage ? "اشحن المحفظة أولًا" : "تشغيل الباقة"}
      </Button>
    </ActivationItemRow>
  );
}

function AppRow({ app, appAction, appNameBySlug, reviewCurrency, handleInstallApp }) {
  const requiredApps = normalizeRequiredApps(app.requiredApps);
  return (
    <ActivationItemRow>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-black text-foreground">{app.name}</p>
          <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[11px]">{app.category || "أداة"}</Badge>
          {app.isInstalled ? (
            <Badge variant="outline" className="rounded-full border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-300">مفعلة</Badge>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          {getPricingModelLabel(app.pricingModel)}
          {Number(app.monthlyPrice) > 0 ? ` • ${formatCurrency(app.monthlyPrice, reviewCurrency)} / شهر` : ""}
        </p>
        <p className="text-xs leading-6 text-muted-foreground">{app.description}</p>
        {requiredApps.length ? (
          <p className="text-[11px] text-muted-foreground">يتطلب: {requiredApps.map((slug) => appNameBySlug.get(slug) || slug).join("، ")}</p>
        ) : null}
        {app.isInstalled && app.activePricingModel ? (
          <p className="text-[11px] text-emerald-700 dark:text-emerald-300">مفعلة حاليًا بنظام {getPricingModelLabel(app.activePricingModel)}</p>
        ) : null}
      </div>
      <Button type="button" variant={app.isInstalled ? "outline" : "default"} className="rounded-2xl shrink-0"
        onClick={() => void handleInstallApp(app)}
        disabled={app.isInstalled || appAction === app.slug}
      >
        {appAction === app.slug ? <Loader2 className="size-4 animate-spin" /> : app.isInstalled ? <CheckCircle2 className="size-4" /> : <Boxes className="size-4" />}
        {app.isInstalled ? "مفعلة بالفعل" : "تفعيل الأداة"}
      </Button>
    </ActivationItemRow>
  );
}

export function CompanyActivationCenter({
  review,
  planAction,
  bundleAction,
  appAction,
  installAllLoading,
  activationLoading,
  activationError,
  currentPlanType,
  resolvedPlanCatalog,
  orderedCatalogApps,
  resolvedBundles,
  reviewCurrency,
  appNameBySlug,
  handleAssignPlatformPlan,
  handleInstallApp,
  handleSubscribeBundle,
  handleActivateAllTools,
  openTopUpModal,
  refreshActivationCatalog,
}) {
  return (
    <div id="company-activation-center">
      <SectionShell
        title="التفعيل والاشتراكات"
        description="من هنا تقدر تختار الخطة، تشغل باقة جاهزة، أو تفعل كل أدوات المنصة للشركة الجديدة بدون مغادرة صفحة المراجعة."
        actions={
          <Button type="button" variant="outline" className="rounded-2xl"
            onClick={() => void refreshActivationCatalog()} disabled={activationLoading}
          >
            {activationLoading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            تحديث الخيارات
          </Button>
        }
      >
        {activationError ? (
          <Alert className="rounded-xl border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100">
            <AlertTriangle className="size-4" />
            <AlertTitle>تعذر تحميل جزء من مركز التفعيل</AlertTitle>
            <AlertDescription>{activationError}</AlertDescription>
          </Alert>
        ) : null}

        {activationLoading ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <Skeleton className="h-[420px] rounded-2xl" />
            <Skeleton className="h-[420px] rounded-2xl" />
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MiniStat label="الخطة الحالية" value={getStatusMeta("plan", currentPlanType).label} helper="يمكن تغييرها فورًا من هذه الصفحة" />
              <MiniStat label="الأدوات المتاحة" value={formatNumber(orderedCatalogApps.length)} helper={`المفعلة ${formatNumber(orderedCatalogApps.filter((app) => app.isInstalled).length)}`} />
              <MiniStat label="الباقات الجاهزة" value={formatNumber(resolvedBundles.length)} helper={`المكتملة ${formatNumber(resolvedBundles.filter((bundle) => bundle.isComplete).length)}`} />
              <MiniStat label="رصيد المحفظة" value={formatCurrency(review?.wallet?.balance, reviewCurrency)} helper="جاهز للباقات أو أي شحن إضافي" />
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
              <div className="space-y-4">
                <div className="py-3">
                  <SectionSubheader
                    title="اختيار الخطة"
                    description="الخطة تغيّر السعة التشغيلية والمزايا العامة للشركة."
                    actions={
                      <Badge variant="outline" className={cn("rounded-full px-3 py-1.5 text-xs", getStatusMeta("plan", currentPlanType).className)}>
                        الحالية: {getStatusMeta("plan", currentPlanType).label}
                      </Badge>
                    }
                  />
                  <div className="mt-4 space-y-3">
                    {resolvedPlanCatalog.map((plan) => (
                      <PlanRow key={plan.planType} plan={plan} currentPlanType={currentPlanType} planAction={planAction} handleAssignPlatformPlan={handleAssignPlatformPlan} />
                    ))}
                  </div>
                </div>

                <div className="py-3">
                  <SectionSubheader title="الباقات الجاهزة" description="حل سريع للشركات الجديدة بدل تفعيل كل أداة بشكل يدوي." />
                  <div className="mt-4 space-y-3">
                    {resolvedBundles.length ? (
                      resolvedBundles.map((bundle) => (
                        <BundleRow key={bundle.id || bundle.slug} bundle={bundle} review={review} reviewCurrency={reviewCurrency} appNameBySlug={appNameBySlug} bundleAction={bundleAction} openTopUpModal={openTopUpModal} handleSubscribeBundle={handleSubscribeBundle} />
                      ))
                    ) : <EmptyState message="لا توجد باقات جاهزة متاحة حاليًا." icon={Gift} />}
                  </div>
                </div>
              </div>

              <div className="py-3">
                <SectionSubheader
                  title="الأدوات المتاحة للتفعيل"
                  description="كل أداة في المتجر مع حالة التفعيل الحالية على هذه الشركة."
                  actions={
                    <Button type="button" className="rounded-2xl" onClick={() => void handleActivateAllTools()}
                      disabled={installAllLoading || !orderedCatalogApps.some((app) => !app.isInstalled)}
                    >
                      {installAllLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                      تفعيل كل الأدوات
                    </Button>
                  }
                />
                <div className="mt-4 max-h-[680px] space-y-2 overflow-y-auto pr-1">
                  {orderedCatalogApps.length ? (
                    orderedCatalogApps.map((app) => (
                      <AppRow key={app.id || app.slug} app={app} appAction={appAction} appNameBySlug={appNameBySlug} reviewCurrency={reviewCurrency} handleInstallApp={handleInstallApp} />
                    ))
                  ) : <EmptyState message="لا توجد أدوات متاحة للعرض حاليًا." icon={Puzzle} />}
                </div>
              </div>
            </div>
          </>
        )}
      </SectionShell>
    </div>
  );
}
