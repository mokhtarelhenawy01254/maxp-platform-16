import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { BarChart3, Boxes, Building2, CalendarClock, Facebook, Receipt, Users, Wallet } from "lucide-react";
import { apiClient } from "../../../services/apiClient";
import { tokenManager } from "../../../utils/tokenManager";
import {
  formatDate,
  formatNumber,
  formatCurrency,
  formatRelativeDateLabel,
  getCount,
  getStatusMeta,
  buildPlanHighlights,
  getBundleAppSlugs,
  getDaysUntil,
  getDefaultPricingModel,
  normalizeRequiredApps,
  sortAppsByDependencies,
  normalizeCompanyData,
  extractErrorMessage,
} from "./helpers";

const PLAN_OPTIONS = [
  { value: "BASIC", label: "أساسي" },
  { value: "PRO", label: "احترافي" },
  { value: "ENTERPRISE", label: "مؤسسي" },
];

const DEFAULT_PLAN_COPY = {
  BASIC: {
    description: "بداية مناسبة للشركات الجديدة مع الأدوات الأساسية والتشغيل اليومي.",
    highlights: ["تشغيل أساسي", "عدد محدود من الأعضاء", "انطلاقة سريعة"],
  },
  PRO: {
    description: "خطة تشغيل موسعة للشركات التي بدأت تنمو وتحتاج أدوات أقوى.",
    highlights: ["تقارير متقدمة", "دعم أدوات أكثر", "سعة تشغيل أعلى"],
  },
  ENTERPRISE: {
    description: "خطة مرنة للشركات الكبيرة مع حدود أعلى وتجهيزات أوسع.",
    highlights: ["حدود موسعة", "API Access", "تشغيل مؤسسي"],
  },
};

const INITIAL_EMPLOYEE_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  role: "COMPANY_ADMIN",
};

const MOBILE_BREAKPOINT = 768;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : false,
  );
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return isMobile;
}

