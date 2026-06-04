import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Calendar,
  Check,
  ChevronRight,
  DollarSign,
  Download,
  Loader2,
  MessageSquare,
  Package,
  Shield,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Users,
  X,
  Zap,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "../../hooks/useAuthSimple";
import {
  getFeatureAccessKind,
  getFeatureAccessLabel,
  getMarketplaceFeatureItems,
} from "./featureCatalog";

interface MarketplaceApp {
  id: string;
  slug: string;
  name: string;
  nameEn?: string;
  category: string;
  description: string;
  descriptionEn?: string;
  icon?: string;
  coverImage?: string;
  screenshots?: any;
  pricingModel: string;
  monthlyPrice?: number;
  yearlyPrice?: number;
  setupFee?: number;
  trialDays: number;
  features: any;
  limitations?: any;
  requiredApps?: any;
  isActive: boolean;
  isFeatured: boolean;
  isPopular: boolean;
  installCount: number;
  unitPrice?: number;
  unitName?: string;
  isInstalled?: boolean;
  activePricingModel?: string;
  rating?: number;
  reviewCount: number;
  reviews?: any[];
  pricingRules?: any[];
  _count?: {
    installations: number;
    reviews: number;
  };
}

const numberFormatter = new Intl.NumberFormat("ar-EG");

const DETAIL_CATEGORY_ICONS: Record<string, any> = {
  ECOMMERCE: Store,
  HR: Users,
  COMMUNICATION: MessageSquare,
  CRM: Users,
  ANALYTICS: BarChart3,
  MARKETING: Sparkles,
  FINANCE: DollarSign,
  STORE: ShoppingBag,
};

const DETAIL_ICON_ALIASES: Record<string, any> = {
  "chart-bar": BarChart3,
  chart: BarChart3,
  analytics: BarChart3,
  store: Store,
  shop: Store,
  cart: ShoppingBag,
  sparkles: Sparkles,
};

function shouldUseTextIcon(icon?: string) {
  const normalizedIcon = icon?.trim();
  if (!normalizedIcon) return false;

  return Array.from(normalizedIcon).length <= 3 && !/^[a-z0-9_\-\s]+$/i.test(normalizedIcon);
}

