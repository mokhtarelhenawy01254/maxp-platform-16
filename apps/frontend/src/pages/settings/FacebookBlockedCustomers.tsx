import React, { useCallback, useEffect, useState } from "react";
import {
  Ban,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
  UserX,
  X,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuthSimple";
import { envConfig } from "../../config/environment";
import tokenManager from "../../utils/tokenManager";
import { apiService } from "../../services/apiService";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n";

interface FacebookPage {
  id: string;
  pageId: string;
  pageName: string;
  status: string;
}

interface OAuthStatus {
  success?: boolean;
  pages?: FacebookPage[];
  message?: string;
}

interface BlockedCustomerOnPage {
  id: string;
  customerId: string;
  facebookId?: string | null;
  reason?: string | null;
  blockedAt: string;
  customer?: {
    firstName?: string | null;
    lastName?: string | null;
  } | null;
}

const getAuthHeaders = (additionalHeaders: Record<string, string> = {}) =>
  tokenManager.createAuthHeaders(additionalHeaders);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getApiErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (isRecord(error)) {
    const response = error.response;
    if (isRecord(response) && isRecord(response.data)) {
      const message = response.data.message;
      if (typeof message === "string" && message.trim()) {
        return message;
      }
    }

    if (typeof error.message === "string" && error.message.trim()) {
      return error.message;
    }
  }

  return fallbackMessage;
};

const getCustomerDisplayName = (blocked: BlockedCustomerOnPage, fallback: string) => {
  const firstName = blocked.customer?.firstName?.trim();
  const lastName = blocked.customer?.lastName?.trim();
  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  return fullName || fallback;
};

const formatBlockedAt = (blockedAt: string, fallback: string) => {
  const date = new Date(blockedAt);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return date.toLocaleString(i18n.language, {
    dateStyle: "short",
    timeStyle: "short",
  });
};

