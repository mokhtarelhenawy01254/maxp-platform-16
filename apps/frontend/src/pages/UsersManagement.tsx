import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import i18n from "../i18n";
import { toast } from "sonner";
import { tToast } from "../utils/i18n-toast";
import { useTranslation } from "react-i18next";
import { getImageUrl } from "../utils/imageUrl";
import {
  AlertTriangle,
  ArrowDownToLine,
  Eye,
  KeyRound,
  Loader2,
  Mail,
  MailPlus,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "../components/ui/alert";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { ScrollArea } from "../components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { TooltipProvider } from "../components/ui/tooltip";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  BusinessFilterSheet,
  BusinessMobileSearchPanel,
} from "../components/business/BusinessFilters";
import { motion } from "framer-motion";
import { useAuth } from "../hooks/useAuthSimple";
import { cn } from "../lib/utils";
import { getProtectedUserActionMessage } from "../utils/usersManagementGuards";
import tokenManager from "../utils/tokenManager";
import { buildApiUrl } from "../utils/urlHelper";
import { DefaultPageSelector } from "../components/settings/DefaultPageSelector";
import { saveDefaultPagePreference } from "../utils/postAuthRouting";

type RoleRecord = Record<string, { name: string }>;

type UserRecord = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  role: string;
  roleId?: string | null;
  roleName?: string | null;
  isActive: boolean;
  isEmailVerified?: boolean;
  avatar?: string | null;
  lastLoginAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  employee?: {
    employeeNumber?: string | null;
    status?: string | null;
    hireDate?: string | null;
    contractType?: string | null;
    baseSalary?: number | string | null;
    department?: { id: string; name: string; color?: string | null } | null;
    position?: { id: string; title: string } | null;
  } | null;
};

type InvitationRecord = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  token: string;
  createdAt: string;
  expiresAt: string;
};

type FiltersState = {
  search: string;
  role: string;
  isActive: string;
  employeeStatus: string;
};

type UserFormState = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  role: string;
  isActive: boolean;
  departmentId: string;
  positionId: string;
  hireDate: string;
  contractType: string;
  baseSalary: string;
  defaultPage: string;
};

type InviteFormState = {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
};

type UserFormErrors = Partial<Record<keyof UserFormState, string>>;
type InviteFormErrors = Partial<Record<keyof InviteFormState, string>>;

type PendingAction =
  | { kind: "delete-user"; user: UserRecord }
  | { kind: "bulk-delete"; count: number }
  | { kind: "cancel-invitation"; invitation: InvitationRecord }
  | { kind: "reset-password"; user: UserRecord }
  | null;

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  error?: string;
  data?: T;
  details?: { current: number; limit: number };
  departments?: Array<{ id: string; name: string; color?: string | null }>;
  positions?: Array<{ id: string; title: string }>;
};

const PAGE_SIZE_OPTIONS = ["10", "25", "50", "100"];

const EMPLOYEE_STATUS_OPTIONS = [
  { value: "ACTIVE", label: "نشط" },
  { value: "ON_LEAVE", label: "في إجازة" },
  { value: "SUSPENDED", label: "موقوف" },
  { value: "TERMINATED", label: "منتهي" },
  { value: "RESIGNED", label: "مستقيل" },
  { value: "NO_EMPLOYEE", label: "بدون ملف موظف" },
];

const CONTRACT_OPTIONS = [
  { value: "FULL_TIME", label: "دوام كامل" },
  { value: "PART_TIME", label: "دوام جزئي" },
  { value: "CONTRACT", label: "عقد" },
  { value: "TEMPORARY", label: "مؤقت" },
  { value: "INTERNSHIP", label: "تدريب" },
];

const createInitialUserForm = (): UserFormState => ({
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  phone: "",
  role: "AGENT",
  isActive: true,
  departmentId: "",
  positionId: "",
  hireDate: new Date().toISOString().split("T")[0] ?? "",
  contractType: "FULL_TIME",
  baseSalary: "",
  defaultPage: "/apps",
});

const createInitialInviteForm = (): InviteFormState => ({
  firstName: "",
  lastName: "",
  email: "",
  role: "AGENT",
});

const getAuthHeaders = (): HeadersInit =>
  tokenManager.createAuthHeaders({
    "Content-Type": "application/json",
  });

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: string }).message === "string" &&
    (error as { message?: string }).message?.trim()
  ) {
    return (error as { message: string }).message;
  }

  return fallback;
};

