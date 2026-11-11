import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  KeyRound,
  ChevronDown,
  Loader2,
  Trash2,
  FlaskConical,
  ListChecks,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { envConfig } from "../../../config/environment";
import tokenManager from "../../../utils/tokenManager";

interface SystemUserTokenRow {
  id: string;
  scope: string;
  mode: "PRIMARY" | "FALLBACK";
  tokenLast4: string | null;
  businessId: string | null;
  label: string | null;
  scopes: string[] | null;
  updatedAt: string;
}

interface SystemUserStatus {
  tenant: SystemUserTokenRow | null;
  central: SystemUserTokenRow | null;
  effective: { source: "TENANT" | "CENTRAL"; mode: "PRIMARY" | "FALLBACK" } | null;
}

interface SystemUserPage {
  id: string;
  name: string;
  category: string | null;
}

interface FacebookSystemUserTokenCardProps {
  companyId?: string | null;
  userRole?: string;
}

const getAuthHeaders = (additionalHeaders: Record<string, string> = {}) =>
  tokenManager.createAuthHeaders(additionalHeaders);

export const FacebookSystemUserTokenCard: React.FC<FacebookSystemUserTokenCardProps> = ({
  companyId,
  userRole,
}) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<SystemUserStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [token, setToken] = useState("");
  const [mode, setMode] = useState<"FALLBACK" | "PRIMARY">("FALLBACK");
  const [scope, setScope] = useState<"TENANT" | "CENTRAL">("TENANT");
  const [label, setLabel] = useState("");
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [testResult, setTestResult] = useState<{
    identity?: { id?: string; name?: string } | null;
    permissions?: string[] | null;
  } | null>(null);
  const [pagesResult, setPagesResult] = useState<SystemUserPage[] | null>(null);

  const isSuperAdmin = userRole === "SUPER_ADMIN";

  const loadStatus = useCallback(async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const res = await fetch(`${envConfig.apiUrl}/facebook-system-user/status`, {
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
      });
      const data = await res.json();
      if (data?.success) {
        setStatus({ tenant: data.tenant, central: data.central, effective: data.effective });
        if (data.effective?.mode) setMode(data.effective.mode);
      }
    } catch {
      /* حالة صامتة — الكارت اختياري بالكامل */
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (expanded && companyId) {
      void loadStatus();
      setPagesResult(null);
      setTestResult(null);
    }
  }, [expanded, companyId, loadStatus]);

  const save = async () => {
    setMessage(null);
    if (!token.trim()) {
      setMessage({ kind: "err", text: t("facebookSystemUser.pasteTokenFirst", "الصق التوكن أولاً") });
      return;
    }
    try {
      setSaving(true);
      const res = await fetch(`${envConfig.apiUrl}/facebook-system-user/token`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          token: token.trim(),
          mode,
          scope: isSuperAdmin ? scope : "TENANT",
          label: label.trim() || null,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        setStatus({ tenant: data.tenant, central: data.central, effective: data.effective });
        setToken("");
        setTestResult(null);
        setPagesResult(null);
        setMessage({ kind: "ok", text: t("facebookSystemUser.saved", "تم الحفظ والتحقق من التوكن") });
      } else {
        const detail = data?.detail?.message ? ` — ${data.detail.message}` : "";
        setMessage({
          kind: "err",
          text: `${t("facebookSystemUser.saveFailed", "فشل الحفظ")}: ${data?.error || res.status}${detail}`,
        });
      }
    } catch {
      setMessage({ kind: "err", text: t("facebookSystemUser.networkError", "خطأ شبكة") });
    } finally {
      setSaving(false);
    }
  };

  const clear = async () => {
    setMessage(null);
    try {
      setClearing(true);
      const activeScope = isSuperAdmin ? scope : "TENANT";
      const res = await fetch(
        `${envConfig.apiUrl}/facebook-system-user/token?scope=${activeScope}`,
        {
          method: "DELETE",
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
        },
      );
      const data = await res.json();
      if (res.ok && data?.success) {
        setStatus({ tenant: data.tenant, central: data.central, effective: data.effective });
        setMessage({ kind: "ok", text: t("facebookSystemUser.cleared", "تم إلغاء التوكن") });
      } else {
        setMessage({ kind: "err", text: `${t("facebookSystemUser.clearFailed", "فشل الإلغاء")}: ${data?.error || res.status}` });
      }
    } catch {
      setMessage({ kind: "err", text: t("facebookSystemUser.networkError", "خطأ شبكة") });
    } finally {
      setClearing(false);
    }
  };

  const test = async () => {
    setMessage(null);
    setTestResult(null);
    try {
      setTesting(true);
      const res = await fetch(`${envConfig.apiUrl}/facebook-system-user/test`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data?.valid) {
        setTestResult({ identity: data.identity, permissions: data.permissions });
      } else {
        setMessage({
          kind: "err",
          text: `${t("facebookSystemUser.testFailed", "التوكن غير صالح")}${data?.error?.message ? ` — ${data.error.message}` : ""}`,
        });
      }
    } catch {
      setMessage({ kind: "err", text: t("facebookSystemUser.networkError", "خطأ شبكة") });
    } finally {
      setTesting(false);
    }
  };

  const listPages = async () => {
    setMessage(null);
    setPagesResult(null);
    try {
      const res = await fetch(`${envConfig.apiUrl}/facebook-system-user/pages`, {
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        setPagesResult(Array.isArray(data.pages) ? data.pages : []);
        if (data.reason === "NO_ACTIVE_SYSTEM_USER_TOKEN") {
          setMessage({ kind: "err", text: t("facebookSystemUser.noToken", "لا يوجد توكن نشط") });
        }
      }
    } catch {
      setMessage({ kind: "err", text: t("facebookSystemUser.networkError", "خطأ شبكة") });
    }
  };

  const effective = status?.effective ?? null;

  return (
    <div className="rounded-lg border bg-card">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-start"
        aria-expanded={expanded}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <KeyRound className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm font-semibold text-foreground">
            {t("facebookSystemUser.title", "توكن السيستم يوزر")}
          </span>
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : effective ? (
            <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
              {effective.source === "TENANT"
                ? t("facebookSystemUser.activeTenant", "فعّال — الشركة")
                : t("facebookSystemUser.activeCentral", "فعّال — مركزي")}
              {" · "}
              {effective.mode === "PRIMARY"
                ? t("facebookSystemUser.modePrimary", "أساسي")
                : t("facebookSystemUser.modeFallback", "احتياطي")}
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {t("facebookSystemUser.inactive", "غير مفعّل")}
            </span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <div className="space-y-3 border-t px-4 py-3">
          {/* نموذج الإدخال */}
          <textarea
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="EAA…"
            dir="ltr"
            className="h-20 w-full resize-none rounded-md border bg-background px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={String(t("facebookSystemUser.tokenAria", "توكن السيستم يوزر"))}
          />

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as "FALLBACK" | "PRIMARY")}
              className="h-8 rounded-md border bg-background px-2 text-xs text-foreground"
              aria-label={String(t("facebookSystemUser.modeAria", "وضع الاستخدام"))}
            >
              <option value="FALLBACK">
                {t("facebookSystemUser.modeFallback", "احتياطي")}
              </option>
              <option value="PRIMARY">{t("facebookSystemUser.modePrimary", "أساسي")}</option>
            </select>

            {isSuperAdmin && (
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as "TENANT" | "CENTRAL")}
                className="h-8 rounded-md border bg-background px-2 text-xs text-foreground"
                aria-label={String(t("facebookSystemUser.scopeAria", "النطاق"))}
              >
                <option value="TENANT">{t("facebookSystemUser.scopeTenant", "هذه الشركة")}</option>
                <option value="CENTRAL">{t("facebookSystemUser.scopeCentral", "مركزي — كل الشركات")}</option>
              </select>
            )}

            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={String(t("facebookSystemUser.labelPlaceholder", "وسم (اختياري)"))}
              className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => void save()} disabled={saving} className="h-8 text-xs font-medium">
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                t("facebookSystemUser.save", "حفظ")
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void test()}
              disabled={testing}
              className="h-8 gap-1.5 text-xs font-medium"
            >
              {testing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FlaskConical className="h-3.5 w-3.5" />
              )}
              {t("facebookSystemUser.test", "اختبار")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void listPages()}
              className="h-8 gap-1.5 text-xs font-medium"
            >
              <ListChecks className="h-3.5 w-3.5" />
              {t("facebookSystemUser.pages", "الصفحات")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void clear()}
              disabled={clearing}
              className="h-8 gap-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
            >
              {clearing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              {t("facebookSystemUser.clear", "إلغاء")}
            </Button>
          </div>

          {message && (
            <p
              className={`text-xs font-medium ${message.kind === "ok" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}
            >
              {message.text}
            </p>
          )}

          {testResult && (
            <div className="rounded-md border bg-background/60 p-2.5">
              <p className="text-xs font-semibold text-foreground">
                {testResult.identity?.name || testResult.identity?.id || "—"}
                {testResult.identity?.id && (
                  <span className="ms-2 font-mono text-[10px] tabular-nums text-muted-foreground">
                    {testResult.identity.id}
                  </span>
                )}
              </p>
              {testResult.permissions && testResult.permissions.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {testResult.permissions.map((p) => (
                    <span
                      key={p}
                      className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {pagesResult && (
            <div className="rounded-md border bg-background/60 p-2.5">
              <p className="text-xs font-semibold text-foreground">
                {t("facebookSystemUser.assignedPages", {
                  defaultValue: "صفحات مخصصة للسيستم يوزر",
                  count: pagesResult.length,
                })}{" "}
                <span className="font-mono tabular-nums text-muted-foreground">
                  ({pagesResult.length})
                </span>
              </p>
              {pagesResult.length > 0 && (
                <ul className="mt-1.5 space-y-1">
                  {pagesResult.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate text-foreground">{p.name}</span>
                      <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
                        {p.id}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
