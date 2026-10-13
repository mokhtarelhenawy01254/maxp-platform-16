import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import {
  RotateCcw as ArrowPathIcon,
  Copy as ClipboardDocumentIcon,
  Key as KeyIcon,
  ExternalLink as LinkIcon,
  Plus as PlusIcon,
  ShieldCheck as ShieldCheckIcon,
  Trash2 as TrashIcon,
  Check as CheckIcon,
} from "lucide-react";
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
      {/* Linear Single-Surface Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
              <KeyIcon className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              مفاتيح ربط مهام التطوير الخارجية
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            إدارة مفاتيح API الآمنة لإنشاء وقراءة مهام التطوير من الأنظمة والمواقع الخارجية
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-md border border-border/40 font-mono">
            <span>المفاتيح: <strong className="text-foreground">{credentials.length}</strong></span>
            <span className="text-border">|</span>
            <span className="truncate max-w-[200px]">/api/v1/external/dev-tasks</span>
          </div>
          <button
            type="button"
            onClick={resetForm}
            className="px-3.5 py-1.5 bg-primary text-primary-foreground font-medium text-xs rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            مفتاح جديد
          </button>
        </div>
      </div>

      {revealedApiKey && (
        <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 shadow-xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                المفتاح السري (يظهر مرة واحدة فقط)
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                خزّنه في الموقع الخارجي الآن. لن يظهر كاملًا مرة أخرى بعد مغادرة الصفحة.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void copyValue(revealedApiKey, "تم نسخ المفتاح")}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors shadow-xs"
            >
              <ClipboardDocumentIcon className="h-3.5 w-3.5 text-primary" />
              نسخ المفتاح
            </button>
          </div>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-zinc-950 p-3 font-mono text-xs text-emerald-400 border border-zinc-800">
            {revealedApiKey}
          </pre>
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-foreground">
                {editingCredential ? "تعديل المفتاح" : "إنشاء مفتاح جديد"}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                مفاتيح الكتابة تحتاج reporter افتراضي حتى تكون كل مهمة لها مالك
                واضح داخل النظام، وكل مفتاح مقيد بمشروع تطوير محدد.
              </p>
            </div>
            {editingCredential && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                إلغاء التعديل
              </button>
            )}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5 md:col-span-2">
              <span className="text-xs font-semibold text-foreground">
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
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground outline-none transition focus:ring-1 focus:ring-primary"
              />
            </label>

            <label className="space-y-1.5 md:col-span-2">
              <span className="text-xs font-semibold text-foreground">
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
                rows={2}
                placeholder="هذا المفتاح سيُستخدم من landing page أو ERP خارجي..."
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground outline-none transition focus:ring-1 focus:ring-primary"
              />
            </label>

            <div className="space-y-1.5 md:col-span-2">
              <span className="text-xs font-semibold text-foreground">
                الصلاحيات
              </span>
              <div className="grid gap-2.5 md:grid-cols-2">
                {SCOPE_OPTIONS.map((scopeOption) => {
                  const isChecked = formState.scopes.includes(scopeOption.value);
                  return (
                    <button
                      key={scopeOption.value}
                      type="button"
                      onClick={() => toggleScope(scopeOption.value)}
                      className={`rounded-lg border px-3 py-2.5 text-right transition ${
                        isChecked
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      }`}
                    >
                      <div className="text-xs font-bold">{scopeOption.label}</div>
                      <div className="mt-0.5 text-[11px] font-mono opacity-80">
                        {scopeOption.value}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-foreground">
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
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground outline-none transition focus:ring-1 focus:ring-primary"
              >
                <option value="">اختر عضو الفريق</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {buildMemberLabel(member)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-foreground">
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
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground outline-none transition focus:ring-1 focus:ring-primary"
              >
                <option value="">بدون assignee افتراضي</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {buildMemberLabel(member)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-foreground">
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
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground outline-none transition focus:ring-1 focus:ring-primary"
              >
                <option value="">اختر مشروع التطوير</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-foreground">
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
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground outline-none transition focus:ring-1 focus:ring-primary font-mono"
              />
            </label>

            <label className="inline-flex items-center gap-2.5 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs font-medium text-foreground">
              <input
                type="checkbox"
                checked={formState.isActive}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    isActive: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              المفتاح فعّال
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => void saveCredential()}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50 shadow-xs"
            >
              {editingCredential ? (
                <KeyIcon className="h-3.5 w-3.5" />
              ) : (
                <PlusIcon className="h-3.5 w-3.5" />
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3.5 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors shadow-xs"
            >
              <ArrowPathIcon className="h-3.5 w-3.5 text-muted-foreground" />
              تحديث البيانات
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <section className="rounded-xl border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center gap-2 pb-2 border-b border-border/40">
              <LinkIcon className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">
                أمثلة الاستخدام (CURL API)
              </h2>
            </div>

            {[
              { title: "جلب المهام", snippet: listSnippet },
              { title: "إنشاء مهمة جديدة", snippet: createSnippet },
              { title: "تحديث الحالة", snippet: statusSnippet },
            ].map((item) => (
              <div
                key={item.title}
                className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-zinc-100"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-zinc-200">{item.title}</div>
                  <button
                    type="button"
                    onClick={() => void copyValue(item.snippet, `تم نسخ ${item.title}`)}
                    className="inline-flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] font-medium text-zinc-300 hover:bg-zinc-700 transition"
                  >
                    <ClipboardDocumentIcon className="h-3 w-3" />
                    نسخ
                  </button>
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-5 text-emerald-400">
                  {item.snippet}
                </pre>
              </div>
            ))}
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-xs">
            <h2 className="text-sm font-bold text-foreground pb-2 border-b border-border/40">
              نطاق عمل المفتاح
            </h2>
            <div className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
              <p>
                <code className="text-foreground font-mono bg-muted px-1 py-0.5 rounded">dev-tasks:read</code> يسمح للموقع الخارجي بقراءة المشروع المقيد وأعضاء فريقه ومهامه فقط.
              </p>
              <p>
                <code className="text-foreground font-mono bg-muted px-1 py-0.5 rounded">dev-tasks:write</code> يسمح بإنشاء مهمة جديدة وتحديث حالتها داخل المشروع المقيد فقط.
              </p>
              <p>
                الـ reporter الافتراضي يُسجَّل كصاحب إنشاء داخلي لكل مهمة واردة من هذا التكامل لضمان دقة السجلات.
              </p>
            </div>
          </section>
        </div>
      </section>

      {/* Current Credentials Section */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-border/40">
          <div>
            <h2 className="text-base font-bold text-foreground">
              المفاتيح الحالية
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              تستطيع تدوير المفتاح أو إلغاؤه دون التأثير على باقي مفاتيح الربط
            </p>
          </div>
          <button
            type="button"
            onClick={resetForm}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors shadow-xs"
          >
            <PlusIcon className="h-3.5 w-3.5 text-primary" />
            مفتاح جديد
          </button>
        </div>

        {loading ? (
          <div className="mt-4 rounded-lg border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">
            جارٍ تحميل التكاملات...
          </div>
        ) : loadError ? (
          <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs text-destructive">
            {loadError}
          </div>
        ) : credentials.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">
            لا توجد مفاتيح بعد. أنشئ أول مفتاح من النموذج بالأعلى.
          </div>
        ) : (
          <div className="mt-4 grid gap-3.5 xl:grid-cols-2">
            {credentials.map((credential) => (
              <article
                key={credential.id}
                className="rounded-lg border border-border bg-muted/20 p-4 hover:border-border/80 transition-colors"
              >
                <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-border/40">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-foreground">
                        {credential.name}
                      </h3>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-medium border ${
                          credential.isActive && !credential.revokedAt
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {credential.isActive && !credential.revokedAt ? "نشط" : "متوقف"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {credential.description || "بدون وصف"}
                    </p>
                  </div>
                  <div className="text-left text-[11px] text-muted-foreground font-mono">
                    <div>Prefix: {credential.keyPrefixMasked || "—"}</div>
                    <div className="mt-0.5">
                      آخر استخدام: {formatDateTime(credential.lastUsedAt)}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md border border-border/60 bg-background/60 p-2.5">
                    <div className="text-[11px] text-muted-foreground">Reporter الافتراضي</div>
                    <div className="mt-0.5 font-medium text-foreground truncate">
                      {credential.defaultReporterMemberName || "غير محدد"}
                    </div>
                  </div>
                  <div className="rounded-md border border-border/60 bg-background/60 p-2.5">
                    <div className="text-[11px] text-muted-foreground">Assignee الافتراضي</div>
                    <div className="mt-0.5 font-medium text-foreground truncate">
                      {credential.defaultAssigneeMemberName || "غير محدد"}
                    </div>
                  </div>
                  <div className="rounded-md border border-border/60 bg-background/60 p-2.5">
                    <div className="text-[11px] text-muted-foreground">المشروع المقيد</div>
                    <div className="mt-0.5 font-medium text-foreground truncate">
                      {credential.defaultProjectName || "غير محدد"}
                    </div>
                  </div>
                  <div className="rounded-md border border-border/60 bg-background/60 p-2.5">
                    <div className="text-[11px] text-muted-foreground">انتهاء الصلاحية</div>
                    <div className="mt-0.5 font-medium text-foreground font-mono truncate">
                      {formatDateTime(credential.expiresAt)}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {credential.scopes.map((scope) => (
                    <span
                      key={scope}
                      className="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-[11px] text-primary"
                    >
                      {scope}
                    </span>
                  ))}
                </div>

                <div className="mt-3.5 flex flex-wrap gap-2 pt-3 border-t border-border/40">
                  <button
                    type="button"
                    onClick={() => startEditing(credential)}
                    className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition shadow-xs"
                  >
                    تعديل
                  </button>
                  <button
                    type="button"
                    onClick={() => void rotateCredential(credential)}
                    disabled={rotatingCredentialId === credential.id}
                    className="inline-flex items-center gap-1.5 rounded-md border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition disabled:opacity-50"
                  >
                    <ArrowPathIcon className="h-3 w-3" />
                    {rotatingCredentialId === credential.id
                      ? "جارٍ التدوير..."
                      : "تدوير المفتاح"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void revokeCredential(credential)}
                    disabled={revokingCredentialId === credential.id}
                    className="inline-flex items-center gap-1.5 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 transition disabled:opacity-50"
                  >
                    <TrashIcon className="h-3 w-3" />
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
