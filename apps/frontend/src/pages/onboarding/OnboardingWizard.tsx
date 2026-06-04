import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import LoadingSpinner from "../../components/LoadingSpinner";
import { useAuth } from "../../hooks/useAuthSimple";
import { companyOnboardingService } from "../../services/companyOnboardingService";
import type {
  CompanyOnboardingProfile,
  CompanyOnboardingState,
  CompanyOnboardingStepId,
} from "../../utils/companyOnboarding";

interface StepInfo {
  id: number;
  stepId: CompanyOnboardingStepId;
  title: string;
  subtitle: string;
  icon: string;
}

const STEPS: StepInfo[] = [
  {
    id: 1,
    stepId: "welcome",
    title: "مرحباً",
    subtitle: "نظرة سريعة قبل البداية",
    icon: "01",
  },
  {
    id: 2,
    stepId: "operations",
    title: "التشغيل",
    subtitle: "بيانات الشركة والتخصص",
    icon: "02",
  },
  {
    id: 3,
    stepId: "identity",
    title: "الهوية",
    subtitle: "طابع الواجهة الأساسي",
    icon: "03",
  },
  {
    id: 4,
    stepId: "integrations",
    title: "الربط",
    subtitle: "القنوات والتنبيهات",
    icon: "04",
  },
];

const TONE_OPTIONS = [
  {
    id: "executive",
    name: "Executive Blue",
    description: "أفضل للمبيعات وعمليات الإدارة اليومية.",
  },
  {
    id: "teal",
    name: "Trust Teal",
    description: "أهدأ بصريًا ومناسب لخدمة العملاء.",
  },
  {
    id: "graphite",
    name: "Graphite Slate",
    description: "مظهر مؤسسي أكثر حيادية للفرق الكبيرة.",
  },
];

type WorkspaceFormState = {
  name: string;
  slug: string;
  industry: string;
  currency: string;
  tone: string;
  whatsappNumber: string;
  phone: string;
};

type CompanySnapshot = {
  id: string;
  name: string;
  slug?: string | null;
  phone?: string | null;
  currency?: string | null;
};

type SlugCheckState = {
  status: "idle" | "checking" | "available" | "unavailable" | "error";
  normalizedSlug: string;
  url: string;
  message: string;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: { data?: { message?: string } } }).response
      ?.data?.message === "string"
  ) {
    return (
      (error as { response?: { data?: { message?: string } } }).response?.data
        ?.message || fallback
    );
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
};

const buildWorkspaceData = (
  profile?: Partial<CompanyOnboardingProfile> | null,
  company?: {
    name?: string | null;
    slug?: string | null;
    currency?: string | null;
    phone?: string | null;
  } | null,
): WorkspaceFormState => ({
  name: profile?.workspaceName || company?.name || "",
  slug: company?.slug || "",
  industry: profile?.industry || "",
  currency: profile?.currency || company?.currency || "EGP",
  tone: profile?.tone || "executive",
  whatsappNumber: profile?.whatsappNumber || "",
  phone: profile?.phone || company?.phone || "",
});

const syncStoredUserOnboarding = (
  company: {
    id: string;
    name: string;
    slug?: string | null;
    phone?: string | null;
    currency?: string | null;
  },
  onboarding: CompanyOnboardingState,
) => {
  try {
    const rawUser = localStorage.getItem("user");
    if (!rawUser) {
      return;
    }

    const parsedUser = JSON.parse(rawUser);
    if (!parsedUser || typeof parsedUser !== "object") {
      return;
    }

    const updateCompany = (
      currentCompany: Record<string, unknown> | null | undefined,
    ) => {
      if (!currentCompany || currentCompany["id"] !== company.id) {
        return currentCompany;
      }

      return {
        ...currentCompany,
        ...company,
        onboarding,
      };
    };

    const nextUser = {
      ...parsedUser,
      company: updateCompany(parsedUser.company),
      companies: Array.isArray(parsedUser.companies)
        ? parsedUser.companies.map(updateCompany)
        : parsedUser.companies,
    };

    localStorage.setItem("user", JSON.stringify(nextUser));
    window.dispatchEvent(
      new CustomEvent("auth:user-updated", {
        detail: { user: nextUser },
      }),
    );
  } catch (error) {
    console.warn("Failed to sync onboarding user snapshot", error);
  }
};

