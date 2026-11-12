import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { NavigateFunction } from "react-router-dom";
import { toast } from "sonner";
import i18n from "../../../i18n";
import { tToast } from "../../../utils/i18n-toast";
import type { CompanyData, CompanyReview, CompanyUser, FacebookPage, TicketListItem, ActivityEntry, UnifiedKpiStats } from "./companyDetailsTypes";
import { apiClient } from "../../../services/apiClient";
import { tokenManager } from "../../../utils/tokenManager";
import {
  formatDate,
  formatNumber,
  formatCurrency,
  formatRelativeDateLabel,
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

interface UsersPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
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
  reviewAlerts: ReviewAlert[]; ownerUser: CompanyUser | null;
  refreshCompanyWorkspace: (opts?: { background?: boolean }) => Promise<void>; refreshing: boolean;
  openTopUpModal: () => void; openEditModal: () => void; handleLoginAsAdmin: (reason?: string) => Promise<void>;
  impersonating: boolean; statusSaving: boolean; handleToggleCompanyStatus: (nextIsActive: boolean, reason: string) => Promise<boolean>;
  unifiedKpiStats: UnifiedKpiStats;
  bundleAction: string; appAction: string; installAllLoading: boolean; activationLoading: boolean; activationError: string;
  orderedCatalogApps: any[]; resolvedBundles: any[]; appNameBySlug: Map<string, string>;
  handleInstallApp: (app: any) => Promise<void>; handleSubscribeBundle: (bundleSlug: string) => Promise<void>;
  handleActivateAllTools: (reason?: string) => Promise<void>; refreshActivationCatalog: () => Promise<void>;
  companyUsers: CompanyUser[]; usersLoading: boolean; usersPagination: UsersPagination; loadingMoreUsers: boolean; handleLoadMoreUsers: () => Promise<void>;
  facebookPages: FacebookPage[]; pagesLoading: boolean; openAddEmployeeModal: () => void;
  editOpen: boolean; setEditOpen: Dispatch<SetStateAction<boolean>>; editSaving: boolean; editForm: EditForm; setEditForm: Dispatch<SetStateAction<EditForm>>; editErrors: any;
  handleSaveCompany: (statusChangeReason?: string) => Promise<void>; transferOpen: boolean; setTransferOpen: Dispatch<SetStateAction<boolean>>; transferLoading: boolean;
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
  const [recordedActivities, setRecordedActivities] = useState<ActivityEntry[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersPagination, setUsersPagination] = useState<UsersPagination>({
    page: 1,
    limit: 100,
    total: 0,
    totalPages: 1,
    hasNext: false,
  });
  const [loadingMoreUsers, setLoadingMoreUsers] = useState(false);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [impersonating, setImpersonating] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
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
  const [catalogApps, setCatalogApps] = useState<any[]>([]);
  const [catalogBundles, setCatalogBundles] = useState<any[]>([]);
  const [bundleAction, setBundleAction] = useState("");
  const [appAction, setAppAction] = useState("");
  const [installAllLoading, setInstallAllLoading] = useState(false);
  const [toggleFeatureLoading, setToggleFeatureLoading] = useState(false);

  const ownerUser = useMemo(
    () => companyUsers.find((user) => user.role === "OWNER") || companyUsers.find((user) => user.role === "COMPANY_ADMIN") || null,
    [companyUsers],
  );

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
        apiClient.get(`/admin/companies/${companyId}/users`, getCompanyScopedRequestConfig({ params: { page: 1, limit: 100, sortBy: "createdAt", sortOrder: "desc" } })),
        apiClient.get(`/admin/companies/${companyId}/facebook-pages`, getCompanyScopedRequestConfig()),
        apiClient.get(`/support/admin/tickets`, getCompanyScopedRequestConfig({ params: { companyId, limit: 20 } })),
        apiClient.get(`/activity/company/activities`, getCompanyScopedRequestConfig({ params: { companyId, limit: 50 } })),
      ]);
      const detailData: any = detailResult.status === "fulfilled" ? detailResult.value.data : null;
      const usersData: any = usersResult.status === "fulfilled" ? usersResult.value.data : null;
      const pagesData: any = pagesResult.status === "fulfilled" ? pagesResult.value.data : null;
      const ticketsData: any = ticketsResult.status === "fulfilled" ? ticketsResult.value.data : null;
      const activitiesData: any = activitiesResult.status === "fulfilled" ? activitiesResult.value.data : null;
      if (!detailData?.success) {
        setCompany(null); setReview(null); setCompanyUsers([]); setFacebookPages([]);
        setUsersPagination({ page: 1, limit: 100, total: 0, totalPages: 1, hasNext: false });
        setError("تعذر تحميل بيانات الشركة"); return;
      }
      let nextCompany = normalizeCompanyData(detailData.data?.company) as CompanyData | null;
      const nextReview: CompanyReview | null = detailData.data?.review || null;
      if (usersData?.success) {
        const fetchedUsers: CompanyUser[] = usersData.data?.users || [];
        setCompanyUsers(fetchedUsers);
        const pag = usersData.data?.pagination;
        const limitNum = pag?.limit ?? 100;
        const totalNum = pag?.total ?? nextReview?.userStats?.total ?? fetchedUsers.length;
        setUsersPagination({
          page: pag?.page ?? 1,
          limit: limitNum,
          total: totalNum,
          totalPages: pag?.totalPages ?? Math.max(1, Math.ceil(totalNum / limitNum)),
          hasNext:
            typeof pag?.hasNext === "boolean"
              ? pag.hasNext
              : fetchedUsers.length >= limitNum && totalNum > fetchedUsers.length,
        });
      } else {
        setCompanyUsers([]);
        setUsersPagination({ page: 1, limit: 100, total: 0, totalPages: 1, hasNext: false });
        tToast.error("companyDetails.unable_load_1117");
      }
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

  const handleLoadMoreUsers = async (): Promise<void> => {
    if (!companyId || loadingMoreUsers || !usersPagination.hasNext) return;
    const nextPage = usersPagination.page + 1;
    const limitNum = usersPagination.limit || 100;
    try {
      setLoadingMoreUsers(true);
      const response: any = await apiClient.get(
        `/admin/companies/${companyId}/users`,
        getCompanyScopedRequestConfig({
          params: { page: nextPage, limit: limitNum, sortBy: "createdAt", sortOrder: "desc" },
        }),
      );
      if (response.data?.success) {
        const nextUsers: CompanyUser[] = response.data?.data?.users || [];
        const pag = response.data?.data?.pagination;
        const seen = new Set(companyUsers.map((u) => u.id));
        const uniqueNextUsers = nextUsers.filter((u) => !seen.has(u.id));
        const mergedUsers = [...companyUsers, ...uniqueNextUsers];
        setCompanyUsers(mergedUsers);
        const resolvedLimit = pag?.limit ?? usersPagination.limit;
        const resolvedTotal = pag?.total ?? usersPagination.total;
        const resolvedHasNext =
          typeof pag?.hasNext === "boolean"
            ? pag.hasNext
            : nextUsers.length >= resolvedLimit && resolvedTotal > mergedUsers.length;
        setUsersPagination((prev) => ({
          page: pag?.page ?? nextPage,
          limit: resolvedLimit,
          total: resolvedTotal,
          totalPages: pag?.totalPages ?? prev.totalPages,
          hasNext: resolvedHasNext,
        }));
      } else {
        toast.error(response.data?.message || "تعذر تحميل المزيد من الأعضاء");
      }
    } catch (nextError) {
      toast.error(extractErrorMessage(nextError, "تعذر تحميل المزيد من الأعضاء"));
    } finally {
      setLoadingMoreUsers(false);
    }
  };

  const refreshActivationCatalog = async (): Promise<void> => {
    if (!companyId) { setCatalogApps([]); setCatalogBundles([]); setActivationLoading(false); setActivationError(""); return; }
    setActivationLoading(true); setActivationError("");
    try {
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
      setCatalogApps([]); setCatalogBundles([]);
      setActivationError(extractErrorMessage(nextError, "تعذر تحميل خيارات التفعيل والاشتراكات"));
    } finally { setActivationLoading(false); }
  };

  useEffect(() => {
    setRecordedActivities([]);
    void refreshCompanyWorkspace();
    void refreshActivationCatalog();
  }, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  const validateEditForm = (): boolean => {
    const next: Record<string, string> = {};
    if (!editForm["name"].trim()) next["name"] = "اسم الشركة مطلوب";
    if (!editForm["email"].trim()) next["email"] = "البريد الإلكتروني مطلوب";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm["email"])) next["email"] = "صيغة البريد الإلكتروني غير صحيحة";
    if (!editForm["currency"]) next["currency"] = "العملة مطلوبة";
    setEditErrors(next); return Object.keys(next).length === 0;
  };

  const handleSaveCompany = async (statusChangeReason?: string): Promise<void> => {
    if (!companyId || !validateEditForm()) return;
    const statusChanged = Boolean(company && editForm["isActive"] !== company.isActive);
    const trimmedStatusReason = statusChangeReason?.trim() || "";
    if (statusChanged && !trimmedStatusReason) {
      setEditErrors((prev: Record<string, string>) => ({ ...prev, statusReason: "يجب كتابة سبب تغيير حالة الشركة" }));
      toast.error("يجب كتابة سبب تغيير حالة الشركة");
      return;
    }
    try {
      setEditSaving(true);
      const response: any = await apiClient.put(`/admin/companies/${companyId}`, {
        name: editForm["name"].trim(), email: editForm["email"].trim(), phone: editForm["phone"].trim(),
        website: editForm["website"].trim(), currency: editForm["currency"], isActive: editForm["isActive"],
        notes: editForm["notes"].trim(),
        businessSpecialtyId: editForm["businessSpecialtyId"] === "none" ? null : (editForm["businessSpecialtyId"] || null),
        ...(statusChanged ? { reason: trimmedStatusReason } : {}),
      }, getCompanyScopedRequestConfig());
      if (response.data?.success) {
        if (statusChanged) {
          setRecordedActivities((prev) => [
            {
              id: `local-status-${Date.now()}`,
              category: "COMPANY",
              action: editForm["isActive"] ? "ACTIVATE_COMPANY" : "SUSPEND_COMPANY",
              description: editForm["isActive"] ? "تفعيل نشاط الشركة" : "إيقاف نشاط الشركة",
              severity: editForm["isActive"] ? "MEDIUM" : "HIGH",
              createdAt: new Date().toISOString(),
              metadata: JSON.stringify({ reason: trimmedStatusReason, isActive: editForm["isActive"] }),
            },
            ...prev,
          ]);
        }
        tToast.success("companyDetails.success_update_a26a"); setEditOpen(false); await refreshCompanyWorkspace({ background: true });
      }
      else toast.error(response.data?.message || "فشل في تحديث الشركة");
    } catch (nextError) { toast.error(extractErrorMessage(nextError, "فشل في تحديث الشركة")); }
    finally { setEditSaving(false); }
  };

  const handleToggleCompanyStatus = async (nextIsActive: boolean, reason: string): Promise<boolean> => {
    if (!companyId || !company) return false;
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      toast.error("يجب إدخال سبب واضح لتنفيذ العملية");
      return false;
    }
    try {
      setStatusSaving(true);
      const response: any = await apiClient.put(
        `/admin/companies/${companyId}`,
        {
          name: company.name,
          email: company.email,
          phone: company.phone || "",
          website: company.website || "",
          currency: company.currency || "EGP",
          isActive: nextIsActive,
          notes: (company as any)["notes"] || "",
          businessSpecialtyId: company.businessSpecialtyId || company.businessSpecialty?.id || null,
          reason: trimmedReason,
        },
        getCompanyScopedRequestConfig(),
      );
      if (response.data?.success) {
        setRecordedActivities((prev) => [
          {
            id: `local-status-${Date.now()}`,
            category: "COMPANY",
            action: nextIsActive ? "ACTIVATE_COMPANY" : "SUSPEND_COMPANY",
            description: nextIsActive ? "تفعيل نشاط الشركة" : "إيقاف نشاط الشركة",
            severity: nextIsActive ? "MEDIUM" : "HIGH",
            createdAt: new Date().toISOString(),
            metadata: JSON.stringify({ reason: trimmedReason, isActive: nextIsActive }),
          },
          ...prev,
        ]);
        toast.success(nextIsActive ? "تم تفعيل نشاط الشركة بنجاح" : "تم إيقاف نشاط الشركة بنجاح");
        await refreshCompanyWorkspace({ background: true });
        return true;
      }
      toast.error(response.data?.message || "فشل في تحديث حالة الشركة");
      return false;
    } catch (nextError) {
      toast.error(extractErrorMessage(nextError, "فشل في تحديث حالة الشركة"));
      return false;
    } finally {
      setStatusSaving(false);
    }
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

  const handleLoginAsAdmin = async (reason?: string): Promise<void> => {
    if (!companyId) return;
    try {
      setImpersonating(true);
      const response: any = await apiClient.post(
        `/admin/companies/${companyId}/login-as-admin`,
        { reason: reason || "" },
        getCompanyScopedRequestConfig()
      );
      if (response.data?.success) {
        const currentSuperToken = tokenManager.getAccessToken();
        if (currentSuperToken) localStorage.setItem("superAuth", currentSuperToken);
        const currentUser = localStorage.getItem("user");
        if (currentUser) localStorage.setItem("superUser", currentUser);
        tokenManager.setAccessToken(response.data.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.data.user));
        window.location.href = "/company-dashboard";
        return;
      }
      toast.error(response.data?.message || "فشل في تسجيل الدخول كمدير الشركة");
    } catch (nextError) {
      toast.error(extractErrorMessage(nextError, "فشل في تسجيل الدخول كمدير الشركة"));
    } finally {
      setImpersonating(false);
    }
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

  const handleActivateAllTools = async (reason?: string): Promise<void> => {
    if (!companyId) return;
    const trimmedReason = reason?.trim() || "";
    if (!trimmedReason) {
      toast.error("يجب كتابة سبب التفعيل الجماعي قبل التنفيذ");
      return;
    }
    const uninstalledApps = orderedCatalogApps.filter((app) => !app.isInstalled);
    if (!uninstalledApps.length) { tToast.success("companyDetails.msg_1f2a"); return; }
    setInstallAllLoading(true);
    let successCount = 0, failCount = 0;
    const succeededSlugs: string[] = [];
    const toastId = tToast.loading("companyDetails.loading_activate_8824");
    try {
      for (let index = 0; index < uninstalledApps.length; index += 1) {
        const app = uninstalledApps[index];
        toast.loading(`جاري تفعيل ${app.name}... ${Math.round(((index + 1) / uninstalledApps.length) * 100)}%`, { id: toastId });
        try {
          await apiClient.post(
            `/marketplace/apps/${app.slug}/install`,
            { pricingModel: getDefaultPricingModel(app), reason: trimmedReason },
            getCompanyScopedRequestConfig(),
          ) as any;
          successCount += 1;
          succeededSlugs.push(app.slug);
        }
        catch { failCount += 1; }
      }
      if (successCount > 0) {
        setRecordedActivities((prev) => [
          {
            id: `local-bulk-activate-${Date.now()}`,
            category: "MARKETPLACE",
            action: "BULK_ACTIVATE_APPS",
            description: `تفعيل جماعي للأدوات (${successCount} أداة)`,
            severity: "MEDIUM",
            createdAt: new Date().toISOString(),
            metadata: JSON.stringify({
              reason: trimmedReason,
              count: successCount,
              apps: succeededSlugs,
            }),
          },
          ...prev,
        ]);
      }
      if (successCount === 0 && failCount > 0) {
        toast.error(`تعذر تفعيل ${failCount} أداة للشركة`, { id: toastId });
      } else {
        toast.success(failCount === 0 ? `تم تفعيل ${successCount} أداة للشركة بنجاح` : `تم تفعيل ${successCount} أداة، وتعذر تفعيل ${failCount} أداة`, { id: toastId });
      }
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

  const unifiedKpiStats = useMemo<UnifiedKpiStats>(() => {
    const totalUsers = review?.userStats?.total ?? company?._count?.users ?? companyUsers.length;
    const activeUsers = review?.userStats?.active ?? companyUsers.filter((u) => u.isActive).length;
    const inactiveUsers = Math.max(0, totalUsers - activeUsers);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
      },
      customers: company?._count?.customers || 0,
      ordersThisMonth: (review?.limits?.entries?.find((e) => e.key === "orders")?.current) || 0,
      products: company?._count?.products || 0,
      facebookPages: company?._count?.facebookPages || facebookPages.length || 0,
      walletBalance: review?.wallet?.balance || 0,
      monthlyFee: review?.subscription?.monthlyFee || 0,
      subscriptionStatus: review?.subscription?.status || "ACTIVE",
      activeApps: review?.usage?.activeApps || 0,
    };
  }, [review, company, companyUsers, facebookPages.length]);

  const mergedCompanyActivities = useMemo(() => {
    if (!recordedActivities.length) return companyActivities;
    const seen = new Set(recordedActivities.map((item) => item.id));
    return [...recordedActivities, ...companyActivities.filter((item) => !seen.has(item.id))];
  }, [recordedActivities, companyActivities]);

  return {
    navigate, isMobile, company, loading, error, review, reviewCurrency, limitEntries, nextBillingDate,
    reviewAlerts, ownerUser,
    refreshCompanyWorkspace, refreshing,
    openTopUpModal, openEditModal, handleLoginAsAdmin, impersonating, statusSaving, handleToggleCompanyStatus, unifiedKpiStats,
    bundleAction, appAction, installAllLoading, activationLoading, activationError,
    orderedCatalogApps, resolvedBundles, appNameBySlug,
    handleInstallApp, handleSubscribeBundle, handleActivateAllTools, refreshActivationCatalog,
    companyUsers, usersLoading, usersPagination, loadingMoreUsers, handleLoadMoreUsers,
    facebookPages, pagesLoading, openAddEmployeeModal,
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
    companyTickets, ticketsLoading,
    companyActivities: mergedCompanyActivities, activitiesLoading,
    toggleFeatureLoading, handleToggleFeature,
  };
}
