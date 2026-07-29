import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import {
  ArrowPathIcon,
  ClipboardDocumentIcon,
  KeyIcon,
  LinkIcon,
  PlusIcon,
  ShieldCheckIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import tokenManager from "../../utils/tokenManager";
import i18n from "../../i18n";
import { buildApiUrl } from "../../utils/urlHelper";

type TeamMember = {
  id: string;
  role: string;
  department?: string | null;
  availability?: string | null;
  user?: {
    firstName?: string;
    lastName?: string;
  };
  name?: string;
};

type Project = {
  id: string;
  name: string;
  status?: string;
};

type DevTaskCredential = {
  id: string;
  name: string;
  description: string | null;
  scopes: string[];
  isActive: boolean;
  keyPrefixMasked: string | null;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  revokedReason: string | null;
  defaultReporterMemberId: string | null;
  defaultReporterMemberName: string | null;
  defaultAssigneeMemberId: string | null;
  defaultAssigneeMemberName: string | null;
  defaultProjectId: string | null;
  defaultProjectName: string | null;
  createdAt: string;
  updatedAt: string;
};

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  secret?: {
    apiKey?: string;
  } | null;
};

type CredentialFormState = {
  name: string;
  description: string;
  scopes: string[];
  defaultReporterMemberId: string;
  defaultAssigneeMemberId: string;
  defaultProjectId: string;
  expiresAt: string;
  isActive: boolean;
};

const SCOPE_OPTIONS = [
  { value: "dev-tasks:read", label: "قراءة المهام" },
  { value: "dev-tasks:write", label: "إنشاء وتحديث حالة المهام" },
];

const createInitialForm = (): CredentialFormState => ({
  name: "",
  description: "",
  scopes: ["dev-tasks:read", "dev-tasks:write"],
  defaultReporterMemberId: "",
  defaultAssigneeMemberId: "",
  defaultProjectId: "",
  expiresAt: "",
  isActive: true,
});

const toDateTimeInputValue = (value?: string | null): string => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  const localDate = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
};

