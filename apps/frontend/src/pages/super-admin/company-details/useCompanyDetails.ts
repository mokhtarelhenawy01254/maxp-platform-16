import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { NavigateFunction } from "react-router-dom";
import { toast } from "sonner";
import i18n from "../../../i18n";
import { tToast } from "../../../utils/i18n-toast";
import { BarChart3, Boxes, Building2, CalendarClock, Facebook, Receipt, Users, Wallet } from "lucide-react";
import type { ElementType } from "react";
import type { CompanyData, CompanyReview, CompanyUser, FacebookPage, TicketListItem, ActivityEntry } from "./companyDetailsTypes";
import { apiClient } from "../../../services/apiClient";
import { tokenManager } from "../../../utils/tokenManager";
import {
  formatDate,
  formatNumber,
  formatCurrency,
  formatRelativeDateLabel,
  getCount,
  getBundleAppSlugs,
  getDaysUntil,
  getDefaultPricingModel,
  sortAppsByDependencies,
  normalizeCompanyData,
  extractErrorMessage,
} from "./helpers";

// ponytail: PLAN_OPTIONS, DEFAULT_PLAN_COPY removed — plan tiers deleted

const INITIAL_EMPLOYEE_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  role: "COMPANY_ADMIN",
};

const MOBILE_BREAKPOINT = 768;