function safeParseJson(value: any) {
  if (!value) return null;
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function formatNumber(value?: number | null) {
  return numberFormatter.format(value ?? 0);
}

function formatMoney(value?: number | null) {
  return `${formatNumber(value)} ج`;
}

function getRequirementName(requiredApp: any) {
  if (typeof requiredApp === "string") return requiredApp;
  return requiredApp?.name || requiredApp?.slug || "أداة مطلوبة";
}

function getPricingSummary(app: MarketplaceApp, isEnterprise: boolean) {
  if (app.pricingModel === "FREE") {
    return {
      title: "مجاني",
      price: "بدون تكلفة",
      helper: "يمكن تفعيلها مباشرة من غير اشتراك.",
    };
  }

  if (isEnterprise && app.pricingModel !== "FREE") {
    return {
      title: "مشمول في الوصول الشامل",
      price: "مفعل ضمن الباقة",
      helper: app.pricingModel === "PAY_PER_USE"
        ? "الاستخدام محسوب ضمن إعدادات الباقة الحالية."
        : "لا تحتاج لاشتراك منفصل لهذه الأداة.",
    };
  }

  if (app.pricingModel === "PAY_PER_USE") {
    return {
      title: "حسب الاستخدام",
      price: `${formatMoney(app.unitPrice)} / ${app.unitName || "وحدة"}`,
      helper: "ادفع فقط مقابل الاستهلاك الفعلي.",
    };
  }

  return {
    title: "اشتراك شهري",
    price: `${formatMoney(app.monthlyPrice)} / شهر`,
    helper: "وصول كامل لجميع مميزات الأداة.",
  };
}

export default function AppDetails() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [app, setApp] = useState<MarketplaceApp | null>(null);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [uninstalling, setUninstalling] = useState(false);
  const [showPricingDialog, setShowPricingDialog] = useState(false);
  const [confirmUninstall, setConfirmUninstall] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchAppDetails();
    }
  }, [slug]);

  const fetchAppDetails = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/marketplace/apps/${slug}`);
      setApp(response.data.data);
    } catch (error) {
      console.error("Error fetching app details:", error);
      toast.error("خطأ في جلب تفاصيل الأداة");
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async () => {
    if (!app) return;

    if (app.isInstalled && app.activePricingModel !== "PAY_PER_USE") {
      toast.error("هذه الأداة مفعلة بالفعل");
      return;
    }

    if (app.pricingModel === "FREE") {
      executeInstall("FREE");
    } else {
      setShowPricingDialog(true);
    }
  };

  const executeInstall = async (model: string) => {
    if (!app) return;
    try {
      setInstalling(true);

      const response = await apiClient.post(`/marketplace/apps/${app.slug}/install`, {
        pricingModel: model,
      });
      const autoInstalledRequiredApps =
        response.data?.data?.autoInstalledRequiredApps ?? [];
      const autoInstalledNames = autoInstalledRequiredApps.map(
        (requiredApp: { name?: string; slug: string }) =>
          requiredApp.name || requiredApp.slug,
      );

      toast.success(
        autoInstalledNames.length > 0
          ? `تم تفعيل ${app.name} مع المتطلبات: ${autoInstalledNames.join("، ")}`
          : `تم تفعيل ${app.name} بنجاح`,
      );
      await fetchAppDetails();
      navigate("/marketplace");
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error("يرجى تسجيل الدخول أولاً");
        navigate("/auth/login");
        return;
      }

      const errorMsg = error.response?.data?.message || "خطأ في تفعيل الأداة";
      toast.error(errorMsg);

      if (error.response?.data?.requiredApps) {
        toast.error(
          `يتطلب تفعيل: ${error.response.data.requiredApps.map((requiredApp: any) => requiredApp.name).join("، ")}`,
        );
      }
    } finally {
      setInstalling(false);
      setShowPricingDialog(false);
    }
  };

  const handleUninstall = async () => {
    if (!app) return;
    try {
      setUninstalling(true);

      const response = await apiClient.post(`/marketplace/apps/${app.slug}/uninstall`);

      toast.success(response.data.message || `تم إلغاء تفعيل ${app.name}`);

      await fetchAppDetails();
      setConfirmUninstall(false);
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error("يرجى تسجيل الدخول أولاً");
        return;
      }

      const errorMsg = error.response?.data?.message || "خطأ في إلغاء تفعيل الأداة";
      toast.error(errorMsg);
    } finally {
      setUninstalling(false);
    }
  };

  if (loading) {
    return (
      <div className="marketplace-page flex min-h-screen items-center justify-center overflow-x-hidden">
        <div className="marketplace-card rounded-2xl px-10 py-8 text-center">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-b-2 border-[var(--color-primary)]" />
          <p className="marketplace-muted mt-4 text-sm font-bold">
            جاري التحميل…
          </p>
        </div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="marketplace-page flex min-h-screen items-center justify-center overflow-x-hidden">
        <div className="marketplace-card rounded-2xl px-10 py-8 text-center">
          <AlertCircle size={44} className="marketplace-muted mx-auto mb-4" aria-hidden="true" />
          <p className="marketplace-muted">الأداة غير موجودة</p>
          <Link
            to="/marketplace"
            className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[var(--color-primary)] transition-colors duration-200 hover:text-[color-mix(in_srgb,var(--color-primary)_80%,black)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          >
            العودة إلى التطبيقات
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    );
  }

  const isEnterprise = user?.company?.plan === "ENTERPRISE";
  const featureItems = getMarketplaceFeatureItems(app);
  const limitations = safeParseJson(app.limitations);
  const requiredApps = safeParseJson(app.requiredApps);
  const normalizedRequiredApps = Array.isArray(requiredApps) ? requiredApps : [];
  const pricingSummary = getPricingSummary(app, isEnterprise);
  const accessKind = getFeatureAccessKind(app.pricingModel);
  const DetailIcon =
    DETAIL_ICON_ALIASES[String(app.icon || "").trim()] ||
    DETAIL_CATEGORY_ICONS[String(app.category || "").trim().toUpperCase()] ||
    Package;
  const textIcon = shouldUseTextIcon(app.icon) ? app.icon?.trim() : null;

  return (
    <div className="marketplace-page min-h-screen overflow-x-hidden">
      <div className="mx-auto max-w-[1280px] px-4 pb-10 pt-5 sm:px-6 lg:px-8">
        <Link
          to="/marketplace"
          className="marketplace-muted inline-flex items-center gap-2 rounded-xl px-2 py-1 text-sm font-black transition-colors duration-200 hover:text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
        >
          <ChevronRight size={18} aria-hidden="true" />
          العودة إلى التطبيقات
        </Link>

        <section className="marketplace-panel mt-4 overflow-hidden rounded-[1.75rem]">
          <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:p-6">
            <div className="min-w-0 text-right">
              <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
                <span className="marketplace-chip rounded-full px-3 py-1 text-xs font-black">
                  {getFeatureAccessLabel(accessKind)}
                </span>
                {app.isFeatured && (
                  <span className="marketplace-soft-warning inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-black">
                    <Sparkles size={13} aria-hidden="true" />
                    مميز
                  </span>
                )}
                {isEnterprise && app.pricingModel !== "FREE" && (
                  <span className="marketplace-soft-success rounded-full border px-3 py-1 text-xs font-black">
                    ضمن الوصول الشامل
                  </span>
                )}
              </div>

              <div className="flex flex-col items-end gap-4 sm:flex-row-reverse sm:items-start">
                <div className="marketplace-soft-primary flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border text-3xl">
                  {textIcon || <DetailIcon size={30} aria-hidden="true" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="marketplace-strong text-3xl font-black leading-tight text-pretty sm:text-4xl">
                    {app.name}
                  </h1>
                  <p className="marketplace-muted mt-3 max-w-3xl text-sm font-semibold leading-7 sm:text-base">
                    {app.description}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center justify-end gap-2 text-xs font-bold">
                    {app.rating && (
                      <span className="marketplace-chip inline-flex items-center gap-1 rounded-full px-3 py-1">
                        <Star size={14} className="fill-amber-400 text-amber-400" aria-hidden="true" />
                        {app.rating.toFixed(1)}
                        <span className="marketplace-muted">
                          ({formatNumber(app.reviewCount)} تقييم)
                        </span>
                      </span>
                    )}
                    <span className="marketplace-chip inline-flex items-center gap-1 rounded-full px-3 py-1">
                      <Download size={14} aria-hidden="true" />
                      {formatNumber(app.installCount)} تثبيت
                    </span>
                    {app.trialDays > 0 && (
                      <span className="marketplace-chip inline-flex items-center gap-1 rounded-full px-3 py-1">
                        <Calendar size={14} aria-hidden="true" />
                        تجربة {formatNumber(app.trialDays)} يوم
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <aside className="marketplace-card rounded-2xl p-4 text-right lg:sticky lg:top-5 lg:self-start">
              <div className="marketplace-control rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="marketplace-strong text-sm font-black">
                      {pricingSummary.title}
                    </div>
                    <p className="marketplace-muted mt-1 text-xs leading-5">
                      {pricingSummary.helper}
                    </p>
                  </div>
                  <div className="text-left">
                    <div className="text-lg font-black text-[var(--color-primary)]">
                      {pricingSummary.price}
                    </div>
                    {!isEnterprise && app.pricingModel !== "FREE" && app.monthlyPrice ? (
                      <div className="marketplace-muted mt-1 text-[11px]">
                        شهريًا
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {app.isInstalled ? (
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleInstall}
                    disabled={installing}
                    className="marketplace-primary-action inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-black transition-[background-color,box-shadow] duration-200 disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                  >
                    {installing ? (
                      <span className="h-5 w-5 animate-spin rounded-full border-b-2 border-current" aria-hidden="true" />
                    ) : (
                      <>
                        <Zap size={18} className="fill-current" aria-hidden="true" />
                        تحديث الاشتراك
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmUninstall(true)}
                    disabled={uninstalling}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-5 text-sm font-black text-red-500 transition-colors duration-200 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                  >
                    <X size={18} strokeWidth={2.5} />
                    إلغاء التفعيل
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleInstall}
                  disabled={installing}
                  className="marketplace-primary-action mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-black transition-[background-color,box-shadow] duration-200 disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                >
                  {installing ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-b-2 border-current" aria-hidden="true" />
                  ) : (
                    <>
                      <Zap size={18} className="fill-current" aria-hidden="true" />
                      تفعيل الأداة الآن
                    </>
                  )}
                </button>
              )}

              {app.setupFee && app.setupFee > 0 && (
                <p className="marketplace-muted mt-3 text-center text-xs">
                  + رسوم إعداد لمرة واحدة: {formatMoney(app.setupFee)}
                </p>
              )}
            </aside>
          </div>
        </section>

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <main className="min-w-0 space-y-5">
            <section className="marketplace-card rounded-2xl p-5 text-right">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="marketplace-strong flex items-center justify-end gap-3 text-xl font-black">
                    المزايا الظاهرة قبل التفعيل
                    <span className="marketplace-soft-success flex h-9 w-9 items-center justify-center rounded-xl border">
                      <Check size={20} aria-hidden="true" />
                    </span>
                  </h2>
                  <p className="marketplace-muted mt-2 text-sm leading-6">
                    كل ميزة موضحة بوسم واضح: مجاني أو مدفوع أو حسب الاستخدام.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {featureItems.length > 0 ? (
                  featureItems.map((feature) => (
                    <article
                      key={feature.key}
                      className="marketplace-control group rounded-2xl p-4 text-right transition-[background-color,border-color,transform] duration-200 hover:-translate-y-0.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="marketplace-chip shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black">
                          {getFeatureAccessLabel(feature.access)}
                        </span>
                        <div className="min-w-0">
                          <h3 className="marketplace-strong text-base font-black">
                            {feature.name}
                          </h3>
                          <p className="marketplace-muted mt-1 text-sm font-semibold leading-6">
                            {feature.description}
                          </p>
                        </div>
                        <span className="marketplace-soft-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-transform duration-200 group-hover:scale-105">
                          <Sparkles size={17} aria-hidden="true" />
                        </span>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="marketplace-muted col-span-full rounded-2xl border border-dashed border-[var(--color-border)] py-10 text-center text-sm">
                    لا توجد تفاصيل إضافية للمميزات حالياً
                  </div>
                )}
              </div>
            </section>

            {app.pricingRules && app.pricingRules.length > 0 && (
              <section className="marketplace-card rounded-2xl p-5 text-right">
                <h2 className="marketplace-strong text-xl font-black">
                  تفاصيل التسعير
                </h2>
                <div className="mt-4 space-y-3">
                  {app.pricingRules.map((rule: any) => (
                    <div
                      key={rule.id}
                      className="marketplace-control flex items-center justify-between gap-4 rounded-xl p-3"
                    >
                      <div className="text-left text-lg font-black text-[var(--color-primary)]">
                        {formatMoney(rule.price)}
                      </div>
                      <div className="min-w-0 text-right">
                        <div className="marketplace-strong font-black">
                          {rule.name}
                        </div>
                        {rule.description && (
                          <div className="marketplace-muted mt-1 text-sm">
                            {rule.description}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {app.reviews && app.reviews.length > 0 && (
              <section className="marketplace-card rounded-2xl p-5 text-right">
                <h2 className="marketplace-strong text-xl font-black">
                  التقييمات
                </h2>
                <div className="mt-4 space-y-4">
                  {app.reviews.map((review: any) => (
                    <article
                      key={review.id}
                      className="marketplace-control rounded-xl p-4"
                    >
                      <div className="mb-2 flex items-center justify-end gap-2">
                        {review.isVerified && (
                          <span className="marketplace-soft-success rounded-full border px-2 py-0.5 text-xs font-bold">
                            موثق
                          </span>
                        )}
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={16}
                              className={
                                i < review.rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-[var(--color-muted-foreground)]"
                              }
                              aria-hidden="true"
                            />
                          ))}
                        </div>
                      </div>
                      {review.title && (
                        <h3 className="marketplace-strong mb-1 font-black">
                          {review.title}
                        </h3>
                      )}
                      {review.comment && (
                        <p className="marketplace-muted text-sm leading-6">
                          {review.comment}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            )}
          </main>

          <aside className="space-y-4">
            {normalizedRequiredApps.length > 0 && (
              <section className="marketplace-soft-warning rounded-2xl border p-5 text-right">
                <h3 className="marketplace-strong mb-3 flex items-center justify-end gap-2 font-black">
                  متطلبات التشغيل
                  <AlertCircle size={19} aria-hidden="true" />
                </h3>
                <p className="text-sm font-semibold leading-6">
                  هذه الأداة تتطلب تفعيل الأدوات التالية أولاً:
                </p>
                <ul className="mt-3 space-y-2">
                  {normalizedRequiredApps.map((reqApp: any, idx: number) => (
                    <li
                      key={`${getRequirementName(reqApp)}-${idx}`}
                      className="flex items-center justify-end gap-2 text-sm font-bold"
                    >
                      {getRequirementName(reqApp)}
                      <span className="h-2 w-2 rounded-full bg-[var(--color-warning)]" />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {limitations && Object.keys(limitations).length > 0 && (
              <section className="marketplace-card rounded-2xl p-5 text-right">
                <h3 className="marketplace-strong mb-3 flex items-center justify-end gap-2 font-black">
                  القيود
                  <Shield size={19} aria-hidden="true" />
                </h3>
                <ul className="space-y-2">
                  {Object.entries(limitations).map(([key, value]) => (
                    <li
                      key={key}
                      className="marketplace-muted text-sm leading-6"
                    >
                      <span className="marketplace-strong font-bold">{key}:</span>{" "}
                      {String(value)}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="marketplace-card rounded-2xl p-5 text-right">
              <h3 className="marketplace-strong mb-3 flex items-center justify-end gap-2 font-black">
                الدعم
                <Users size={19} className="text-[var(--color-primary)]" aria-hidden="true" />
              </h3>
              <p className="marketplace-muted mb-4 text-sm leading-6">
                هل تحتاج مساعدة؟ فريق الدعم جاهز لمساعدتك.
              </p>
              <button
                type="button"
                className="marketplace-control w-full rounded-xl px-4 py-2 text-sm font-black transition-colors duration-200 hover:text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              >
                تواصل مع الدعم
              </button>
            </section>
          </aside>
        </div>
      </div>

      {showPricingDialog && app && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overscroll-contain bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200 motion-reduce:animate-none"
          onClick={() => setShowPricingDialog(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-pricing-dialog-title"
            className="marketplace-panel w-full max-w-md overflow-hidden rounded-2xl animate-in zoom-in-95 duration-200 motion-reduce:animate-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 text-right">
              <div className="mb-6 flex items-center justify-end gap-4">
                <div className="text-right">
                  <h2 id="app-pricing-dialog-title" className="marketplace-strong text-xl font-black">
                    {app.name}
                  </h2>
                  <p className="marketplace-muted text-sm">
                    اختر نظام الدفع المناسب لك
                  </p>
                </div>
                <div className="marketplace-soft-primary flex h-12 w-12 items-center justify-center rounded-xl border text-2xl">
                  {textIcon || <DetailIcon size={24} aria-hidden="true" />}
                </div>
              </div>

              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => executeInstall("SUBSCRIPTION")}
                  disabled={
                    app.isInstalled && app.activePricingModel === "SUBSCRIPTION"
                  }
                  className={`group relative w-full overflow-hidden rounded-xl border-2 p-4 text-right transition-[background-color,border-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${app.isInstalled && app.activePricingModel === "SUBSCRIPTION"
                    ? "marketplace-filter-active cursor-default"
                    : "marketplace-card hover:border-[var(--color-primary)]"
                    }`}
                >
                  {app.isInstalled &&
                    app.activePricingModel === "SUBSCRIPTION" && (
                      <div className="marketplace-primary-action absolute top-0 left-0 rounded-br-lg px-2 py-0.5 text-[10px] font-bold">
                        نشط حالياً
                      </div>
                    )}
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className="font-bold text-[var(--color-primary)]">
                      {(app.monthlyPrice ?? 0) > 0
                        ? `${formatMoney(app.monthlyPrice)} / شهر`
                        : "مجاني"}
                    </span>
                    <span className="marketplace-strong font-black">
                      {app.activePricingModel === "PAY_PER_USE"
                        ? "ترقية لاشتراك شهري"
                        : "اشتراك شهري كامل"}
                    </span>
                  </div>
                  <p className="marketplace-muted text-xs">
                    ادفع مبلغ ثابت شهرياً واستمتع بجميع مميزات الأداة بلا حدود.
                  </p>
                </button>

                {app.pricingModel === "PAY_PER_USE" && (
                  <button
                    type="button"
                    onClick={() => executeInstall("PAY_PER_USE")}
                    disabled={
                      app.isInstalled &&
                      app.activePricingModel === "PAY_PER_USE"
                    }
                    className={`group relative w-full overflow-hidden rounded-xl border-2 p-4 text-right transition-[background-color,border-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-warning)] ${app.isInstalled &&
                      app.activePricingModel === "PAY_PER_USE"
                      ? "marketplace-soft-warning cursor-default"
                      : "marketplace-card hover:border-[var(--color-warning)]"
                      }`}
                  >
                    {app.isInstalled &&
                      app.activePricingModel === "PAY_PER_USE" && (
                        <div className="absolute top-0 left-0 rounded-br-lg bg-[var(--color-warning)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-warning-foreground)]">
                          نشط حالياً
                        </div>
                      )}
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <span className="font-bold text-[var(--color-warning)]">
                        {formatMoney(app.unitPrice)} / {app.unitName || "وحدة"}
                      </span>
                      <span className="marketplace-strong flex items-center gap-1 font-black">
                        حسب الاستخدام
                        <Zap size={14} className="fill-current text-[var(--color-warning)]" aria-hidden="true" />
                      </span>
                    </div>
                    <p className="marketplace-muted text-xs">
                      ادفع فقط مقابل ما تستهلكه فعلياً. مناسب للمشاريع المبتدئة.
                    </p>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowPricingDialog(false)}
                className="marketplace-control marketplace-muted mt-6 w-full rounded-xl py-3 text-sm font-medium transition-colors duration-200 hover:text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Uninstall Confirmation Dialog */}
      {confirmUninstall && app && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overscroll-contain bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200 motion-reduce:animate-none"
          onClick={() => setConfirmUninstall(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-uninstall-dialog-title"
            className="marketplace-panel w-full max-w-md overflow-hidden rounded-2xl animate-in zoom-in-95 duration-200 motion-reduce:animate-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle size={28} className="text-red-600" />
              </div>

              <h2
                id="app-uninstall-dialog-title"
                className="text-center text-xl font-black"
              >
                إلغاء تفعيل {app.name}
              </h2>

              <p className="mt-3 text-center text-sm leading-6 text-[var(--color-muted-foreground)]">
                هل أنت متأكد من إلغاء تفعيل هذه الأداة؟
                <br />
                سيتم إلغاء الخدمة وقد تفقد بعض الإعدادات المرتبطة بها.
              </p>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmUninstall(false)}
                  disabled={uninstalling}
                  className="flex-1 rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm font-black transition-colors duration-200 hover:bg-[var(--color-surface-hover)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                >
                  تراجع
                </button>
                <button
                  type="button"
                  onClick={handleUninstall}
                  disabled={uninstalling}
                  className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-black text-white transition-colors duration-200 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  {uninstalling ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      جاري الإلغاء...
                    </span>
                  ) : (
                    "تأكيد الإلغاء"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