export function useCompanyDetails() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [company, setCompany] = useState(null);
  const [review, setReview] = useState(null);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [facebookPages, setFacebookPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [error, setError] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "", email: "", phone: "", website: "", plan: "BASIC", currency: "EGP", isActive: true,
  });
  const [editErrors, setEditErrors] = useState({});

  const [transferOpen, setTransferOpen] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [changeOwnerTargetUserId, setChangeOwnerTargetUserId] = useState("");

  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [addEmployeeForm, setAddEmployeeForm] = useState(INITIAL_EMPLOYEE_FORM);
  const [addEmployeeErrors, setAddEmployeeErrors] = useState({});

  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [topUpForm, setTopUpForm] = useState({ amount: "", bonus: "", notes: "" });
  const [topUpErrors, setTopUpErrors] = useState({});

  const [activationLoading, setActivationLoading] = useState(true);
  const [activationError, setActivationError] = useState("");
  const [catalogPlans, setCatalogPlans] = useState([]);
  const [catalogApps, setCatalogApps] = useState([]);
  const [catalogBundles, setCatalogBundles] = useState([]);
  const [planAction, setPlanAction] = useState("");
  const [bundleAction, setBundleAction] = useState("");
  const [appAction, setAppAction] = useState("");
  const [installAllLoading, setInstallAllLoading] = useState(false);

  const ownerUser = useMemo(
    () => companyUsers.find((user) => user.role === "OWNER") || companyUsers.find((user) => user.role === "COMPANY_ADMIN") || null,
    [companyUsers],
  );

  const activeUsersCount = useMemo(() => companyUsers.filter((user) => user.isActive).length, [companyUsers]);
  const inactiveUsersCount = useMemo(() => companyUsers.filter((user) => !user.isActive).length, [companyUsers]);

  const syncEditForm = (nextCompany) => {
    if (!nextCompany) return;
    setEditForm({
      name: nextCompany.name || "",
      email: nextCompany.email || "",
      phone: nextCompany.phone || "",
      website: nextCompany.website || "",
      plan: nextCompany.plan || "BASIC",
      currency: nextCompany.currency || "EGP",
      isActive: nextCompany.isActive ?? true,
    });
  };

  const getCompanyScopedRequestConfig = (config = {}) => ({
    ...config,
    headers: { ...(config.headers || {}), "X-Company-Id": companyId },
  });

  const refreshCompanyWorkspace = async ({ background = false } = {}) => {
    if (!companyId) { setError("معرف الشركة غير متوفر"); setReview(null); setLoading(false); return; }
    if (background) setRefreshing(true); else setLoading(true);
    setUsersLoading(true); setPagesLoading(true); setError("");
    try {
      const [detailResult, usersResult, pagesResult] = await Promise.allSettled([
        apiClient.get(`/admin/companies/${companyId}`),
        apiClient.get(`/admin/companies/${companyId}/users`, { params: { limit: 100, sortBy: "createdAt", sortOrder: "desc" } }),
        apiClient.get(`/admin/companies/${companyId}/facebook-pages`),
      ]);
      if (detailResult.status !== "fulfilled" || !detailResult.value.data?.success) {
        setCompany(null); setReview(null); setCompanyUsers([]); setFacebookPages([]);
        setError("تعذر تحميل بيانات الشركة"); return;
      }
      let nextCompany = normalizeCompanyData(detailResult.value.data.data?.company);
      const nextReview = detailResult.value.data.data?.review || null;
      if (usersResult.status === "fulfilled" && usersResult.value.data?.success) {
        setCompanyUsers(usersResult.value.data.data?.users || []);
      } else { setCompanyUsers([]); toast.error("تعذر تحميل أعضاء الشركة"); }
      if (pagesResult.status === "fulfilled" && pagesResult.value.data?.success) {
        const nextPages = pagesResult.value.data.data || [];
        setFacebookPages(nextPages);
        nextCompany = normalizeCompanyData(nextCompany, { _count: { facebookPages: nextPages.length } });
      } else { setFacebookPages([]); toast.error("تعذر تحميل صفحات فيسبوك"); }
      setCompany(nextCompany); setReview(nextReview); syncEditForm(nextCompany);
    } catch (nextError) {
      setCompany(null); setReview(null); setCompanyUsers([]); setFacebookPages([]);
      setError(extractErrorMessage(nextError, "تعذر تحميل مساحة الشركة"));
    } finally { setLoading(false); setRefreshing(false); setUsersLoading(false); setPagesLoading(false); }
  };

  const refreshActivationCatalog = async () => {
    if (!companyId) { setCatalogPlans([]); setCatalogApps([]); setCatalogBundles([]); setActivationLoading(false); setActivationError(""); return; }
    setActivationLoading(true); setActivationError("");
    try {
      const [plansResult, appsResult, bundlesResult] = await Promise.allSettled([
        apiClient.get("/admin/plans/plans"),
        apiClient.get("/marketplace/apps", getCompanyScopedRequestConfig({ params: { sort: "featured" }, _skipTransientRetry: true })),
        apiClient.get("/marketplace/bundles", getCompanyScopedRequestConfig({ _skipTransientRetry: true })),
      ]);
      if (plansResult.status === "fulfilled" && plansResult.value.data?.success)
        setCatalogPlans(Array.isArray(plansResult.value.data.data) ? plansResult.value.data.data : []);
      else setCatalogPlans([]);
      if (appsResult.status === "fulfilled" && appsResult.value.data?.success)
        setCatalogApps(Array.isArray(appsResult.value.data.data) ? appsResult.value.data.data : []);
      else setCatalogApps([]);
      if (bundlesResult.status === "fulfilled" && bundlesResult.value.data?.success)
        setCatalogBundles(Array.isArray(bundlesResult.value.data.data) ? bundlesResult.value.data.data : []);
      else setCatalogBundles([]);
      const activationSourcesFailed = (appsResult.status !== "fulfilled" || !appsResult.value.data?.success) &&
        (bundlesResult.status !== "fulfilled" || !bundlesResult.value.data?.success);
      if (activationSourcesFailed) setActivationError("تعذر تحميل خيارات التفعيل والاشتراكات لهذه الشركة.");
    } catch (nextError) {
      setCatalogPlans([]); setCatalogApps([]); setCatalogBundles([]);
      setActivationError(extractErrorMessage(nextError, "تعذر تحميل خيارات التفعيل والاشتراكات"));
    } finally { setActivationLoading(false); }
  };

  useEffect(() => { void refreshCompanyWorkspace(); void refreshActivationCatalog(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const validateEditForm = () => {
    const next = {};
    if (!editForm.name.trim()) next.name = "اسم الشركة مطلوب";
    if (!editForm.email.trim()) next.email = "البريد الإلكتروني مطلوب";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) next.email = "صيغة البريد الإلكتروني غير صحيحة";
    if (!editForm.plan) next.plan = "الخطة مطلوبة";
    if (!editForm.currency) next.currency = "العملة مطلوبة";
    setEditErrors(next); return Object.keys(next).length === 0;
  };

  const handleSaveCompany = async () => {
    if (!companyId || !validateEditForm()) return;
    try {
      setEditSaving(true);
      const response = await apiClient.put(`/admin/companies/${companyId}`, {
        name: editForm.name.trim(), email: editForm.email.trim(), phone: editForm.phone.trim(),
        website: editForm.website.trim(), plan: editForm.plan, currency: editForm.currency, isActive: editForm.isActive,
      });
      if (response.data?.success) { toast.success("تم تحديث بيانات الشركة"); setEditOpen(false); await refreshCompanyWorkspace({ background: true }); }
      else toast.error(response.data?.message || "فشل في تحديث الشركة");
    } catch (nextError) { toast.error(extractErrorMessage(nextError, "فشل في تحديث الشركة")); }
    finally { setEditSaving(false); }
  };

  const validateEmployeeForm = () => {
    const next = {};
    if (!addEmployeeForm.firstName.trim()) next.firstName = "الاسم الأول مطلوب";
    if (!addEmployeeForm.lastName.trim()) next.lastName = "الاسم الأخير مطلوب";
    if (!addEmployeeForm.email.trim()) next.email = "البريد الإلكتروني مطلوب";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addEmployeeForm.email)) next.email = "صيغة البريد الإلكتروني غير صحيحة";
    if (!addEmployeeForm.password.trim()) next.password = "كلمة المرور مطلوبة";
    setAddEmployeeErrors(next); return Object.keys(next).length === 0;
  };

  const handleAddEmployee = async () => {
    if (!companyId || !validateEmployeeForm()) return;
    try {
      setEmployeeLoading(true);
      const response = await apiClient.post(`/admin/companies/${companyId}/employees`, {
        firstName: addEmployeeForm.firstName.trim(), lastName: addEmployeeForm.lastName.trim(),
        email: addEmployeeForm.email.trim(), password: addEmployeeForm.password, role: addEmployeeForm.role,
      });
      if (response.data?.success) { toast.success("تمت إضافة العضو بنجاح"); setAddEmployeeOpen(false); setAddEmployeeForm(INITIAL_EMPLOYEE_FORM); await refreshCompanyWorkspace({ background: true }); }
      else toast.error(response.data?.message || "فشل في إضافة العضو");
    } catch (nextError) { toast.error(extractErrorMessage(nextError, "فشل في إضافة العضو")); }
    finally { setEmployeeLoading(false); }
  };

  const handleTransferOwnership = async () => {
    if (!companyId || !changeOwnerTargetUserId) return;
    try {
      setTransferLoading(true);
      const response = await apiClient.post(`/admin/companies/${companyId}/transfer-ownership`, { targetUserId: changeOwnerTargetUserId });
      if (response.data?.success) { toast.success("تم نقل ملكية الشركة بنجاح"); setTransferOpen(false); setChangeOwnerTargetUserId(""); await refreshCompanyWorkspace({ background: true }); }
      else toast.error(response.data?.message || "فشل في نقل الملكية");
    } catch (nextError) { toast.error(extractErrorMessage(nextError, "فشل في نقل الملكية")); }
    finally { setTransferLoading(false); }
  };

  const handleLoginAsAdmin = async () => {
    if (!companyId) return;
    try {
      const response = await apiClient.post(`/admin/companies/${companyId}/login-as-admin`);
      if (response.data?.success) {
        const currentSuperToken = tokenManager.getAccessToken();
        if (currentSuperToken) localStorage.setItem("superAuth", currentSuperToken);
        const currentUser = localStorage.getItem("user");
        if (currentUser) localStorage.setItem("superUser", currentUser);
        tokenManager.setAccessToken(response.data.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.data.user));
        window.location.href = "/company-dashboard"; return;
      }
      toast.error(response.data?.message || "فشل في تسجيل الدخول كمدير الشركة");
    } catch (nextError) { toast.error(extractErrorMessage(nextError, "فشل في تسجيل الدخول كمدير الشركة")); }
  };

  const scrollToActivationSection = () => {
    if (typeof document === "undefined") return;
    document.getElementById("company-activation-center")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openEditModal = () => { if (!company) return; syncEditForm(company); setEditErrors({}); setEditOpen(true); };
  const openAddEmployeeModal = () => { setAddEmployeeErrors({}); setAddEmployeeForm(INITIAL_EMPLOYEE_FORM); setAddEmployeeOpen(true); };

  const openTopUpModal = () => {
    setTopUpErrors({}); setTopUpForm({ amount: "", bonus: "", notes: "" }); setTopUpOpen(true);
  };

  const validateTopUpForm = () => {
    const next = {}; const amount = Number(topUpForm.amount); const bonus = topUpForm.bonus === "" ? 0 : Number(topUpForm.bonus);
    if (!Number.isFinite(amount) || amount <= 0) next.amount = "أدخل قيمة شحن صحيحة أكبر من صفر";
    if (!Number.isFinite(bonus) || bonus < 0) next.bonus = "البونص يجب أن يكون رقمًا موجبًا أو صفرًا";
    setTopUpErrors(next); return Object.keys(next).length === 0;
  };

  const handleTopUpWallet = async () => {
    if (!companyId || !validateTopUpForm()) return;
    try {
      setTopUpLoading(true);
      const response = await apiClient.post("/admin/wallet/add-funds", { companyId, amount: Number(topUpForm.amount), bonus: topUpForm.bonus === "" ? 0 : Number(topUpForm.bonus), notes: topUpForm.notes.trim() });
      if (response.data?.success) { toast.success("تم شحن محفظة الشركة بنجاح"); setTopUpOpen(false); await refreshCompanyWorkspace({ background: true }); }
      else toast.error(response.data?.message || "فشل في شحن محفظة الشركة");
    } catch (nextError) { toast.error(extractErrorMessage(nextError, "فشل في شحن محفظة الشركة")); }
    finally { setTopUpLoading(false); }
  };

  const refreshReviewAndCatalog = async () => { await Promise.all([refreshCompanyWorkspace({ background: true }), refreshActivationCatalog()]); };

  const resolvedPlanCatalog = useMemo(() => PLAN_OPTIONS.map((option) => {
    const matchedPlan = catalogPlans.find((plan) => plan.planType === option.value);
    return { planType: option.value, name: matchedPlan?.name || getStatusMeta("plan", option.value).label, description: matchedPlan?.description || DEFAULT_PLAN_COPY[option.value]?.description || "", highlights: buildPlanHighlights(matchedPlan || option) };
  }), [catalogPlans]);

  const companyInstalledAppsBySlug = useMemo(() => {
    const entries = (review?.usage?.installedApps || []).filter((companyApp) => ["ACTIVE", "TRIAL"].includes(companyApp.status));
    return new Map(entries.filter((companyApp) => companyApp?.app?.slug).map((companyApp) => [companyApp.app.slug, companyApp]));
  }, [review?.usage?.installedApps]);

  const orderedCatalogApps = useMemo(() => {
    const withCompanyState = catalogApps.filter((app) => app?.isActive !== false).map((app) => {
      const installedApp = companyInstalledAppsBySlug.get(app.slug);
      return { ...app, isInstalled: Boolean(installedApp), activePricingModel: installedApp?.activePricingModel || installedApp?.app?.pricingModel || null };
    });
    return sortAppsByDependencies(withCompanyState);
  }, [catalogApps, companyInstalledAppsBySlug]);

  const appNameBySlug = useMemo(() => new Map(orderedCatalogApps.map((app) => [app.slug, app.name])), [orderedCatalogApps]);
  const installedCatalogAppSlugs = useMemo(() => new Set(Array.from(companyInstalledAppsBySlug.keys())), [companyInstalledAppsBySlug]);

  const resolvedBundles = useMemo(() => catalogBundles.map((bundle) => {
    const appSlugs = getBundleAppSlugs(bundle);
    const installedCount = appSlugs.filter((slug) => installedCatalogAppSlugs.has(slug)).length;
    return { ...bundle, appSlugs, installedCount, totalApps: appSlugs.length, isComplete: appSlugs.length > 0 && installedCount === appSlugs.length };
  }), [catalogBundles, installedCatalogAppSlugs]);

  const currentPlanType = review?.subscription?.plan || company?.plan || "BASIC";

  const handleAssignPlatformPlan = async (planType) => {
    if (!companyId || !planType) return;
    try {
      setPlanAction(planType);
      const response = await apiClient.post("/platform-subscription/upgrade", { newPlan: planType }, getCompanyScopedRequestConfig());
      if (response.data?.success) { toast.success(`تم تفعيل خطة ${getStatusMeta("plan", planType).label} للشركة بنجاح`); await refreshReviewAndCatalog(); }
      else toast.error(response.data?.message || "فشل في تفعيل الخطة");
    } catch (nextError) { toast.error(extractErrorMessage(nextError, "فشل في تفعيل الخطة")); }
    finally { setPlanAction(""); }
  };

  const handleInstallApp = async (app) => {
    if (!companyId || !app?.slug) return;
    try {
      setAppAction(app.slug);
      const response = await apiClient.post(`/marketplace/apps/${app.slug}/install`, { pricingModel: getDefaultPricingModel(app) }, getCompanyScopedRequestConfig());
      const autoInstalledRequiredApps = response.data?.data?.autoInstalledRequiredApps ?? [];
      const autoInstalledNames = autoInstalledRequiredApps.map((requiredApp) => requiredApp?.name || requiredApp?.slug);
      toast.success(autoInstalledNames.length > 0 ? `تم تفعيل ${app.name} مع المتطلبات: ${autoInstalledNames.join("، ")}` : `تم تفعيل ${app.name} بنجاح`);
      await refreshReviewAndCatalog();
    } catch (nextError) { toast.error(extractErrorMessage(nextError, "فشل في تفعيل الأداة")); }
    finally { setAppAction(""); }
  };

  const handleSubscribeBundle = async (bundleSlug) => {
    if (!companyId || !bundleSlug) return;
    try {
      setBundleAction(bundleSlug);
      const response = await apiClient.post(`/marketplace/bundles/${bundleSlug}/subscribe`, {}, getCompanyScopedRequestConfig());
      if (response.data?.success) { toast.success(response.data.message || "تم الاشتراك في الباقة بنجاح"); await refreshReviewAndCatalog(); }
      else toast.error(response.data?.message || "فشل في الاشتراك في الباقة");
    } catch (nextError) { toast.error(extractErrorMessage(nextError, "فشل في الاشتراك في الباقة")); }
    finally { setBundleAction(""); }
  };

  const handleActivateAllTools = async () => {
    if (!companyId) return;
    const uninstalledApps = orderedCatalogApps.filter((app) => !app.isInstalled);
    if (!uninstalledApps.length) { toast.success("كل الأدوات المتاحة مفعلة بالفعل على هذه الشركة"); return; }
    setInstallAllLoading(true);
    let successCount = 0, failCount = 0;
    const toastId = toast.loading("جاري تفعيل أدوات الشركة...");
    try {
      for (let index = 0; index < uninstalledApps.length; index += 1) {
        const app = uninstalledApps[index];
        toast.loading(`جاري تفعيل ${app.name}... ${Math.round(((index + 1) / uninstalledApps.length) * 100)}%`, { id: toastId });
        try { await apiClient.post(`/marketplace/apps/${app.slug}/install`, { pricingModel: getDefaultPricingModel(app) }, getCompanyScopedRequestConfig()); successCount += 1; }
        catch { failCount += 1; }
      }
      toast.success(failCount === 0 ? `تم تفعيل ${successCount} أداة للشركة بنجاح` : `تم تفعيل ${successCount} أداة، وتعذر تفعيل ${failCount} أداة`, { id: toastId });
      await refreshReviewAndCatalog();
    } catch (nextError) { toast.error(extractErrorMessage(nextError, "حدث خطأ أثناء التفعيل الجماعي"), { id: toastId }); }
    finally { setInstallAllLoading(false); }
  };

  const topUpAmountPreview = Number.isFinite(Number(topUpForm.amount)) ? Number(topUpForm.amount) : 0;
  const topUpBonusPreview = Number.isFinite(Number(topUpForm.bonus)) ? Number(topUpForm.bonus) : 0;
  const reviewCurrency = review?.wallet?.currency || company?.currency || "EGP";
  const limitEntries = review?.limits?.entries || [];
  const highUsageItems = limitEntries.filter((entry) => entry.percentage >= 80);
  const nextBillingDate = review?.subscription?.nextBillingDate || null;

  const reviewAlerts = useMemo(() => {
    if (!review) return [];
    const alerts = [];
    if (review.subscription?.failedAttempts > 0) alerts.push({ key: "failed-attempts", title: "محاولات دفع فاشلة", description: `يوجد ${formatNumber(review.subscription.failedAttempts)} محاولة فاشلة على اشتراك الشركة وتحتاج مراجعة.`, tone: "border-rose-200 bg-rose-50/90 text-rose-900 dark:border-rose-800/70 dark:bg-rose-950/30 dark:text-rose-100" });
    const daysUntilBilling = getDaysUntil(nextBillingDate);
    if (daysUntilBilling !== null && daysUntilBilling <= 7) alerts.push({ key: "renewal-soon", title: daysUntilBilling < 0 ? "التجديد متأخر" : "التجديد قريب", description: nextBillingDate ? `تاريخ التجديد ${formatDate(nextBillingDate)} (${formatRelativeDateLabel(nextBillingDate)}).` : "لا يوجد تاريخ تجديد محدد حاليًا.", tone: daysUntilBilling < 0 ? "border-rose-200 bg-rose-50/90 text-rose-900 dark:border-rose-800/70 dark:bg-rose-950/30 dark:text-rose-100" : "border-amber-200 bg-amber-50/90 text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/30 dark:text-amber-100" });
    if ((review.wallet?.balance || 0) < (review.subscription?.monthlyFee || 0)) alerts.push({ key: "wallet-balance", title: "رصيد المحفظة أقل من رسوم الاشتراك", description: `الرصيد الحالي ${formatCurrency(review.wallet?.balance, reviewCurrency)} بينما الرسوم ${formatCurrency(review.subscription?.monthlyFee, reviewCurrency)}.`, tone: "border-amber-200 bg-amber-50/90 text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/30 dark:text-amber-100" });
    if ((review.billing?.stats?.overdueInvoices || 0) > 0) alerts.push({ key: "overdue-invoices", title: "فواتير متأخرة", description: `هناك ${formatNumber(review.billing.stats.overdueInvoices)} فاتورة متأخرة لهذه الشركة.`, tone: "border-rose-200 bg-rose-50/90 text-rose-900 dark:border-rose-800/70 dark:bg-rose-950/30 dark:text-rose-100" });
    if ((review.billing?.stats?.pendingReceipts || 0) > 0) alerts.push({ key: "pending-receipts", title: "إيصالات بانتظار المراجعة", description: `يوجد ${formatNumber(review.billing.stats.pendingReceipts)} إيصال يحتاج اعتمادًا من السوبر أدمن.`, tone: "border-sky-200 bg-sky-50/90 text-sky-900 dark:border-sky-800/70 dark:bg-sky-950/30 dark:text-sky-100" });
    if (highUsageItems.length) alerts.push({ key: "limit-usage", title: "حدود استخدام مرتفعة", description: `هناك ${formatNumber(highUsageItems.length)} مؤشر اقترب من الحد المسموح أو تجاوزه.`, tone: "border-amber-200 bg-amber-50/90 text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/30 dark:text-amber-100" });
    return alerts.slice(0, 4);
  }, [review, reviewCurrency, nextBillingDate, highUsageItems.length]);

  const financialMetrics = review ? [
    { icon: Wallet, label: "رصيد المحفظة", value: formatCurrency(review.wallet?.balance, reviewCurrency), hint: `إجمالي الإيداعات ${formatCurrency(review.wallet?.totalDeposited, reviewCurrency)}`, tone: "border-emerald-200/80 bg-[linear-gradient(135deg,rgba(236,253,245,0.96),rgba(209,250,229,0.78))] text-emerald-900 dark:border-emerald-900/60 dark:bg-[linear-gradient(135deg,rgba(6,78,59,0.52),rgba(4,120,87,0.22))] dark:text-emerald-100" },
    { icon: CalendarClock, label: "التجديد القادم", value: nextBillingDate ? formatDate(nextBillingDate) : "غير متوفر", hint: nextBillingDate ? formatRelativeDateLabel(nextBillingDate) : "لا يوجد موعد محدد", tone: "border-amber-200/80 bg-[linear-gradient(135deg,rgba(255,251,235,0.96),rgba(254,243,199,0.82))] text-amber-900 dark:border-amber-900/60 dark:bg-[linear-gradient(135deg,rgba(120,53,15,0.45),rgba(146,64,14,0.22))] dark:text-amber-100" },
    { icon: BarChart3, label: "استهلاك الشهر", value: formatCurrency(review.usage?.costs?.total, reviewCurrency), hint: `${formatNumber(review.usage?.totalActions)} عملية / ${formatNumber(review.usage?.totalQuantity)} وحدة`, tone: "border-sky-200/80 bg-[linear-gradient(135deg,rgba(239,246,255,0.96),rgba(219,234,254,0.82))] text-sky-900 dark:border-sky-900/60 dark:bg-[linear-gradient(135deg,rgba(7,89,133,0.48),rgba(2,132,199,0.22))] dark:text-sky-100" },
    { icon: Receipt, label: "الفواتير المفتوحة", value: formatNumber(review.billing?.stats?.unpaidInvoices || 0), hint: `المتأخرة ${formatNumber(review.billing?.stats?.overdueInvoices || 0)}`, tone: "border-rose-200/80 bg-[linear-gradient(135deg,rgba(255,241,242,0.96),rgba(254,205,211,0.82))] text-rose-900 dark:border-rose-900/60 dark:bg-[linear-gradient(135deg,rgba(127,29,29,0.42),rgba(190,24,93,0.18))] dark:text-rose-100" },
    { icon: Boxes, label: "الأدوات النشطة", value: formatNumber(review.usage?.activeApps || 0), hint: `فشل مدفوعات ${formatNumber(review.billing?.stats?.failedPayments || 0)}`, tone: "border-violet-200/80 bg-[linear-gradient(135deg,rgba(245,243,255,0.96),rgba(233,213,255,0.8))] text-violet-900 dark:border-violet-900/60 dark:bg-[linear-gradient(135deg,rgba(76,29,149,0.42),rgba(109,40,217,0.2))] dark:text-violet-100" },
  ] : [];

  const detailMetrics = company ? [
    { icon: Users, label: "المستخدمين", value: getCount(company, "users"), hint: `${activeUsersCount} نشط / ${inactiveUsersCount} غير نشط` },
    { icon: Building2, label: "العملاء", value: getCount(company, "customers"), hint: "قاعدة العملاء الحالية" },
    { icon: Facebook, label: "صفحات فيسبوك", value: getCount(company, "facebookPages") || facebookPages.length, hint: pagesLoading ? "جاري التحميل..." : "قنوات الربط الحالية" },
  ] : [];

  return {
    navigate, isMobile, company, loading, error, review, reviewCurrency, limitEntries, nextBillingDate,
    scrollToActivationSection, reviewAlerts, detailMetrics, financialMetrics, ownerUser,
    refreshCompanyWorkspace, refreshing,
    openTopUpModal, openEditModal, handleLoginAsAdmin,
    planAction, bundleAction, appAction, installAllLoading, activationLoading, activationError,
    currentPlanType, resolvedPlanCatalog, orderedCatalogApps, resolvedBundles, appNameBySlug,
    handleAssignPlatformPlan, handleInstallApp, handleSubscribeBundle, handleActivateAllTools, refreshActivationCatalog,
    companyUsers, usersLoading, facebookPages, pagesLoading, openAddEmployeeModal,
    editOpen, setEditOpen, editSaving, editForm, setEditForm, editErrors,
    handleSaveCompany, transferOpen, setTransferOpen, transferLoading, changeOwnerTargetUserId, setChangeOwnerTargetUserId,
    handleTransferOwnership, addEmployeeOpen, setAddEmployeeOpen, employeeLoading, addEmployeeForm, setAddEmployeeForm,
    addEmployeeErrors, handleAddEmployee, topUpOpen, setTopUpOpen, topUpLoading, topUpForm, setTopUpForm, topUpErrors,
    topUpAmountPreview, topUpBonusPreview, handleTopUpWallet,
  };
}
