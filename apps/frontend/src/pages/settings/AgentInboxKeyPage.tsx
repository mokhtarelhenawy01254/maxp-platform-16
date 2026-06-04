import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
  KeyIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  SignalIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../hooks/useAuthSimple";
import {
  AgentInboxContext,
  AgentInboxCredential,
  AgentInboxScope,
  agentInboxService,
} from "../../services/agentInboxService";

const SCOPE_LABELS: Record<AgentInboxScope, { label: string; hint: string }> = {
  "facebook-inbox:read": {
    label: "قراءة وسحب الرسائل",
    hint: "قراءة المحادثات وسحب آخر الرسائل من Graph API.",
  },
  "facebook-inbox:evaluate": {
    label: "تقييم الردود",
    hint: "تحليل آخر رسالة ورد الموظف واكتشاف التأخير أو فشل الإرسال.",
  },
  "facebook-inbox:draft": {
    label: "مسودات الرد",
    hint: "محجوزة لمرحلة لاحقة لإنشاء مسودات، بدون إرسال مباشر.",
  },
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "لم يحدث";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير معروف";
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const maskSecret = (value: string) => {
  if (!value) return "";
  if (value.length <= 16) return value;
  return `${value.slice(0, 10)}...${value.slice(-6)}`;
};

const SecretPanel = ({
  apiKey,
  onCopy,
}: {
  apiKey: string;
  onCopy: (value: string, label: string) => void;
}) => (
  <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold">
          <CheckCircleIcon className="h-5 w-5" />
          المفتاح ظهر مرة واحدة فقط
        </div>
        <p className="mt-1 text-sm text-emerald-800">
          انسخه الآن واستخدمه في طلبات Agent Inbox عبر هيدر X-API-Key.
        </p>
      </div>
      <button
        type="button"
        onClick={() => onCopy(apiKey, "المفتاح")}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
      >
        <ClipboardDocumentIcon className="h-4 w-4" />
        نسخ المفتاح
      </button>
    </div>
    <code className="mt-3 block overflow-x-auto rounded-md bg-white px-3 py-2 text-left text-xs text-slate-900">
      {apiKey}
    </code>
  </section>
);

const CredentialRow = ({
  credential,
  onRotate,
  onRevoke,
  isBusy,
}: {
  credential: AgentInboxCredential;
  onRotate: (credentialId: string) => void;
  onRevoke: (credentialId: string) => void;
  isBusy: boolean;
}) => (
  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-slate-950">{credential.name}</h3>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
            {credential.keyPrefixMasked || "بدون prefix"}
          </span>
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${
              credential.isActive
                ? "bg-emerald-100 text-emerald-700"
                : "bg-rose-100 text-rose-700"
            }`}
          >
            {credential.isActive ? "نشط" : "متوقف"}
          </span>
        </div>
        {credential.description ? (
          <p className="mt-1 text-sm text-slate-600">{credential.description}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {credential.scopes.map((scope) => (
            <span
              key={scope}
              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
            >
              {SCOPE_LABELS[scope]?.label || scope}
            </span>
          ))}
        </div>
        <div className="mt-3 grid gap-1 text-xs text-slate-500 sm:grid-cols-3">
          <span>آخر استخدام: {formatDateTime(credential.lastUsedAt)}</span>
          <span>ينتهي: {formatDateTime(credential.expiresAt)}</span>
          <span>تم إنشاؤه: {formatDateTime(credential.createdAt)}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onRotate(credential.id)}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ArrowPathIcon className="h-4 w-4" />
          تدوير
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onRevoke(credential.id)}
          className="inline-flex items-center gap-2 rounded-md border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <TrashIcon className="h-4 w-4" />
          إلغاء
        </button>
      </div>
    </div>
  </div>
);

const AgentInboxKeyPage: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const [companySearch, setCompanySearch] = useState(isSuperAdmin ? "Wofod" : "");
  const [context, setContext] = useState<AgentInboxContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyCredentialId, setBusyCredentialId] = useState<string | null>(null);
  const [selectedScopes, setSelectedScopes] = useState<AgentInboxScope[]>([
    "facebook-inbox:read",
    "facebook-inbox:evaluate",
  ]);
  const [expiresAt, setExpiresAt] = useState("");
  const [latestSecret, setLatestSecret] = useState("");
  const [testKey, setTestKey] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [testSummary, setTestSummary] = useState<{
    total: number;
    needsAttention: number;
    healthy: number;
    companyName: string;
  } | null>(null);

  const selectedCompanyId = context?.company.id;
  const isWofodContext = useMemo(() => {
    const name = context?.company.name?.toLowerCase() || "";
    const slug = context?.company.slug?.toLowerCase() || "";
    return name.includes("wofod") || slug.includes("wofod");
  }, [context?.company.name, context?.company.slug]);

  const loadContext = useCallback(async (searchValue?: string) => {
    setLoading(true);
    try {
      const normalizedSearch = searchValue?.trim();
      const response = await agentInboxService.getContext(
        isSuperAdmin && normalizedSearch ? { q: normalizedSearch } : undefined,
      );
      setContext(response.data);
      setSelectedScopes(response.data.recommendedScopes);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "فشل تحميل إعدادات Agent Inbox";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    void loadContext(isSuperAdmin ? "Wofod" : undefined);
  }, [isSuperAdmin, loadContext]);

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`تم نسخ ${label}`);
    } catch {
      toast.error("تعذر النسخ من المتصفح");
    }
  };

  const toggleScope = (scope: AgentInboxScope) => {
    setSelectedScopes((current) => {
      if (current.includes(scope)) {
        const next = current.filter((item) => item !== scope);
        return next.length > 0 ? next : current;
      }
      return [...current, scope];
    });
  };

  const createKey = async () => {
    if (!context) return;
    setBusyCredentialId("create");
    try {
      const response = await agentInboxService.createCredential({
        companyId: selectedCompanyId,
        name: `Agent Inbox - ${context.company.name}`,
        description: "Facebook Inbox diagnostics key for pull and reply evaluation.",
        scopes: selectedScopes,
        expiresAt: expiresAt || undefined,
      });
      setLatestSecret(response.secret?.apiKey || "");
      toast.success(response.message || "تم إنشاء المفتاح");
      await loadContext(isSuperAdmin ? companySearch : undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : "فشل إنشاء المفتاح";
      toast.error(message);
    } finally {
      setBusyCredentialId(null);
    }
  };

  const rotateKey = async (credentialId: string) => {
    setBusyCredentialId(credentialId);
    try {
      const response = await agentInboxService.rotateCredential(
        credentialId,
        selectedCompanyId,
      );
      setLatestSecret(response.secret?.apiKey || "");
      toast.success(response.message || "تم تدوير المفتاح");
      await loadContext(isSuperAdmin ? companySearch : undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : "فشل تدوير المفتاح";
      toast.error(message);
    } finally {
      setBusyCredentialId(null);
    }
  };

  const revokeKey = async (credentialId: string) => {
    setBusyCredentialId(credentialId);
    try {
      await agentInboxService.revokeCredential(credentialId, selectedCompanyId);
      toast.success("تم إلغاء المفتاح");
      await loadContext(isSuperAdmin ? companySearch : undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : "فشل إلغاء المفتاح";
      toast.error(message);
    } finally {
      setBusyCredentialId(null);
    }
  };

  const testCurrentKey = async () => {
    if (!testKey.trim()) {
      toast.error("ضع المفتاح المراد اختباره");
      return;
    }

    setTestLoading(true);
    setTestSummary(null);
    try {
      const response = await agentInboxService.testConversations(testKey.trim());
      const conversations = response.data.conversations;
      const needsAttention = conversations.filter((conversation) =>
        ["needs_reply", "send_blocked", "weak_reply"].includes(
          conversation.evaluation?.status || "",
        ),
      ).length;
      setTestSummary({
        total: response.data.pagination.total,
        needsAttention,
        healthy: conversations.length - needsAttention,
        companyName: response.data.company.name,
      });
      toast.success("المفتاح يعمل وتم قراءة عينة محادثات");
    } catch (error) {
      const message = error instanceof Error ? error.message : "فشل اختبار المفتاح";
      toast.error(message);
    } finally {
      setTestLoading(false);
    }
  };

  const curlExample = latestSecret
    ? `curl -H "X-API-Key: ${latestSecret}" "https://maxp.online/api/v1/agent-inbox/facebook/conversations?limit=10&includeEvaluation=1"`
    : `curl -H "X-API-Key: ${testKey || "ain_xxx"}" "https://maxp.online/api/v1/agent-inbox/facebook/conversations?limit=10&includeEvaluation=1"`;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8" dir="rtl">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                <ShieldCheckIcon className="h-4 w-4" />
                Agent Inbox API
              </div>
              <h1 className="text-2xl font-bold text-slate-950">
                مفتاح تشخيص محادثات فيسبوك
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                المفتاح يقرأ محادثات الشركة، يسحب آخر الرسائل من فيسبوك، ويقيّم الردود
                لاكتشاف المحادثات التي تحتاج تدخل. لا يوجد إرسال مباشر من هذه المرحلة.
              </p>
            </div>

            {isSuperAdmin ? (
              <div className="w-full max-w-sm">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  الشركة المستهدفة
                </label>
                <div className="flex gap-2">
                  <input
                    value={companySearch}
                    onChange={(event) => setCompanySearch(event.target.value)}
                    className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-900"
                    placeholder="Wofod"
                  />
                  <button
                    type="button"
                    onClick={() => loadContext(companySearch)}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <MagnifyingGlassIcon className="h-4 w-4" />
                    تحميل
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {context ? (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                  <KeyIcon className="h-4 w-4" />
                  الشركة
                </div>
                <p className="mt-2 text-xl font-bold text-slate-950">
                  {context.company.name}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {context.company.slug || "بدون slug"} · {context.company.isActive ? "نشطة" : "متوقفة"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                  <ChatBubbleLeftRightIcon className="h-4 w-4" />
                  صفحات فيسبوك المتصلة
                </div>
                <p className="mt-2 text-xl font-bold text-slate-950">
                  {context.pages.filter((page) => page.status === "connected").length}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {context.pages[0]?.pageName || "لا توجد صفحة متصلة"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                  <SignalIcon className="h-4 w-4" />
                  مفاتيح Agent Inbox
                </div>
                <p className="mt-2 text-xl font-bold text-slate-950">
                  {context.credentials.length}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {context.credentials.some((credential) => credential.isActive)
                    ? "يوجد مفتاح نشط"
                    : "لا يوجد مفتاح نشط"}
                </p>
              </div>
            </section>

            {!isWofodContext ? (
              <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
                <div className="flex items-start gap-2">
                  <ExclamationTriangleIcon className="mt-0.5 h-5 w-5" />
                  <p className="text-sm leading-6">
                    السياق الحالي ليس Wofod حسب الاسم أو الـ slug. لو الهدف هو الشركة الحقيقية
                    Wofod، حمّلها من البحث قبل إنشاء المفتاح.
                  </p>
                </div>
              </section>
            ) : null}

            {latestSecret ? (
              <SecretPanel apiKey={latestSecret} onCopy={copyText} />
            ) : null}

            <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-950">إنشاء مفتاح جديد</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      المفتاح مخصص للتشخيص: قراءة، سحب، وتقييم الردود.
                    </p>
                  </div>
                  <KeyIcon className="h-6 w-6 text-slate-400" />
                </div>

                <div className="mt-5 grid gap-3">
                  {context.scopes.map((scope) => {
                    const checked = selectedScopes.includes(scope);
                    return (
                      <label
                        key={scope}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                          checked
                            ? "border-slate-900 bg-slate-50"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleScope(scope)}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-950"
                        />
                        <span>
                          <span className="block text-sm font-semibold text-slate-950">
                            {SCOPE_LABELS[scope].label}
                          </span>
                          <span className="mt-1 block text-sm text-slate-500">
                            {SCOPE_LABELS[scope].hint}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>

                <label className="mt-5 block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    تاريخ انتهاء اختياري
                  </span>
                  <input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(event) => setExpiresAt(event.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-900"
                  />
                </label>

                <button
                  type="button"
                  onClick={createKey}
                  disabled={busyCredentialId === "create" || loading}
                  className="mt-5 inline-flex items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <KeyIcon className="h-4 w-4" />
                  إنشاء مفتاح
                </button>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-slate-950">اختبار سريع</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  ضع المفتاح هنا لاختبار قراءة عينة من محادثات الشركة وتقييم الردود.
                </p>
                <input
                  value={testKey}
                  onChange={(event) => setTestKey(event.target.value)}
                  className="mt-4 w-full rounded-md border border-slate-300 px-3 py-2 text-left text-sm outline-none transition focus:border-slate-900"
                  placeholder={latestSecret ? maskSecret(latestSecret) : "ain_..."}
                  dir="ltr"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={testCurrentKey}
                    disabled={testLoading}
                    className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <SignalIcon className="h-4 w-4" />
                    اختبار المفتاح
                  </button>
                  <button
                    type="button"
                    onClick={() => copyText(curlExample, "مثال curl")}
                    className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <ClipboardDocumentIcon className="h-4 w-4" />
                    نسخ curl
                  </button>
                </div>
                {testSummary ? (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    <p className="font-semibold text-slate-950">{testSummary.companyName}</p>
                    <p className="mt-1">
                      إجمالي محادثات: {testSummary.total} · تحتاج مراجعة في العينة:{" "}
                      {testSummary.needsAttention} · مستقرة: {testSummary.healthy}
                    </p>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">المفاتيح الحالية</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    المفاتيح الملغاة لا تظهر هنا. استخدم التدوير عند تسريب مفتاح أو تغيير الجهاز.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => loadContext(companySearch)}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ArrowPathIcon className="h-4 w-4" />
                  تحديث
                </button>
              </div>
              <div className="mt-4 grid gap-3">
                {context.credentials.length > 0 ? (
                  context.credentials.map((credential) => (
                    <CredentialRow
                      key={credential.id}
                      credential={credential}
                      onRotate={rotateKey}
                      onRevoke={revokeKey}
                      isBusy={busyCredentialId === credential.id}
                    />
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                    لا يوجد مفتاح Agent Inbox لهذه الشركة حتى الآن.
                  </div>
                )}
              </div>
            </section>
          </>
        ) : (
          <section className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            {loading ? "جاري تحميل السياق..." : "لم يتم تحميل شركة بعد."}
          </section>
        )}
      </div>
    </main>
  );
};

export default AgentInboxKeyPage;