const formatDateTime = (value?: string | null): string => {
  if (!value) return "غير متوفر";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "غير متوفر";

  return parsed.toLocaleString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getAccessToken = (): string | null => tokenManager.getAccessToken();

const buildMemberLabel = (member: TeamMember): string => {
  if (member.name) {
    return member.name;
  }

  const firstName = member.user?.firstName || "";
  const lastName = member.user?.lastName || "";
  return `${firstName} ${lastName}`.trim() || member.id;
};

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

const hasWriteScope = (scopes: string[]): boolean =>
  scopes.includes("dev-tasks:write");

const DevTaskIntegrations: React.FC = () => {
  const [credentials, setCredentials] = useState<DevTaskCredential[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rotatingCredentialId, setRotatingCredentialId] = useState<string | null>(null);
  const [revokingCredentialId, setRevokingCredentialId] = useState<string | null>(null);
  const [editingCredential, setEditingCredential] = useState<DevTaskCredential | null>(null);
  const [formState, setFormState] = useState<CredentialFormState>(createInitialForm());
  const [revealedApiKey, setRevealedApiKey] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const externalApiBaseUrl = buildApiUrl("external/dev-tasks");
  const sampleAssigneeId = teamMembers[0]?.id || "TEAM_MEMBER_ID";

  const requestWithAuth = async <T,>(
    path: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> => {
    const token = getAccessToken();
    const response = await fetch(buildApiUrl(path), {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });

    const data = (await response.json()) as ApiResponse<T>;
    if (!response.ok || !data.success) {
      throw new Error(data.message || `فشل الطلب (${response.status})`);
    }

    return data;
  };

  const resetForm = () => {
    setEditingCredential(null);
    setFormState(createInitialForm());
  };

  const copyValue = async (value: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(successMessage);
    } catch (_error) {
      tToast.error("DevTaskIntegrations.msg_3354");
    }
  };

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [credentialsResponse, teamResponse, projectsResponse] = await Promise.all([
        requestWithAuth<DevTaskCredential[]>("super-admin/dev/task-integrations/credentials"),
        requestWithAuth<TeamMember[]>("super-admin/dev/team"),
        requestWithAuth<Project[]>("super-admin/dev/projects"),
      ]);

      setCredentials(credentialsResponse.data || []);
      setTeamMembers(teamResponse.data || []);
      setProjects(projectsResponse.data || []);
    } catch (error: unknown) {
      console.error("Failed to load dev task integrations:", error);
      setLoadError(getErrorMessage(error, i18n.t("DevTaskIntegrations.failed_load_0534")));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const startEditing = (credential: DevTaskCredential) => {
    setEditingCredential(credential);
    setFormState({
      name: credential.name,
      description: credential.description || "",
      scopes: credential.scopes,
      defaultReporterMemberId: credential.defaultReporterMemberId || "",
      defaultAssigneeMemberId: credential.defaultAssigneeMemberId || "",
      defaultProjectId: credential.defaultProjectId || "",
      expiresAt: toDateTimeInputValue(credential.expiresAt),
      isActive: credential.isActive,
    });
    setRevealedApiKey(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleScope = (scope: string) => {
    setFormState((current) => {
      const exists = current.scopes.includes(scope);
      return {
        ...current,
        scopes: exists
          ? current.scopes.filter((item) => item !== scope)
          : [...current.scopes, scope],
      };
    });
  };

  const saveCredential = async () => {
    try {
      if (!formState.name.trim()) {
        tToast.error("DevTaskIntegrations.name_required_1041");
        return;
      }

      if (formState.scopes.length === 0) {
        tToast.error("DevTaskIntegrations.msg_9272");
        return;
      }

      if (!formState.defaultProjectId) {
        tToast.error("DevTaskIntegrations.msg_dbef");
        return;
      }

      if (
        hasWriteScope(formState.scopes) &&
        !formState.defaultReporterMemberId
      ) {
        tToast.error("DevTaskIntegrations.msg_53d1");
        return;
      }

      setSubmitting(true);
      const payload = {
        name: formState.name,
        description: formState.description,
        scopes: formState.scopes,
        defaultReporterMemberId: formState.defaultReporterMemberId || null,
        defaultAssigneeMemberId: formState.defaultAssigneeMemberId || null,
        defaultProjectId: formState.defaultProjectId || null,
        expiresAt: formState.expiresAt
          ? new Date(formState.expiresAt).toISOString()
          : null,
        isActive: formState.isActive,
      };

      const response = editingCredential
        ? await requestWithAuth<DevTaskCredential>(
            `super-admin/dev/task-integrations/credentials/${editingCredential.id}`,
            {
              method: "PUT",
              body: JSON.stringify(payload),
            },
          )
        : await requestWithAuth<DevTaskCredential>(
            "super-admin/dev/task-integrations/credentials",
            {
              method: "POST",
              body: JSON.stringify(payload),
            },
          );

      toast.success(
        response.message ||
          (editingCredential ? "تم تحديث المفتاح" : "تم إنشاء المفتاح"),
      );

      if (response.secret?.apiKey) {
        setRevealedApiKey(response.secret.apiKey);
      }

      resetForm();
      await loadData();
    } catch (error: unknown) {
      console.error("Failed to save credential:", error);
      toast.error(getErrorMessage(error, i18n.t("DevTaskIntegrations.failed_save_96d4")));
    } finally {
      setSubmitting(false);
    }
  };

  const rotateCredential = async (credential: DevTaskCredential) => {
    try {
      setRotatingCredentialId(credential.id);
      const response = await requestWithAuth<DevTaskCredential>(
        `super-admin/dev/task-integrations/credentials/${credential.id}/rotate`,
        {
          method: "POST",
        },
      );

      if (response.secret?.apiKey) {
        setRevealedApiKey(response.secret.apiKey);
      }

      toast.success(response.message || "تم تدوير المفتاح");
      await loadData();
    } catch (error: unknown) {
      console.error("Failed to rotate credential:", error);
      toast.error(getErrorMessage(error, i18n.t("DevTaskIntegrations.msg_71f8")));
    } finally {
      setRotatingCredentialId(null);
    }
  };

  const revokeCredential = async (credential: DevTaskCredential) => {
    const confirmed = window.confirm(
      `هل تريد إلغاء المفتاح "${credential.name}"؟`,
    );
    if (!confirmed) {
      return;
    }

    try {
      setRevokingCredentialId(credential.id);
      const response = await requestWithAuth<null>(
        `super-admin/dev/task-integrations/credentials/${credential.id}`,
        {
          method: "DELETE",
        },
      );
      toast.success(response.message || "تم إلغاء المفتاح");
      if (editingCredential?.id === credential.id) {
        resetForm();
      }
      await loadData();
    } catch (error: unknown) {
      console.error("Failed to revoke credential:", error);
      toast.error(getErrorMessage(error, i18n.t("DevTaskIntegrations.msg_7de3")));
    } finally {
      setRevokingCredentialId(null);
    }
  };

  const listSnippet = `curl -X GET "${externalApiBaseUrl}" \\
  -H "x-api-key: YOUR_DEV_TASK_API_KEY"`;

  const createSnippet = `curl -X POST "${externalApiBaseUrl}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_DEV_TASK_API_KEY" \\
  -d '{
    "title": "مراجعة مشكلة في الدفع",
    "description": "طلب وارد من موقع خارجي",
    "priority": "HIGH",
    "type": "BUG",
    "assigneeId": "${sampleAssigneeId}"
  }'`;

  const statusSnippet = `curl -X PATCH "${externalApiBaseUrl}/TASK_ID/status" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_DEV_TASK_API_KEY" \\
  -d '{
    "status": "IN_PROGRESS",
    "progress": 35
  }'`;

  return (
    <div className="space-y-6" dir={i18n.dir()}>
      <section className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 p-6 text-white shadow-[0_28px_60px_-38px_rgba(15,23,42,0.95)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-sky-100">
              <ShieldCheckIcon className="h-4 w-4" />
              Super Admin Dev Tasks API
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight">
              مفاتيح ربط مهام السوبر أدمن مع أي موقع خارجي
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-200">
              أنشئ مفتاحًا مخصصًا لمهام التطوير، وحدد الـ reporter الافتراضي
              والمشروع المقيد والـ assignee، ثم استخدم نفس المفتاح من أي موقع
              خارجي لإنشاء المهام داخل المشروع المحدد فقط داخل لوحة السوبر
              أدمن.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4">
              <div className="text-xs text-slate-300">عدد المفاتيح</div>
              <div className="mt-2 text-2xl font-black">{credentials.length}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4">
              <div className="text-xs text-slate-300">الرابط الخارجي</div>
              <div className="mt-2 truncate text-sm font-semibold text-sky-100">
                /api/v1/external/dev-tasks
              </div>
            </div>
          </div>
        </div>
      </section>

      {revealedApiKey && (
        <section className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                المفتاح السري ظهر مرة واحدة فقط
              </div>
              <p className="mt-1 text-xs leading-6 text-emerald-700 dark:text-emerald-300">
                خزّنه في الموقع الخارجي الآن. لن يظهر كاملًا مرة أخرى بعد إغلاق
                هذه الرسالة.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void copyValue(revealedApiKey, "تم نسخ المفتاح")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-100"
            >
              <ClipboardDocumentIcon className="h-4 w-4" />
              نسخ المفتاح
            </button>
          </div>
          <pre className="mt-4 overflow-x-auto rounded-2xl bg-slate-950 px-4 py-4 text-xs text-emerald-200">
            {revealedApiKey}
          </pre>
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
                {editingCredential ? "تعديل المفتاح" : "إنشاء مفتاح جديد"}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                مفاتيح الكتابة تحتاج reporter افتراضي حتى تكون كل مهمة لها مالك
                واضح داخل النظام، وكل مفتاح يجب أن يكون مقيدًا بمشروع تطوير
                واحد.
              </p>
            </div>
            {editingCredential && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                إلغاء التعديل
              </button>
            )}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                اسم المفتاح
              </span>
              <input
                value={formState.name}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="مثل: website-bridge"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                وصف مختصر
              </span>
              <textarea
                value={formState.description}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={3}
                placeholder="هذا المفتاح سيُستخدم من landing page أو ERP خارجي..."
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>

            <div className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                الصلاحيات
              </span>
              <div className="grid gap-3 md:grid-cols-2">
                {SCOPE_OPTIONS.map((scopeOption) => {
                  const isChecked = formState.scopes.includes(scopeOption.value);
                  return (
                    <button
                      key={scopeOption.value}
                      type="button"
                      onClick={() => toggleScope(scopeOption.value)}
                      className={`rounded-2xl border px-4 py-3 text-right transition ${
                        isChecked
                          ? "border-sky-500 bg-sky-50 text-sky-900 dark:border-sky-400 dark:bg-sky-950/30 dark:text-sky-100"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                      }`}
                    >
                      <div className="text-sm font-bold">{scopeOption.label}</div>
                      <div className="mt-1 text-xs opacity-80">
                        {scopeOption.value}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Reporter افتراضي
              </span>
              <select
                value={formState.defaultReporterMemberId}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    defaultReporterMemberId: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="">اختر عضو الفريق</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {buildMemberLabel(member)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Assignee افتراضي
              </span>
              <select
                value={formState.defaultAssigneeMemberId}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    defaultAssigneeMemberId: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="">بدون assignee افتراضي</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {buildMemberLabel(member)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                المشروع المقيد والافتراضي
              </span>
              <select
                value={formState.defaultProjectId}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    defaultProjectId: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="">اختر مشروع التطوير</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                انتهاء الصلاحية
              </span>
              <input
                type="datetime-local"
                value={formState.expiresAt}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    expiresAt: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>

            <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
              <input
                type="checkbox"
                checked={formState.isActive}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    isActive: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              المفتاح فعّال
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void saveCredential()}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {editingCredential ? (
                <KeyIcon className="h-5 w-5" />
              ) : (
                <PlusIcon className="h-5 w-5" />
              )}
              {submitting
                ? "جارٍ الحفظ..."
                : editingCredential
                  ? "حفظ التعديلات"
                  : "إنشاء المفتاح"}
            </button>
            <button
              type="button"
              onClick={() => void loadData()}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ArrowPathIcon className="h-5 w-5" />
              تحديث البيانات
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-sky-600" />
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
                أمثلة الاستخدام
              </h2>
            </div>

            {[
              { title: "جلب المهام", snippet: listSnippet },
              { title: "إنشاء مهمة جديدة", snippet: createSnippet },
              { title: "تحديث الحالة", snippet: statusSnippet },
            ].map((item) => (
              <div
                key={item.title}
                className="mt-4 rounded-[22px] border border-slate-200 bg-slate-950 p-4 text-slate-100 dark:border-slate-700"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-sm font-bold text-white">{item.title}</div>
                  <button
                    type="button"
                    onClick={() => void copyValue(item.snippet, `تم نسخ ${item.title}`)}
                    className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-white/20"
                  >
                    <ClipboardDocumentIcon className="h-4 w-4" />
                    نسخ
                  </button>
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-sky-100">
                  {item.snippet}
                </pre>
              </div>
            ))}
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
              ما الذي يفعله المفتاح؟
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
              <p>
                `dev-tasks:read` يسمح للموقع الخارجي بقراءة المشروع المقيد
                وأعضاء فريقه ومهامه فقط.
              </p>
              <p>
                `dev-tasks:write` يسمح بإنشاء مهمة جديدة وتحديث حالتها عبر
                المفتاح نفسه داخل المشروع المقيد فقط.
              </p>
              <p>
                الـ reporter الافتراضي يُسجَّل كصاحب إنشاء داخلي لكل مهمة
                واردة من هذا التكامل، حتى يبقى السجل واضحًا داخل السوبر أدمن.
              </p>
            </div>
          </section>
        </div>
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
              المفاتيح الحالية
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              تستطيع تدوير المفتاح أو إلغاؤه دون التأثير على باقي مفاتيح الربط.
            </p>
          </div>
          <button
            type="button"
            onClick={resetForm}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <PlusIcon className="h-4 w-4" />
            مفتاح جديد
          </button>
        </div>

        {loading ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            جارٍ تحميل التكاملات...
          </div>
        ) : loadError ? (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200">
            {loadError}
          </div>
        ) : credentials.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            لا توجد مفاتيح بعد. أنشئ أول مفتاح من النموذج بالأعلى.
          </div>
        ) : (
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {credentials.map((credential) => (
              <article
                key={credential.id}
                className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-700 dark:bg-slate-950/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                        {credential.name}
                      </h3>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          credential.isActive && !credential.revokedAt
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200"
                            : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {credential.isActive && !credential.revokedAt ? "نشط" : "متوقف"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {credential.description || "بدون وصف"}
                    </p>
                  </div>
                  <div className="text-left text-xs text-slate-500 dark:text-slate-400">
                    <div>Prefix: {credential.keyPrefixMasked || "—"}</div>
                    <div className="mt-1">
                      آخر استخدام: {formatDateTime(credential.lastUsedAt)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                    <div className="text-xs text-slate-400">Reporter الافتراضي</div>
                    <div className="mt-1 font-semibold">
                      {credential.defaultReporterMemberName || "غير محدد"}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                    <div className="text-xs text-slate-400">Assignee الافتراضي</div>
                    <div className="mt-1 font-semibold">
                      {credential.defaultAssigneeMemberName || "غير محدد"}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                    <div className="text-xs text-slate-400">المشروع المقيد</div>
                    <div className="mt-1 font-semibold">
                      {credential.defaultProjectName || "غير محدد"}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                    <div className="text-xs text-slate-400">انتهاء الصلاحية</div>
                    <div className="mt-1 font-semibold">
                      {formatDateTime(credential.expiresAt)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {credential.scopes.map((scope) => (
                    <span
                      key={scope}
                      className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-200"
                    >
                      {scope}
                    </span>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => startEditing(credential)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    تعديل
                  </button>
                  <button
                    type="button"
                    onClick={() => void rotateCredential(credential)}
                    disabled={rotatingCredentialId === credential.id}
                    className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-200"
                  >
                    <ArrowPathIcon className="h-4 w-4" />
                    {rotatingCredentialId === credential.id
                      ? "جارٍ التدوير..."
                      : "تدوير المفتاح"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void revokeCredential(credential)}
                    disabled={revokingCredentialId === credential.id}
                    className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200"
                  >
                    <TrashIcon className="h-4 w-4" />
                    {revokingCredentialId === credential.id
                      ? "جارٍ الإلغاء..."
                      : "إلغاء المفتاح"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default DevTaskIntegrations;