function useIsMobile(): boolean {
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

interface ReviewAlert {
  key: string;
  title: string;
  description: string;
  tone: string;
}

interface Metric {
  icon: ElementType;
  label: string;
  value: string | number;
  hint?: string;
  tone?: string;
}

interface EditForm {
  name: string; email: string; phone: string; website: string; currency: string; isActive: boolean; notes: string;
  businessSpecialtyId?: string;
}

interface EmployeeForm {
  firstName: string; lastName: string; email: string; password: string; role: string;
}

interface TopUpForm {
  amount: string; bonus: string; notes: string;
}

interface UseCompanyDetailsReturn {
  navigate: NavigateFunction; isMobile: boolean; company: CompanyData | null; loading: boolean; error: string; review: CompanyReview | null;
  reviewCurrency: string; limitEntries: NonNullable<CompanyReview['limits']>['entries']; nextBillingDate: string | null;
  scrollToActivationSection: () => void; reviewAlerts: ReviewAlert[]; detailMetrics: Metric[]; financialMetrics: Metric[]; ownerUser: CompanyUser | null;
  refreshCompanyWorkspace: (opts?: { background?: boolean }) => Promise<void>; refreshing: boolean;
  openTopUpModal: () => void; openEditModal: () => void; handleLoginAsAdmin: () => Promise<void>;
  planAction: string; bundleAction: string; appAction: string; installAllLoading: boolean; activationLoading: boolean; activationError: string;
  orderedCatalogApps: any[]; resolvedBundles: any[]; appNameBySlug: Map<string, string>;
  handleInstallApp: (app: any) => Promise<void>; handleSubscribeBundle: (bundleSlug: string) => Promise<void>;
  handleActivateAllTools: () => Promise<void>; refreshActivationCatalog: () => Promise<void>;
  companyUsers: CompanyUser[]; usersLoading: boolean; facebookPages: FacebookPage[]; pagesLoading: boolean; openAddEmployeeModal: () => void;
  editOpen: boolean; setEditOpen: Dispatch<SetStateAction<boolean>>; editSaving: boolean; editForm: EditForm; setEditForm: Dispatch<SetStateAction<EditForm>>; editErrors: any;
  handleSaveCompany: () => Promise<void>; transferOpen: boolean; setTransferOpen: Dispatch<SetStateAction<boolean>>; transferLoading: boolean;
  changeOwnerTargetUserId: string; setChangeOwnerTargetUserId: Dispatch<SetStateAction<string>>; handleTransferOwnership: () => Promise<void>;
  addEmployeeOpen: boolean; setAddEmployeeOpen: Dispatch<SetStateAction<boolean>>; employeeLoading: boolean; addEmployeeForm: EmployeeForm;
  setAddEmployeeForm: Dispatch<SetStateAction<EmployeeForm>>; addEmployeeErrors: any; handleAddEmployee: () => Promise<void>;
  topUpOpen: boolean; setTopUpOpen: Dispatch<SetStateAction<boolean>>; topUpLoading: boolean; topUpForm: TopUpForm; setTopUpForm: Dispatch<SetStateAction<TopUpForm>>;
  topUpErrors: any; topUpAmountPreview: number; topUpBonusPreview: number; handleTopUpWallet: () => Promise<void>;
  trialOpen: boolean; setTrialOpen: Dispatch<SetStateAction<boolean>>; trialDuration: string; setTrialDuration: Dispatch<SetStateAction<string>>;
  trialSaving: boolean; trialDeactivating: boolean;
  openTrialModal: () => void; handleActivateTrial: () => Promise<void>; handleDeactivateTrial: () => Promise<void>;
  trialActive: boolean; trialEndsAt: string | null; trialStartedAt: string | null; trialDaysRemaining: number;
  handleUpdateUserRole: (userId: string, role: string) => Promise<void>;
  handleToggleUserStatus: (userId: string) => Promise<void>;
  handleDeleteUser: (userId: string) => Promise<void>;
  deleteConfirmUserId: string | null; setDeleteConfirmUserId: (id: string | null) => void; deleteUserLoading: boolean;
  handleCancelSubscription: () => Promise<void>; handleRetryPayment: () => Promise<void>;
  companyTickets: TicketListItem[]; ticketsLoading: boolean;
  companyActivities: ActivityEntry[]; activitiesLoading: boolean;
  toggleFeatureLoading: boolean;
  handleToggleFeature: (feature: string, enabled: boolean) => Promise<void>;
}

export function useCompanyDetails(): UseCompanyDetailsReturn {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [company, setCompany] = useState<CompanyData | null>(null);
  const [review, setReview] = useState<CompanyReview | null>(null);
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [facebookPages, setFacebookPages] = useState<FacebookPage[]>([]);
  const [companyTickets, setCompanyTickets] = useState<TicketListItem[]>([]);
  const [companyActivities, setCompanyActivities] = useState<ActivityEntry[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [error, setError] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    name: "", email: "", phone: "", website: "", currency: "EGP", isActive: true, notes: "", businessSpecialtyId: "none",
  });
  const [editErrors, setEditErrors] = useState<any>({});

  const [transferOpen, setTransferOpen] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [changeOwnerTargetUserId, setChangeOwnerTargetUserId] = useState("");

  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [addEmployeeForm, setAddEmployeeForm] = useState<EmployeeForm>(INITIAL_EMPLOYEE_FORM);
  const [addEmployeeErrors, setAddEmployeeErrors] = useState<any>({});
  const [deleteConfirmUserId, setDeleteConfirmUserId] = useState<string | null>(null);
  const [deleteUserLoading, setDeleteUserLoading] = useState(false);

  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [topUpForm, setTopUpForm] = useState<TopUpForm>({ amount: "", bonus: "", notes: "" });
  const [topUpErrors, setTopUpErrors] = useState<any>({});

  const [trialOpen, setTrialOpen] = useState(false);
  const [trialDuration, setTrialDuration] = useState("14");
  const [trialSaving, setTrialSaving] = useState(false);
  const [trialDeactivating, setTrialDeactivating] = useState(false);

  const [activationLoading, setActivationLoading] = useState(true);
  const [activationError, setActivationError] = useState("");
  const [catalogPlans, setCatalogPlans] = useState<any[]>([]); // ponytail: kept as state placeholder, not used for plan tiers
  const [catalogApps, setCatalogApps] = useState<any[]>([]);
  const [catalogBundles, setCatalogBundles] = useState<any[]>([]);
  const [planAction, setPlanAction] = useState("");
  const [bundleAction, setBundleAction] = useState("");
  const [appAction, setAppAction] = useState("");
  const [installAllLoading, setInstallAllLoading] = useState(false);
  const [toggleFeatureLoading, setToggleFeatureLoading] = useState(false);

  const ownerUser = useMemo(
    () => companyUsers.find((user) => user.role === "OWNER") || companyUsers.find((user) => user.role === "COMPANY_ADMIN") || null,
    [companyUsers],
  );

  const activeUsersCount = useMemo(() => companyUsers.filter((user) => user.isActive).length, [companyUsers]);
  const inactiveUsersCount = useMemo(() => companyUsers.filter((user) => !user.isActive).length, [companyUsers]);

  const syncEditForm = (nextCompany: CompanyData | null): void => {
    if (!nextCompany) return;
    setEditForm({
      name: nextCompany.name || "",
      email: nextCompany.email || "",
      phone: nextCompany.phone || "",
      website: nextCompany.website || "",
      currency: nextCompany.currency || "EGP",
      isActive: nextCompany.isActive ?? true,
      notes: (nextCompany as any)["notes"] || "",
      businessSpecialtyId: nextCompany.businessSpecialtyId || nextCompany.businessSpecialty?.id || "none",
    });
  };

  const getCompanyScopedRequestConfig = (config: any = {}): any => ({
    ...config,
    headers: { ...(config.headers || {}), "X-Company-Id": companyId },
  });

  const refreshCompanyWorkspace = async ({ background = false }: { background?: boolean } = {}): Promise<void> => {
    if (!companyId) { setError("معرف الشركة غير متوفر"); setReview(null); setLoading(false); return; }
    if (background) setRefreshing(true); else setLoading(true);
    setUsersLoading(true); setPagesLoading(true); setTicketsLoading(true); setActivitiesLoading(true); setError("");
    try {
      const [detailResult, usersResult, pagesResult, ticketsResult, activitiesResult] = await Promise.allSettled([
        apiClient.get(`/admin/companies/${companyId}`, getCompanyScopedRequestConfig()),
        apiClient.get(`/admin/companies/${companyId}/users`, getCompanyScopedRequestConfig({ params: { limit: 100, sortBy: "createdAt", sortOrder: "desc" } })),
        apiClient.get(`/admin/companies/${companyId}/facebook-pages`, getCompanyScopedRequestConfig()),
        apiClient.get(`/support/admin/tickets`, getCompanyScopedRequestConfig({ params: { companyId, limit: 20 } })),
        apiClient.get(`/activity/company/activities`, getCompanyScopedRequestConfig({ params: { companyId, limit: 10 } })),
      ]);
      const detailData: any = detailResult.status === "fulfilled" ? detailResult.value.data : null;
      const usersData: any = usersResult.status === "fulfilled" ? usersResult.value.data : null;
      const pagesData: any = pagesResult.status === "fulfilled" ? pagesResult.value.data : null;
      const ticketsData: any = ticketsResult.status === "fulfilled" ? ticketsResult.value.data : null;
      const activitiesData: any = activitiesResult.status === "fulfilled" ? activitiesResult.value.data : null;
      if (!detailData?.success) {
        setCompany(null); setReview(null); setCompanyUsers([]); setFacebookPages([]);
        setError("تعذر تحميل بيانات الشركة"); return;
      }
      let nextCompany = normalizeCompanyData(detailData.data?.company) as CompanyData | null;
      const nextReview: CompanyReview | null = detailData.data?.review || null;
      if (usersData?.success) {
        setCompanyUsers(usersData.data?.users || []);
      } else { setCompanyUsers([]); tToast.error("companyDetails.unable_load_1117"); }
      if (pagesData?.success) {
        const nextPages: FacebookPage[] = pagesData.data || [];
        setFacebookPages(nextPages);
        nextCompany = normalizeCompanyData(nextCompany, { _count: { facebookPages: nextPages.length } }) as CompanyData | null;
      } else { setFacebookPages([]); tToast.error("companyDetails.unable_load_156e"); }
      if (ticketsData?.tickets) setCompanyTickets(ticketsData.tickets);
      else setCompanyTickets([]);
      if (activitiesData?.success) setCompanyActivities(activitiesData.data?.activities || []);
      else setCompanyActivities([]);
      setCompany(nextCompany); setReview(nextReview); syncEditForm(nextCompany);
    } catch (nextError) {
      setCompany(null); setReview(null); setCompanyUsers([]); setFacebookPages([]); setCompanyTickets([]); setCompanyActivities([]);
      setError(extractErrorMessage(nextError, "تعذر تحميل مساحة الشركة"));
    } finally { setLoading(false); setRefreshing(false); setUsersLoading(false); setPagesLoading(false); setTicketsLoading(false); setActivitiesLoading(false); }
  };

  const refreshActivationCatalog = async (): Promise<void> => {
    if (!companyId) { setCatalogPlans([]); setCatalogApps([]); setCatalogBundles([]); setActivationLoading(false); setActivationError(""); return; }
    setActivationLoading(true); setActivationError("");
    try {
      // ponytail: /admin/plans/plans removed — plan catalog deleted
      setCatalogPlans([]);
      const [appsResult, bundlesResult] = await Promise.allSettled([
        apiClient.get("/marketplace/apps", getCompanyScopedRequestConfig({ params: { sort: "featured" }, _skipTransientRetry: true })),
        apiClient.get("/marketplace/bundles", getCompanyScopedRequestConfig({ _skipTransientRetry: true })),
      ]);
      const appsData: any = appsResult.status === "fulfilled" ? appsResult.value.data : null;
      const bundlesData: any = bundlesResult.status === "fulfilled" ? bundlesResult.value.data : null;
      if (appsData?.success)
        setCatalogApps(Array.isArray(appsData.data) ? appsData.data : []);
      else setCatalogApps([]);
      if (bundlesData?.success)
        setCatalogBundles(Array.isArray(bundlesData.data) ? bundlesData.data : []);
      else setCatalogBundles([]);
      const activationSourcesFailed = !appsData?.success && !bundlesData?.success;
      if (activationSourcesFailed) setActivationError("تعذر تحميل خيارات التفعيل والاشتراكات لهذه الشركة.");
    } catch (nextError) {
      setCatalogPlans([]); setCatalogApps([]); setCatalogBundles([]);
      setActivationError(extractErrorMessage(nextError, "تعذر تحميل خيارات التفعيل والاشتراكات"));
    } finally { setActivationLoading(false); }
  };

  useEffect(() => { void refreshCompanyWorkspace(); void refreshActivationCatalog(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const validateEditForm = (): boolean => {
    const next: Record<string, string> = {};
    if (!editForm["name"].trim()) next["name"] = "اسم الشركة مطلوب";
    if (!editForm["email"].trim()) next["email"] = "البريد الإلكتروني مطلوب";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm["email"])) next["email"] = "صيغة البريد الإلكتروني غير صحيحة";
    if (!editForm["currency"]) next["currency"] = "العملة مطلوبة";
    setEditErrors(next); return Object.keys(next).length === 0;
  };

  const handleSaveCompany = async (): Promise<void> => {
    if (!companyId || !validateEditForm()) return;
    try {
      setEditSaving(true);
      const response: any = await apiClient.put(`/admin/companies/${companyId}`, {
        name: editForm["name"].trim(), email: editForm["email"].trim(), phone: editForm["phone"].trim(),
        website: editForm["website"].trim(), currency: editForm["currency"], isActive: editForm["isActive"],
        notes: editForm["notes"].trim(),
        businessSpecialtyId: editForm["businessSpecialtyId"] === "none" ? null : (editForm["businessSpecialtyId"] || null),
      }, getCompanyScopedRequestConfig());
      if (response.data?.success) { tToast.success("companyDetails.success_update_a26a"); setEditOpen(false); await refreshCompanyWorkspace({ background: true }); }
      else toast.error(response.data?.message || "فشل في تحديث الشركة");
    } catch (nextError) { toast.error(extractErrorMessage(nextError, "فشل في تحديث الشركة")); }
    finally { setEditSaving(false); }
  };

  const validateEmployeeForm = (): boolean => {
    const next: Record<string, string> = {};
    if (!addEmployeeForm["firstName"].trim()) next["firstName"] = "الاسم الأول مطلوب";
    if (!addEmployeeForm["lastName"].trim()) next["lastName"] = "الاسم الأخير مطلوب";
    if (!addEmployeeForm["email"].trim()) next["email"] = "البريد الإلكتروني مطلوب";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addEmployeeForm["email"])) next["email"] = "صيغة البريد الإلكتروني غير صحيحة";
    if (!addEmployeeForm["password"].trim()) next["password"] = "كلمة المرور مطلوبة";
    setAddEmployeeErrors(next); return Object.keys(next).length === 0;
  };

  const handleAddEmployee = async (): Promise<void> => {
    if (!companyId || !validateEmployeeForm()) return;
    try {
      setEmployeeLoading(true);
      const response: any = await apiClient.post(`/admin/companies/${companyId}/employees`, {
        firstName: addEmployeeForm["firstName"].trim(), lastName: addEmployeeForm["lastName"].trim(),
        email: addEmployeeForm["email"].trim(), password: addEmployeeForm["password"], role: addEmployeeForm["role"],
      }, getCompanyScopedRequestConfig());
      if (response.data?.success) { tToast.success("companyDetails.msg_ba2c"); setAddEmployeeOpen(false); setAddEmployeeForm(INITIAL_EMPLOYEE_FORM); void refreshCompanyWorkspace({ background: true }); }
      else toast.error(response.data?.message || "فشل في إضافة العضو");
    } catch (nextError) { toast.error(extractErrorMessage(nextError, "فشل في إضافة العضو")); }
    finally { setEmployeeLoading(false); }
  };

  const handleUpdateUserRole = async (userId: string, role: string): Promise<void> => {
    try {
      const response: any = await apiClient.patch(`/admin/rbac/users/${userId}/role`, { role });
      if (response.data?.success) { tToast.success("companyDetails.success_update_813a"); void refreshCompanyWorkspace({ background: true }); }
      else toast.error(response.data?.message || "فشل في تحديث الصلاحية");
    } catch (nextError) { toast.error(extractErrorMessage(nextError, "فشل في تحديث الصلاحية")); }
  };

  const handleToggleUserStatus = async (userId: string): Promise<void> => {
    try {
      const response: any = await apiClient.patch(`/admin/rbac/users/${userId}/status`);
      if (response.data?.success) { tToast.success("companyDetails.success_status_c11c"); void refreshCompanyWorkspace({ background: true }); }
      else toast.error(response.data?.message || "فشل في تغيير الحالة");
    } catch (nextError) { toast.error(extractErrorMessage(nextError, "فشل في تغيير الحالة")); }
  };

  const handleDeleteUser = async (userId: string): Promise<void> => {
    if (!companyId) return;
    try {
      setDeleteUserLoading(true);
      const response: any = await apiClient.delete(`/admin/companies/${companyId}/users/${userId}`, getCompanyScopedRequestConfig());
      if (response.data?.success) { tToast.success("companyDetails.success_delete_c4fc"); setDeleteConfirmUserId(null); void refreshCompanyWorkspace({ background: true }); }
      else toast.error(response.data?.message || "فشل في حذف العضو");
    } catch (nextError) { toast.error(extractErrorMessage(nextError, "فشل في حذف العضو")); }
    finally { setDeleteUserLoading(false); }
  };

  const handleCancelSubscription = async (): Promise<void> => {
    const subscriptionId = review?.subscription?.id;
    if (!subscriptionId) { tToast.error("companyDetails.msg_8a85"); return; }
    try {
      const response: any = await apiClient.put(`/super-admin/platform/subscription/${subscriptionId}`, { status: "CANCELLED" });
      if (response.data?.success) { tToast.success("companyDetails.msg_624b"); void refreshCompanyWorkspace({ background: true }); }
      else toast.error(response.data?.message || "فشل في إلغاء الاشتراك");
    } catch (nextError) { toast.error(extractErrorMessage(nextError, "فشل في إلغاء الاشتراك")); }
  };

  const handleRetryPayment = async (): Promise<void> => {
    const subscriptionId = review?.subscription?.id;
    if (!subscriptionId) { tToast.error("companyDetails.msg_2bcf"); return; }
    try {
      const response: any = await apiClient.post(`/super-admin/platform/retry-failed-payment/${subscriptionId}`);
      if (response.data?.success) { tToast.success("companyDetails.msg_06f8"); void refreshCompanyWorkspace({ background: true }); }
      else toast.error(response.data?.message || "فشلت إعادة محاولة الدفع");
    } catch (nextError) { toast.error(extractErrorMessage(nextError, "فشلت إعادة محاولة الدفع")); }
  };

  const handleTransferOwnership = async (): Promise<void> => {
    if (!companyId || !changeOwnerTargetUserId) return;
    try {
      setTransferLoading(true);
      const response: any = await apiClient.post(`/admin/companies/${companyId}/transfer-ownership`, { targetUserId: changeOwnerTargetUserId }, getCompanyScopedRequestConfig());
      if (response.data?.success) { tToast.success("companyDetails.msg_c925"); setTransferOpen(false); setChangeOwnerTargetUserId(""); void refreshCompanyWorkspace({ background: true }); }
      else toast.error(response.data?.message || "فشل في نقل الملكية");
    } catch (nextError) { toast.error(extractErrorMessage(nextError, "فشل في نقل الملكية")); }
    finally { setTransferLoading(false); }
  };

  const handleLoginAsAdmin = async (): Promise<void> => {
    if (!companyId) return;
    try {
      const response: any = await apiClient.post(`/admin/companies/${companyId}/login-as-admin`, {}, getCompanyScopedRequestConfig());
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

  const scrollToActivationSection = (): void => {
    if (typeof document === "undefined") return;
    document.getElementById("company-activation-center")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openEditModal = (): void => { if (!company) return; syncEditForm(company); setEditErrors({}); setEditOpen(true); };
  const openAddEmployeeModal = (): void => { setAddEmployeeErrors({}); setAddEmployeeForm(INITIAL_EMPLOYEE_FORM); setAddEmployeeOpen(true); };

  const openTopUpModal = (): void => {
    setTopUpErrors({}); setTopUpForm({ amount: "", bonus: "", notes: "" }); setTopUpOpen(true);
  };

  const validateTopUpForm = (): boolean => {
    const next: Record<string, string> = {}; const amount = Number(topUpForm["amount"]); const bonus = topUpForm["bonus"] === "" ? 0 : Number(topUpForm["bonus"]);
    if (!Number.isFinite(amount) || amount <= 0) next["amount"] = "أدخل قيمة شحن صحيحة أكبر من صفر";
    if (!Number.isFinite(bonus) || bonus < 0) next["bonus"] = "البونص يجب أن يكون رقمًا موجبًا أو صفرًا";
    setTopUpErrors(next); return Object.keys(next).length === 0;
  };

  const handleTopUpWallet = async (): Promise<void> => {
    if (!companyId || !validateTopUpForm()) return;
    try {
      setTopUpLoading(true);
      const response: any = await apiClient.post("/admin/wallet/add-funds", { companyId, amount: Number(topUpForm["amount"]), bonus: topUpForm["bonus"] === "" ? 0 : Number(topUpForm["bonus"]), notes: topUpForm["notes"].trim() });
      if (response.data?.success) { tToast.success("companyDetails.msg_0fdd"); setTopUpOpen(false); void refreshCompanyWorkspace({ background: true }); }
      else toast.error(response.data?.message || "فشل في شحن محفظة الشركة");
    } catch (nextError) { toast.error(extractErrorMessage(nextError, "فشل في شحن محفظة الشركة")); }
    finally { setTopUpLoading(false); }
  };

  const openTrialModal = (): void => {
    setTrialDuration(company?.trialModeEnabled ? "" : "14");
    setTrialOpen(true);
  };

  const handleActivateTrial = async (): Promise<void> => {
    if (!companyId) return;
    const days = Number(trialDuration);
    if (!Number.isFinite(days) || days <= 0) { toast.error("حدد مدة الفترة التجريبية بالأيام (رقم أكبر من صفر)"); return; }
    try {
      setTrialSaving(true);
      const response: any = await apiClient.post(`/admin/companies/${companyId}/trial`, { action: "activate", durationDays: days }, getCompanyScopedRequestConfig());
      if (response.data?.success) { toast.success(response.data.message || `تم تفعيل الفترة التجريبية لمدة ${days} يوم`); setTrialOpen(false); void refreshCompanyWorkspace({ background: true }); }
      else toast.error(response.data?.message || "فشل في تفعيل الفترة التجريبية");
    } catch (nextError) { toast.error(extractErrorMessage(nextError, "فشل في تفعيل الفترة التجريبية")); }
    finally { setTrialSaving(false); }
  };

  const handleDeactivateTrial = async (): Promise<void> => {
    if (!companyId) return;
    try {
      setTrialDeactivating(true);
      const response: any = await apiClient.post(`/admin/companies/${companyId}/trial`, { action: "deactivate" }, getCompanyScopedRequestConfig());
      if (response.data?.success) { toast.success(response.data.message || "تم إيقاف الفترة التجريبية وتجميد التطبيقات"); setTrialOpen(false); void refreshCompanyWorkspace({ background: true }); }
      else toast.error(response.data?.message || "فشل في إيقاف الفترة التجريبية");
    } catch (nextError) { toast.error(extractErrorMessage(nextError, "فشل في إيقاف الفترة التجريبية")); }
    finally { setTrialDeactivating(false); }
  };

  const trialActive = Boolean(company?.trialModeEnabled);
  const trialEndsAt = company?.trialEndsAt || null;
  const trialStartedAt = company?.trialStartedAt || null;
  const trialDaysRemaining = useMemo(() => {
    if (!trialActive || !trialEndsAt) return 0;
    const ms = new Date(trialEndsAt).getTime() - Date.now();
    return ms > 0 ? Math.ceil(ms / (24 * 60 * 60 * 1000)) : 0;
  }, [trialActive, trialEndsAt]);

  const refreshReviewAndCatalog = async (): Promise<void> => { await Promise.all([refreshCompanyWorkspace({ background: true }), refreshActivationCatalog()]); };

  // ponytail: resolvedPlanCatalog and currentPlanType removed — plan tiers deleted

  const handleToggleFeature = async (feature: string, enabled: boolean): Promise<void> => {
    if (!companyId) return;
    setToggleFeatureLoading(true);
    try {
      const response: any = await apiClient.put(`/admin/companies/${companyId}/features`, { feature, enabled }, getCompanyScopedRequestConfig());
      if (response.data?.success) {
        toast.success(`تم ${enabled ? "تفعيل" : "إيقاف"} الخاصية بنجاح`);
        await refreshCompanyWorkspace({ background: true });
      } else {
        toast.error(response.data?.message || "فشل في تغيير الخاصية");
      }
    } catch (nextError) {
      toast.error(extractErrorMessage(nextError, "فشل في تغيير الخاصية"));
    } finally {
      setToggleFeatureLoading(false);
    }
  };

  void catalogPlans; void setPlanAction; // suppress unused — ponytail remnants

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

  // ponytail: currentPlanType removed — plan tiers deleted

  // ponytail: handleAssignPlatformPlan removed — no plan tiers to assign

  const handleInstallApp = async (app: any): Promise<void> => {
    if (!companyId || !app?.slug) return;
    try {
      setAppAction(app.slug);
      const response: any = await apiClient.post(`/marketplace/apps/${app.slug}/install`, { pricingModel: getDefaultPricingModel(app) }, getCompanyScopedRequestConfig());
      const autoInstalledRequiredApps: any[] = response.data?.data?.autoInstalledRequiredApps ?? [];
      const autoInstalledNames = autoInstalledRequiredApps.map((requiredApp: any) => requiredApp?.name || requiredApp?.slug);
      toast.success(autoInstalledNames.length > 0 ? `تم تفعيل ${app.name} مع المتطلبات: ${autoInstalledNames.join("، ")}` : `تم تفعيل ${app.name} بنجاح`);
      await refreshReviewAndCatalog();
    } catch (nextError) { toast.error(extractErrorMessage(nextError, "فشل في تفعيل الأداة")); }
    finally { setAppAction(""); }
  };

  const handleSubscribeBundle = async (bundleSlug: string): Promise<void> => {
    if (!companyId || !bundleSlug) return;
    try {
      setBundleAction(bundleSlug);
      const response: any = await apiClient.post(`/marketplace/bundles/${bundleSlug}/subscribe`, {}, getCompanyScopedRequestConfig());
      if (response.data?.success) { toast.success(response.data.message || i18n.t("companyDetails.msg_378c")); await refreshReviewAndCatalog(); }
      else toast.error(response.data?.message || "فشل في الاشتراك في الباقة");
    } catch (nextError) { toast.error(extractErrorMessage(nextError, "فشل في الاشتراك في الباقة")); }
    finally { setBundleAction(""); }
  };

  const handleActivateAllTools = async (): Promise<void> => {
    if (!companyId) return;
    const uninstalledApps = orderedCatalogApps.filter((app) => !app.isInstalled);
    if (!uninstalledApps.length) { tToast.success("companyDetails.msg_1f2a"); return; }
    setInstallAllLoading(true);
    let successCount = 0, failCount = 0;
    const toastId = tToast.loading("companyDetails.loading_activate_8824");
    try {
      for (let index = 0; index < uninstalledApps.length; index += 1) {
        const app = uninstalledApps[index];
        toast.loading(`جاري تفعيل ${app.name}... ${Math.round(((index + 1) / uninstalledApps.length) * 100)}%`, { id: toastId });
        try { await apiClient.post(`/marketplace/apps/${app.slug}/install`, { pricingModel: getDefaultPricingModel(app) }, getCompanyScopedRequestConfig()) as any; successCount += 1; }
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

  const reviewAlerts: ReviewAlert[] = useMemo(() => {
    if (!review) return [];
    const alerts: ReviewAlert[] = [];
    if (review.subscription?.failedAttempts && review.subscription.failedAttempts > 0) alerts.push({ key: "failed-attempts", title: "محاولات دفع فاشلة", description: `يوجد ${formatNumber(review.subscription.failedAttempts)} محاولة فاشلة على اشتراك الشركة وتحتاج مراجعة.`, tone: "border-rose-200 bg-rose-50/90 text-rose-900 dark:border-rose-800/70 dark:bg-rose-950/30 dark:text-rose-100" });
    const daysUntilBilling = getDaysUntil(nextBillingDate);
    if (daysUntilBilling !== null && daysUntilBilling <= 7) alerts.push({ key: "renewal-soon", title: daysUntilBilling < 0 ? "التجديد متأخر" : "التجديد قريب", description: nextBillingDate ? `تاريخ التجديد ${formatDate(nextBillingDate)} (${formatRelativeDateLabel(nextBillingDate)}).` : "لا يوجد تاريخ تجديد محدد حاليًا.", tone: daysUntilBilling < 0 ? "border-rose-200 bg-rose-50/90 text-rose-900 dark:border-rose-800/70 dark:bg-rose-950/30 dark:text-rose-100" : "border-amber-200 bg-amber-50/90 text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/30 dark:text-amber-100" });
    if ((review.wallet?.balance || 0) < (review.subscription?.monthlyFee || 0)) alerts.push({ key: "wallet-balance", title: "رصيد المحفظة أقل من رسوم الاشتراك", description: `الرصيد الحالي ${formatCurrency(review.wallet?.balance, reviewCurrency)} بينما الرسوم ${formatCurrency(review.subscription?.monthlyFee, reviewCurrency)}.`, tone: "border-amber-200 bg-amber-50/90 text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/30 dark:text-amber-100" });
    if ((review.billing?.stats?.overdueInvoices || 0) > 0) alerts.push({ key: "overdue-invoices", title: "فواتير متأخرة", description: `هناك ${formatNumber(review.billing?.stats?.overdueInvoices || 0)} فاتورة متأخرة لهذه الشركة.`, tone: "border-rose-200 bg-rose-50/90 text-rose-900 dark:border-rose-800/70 dark:bg-rose-950/30 dark:text-rose-100" });
    if ((review.billing?.stats?.pendingReceipts || 0) > 0) alerts.push({ key: "pending-receipts", title: "إيصالات بانتظار المراجعة", description: `يوجد ${formatNumber(review.billing?.stats?.pendingReceipts || 0)} إيصال يحتاج اعتمادًا من السوبر أدمن.`, tone: "border-sky-200 bg-sky-50/90 text-sky-900 dark:border-sky-800/70 dark:bg-sky-950/30 dark:text-sky-100" });
    if (highUsageItems.length) alerts.push({ key: "limit-usage", title: "حدود استخدام مرتفعة", description: `هناك ${formatNumber(highUsageItems.length)} مؤشر اقترب من الحد المسموح أو تجاوزه.`, tone: "border-amber-200 bg-amber-50/90 text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/30 dark:text-amber-100" });
    return alerts.slice(0, 4);
  }, [review, reviewCurrency, nextBillingDate, highUsageItems.length]);

  const financialMetrics: Metric[] = review ? [
    { icon: Wallet, label: "رصيد المحفظة", value: formatCurrency(review.wallet?.balance, reviewCurrency), hint: `إجمالي الإيداعات ${formatCurrency(review.wallet?.totalDeposited, reviewCurrency)}`, tone: "border-emerald-200/80 bg-[linear-gradient(135deg,rgba(236,253,245,0.96),rgba(209,250,229,0.78))] text-emerald-900 dark:border-emerald-900/60 dark:bg-[linear-gradient(135deg,rgba(6,78,59,0.52),rgba(4,120,87,0.22))] dark:text-emerald-100" },
    { icon: CalendarClock, label: "التجديد القادم", value: nextBillingDate ? formatDate(nextBillingDate) : "غير متوفر", hint: nextBillingDate ? formatRelativeDateLabel(nextBillingDate) : "لا يوجد موعد محدد", tone: "border-amber-200/80 bg-[linear-gradient(135deg,rgba(255,251,235,0.96),rgba(254,243,199,0.82))] text-amber-900 dark:border-amber-900/60 dark:bg-[linear-gradient(135deg,rgba(120,53,15,0.45),rgba(146,64,14,0.22))] dark:text-amber-100" },
    { icon: BarChart3, label: "استهلاك الشهر", value: formatCurrency(review.usage?.costs?.total, reviewCurrency), hint: `${formatNumber(review.usage?.totalActions)} عملية / ${formatNumber(review.usage?.totalQuantity)} وحدة`, tone: "border-sky-200/80 bg-[linear-gradient(135deg,rgba(239,246,255,0.96),rgba(219,234,254,0.82))] text-sky-900 dark:border-sky-900/60 dark:bg-[linear-gradient(135deg,rgba(7,89,133,0.48),rgba(2,132,199,0.22))] dark:text-sky-100" },
    { icon: Receipt, label: "الفواتير المفتوحة", value: formatNumber(review.billing?.stats?.unpaidInvoices || 0), hint: `المتأخرة ${formatNumber(review.billing?.stats?.overdueInvoices || 0)}`, tone: "border-rose-200/80 bg-[linear-gradient(135deg,rgba(255,241,242,0.96),rgba(254,205,211,0.82))] text-rose-900 dark:border-rose-900/60 dark:bg-[linear-gradient(135deg,rgba(127,29,29,0.42),rgba(190,24,93,0.18))] dark:text-rose-100" },
    { icon: Boxes, label: "الأدوات النشطة", value: formatNumber(review.usage?.activeApps || 0), hint: `فشل مدفوعات ${formatNumber(review.billing?.stats?.failedPayments || 0)}`, tone: "border-violet-200/80 bg-[linear-gradient(135deg,rgba(245,243,255,0.96),rgba(233,213,255,0.8))] text-violet-900 dark:border-violet-900/60 dark:bg-[linear-gradient(135deg,rgba(76,29,149,0.42),rgba(109,40,217,0.2))] dark:text-violet-100" },
  ] : [];

  const detailMetrics: Metric[] = company ? [
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
    orderedCatalogApps, resolvedBundles, appNameBySlug,
    handleInstallApp, handleSubscribeBundle, handleActivateAllTools, refreshActivationCatalog,
    companyUsers, usersLoading, facebookPages, pagesLoading, openAddEmployeeModal,
    editOpen, setEditOpen, editSaving, editForm, setEditForm, editErrors,
    handleSaveCompany, transferOpen, setTransferOpen, transferLoading, changeOwnerTargetUserId, setChangeOwnerTargetUserId,
    handleTransferOwnership, addEmployeeOpen, setAddEmployeeOpen, employeeLoading, addEmployeeForm, setAddEmployeeForm,
    addEmployeeErrors, handleAddEmployee, topUpOpen, setTopUpOpen, topUpLoading, topUpForm, setTopUpForm, topUpErrors,
  topUpAmountPreview, topUpBonusPreview, handleTopUpWallet,
  trialOpen, setTrialOpen, trialDuration, setTrialDuration, trialSaving, trialDeactivating,
  openTrialModal, handleActivateTrial, handleDeactivateTrial,
  trialActive, trialEndsAt, trialStartedAt, trialDaysRemaining,
  handleUpdateUserRole, handleToggleUserStatus, handleDeleteUser,
    deleteConfirmUserId, setDeleteConfirmUserId, deleteUserLoading,
    handleCancelSubscription, handleRetryPayment,
    companyTickets, ticketsLoading,
    companyActivities, activitiesLoading,
    toggleFeatureLoading, handleToggleFeature,
  };
}
