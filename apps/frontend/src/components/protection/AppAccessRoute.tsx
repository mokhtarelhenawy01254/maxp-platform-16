import React, { ReactNode, useEffect } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Lock, CreditCard, ArrowLeft, AlertCircle } from "lucide-react";
import { useAuth } from "../../hooks/useAuthSimple";
import AccessDenied from "./AccessDenied";
import ErrorBoundary from "../common/ErrorBoundary";
import { APP_REGISTRY } from "../../config/appRegistry";
import marketplaceAppSlugs from "../../data/marketplaceAppSlugs.json";

export { APP_SLUG_ALIASES, getCandidateSlugs, resolveCanonicalSlug } from "./appSlugAliases";
import { APP_SLUG_ALIASES, getCandidateSlugs, resolveCanonicalSlug } from "./appSlugAliases";
interface AppAccessRouteProps {
  children: ReactNode;
  requiredAppSlugs: string[];
  redirectMode?: "redirect" | "screen" | "overlay-blur";
}

/**
 * Protects a route based on whether the company has one of the required
 * marketplace apps active.
 * If subscription is missing or expired, redirects to the marketplace subscription/renewal page
 * or renders a blurred locked overlay with renewal popup.
 * SUPER_ADMIN always bypasses.
 */
export const AppAccessRoute: React.FC<AppAccessRouteProps> = ({
  children,
  requiredAppSlugs,
  redirectMode = "overlay-blur",
}) => {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!isAuthenticated || !user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Super admin bypass
  if (user.role === "SUPER_ADMIN") {
    return <>{children}</>;
  }

  const currentCompany = user?.companies?.find((c) => c.isCurrent) || user?.company;
  const activeApps: any[] = Array.isArray((currentCompany as any)?.activeApps)
    ? (currentCompany as any).activeApps
    : Array.isArray((user?.company as any)?.activeApps)
      ? (user.company as any).activeApps
      : Array.isArray((user as any)?.activeApps)
        ? (user as any).activeApps
        : [];

  const hasAccess = requiredAppSlugs.some((requiredSlug) => {
    const candidates = getCandidateSlugs(requiredSlug);
    return activeApps.some((a: any) => {
      const slugVal = typeof a === "string" ? a : (a as { slug?: string; app?: { slug?: string } })?.slug || (a as { app?: { slug?: string } })?.app?.slug;
      if (!slugVal || typeof slugVal !== "string") return false;
      const lower = slugVal.trim().toLowerCase();
      return candidates.includes(lower);
    });
  });

  const rawPrimary = requiredAppSlugs[0]?.trim() || "marketplace";
  const primarySlug = resolveCanonicalSlug(rawPrimary);

  // Check whether any of the required slugs (or their aliases/candidates) exist in the marketplace catalog
  const isKnownApp = React.useMemo(() => {
    const catalogList: string[] = Array.isArray(marketplaceAppSlugs) ? (marketplaceAppSlugs as string[]) : [];
    const knownSet = new Set<string>([
      ...catalogList.map((s) => s.toLowerCase()),
      ...Object.keys(APP_SLUG_ALIASES).map((s) => s.toLowerCase()),
      ...Object.values(APP_SLUG_ALIASES).flat().map((s) => s.toLowerCase()),
      ...APP_REGISTRY.map((a) => a.id.toLowerCase()),
    ]);

    return requiredAppSlugs.some((reqSlug) => {
      const candidates = getCandidateSlugs(reqSlug);
      return candidates.some((c) => knownSet.has(c));
    });
  }, [requiredAppSlugs]);

  const isDental = requiredAppSlugs.some((s) => s.toLowerCase().includes("dental"));
  const isMessaging = requiredAppSlugs.some((s) =>
    s.toLowerCase().includes("whatsapp") ||
    s.toLowerCase().includes("telegram") ||
    s.toLowerCase().includes("inbox")
  );

  const formattedAppNames = React.useMemo(() => {
    if (requiredAppSlugs.some((s) => s.toLowerCase().startsWith("whatsapp"))) {
      return "واتساب للأعمال";
    }

    const FRIENDLY_APP_NAMES: Record<string, string> = {
      "break-even": "حاسبة نقطة التعادل",
      "project-break-even-calculator": "حاسبة نقطة التعادل",
      "product-break-even": "حاسبة نقطة التعادل للمنتج",
      "product-break-even-calculator": "حاسبة نقطة التعادل للمنتج",
      "monthly-pnl": "حساب الأرباح والخسائر الشهري",
      "monthly-pnl-calculator": "حساب الأرباح والخسائر الشهري",
      "store-pro": "المتجر الاحترافي",
      "marketing-agency-pro": "نظام إدارة الوكالات والشركاء",
      "agency-system": "نظام إدارة الوكالات والشركاء",
      "accounting": "نظام المحاسبة المالية",
      "accounting-app": "نظام المحاسبة المالية",
      "manufacturing": "نظام إدارة التصنيع",
      "manufacturing-app": "نظام إدارة التصنيع",
      "cat-app-manufacturing": "نظام إدارة التصنيع",
      "service-request-app": "إدارة طلبات الخدمة والحجوزات",
      "booking-appointments": "إدارة الحجوزات والمواعيد",
      "tiktok-integrations": "تكامل تيك توك للأعمال",
      "youtube-publish": "النشر وتكامل المنصات",
      "telegram-business": "تيليجرام للأعمال",
      "telegram-integration": "تكامل تيليجرام",
      "unified-inbox": "صندوق المحادثات الموحد",
      "crm-lite": "إدارة العملاء CRM",
      "crm-basic": "إدارة العملاء الأساسي",
      "dental-lab-app": "معمل الأسنان",
      "dental-lab": "معمل الأسنان",
      "booking-app": "نظام الحجوزات",
      "business-tools": "المهام والمشاريع (أدوات الأعمال)",
      "pos-pro": "نقاط البيع الاحترافية POS",
      "order-shipping-turbo": "الشحن السريع المتطور",
    };

    const names = requiredAppSlugs.map((slug) => {
      const lower = slug.trim().toLowerCase();
      if (FRIENDLY_APP_NAMES[lower]) return FRIENDLY_APP_NAMES[lower];

      const reg = APP_REGISTRY.find(
        (a) =>
          a.id.toLowerCase() === lower ||
          a.requiredApps?.some((r) => r.toLowerCase() === lower)
      );
      if (reg) {
        const translated = (t as any)(reg.nameKey);
        if (translated && translated !== reg.nameKey) return translated;
        return reg.displayName || slug;
      }
      return slug;
    });

    return Array.from(new Set(names)).join(" أو ");
  }, [requiredAppSlugs, t]);

  const modalDescription = React.useMemo(() => {
    if (!isKnownApp) {
      return `عذراً، التطبيق المطلوب («${formattedAppNames}») غير متوفر حالياً في متجر التطبيقات أو قد يكون تم تعديل الرابط. يمكنك التواصل مع الدعم الفني أو استعراض التطبيقات المتاحة في المتجر.`;
    }
    if (isDental) {
      return `لقد انتهت فترة الاشتراك في نظام «${formattedAppNames}». جميع بياناتك، سجلات الحالات، أطباء الأسنان، الفواتير، وفريق العمل محفوظة بالكامل ومؤمنة في حسابك. يرجى تفعيل أو تجديد الاشتراك لمواصلة العمل وإدارة الحالات.`;
    }
    if (isMessaging) {
      return `لقد انتهت فترة الاشتراك في خدمة «${formattedAppNames}». تطبيقك وبيانات الربط والمحادثات محفوظة ومثبتة بالكامل، وتم تعليق إمكانية إرسال واستقبال الرسائل مؤقتاً لحين تفعيل الاشتراك.`;
    }
    return `هذه الصفحة تتطلب تفعيل تطبيق «${formattedAppNames}». التطبيق غير مفعّل في حساب شركتك حالياً. يمكنك تفعيله بسهولة من متجر التطبيقات للوصول إلى كافة وظائفه.`;
  }, [isKnownApp, isDental, isMessaging, formattedAppNames]);

  useEffect(() => {
    if (!hasAccess && isAuthenticated && user && user.role !== "SUPER_ADMIN") {
      if (redirectMode !== "overlay-blur") {
        if (!isKnownApp) {
          toast.error(`التطبيق المطلوب «${formattedAppNames}» غير متوفر في النظام.`);
        } else {
          toast.error(
            `هذه الصفحة تتطلب تفعيل تطبيق «${formattedAppNames}». يرجى تفعيل الاشتراك من المتجر للمتابعة.`
          );
        }
      }
    }
  }, [hasAccess, isAuthenticated, user, formattedAppNames, redirectMode, isKnownApp]);

  if (!hasAccess) {
    if (redirectMode === "overlay-blur") {
      return (
        <div className="relative w-full h-full min-h-[calc(100vh-4rem)] overflow-hidden isolate">
          {/* Blurred locked underlying app protected by ErrorBoundary */}
          <div
            className="w-full h-full pointer-events-none select-none filter blur-md opacity-35 grayscale-[20%] transition-all"
            aria-hidden="true"
            tabIndex={-1}
          >
            <ErrorBoundary fallback={<div className="h-full w-full" />}>
              {children}
            </ErrorBoundary>
          </div>

          {/* Locked Overlay Backdrop & Renewal Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="expired-subscription-title"
              aria-describedby="expired-subscription-desc"
              className="relative w-full max-w-md bg-card/95 border border-border/80 shadow-2xl rounded-2xl p-6 sm:p-7 text-center space-y-5 backdrop-blur-md"
            >
              {/* Lock Badge */}
              <div className={`mx-auto w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${
                isKnownApp 
                  ? "bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400"
                  : "bg-destructive/10 border border-destructive/20 text-destructive"
              }`}>
                {isKnownApp ? <Lock className="w-7 h-7" /> : <AlertCircle className="w-7 h-7" />}
              </div>

              {/* Status & Copy */}
              <div className="space-y-2">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  isKnownApp
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                    : "bg-destructive/10 text-destructive border border-destructive/20"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isKnownApp ? "bg-amber-500" : "bg-destructive"} animate-pulse`} />
                  <span>{isKnownApp ? "التطبيق مش مفعّل" : "التطبيق غير موجود"}</span>
                </div>
                <h2 id="expired-subscription-title" className="text-xl font-bold tracking-tight text-foreground">
                  {isKnownApp ? `تطبيق «${formattedAppNames}» غير مفعّل` : "التطبيق غير متوفر"}
                </h2>
                <p id="expired-subscription-desc" className="text-sm text-muted-foreground leading-relaxed text-pretty">
                  {modalDescription}
                </p>
              </div>

              {/* Actions */}
              <div className="pt-2 flex flex-col gap-2.5">
                {isKnownApp ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/marketplace/${encodeURIComponent(primarySlug)}`)}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow hover:bg-primary/90 active:scale-[0.98] transition-all"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>اذهب للمتجر لتفعيل التطبيق</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate("/marketplace")}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow hover:bg-primary/90 active:scale-[0.98] transition-all"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>استعراض متجر التطبيقات</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border/70 bg-secondary/50 hover:bg-secondary text-secondary-foreground text-sm font-medium transition-all active:scale-[0.98]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>العودة إلى لوحة التحكم</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (redirectMode === "screen") {
      return (
        <AccessDenied
          title={isKnownApp ? "التطبيق مش مفعّل" : "التطبيق غير موجود"}
          message={
            isKnownApp
              ? `هذه الصفحة تتطلب تفعيل تطبيق «${formattedAppNames}». يرجى تفعيل الاشتراك من متجر التطبيقات للمتابعة.`
              : `عذراً، التطبيق المطلوب («${formattedAppNames}») غير متوفر في النظام.`
          }
          primaryActionText={
            isKnownApp
              ? "اذهب للمتجر لتفعيل التطبيق"
              : "استعراض متجر التطبيقات"
          }
          primaryActionPath={
            isKnownApp
              ? `/marketplace/${encodeURIComponent(primarySlug)}`
              : "/marketplace"
          }
        />
      );
    }

    return (
      <Navigate
        to={isKnownApp ? `/marketplace/${encodeURIComponent(primarySlug)}` : "/marketplace"}
        replace
        state={{
          accessDenied: true,
          requiredApp: primarySlug,
          appName: formattedAppNames,
          from: location.pathname,
          reason: isKnownApp ? "app_not_active" : "app_not_found",
        }}
      />
    );
  }

  return <>{children}</>;
};

export default AppAccessRoute;
