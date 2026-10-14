import { useState, useEffect } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiClient } from "../../services/apiClient";
import { handleInsufficientWalletBalance } from "../../utils/marketplaceWalletHelper";
import {
  AlertCircle,
  Check, CheckCircle2, ChevronRight, Loader2, MessageSquare,
  Package, Shield, Sparkles, Star,
  Users,
  ChevronLeft,
  FileText, Clock,
  HelpCircle, Headphones,
  RefreshCw, ExternalLink,
  PlayCircle, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../hooks/useAuthSimple";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MarketplaceApp as MPA } from "@/types/marketplace";
import { getMarketplaceFeatureItems, getFeatureAccessKind, getFeatureAccessLabel } from "./featureCatalog";
import { getYouTubeEmbedUrl, getDirectVideoUrl } from "../../utils/explanationVideo";
import { appIconsBySlug, categoryIcons, appIcons, categoryCssClass, shouldUseTextIcon, getPrice, formatInstallCount, getAppDestination } from "@/utils/marketplace";

const numberFormatter = new Intl.NumberFormat("ar-EG");

function formatNumber(value?: number | null) {
  return numberFormatter.format(value ?? 0);
}

function formatMoney(value?: number | null) {
  return `${formatNumber(value)} ${"ج.م"}`;
}

function safeParseJson(value: unknown) {
  if (!value) return null;
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return null; }
}

function isLikelyImageUrl(value?: string | null): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  if (/\.(png|jpe?g|webp|gif|svg|avif|bmp|ico)(\?.*)?$/.test(v)) return true;
  return v.startsWith("/uploads/") || v.startsWith("data:image/");
}

function getPricingSummary(app: MPA) {
  if (app.pricingModel === "FREE") return { title: "مجاني", price: "بدون تكلفة", helper: "يمكن تفعيلها مباشرة من غير اشتراك." };
  if (app.pricingModel === "PAY_PER_USE") return { title: "حسب الاستخدام", price: `${formatMoney(app.unitPrice)} / ${app.unitName || "وحدة"}`, helper: "ادفع فقط مقابل الاستهلاك الفعلي." };
  return { title: "اشتراك شهري", price: `${formatMoney(app.monthlyPrice)} / شهر`, helper: "وصول كامل لجميع مميزات الأداة." };
}

function getEmbedUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  return null;
}

type PlanOption = "PAY_PER_USE" | "MONTHLY" | "YEARLY";