const clearDashboardCache = () => {
  try {
    const keysToRemove: string[] = [];

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (
        key?.startsWith("dashboard:") ||
        key?.startsWith("__expiry__dashboard:")
      ) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.warn("Failed to clear dashboard cache", error);
  }
};

const OnboardingWizard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [companySnapshot, setCompanySnapshot] = useState<CompanySnapshot | null>(
    user?.company
      ? {
          id: user.company.id,
          name: user.company.name,
          slug: user.company.slug || null,
          phone: user.company.phone || null,
          currency: user.company.currency || null,
        }
      : null,
  );
  const [onboardingState, setOnboardingState] =
    useState<CompanyOnboardingState | null>(user?.company?.onboarding || null);
  const [slugCheck, setSlugCheck] = useState<SlugCheckState>({
    status: "idle",
    normalizedSlug: "",
    url: "",
    message: "",
  });
  const hasTrackedOnboardingStartRef = useRef(false);
  const trackedStepViewsRef = useRef<Set<string>>(new Set());

  const [workspaceData, setWorkspaceData] = useState<WorkspaceFormState>(() =>
    buildWorkspaceData(user?.company?.onboarding?.profile, user?.company),
  );

  const totalSteps = STEPS.length;
  const progressPct =
    totalSteps > 1 ? ((currentStep - 1) / (totalSteps - 1)) * 100 : 0;
  const companyId = companySnapshot?.id || user?.companyId || "";
  const currentStepInfo = STEPS[currentStep - 1] || null;

  const stepRequirementsMet = useMemo(() => {
    if (currentStep !== 2) {
      return true;
    }

    return Boolean(
      workspaceData.name.trim() &&
        workspaceData.slug.trim() &&
        workspaceData.industry.trim() &&
        workspaceData.currency.trim() &&
        slugCheck.status === "available",
    );
  }, [
    currentStep,
    workspaceData.currency,
    workspaceData.industry,
    workspaceData.name,
    workspaceData.slug,
    slugCheck.status,
  ]);

  const buildProfilePayload = () => ({
    workspaceName: workspaceData.name.trim(),
    industry: workspaceData.industry.trim(),
    currency: workspaceData.currency.trim() || "EGP",
    tone: workspaceData.tone.trim() || "executive",
    whatsappNumber: workspaceData.whatsappNumber.trim(),
    phone: workspaceData.phone.trim(),
  });

  const applySlugCheck = (result: {
    available: boolean;
    slug?: string;
    suggestion?: string;
    url?: string;
    error?: string;
  }) => {
    const normalizedSlug = result.slug || result.suggestion || "";
    const url =
      result.url ||
      (normalizedSlug
        ? `https://${normalizedSlug}.mokhtarelhenawy.online`
        : "");

    setSlugCheck({
      status: result.available ? "available" : "unavailable",
      normalizedSlug,
      url,
      message: result.available
        ? "الرابط متاح وجاهز للاستخدام"
        : result.error || "هذا الرابط غير متاح حالياً",
    });
  };

  const ensureWorkspaceSlug = async () => {
    const slugSource = workspaceData.slug.trim();

    if (!slugSource) {
      throw new Error("حدد الرابط العام للمتجر قبل المتابعة");
    }

    setSlugCheck((prev) => ({
      ...prev,
      status: "checking",
      message: "جاري التحقق من الرابط...",
    }));

    const availability = await companyOnboardingService.checkSlugAvailability(
      slugSource,
      companyId || undefined,
    );

    applySlugCheck(availability);

    const nextSlug = availability.slug || availability.suggestion || "";
    if (!availability.available || !nextSlug) {
      throw new Error(
        availability.error || "الرابط العام الحالي غير متاح، اختر رابطًا آخر",
      );
    }

    if (!companyId || companySnapshot?.slug === nextSlug) {
      if (workspaceData.slug !== nextSlug) {
        setWorkspaceData((prev) => ({ ...prev, slug: nextSlug }));
      }
      return nextSlug;
    }

    const updatedSlug = await companyOnboardingService.updateCompanySlug(
      companyId,
      nextSlug,
    );

    setCompanySnapshot((prev) =>
      prev
        ? {
            ...prev,
            slug: updatedSlug.company.slug,
          }
        : prev,
    );
    setWorkspaceData((prev) => ({
      ...prev,
      slug: updatedSlug.company.slug,
    }));
    setSlugCheck((prev) => ({
      ...prev,
      status: "available",
      normalizedSlug: updatedSlug.company.slug,
      url: updatedSlug.url,
      message: "تم حفظ الرابط العام بنجاح",
    }));

    return updatedSlug.company.slug;
  };

  const handleUseWorkspaceNameForSlug = useCallback(async () => {
    const workspaceName = workspaceData.name.trim();
    if (!workspaceName) {
      toast.error("اكتب اسم النشاط أولاً لتوليد اقتراح مناسب للرابط");
      return;
    }

    try {
      setSlugCheck({
        status: "checking",
        normalizedSlug: "",
        url: "",
        message: "جاري توليد اقتراح من اسم النشاط...",
      });

      const result = await companyOnboardingService.checkSlugAvailability(
        workspaceName,
        companyId || undefined,
      );
      const nextSlug = result.slug || result.suggestion || "";

      if (nextSlug) {
        setWorkspaceData((prev) => ({ ...prev, slug: nextSlug }));
      }

      applySlugCheck(result);
    } catch (error) {
      setSlugCheck({
        status: "error",
        normalizedSlug: "",
        url: "",
        message: getErrorMessage(
          error,
          "تعذر توليد اقتراح للرابط في الوقت الحالي",
        ),
      });
    }
  }, [companyId, workspaceData.name]);

  const applyOnboardingData = useCallback((
    data: Awaited<ReturnType<typeof companyOnboardingService.getOnboarding>>,
    options?: {
      stepNumber?: number;
    },
  ) => {
    setOnboardingState(data.onboarding);
    setCompanySnapshot(data.company);
    setWorkspaceData(buildWorkspaceData(data.onboarding.profile, data.company));
    setSlugCheck({
      status: "idle",
      normalizedSlug: data.company.slug || "",
      url: data.company.slug
        ? `https://${data.company.slug}.mokhtarelhenawy.online`
        : "",
      message: "",
    });
    clearDashboardCache();
    syncStoredUserOnboarding(data.company, data.onboarding);

    if (data.onboarding.status === "completed") {
      setCurrentStep(totalSteps);
      return;
    }

    setCurrentStep(
      options?.stepNumber ||
        data.onboarding.currentStep ||
        data.onboarding.nextStepNumber ||
        1,
    );
  }, [totalSteps]);

  useEffect(() => {
    let cancelled = false;

    const loadOnboarding = async () => {
      try {
        setIsBootstrapping(true);
        setLoadError("");

        const data = await companyOnboardingService.getOnboarding();
        if (cancelled) {
          return;
        }

        if (data.onboarding.status === "completed") {
          applyOnboardingData(data);
          navigate("/company-dashboard", { replace: true });
          return;
        }

        applyOnboardingData(data, {
          stepNumber:
            data.onboarding.nextStepNumber || data.onboarding.currentStep || 1,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setLoadError(
          getErrorMessage(error, "تعذر تحميل بيانات الإعداد في الوقت الحالي"),
        );
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    };

    void loadOnboarding();

    return () => {
      cancelled = true;
    };
  }, [applyOnboardingData, navigate, totalSteps]);

  useEffect(() => {
    if (
      !companyId ||
      isBootstrapping ||
      !onboardingState ||
      onboardingState.status === "completed" ||
      hasTrackedOnboardingStartRef.current
    ) {
      return;
    }

    hasTrackedOnboardingStartRef.current = true;
    void companyOnboardingService
      .trackFunnelEvent({
        type: "onboarding_started",
        stepId: currentStepInfo?.stepId,
        source: "onboarding_wizard",
        metadata: {
          currentStep,
          nextStepId: onboardingState.nextStepId,
          completedCount: onboardingState.completedCount,
          totalSteps: onboardingState.totalSteps,
        },
      })
      .catch((error) => {
        console.warn("Failed to track onboarding start", error);
      });
  }, [
    companyId,
    currentStep,
    currentStepInfo?.stepId,
    isBootstrapping,
    onboardingState,
  ]);

  useEffect(() => {
    if (
      !companyId ||
      isBootstrapping ||
      !currentStepInfo ||
      onboardingState?.status === "completed"
    ) {
      return;
    }

    const trackKey = `${companyId}:${currentStepInfo.stepId}`;
    if (trackedStepViewsRef.current.has(trackKey)) {
      return;
    }

    trackedStepViewsRef.current.add(trackKey);
    void companyOnboardingService
      .trackFunnelEvent({
        type: "onboarding_step_viewed",
        stepId: currentStepInfo.stepId,
        source: "onboarding_wizard",
        metadata: {
          currentStep,
          nextStepId: onboardingState?.nextStepId ?? null,
          completedCount: onboardingState?.completedCount ?? 0,
          totalSteps: onboardingState?.totalSteps ?? totalSteps,
          completedSteps: onboardingState?.completedSteps ?? [],
        },
      })
      .catch((error) => {
        console.warn("Failed to track onboarding step view", error);
      });
  }, [
    companyId,
    currentStep,
    currentStepInfo,
    isBootstrapping,
    onboardingState?.completedCount,
    onboardingState?.completedSteps,
    onboardingState?.nextStepId,
    onboardingState?.status,
    onboardingState?.totalSteps,
    totalSteps,
  ]);

  useEffect(() => {
    if (currentStep !== 2) {
      return;
    }

    if (!workspaceData.slug.trim() && workspaceData.name.trim()) {
      void handleUseWorkspaceNameForSlug();
    }
  }, [currentStep, handleUseWorkspaceNameForSlug, workspaceData.name, workspaceData.slug]);

  useEffect(() => {
    if (currentStep !== 2) {
      return;
    }

    const slugSource = workspaceData.slug.trim();
    if (!slugSource) {
      setSlugCheck({
        status: "idle",
        normalizedSlug: "",
        url: "",
        message: "",
      });
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        setSlugCheck((prev) => ({
          ...prev,
          status: "checking",
          message: "جاري التحقق من الرابط...",
        }));

        const result = await companyOnboardingService.checkSlugAvailability(
          slugSource,
          companyId || undefined,
        );

        if (!cancelled) {
          applySlugCheck(result);
        }
      } catch (error) {
        if (!cancelled) {
          setSlugCheck((prev) => ({
            ...prev,
            status: "error",
            message: getErrorMessage(
              error,
              "تعذر التحقق من الرابط العام في الوقت الحالي",
            ),
          }));
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [currentStep, workspaceData.slug, companyId]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setWorkspaceData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleNext = async () => {
    if (currentStep >= totalSteps) {
      await handleComplete();
      return;
    }

    const nextStep = currentStep + 1;
    if (!currentStepInfo) {
      return;
    }

    try {
      setIsLoading(true);

      if (currentStep === 2) {
        await ensureWorkspaceSlug();
      }

      const data = await companyOnboardingService.saveProgress({
        currentStep: nextStep,
        markStepCompleted: currentStepInfo.stepId,
        saveMode: "advance",
        profile: buildProfilePayload(),
      });

      applyOnboardingData(data, { stepNumber: nextStep });
    } catch (error) {
      toast.error(getErrorMessage(error, "تعذر حفظ تقدم الإعداد"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    try {
      setIsLoading(true);

      const data = await companyOnboardingService.complete({
        currentStep: totalSteps,
        markStepCompleted: "integrations",
        profile: buildProfilePayload(),
        channelsDeferred: !workspaceData.whatsappNumber.trim(),
      });

      applyOnboardingData(data, { stepNumber: totalSteps });
      toast.success("تم إعداد الشركة بنجاح");
      navigate("/company-dashboard", { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error, "حدث خطأ أثناء حفظ الإعدادات"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    try {
      setIsLoading(true);

      if (currentStep === 2) {
        await ensureWorkspaceSlug();
      }

      const data = await companyOnboardingService.saveProgress({
        currentStep,
        saveMode: "pause",
        profile: buildProfilePayload(),
        ...(currentStep === totalSteps && !workspaceData.whatsappNumber.trim()
          ? { channelsDeferred: true }
          : {}),
      });

      applyOnboardingData(data, { stepNumber: currentStep });
      toast.success("تم حفظ تقدمك ويمكنك المتابعة لاحقًا");
      navigate("/company-dashboard");
    } catch (error) {
      toast.error(getErrorMessage(error, "تعذر حفظ التقدم الحالي"));
    } finally {
      setIsLoading(false);
    }
  };

  const renderWelcome = () => (
    <div className="business-onboarding-section">
      <div className="business-onboarding-hero">
        <span className="business-onboarding-eyebrow">Business OS Setup</span>
        <h2>ابدأ بثيم مؤسسي موحد للفريق بالكامل</h2>
        <p>
          المعالج الجديد يضبط التشغيل، الهوية، والقنوات الأساسية بطريقة أبسط
          وأكثر ثقة قبل دخول الفريق للنظام.
        </p>
      </div>

      <div className="business-onboarding-highlights">
        <article className="business-onboarding-highlight">
          <strong>ERP & Ops</strong>
          <span>طلبات، مخزون، ومتابعة تشغيل في نفس المسار.</span>
        </article>
        <article className="business-onboarding-highlight">
          <strong>CRM & Social</strong>
          <span>محادثات، متابعات، وأتمتة اجتماعية بإيقاع واحد.</span>
        </article>
        <article className="business-onboarding-highlight">
          <strong>HR & Automation</strong>
          <span>صلاحيات، دعوات، وتدفقات تشغيل للفِرق اليومية.</span>
        </article>
      </div>
    </div>
  );

  const renderOperations = () => (
    <div className="business-onboarding-section">
      <div className="business-onboarding-heading">
        <h3>عرّف بيئة العمل</h3>
        <p>خلّينا نضبط اسم الشركة والتخصص والعملة الأساسية بشكل واضح.</p>
      </div>

      <div className="business-auth-field">
        <label className="business-auth-label" htmlFor="name">
          اسم الشركة أو النشاط
        </label>
        <input
          id="name"
          name="name"
          value={workspaceData.name}
          onChange={handleChange}
          className="business-auth-input"
          placeholder="مثال: Max P Trading"
        />
      </div>

      <div className="business-auth-grid-2">
        <div className="business-auth-field">
          <label className="business-auth-label" htmlFor="industry">
            التخصص
          </label>
          <select
            id="industry"
            name="industry"
            value={workspaceData.industry}
            onChange={handleChange}
            className="business-auth-input business-auth-select"
          >
            <option value="">اختر التخصص المناسب</option>
            <option value="erp">ERP / Operations</option>
            <option value="crm">CRM / Sales</option>
            <option value="hr">HR / People Ops</option>
            <option value="social">Social Automation</option>
            <option value="hybrid">Hybrid Business Suite</option>
          </select>
        </div>

        <div className="business-auth-field">
          <label className="business-auth-label" htmlFor="currency">
            العملة الأساسية
          </label>
          <select
            id="currency"
            name="currency"
            value={workspaceData.currency}
            onChange={handleChange}
            className="business-auth-input business-auth-select"
          >
            <option value="EGP">جنيه مصري (EGP)</option>
            <option value="SAR">ريال سعودي (SAR)</option>
            <option value="AED">درهم إماراتي (AED)</option>
            <option value="USD">دولار أمريكي (USD)</option>
          </select>
        </div>
      </div>

      <div className="business-auth-field">
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
          <label className="business-auth-label" htmlFor="slug">
            الرابط العام
          </label>
          <button
            type="button"
            onClick={() => void handleUseWorkspaceNameForSlug()}
            className="text-sm font-medium text-[var(--business-accent)] transition hover:opacity-80"
          >
            استخدام اسم النشاط
          </button>
        </div>
        <input
          id="slug"
          name="slug"
          dir="ltr"
          value={workspaceData.slug}
          onChange={handleChange}
          className="business-auth-input business-auth-input--ltr"
          placeholder="my-store"
        />
        <p className="business-auth-note">
          هذا هو الجزء الظاهر في رابط المتجر العام. يمكنك تعديله الآن أو لاحقًا من الإعدادات.
        </p>

        <div className="business-onboarding-preview">
          <div className="business-onboarding-preview-title">المعاينة العامة</div>
          <div className="business-onboarding-preview-url">
            {slugCheck.url ||
              (workspaceData.slug.trim()
                ? `https://${workspaceData.slug.trim()}.mokhtarelhenawy.online`
                : "سيظهر الرابط هنا بعد تحديده")}
          </div>
          {slugCheck.message ? (
            <div
              className="business-onboarding-preview-status"
              style={{
                color:
                  slugCheck.status === "available"
                    ? "#047857"
                    : slugCheck.status === "checking"
                      ? "#2563eb"
                      : "#b91c1c",
              }}
            >
              {slugCheck.message}
              {slugCheck.normalizedSlug &&
              slugCheck.normalizedSlug !== workspaceData.slug.trim() ? (
                <span className="mr-2 font-mono">
                  {slugCheck.normalizedSlug}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  const renderIdentity = () => (
    <div className="business-onboarding-section">
      <div className="business-onboarding-heading">
        <h3>اختر نبرة الثيم</h3>
        <p>
          كل اختيار يحافظ على نفس Business OS foundation مع اختلاف النبرة
          البصرية.
        </p>
      </div>

      <div className="business-tone-grid">
        {TONE_OPTIONS.map((tone) => (
          <button
            key={tone.id}
            type="button"
            className="business-tone-card"
            data-tone={tone.id}
            data-selected={workspaceData.tone === tone.id}
            onClick={() =>
              setWorkspaceData((prev) => ({
                ...prev,
                tone: tone.id,
              }))
            }
          >
            <div className="business-tone-swatch" />
            <div className="business-tone-copy">
              <strong>{tone.name}</strong>
              <span>{tone.description}</span>
            </div>
            {workspaceData.tone === tone.id ? (
              <CheckIcon className="h-4 w-4" />
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );

  const renderIntegrations = () => (
    <div className="business-onboarding-section">
      <div className="business-onboarding-heading">
        <h3>فعّل التنبيهات والقنوات</h3>
        <p>اربط رقم واتساب الأساسي الآن أو أكمل لاحقًا من الإعدادات.</p>
      </div>

      <div className="business-auth-field">
        <label className="business-auth-label" htmlFor="whatsappNumber">
          رقم واتساب الأساسي
        </label>
        <input
          id="whatsappNumber"
          name="whatsappNumber"
          type="tel"
          value={workspaceData.whatsappNumber}
          onChange={handleChange}
          className="business-auth-input business-auth-input--ltr"
          placeholder="+20 10 0000 0000"
        />
        <p className="business-auth-note">
          يمكنك تخطي هذه الخطوة الآن واستكمال الربط لاحقًا بدون فقدان أي
          إعدادات.
        </p>
      </div>

      <div className="business-onboarding-tip">
        <strong>نصيحة تنفيذية</strong>
        <span>
          بعد إنهاء المعالج، ستكون البيئة جاهزة لإضافة المستخدمين وتفعيل وحدات
          CRM وHR وSocial Automation.
        </span>
      </div>
    </div>
  );

  const stepRenderers = [
    renderWelcome,
    renderOperations,
    renderIdentity,
    renderIntegrations,
  ];

  const renderStage = (content: React.ReactNode) => (
    <div className="business-onboarding-stage">{content}</div>
  );

  if (isBootstrapping) {
    return renderStage(
      <section className="business-onboarding-card">
        <div className="business-onboarding-content">
          <div className="business-onboarding-section">
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 text-center">
              <LoadingSpinner size="lg" />
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">جاري تجهيز الإعداد</h3>
                <p className="text-sm text-muted-foreground">
                  نراجع حالة الحساب ونحمّل آخر خطوة وصلتلها.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (loadError && !onboardingState) {
    return renderStage(
      <section className="business-onboarding-card">
        <div className="business-onboarding-content">
          <div className="business-onboarding-section">
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 text-center">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">تعذر تحميل الإعداد</h3>
                <p className="text-sm text-muted-foreground">{loadError}</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="business-primary-button"
                >
                  إعادة المحاولة
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/company-dashboard")}
                  className="business-secondary-button"
                >
                  العودة للوحة التحكم
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return renderStage(
    <section className="business-onboarding-card">
      <div className="business-onboarding-progress-track">
        <div
          className="business-onboarding-progress-fill"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="business-onboarding-steps">
        {STEPS.map((step) => {
          const isDone = step.id < currentStep;
          const isActive = step.id === currentStep;

          return (
            <div
              key={step.id}
              className="business-onboarding-step"
              data-state={isDone ? "done" : isActive ? "active" : "idle"}
            >
              <div className="business-onboarding-step-icon">
                {isDone ? <CheckIcon className="h-4 w-4" /> : step.icon}
              </div>
              <div className="business-onboarding-step-copy">
                <strong>{step.title}</strong>
                <span>{step.subtitle}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="business-onboarding-content">
        {loadError ? (
          <div
            className="mb-4 rounded-2xl border px-4 py-3 text-sm"
            style={{
              borderColor:
                "color-mix(in srgb, var(--business-warning) 26%, transparent)",
              background:
                "color-mix(in srgb, var(--business-warning) 10%, white)",
              color: "var(--color-foreground)",
            }}
          >
            {loadError}
          </div>
        ) : null}
        {stepRenderers[currentStep - 1]?.()}
      </div>

      <div className="business-onboarding-footer">
        <button
          type="button"
          onClick={handleBack}
          disabled={currentStep === 1 || isLoading}
          className="business-secondary-button"
        >
          السابق
        </button>

        <span className="business-onboarding-meta">
          {currentStep} / {totalSteps}
        </span>

        <button
          type="button"
          onClick={handleNext}
          disabled={isLoading || !stepRequirementsMet}
          className="business-primary-button"
        >
          {isLoading ? (
            <span className="business-inline-loader">
              <LoadingSpinner size="sm" color="white" />
              <span>جاري الحفظ...</span>
            </span>
          ) : currentStep === totalSteps ? (
            "إنهاء الإعداد"
          ) : (
            "التالي"
          )}
        </button>
      </div>

      <div className="business-onboarding-skip">
        <button type="button" onClick={() => void handleSkip()}>
          تخطي الإعداد والدخول مباشرة
        </button>
      </div>
    </section>
  );
};

export default OnboardingWizard;