const FacebookBlockedCustomers: React.FC = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [blockedCustomers, setBlockedCustomers] = useState<BlockedCustomerOnPage[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [loadingBlocked, setLoadingBlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadBlockedCustomers = useCallback(async (pageId: string) => {
    if (!pageId) {
      setBlockedCustomers([]);
      return;
    }

    try {
      setLoadingBlocked(true);
      setError(null);
      const blocked = await apiService.getBlockedCustomersOnPage(pageId);
      setBlockedCustomers(blocked as BlockedCustomerOnPage[]);
    } catch (error: unknown) {
      console.error("Error loading blocked customers:", error);
      setError(getApiErrorMessage(error, t("facebookBlocked.loadFailed")));
    } finally {
      setLoadingBlocked(false);
    }
  }, [t]);

  const loadPages = useCallback(async () => {
    if (!user?.companyId) {
      setError(t("facebookBlocked.companyIdMissing"));
      return;
    }

    try {
      setLoadingPages(true);
      setError(null);

      const response = await fetch(
        `${envConfig.apiUrl}/facebook-oauth/status?companyId=${user.companyId}`,
        {
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
        },
      );
      const data = (await response.json()) as OAuthStatus;

      if (!data.success) {
        setError(data.message || t("facebookBlocked.loadPagesFailed"));
        return;
      }

      const connectedPages = (data.pages || []).filter(
        (page) => page.status === "connected",
      );
      setPages(connectedPages);

      setSelectedPageId((current) => {
        if (current && connectedPages.some((page) => page.pageId === current)) {
          return current;
        }

        return connectedPages.length === 1 ? connectedPages[0].pageId : "";
      });
    } catch (error: unknown) {
      console.error("Error loading Facebook pages:", error);
      setError(getApiErrorMessage(error, t("facebookBlocked.loadPagesFailed")));
    } finally {
      setLoadingPages(false);
    }
  }, [user?.companyId, t]);

  useEffect(() => {
    if (isAuthenticated && user?.companyId) {
      void loadPages();
    }
  }, [isAuthenticated, loadPages, user?.companyId]);

  useEffect(() => {
    if (selectedPageId) {
      void loadBlockedCustomers(selectedPageId);
    } else {
      setBlockedCustomers([]);
    }
  }, [loadBlockedCustomers, selectedPageId]);

  const handleUnblockCustomer = async (customerId: string, pageId: string) => {
    if (!confirm(t("facebookBlocked.unblockConfirm"))) {
      return;
    }

    try {
      setError(null);
      await apiService.unblockCustomerOnPage(customerId, pageId);
      setSuccess(t("facebookBlocked.unblockSuccess"));
      await loadBlockedCustomers(pageId);
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, t("facebookBlocked.unblockFailed")));
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
          <p className="text-xs font-mono">{t("facebookBlocked.mustLogin")}</p>
        </div>
      </div>
    );
  }

  const selectedPage = pages.find((page) => page.pageId === selectedPageId);
  const isBusy = loadingPages || loadingBlocked;

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header Chassis */}
      <div className="flex flex-col gap-4 rounded-xl border border-border/70 bg-card p-4 shadow-xs lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-destructive/20 bg-destructive/10 text-destructive">
            <UserX className="h-4.5 w-4.5" />
          </div>
          <div className="space-y-0.5 text-right">
            <h1 className="text-base font-bold tracking-tight text-foreground">
              {t("facebookBlocked.pageTitle")}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{t("facebookBlocked.connectedPages")}: <strong className="font-mono tabular-nums text-foreground">{pages.length}</strong></span>
              <span>•</span>
              <span>المحظورون: <strong className="font-mono tabular-nums text-foreground">{blockedCustomers.length}</strong></span>
              {selectedPage && (
                <>
                  <span>•</span>
                  <span className="font-medium text-foreground">{selectedPage.pageName}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedPageId}
            onChange={(event) => setSelectedPageId(event.target.value)}
            disabled={loadingPages || pages.length === 0}
            className="h-8.5 rounded-lg border border-border/70 bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary disabled:opacity-50"
          >
            <option value="">
              {loadingPages ? t("facebookBlocked.loadingPages") : t("facebookBlocked.selectPage")}
            </option>
            {pages.map((page) => (
              <option key={page.id} value={page.pageId}>
                {page.pageName}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              void loadPages();
              if (selectedPageId) void loadBlockedCustomers(selectedPageId);
            }}
            disabled={isBusy}
            className="inline-flex h-8.5 items-center gap-1.5 rounded-lg border border-border/70 bg-background px-3 text-xs font-medium text-foreground transition-all hover:bg-muted/40 active:scale-[0.98] disabled:opacity-50"
          >
            <RotateCw className={`h-3.5 w-3.5 ${isBusy ? "animate-spin" : ""}`} />
            <span>{t("facebookBlocked.refresh")}</span>
          </button>

          <Link
            to="/settings/facebook-oauth"
            className="inline-flex h-8.5 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>{t("facebookBlocked.connectSettings")}</span>
          </Link>
        </div>
      </div>

      {success && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Blocked Ledger Table Chassis */}
      <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-xs">
        {pages.length === 0 && !loadingPages ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            {t("facebookBlocked.noConnectedPages")}
          </div>
        ) : !selectedPageId ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            {t("facebookBlocked.selectPageToView")}
          </div>
        ) : loadingBlocked ? (
          <div className="flex items-center justify-center gap-2 p-12 text-xs font-mono text-muted-foreground">
            <RotateCw className="h-4 w-4 animate-spin text-primary" />
            <span>{t("facebookBlocked.loadingBlocked")}</span>
          </div>
        ) : blockedCustomers.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            {t("facebookBlocked.noBlockedOnPage")} {selectedPage?.pageName || t("facebookBlocked.thisPage")}.
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-12 gap-3 border-b border-border/60 bg-muted/30 px-4 py-2.5 text-xs font-medium text-muted-foreground">
              <span className="col-span-4">{t("facebookBlocked.customer")}</span>
              <span className="col-span-4 hidden md:block">
                {t("facebookBlocked.reasonOrFbId")}
              </span>
              <span className="col-span-3 hidden lg:block">{t("facebookBlocked.blockedAt")}</span>
              <span className="col-span-8 text-left md:col-span-4 lg:col-span-1">
                {t("facebookBlocked.actions")}
              </span>
            </div>

            <div className="divide-y divide-border/50">
              {blockedCustomers.map((blocked) => (
                <div
                  key={blocked.id}
                  className="grid grid-cols-12 items-center gap-3 p-4 transition-colors hover:bg-muted/10"
                >
                  <div className="col-span-8 min-w-0 md:col-span-4">
                    <div className="truncate text-xs font-bold text-foreground">
                      {getCustomerDisplayName(blocked, t("facebookBlocked.unknownCustomer"))}
                    </div>
                    <div className="mt-0.5 truncate font-mono tabular-nums text-[11px] text-muted-foreground md:hidden">
                      {blocked.reason || blocked.facebookId || t("facebookBlocked.noDetails")}
                    </div>
                  </div>

                  <div className="col-span-4 hidden min-w-0 md:block">
                    <div className="truncate text-xs text-foreground">
                      {blocked.reason || t("facebookBlocked.noReason")}
                    </div>
                    <div className="mt-0.5 truncate font-mono tabular-nums text-[11px] text-muted-foreground">
                      {blocked.facebookId || t("facebookBlocked.fbIdUnavailable")}
                    </div>
                  </div>

                  <div className="col-span-3 hidden font-mono tabular-nums text-xs text-muted-foreground lg:block">
                    {formatBlockedAt(blocked.blockedAt, t("facebookBlocked.unavailable"))}
                  </div>

                  <div className="col-span-4 text-left md:col-span-4 lg:col-span-1">
                    <button
                      onClick={() =>
                        void handleUnblockCustomer(
                          blocked.customerId,
                          selectedPageId,
                        )
                      }
                      className="inline-flex h-7.5 items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 transition-colors hover:bg-emerald-500/20 active:scale-[0.98]"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{t("facebookBlocked.unblock")}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FacebookBlockedCustomers;