export default function AppDetails() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refreshUser } = useAuth();
  const { t } = useTranslation();
  const [app, setApp] = useState<MPA | null>(null);
  const [loading, setLoading] = useState(true);
  const [screenshotIndex, setScreenshotIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("features");
  const [userRating, setUserRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [appExplanation, setAppExplanation] = useState<{ title: string; videoUrl: string | null } | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanOption>("PAY_PER_USE");

  const isAccessDenied = Boolean(location.state?.accessDenied);
  const isExpired =
    isAccessDenied ||
    Boolean((app as any)?.isExpired) ||
    (app as any)?.installedApp?.status === "EXPIRED" ||
    (app as any)?.installedApp?.status === "CANCELLED" ||
    ((app as any)?.installedApp?.status === "TRIAL" &&
      (app as any)?.installedApp?.trialEndsAt &&
      new Date((app as any).installedApp.trialEndsAt) < new Date());

  useEffect(() => {
    if (location.state?.accessDenied) {
      toast.error(
        `عذراً، يتطلب الوصول إلى هذا القسم اشتراكاً سارياً في تطبيق «${location.state?.appName || app?.name || "التطبيق"}». يرجى تجديد أو تفعيل الاشتراك للمتابعة.`
      );
    }
  }, [location.state, app?.name]);

  useEffect(() => { if (slug) fetchAppDetails(); }, [slug]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("recharged") === "true") {
      toast.info("تم شحن المحفظة بنجاح! يمكنك الآن الضغط على زر التفعيل لإتمام تثبيت التطبيق بنقرة واحدة.", {
        duration: 5000,
      });
    }
  }, [location.search]);

  useEffect(() => {
    if (app) {
      const activeModel = app.activePricingModel;
      const settings = (app.settings || {}) as Record<string, any>;
      const billingCycle = settings?.billing?.cycle;
      if (activeModel === "PAY_PER_USE") {
        setSelectedPlan("PAY_PER_USE");
      } else if (activeModel === "SUBSCRIPTION") {
        setSelectedPlan(billingCycle === "yearly" ? "YEARLY" : "MONTHLY");
      } else if (app.unitPrice && Number(app.unitPrice) > 0) {
        setSelectedPlan("PAY_PER_USE");
      } else {
        setSelectedPlan("MONTHLY");
      }
    }
  }, [app]);

  const fetchAppDetails = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/marketplace/apps/${slug}`);
      const data = response.data.data;
      setApp(data);
      setIsInstalled(Boolean(data?.isInstalled));
    } catch {
      toast.error("Error loading app details");
    } finally {
      setLoading(false);
    }
  };

  // Reuse the platform's existing page-explanation videos inside the details
  // page: keyed by the app's own main route, so recorded walkthroughs surface
  // here without producing any new content.
  useEffect(() => {
    const route = app?.mainRoute;
    if (!route) { setAppExplanation(null); return; }
    let cancelled = false;
    apiClient
      .get(`/app-explanations/by-route?route=${encodeURIComponent(route)}`)
      .then((res) => {
        if (cancelled) return;
        const data = res.data as { success?: boolean; explanations?: Array<{ title: string; videoUrl: string | null }> };
        const first = data?.success && Array.isArray(data.explanations) ? data.explanations.find((e) => e.videoUrl) : null;
        setAppExplanation(first || null);
      })
      .catch(() => { if (!cancelled) setAppExplanation(null); });
    return () => { cancelled = true; };
  }, [app?.mainRoute]);

  const handleInstall = async (planToInstall: PlanOption = selectedPlan) => {
    if (!app) return;
    setInstalling(true);
    try {
      const isPpu = planToInstall === "PAY_PER_USE";
      const payload: { pricingModel: string; billingCycle?: string } = {
        pricingModel: isFree ? "FREE" : isPpu ? "PAY_PER_USE" : "SUBSCRIPTION",
      };
      if (planToInstall === "YEARLY") {
        payload.billingCycle = "yearly";
      } else if (planToInstall === "MONTHLY") {
        payload.billingCycle = "monthly";
      }

      await apiClient.post(`/marketplace/apps/${app.slug}/install`, payload);
      const targetDestination = app.mainRoute || getAppDestination(app);
      toast.success("تم تفعيل التطبيق بنجاح", {
        action: targetDestination ? {
          label: "فتح التطبيق",
          onClick: () => {
            if (targetDestination.startsWith("http://") || targetDestination.startsWith("https://")) {
              window.location.href = targetDestination;
            } else {
              navigate(targetDestination);
            }
          }
        } : undefined
      });
      setIsInstalled(true);
      await Promise.allSettled([
        fetchAppDetails(),
        refreshUser?.(),
      ]);
    } catch (err: unknown) {
      if (
        handleInsufficientWalletBalance(err, navigate, {
          returnUrl: location.pathname + location.search,
          appName: app?.name,
          planToInstall: selectedPlan,
          billingCycle: selectedPlan === "YEARLY" ? "YEARLY" : "MONTHLY",
          itemType: "app",
        })
      ) {
        return;
      }
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || "فشل تفعيل التطبيق");
    } finally {
      setInstalling(false);
    }
  };

  const handleUninstall = async () => {
    if (!app || !window.confirm("هل تريد تعطيل هذا التطبيق؟")) return;
    setInstalling(true);
    try {
      await apiClient.post(`/marketplace/apps/${app.slug}/uninstall`);
      toast.success("تم تعطيل التطبيق");
      setIsInstalled(false);
      await Promise.allSettled([
        fetchAppDetails(),
        refreshUser?.(),
      ]);
    } catch {
      toast.error("فشل تعطيل التطبيق");
    } finally {
      setInstalling(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!app || userRating === 0) return;
    try {
      setSubmittingReview(true);
      await apiClient.post(`/marketplace/apps/${app.id}/review`, {
        rating: userRating,
        comment: reviewText,
      });
      toast.success("Review submitted successfully!");
      setUserRating(0);
      setReviewText("");
      await fetchAppDetails();
    } catch { toast.error("Error submitting review"); }
    finally { setSubmittingReview(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center max-w-sm">
          <AlertCircle size={44} className="text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">App not found</p>
          <Link to="/marketplace" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary">
            Back to Marketplace <ChevronRight size={16} />
          </Link>
        </Card>
      </div>
    );
  }

  const featureItems = getMarketplaceFeatureItems(app);
  const limitations = safeParseJson(app.limitations);
  const requiredApps = safeParseJson(app.requiredApps);
  const normalizedRequiredApps = Array.isArray(requiredApps) ? requiredApps : [];
  const pricingSummary = getPricingSummary(app);
  const accessKind = getFeatureAccessKind(app.pricingModel);
  const BrandIcon = app.slug ? appIconsBySlug[app.slug] : undefined;
  const IconComp = appIcons[app.icon?.trim().toLowerCase() || ""] || categoryIcons[app.category] || Package;
  const textIcon = shouldUseTextIcon(app.icon) ? app.icon?.trim() : null;
  const rawScreenshots: unknown[] = Array.isArray(app.screenshots)
    ? app.screenshots
    : Array.isArray(app.images)
      ? app.images
      : [];
  // Only entries that resolve to a real image URL make the cut — a stray
  // empty string in the JSON must not render a ghost screenshots tab.
  const screenshots = rawScreenshots
    .map((s) => (typeof s === "string" ? s : (s as { url?: string })?.url || ""))
    .filter((s) => isLikelyImageUrl(s));
  const faq = Array.isArray(app.faq) ? app.faq : [];
  const changelog = Array.isArray(app.changelog) ? app.changelog : [];
  const reviews = Array.isArray(app.reviews) ? app.reviews : [];

  const hasPpu = Boolean((app.unitPrice && Number(app.unitPrice) > 0) || app.pricingModel === "PAY_PER_USE");
  const hasMonthly = Boolean((app.monthlyPrice && Number(app.monthlyPrice) > 0) || app.pricingModel === "SUBSCRIPTION");
  const hasYearly = Boolean(app.yearlyPrice && Number(app.yearlyPrice) > 0);
  const isFree = app.pricingModel === "FREE" && !hasPpu && !hasMonthly;
  const hasMultiplePlans = !isFree && [hasPpu, hasMonthly, hasYearly].filter(Boolean).length > 1;

  const yearlySavingsPercent = (hasMonthly && hasYearly && Number(app.monthlyPrice) > 0)
    ? Math.max(0, Math.round((1 - Number(app.yearlyPrice) / (Number(app.monthlyPrice) * 12)) * 100))
    : 0;

  const appSettings = (app.settings || {}) as Record<string, any>;
  const activeCycle = appSettings?.billing?.cycle;
  const currentActivePlan: PlanOption | null = isInstalled
    ? (app.activePricingModel === "PAY_PER_USE" ? "PAY_PER_USE" : activeCycle === "yearly" ? "YEARLY" : "MONTHLY")
    : null;

  const isCurrentPlanActive = isInstalled && currentActivePlan === selectedPlan;

  const planTitles: Record<PlanOption, string> = {
    PAY_PER_USE: "حسب الاستخدام",
    MONTHLY: "اشتراك شهري",
    YEARLY: "اشتراك سنوي",
  };

  const planPrices: Record<PlanOption, string> = {
    PAY_PER_USE: `${formatMoney(app.unitPrice || 1)} / ${app.unitName || "طلب"}`,
    MONTHLY: `${formatMoney(app.monthlyPrice)} / شهر`,
    YEARLY: `${formatMoney(app.yearlyPrice)} / سنة`,
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1280px] px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-10">
        <button
          onClick={() => navigate('/marketplace')}
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
          <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:p-6">
            <div className="min-w-0 text-right">
              <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
                <span className="rounded-full bg-muted/50 px-3 py-1 text-xs font-bold text-muted-foreground">
                  {getFeatureAccessLabel(accessKind)}
                </span>
                {app.isFeatured && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-600 border px-3 py-1 text-xs font-bold">
                    <Sparkles size={13} />مميز
                  </span>
                )}
                {app.trialDays > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-600 border px-3 py-1 text-xs font-bold">
                    <Clock size={13} />تجربة {app.trialDays} يوم
                  </span>
                )}
              </div>

              <div className="flex flex-col items-end gap-4 sm:flex-row-reverse sm:items-start">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 text-primary border text-3xl">
                  {app.logo ? (
                    <img src={app.logo} alt={app.name} className="size-full object-cover" loading="lazy" />
                  ) : BrandIcon ? <BrandIcon className="size-8" /> : textIcon || <IconComp size={30} />}
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-3xl font-extrabold text-foreground leading-tight sm:text-4xl">{app.name}</h1>
                  <p className="text-muted-foreground mt-3 max-w-3xl text-sm font-semibold leading-7 sm:text-base">{app.description}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-end gap-2 text-xs font-bold">
                    {app.rating > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-3 py-1 text-xs font-bold">
                        <Star size={14} className="fill-amber-400 text-amber-400" />
                        {app.rating.toFixed(1)}
                        <span className="text-muted-foreground">({formatNumber(app.reviewCount)} {t('marketplace.reviews')})</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <aside className="rounded-2xl border bg-card p-4 text-right lg:sticky lg:top-5 lg:self-start space-y-4">
              {/* Header Summary Box */}
              <div className="rounded-xl border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-foreground text-sm font-bold">
                      {isFree ? "مجاني" : planTitles[selectedPlan]}
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs leading-5">
                      {isFree
                        ? "يمكن تفعيلها مباشرة من غير اشتراك."
                        : selectedPlan === "PAY_PER_USE"
                          ? "ادفع فقط مقابل الاستهلاك الفعلي مع كل طلب."
                          : selectedPlan === "YEARLY"
                            ? "اشتراك سنوي مستمر مع توفير أكبر."
                            : "وصول كامل لجميع مميزات الأداة مع تجديد شهري."}
                    </p>
                  </div>
                  <div className="text-left">
                    <div className="text-lg font-extrabold text-primary">
                      {isFree ? "بدون تكلفة" : planPrices[selectedPlan]}
                    </div>
                  </div>
                </div>
              </div>

              {/* Plan Options Selector (when multiple plans available) */}
              {!isFree && hasMultiplePlans && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-muted-foreground flex items-center justify-between px-1">
                    <span>اختر نظام الاشتراك:</span>
                    {isInstalled && currentActivePlan && (
                      <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                        <Check size={12} /> مفعل: {planTitles[currentActivePlan]}
                      </span>
                    )}
                  </div>

                  {/* Pay-per-use Option */}
                  {hasPpu && (
                    <div
                      onClick={() => setSelectedPlan("PAY_PER_USE")}
                      className={cn(
                        "relative cursor-pointer rounded-xl border p-3 transition-all text-right",
                        selectedPlan === "PAY_PER_USE"
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : "border-border/60 bg-background hover:border-border hover:bg-muted/30",
                        currentActivePlan === "PAY_PER_USE" && "ring-1 ring-emerald-500/50"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "flex size-4 items-center justify-center rounded-full border text-[10px]",
                              selectedPlan === "PAY_PER_USE"
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground/40"
                            )}
                          >
                            {selectedPlan === "PAY_PER_USE" && <Check size={10} strokeWidth={3} />}
                          </span>
                          <span className="text-sm font-bold text-foreground">حسب الاستخدام</span>
                        </div>
                        <div className="text-left font-extrabold text-primary text-sm">
                          {formatMoney(app.unitPrice || 1)}
                          <span className="text-xs font-normal text-muted-foreground"> / {app.unitName || "طلب"}</span>
                        </div>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground pr-6 leading-relaxed">
                        ادفع فقط مع كل طلب يتم تسجيله، بدون أي اشتراك شهري ثابت.
                      </p>
                    </div>
                  )}

                  {/* Monthly Option */}
                  {hasMonthly && (
                    <div
                      onClick={() => setSelectedPlan("MONTHLY")}
                      className={cn(
                        "relative cursor-pointer rounded-xl border p-3 transition-all text-right",
                        selectedPlan === "MONTHLY"
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : "border-border/60 bg-background hover:border-border hover:bg-muted/30",
                        currentActivePlan === "MONTHLY" && "ring-1 ring-emerald-500/50"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "flex size-4 items-center justify-center rounded-full border text-[10px]",
                              selectedPlan === "MONTHLY"
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground/40"
                            )}
                          >
                            {selectedPlan === "MONTHLY" && <Check size={10} strokeWidth={3} />}
                          </span>
                          <span className="text-sm font-bold text-foreground">اشتراك شهري</span>
                        </div>
                        <div className="text-left font-extrabold text-primary text-sm">
                          {formatMoney(app.monthlyPrice)}
                          <span className="text-xs font-normal text-muted-foreground"> / شهر</span>
                        </div>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground pr-6 leading-relaxed">
                        وصول كامل غير محدود لإدارة المتجر مع تجديد شهري.
                      </p>
                    </div>
                  )}

                  {/* Yearly Option */}
                  {hasYearly && (
                    <div
                      onClick={() => setSelectedPlan("YEARLY")}
                      className={cn(
                        "relative cursor-pointer rounded-xl border p-3 transition-all text-right",
                        selectedPlan === "YEARLY"
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : "border-border/60 bg-background hover:border-border hover:bg-muted/30",
                        currentActivePlan === "YEARLY" && "ring-1 ring-emerald-500/50"
                      )}
                    >
                      {yearlySavingsPercent > 0 && (
                        <span className="absolute -top-2 left-3 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5 shadow-sm">
                          وفر {yearlySavingsPercent}%
                        </span>
                      )}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "flex size-4 items-center justify-center rounded-full border text-[10px]",
                              selectedPlan === "YEARLY"
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground/40"
                            )}
                          >
                            {selectedPlan === "YEARLY" && <Check size={10} strokeWidth={3} />}
                          </span>
                          <span className="text-sm font-bold text-foreground">اشتراك سنوي</span>
                        </div>
                        <div className="text-left font-extrabold text-primary text-sm">
                          {formatMoney(app.yearlyPrice)}
                          <span className="text-xs font-normal text-muted-foreground"> / سنة</span>
                        </div>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground pr-6 leading-relaxed">
                        صلاحية سنة كاملة (365 يوم) مع أفضل قيمة واستقرار للمتجر.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-1 space-y-2">
                {isInstalled ? (
                  <>
                    <Button
                      onClick={() => {
                        const dest = app.mainRoute || getAppDestination(app);
                        if (dest) {
                          if (dest.startsWith("http://") || dest.startsWith("https://")) {
                            window.location.href = dest;
                          } else {
                            navigate(dest);
                          }
                        }
                      }}
                      className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                      size="sm"
                    >
                      <ExternalLink size={14} /> فتح التطبيق
                    </Button>

                    {isCurrentPlanActive ? (
                      <Button disabled variant="outline" className="w-full gap-2 text-xs" size="sm">
                        <Check size={14} /> مفعل حالياً ({planTitles[selectedPlan]})
                      </Button>
                    ) : (
                      <Button
                        className="w-full gap-2 bg-primary hover:bg-primary/90 font-bold text-xs"
                        size="sm"
                        disabled={installing}
                        onClick={() => handleInstall(selectedPlan)}
                      >
                        {installing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        تغيير الاشتراك إلى {planTitles[selectedPlan]}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full gap-2 text-xs text-destructive hover:bg-destructive/10"
                      disabled={installing}
                      onClick={handleUninstall}
                    >
                      {installing ? <Loader2 size={14} className="animate-spin" /> : null}
                      تعطيل التطبيق
                    </Button>
                  </>
                ) : (
                  <>
                    {!isInstalled && isExpired && (
                      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
                        <div className="flex items-center gap-1.5 font-bold mb-1">
                          <AlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                          <span>اشتراكك منتهي — جدّدي للوصول</span>
                        </div>
                        <p className="text-[11px] text-amber-700/90 dark:text-amber-300/90 leading-relaxed">
                          يتطلب هذا التطبيق اشتراكاً سارياً للوصول واستخدام جميع المميزات التشغيلية.
                        </p>
                      </div>
                    )}

                    <Button
                      className="w-full gap-2 font-bold"
                      size="sm"
                      disabled={installing}
                      onClick={() => handleInstall(selectedPlan)}
                    >
                      {installing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      {isExpired
                        ? `تجديد الاشتراك (${planTitles[selectedPlan]} - ${planPrices[selectedPlan]})`
                        : `تفعيل ${isFree ? "التطبيق" : `${planTitles[selectedPlan]} (${planPrices[selectedPlan]})`}`}
                    </Button>
                  </>
                )}
              </div>
            </aside>
          </div>
        </section>

        <div className="mt-5 space-y-5">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start gap-0 rounded-xl border bg-card p-1 overflow-x-auto">
              <TabsTrigger value="features" className="rounded-lg text-xs font-bold">الميزات</TabsTrigger>
              {screenshots.length > 0 && <TabsTrigger value="screenshots" className="rounded-lg text-xs font-bold">لقطات الشاشة</TabsTrigger>}
              {faq.length > 0 && <TabsTrigger value="faq" className="rounded-lg text-xs font-bold">الأسئلة الشائعة</TabsTrigger>}
              {reviews.length > 0 && <TabsTrigger value="reviews" className="rounded-lg text-xs font-bold">التقييمات</TabsTrigger>}
              {changelog.length > 0 && <TabsTrigger value="changelog" className="rounded-lg text-xs font-bold">سجل التحديثات</TabsTrigger>}
            </TabsList>

            <TabsContent value="features" className="mt-4">
              <div className="rounded-2xl border bg-card p-5 text-right">
                <h2 className="text-xl font-extrabold text-foreground mb-4">الميزات</h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {featureItems.length > 0 ? featureItems.map((feature) => (
                    <article key={feature.key} className="rounded-xl border bg-background p-4 text-right group hover:border-primary/30 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <span className="rounded-full bg-muted/50 px-3 py-1 text-xs font-bold text-muted-foreground shrink-0">
                          {getFeatureAccessLabel(feature.access)}
                        </span>
                        <div className="min-w-0">
                          <h3 className="text-foreground text-base font-bold">{feature.name}</h3>
                          <p className="text-muted-foreground mt-1 text-sm leading-6">{feature.description}</p>
                        </div>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border"><Sparkles size={17} /></span>
                      </div>
                    </article>
                  )) : (
                    <div className="col-span-full rounded-2xl border border-dashed py-10 text-center text-sm text-muted-foreground">
                      <Sparkles size={36} className="mx-auto mb-3 text-muted-foreground/40" />
                      ميزات قادمة قريباً
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {screenshots.length > 0 && (
              <TabsContent value="screenshots" className="mt-4">
                <div className="rounded-2xl border bg-card p-5">
                  <h2 className="text-xl font-extrabold text-foreground mb-4 text-right">{t('marketplace.screenshots')}</h2>
                  <div className="relative">
                    <div className="rounded-xl overflow-hidden bg-muted/30">
                      <img
                        src={screenshots[screenshotIndex]}
                        alt={`Screenshot ${screenshotIndex + 1}`}
                        className="w-full object-cover max-h-[500px]"
                      />
                    </div>
                    {screenshots.length > 1 && (
                      <>
                        <button
                          onClick={() => setScreenshotIndex(i => (i - 1 + screenshots.length) % screenshots.length)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 flex size-9 items-center justify-center rounded-full bg-background/80 backdrop-blur border shadow-sm"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          onClick={() => setScreenshotIndex(i => (i + 1) % screenshots.length)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 flex size-9 items-center justify-center rounded-full bg-background/80 backdrop-blur border shadow-sm"
                        >
                          <ChevronRight size={16} />
                        </button>
                        <div className="flex justify-center gap-1.5 mt-4">
                          {screenshots.map((_, i) => (
                            <button
                              key={i}
                              onClick={() => setScreenshotIndex(i)}
                              className={cn(
                                "w-2 h-2 rounded-full transition-all",
                                i === screenshotIndex ? "bg-primary w-5" : "bg-muted-foreground/30"
                              )}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </TabsContent>
            )}

            {faq.length > 0 && (
              <TabsContent value="faq" className="mt-4">
                <div className="rounded-2xl border bg-card p-5 text-right">
                  <h2 className="text-xl font-extrabold text-foreground mb-4">{t('marketplace.faq')}</h2>
                  <Accordion type="single" collapsible className="space-y-2">
                    {faq.map((item, i) => (
                      <AccordionItem key={i} value={`faq-${i}`} className="rounded-xl border bg-background px-4">
                        <AccordionTrigger className="text-sm font-bold text-right hover:no-underline">
                          <HelpCircle size={14} className="ml-2 text-primary shrink-0" />
                          {item.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                          {item.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </TabsContent>
            )}

            {reviews.length > 0 && (
              <TabsContent value="reviews" className="mt-4">
                <div className="rounded-2xl border bg-card p-5 text-right">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-extrabold text-foreground">{t('marketplace.ratings')}</h2>
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <div className="text-3xl font-extrabold text-foreground">{app.rating?.toFixed(1)}</div>
                        <div className="flex items-center gap-0.5 mt-0.5">
                          {[1,2,3,4,5].map(i => (
                            <Star key={i} size={14} className={i <= (app.rating || 0) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"} />
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{app.reviewCount} {t('marketplace.totalReviews', { count: app.reviewCount })}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {[5,4,3,2,1].map(rating => {
                      const count = reviews.filter((r: { rating: number }) => r.rating === rating).length;
                      const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                      return (
                        <div key={rating} className="flex items-center gap-3">
                          <span className="text-xs font-bold text-muted-foreground w-5">{rating}</span>
                          <Star size={12} className="fill-amber-400 text-amber-400 shrink-0" />
                          <Progress value={pct} className="h-2 flex-1" />
                          <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-4">
                    {reviews.map((review: { id: string; rating: number; title?: string; comment?: string; isVerified: boolean; createdAt: string; user?: { name: string } }) => (
                      <article key={review.id} className="rounded-xl border bg-background p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                              {review.user?.name?.[0] || "?"}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-foreground">{review.user?.name || "مستخدم"}</p>
                              <p className="text-xs text-muted-foreground">{new Date(review.createdAt).toLocaleDateString("ar-EG")}</p>
                            </div>
                          </div>
                          <div>
                            <div className="flex gap-1 mb-1 justify-end">
                              {[1,2,3,4,5].map(i => (
                                <Star key={i} size={13} className={i <= review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"} />
                              ))}
                            </div>
                            {review.isVerified && (
                              <Badge variant="outline" className="text-[10px] gap-0.5">
                                <Check size={10} className="text-success" />
                                {t('marketplace.verifiedPurchase')}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {review.title && <h4 className="mt-2 text-sm font-bold text-foreground">{review.title}</h4>}
                        {review.comment && <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{review.comment}</p>}
                      </article>
                    ))}
                  </div>

                  <Separator className="my-4" />

                  <div className="rounded-xl border bg-background p-4">
                    <h3 className="text-sm font-bold text-foreground mb-3">{t('marketplace.writeReview')}</h3>
                    <div className="flex items-center gap-1 mb-3 justify-end">
                      {[1,2,3,4,5].map(i => (
                        <button key={i} onClick={() => setUserRating(i)}>
                          <Star size={20} className={i <= userRating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"} />
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={reviewText}
                      onChange={e => setReviewText(e.target.value)}
                      placeholder="شارك تجربتك مع هذه الأداة..."
                      className="w-full rounded-xl border border-border bg-background p-3 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                      rows={3}
                    />
                    <Button
                      onClick={handleSubmitReview}
                      disabled={userRating === 0 || submittingReview}
                      className="mt-3 w-full gap-2"
                      size="sm"
                    >
                      {submittingReview ? <Loader2 size={14} className="animate-spin" /> : <MessageSquare size={14} />}
                      إرسال التقييم
                    </Button>
                  </div>
                </div>
              </TabsContent>
            )}

            {changelog.length > 0 && (
              <TabsContent value="changelog" className="mt-4">
                <div className="rounded-2xl border bg-card p-5 text-right">
                  <h2 className="text-xl font-extrabold text-foreground mb-4">{t('marketplace.changelog')}</h2>
                  <div className="space-y-4">
                    {changelog.map((entry: { version: string; date: string; changes: string[] }, i: number) => (
                      <div key={i} className="rounded-xl border bg-background p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="secondary" className="gap-1">
                            <Clock size={11} />
                            {entry.version}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{entry.date}</span>
                        </div>
                        <ul className="space-y-1.5">
                          {entry.changes.map((change, j) => (
                            <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-success" />
                              {change}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>

          {appExplanation?.videoUrl && (
            <section className="rounded-2xl border bg-card p-5 text-right">
              <h2 className="text-xl font-extrabold text-foreground mb-4 flex items-center gap-2">
                <PlayCircle size={20} className="text-primary" />
                شرح بالفيديو
              </h2>
              <p className="text-sm text-muted-foreground mb-3">{appExplanation.title}</p>
              <div className="overflow-hidden rounded-xl bg-black/90 mx-auto w-full max-w-3xl">
                {getYouTubeEmbedUrl(appExplanation.videoUrl) ? (
                  <iframe
                    src={getYouTubeEmbedUrl(appExplanation.videoUrl) as string}
                    title={appExplanation.title}
                    className="w-full aspect-video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                  />
                ) : getDirectVideoUrl(appExplanation.videoUrl) ? (
                  <video
                    src={getDirectVideoUrl(appExplanation.videoUrl) as string}
                    controls
                    playsInline
                    preload="metadata"
                    className="w-full max-h-[70vh]"
                  />
                ) : (
                  <video
                    src={appExplanation.videoUrl}
                    controls
                    playsInline
                    preload="metadata"
                    className="w-full max-h-[70vh]"
                  />
                )}
              </div>
            </section>
          )}

          {app.pricingRules && app.pricingRules.length > 0 && (
            <section className="rounded-2xl border bg-card p-5 text-right">
              <h2 className="text-xl font-extrabold text-foreground">{t('marketplace.pricing')}</h2>
              <div className="mt-4 space-y-3">
                {app.pricingRules.map((rule: { id: string; name: string; description?: string; price: number }) => (
                  <div key={rule.id} className="flex items-center justify-between gap-4 rounded-xl border bg-background p-3">
                    <div className="text-left text-lg font-extrabold text-primary">{formatMoney(rule.price)}</div>
                    <div className="min-w-0 text-right">
                      <div className="text-foreground font-bold">{rule.name}</div>
                      {rule.description && <div className="text-muted-foreground mt-1 text-sm">{rule.description}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {(normalizedRequiredApps.length > 0 || limitations) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {normalizedRequiredApps.length > 0 && (
                <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-right">
                  <h3 className="text-foreground mb-3 flex items-center justify-end gap-2 font-bold">
                    متطلبات التشغيل
                    <AlertCircle size={19} />
                  </h3>
                  <ul className="space-y-2">
                    {normalizedRequiredApps.map((req: { slug?: string; name?: string } | string, idx: number) => (
                      <li key={idx} className="flex items-center justify-end gap-2 text-sm font-bold">
                        {typeof req === "string" ? req : req.name || req.slug || ""}
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {limitations && Object.keys(limitations).length > 0 && (
                <section className="rounded-2xl border bg-card p-5 text-right">
                  <h3 className="text-foreground mb-3 flex items-center justify-end gap-2 font-bold">
                    القيود
                    <Shield size={19} />
                  </h3>
                  <ul className="space-y-2">
                    {Object.entries(limitations).map(([key, value]) => (
                      <li key={key} className="text-sm text-muted-foreground">
                        <span className="text-foreground font-bold">{key}:</span> {String(value)}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}

          <section className="rounded-2xl border bg-card p-5 text-right">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-foreground flex items-center justify-end gap-2 font-bold">
                {t('marketplace.support')}
                <MessageSquare size={19} className="text-primary" />
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link
                to="/support"
                className="flex items-center gap-3 rounded-xl border bg-background p-3 hover:border-primary/30 transition-colors"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Headphones size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">الدعم الفني</p>
                  <p className="text-xs text-muted-foreground">تواصل مع فريق الدعم</p>
                </div>
              </Link>
              {app.docsUrl && (
                <Link
                  to={app.docsUrl}
                  target="_blank"
                  className="flex items-center gap-3 rounded-xl border bg-background p-3 hover:border-primary/30 transition-colors"
                >
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <FileText size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{t('marketplace.documentation')}</p>
                    <p className="text-xs text-muted-foreground">دليل الاستخدام الكامل</p>
                  </div>
                </Link>
              )}
              {app.privacyPolicy && (
                <Link
                  to={app.privacyPolicy}
                  target="_blank"
                  className="flex items-center gap-3 rounded-xl border bg-background p-3 hover:border-primary/30 transition-colors"
                >
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Shield size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{t('marketplace.privacyPolicy')}</p>
                    <p className="text-xs text-muted-foreground">سياسة الخصوصية</p>
                  </div>
                </Link>
              )}
            </div>
          </section>

          {app.developer && (
            <section className="rounded-2xl border bg-card p-5 text-right">
              <h3 className="text-foreground mb-4 flex items-center justify-end gap-2 font-bold">
                {t('marketplace.developerInfo')}
                <Users size={19} className="text-primary" />
              </h3>
              <div className="flex items-start gap-4">
                {app.developer.logo && (
                  <img src={app.developer.logo} alt="" className="size-12 rounded-xl object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <h4 className="text-base font-extrabold text-foreground">{app.developer.name}</h4>
                  {app.developer.description && (
                    <p className="text-sm text-muted-foreground mt-1">{app.developer.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3 text-xs text-muted-foreground">
                    {app.developer.totalApps && <span>{app.developer.totalApps} تطبيق</span>}
                    {app.developer.totalDownloads && <span>{formatInstallCount(app.developer.totalDownloads)} تحميل</span>}
                    {app.developer.averageRating && (
                      <span className="inline-flex items-center gap-0.5">
                        <Star size={10} className="fill-amber-400 text-amber-400" />
                        {app.developer.averageRating.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Sticky mobile action bar — the activate/open action stays reachable
          without scrolling to the sidebar column. */}
      {!loading && app && (
        <div
          className="fixed bottom-0 inset-x-0 z-40 border-t border-border/40 bg-background/95 backdrop-blur px-4 pt-3 lg:hidden"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <div className="flex items-center gap-3">
            <div className="min-w-0 text-right">
              <div className="text-sm font-extrabold text-foreground tabular-nums truncate">
                {isFree ? "مجاني" : planPrices[selectedPlan]}
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                {isInstalled ? "مفعل — جاهز للاستخدام" : planTitles[selectedPlan]}
              </div>
            </div>
            <div className="flex-1" />
            {isInstalled ? (
              <Button
                onClick={() => {
                  const dest = app.mainRoute || getAppDestination(app);
                  if (!dest) return;
                  if (dest.startsWith("http://") || dest.startsWith("https://")) {
                    window.location.href = dest;
                  } else {
                    navigate(dest);
                  }
                }}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                size="sm"
              >
                <ExternalLink size={14} /> فتح التطبيق
              </Button>
            ) : (
              <Button
                className="gap-2 font-bold"
                size="sm"
                disabled={installing}
                onClick={() => handleInstall(selectedPlan)}
              >
                {installing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                {isExpired ? "تجديد الاشتراك" : isFree ? "تفعيل مجاني" : `تفعيل ${planTitles[selectedPlan]}`}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
