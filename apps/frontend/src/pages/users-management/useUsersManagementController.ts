import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import i18n from "../../i18n";
import { tToast } from "../../utils/i18n-toast";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/useAuthSimple";
import { getProtectedUserActionMessage } from "../../utils/usersManagementGuards";
import tokenManager from "../../utils/tokenManager";
import { buildApiUrl } from "../../utils/urlHelper";
import { saveDefaultPagePreference } from "../../utils/postAuthRouting";
import { copyToClipboard } from "../../utils/clipboard";
import { APP_REGISTRY } from "../../config/appRegistry";
import {
  type RoleRecord,
  type UserRecord,
  type InvitationRecord,
  type FiltersState,
  type UserFormState,
  type InviteFormState,
  type UserFormErrors,
  type InviteFormErrors,
  type PendingAction,
  type ApiEnvelope,
  createInitialUserForm,
  createInitialInviteForm,
  getErrorMessage,
} from "./types";

export type UsersTabValue = "all" | "active" | "never_logged_in" | "inactive" | "invitations";

export function useUsersManagementController() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const companyApps = useMemo(() => {
    const activeApps = (user as { company?: { activeApps?: string[] } | null } | null)?.company?.activeApps;
    if (!Array.isArray(activeApps) || activeApps.length === 0) return [];
    const seen = new Set<string>();
    const result: Array<{ slug: string; label: string }> = [];
    for (const slug of activeApps) {
      const normalized = slug.trim().toLowerCase();
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      const registryApp = APP_REGISTRY.find((app) =>
        app.requiredApps?.some((r) => r.toLowerCase() === normalized),
      );
      if (registryApp) {
        result.push({
          slug: normalized,
          label: t?.(registryApp.nameKey) ?? registryApp.nameKey,
        });
      } else {
        result.push({ slug: normalized, label: normalized });
      }
    }
    return result;
  }, [user, t]);

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<RoleRecord>({});
  const [invitations, setInvitations] = useState<InvitationRecord[]>([]);
  const [departments, setDepartments] = useState<
    Array<{ id: string; name: string; color?: string | null }>
  >([]);
  const [positions, setPositions] = useState<Array<{ id: string; title: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<FiltersState>({
    search: "",
    role: "",
    isActive: "",
    employeeStatus: "",
  });
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<UsersTabValue>("all");
  const [statusCounts, setStatusCounts] = useState<{
    total: number;
    active: number;
    neverLoggedIn: number;
    inactive: number;
  }>({
    total: 0,
    active: 0,
    neverLoggedIn: 0,
    inactive: 0,
  });
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit" | null>(null);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [detailsUser, setDetailsUser] = useState<UserRecord | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [employeeInviteModalOpen, setEmployeeInviteModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [userForm, setUserForm] = useState<UserFormState>(createInitialUserForm);
  const [inviteForm, setInviteForm] = useState<InviteFormState>(createInitialInviteForm);
  const [formErrors, setFormErrors] = useState<UserFormErrors>({});
  const [inviteErrors, setInviteErrors] = useState<InviteFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const mountedRef = useRef(true);
  const usersRequestRef = useRef(0);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const requestApi = useCallback(
    async function requestApi<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
      const headers = tokenManager.createAuthHeaders({ "Content-Type": "application/json" });
      const response = await fetch(buildApiUrl(path), {
        ...init,
        headers: {
          ...headers,
          ...(init?.headers ?? {}),
        },
      });

      let payload: ApiEnvelope<T> = {};
      try {
        payload = (await response.json()) as ApiEnvelope<T>;
      } catch {
        payload = {};
      }

      if (!response.ok) {
        throw new Error(payload.message || `HTTP ${response.status}`);
      }

      return payload;
    },
    [],
  );

  const fetchUsers = useCallback(async () => {
    if (!user?.companyId) return;

    const requestId = usersRequestRef.current + 1;
    usersRequestRef.current = requestId;

    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (filters.search.trim()) queryParams.set("search", filters.search.trim());
      if (filters.role) queryParams.set("role", filters.role);
      if (filters.isActive) queryParams.set("isActive", filters.isActive);
      if (filters.employeeStatus) queryParams.set("employeeStatus", filters.employeeStatus);

      const payload = await requestApi<{
        users: UserRecord[];
        pagination?: { totalPages?: number; total?: number };
        counts?: { total: number; active: number; neverLoggedIn?: number; inactive: number };
      }>(`companies/${user.companyId}/users?${queryParams.toString()}`);

      if (!mountedRef.current || requestId !== usersRequestRef.current) return;

      if (payload.success && payload.data) {
        setUsers(payload.data.users || []);
        setTotalPages(payload.data.pagination?.totalPages || 0);
        setTotalCount(payload.data.pagination?.total || 0);
        if (payload.data.counts) {
          setStatusCounts({
            total: payload.data.counts.total ?? 0,
            active: payload.data.counts.active ?? 0,
            neverLoggedIn: payload.data.counts.neverLoggedIn ?? 0,
            inactive: payload.data.counts.inactive ?? 0,
          });
        }
        setError(null);
      } else {
        setUsers([]);
        setTotalPages(0);
        setTotalCount(0);
        setError(payload.message || t("users.fetchError"));
      }
    } catch (fetchError: unknown) {
      if (!mountedRef.current || requestId !== usersRequestRef.current) return;
      setUsers([]);
      setTotalPages(0);
      setTotalCount(0);
      setError(getErrorMessage(fetchError, t("users.fetchDataError")));
    } finally {
      if (mountedRef.current && requestId === usersRequestRef.current) {
        setLoading(false);
      }
    }
  }, [filters.employeeStatus, filters.isActive, filters.role, filters.search, limit, page, requestApi, t, user?.companyId]);

  const fetchRoles = useCallback(async () => {
    if (!user?.companyId) return;
    try {
      const payload = await requestApi<RoleRecord>(`companies/${user.companyId}/roles`);
      if (payload.success && payload.data) {
        setRoles(payload.data);
      }
    } catch (fetchError: unknown) {
      console.error("Failed to fetch roles", fetchError);
    }
  }, [requestApi, user?.companyId]);

  const fetchInvitations = useCallback(async () => {
    if (!user?.companyId) return;
    try {
      setInvitationsLoading(true);
      const payload = await requestApi<{ invitations?: InvitationRecord[] }>(`companies/${user.companyId}/invitations`);
      if (payload.success) {
        setInvitations(payload.data?.invitations || []);
      }
    } catch (fetchError: unknown) {
      console.error("Failed to fetch invitations", fetchError);
    } finally {
      setInvitationsLoading(false);
    }
  }, [requestApi, user?.companyId]);

  const fetchDepartments = useCallback(async () => {
    try {
      const payload = await requestApi<never>("hr/departments");
      if (payload.success) {
        setDepartments(payload.departments || []);
      }
    } catch (fetchError: unknown) {
      console.error("Failed to fetch departments", fetchError);
    }
  }, [requestApi]);

  const fetchPositions = useCallback(async () => {
    try {
      const payload = await requestApi<never>("hr/positions");
      if (payload.success) {
        setPositions(payload.positions || []);
      }
    } catch (fetchError: unknown) {
      console.error("Failed to fetch positions", fetchError);
    }
  }, [requestApi]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    void fetchRoles();
    void fetchInvitations();
    void fetchDepartments();
    void fetchPositions();
  }, [fetchDepartments, fetchInvitations, fetchPositions, fetchRoles]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextSearch = searchInput.trim();
      setFilters((current) =>
        current.search === nextSearch ? current : { ...current, search: nextSearch },
      );
      setPage(1);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setSelectedUsers((current) => {
      if (current.length === 0) return current;
      const next = current.filter((id) => users.some((entry) => entry.id === id));
      if (next.length === current.length && next.every((id, idx) => id === current[idx])) {
        return current;
      }
      return next;
    });
  }, [users]);

  const isAllSelected = users.length > 0 && selectedUsers.length === users.length;
  const isSomeSelected = selectedUsers.length > 0 && selectedUsers.length < users.length;

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    );
  };

  const handleToggleSelectAll = () => {
    setSelectedUsers((current) => (current.length === users.length ? [] : users.map((u) => u.id)));
  };

  const getRoleDisplayName = useCallback(
    (role: string, userItem?: UserRecord) => {
      if (userItem?.roleName) return userItem.roleName;
      return roles[role]?.name || role;
    },
    [roles],
  );

  const getSelectionGuardMessage = useCallback(
    (action: "delete" | "deactivate") =>
      getProtectedUserActionMessage({
        users,
        targetedUserIds: selectedUsers,
        currentUserId: user?.id,
        action,
      }),
    [selectedUsers, user?.id, users],
  );

  const openAddUser = () => {
    setUserForm(createInitialUserForm());
    setFormErrors({});
    setEditingUser(null);
    setShowPassword(false);
    setEditorMode("create");
  };

  const openInviteDialog = () => {
    setInviteForm(createInitialInviteForm());
    setInviteErrors({});
    setInviteDialogOpen(true);
  };

  const openEditUser = async (targetUser: UserRecord) => {
    setEditingUser(targetUser);
    let defaultPage = "/apps";
    try {
      const freshPayload = await requestApi<any>(`companies/${user?.companyId}/users/${targetUser.id}`);
      if (freshPayload.success && freshPayload.data) {
        targetUser = freshPayload.data;
        setEditingUser(targetUser);
        defaultPage = freshPayload.data.defaultPage || "/apps";
      }
    } catch {
      // Fall back to original user object
    }
    const resolvedRole = targetUser.roleId
      ? (Object.entries(roles).find(([, r]) => r.id === targetUser.roleId)?.[0] || targetUser.role)
      : targetUser.role;

    setUserForm({
      firstName: targetUser.firstName || "",
      lastName: targetUser.lastName || "",
      email: targetUser.email || "",
      password: "",
      phone: targetUser.phone || "",
      role: resolvedRole || "AGENT",
      isActive: targetUser.isActive ?? true,
      departmentId: targetUser.employee?.department?.id || "",
      positionId: targetUser.employee?.position?.id || "",
      hireDate: targetUser.employee?.hireDate
        ? new Date(targetUser.employee.hireDate).toISOString().split("T")[0] || ""
        : createInitialUserForm().hireDate,
      contractType: targetUser.employee?.contractType || "FULL_TIME",
      baseSalary:
        targetUser.employee?.baseSalary !== undefined && targetUser.employee?.baseSalary !== null
          ? String(targetUser.employee.baseSalary)
          : "",
      defaultPage,
      assignedApps: Array.isArray(targetUser.assignedApps) ? targetUser.assignedApps : [],
    });
    setFormErrors({});
    setShowPassword(false);
    setEditorMode("edit");
  };

  const closeEditor = () => {
    setEditorMode(null);
    setEditingUser(null);
    setUserForm(createInitialUserForm());
    setFormErrors({});
    setShowPassword(false);
  };

  const validateUserForm = () => {
    const nextErrors: UserFormErrors = {};
    if (!userForm.firstName.trim()) nextErrors.firstName = String(t("users.form.firstNameRequired"));
    if (!userForm.lastName.trim()) nextErrors.lastName = String(t("users.form.lastNameRequired"));
    if (!userForm.email.trim()) {
      nextErrors.email = String(t("users.form.emailRequired"));
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userForm.email.trim())) {
      nextErrors.email = String(t("users.form.emailInvalid"));
    }
    if (!userForm.role.trim()) nextErrors.role = String(t("users.form.roleRequired"));
    if (editorMode !== "edit" && !userForm.password.trim()) {
      nextErrors.password = String(t("users.form.passwordRequired"));
    } else if (userForm.password && userForm.password.length < 6) {
      nextErrors.password = String(t("users.form.passwordMinLength"));
    }
    if (userForm.phone.trim()) {
      const phoneRegex = /^[+]?[0-9\s\-()]{7,20}$/;
      if (!phoneRegex.test(userForm.phone.trim())) {
        nextErrors.phone = String(t("users.form.phoneInvalid"));
      }
    }
    if (userForm.baseSalary.trim()) {
      const salary = Number(userForm.baseSalary);
      if (Number.isNaN(salary) || salary < 0) {
        nextErrors.baseSalary = String(t("users.form.salaryInvalid"));
      }
    }
    if (editorMode === "edit" && editingUser && editingUser.id === user?.id && userForm.isActive === false) {
      nextErrors.isActive = String(t("users.form.cannotDeactivateSelf"));
    }
    if (editorMode === "edit" && editingUser && userForm.isActive === false && !nextErrors.isActive) {
      const guardMessage = getProtectedUserActionMessage({
        users,
        targetedUserIds: [editingUser.id],
        action: "deactivate",
      });
      if (guardMessage) {
        nextErrors.isActive = guardMessage;
      }
    }
    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateInviteForm = () => {
    const nextErrors: InviteFormErrors = {};
    if (!inviteForm.firstName.trim()) nextErrors.firstName = String(t("users.form.firstNameRequired"));
    if (!inviteForm.lastName.trim()) nextErrors.lastName = String(t("users.form.lastNameRequired"));
    if (!inviteForm.email.trim()) {
      nextErrors.email = String(t("users.form.emailRequired"));
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteForm.email.trim())) {
      nextErrors.email = String(t("users.form.emailInvalid"));
    }
    if (!inviteForm.role.trim()) nextErrors.role = String(t("users.form.roleRequired"));
    setInviteErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const updateUserForm = (field: keyof UserFormState, value: string | boolean | string[]) => {
    setUserForm((current) => {
      if (current[field] === value) return current;
      if (Array.isArray(current[field]) && Array.isArray(value)) {
        if (JSON.stringify(current[field]) === JSON.stringify(value)) return current;
      }
      return { ...current, [field]: value };
    });
    setFormErrors((current) => {
      if (!current[field]) return current;
      const nextErrors = { ...current };
      delete nextErrors[field];
      return nextErrors;
    });
  };

  const saveUser = async () => {
    if (!user?.companyId || !validateUserForm()) return;

    try {
      setSubmitting(true);
      const isEditMode = editorMode === "edit" && editingUser;
      const payload: Record<string, unknown> = {
        firstName: userForm.firstName.trim(),
        lastName: userForm.lastName.trim(),
        email: userForm.email.trim(),
        phone: userForm.phone.trim(),
        role: userForm.role,
        isActive: userForm.isActive,
        departmentId: userForm.departmentId || undefined,
        positionId: userForm.positionId || undefined,
        hireDate: userForm.hireDate || undefined,
        contractType: userForm.contractType,
        baseSalary: userForm.baseSalary || undefined,
        ...(isEditMode && { settings: { defaultPage: userForm.defaultPage, assignedApps: userForm.assignedApps } }),
      };

      if (userForm.password.trim()) {
        payload["password"] = userForm.password;
      }

      const path = isEditMode
        ? `companies/${user.companyId}/users/${editingUser.id}`
        : `companies/${user.companyId}/users`;
      const response = await requestApi<never>(path, {
        method: isEditMode ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });

      if (!response.success) {
        throw new Error(response.message || String(t("users.saveError")));
      }

      if (isEditMode && editingUser?.id === user?.id && userForm.defaultPage) {
        try {
          saveDefaultPagePreference(user, userForm.defaultPage);
        } catch {
          // ignore
        }
      }

      toast.success(isEditMode ? "تم تحديث المستخدم بنجاح" : "تم إنشاء المستخدم بنجاح");
      closeEditor();
      await fetchUsers();
      setError(null);
    } catch (saveError: unknown) {
      const nextError = getErrorMessage(saveError, String(t("users.saveError")));
      setError(nextError);
      toast.error(nextError);
    } finally {
      setSubmitting(false);
    }
  };

  const sendInvitation = async () => {
    if (!user?.companyId || !validateInviteForm()) return;

    try {
      setInviteSubmitting(true);
      const response = await requestApi<{ invitationLink?: string }>(`companies/${user.companyId}/invitations`, {
        method: "POST",
        body: JSON.stringify({
          firstName: inviteForm.firstName.trim(),
          lastName: inviteForm.lastName.trim(),
          email: inviteForm.email.trim(),
          role: inviteForm.role,
        }),
      });

      if (!response.success) {
        throw new Error(response.message || String(t("users.inviteError")));
      }

      if (response.data?.invitationLink) {
        void copyToClipboard(response.data.invitationLink);
      }
      toast.success(response.message || "تم إرسال الدعوة بنجاح");
      setInviteDialogOpen(false);
      setInviteForm(createInitialInviteForm());
      setInviteErrors({});
      setError(null);
      await fetchInvitations();
    } catch (inviteError: unknown) {
      const nextError = getErrorMessage(inviteError, String(t("users.inviteError")));
      setError(nextError);
      toast.error(nextError);
    } finally {
      setInviteSubmitting(false);
    }
  };

  const applySearch = () => {
    setFilters((current) => ({ ...current, search: searchInput.trim() }));
    setPage(1);
    setSelectedUsers([]);
  };

  const handleTabChange = (nextValue: string) => {
    const nextTab = nextValue as UsersTabValue;
    setActiveTab(nextTab);
    setSelectedUsers([]);

    if (nextTab === "invitations") return;

    let nextIsActive = "";
    if (nextTab === "active") nextIsActive = "active";
    else if (nextTab === "never_logged_in") nextIsActive = "never_logged_in";
    else if (nextTab === "inactive") nextIsActive = "inactive";

    setFilters((current) => {
      if (current.isActive === nextIsActive) return current;
      return { ...current, isActive: nextIsActive };
    });
    setPage(1);
  };

  const updateFilter = (field: keyof FiltersState, value: string) => {
    setFilters((current) => ({ ...current, [field]: value }));
    setPage(1);
    setSelectedUsers([]);
    if (field === "isActive") {
      if (value === "active" || value === "true") setActiveTab("active");
      else if (value === "never_logged_in") setActiveTab("never_logged_in");
      else if (value === "inactive" || value === "false") setActiveTab("inactive");
      else if (activeTab !== "invitations") setActiveTab("all");
    }
  };

  const clearFilters = () => {
    setSearchInput("");
    setFilters({ search: "", role: "", isActive: "", employeeStatus: "" });
    setPage(1);
    setSelectedUsers([]);
    if (activeTab !== "invitations") setActiveTab("all");
  };

  const copyInvitationLink = async (invitation: InvitationRecord) => {
    try {
      const inviteUrl = `${window.location.origin}/auth/accept-invitation?token=${invitation.token}`;
      const success = await copyToClipboard(inviteUrl);
      if (success) {
        toast.success(t("users.linkCopied") || "تم نسخ رابط الدعوة");
      } else {
        toast.error("فشل نسخ رابط الدعوة");
      }
    } catch {
      tToast.error("UsersManagement.msg_8387");
    }
  };

  const resendInvitation = async (invitationId: string) => {
    if (!user?.companyId) return;

    try {
      const response = await requestApi<never>(
        `companies/${user.companyId}/invitations/${invitationId}`,
        { method: "POST" },
      );
      if (!response.success) {
        throw new Error(response.message || "فشل إعادة إرسال الدعوة");
      }
      tToast.success("UsersManagement.success_send_59c9");
      await fetchInvitations();
    } catch (resendError: unknown) {
      toast.error(getErrorMessage(resendError, i18n.t("UsersManagement.error_error_c008")));
    }
  };

  const exportCurrentUsers = () => {
    const headers = [
      "الاسم الأول",
      "الاسم الأخير",
      "البريد الإلكتروني",
      "الهاتف",
      "الدور",
      "الحالة",
    ];
    const rows = users.map((entry) => [
      entry.firstName,
      entry.lastName,
      entry.email,
      entry.phone || "",
      getRoleDisplayName(entry.role, entry),
      entry.isActive ? "نشط" : "غير نشط",
    ]);
    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `users_${new Date().toISOString().split("T")[0] || "export"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    tToast.success("UsersManagement.msg_fc1e");
  };

  const handleBulkToggle = async (nextValue: boolean) => {
    if (!user?.companyId || selectedUsers.length === 0) return;

    const guardMessage = !nextValue ? getSelectionGuardMessage("deactivate") : null;
    if (guardMessage) {
      toast.error(guardMessage);
      return;
    }

    try {
      await Promise.all(
        selectedUsers.map(async (userId) => {
          const targetUser = users.find((entry) => entry.id === userId);
          if (!targetUser) return;
          await requestApi<never>(`companies/${user.companyId}/users/${userId}`, {
            method: "PUT",
            body: JSON.stringify({
              firstName: targetUser.firstName,
              lastName: targetUser.lastName,
              email: targetUser.email,
              phone: targetUser.phone || "",
              role: targetUser.role,
              isActive: nextValue,
            }),
          });
        }),
      );

      toast.success(`تم ${nextValue ? "تفعيل" : "تعطيل"} ${selectedUsers.length} مستخدم`);
      setSelectedUsers([]);
      await fetchUsers();
      setError(null);
    } catch (toggleError: unknown) {
      toast.error(getErrorMessage(toggleError, i18n.t("UsersManagement.error_error_6424")));
    }
  };

  const handleQuickToggleStatus = async (targetUser: UserRecord) => {
    if (!user?.companyId) return;
    const nextValue = !targetUser.isActive;
    const guardMessage = !nextValue
      ? getProtectedUserActionMessage({
          users,
          targetedUserIds: [targetUser.id],
          currentUserId: user?.id,
          action: "deactivate",
        })
      : null;

    if (guardMessage) {
      toast.error(guardMessage);
      return;
    }

    try {
      await requestApi<never>(`companies/${user.companyId}/users/${targetUser.id}`, {
        method: "PUT",
        body: JSON.stringify({
          firstName: targetUser.firstName,
          lastName: targetUser.lastName,
          email: targetUser.email,
          phone: targetUser.phone || "",
          role: targetUser.role,
          isActive: nextValue,
        }),
      });

      toast.success(
        nextValue
          ? `تم تفعيل حساب ${targetUser.firstName} ${targetUser.lastName} بنجاح`
          : `تم تعطيل حساب ${targetUser.firstName} ${targetUser.lastName} بنجاح`,
      );
      await fetchUsers();
      setError(null);
    } catch (toggleError: unknown) {
      toast.error(getErrorMessage(toggleError, "حدث خطأ أثناء تغيير حالة المستخدم"));
    }
  };

  const runPendingAction = async () => {
    if (!pendingAction || !user?.companyId) return;

    try {
      setActionLoading(true);
      switch (pendingAction.kind) {
        case "delete-user": {
          const guardMessage = getProtectedUserActionMessage({
            users,
            targetedUserIds: [pendingAction.user.id],
            currentUserId: user?.id,
            action: "delete",
          });
          if (guardMessage) throw new Error(guardMessage);
          const response = await requestApi<never>(
            `companies/${user.companyId}/users/${pendingAction.user.id}`,
            { method: "DELETE" },
          );
          if (!response.success) throw new Error(response.message || String(t("users.deleteError")));
          tToast.success("UsersManagement.success_delete_ae63");
          await fetchUsers();
          break;
        }
        case "bulk-delete": {
          const guardMessage = getSelectionGuardMessage("delete");
          if (guardMessage) throw new Error(guardMessage);
          await Promise.all(
            selectedUsers.map((userId) =>
              requestApi<never>(`companies/${user.companyId}/users/${userId}`, { method: "DELETE" }),
            ),
          );
          toast.success(`تم حذف ${pendingAction.count} مستخدم`);
          setSelectedUsers([]);
          await fetchUsers();
          break;
        }
        case "cancel-invitation": {
          const response = await requestApi<never>(
            `companies/${user.companyId}/invitations/${pendingAction.invitation.id}`,
            { method: "DELETE" },
          );
          if (!response.success) throw new Error(response.message || "فشل إلغاء الدعوة");
          tToast.success("UsersManagement.msg_6812");
          await fetchInvitations();
          break;
        }
        case "reset-password": {
          const response = await requestApi<never>(
            `companies/${user.companyId}/users/${pendingAction.user.id}/reset-password`,
            { method: "POST" },
          );
          if (!response.success) throw new Error(response.message || "فشل إرسال رابط إعادة التعيين");
          tToast.success("UsersManagement.success_send_62b7");
          break;
        }
      }
      setPendingAction(null);
      setError(null);
    } catch (actionError: unknown) {
      const nextError = getErrorMessage(actionError, i18n.t("UsersManagement.error_error_a658"));
      toast.error(nextError);
    } finally {
      setActionLoading(false);
    }
  };

  return {
    t,
    user,
    companyApps,
    users,
    roles,
    invitations,
    departments,
    positions,
    loading,
    invitationsLoading,
    error,
    searchInput,
    setSearchInput,
    page,
    setPage,
    limit,
    setLimit,
    totalPages,
    totalCount,
    filters,
    selectedUsers,
    activeTab,
    statusCounts,
    filterSheetOpen,
    setFilterSheetOpen,
    editorMode,
    setEditorMode,
    editingUser,
    detailsUser,
    setDetailsUser,
    inviteDialogOpen,
    setInviteDialogOpen,
    employeeInviteModalOpen,
    setEmployeeInviteModalOpen,
    showPassword,
    setShowPassword,
    userForm,
    inviteForm,
    setInviteForm,
    formErrors,
    inviteErrors,
    submitting,
    inviteSubmitting,
    pendingAction,
    setPendingAction,
    actionLoading,
    isAllSelected,
    isSomeSelected,
    fetchUsers,
    fetchInvitations,
    toggleUserSelection,
    handleToggleSelectAll,
    getRoleDisplayName,
    openAddUser,
    openInviteDialog,
    openEditUser,
    closeEditor,
    updateUserForm,
    saveUser,
    sendInvitation,
    applySearch,
    handleTabChange,
    updateFilter,
    clearFilters,
    copyInvitationLink,
    resendInvitation,
    exportCurrentUsers,
    handleBulkToggle,
    handleQuickToggleStatus,
    runPendingAction,
  };
}
