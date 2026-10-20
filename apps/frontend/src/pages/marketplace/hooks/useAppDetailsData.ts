import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { apiClient } from "../../../services/apiClient";
import { handleInsufficientWalletBalance } from "../../../utils/marketplaceWalletHelper";
import { useAuth } from "../../../hooks/useAuthSimple";
import type { MarketplaceApp as MPA } from "@/types/marketplace";
import { getAppDestination } from "@/utils/marketplace";
import { PlanOption } from "../types/appDetailsTypes";

export function useAppDetailsData() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshUser } = useAuth();

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

  const fetchAppDetails = useCallback(async () => {
    if (!slug) return;
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
  }, [slug]);

  useEffect(() => {
    if (location.state?.accessDenied) {
      toast.error(
        `عذراً، يتطلب الوصول إلى هذا القسم اشتراكاً سارياً في تطبيق «${location.state?.appName || app?.name || "التطبيق"}». يرجى تجديد أو تفعيل الاشتراك للمتابعة.`
      );
    }
  }, [location.state, app?.name]);

  useEffect(() => {
    if (slug) fetchAppDetails();
  }, [slug, fetchAppDetails]);

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

  // Reuse the platform's existing page-explanation videos inside the details page
  useEffect(() => {
    const route = app?.mainRoute;
    if (!route) {
      setAppExplanation(null);
      return;
    }
    let cancelled = false;
    apiClient
      .get(`/app-explanations/by-route?route=${encodeURIComponent(route)}`)
      .then((res) => {
        if (cancelled) return;
        const data = res.data as { success?: boolean; explanations?: Array<{ title: string; videoUrl: string | null }> };
        const first = data?.success && Array.isArray(data.explanations) ? data.explanations.find((e) => e.videoUrl) : null;
        setAppExplanation(first || null);
      })
      .catch(() => {
        if (!cancelled) setAppExplanation(null);
      });
    return () => {
      cancelled = true;
    };
  }, [app?.mainRoute]);

  const handleInstall = async (planToInstall: PlanOption = selectedPlan) => {
    if (!app) return;
    setInstalling(true);
    try {
      const hasPpu = Boolean((app.unitPrice && Number(app.unitPrice) > 0) || app.pricingModel === "PAY_PER_USE");
      const hasMonthly = Boolean((app.monthlyPrice && Number(app.monthlyPrice) > 0) || app.pricingModel === "SUBSCRIPTION");
      const isFree = app.pricingModel === "FREE" && !hasPpu && !hasMonthly;
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
        action: targetDestination
          ? {
              label: "فتح التطبيق",
              onClick: () => {
                if (targetDestination.startsWith("http://") || targetDestination.startsWith("https://")) {
                  window.location.href = targetDestination;
                } else {
                  navigate(targetDestination);
                }
              },
            }
          : undefined,
      });
      setIsInstalled(true);
      await Promise.allSettled([fetchAppDetails(), refreshUser?.()]);
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
      await Promise.allSettled([fetchAppDetails(), refreshUser?.()]);
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
    } catch {
      toast.error("Error submitting review");
    } finally {
      setSubmittingReview(false);
    }
  };

  return {
    app,
    loading,
    screenshotIndex,
    setScreenshotIndex,
    activeTab,
    setActiveTab,
    userRating,
    setUserRating,
    reviewText,
    setReviewText,
    submittingReview,
    installing,
    isInstalled,
    appExplanation,
    selectedPlan,
    setSelectedPlan,
    isExpired,
    handleInstall,
    handleUninstall,
    handleSubmitReview,
    navigate,
  };
}
