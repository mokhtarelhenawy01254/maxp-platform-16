import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Eye,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "../components/ui/alert";
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
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
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
import {
  BusinessFilterSheet,
  BusinessMobileSearchPanel,
} from "../components/business/BusinessFilters";

import {
  BusinessPageHero,
  BusinessPageShell,
  BusinessSectionPanel,
} from "../components/business/BusinessSurface";
import { cn } from "../lib/utils";
import tokenManager from "../utils/tokenManager";
import { buildApiUrl } from "../utils/urlHelper";
import { getImageUrl } from "../utils/imageUrl";

type AvailabilityValue = "available" | "busy" | "away" | "offline";

type UserRecord = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  role?: string | null;
  skills?: string | string[] | null;
  department?: string | null;
  availability?: AvailabilityValue | string | null;
  isActive: boolean;
  isEmailVerified?: boolean;
  lastLoginAt?: string | null;
  avatar?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type FiltersState = {
  search: string;
  isActive: string;
};

type UserFormState = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  role: string;
  skills: string;
  department: string;
  availability: AvailabilityValue;
  isActive: boolean;
};

type UserFormErrors = Partial<Record<keyof UserFormState, string>>;

type UsersListResponse = {
  success?: boolean;
  message?: string;
  data?: UserRecord[];
  pagination?: {
    pages?: number;
    total?: number;
  };
};

type UserMutationResponse = {
  success?: boolean;
  message?: string;
  data?: UserRecord;
};

type SettingsResponse = {
  success?: boolean;
  message?: string;
  data?: {
    permissions?: Record<string, unknown>;
  };
};

const FALLBACK_ROLES = ["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER", "AGENT"];
const PAGE_SIZE_OPTIONS = ["10", "25", "50", "100"];

const AVAILABILITY_OPTIONS: Array<{ value: AvailabilityValue; label: string }> = [
  { value: "available", label: "متاح" },
  { value: "busy", label: "مشغول" },
  { value: "away", label: "بعيد" },
  { value: "offline", label: "غير متصل" },
];