const getInitials = (firstName?: string, lastName?: string) =>
  `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.trim() || "U";

const formatDate = (value?: string | null) => {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "لم يسجل دخول بعد";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "لم يسجل دخول بعد";
  }
  return date.toLocaleString("ar-EG");
};

const isInvitationExpired = (expiresAt?: string | null) =>
  Boolean(expiresAt && new Date(expiresAt).getTime() < Date.now());

const getRoleBadgeClassName = (role: string) => {
  switch (role) {
    case "COMPANY_ADMIN":
      return "border-rose-200 bg-rose-500/10 text-rose-700";
    case "MANAGER":
      return "border-amber-200 bg-amber-500/10 text-amber-700";
    case "AGENT":
      return "border-sky-200 bg-sky-500/10 text-sky-700";
    case "SUPER_ADMIN":
      return "border-violet-200 bg-violet-500/10 text-violet-700";
    default:
      return "border-border bg-muted text-foreground";
  }
};

const getAccountStatusClassName = (isActive: boolean) =>
  isActive
    ? "border-emerald-200 bg-emerald-500/10 text-emerald-700"
    : "border-slate-200 bg-slate-500/10 text-slate-700";

const getEmployeeStatusLabel = (status?: string | null) => {
  switch (status) {
    case "ACTIVE":
      return "نشط";
    case "ON_LEAVE":
      return "في إجازة";
    case "SUSPENDED":
      return "موقوف";
    case "TERMINATED":
      return "منتهي";
    case "RESIGNED":
      return "مستقيل";
    default:
      return status || "-";
  }
};

const getEmployeeStatusClassName = (status?: string | null) => {
  switch (status) {
    case "ACTIVE":
      return "border-emerald-200 bg-emerald-500/10 text-emerald-700";
    case "ON_LEAVE":
      return "border-amber-200 bg-amber-500/10 text-amber-700";
    case "SUSPENDED":
    case "TERMINATED":
      return "border-rose-200 bg-rose-500/10 text-rose-700";
    case "RESIGNED":
      return "border-slate-200 bg-slate-500/10 text-slate-700";
    default:
      return "border-border bg-muted text-foreground";
  }
};

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}) => (
  <div className={cn("space-y-2", className)}>
    <Label htmlFor={htmlFor}>{label}</Label>
    {children}
    {error ? (
      <p className="text-xs text-destructive">{error}</p>
    ) : hint ? (
      <p className="text-xs text-muted-foreground">{hint}</p>
    ) : null}
  </div>
);

const UsersManagement: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

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
  const [activeTab, setActiveTab] = useState<"users" | "invitations">("users");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit" | null>(null);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [detailsUser, setDetailsUser] = useState<UserRecord | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
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
    async function requestApi<T>(
      path: string,
      init?: RequestInit,
    ): Promise<ApiEnvelope<T>> {
      const response = await fetch(buildApiUrl(path), {
        ...init,
        headers: {
          ...getAuthHeaders(),
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
    if (!user?.companyId) {
      return;
    }

    const requestId = usersRequestRef.current + 1;
    usersRequestRef.current = requestId;

    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (filters.search.trim()) {
        queryParams.set("search", filters.search.trim());
      }
      if (filters.role) {
        queryParams.set("role", filters.role);
      }
      if (filters.isActive) {
        queryParams.set("isActive", filters.isActive);
      }
      if (filters.employeeStatus) {
        queryParams.set("employeeStatus", filters.employeeStatus);
      }

      const payload = await requestApi<{
        users: UserRecord[];
        pagination?: { totalPages?: number; total?: number };
      }>(`companies/${user.companyId}/users?${queryParams.toString()}`);

      if (!mountedRef.current || requestId !== usersRequestRef.current) {
        return;
      }

      if (payload.success && payload.data) {
        setUsers(payload.data.users || []);
        setTotalPages(payload.data.pagination?.totalPages || 0);
        setTotalCount(payload.data.pagination?.total || 0);
        setError(null);
      } else {
        setUsers([]);
        setTotalPages(0);
        setTotalCount(0);
        setError(payload.message || t("users.fetchError"));
      }
    } catch (fetchError: unknown) {
      if (!mountedRef.current || requestId !== usersRequestRef.current) {
        return;
      }

      setUsers([]);
      setTotalPages(0);
      setTotalCount(0);
      setError(getErrorMessage(fetchError, t("users.fetchDataError")));
    } finally {
      if (mountedRef.current && requestId === usersRequestRef.current) {
        setLoading(false);
      }
    }
  }, [
    filters.employeeStatus,
    filters.isActive,
    filters.role,
    filters.search,
    limit,
    page,
    requestApi,
    t,
    user?.companyId,
  ]);

  const fetchRoles = useCallback(async () => {
    if (!user?.companyId) {
      return;
    }

    try {
      const payload = await requestApi<RoleRecord>(
        `companies/${user.companyId}/roles`,
      );
      if (payload.success && payload.data) {
        setRoles(payload.data);
      }
    } catch (fetchError: unknown) {
      console.error("Failed to fetch roles", fetchError);
    }
  }, [requestApi, user?.companyId]);

  const fetchInvitations = useCallback(async () => {
    if (!user?.companyId) {
      return;
    }

    try {
      setInvitationsLoading(true);
      const payload = await requestApi<{
        invitations?: InvitationRecord[];
      }>(`companies/${user.companyId}/invitations`);
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
        current.search === nextSearch
          ? current
          : { ...current, search: nextSearch },
      );
      setPage(1);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setSelectedUsers((current) =>
      current.filter((id) => users.some((entry) => entry.id === id)),
    );
  }, [users]);



  const activeUsersCount = useMemo(
    () => users.filter((entry) => entry.isActive).length,
    [users],
  );

  const metrics = useMemo(
    () => [
      {
        title: "إجمالي المستخدمين",
        value: totalCount,
        subtitle: "عدد الحسابات في الصفحة الحالية بعد الفلاتر",
        tone: "primary",
        icon: Users,
      },
      {
        title: "المستخدمون النشطون",
        value: activeUsersCount,
        subtitle: "الحسابات المفعلة حاليًا",
        tone: "success",
        icon: ShieldCheck,
      },
      {
        title: "الدعوات المعلقة",
        value: invitations.length,
        subtitle: "دعوات بانتظار القبول أو الإلغاء",
        tone: "warning",
        icon: MailPlus,
      },
    ],
    [activeUsersCount, invitations.length, totalCount],
  );

  const activeFilterLabels = useMemo(() => {
    const labels: string[] = [];

    if (filters.role) {
      labels.push(`الدور: ${roles[filters.role]?.name || filters.role}`);
    }
    if (filters.isActive) {
      labels.push(filters.isActive === "true" ? "نشط فقط" : "غير نشط فقط");
    }
    if (filters.employeeStatus) {
      const foundStatus = EMPLOYEE_STATUS_OPTIONS.find(
        (option) => option.value === filters.employeeStatus,
      );
      labels.push(`الموظف: ${foundStatus?.label || filters.employeeStatus}`);
    }

    return labels;
  }, [filters.employeeStatus, filters.isActive, filters.role, roles]);

  const filterCount = activeFilterLabels.length;
  const isAllSelected =
    users.length > 0 && selectedUsers.length === users.length;
  const isSomeSelected =
    selectedUsers.length > 0 && selectedUsers.length < users.length;

  const getRoleDisplayName = useCallback(
    (role: string, user?: UserRecord) => {
      if (user?.roleName) return user.roleName;
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
      const freshPayload = await requestApi<any>(
        `companies/${user?.companyId}/users/${targetUser.id}`
      );
      if (freshPayload.success && freshPayload.data) {
        targetUser = freshPayload.data;
        setEditingUser(targetUser);
        defaultPage = freshPayload.data.defaultPage || "/apps";
      }
    } catch {
      // Fall back to the passed-in user data if fetch fails
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
        ? new Date(targetUser.employee.hireDate).toISOString().split("T")[0] ||
          ""
        : createInitialUserForm().hireDate,
      contractType: targetUser.employee?.contractType || "FULL_TIME",
      baseSalary:
        targetUser.employee?.baseSalary !== undefined &&
        targetUser.employee?.baseSalary !== null
          ? String(targetUser.employee.baseSalary)
          : "",
      defaultPage,
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

    if (!userForm.firstName.trim()) {
      nextErrors.firstName = String(t("users.form.firstNameRequired"));
    }
    if (!userForm.lastName.trim()) {
      nextErrors.lastName = String(t("users.form.lastNameRequired"));
    }
    if (!userForm.email.trim()) {
      nextErrors.email = String(t("users.form.emailRequired"));
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userForm.email.trim())) {
      nextErrors.email = String(t("users.form.emailInvalid"));
    }
    if (!userForm.role.trim()) {
      nextErrors.role = String(t("users.form.roleRequired"));
    }
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
    if (
      editorMode === "edit" &&
      editingUser &&
      editingUser.id === user?.id &&
      userForm.isActive === false
    ) {
      nextErrors.isActive = String(t("users.form.cannotDeactivateSelf"));
    }
    if (
      editorMode === "edit" &&
      editingUser &&
      userForm.isActive === false &&
      !nextErrors.isActive
    ) {
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

    if (!inviteForm.firstName.trim()) {
      nextErrors.firstName = String(t("users.form.firstNameRequired"));
    }
    if (!inviteForm.lastName.trim()) {
      nextErrors.lastName = String(t("users.form.lastNameRequired"));
    }
    if (!inviteForm.email.trim()) {
      nextErrors.email = String(t("users.form.emailRequired"));
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteForm.email.trim())) {
      nextErrors.email = String(t("users.form.emailInvalid"));
    }
    if (!inviteForm.role.trim()) {
      nextErrors.role = String(t("users.form.roleRequired"));
    }

    setInviteErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const updateUserForm = (
    field: keyof UserFormState,
    value: string | boolean,
  ) => {
    setUserForm((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => {
      if (!current[field]) {
        return current;
      }
      const nextErrors = { ...current };
      delete nextErrors[field];
      return nextErrors;
    });
  };

  const saveUser = async () => {
    if (!user?.companyId || !validateUserForm()) {
      return;
    }

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
        ...(isEditMode && { settings: { defaultPage: userForm.defaultPage } }),
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
          // storage unavailable
        }
      }

      toast.success(
        isEditMode ? "تم تحديث المستخدم بنجاح" : "تم إنشاء المستخدم بنجاح",
      );
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
    if (!user?.companyId || !validateInviteForm()) {
      return;
    }

    try {
      setInviteSubmitting(true);
      const response = await requestApi<{
        invitationLink?: string;
      }>(`companies/${user.companyId}/invitations`, {
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
        void navigator.clipboard.writeText(response.data.invitationLink);
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

  const updateFilter = (field: keyof FiltersState, value: string) => {
    setFilters((current) => ({ ...current, [field]: value }));
    setPage(1);
    setSelectedUsers([]);
  };

  const clearFilters = () => {
    setSearchInput("");
    setFilters({ search: "", role: "", isActive: "", employeeStatus: "" });
    setPage(1);
    setSelectedUsers([]);
  };

  const copyInvitationLink = async (invitation: InvitationRecord) => {
    try {
      const inviteUrl = `${window.location.origin}/auth/accept-invitation?token=${invitation.token}`;
      await navigator.clipboard.writeText(inviteUrl);
      toast.success(t("users.linkCopied") || "تم نسخ رابط الدعوة");
    } catch {
      tToast.error("UsersManagement.msg_8387");
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
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `users_${new Date().toISOString().split("T")[0] || "export"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    tToast.success("UsersManagement.msg_fc1e");
  };

  const handleBulkToggle = async (nextValue: boolean) => {
    if (!user?.companyId || selectedUsers.length === 0) {
      return;
    }

    const guardMessage = !nextValue
      ? getSelectionGuardMessage("deactivate")
      : null;
    if (guardMessage) {
      toast.error(guardMessage);
      return;
    }

    try {
      await Promise.all(
        selectedUsers.map(async (userId) => {
          const targetUser = users.find((entry) => entry.id === userId);
          if (!targetUser) {
            return;
          }
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

      toast.success(
        `تم ${nextValue ? "تفعيل" : "تعطيل"} ${selectedUsers.length} مستخدم`,
      );
      setSelectedUsers([]);
      await fetchUsers();
      setError(null);
    } catch (toggleError: unknown) {
      toast.error(getErrorMessage(toggleError, i18n.t("UsersManagement.error_error_6424")));
    }
  };

  const runPendingAction = async () => {
    if (!pendingAction || !user?.companyId) {
      return;
    }

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
          if (guardMessage) {
            throw new Error(guardMessage);
          }
          const response = await requestApi<never>(
            `companies/${user.companyId}/users/${pendingAction.user.id}`,
            {
              method: "DELETE",
            },
          );
          if (!response.success) {
            throw new Error(response.message || String(t("users.deleteError")));
          }
          tToast.success("UsersManagement.success_delete_ae63");
          await fetchUsers();
          break;
        }
        case "bulk-delete": {
          const guardMessage = getSelectionGuardMessage("delete");
          if (guardMessage) {
            throw new Error(guardMessage);
          }
          await Promise.all(
            selectedUsers.map((userId) =>
              requestApi<never>(`companies/${user.companyId}/users/${userId}`, {
                method: "DELETE",
              }),
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
            {
              method: "DELETE",
            },
          );
          if (!response.success) {
            throw new Error(response.message || "فشل إلغاء الدعوة");
          }
          tToast.success("UsersManagement.msg_6812");
          await fetchInvitations();
          break;
        }
        case "reset-password": {
          const response = await requestApi<never>(
            `companies/${user.companyId}/users/${pendingAction.user.id}/reset-password`,
            {
              method: "POST",
            },
          );
          if (!response.success) {
            throw new Error(response.message || "فشل إرسال رابط إعادة التعيين");
          }
          tToast.success("UsersManagement.success_send_62b7");
          break;
        }
      }

      setPendingAction(null);
      setError(null);
    } catch (actionError: unknown) {
      const nextError = getErrorMessage(
        actionError,
        i18n.t("UsersManagement.error_error_a658"),
      );
      setError(nextError);
      toast.error(nextError);
    } finally {
      setActionLoading(false);
    }
  };

  const resendInvitation = async (invitationId: string) => {
    if (!user?.companyId) {
      return;
    }

    try {
      const response = await requestApi<never>(
        `companies/${user.companyId}/invitations/${invitationId}`,
        {
          method: "POST",
        },
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

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(users.map((entry) => entry.id));
      return;
    }
    setSelectedUsers([]);
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((current) =>
      current.includes(userId)
        ? current.filter((entryId) => entryId !== userId)
        : [...current, userId],
    );
  };

  const currentActionTitle = (() => {
    if (!pendingAction) {
      return "";
    }
    switch (pendingAction.kind) {
      case "delete-user":
        return "تأكيد حذف المستخدم";
      case "bulk-delete":
        return "حذف المستخدمين المحددين";
      case "cancel-invitation":
        return "إلغاء الدعوة";
      case "reset-password":
        return "إعادة تعيين كلمة المرور";
    }
  })();

  const currentActionDescription = (() => {
    if (!pendingAction) {
      return "";
    }
    switch (pendingAction.kind) {
      case "delete-user":
        return `سيتم حذف ${pendingAction.user.firstName} ${pendingAction.user.lastName} نهائيًا من الشركة.`;
      case "bulk-delete":
        return `سيتم حذف ${pendingAction.count} مستخدم من القائمة الحالية.`;
      case "cancel-invitation":
        return `سيتم إلغاء الدعوة المرسلة إلى ${pendingAction.invitation.email}.`;
      case "reset-password":
        return `سيتم إرسال رابط إعادة تعيين كلمة المرور إلى ${pendingAction.user.email}.`;
    }
  })();

  const isInitialLoading = loading && users.length === 0;
  const detailsDepartmentColor =
    detailsUser?.employee?.department?.color || undefined;

  if (!user?.companyId) {
    return (
      <div className="p-4 md:p-6 lg:p-8 w-full">
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>هذه الصفحة غير متاحة</AlertTitle>
          <AlertDescription>
            لا يوجد `companyId` مرتبط بالحساب الحالي، لذلك لا يمكن تحميل إدارة
            المستخدمين.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="p-4 md:p-6 lg:p-8 space-y-6 w-full">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">{t("users.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("users.pageDescription")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="h-11 rounded-2xl" onClick={openAddUser}>
              <Plus className="size-4" />
              {t("users.addNewUser")}
            </Button>
            <Button type="button" variant="outline" className="h-11 rounded-2xl" onClick={openInviteDialog}>
              <UserPlus className="size-4" />
              {t("users.inviteUser")}
            </Button>
            <Button type="button" variant="outline" className="h-11 rounded-2xl" onClick={exportCurrentUsers} disabled={users.length === 0}>
              <ArrowDownToLine className="size-4" />
              {t("users.exportCsv")}
            </Button>
          </div>
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>فيه مشكلة محتاجة مراجعة</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            <AlertAction>
              <Button type="button" variant="ghost" size="sm" onClick={() => setError(null)}>
                إخفاء
              </Button>
            </AlertAction>
          </Alert>
        ) : null}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((m, idx) => {
            const Icon = m.icon;
            const tones: Record<string, { bar: string; icon: string }> = {
              primary: { bar: "from-violet-500 to-indigo-500", icon: "text-violet-600 dark:text-violet-300 bg-violet-500/10 dark:bg-violet-500/20" },
              success: { bar: "from-emerald-500 to-teal-500", icon: "text-emerald-600 dark:text-emerald-300 bg-emerald-500/10 dark:bg-emerald-500/20" },
              warning: { bar: "from-amber-500 to-orange-500", icon: "text-amber-600 dark:text-amber-300 bg-amber-500/10 dark:bg-amber-500/20" },
            };
            const t = tones[m.tone] || tones.primary;
            return (
              <motion.div
                key={m.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
                className="relative overflow-hidden rounded-2xl border border-border/50 bg-card p-4 shadow-sm"
              >
                <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${t.bar}`} />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">{m.title}</p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{m.value}</p>
                  </div>
                  <div className={`rounded-xl ${t.icon} p-2.5`}>
                    <Icon className="size-5" />
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{m.subtitle}</p>
              </motion.div>
            );
          })}
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value === "invitations" ? "invitations" : "users")} className="gap-4">
          <TabsList className="w-full justify-start overflow-x-auto rounded-2xl bg-muted/60 p-1">
            <TabsTrigger value="users" className="min-w-[10rem] rounded-xl">
              <Users className="size-4" />
              قائمة المستخدمين
            </TabsTrigger>
            <TabsTrigger value="invitations" className="min-w-[10rem] rounded-xl">
              <MailPlus className="size-4" />
              الدعوات المعلقة
              {invitations.length > 0 ? (
                <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  {invitations.length}
                </span>
              ) : null}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            {selectedUsers.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>{t("users.selectedUsers", { count: selectedUsers.length })}</CardTitle>
                  <CardDescription>{t("users.bulkActionsDescription")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => void handleBulkToggle(true)}>
                      {t("users.activate")}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => void handleBulkToggle(false)}>
                      {t("users.deactivate")}
                    </Button>
                    <Button type="button" variant="destructive" onClick={() => setPendingAction({ kind: "bulk-delete", count: selectedUsers.length })}>
                      <Trash2 className="size-4" />
                      {t("users.deleteSelected")}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setSelectedUsers([])}>
                      {t("users.clearSelection")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <BusinessMobileSearchPanel
              searchId="users-mobile-search"
              searchName="usersMobileSearch"
              searchLabel={t("users.filters.search")}
              searchPlaceholder={t("users.filters.searchPlaceholder")}
              searchValue={searchInput}
              searchAriaLabel={String(t("users.filters.search"))}
              onSearchChange={setSearchInput}
              onSearchSubmit={applySearch}
              onOpenFilters={() => setFilterSheetOpen(true)}
              filterCount={filterCount}
              summaryIcon={<Users className="size-3.5" />}
              summary={`${totalCount} مستخدم بعد الفلاتر الحالية`}
              activeFilters={activeFilterLabels}
            />

            <BusinessFilterSheet
              open={filterSheetOpen}
              onOpenChange={setFilterSheetOpen}
              title="فلاتر المستخدمين"
              description="عدّل التصفية قبل استعراض القائمة على الموبايل."
              onClear={() => {
                clearFilters();
                setFilterSheetOpen(false);
              }}
              onApply={() => setFilterSheetOpen(false)}
            >
              <FormField label={t("users.filters.role")}>
                <Select value={filters.role || null} onValueChange={(value) => updateFilter("role", value || "")}>
                  <SelectTrigger className="h-11 rounded-2xl">
                    <SelectValue placeholder={t("users.filters.role")} />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value={null}> {t("users.filters.all")} </SelectItem>
                    {Object.entries(roles).map(([roleKey, roleData]) => (
                      <SelectItem key={roleKey} value={roleKey}>
                        {roleData.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label={t("users.filters.status")}>
                <Select value={filters.isActive || null} onValueChange={(value) => updateFilter("isActive", value || "")}>
                  <SelectTrigger className="h-11 rounded-2xl">
                    <SelectValue placeholder={t("users.filters.status")} />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value={null}> {t("users.filters.all")} </SelectItem>
                    <SelectItem value="true">{t("users.filters.active")}</SelectItem>
                    <SelectItem value="false">{t("users.filters.inactive")}</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="حالة الموظف">
                <Select value={filters.employeeStatus || null} onValueChange={(value) => updateFilter("employeeStatus", value || "")}>
                  <SelectTrigger className="h-11 rounded-2xl">
                    <SelectValue placeholder="حالة الموظف" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value={null}> الكل </SelectItem>
                    {EMPLOYEE_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label={t("users.filters.limit")}>
                <Select value={String(limit)} onValueChange={(value) => { setLimit(Number(value || "25")); setPage(1); }}>
                  <SelectTrigger className="h-11 rounded-2xl">
                    <SelectValue placeholder={t("users.filters.limit")} />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {PAGE_SIZE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </BusinessFilterSheet>

            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <CardTitle>{t("users.userList", { count: totalCount })}</CardTitle>
                  <CardDescription>{t("users.userListDescription")}</CardDescription>
                </div>
                <Button type="button" variant="outline" className="h-10 rounded-2xl" onClick={() => void fetchUsers()}>
                  <RefreshCw className={cn("size-4", loading ? "animate-spin" : undefined)} />
                  تحديث
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
              {isInitialLoading ? (
                <div className="flex min-h-[18rem] items-center justify-center">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="hidden overflow-hidden rounded-[1.5rem] border border-border/70 md:block">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-12 text-right">
                            <Checkbox checked={isAllSelected} indeterminate={isSomeSelected} onCheckedChange={handleToggleSelectAll} aria-label="تحديد كل المستخدمين" />
                          </TableHead>
                          <TableHead className="text-right">{t("users.table.user")}</TableHead>
                          <TableHead className="text-right">{t("users.table.email")}</TableHead>
                          <TableHead className="text-right">{t("users.table.role")}</TableHead>
                          <TableHead className="text-right">ملف الموظف</TableHead>
                          <TableHead className="text-right">{t("users.table.status")}</TableHead>
                          <TableHead className="text-right">{t("users.table.actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((entry) => {
                          const deleteGuardMessage = getProtectedUserActionMessage({
                            users,
                            targetedUserIds: [entry.id],
                            currentUserId: user?.id,
                            action: "delete",
                          });
                          const disableDelete = Boolean(deleteGuardMessage);
                          return (
                            <TableRow key={entry.id} data-state={selectedUsers.includes(entry.id) ? "selected" : undefined}>
                              <TableCell>
                                <Checkbox checked={selectedUsers.includes(entry.id)} onCheckedChange={() => toggleUserSelection(entry.id)} aria-label={`تحديد ${entry.firstName} ${entry.lastName}`} />
                              </TableCell>
                              <TableCell className="min-w-[16rem]">
                                <div className="flex items-center gap-3">
                                  <Avatar size="lg">
                                    <AvatarImage src={getImageUrl(entry.avatar) || undefined} alt={entry.email} />
                                    <AvatarFallback>{getInitials(entry.firstName, entry.lastName)}</AvatarFallback>
                                  </Avatar>
                                  <div className="space-y-1">
                                    <p className="font-semibold text-foreground">{entry.firstName} {entry.lastName}</p>
                                    <p className="text-xs text-muted-foreground">{entry.email}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>{entry.email}</TableCell>
                              <TableCell>
                                <Badge className={cn("rounded-full border", getRoleBadgeClassName(entry.role))}>
                                  {getRoleDisplayName(entry.role, entry)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1 text-sm">
                                  <p>{entry.employee?.department?.name || "بدون قسم"}</p>
                                  <p className="text-muted-foreground">{entry.employee?.position?.title || "بدون منصب"}</p>
                                  {entry.employee?.status ? (
                                    <Badge className={cn("rounded-full border", getEmployeeStatusClassName(entry.employee.status))}>
                                      {getEmployeeStatusLabel(entry.employee.status)}
                                    </Badge>
                                  ) : null}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={cn("rounded-full border", getAccountStatusClassName(entry.isActive))}>
                                  {entry.isActive ? t("users.filters.active") : t("users.filters.inactive")}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex justify-end">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button type="button" variant="outline" size="icon-sm" aria-label="إجراءات المستخدم">
                                        <MoreHorizontal className="size-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" sideOffset={8}>
                                      <DropdownMenuItem onClick={() => setDetailsUser(entry)}>
                                        <Eye className="size-4" />
                                        عرض التفاصيل
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => openEditUser(entry)}>
                                        <Pencil className="size-4" />
                                        {t("users.actions.edit")}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => setPendingAction({ kind: "reset-password", user: entry })}>
                                        <KeyRound className="size-4" />
                                        إعادة تعيين كلمة المرور
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem variant="destructive" disabled={disableDelete} onClick={() => setPendingAction({ kind: "delete-user", user: entry })}>
                                        <Trash2 className="size-4" />
                                        {disableDelete ? deleteGuardMessage : t("users.actions.delete")}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {users.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                              لا توجد نتائج مطابقة للفلاتر الحالية.
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="space-y-3 md:hidden">
                    {users.length === 0 ? (
                      <div className="rounded-[1.75rem] border border-dashed border-border/70 bg-card/70 p-6 text-center text-sm text-muted-foreground">
                        لا توجد نتائج مطابقة للفلاتر الحالية.
                      </div>
                    ) : (
                      users.map((entry) => {
                        const deleteGuardMessage = getProtectedUserActionMessage({
                          users,
                          targetedUserIds: [entry.id],
                          currentUserId: user?.id,
                          action: "delete",
                        });
                        const disableDelete = Boolean(deleteGuardMessage);

                        return (
                          <article key={entry.id} className="rounded-[1.75rem] border border-border/70 bg-card/80 p-4 shadow-sm">
                            <div className="flex items-start gap-3">
                              <Checkbox checked={selectedUsers.includes(entry.id)} onCheckedChange={() => toggleUserSelection(entry.id)} aria-label={`تحديد ${entry.firstName} ${entry.lastName}`} className="mt-1" />
                              <Avatar size="lg">
                                <AvatarImage src={getImageUrl(entry.avatar) || undefined} alt={entry.email} />
                                <AvatarFallback>{getInitials(entry.firstName, entry.lastName)}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1 space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="truncate text-base font-semibold text-foreground">{entry.firstName} {entry.lastName}</p>
                                    <p className="truncate text-sm text-muted-foreground">{entry.email}</p>
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button type="button" variant="outline" size="icon-sm" aria-label="إجراءات المستخدم">
                                        <MoreHorizontal className="size-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" sideOffset={8}>
                                      <DropdownMenuItem onClick={() => setDetailsUser(entry)}>
                                        <Eye className="size-4" />
                                        عرض التفاصيل
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => openEditUser(entry)}>
                                        <Pencil className="size-4" />
                                        تعديل المستخدم
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => setPendingAction({ kind: "reset-password", user: entry })}>
                                        <KeyRound className="size-4" />
                                        إعادة التعيين
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem variant="destructive" disabled={disableDelete} onClick={() => setPendingAction({ kind: "delete-user", user: entry })}>
                                        <Trash2 className="size-4" />
                                        {disableDelete ? deleteGuardMessage : "حذف المستخدم"}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  <Badge className={cn("rounded-full border", getRoleBadgeClassName(entry.role))}>
                                    {getRoleDisplayName(entry.role, entry)}
                                  </Badge>
                                  <Badge className={cn("rounded-full border", getAccountStatusClassName(entry.isActive))}>
                                    {entry.isActive ? "نشط" : "غير نشط"}
                                  </Badge>
                                  {entry.isEmailVerified ? (
                                    <Badge variant="outline" className="rounded-full border-emerald-200 bg-emerald-500/10 text-emerald-700">
                                      البريد موثق
                                    </Badge>
                                  ) : null}
                                </div>

                                <div className="grid gap-2 rounded-[1.25rem] bg-muted/40 p-3 text-sm">
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-muted-foreground">الهاتف</span>
                                    <span>{entry.phone || "-"}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-muted-foreground">القسم</span>
                                    <span>{entry.employee?.department?.name || "-"}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-muted-foreground">المنصب</span>
                                    <span>{entry.employee?.position?.title || "-"}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </article>
                        );
                      })
                    )}
                  </div>

                  <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                      صفحة {Math.min(page, Math.max(totalPages, 1))} من {Math.max(totalPages, 1)}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" onClick={() => setPage((current) => Math.max(current - 1, 1))} disabled={page <= 1 || loading}>
                        السابق
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setPage((current) => totalPages > 0 ? Math.min(current + 1, totalPages) : current + 1)} disabled={loading || totalPages === 0 || page >= totalPages}>
                        التالي
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invitations" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <CardTitle>{t("users.pendingInvitations", { count: invitations.length })}</CardTitle>
                  <CardDescription>{t("users.invitationsDescription")}</CardDescription>
                </div>
                <Button type="button" variant="outline" className="h-10 rounded-2xl" onClick={() => void fetchInvitations()}>
                  <RefreshCw className={cn("size-4", invitationsLoading ? "animate-spin" : undefined)} />
                  تحديث
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
              {invitationsLoading ? (
                <div className="flex min-h-[14rem] items-center justify-center">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : invitations.length === 0 ? (
                <div className="rounded-[1.75rem] border border-dashed border-border/70 bg-card/70 p-6 text-center">
                  <Mail className="mx-auto mb-3 size-8 text-muted-foreground" />
                  <p className="font-medium text-foreground">لا توجد دعوات معلقة</p>
                  <p className="mt-2 text-sm text-muted-foreground">كل الدعوات إما تم قبولها أو انتهت صلاحيتها بالفعل.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {invitations.map((invitation) => {
                    const expired = isInvitationExpired(invitation.expiresAt);
                    return (
                      <article key={invitation.id} className="rounded-[1.75rem] border border-border/70 bg-card/80 p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-2">
                            <p className="text-base font-semibold text-foreground">{invitation.firstName} {invitation.lastName}</p>
                            <p className="truncate text-sm text-muted-foreground">{invitation.email}</p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" variant="outline" size="icon-sm" aria-label="إجراءات الدعوة">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" sideOffset={8}>
                              <DropdownMenuItem disabled={expired} onClick={() => void copyInvitationLink(invitation)}>
                                <ArrowDownToLine className="size-4" />
                                نسخ الرابط
                              </DropdownMenuItem>
                              <DropdownMenuItem disabled={expired} onClick={() => void resendInvitation(invitation.id)}>
                                <RefreshCw className="size-4" />
                                إعادة الإرسال
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem variant="destructive" onClick={() => setPendingAction({ kind: "cancel-invitation", invitation })}>
                                <Trash2 className="size-4" />
                                إلغاء الدعوة
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge className={cn("rounded-full border", getRoleBadgeClassName(invitation.role))}>
                            {getRoleDisplayName(invitation.role)}
                          </Badge>
                          <Badge className={cn("rounded-full border", expired ? "border-rose-200 bg-rose-500/10 text-rose-700" : "border-amber-200 bg-amber-500/10 text-amber-700")}>
                            {expired ? "منتهية" : "معلقة"}
                          </Badge>
                        </div>

                        <div className="mt-3 grid gap-2 rounded-[1.25rem] bg-muted/40 p-3 text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">تاريخ الإرسال</span>
                            <span>{formatDate(invitation.createdAt)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">تاريخ الانتهاء</span>
                            <span>{formatDate(invitation.expiresAt)}</span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={editorMode !== null} onOpenChange={(open) => (!open ? closeEditor() : undefined)}>
          <DialogContent className="max-w-[calc(100%-1.5rem)] gap-0 overflow-hidden p-0 sm:max-w-4xl">
            <DialogHeader className="border-b border-border/70 px-5 py-4">
              <DialogTitle>
                {editorMode === "edit" ? t("users.editUser") : t("users.addNewUser")}
              </DialogTitle>
              <DialogDescription>
                {editorMode === "edit"
                  ? "حدّث بيانات الحساب وملف الموظف من نفس النافذة."
                  : "أضف مستخدمًا جديدًا مع بيانات الحساب والموارد البشرية في خطوة واحدة."}
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[72vh]">
              <div className="space-y-6 px-5 py-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label={t("users.form.firstName")} htmlFor="user-first-name" error={formErrors.firstName}>
                    <Input id="user-first-name" value={userForm.firstName} onChange={(event) => updateUserForm("firstName", event.target.value)} className="h-11 rounded-2xl" maxLength={50} />
                  </FormField>
                  <FormField label={t("users.form.lastName")} htmlFor="user-last-name" error={formErrors.lastName}>
                    <Input id="user-last-name" value={userForm.lastName} onChange={(event) => updateUserForm("lastName", event.target.value)} className="h-11 rounded-2xl" maxLength={50} />
                  </FormField>
                  <FormField label={t("users.form.email")} htmlFor="user-email" error={formErrors.email}>
                    <Input id="user-email" type="email" value={userForm.email} onChange={(event) => updateUserForm("email", event.target.value)} className="h-11 rounded-2xl" maxLength={100} />
                  </FormField>
                  <FormField label={editorMode === "edit" ? t("users.form.passwordEdit") : t("users.form.password")} htmlFor="user-password" error={formErrors.password}>
                    <div className="relative">
                      <Input id="user-password" type={showPassword ? "text" : "password"} value={userForm.password} onChange={(event) => updateUserForm("password", event.target.value)} className="h-11 rounded-2xl pl-11" maxLength={128} />
                      <Button type="button" variant="ghost" size="icon-sm" className="absolute top-1/2 left-1 -translate-y-1/2" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"}>
                        <Eye className="size-4" />
                      </Button>
                    </div>
                  </FormField>
                  <FormField label={t("users.form.phone")} htmlFor="user-phone" error={formErrors.phone}>
                    <Input id="user-phone" value={userForm.phone} onChange={(event) => updateUserForm("phone", event.target.value)} className="h-11 rounded-2xl" placeholder="+20 1xx xxx xxxx" />
                  </FormField>
                  <FormField label={t("users.form.role")} error={formErrors.role}>
                    <Select value={userForm.role} onValueChange={(value) => updateUserForm("role", value || "AGENT")}>
                      <SelectTrigger className="h-11 rounded-2xl">
                        <SelectValue placeholder={t("users.form.role")} />
                      </SelectTrigger>
                      <SelectContent align="end">
                        {Object.entries(roles).map(([roleKey, roleData]) => (
                          <SelectItem key={roleKey} value={roleKey}>
                            {roleData.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                </div>

                {editorMode === "edit" && (
                  <div className="rounded-[1.5rem] border border-border/70 bg-muted/20 p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">إعدادات الحساب</p>
                        <p className="text-sm text-muted-foreground">تحكم في سلوك الحساب وتجربة المستخدم.</p>
                      </div>
                      <Badge variant="outline" className="rounded-full">الإعدادات</Badge>
                    </div>
                    <DefaultPageSelector
                      value={userForm.defaultPage}
                      onChange={(value) => updateUserForm("defaultPage", value)}
                    />
                  </div>
                )}

                <div className="rounded-[1.5rem] border border-border/70 bg-muted/20 p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">بيانات الموظف</p>
                      <p className="text-sm text-muted-foreground">اربط الحساب بالقسم والمنصب لو كان المستخدم جزءًا من فريق العمل.</p>
                    </div>
                    <Badge variant="outline" className="rounded-full">HR</Badge>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField label="القسم">
                      <Select
                        value={userForm.departmentId || "NONE"}
                        onValueChange={(value) =>
                          updateUserForm("departmentId", value === "NONE" ? "" : (value || ""))
                        }
                      >
                        <SelectTrigger className="h-11 rounded-2xl">
                          <SelectValue placeholder="اختر القسم" />
                        </SelectTrigger>
                        <SelectContent align="end">
                          <SelectItem value="NONE"> بدون قسم </SelectItem>
                          {departments.map((department) => (
                            <SelectItem key={department.id} value={department.id}>
                              {department.name}
                            </SelectItem>
                          ))}
                          {userForm.departmentId &&
                            !departments.some((d) => d.id === userForm.departmentId) && (
                              <SelectItem value={userForm.departmentId}>
                                {editingUser?.employee?.department?.name || userForm.departmentId}
                              </SelectItem>
                            )}
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="المنصب">
                      <Select
                        value={userForm.positionId || "NONE"}
                        onValueChange={(value) =>
                          updateUserForm("positionId", value === "NONE" ? "" : (value || ""))
                        }
                      >
                        <SelectTrigger className="h-11 rounded-2xl">
                          <SelectValue placeholder="اختر المنصب" />
                        </SelectTrigger>
                        <SelectContent align="end">
                          <SelectItem value="NONE"> بدون منصب </SelectItem>
                          {positions.map((position) => (
                            <SelectItem key={position.id} value={position.id}>
                              {position.title}
                            </SelectItem>
                          ))}
                          {userForm.positionId &&
                            !positions.some((p) => p.id === userForm.positionId) && (
                              <SelectItem value={userForm.positionId}>
                                {editingUser?.employee?.position?.title || userForm.positionId}
                              </SelectItem>
                            )}
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="تاريخ التعيين" htmlFor="user-hire-date" error={formErrors.hireDate}>
                      <Input id="user-hire-date" type="date" value={userForm.hireDate} onChange={(event) => updateUserForm("hireDate", event.target.value)} className="h-11 rounded-2xl" />
                    </FormField>
                    <FormField label="نوع العقد">
                      <Select value={userForm.contractType} onValueChange={(value) => updateUserForm("contractType", value || "FULL_TIME")}>
                        <SelectTrigger className="h-11 rounded-2xl">
                          <SelectValue placeholder="نوع العقد" />
                        </SelectTrigger>
                        <SelectContent align="end">
                          {CONTRACT_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="الراتب الأساسي" htmlFor="user-base-salary" error={formErrors.baseSalary}>
                      <Input id="user-base-salary" type="number" value={userForm.baseSalary} onChange={(event) => updateUserForm("baseSalary", event.target.value)} className="h-11 rounded-2xl" min={0} max={10000000} step="0.01" />
                    </FormField>
                    <FormField label={t("users.form.active")} error={formErrors.isActive}>
                      <div className="flex min-h-11 items-center justify-between rounded-2xl border border-border bg-background px-4">
                        <div>
                          <p className="text-sm font-medium text-foreground">تفعيل الحساب</p>
                          <p className="text-xs text-muted-foreground">منع تسجيل الدخول إذا تم إيقاف المفتاح.</p>
                        </div>
                        <Switch checked={userForm.isActive} onCheckedChange={(value) => updateUserForm("isActive", Boolean(value))} />
                      </div>
                    </FormField>
                  </div>
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="mt-0">
              <Button type="button" variant="outline" onClick={closeEditor} disabled={submitting}>
                {t("users.actions.cancel")}
              </Button>
              <Button type="button" onClick={() => void saveUser()} disabled={submitting}>
                {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                {submitting
                  ? t("users.actions.saving")
                  : editorMode === "edit"
                    ? t("users.actions.update")
                    : t("users.actions.create")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogContent className="max-w-[calc(100%-1.5rem)] sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>{t("users.inviteNewUser")}</DialogTitle>
              <DialogDescription>أرسل دعوة مباشرة بالبريد الإلكتروني بدل إنشاء كلمة مرور يدويًا.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField label={t("users.form.firstName")} htmlFor="invite-first-name" error={inviteErrors.firstName}>
                <Input id="invite-first-name" value={inviteForm.firstName} onChange={(event) => setInviteForm((current) => ({ ...current, firstName: event.target.value }))} className="h-11 rounded-2xl" />
              </FormField>
              <FormField label={t("users.form.lastName")} htmlFor="invite-last-name" error={inviteErrors.lastName}>
                <Input id="invite-last-name" value={inviteForm.lastName} onChange={(event) => setInviteForm((current) => ({ ...current, lastName: event.target.value }))} className="h-11 rounded-2xl" />
              </FormField>
              <FormField label={t("users.form.email")} htmlFor="invite-email" error={inviteErrors.email} className="md:col-span-2">
                <Input id="invite-email" type="email" value={inviteForm.email} onChange={(event) => setInviteForm((current) => ({ ...current, email: event.target.value }))} className="h-11 rounded-2xl" />
              </FormField>
              <FormField label={t("users.form.role")} error={inviteErrors.role} className="md:col-span-2">
                <Select value={inviteForm.role} onValueChange={(value) => setInviteForm((current) => ({ ...current, role: value || "AGENT" }))}>
                  <SelectTrigger className="h-11 rounded-2xl">
                    <SelectValue placeholder={t("users.form.role")} />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {Object.entries(roles).map(([roleKey, roleData]) => (
                      <SelectItem key={roleKey} value={roleKey}>
                        {roleData.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteDialogOpen(false)}>
                {t("users.actions.cancel")}
              </Button>
              <Button type="button" onClick={() => void sendInvitation()} disabled={inviteSubmitting}>
                {inviteSubmitting ? <Loader2 className="size-4 animate-spin" /> : <MailPlus className="size-4" />}
                {inviteSubmitting ? t("users.actions.saving") : t("users.actions.sendInvite")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={detailsUser !== null} onOpenChange={(open) => (!open ? setDetailsUser(null) : undefined)}>
          <DialogContent className="max-w-[calc(100%-1.5rem)] gap-0 overflow-hidden p-0 sm:max-w-3xl">
            <DialogHeader className="border-b border-border/70 px-5 py-4">
              <div className="flex items-center gap-3">
                <Avatar size="lg">
                  <AvatarImage src={getImageUrl(detailsUser?.avatar) || undefined} alt={detailsUser?.email || ""} />
                  <AvatarFallback>{getInitials(detailsUser?.firstName, detailsUser?.lastName)}</AvatarFallback>
                </Avatar>
                <div>
                  <DialogTitle>{detailsUser?.firstName} {detailsUser?.lastName}</DialogTitle>
                  <DialogDescription>{detailsUser?.email}</DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <ScrollArea className="max-h-[70vh]">
              <div className="grid gap-4 px-5 py-5 md:grid-cols-2">
                <div className="relative overflow-hidden rounded-[1.5rem] border border-border/70 bg-card/80 p-4">
                  <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-violet-500/20 to-transparent" />
                  <div className="flex items-center gap-2 mb-4">
                    <div className="rounded-lg bg-violet-500/10 p-1.5">
                      <Eye className="size-3.5 text-violet-600" />
                    </div>
                    <p className="font-medium text-foreground">المعلومات الأساسية</p>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">البريد الإلكتروني</span><span>{detailsUser?.email}</span></div>
                    <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">الهاتف</span><span>{detailsUser?.phone || "-"}</span></div>
                    <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">الدور</span><Badge className={cn("rounded-full border", getRoleBadgeClassName(detailsUser?.role || ""))}>{getRoleDisplayName(detailsUser?.role || "-", detailsUser)}</Badge></div>
                    <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">الحالة</span><Badge className={cn("rounded-full border", getAccountStatusClassName(Boolean(detailsUser?.isActive)))}>{detailsUser?.isActive ? "نشط" : "غير نشط"}</Badge></div>
                    <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">توثيق البريد</span><span>{detailsUser?.isEmailVerified ? "نعم" : "لا"}</span></div>
                    <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">آخر دخول</span><span>{formatDateTime(detailsUser?.lastLoginAt)}</span></div>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-[1.5rem] border border-border/70 bg-card/80 p-4">
                  <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-emerald-500/20 to-transparent" />
                  <div className="flex items-center gap-2 mb-4">
                    <div className="rounded-lg bg-emerald-500/10 p-1.5">
                      <Users className="size-3.5 text-emerald-600" />
                    </div>
                    <p className="font-medium text-foreground">ملف الموظف</p>
                  </div>
                  {detailsUser?.employee ? (
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">رقم الموظف</span><span>{detailsUser.employee.employeeNumber || "-"}</span></div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">القسم</span>
                        {detailsUser.employee.department?.name ? (
                          <Badge variant="outline" className="rounded-full" style={detailsDepartmentColor ? { backgroundColor: `${detailsDepartmentColor}20`, borderColor: detailsDepartmentColor, color: detailsDepartmentColor } : undefined}>
                            {detailsUser.employee.department.name}
                          </Badge>
                        ) : (
                          <span>-</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">المنصب</span><span>{detailsUser.employee.position?.title || "-"}</span></div>
                      <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">حالة الموظف</span><Badge className={cn("rounded-full border", getEmployeeStatusClassName(detailsUser.employee.status))}>{getEmployeeStatusLabel(detailsUser.employee.status)}</Badge></div>
                      <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">تاريخ التعيين</span><span>{formatDate(detailsUser.employee.hireDate)}</span></div>
                    </div>
                  ) : (
                    <div className="rounded-[1.25rem] bg-muted/40 p-4 text-sm text-muted-foreground">لا يوجد ملف موظف مرتبط بهذا الحساب حتى الآن.</div>
                  )}
                </div>

                <div className="relative overflow-hidden rounded-[1.5rem] border border-border/70 bg-card/80 p-4 md:col-span-2">
                  <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-indigo-500/20 to-transparent" />
                  <p className="mb-3 font-medium text-foreground">معلومات إضافية</p>
                  <div className="grid gap-3 text-sm md:grid-cols-3">
                    <div className="rounded-[1rem] bg-muted/40 p-3"><p className="text-xs text-muted-foreground">تاريخ الإنشاء</p><p className="mt-1">{formatDateTime(detailsUser?.createdAt)}</p></div>
                    <div className="rounded-[1rem] bg-muted/40 p-3"><p className="text-xs text-muted-foreground">آخر تحديث</p><p className="mt-1">{formatDateTime(detailsUser?.updatedAt)}</p></div>
                    <div className="rounded-[1rem] bg-muted/40 p-3"><p className="text-xs text-muted-foreground">معرّف المستخدم</p><p className="mt-1 break-all">{detailsUser?.id || "-"}</p></div>
                  </div>
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="mt-0">
              <Button type="button" variant="outline" onClick={() => setDetailsUser(null)}>
                إغلاق
              </Button>
              <Button type="button" onClick={() => { if (detailsUser) { openEditUser(detailsUser); setDetailsUser(null); } }}>
                <Pencil className="size-4" />
                تعديل
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={pendingAction !== null} onOpenChange={(open) => (!open ? setPendingAction(null) : undefined)}>
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogMedia>
                {pendingAction?.kind === "reset-password" ? <KeyRound className="size-5" /> : pendingAction?.kind === "cancel-invitation" ? <Mail className="size-5" /> : <Trash2 className="size-5" />}
              </AlertDialogMedia>
              <AlertDialogTitle>{currentActionTitle}</AlertDialogTitle>
              <AlertDialogDescription>{currentActionDescription}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={actionLoading}>إلغاء</AlertDialogCancel>
              <AlertDialogAction variant={pendingAction?.kind === "reset-password" ? "default" : "destructive"} disabled={actionLoading} onClick={() => void runPendingAction()}>
                {actionLoading ? <Loader2 className="size-4 animate-spin" /> : null}
                تأكيد
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
};

export default UsersManagement;
