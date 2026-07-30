import { RefreshCw as ArrowPathIcon, Check as CheckCircleIcon, AlertTriangle as ExclamationTriangleIcon, Ban as NoSymbolIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import React, { useCallback, useEffect, useState } from "react";
;
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuthSimple";
import { envConfig } from "../../config/environment";
import tokenManager from "../../utils/tokenManager";
import { apiService } from "../../services/apiService";
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
  const [blockedCustomers, setBlockedCustomers] = useState<
    BlockedCustomerOnPage[]
  >([]);
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
      setError(
        getApiErrorMessage(error, t("facebookBlocked.loadFailed")),
      );
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
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto mb-4 h-12 w-12 text-yellow-500" />
          <p className="text-gray-600">{t("facebookBlocked.mustLogin")}</p>
        </div>
      </div>
    );
  }

  const selectedPage = pages.find((page) => page.pageId === selectedPageId);
  const isBusy = loadingPages || loadingBlocked;

  return (
    <div className="w-full p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 border-b border-gray-200 pb-4 dark:border-gray-700 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-600 dark:bg-red-950/30">
            <NoSymbolIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold leading-7 text-gray-900 dark:text-white">
              {t("facebookBlocked.pageTitle")}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span>{t("facebookBlocked.connectedPages")}: {pages.length}</span>
              <span className="h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-600" />
              <span>{t("facebookBlocked.showing")}: {blockedCustomers.length}</span>
              {selectedPage && (
                <>
                  <span className="h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                  <span className="max-w-48 truncate">
                    {selectedPage.pageName}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={selectedPageId}
            onChange={(event) => setSelectedPageId(event.target.value)}
            disabled={loadingPages || pages.length === 0}
            className="h-9 min-w-56 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
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
              if (selectedPageId) {
                void loadBlockedCustomers(selectedPageId);
              }
            }}
            disabled={isBusy}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          >
            <ArrowPathIcon
              className={`h-4 w-4 ${isBusy ? "animate-spin" : ""}`}
            />
            {t("facebookBlocked.refresh")}
          </button>
          <Link
            to="/settings/facebook-oauth"
            className="inline-flex h-9 items-center justify-center rounded-md bg-blue-600 px-3 text-sm text-white hover:bg-blue-700"
          >
            {t("facebookBlocked.connectSettings")}
          </Link>
        </div>
      </div>

      {success && (
        <div className="mb-3 rounded-md border border-green-200 bg-green-50 px-3 py-2">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="h-4 w-4 text-green-600" />
            <p className="text-sm text-green-800">{success}</p>
            <button
              onClick={() => setSuccess(null)}
              className="ms-auto text-sm text-green-700 hover:text-green-900"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2">
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
            <p className="text-sm text-red-800">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ms-auto text-sm text-red-700 hover:text-red-900"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-md border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        {pages.length === 0 && !loadingPages ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            {t("facebookBlocked.noConnectedPages")}
          </div>
        ) : !selectedPageId ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            {t("facebookBlocked.selectPageToView")}
          </div>
        ) : loadingBlocked ? (
          <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-gray-500 dark:text-gray-400">
            <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-blue-600" />
            {t("facebookBlocked.loadingBlocked")}
          </div>
        ) : blockedCustomers.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            {t("facebookBlocked.noBlockedOnPage")} {selectedPage?.pageName || t("facebookBlocked.thisPage")}.
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-12 gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs font-medium text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
              <span className="col-span-4">{t("facebookBlocked.customer")}</span>
              <span className="col-span-4 hidden md:block">
                {t("facebookBlocked.reasonOrFbId")}
              </span>
              <span className="col-span-3 hidden lg:block">{t("facebookBlocked.blockedAt")}</span>
              <span className="col-span-8 text-left md:col-span-4 lg:col-span-1">
                {t("facebookBlocked.actions")}
              </span>
            </div>
            {blockedCustomers.map((blocked) => (
              <div
                key={blocked.id}
                className="grid grid-cols-12 items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0 dark:border-gray-700/70"
              >
                <div className="col-span-8 min-w-0 md:col-span-4">
                  <div className="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {getCustomerDisplayName(blocked, t("facebookBlocked.unknownCustomer"))}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-gray-500 md:hidden">
                    {blocked.reason || blocked.facebookId || t("facebookBlocked.noDetails")}
                  </div>
                </div>

                <div className="col-span-4 hidden min-w-0 md:block">
                  <div className="truncate text-sm text-gray-700 dark:text-gray-200">
                    {blocked.reason || t("facebookBlocked.noReason")}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-gray-400">
                    {blocked.facebookId || t("facebookBlocked.fbIdUnavailable")}
                  </div>
                </div>

                <div className="col-span-3 hidden text-sm text-gray-600 dark:text-gray-300 lg:block">
                  {formatBlockedAt(blocked.blockedAt, t("facebookBlocked.unavailable"))}
                </div>

                <button
                  onClick={() =>
                    void handleUnblockCustomer(
                      blocked.customerId,
                      selectedPageId,
                    )
                  }
                  className="col-span-4 inline-flex h-8 items-center justify-center gap-1 rounded-md bg-emerald-600 px-3 text-xs font-medium text-white hover:bg-emerald-700 md:col-span-4 lg:col-span-1"
                >
                  <CheckCircleIcon className="h-4 w-4" />
                  {t("facebookBlocked.unblock")}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FacebookBlockedCustomers;