const createInitialForm = (): UserFormState => ({
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  phone: "",
  role: "",
  skills: "",
  department: "",
  availability: "available",
  isActive: true,
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

const normalizeSkillsValue = (value?: string | string[] | null) =>
  Array.isArray(value) ? value.join(", ") : value ?? "";

const getInitials = (firstName?: string | null, lastName?: string | null) =>
  `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.trim() || "SA";

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "لم يسجل دخول بعد";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "لم يسجل دخول بعد";
  }

  return date.toLocaleString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getRoleLabel = (role?: string | null) => {
  switch (role) {
    case "SUPER_ADMIN":
      return "سوبر أدمن";
    case "COMPANY_ADMIN":
      return "مدير شركة";
    case "MANAGER":
      return "مدير";
    case "AGENT":
      return "موظف";
    default:
      return role?.replace(/_/g, " ") || "غير محدد";
  }
};

const getAvailabilityLabel = (value?: string | null) => {
  switch (value) {
    case "available":
      return "متاح";
    case "busy":
      return "مشغول";
    case "away":
      return "بعيد";
    case "offline":
      return "غير متصل";
    default:
      return "غير محدد";
  }
};

const getRoleClassName = (role?: string | null) => {
  switch (role) {
    case "SUPER_ADMIN":
      return "border-violet-200 bg-violet-500/10 text-violet-700";
    case "COMPANY_ADMIN":
      return "border-sky-200 bg-sky-500/10 text-sky-700";
    case "MANAGER":
      return "border-amber-200 bg-amber-500/10 text-amber-700";
    case "AGENT":
      return "border-emerald-200 bg-emerald-500/10 text-emerald-700";
    default:
      return "border-border bg-muted text-foreground";
  }
};

const getAvailabilityClassName = (value?: string | null) => {
  switch (value) {
    case "available":
      return "border-emerald-200 bg-emerald-500/10 text-emerald-700";
    case "busy":
      return "border-rose-200 bg-rose-500/10 text-rose-700";
    case "away":
      return "border-amber-200 bg-amber-500/10 text-amber-700";
    case "offline":
      return "border-slate-200 bg-slate-500/10 text-slate-700";
    default:
      return "border-border bg-muted text-foreground";
  }
};

const getStatusClassName = (isActive: boolean) =>
  isActive
    ? "border-emerald-200 bg-emerald-500/10 text-emerald-700"
    : "border-slate-200 bg-slate-500/10 text-slate-700";

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

const SuperAdminUsersManagement: React.FC = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [availableRoles, setAvailableRoles] = useState<string[]>(FALLBACK_ROLES);
  const [loading, setLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<FiltersState>({
    search: "",
    isActive: "",
  });
  const [searchInput, setSearchInput] = useState("");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit" | null>(null);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [detailsUser, setDetailsUser] = useState<UserRecord | null>(null);
  const [pendingDeleteUser, setPendingDeleteUser] = useState<UserRecord | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [formData, setFormData] = useState<UserFormState>(createInitialForm);
  const [formErrors, setFormErrors] = useState<UserFormErrors>({});

  const mountedRef = useRef(true);
  const requestRef = useRef(0);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const redirectToLogin = (message?: string) => {
    setError(message || "انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى");
    tokenManager.clearTokens();
    window.location.href = "/auth/login";
  };

  const fetchUsers = useCallback(async () => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (filters.search.trim()) {
        params.set("search", filters.search.trim());
      }
      if (filters.isActive) {
        params.set("isActive", filters.isActive);
      }

      const response = await fetch(
        buildApiUrl(`super-admin/users?${params.toString()}`),
        {
          headers: getAuthHeaders(),
        },
      );

      let payload: UsersListResponse = {};
      try {
        payload = (await response.json()) as UsersListResponse;
      } catch {
        payload = {};
      }

      if (!response.ok) {
        if (response.status === 401) {
          redirectToLogin(payload.message);
          return;
        }
        throw new Error(payload.message || `HTTP ${response.status}`);
      }

      if (!mountedRef.current || requestId !== requestRef.current) {
        return;
      }

      if (payload.success) {
        const nextUsers = Array.isArray(payload.data) ? payload.data : [];
        setUsers(nextUsers);
        setTotalPages(payload.pagination?.pages || 0);
        setTotalCount(payload.pagination?.total || nextUsers.length);
        setError(null);
      } else {
        setUsers([]);
        setTotalPages(0);
        setTotalCount(0);
        setError(payload.message || "فشل في تحميل مستخدمي السوبر أدمن");
      }
    } catch (fetchError: unknown) {
      if (!mountedRef.current || requestId !== requestRef.current) {
        return;
      }

      setUsers([]);
      setTotalPages(0);
      setTotalCount(0);
      setError(getErrorMessage(fetchError, "فشل في تحميل مستخدمي السوبر أدمن"));
    } finally {
      if (mountedRef.current && requestId === requestRef.current) {
        setLoading(false);
      }
    }
  }, [filters.isActive, filters.search, limit, page]);

  const fetchRoles = useCallback(async () => {
    try {
      setRolesLoading(true);
      const response = await fetch(buildApiUrl("super-admin/dev/settings"), {
        headers: getAuthHeaders(),
      });

      let payload: SettingsResponse = {};
      try {
        payload = (await response.json()) as SettingsResponse;
      } catch {
        payload = {};
      }

      if (!response.ok) {
        if (response.status === 401) {
          redirectToLogin(payload.message);
          return;
        }
        throw new Error(payload.message || `HTTP ${response.status}`);
      }

      const nextRoles = Object.keys(payload.data?.permissions || {});
      setAvailableRoles(nextRoles.length > 0 ? nextRoles : FALLBACK_ROLES);
    } catch {
      setAvailableRoles(FALLBACK_ROLES);
    } finally {
      if (mountedRef.current) {
        setRolesLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    void fetchRoles();
  }, [fetchRoles]);

  const resetForm = () => {
    setFormData(createInitialForm());
    setFormErrors({});
  };

  const closeEditor = () => {
    setEditorMode(null);
    setEditingUser(null);
    resetForm();
  };

  const updateForm = <Key extends keyof UserFormState>(
    field: Key,
    value: UserFormState[Key],
  ) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));

    setFormErrors((current) =>
      current[field]
        ? {
            ...current,
            [field]: "",
          }
        : current,
    );
  };

  const openCreateDialog = () => {
    const nextForm = createInitialForm();
    nextForm.role = availableRoles.includes("SUPER_ADMIN")
      ? "SUPER_ADMIN"
      : (availableRoles[0] ?? "");
    setFormData(nextForm);
    setFormErrors({});
    setEditingUser(null);
    setEditorMode("create");
  };

  const openEditDialog = (userItem: UserRecord) => {
    setFormData({
      firstName: userItem.firstName || "",
      lastName: userItem.lastName || "",
      email: userItem.email || "",
      password: "",
      phone: userItem.phone || "",
      role: userItem.role || "",
      skills: normalizeSkillsValue(userItem.skills),
      department: userItem.department || "",
      availability:
        (userItem.availability as AvailabilityValue | undefined) || "available",
      isActive: userItem.isActive ?? true,
    });
    setFormErrors({});
    setEditingUser(userItem);
    setEditorMode("edit");
  };

  const validateForm = () => {
    const nextErrors: UserFormErrors = {};

    if (!formData.firstName.trim()) {
      nextErrors.firstName = "الاسم الأول مطلوب";
    }

    if (!formData.lastName.trim()) {
      nextErrors.lastName = "الاسم الأخير مطلوب";
    }

    if (!formData.email.trim()) {
      nextErrors.email = "البريد الإلكتروني مطلوب";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      nextErrors.email = "البريد الإلكتروني غير صحيح";
    }

    if (editorMode !== "edit" && !formData.password.trim()) {
      nextErrors.password = "كلمة المرور مطلوبة";
    } else if (
      formData.password.trim() &&
      formData.password.trim().length < 8
    ) {
      nextErrors.password = "كلمة المرور يجب أن تكون 8 أحرف على الأقل";
    }

    if (formData.phone.trim() && !/^[+0-9\\s()\\-]{6,20}$/.test(formData.phone.trim())) {
      nextErrors.phone = "تنسيق رقم الهاتف غير صحيح";
    }

    if (!formData.role) {
      nextErrors.role = "اختيار الدور مطلوب";
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const applySearch = () => {
    setPage(1);
    setFilters((current) => ({
      ...current,
      search: searchInput.trim(),
    }));
  };

  const clearFilters = () => {
    setSearchInput("");
    setFilters({
      search: "",
      isActive: "",
    });
    setPage(1);
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload: Record<string, unknown> = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        role: formData.role,
        skills: formData.skills.trim() || undefined,
        department: formData.department.trim() || undefined,
        availability: formData.availability,
        isActive: formData.isActive,
      };

      if (formData.password.trim()) {
        payload["password"] = formData.password.trim();
      }

      const isEditing = editorMode === "edit" && editingUser;
      const response = await fetch(
        buildApiUrl(
          isEditing
            ? `super-admin/users/${editingUser.id}`
            : "super-admin/users",
        ),
        {
          method: isEditing ? "PUT" : "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        },
      );

      let result: UserMutationResponse = {};
      try {
        result = (await response.json()) as UserMutationResponse;
      } catch {
        result = {};
      }

      if (!response.ok) {
        if (response.status === 401) {
          redirectToLogin(result.message);
          return;
        }
        throw new Error(result.message || `HTTP ${response.status}`);
      }

      if (result.success) {
        closeEditor();
        void fetchUsers();
      } else {
        setError(result.message || "فشل في حفظ المستخدم");
      }
    } catch (submitError: unknown) {
      setError(getErrorMessage(submitError, "فشل في حفظ المستخدم"));
    } finally {
      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  };

  const handleDelete = async () => {
    if (!pendingDeleteUser) {
      return;
    }

    try {
      setDeleteLoading(true);
      setError(null);

      const response = await fetch(
        buildApiUrl(`super-admin/users/${pendingDeleteUser.id}`),
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        },
      );

      let result: UserMutationResponse = {};
      try {
        result = (await response.json()) as UserMutationResponse;
      } catch {
        result = {};
      }

      if (!response.ok) {
        if (response.status === 401) {
          redirectToLogin(result.message);
          return;
        }
        throw new Error(result.message || `HTTP ${response.status}`);
      }

      if (result.success) {
        setPendingDeleteUser(null);

        if (users.length === 1 && page > 1) {
          setPage((current) => current - 1);
        } else {
          void fetchUsers();
        }
      } else {
        setError(result.message || "فشل في حذف المستخدم");
      }
    } catch (deleteError: unknown) {
      setError(getErrorMessage(deleteError, "فشل في حذف المستخدم"));
    } finally {
      if (mountedRef.current) {
        setDeleteLoading(false);
      }
    }
  };

  const filterCount = Number(Boolean(filters.search)) + Number(Boolean(filters.isActive));

  const activeFilterLabels = useMemo(() => {
    const labels: string[] = [];
    if (filters.search) {
      labels.push(`بحث: ${filters.search}`);
    }
    if (filters.isActive === "true") {
      labels.push("الحسابات النشطة");
    }
    if (filters.isActive === "false") {
      labels.push("الحسابات غير النشطة");
    }
    return labels;
  }, [filters.isActive, filters.search]);

  const visibleFrom = totalCount === 0 ? 0 : (page - 1) * limit + 1;
  const visibleTo = totalCount === 0 ? 0 : Math.min(page * limit, totalCount);

  const userStats = useMemo(() => {
    const active = users.filter((u) => u.isActive).length;
    const superAdmins = users.filter((u) => u.role === "SUPER_ADMIN").length;
    return { active, superAdmins };
  }, [users]);

  return (
    <div className="w-full space-y-4" dir="rtl">
      {/* Linear Taste Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-center shrink-0">
            <UserRound className="size-4 text-foreground/80" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                إدارة المستخدمين
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] font-mono tabular-nums text-muted-foreground">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                {totalCount} مستخدم • صفحة {page} من {Math.max(totalPages, 1)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              التحكم في حسابات مسؤولي المنصة والصلاحيات وتتبع حالات النشاط
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void fetchUsers()}
            disabled={loading}
            className="h-8 gap-1.5 text-xs font-mono active:scale-[0.98] transition-transform"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            <span>تحديث</span>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={openCreateDialog}
            className="h-8 gap-1.5 text-xs font-medium bg-primary text-primary-foreground active:scale-[0.98] transition-transform"
          >
            <Plus className="size-3.5" />
            <span>إضافة مستخدم</span>
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive" className="py-2.5">
          <AlertTriangle className="size-4" />
          <AlertTitle className="text-xs font-bold">تعذر تحميل البيانات</AlertTitle>
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      ) : null}

      {/* Unified Telemetry Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-x-reverse divide-y sm:divide-y-0 divide-border/60 rounded-xl border border-border/60 bg-card overflow-hidden">
        <div className="p-3 sm:p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">إجمالي المستخدمين</span>
            <span className="size-1.5 rounded-full bg-blue-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-foreground">
              {totalCount}
            </span>
          </div>
        </div>

        <div className="p-3 sm:p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">حسابات نشطة</span>
            <span className="size-1.5 rounded-full bg-emerald-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
              {userStats.active}
            </span>
          </div>
        </div>

        <div className="p-3 sm:p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">مدراء النظام</span>
            <span className="size-1.5 rounded-full bg-purple-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-foreground">
              {userStats.superAdmins}
            </span>
          </div>
        </div>

        <div className="p-3 sm:p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">حد العرض للصفحة</span>
            <span className="size-1.5 rounded-full bg-amber-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-foreground">
              {limit} <span className="text-xs font-sans text-muted-foreground font-normal">سجل</span>
            </span>
          </div>
        </div>
      </div>

      {/* Streamlined Filter Bar & Table Chassis */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-border/60 p-3 sm:p-4">
          <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                id="super-admin-users-search-desktop"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    applySearch();
                  }
                }}
                placeholder="ابحث بالاسم أو البريد..."
                className="h-8 pr-8 text-xs font-mono"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs font-mono active:scale-[0.98]"
              onClick={applySearch}
            >
              بحث
            </Button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Select
              name="super-admin-users-status-filter-desktop"
              value={filters.isActive || null}
              onValueChange={(value) => {
                setPage(1);
                setFilters((current) => ({
                  ...current,
                  isActive: value || "",
                }));
              }}
            >
              <SelectTrigger aria-label="حالة الحساب" className="h-8 text-xs font-mono min-w-[130px]">
                <SelectValue placeholder="كل الحالات" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value={null}>كل الحالات</SelectItem>
                <SelectItem value="true">الحسابات النشطة</SelectItem>
                <SelectItem value="false">الحسابات غير النشطة</SelectItem>
              </SelectContent>
            </Select>

            {filterCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={clearFilters}
                title="مسح الفلاتر"
              >
                <X className="size-3.5" />
              </Button>
            )}
          </div>
        </div>

        <div className="p-3 sm:p-4">

        {loading && users.length === 0 ? (
          <div className="flex min-h-[18rem] items-center justify-center rounded-[2rem] border border-dashed border-border/70 bg-background/70">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              جاري تحميل المستخدمين...
            </div>
          </div>
        ) : users.length === 0 ? (
          <div className="flex min-h-[18rem] flex-col items-center justify-center rounded-[2rem] border border-dashed border-border/70 bg-background/70 px-6 text-center">
            <UserRound className="mb-3 size-10 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground">
              لا يوجد مستخدمون مطابقون
            </h3>
            <p className="mt-2 max-w-md text-sm leading-7 text-muted-foreground">
              جرّب توسيع البحث أو مسح الفلاتر، أو أضف مستخدمًا جديدًا من الزر العلوي.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {users.map((userItem) => (
                <div
                  key={userItem.id}
                  className="rounded-[2rem] border border-border/70 bg-background/80 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="size-12 border border-white/20">
                        <AvatarImage src={getImageUrl(userItem.avatar) || undefined} alt={userItem.email} />
                        <AvatarFallback>{getInitials(userItem.firstName, userItem.lastName)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-foreground">
                          {userItem.firstName} {userItem.lastName}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {userItem.email}
                        </p>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="outline" size="icon-sm" className="rounded-full" />
                        }
                      >
                        <MoreHorizontal className="size-4" />
                        <span className="sr-only">إجراءات المستخدم</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDetailsUser(userItem)}>
                          <Eye className="size-4" />
                          عرض التفاصيل
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditDialog(userItem)}>
                          <Pencil className="size-4" />
                          تعديل المستخدم
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setPendingDeleteUser(userItem)}
                        >
                          <Trash2 className="size-4" />
                          حذف المستخدم
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge className={cn("rounded-full border px-3 py-1", getRoleClassName(userItem.role))}>
                      {getRoleLabel(userItem.role)}
                    </Badge>
                    <Badge className={cn("rounded-full border px-3 py-1", getStatusClassName(userItem.isActive))}>
                      {userItem.isActive ? "نشط" : "غير نشط"}
                    </Badge>
                    <Badge
                      className={cn(
                        "rounded-full border px-3 py-1",
                        getAvailabilityClassName(userItem.availability),
                      )}
                    >
                      {getAvailabilityLabel(userItem.availability)}
                    </Badge>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    {userItem.department && <span>{userItem.department}</span>}
                    {userItem.department && userItem.phone && <span>·</span>}
                    {userItem.phone && <span dir="ltr">{userItem.phone}</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-hidden rounded-[2rem] border border-border/70 md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">المستخدم</TableHead>
                    <TableHead className="text-right">الدور</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((userItem) => (
                    <TableRow key={userItem.id}>
                      <TableCell>
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar className="size-10 border border-white/20">
                            <AvatarImage src={getImageUrl(userItem.avatar) || undefined} alt={userItem.email} />
                            <AvatarFallback>
                              {getInitials(userItem.firstName, userItem.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">
                              {userItem.firstName} {userItem.lastName}
                            </p>
                            <p className="truncate text-sm text-muted-foreground">
                              {userItem.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("rounded-full border px-3 py-1", getRoleClassName(userItem.role))}>
                          {getRoleLabel(userItem.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1.5">
                          <Badge className={cn("rounded-full border px-2.5 py-0.5 text-xs", getStatusClassName(userItem.isActive))}>
                            {userItem.isActive ? "نشط" : "غير نشط"}
                          </Badge>
                          <Badge
                            className={cn(
                              "rounded-full border px-2.5 py-0.5 text-xs",
                              getAvailabilityClassName(userItem.availability),
                            )}
                          >
                            {getAvailabilityLabel(userItem.availability)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="outline" size="icon-sm" className="rounded-full" />
                            }
                          >
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">إجراءات المستخدم</span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setDetailsUser(userItem)}>
                              <Eye className="size-4" />
                              عرض التفاصيل
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(userItem)}>
                              <Pencil className="size-4" />
                              تعديل المستخدم
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setPendingDeleteUser(userItem)}
                            >
                              <Trash2 className="size-4" />
                              حذف المستخدم
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-3 border-t border-border/60 pt-4 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">
                {totalCount > 0
                  ? `عرض ${visibleFrom} إلى ${visibleTo} من أصل ${totalCount} مستخدم`
                  : "لا توجد نتائج حالية"}
              </p>

              <div className="flex items-center justify-between gap-2 md:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-2xl"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  السابق
                </Button>
                <div className="rounded-full border border-border/70 px-4 py-2 text-sm text-muted-foreground">
                  صفحة {page} من {Math.max(totalPages, 1)}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-2xl"
                  disabled={loading || (totalPages > 0 ? page >= totalPages : users.length < limit)}
                  onClick={() =>
                    setPage((current) =>
                      totalPages > 0 ? Math.min(totalPages, current + 1) : current + 1,
                    )
                  }
                >
                  التالي
                </Button>
              </div>
            </div>
          </>
        )}
        </div>
      </div>
      
      <Dialog open={editorMode !== null} onOpenChange={(open) => !open && closeEditor()}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editorMode === "edit" ? "تعديل مستخدم" : "إضافة مستخدم جديد"}
            </DialogTitle>
            <DialogDescription>
              أنشئ أو عدّل الحساب الإداري مع الحفاظ على نفس الـ API الحالية.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="الاسم الأول" htmlFor="super-admin-user-first-name" error={formErrors.firstName}>
              <Input
                id="super-admin-user-first-name"
                value={formData.firstName}
                onChange={(event) => updateForm("firstName", event.target.value)}
                className="h-11 rounded-2xl"
                maxLength={50}
              />
            </FormField>

            <FormField label="الاسم الأخير" htmlFor="super-admin-user-last-name" error={formErrors.lastName}>
              <Input
                id="super-admin-user-last-name"
                value={formData.lastName}
                onChange={(event) => updateForm("lastName", event.target.value)}
                className="h-11 rounded-2xl"
                maxLength={50}
              />
            </FormField>

            <FormField
              label="البريد الإلكتروني"
              htmlFor="super-admin-user-email"
              error={formErrors.email}
              className="md:col-span-2"
            >
              <Input
                id="super-admin-user-email"
                type="email"
                value={formData.email}
                onChange={(event) => updateForm("email", event.target.value)}
                className="h-11 rounded-2xl"
                maxLength={120}
              />
            </FormField>

            <FormField
              label={editorMode === "edit" ? "كلمة المرور الجديدة" : "كلمة المرور"}
              htmlFor="super-admin-user-password"
              error={formErrors.password}
              hint={
                editorMode === "edit"
                  ? "اترك الحقل فارغًا إذا لم ترد تغيير كلمة المرور."
                  : "8 أحرف على الأقل."
              }
            >
              <Input
                id="super-admin-user-password"
                type="password"
                value={formData.password}
                onChange={(event) => updateForm("password", event.target.value)}
                className="h-11 rounded-2xl"
                maxLength={128}
              />
            </FormField>

            <FormField label="الدور" error={formErrors.role}>
              <Select
                name="super-admin-user-role"
                value={formData.role || null}
                onValueChange={(value) => updateForm("role", value || "")}
              >
                <SelectLabel className="sr-only">الدور</SelectLabel>
                <SelectTrigger aria-label="الدور" className="h-11 rounded-2xl">
                  <SelectValue
                    placeholder={rolesLoading ? "جاري تحميل الأدوار..." : "اختر الدور"}
                  />
                </SelectTrigger>
                <SelectContent align="end">
                  {availableRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {getRoleLabel(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="الهاتف" htmlFor="super-admin-user-phone" error={formErrors.phone}>
              <Input
                id="super-admin-user-phone"
                value={formData.phone}
                onChange={(event) => updateForm("phone", event.target.value)}
                className="h-11 rounded-2xl"
                placeholder="+20 1xx xxx xxxx"
              />
            </FormField>

            <FormField label="القسم" htmlFor="super-admin-user-department">
              <Input
                id="super-admin-user-department"
                value={formData.department}
                onChange={(event) => updateForm("department", event.target.value)}
                className="h-11 rounded-2xl"
                placeholder="مثال: Platform Ops"
              />
            </FormField>

            <FormField label="الحالة التشغيلية">
              <Select
                name="super-admin-user-availability"
                value={formData.availability}
                onValueChange={(value) =>
                  updateForm("availability", (value as AvailabilityValue) || "available")
                }
              >
                <SelectLabel className="sr-only">الحالة التشغيلية</SelectLabel>
                <SelectTrigger aria-label="الحالة التشغيلية" className="h-11 rounded-2xl">
                  <SelectValue placeholder="اختر الحالة" />
                </SelectTrigger>
                <SelectContent align="end">
                  {AVAILABILITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField
              label="المهارات"
              htmlFor="super-admin-user-skills"
              hint="اكتب المهارات مفصولة بفواصل إذا احتجت."
              className="md:col-span-2"
            >
              <Input
                id="super-admin-user-skills"
                value={formData.skills}
                onChange={(event) => updateForm("skills", event.target.value)}
                className="h-11 rounded-2xl"
                placeholder="React, Node.js, Security"
              />
            </FormField>

            <FormField label="تفعيل الحساب" className="md:col-span-2">
              <div className="flex min-h-12 items-center justify-between rounded-2xl border border-border bg-background px-4">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    السماح بتسجيل الدخول
                  </p>
                  <p className="text-xs text-muted-foreground">
                    أغلق المفتاح لتعطيل الحساب دون حذفه.
                  </p>
                </div>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => updateForm("isActive", Boolean(checked))}
                  aria-label="تفعيل المستخدم"
                />
              </div>
            </FormField>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeEditor}
              className="rounded-2xl"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              className="rounded-2xl"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
              {editorMode === "edit" ? "حفظ التعديلات" : "إنشاء المستخدم"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(detailsUser)} onOpenChange={(open) => !open && setDetailsUser(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>تفاصيل المستخدم</DialogTitle>
            <DialogDescription>
              عرض سريع للحالة الحالية والبيانات الرئيسية للحساب.
            </DialogDescription>
          </DialogHeader>

          {detailsUser ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-[2rem] border border-border/70 bg-muted/40 p-4">
                <Avatar className="size-14 border border-white/20">
                  <AvatarImage src={getImageUrl(detailsUser.avatar) || undefined} alt={detailsUser.email} />
                  <AvatarFallback>
                    {getInitials(detailsUser.firstName, detailsUser.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-lg font-semibold text-foreground">
                    {detailsUser.firstName} {detailsUser.lastName}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {detailsUser.email}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-background px-4 py-3">
                  <p className="text-xs text-muted-foreground">الدور</p>
                  <p className="mt-1 font-medium text-foreground">
                    {getRoleLabel(detailsUser.role)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background px-4 py-3">
                  <p className="text-xs text-muted-foreground">القسم</p>
                  <p className="mt-1 font-medium text-foreground">
                    {detailsUser.department || "-"}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background px-4 py-3">
                  <p className="text-xs text-muted-foreground">الهاتف</p>
                  <p className="mt-1 font-medium text-foreground">
                    {detailsUser.phone || "-"}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background px-4 py-3">
                  <p className="text-xs text-muted-foreground">التواجد</p>
                  <p className="mt-1 font-medium text-foreground">
                    {getAvailabilityLabel(detailsUser.availability)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background px-4 py-3">
                  <p className="text-xs text-muted-foreground">الحالة</p>
                  <p className="mt-1 font-medium text-foreground">
                    {detailsUser.isActive ? "نشط" : "غير نشط"}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background px-4 py-3">
                  <p className="text-xs text-muted-foreground">آخر تسجيل دخول</p>
                  <p className="mt-1 font-medium text-foreground">
                    {formatDateTime(detailsUser.lastLoginAt)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background px-4 py-3 md:col-span-2">
                  <p className="text-xs text-muted-foreground">المهارات</p>
                  <p className="mt-1 font-medium text-foreground">
                    {normalizeSkillsValue(detailsUser.skills) || "-"}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(pendingDeleteUser)}
        onOpenChange={(open) => !open && setPendingDeleteUser(null)}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <Trash2 className="size-5" />
            </AlertDialogMedia>
            <AlertDialogTitle>حذف المستخدم</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteUser
                ? `سيتم حذف ${pendingDeleteUser.firstName} ${pendingDeleteUser.lastName} نهائيًا من لوحة السوبر أدمن.`
                : "سيتم حذف المستخدم نهائيًا."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteLoading}
              onClick={handleDelete}
            >
              {deleteLoading ? <Loader2 className="size-4 animate-spin" /> : null}
              تأكيد الحذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SuperAdminUsersManagement;
