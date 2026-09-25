import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  PlusIcon,
  ArrowTopRightOnSquareIcon,
  ArrowPathIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../hooks/useAuthSimple";
import { envConfig } from "../../config/environment";
import tokenManager from "../../utils/tokenManager";
import {
  emitFacebookPageSync,
  subscribeToFacebookPageSync,
} from "../../utils/facebookPageSync";
import { useTranslation } from "react-i18next";
import i18n, { getDirection } from "../../i18n";

interface FacebookPage {
  id: string;
  pageId: string;
  pageName: string;
  status: string;
  connectedAt: string;
  disconnectedAt?: string | null;
  lastActivity: string;
  tokenHealth?: string;
  tokenSource?: string | null;
  needsReconnect?: boolean;
  canReconnect?: boolean;
  healthMessage?: string | null;
  attribution?: "ok" | "stale" | "unattributed";
  account?: {
    id: string;
    facebookUserId: string | null;
    name: string | null;
    email: string | null;
    status: string;
  } | null;
}

interface FacebookAccountSummary {
  id: string;
  facebookUserId: string | null;
  name: string | null;
  email: string | null;
  status: string;
  pagesCount: number;
  connectedPagesCount: number;
}

interface OAuthStatus {
  connected: boolean;
  pagesCount: number;
  connectedPagesCount?: number;
  disconnectedPagesCount?: number;
  needsAttention?: boolean;
  unhealthyPagesCount?: number;
  pages: FacebookPage[];
  accounts?: FacebookAccountSummary[];
  facebookUser?: {
    id: string;
    name: string;
    picture?: string | null;
  } | null;
}

interface SkippedPage {
  pageId: string;
  pageName: string;
  reason: string;
}

interface FacebookDebugPage {
  pageId: string;
  pageName: string;
  status: string;
}

const getAuthHeaders = (additionalHeaders: Record<string, string> = {}) =>
  tokenManager.createAuthHeaders(additionalHeaders);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getApiErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (isRecord(error)) {
    const response = error["response"];
    if (isRecord(response) && isRecord(response["data"])) {
      const data = response["data"];
      const message = data["message"];
      if (typeof message === "string" && message.trim()) {
        return message;
      }
    }

    const errorMsg = error["message"];
    if (typeof errorMsg === "string" && errorMsg.trim()) {
      return errorMsg;
    }
  }

  return fallbackMessage;
};

const FacebookOAuth: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [oauthStatus, setOauthStatus] = useState<OAuthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [skippedPages, setSkippedPages] = useState<SkippedPage[]>([]);
  const [forceDisconnecting, setForceDisconnecting] = useState<string | null>(null);
  const [noPageGrants, setNoPageGrants] = useState(false);
  const [affectedCompanies, setAffectedCompanies] = useState<{ companyName: string; pages: string[] }[]>([]);
  const [reconsenting, setReconsenting] = useState(false);
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);

  const loadOAuthStatus = useCallback(async () => {
    if (!user?.companyId) {
      console.error("No company ID available");
      setError(t("facebookOAuth.companyIdMissing"));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log("🔄 Loading OAuth status for company:", user.companyId);

      // Make direct API call with companyId in URL since companyAwareApi isn't working
      const response = await fetch(
        `${envConfig.apiUrl}/facebook-oauth/status?companyId=${user.companyId}`,
        {
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
        },
      );

      const data = await response.json();

      console.log("✅ OAuth Status Response:", data);

      if (data.success) {
        setOauthStatus(data);
        console.log(
          `📊 Found ${data.pagesCount} pages, connected: ${data.connected}`,
        );
      } else {
        setError(data.message || t("facebookOAuth.loadStatusFailed"));
      }
    } catch (error: unknown) {
      console.error("❌ Error loading OAuth status:", error);
      setError(
        t("facebookOAuth.loadStatusError", { error: getApiErrorMessage(error, t("facebookOAuth.unexpectedError")) }),
      );
    } finally {
      setLoading(false);
    }
  }, [user?.companyId]);

  const loadSkippedPages = useCallback(async () => {
    if (!user?.companyId) {
      return;
    }

    try {
      console.log("🔄 Loading skipped pages for company:", user.companyId);

      const response = await fetch(
        `${envConfig.apiUrl}/facebook-oauth/skipped-pages?companyId=${user.companyId}`,
        {
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
        },
      );

      const data = await response.json();

      console.log("✅ Skipped Pages Response:", data);

      if (data.success && data.skippedPages) {
        setSkippedPages(data.skippedPages);
        console.log(`📊 Found ${data.count} skipped pages`);
      }
    } catch (error: unknown) {
      console.error("❌ Error loading skipped pages:", error);
    }
  }, [user?.companyId]);

  useEffect(() => {
    if (isAuthenticated && user?.companyId) {
      void loadOAuthStatus();
      void loadSkippedPages(); // 🆕 جلب الصفحات المتخطاة
    }
  }, [isAuthenticated, loadOAuthStatus, loadSkippedPages, user?.companyId]);

  useEffect(() => {
    const availablePageIds = new Set(
      (oauthStatus?.pages || []).map((page) => page.id),
    );

    setSelectedPageIds((current) =>
      current.filter((pageId) => availablePageIds.has(pageId)),
    );
  }, [oauthStatus]);

  useEffect(() => {
    if (!user?.companyId) {
      return;
    }

    return subscribeToFacebookPageSync((payload) => {
      if (payload.companyId && payload.companyId !== user.companyId) {
        return;
      }

      void loadOAuthStatus();
      void loadSkippedPages();
    });
  }, [loadOAuthStatus, loadSkippedPages, user?.companyId]);

  useEffect(() => {
    // Check for URL parameters (success/error from OAuth callback)
    const urlParams = new URLSearchParams(window.location.search);
    const successParam = urlParams.get("success");
    const errorParam = urlParams.get("error");
    const pagesParam = urlParams.get("pages");
    const skippedParam = urlParams.get("skipped");
    const skippedDataParam = urlParams.get("skippedData");
    const companyParam = urlParams.get("companyId");

    console.log("📋 URL Parameters from OAuth callback:", {
      successParam,
      errorParam,
      pagesParam,
      skippedParam,
      skippedDataParam: skippedDataParam ? "present" : "absent",
      companyParam,
      currentPath: window.location.pathname,
    });

    if (successParam === "true") {
      const pagesCount = pagesParam || "0";
      const skippedCount = skippedParam || "0";

      if (pagesCount === "0") {
        // Valid token but zero page grants (New Pages Experience opt-in lost) —
        // name the state instead of showing a fake "success".
        setNoPageGrants(true);
        setSuccess(null);
      } else {
        setNoPageGrants(false);
        let successMessage = String(t("facebookOAuth.pagesConnected" as any, { count: parseInt(pagesCount, 10) }));

      if (parseInt(skippedCount, 10) > 0) {
        successMessage += " " + String(t("facebookOAuth.pagesSkipped" as any, { count: parseInt(skippedCount, 10) }));


        if (skippedDataParam) {
          try {
            const decodedData = atob(decodeURIComponent(skippedDataParam));
            const parsedSkippedPages = JSON.parse(decodedData);

            if (
              parsedSkippedPages &&
              Array.isArray(parsedSkippedPages) &&
              parsedSkippedPages.length > 0
            ) {
              setSkippedPages(parsedSkippedPages);
            }
          } catch (e) {
            console.error("❌ Error parsing skipped pages data:", e);
          }
        }
      }

      setSuccess(successMessage);

      // Clear URL parameters without reload
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);

      // Reload status after a short delay to ensure database is updated
      setTimeout(() => {
        void loadOAuthStatus();
    void loadSkippedPages();
        emitFacebookPageSync(companyParam || user?.companyId || null);
      }, 2000);
      }
    }

    if (errorParam) {
      let errorMessage = String(t("facebookOAuth.connectError" as any, { error: decodeURIComponent(errorParam) }));

      const errorTranslations: Record<string, string> = {
        missing_code_or_state: String(t("facebookOAuth.missingCodeOrState" as any)),
        invalid_state: String(t("facebookOAuth.invalidState" as any)),
        no_company_id: String(t("facebookOAuth.noCompanyId" as any)),
        no_pages_found: String(t("facebookOAuth.noPagesFound" as any)),
        facebook_oauth_access_denied: String(t("facebookOAuth.accessDenied" as any)),
        account_identity_failed: String(t("facebookOAuth.accountIdentityFailed" as any)),
        account_link_failed: String(t("facebookOAuth.accountLinkFailed" as any)),
      };

      const translatedErr = errorTranslations[errorParam];
      if (translatedErr) {
        errorMessage = translatedErr;
      }

      setError(errorMessage);
      // Clear URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [loadOAuthStatus, loadSkippedPages, user?.companyId]);

  const resolveSkippedPages = async () => {
    if (!user?.companyId) {
      return;
    }

    try {
      console.log("🔄 Resolving skipped pages for company:", user.companyId);

      const response = await fetch(
        `${envConfig.apiUrl}/facebook-oauth/resolve-skipped?companyId=${user.companyId}`,
        {
          method: "POST",
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({}), // Empty body to resolve all
        },
      );

      const data = await response.json();

      console.log("✅ Resolve Response:", data);

      if (data.success) {
        setSkippedPages([]);
        setSuccess(String(t("facebookOAuth.pagesResolved" as any, { count: data.resolvedCount })));
      }
    } catch (error: unknown) {
      console.error("❌ Error resolving skipped pages:", error);
      setError(String(t("facebookOAuth.resolveError" as any)));
    }
  };

  const forceDisconnectPage = async (pageId: string) => {
    try {
      setForceDisconnecting(pageId);
      setError(null);

      const response = await fetch(
        `${envConfig.apiUrl}/facebook-oauth/force-disconnect-page`,
        {
          method: "POST",
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ pageId }),
        },
      );

      const data = await response.json();

      if (data.success) {
        setSuccess(data.message || t("facebookOAuth.forceDisconnectSuccess"));
        setSkippedPages((current) => current.filter((page) => page.pageId !== pageId));
        void loadOAuthStatus();
        void loadSkippedPages();
        emitFacebookPageSync(user?.companyId || null);
      } else {
        setError(data.message || t("facebookOAuth.forceDisconnectError"));
      }
    } catch (error) {
      console.error("❌ Error force-disconnecting page:", error);
      setError(t("facebookOAuth.forceDisconnectError"));
    } finally {
      setForceDisconnecting(null);
    }
  };

  const popupRef = React.useRef<Window | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "facebook-oauth-callback") {
        const data = event.data;
        if (data.success) {
          const pagesCount = data.pages || "0";
          const skippedCount = data.skipped || "0";
          if (pagesCount === "0") {
            setNoPageGrants(true);
          } else {
            setNoPageGrants(false);
            let msg = t("facebookOAuth.pagesConnected", { count: pagesCount });
            if (parseInt(skippedCount) > 0) {
              msg += t("facebookOAuth.pagesSkipped", { count: skippedCount });
            }
            setSuccess(msg);
          }
          if (data.skippedPages) {
            setSkippedPages(data.skippedPages);
          }
          setTimeout(() => {
            void loadOAuthStatus();
            void loadSkippedPages();
            emitFacebookPageSync(user?.companyId || null);
          }, 2000);
        } else if (data.error) {
          setError(data.error);
        }
        if (popupRef.current && !popupRef.current.closed) {
          popupRef.current.close();
        }
        popupRef.current = null;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [loadOAuthStatus, loadSkippedPages, user?.companyId]);

  const handleConnectFacebook = async (reauthorize = true) => {
    if (!user?.companyId) {
      setError(t("facebookOAuth.companyIdMissing"));
      return;
    }

    const popup = window.open(
      "",
      "facebook-oauth",
      "width=600,height=800,scrollbars=yes,resizable=yes",
    );
    if (!popup) {
      setError(t("facebookOAuth.popupBlocked"));
      return;
    }
    popupRef.current = popup;

    try {
      setLoading(true);
      setError(null);

      const reauthParam = reauthorize === false ? "&reauthorize=false" : "&reauthorize=true";
      const response = await fetch(
        `${envConfig.apiUrl}/facebook-oauth/authorize?companyId=${user.companyId}&userId=${user.id}&popup=true&returnOrigin=${encodeURIComponent(window.location.origin)}${reauthParam}`,
        {
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
        },
      );

      const data = await response.json();

      if (data.success && data.authUrl) {
        popup.location.href = data.authUrl;
      } else {
        popup.close();
        popupRef.current = null;
        setError(data.message || t("facebookOAuth.createAuthUrlFailed"));
      }
    } catch (error) {
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
      popupRef.current = null;
      console.error("Error initiating OAuth:", error);
      setError(t("facebookOAuth.startOAuthError"));
    } finally {
      setLoading(false);
    }
  };

  // When the zero-page-grants state appears, fetch which companies would be
  // affected by a full re-consent (same Facebook user linked pages elsewhere).
  useEffect(() => {
    if (!noPageGrants || !user?.companyId) {
      return;
    }
    let cancelled = false;
    const checkEligibility = async () => {
      try {
        const response = await fetch(
          `${envConfig.apiUrl}/facebook-oauth/reauthorize-consent/check?companyId=${user.companyId}`,
          { headers: getAuthHeaders({ "Content-Type": "application/json" }) },
        );
        const data = await response.json();
        if (!cancelled && data.success) {
          setAffectedCompanies(Array.isArray(data.affectedCompanies) ? data.affectedCompanies : []);
        }
      } catch (checkError) {
        console.warn("⚠️ reauthorize-consent check failed:", checkError);
      }
    };
    void checkEligibility();
    return () => {
      cancelled = true;
    };
  }, [noPageGrants, user?.companyId]);

  const handleFullReconsent = async () => {
    if (!user?.companyId) {
      return;
    }

    const popup = window.open(
      "",
      "facebook-oauth",
      "width=600,height=800,scrollbars=yes,resizable=yes",
    );
    if (!popup) {
      setError(t("facebookOAuth.popupBlocked"));
      return;
    }
    popupRef.current = popup;

    try {
      setReconsenting(true);
      setError(null);

      const response = await fetch(
        `${envConfig.apiUrl}/facebook-oauth/reauthorize-consent?companyId=${user.companyId}&popup=true&force=true&returnOrigin=${encodeURIComponent(window.location.origin)}`,
        {
          method: "POST",
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ force: true }),
        },
      );

      const data = await response.json();

      if (data.success && data.authUrl) {
        setNoPageGrants(false);
        popup.location.href = data.authUrl;
      } else {
        popup.close();
        popupRef.current = null;
        setError(data.message || t("facebookOAuth.reconsentFailed"));
      }
    } catch (reconsentError) {
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
      popupRef.current = null;
      console.error("Error executing full re-consent:", reconsentError);
      setError(t("facebookOAuth.reconsentFailed"));
    } finally {
      setReconsenting(false);
    }
  };

  const handleDisconnectPages = async (pageIds: string[]) => {
    if (pageIds.length === 0) {
      return;
    }

    const confirmMessage =
      pageIds.length === 1
        ? t("facebookOAuth.confirmDisconnectSingle")
        : t("facebookOAuth.confirmDisconnectMultiple", { count: pageIds.length });

    if (!confirm(confirmMessage)) {
      return;
    }

    if (!user?.companyId) {
      setError(t("facebookOAuth.companyIdMissing"));
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${envConfig.apiUrl}/facebook-oauth/disconnect?companyId=${user.companyId}`,
        {
          method: "DELETE",
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            pageIds,
          }),
        },
      );

      const data = await response.json();

      if (data.success) {
        setSelectedPageIds((current) =>
          current.filter((pageId) => !pageIds.includes(pageId)),
        );
        setSuccess(data.message || t("facebookOAuth.disconnectedSuccessfully"));
        await loadOAuthStatus();
        emitFacebookPageSync(user.companyId);
      } else {
        setError(data.message || t("facebookOAuth.disconnectFailed"));
      }
    } catch (error) {
      console.error("Error disconnecting page:", error);
      setError(t("facebookOAuth.disconnectError"));
    } finally {
      setLoading(false);
    }
  };

  const handleHardDeletePages = async (pageIds: string[]) => {
    if (pageIds.length === 0) {
      return;
    }

    const confirmMessage =
      pageIds.length === 1
        ? t("facebookOAuth.confirmHardDeleteSingle")
        : t("facebookOAuth.confirmHardDeleteMultiple", { count: pageIds.length });

    if (!confirm(confirmMessage)) {
      return;
    }

    if (!user?.companyId) {
      setError(t("facebookOAuth.companyIdMissing"));
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${envConfig.apiUrl}/facebook-oauth/disconnect?companyId=${user.companyId}`,
        {
          method: "DELETE",
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            pageIds,
            permanent: true,
          }),
        },
      );

      const data = await response.json();

      if (data.success) {
        setSelectedPageIds((current) =>
          current.filter((pageId) => !pageIds.includes(pageId)),
        );
        setSuccess(data.message || t("facebookOAuth.hardDeleteSuccess"));
        await loadOAuthStatus();
        emitFacebookPageSync(user.companyId);
      } else {
        setError(data.message || t("facebookOAuth.hardDeleteFailed"));
      }
    } catch (error) {
      console.error("Error hard deleting page:", error);
      setError(t("facebookOAuth.hardDeleteError"));
    } finally {
      setLoading(false);
    }
  };

  const handleReconnectPages = async (pageIds: string[]) => {
    if (pageIds.length === 0) {
      return;
    }

    if (!user?.companyId) {
      setError(t("facebookOAuth.companyIdMissing"));
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${envConfig.apiUrl}/facebook-oauth/reconnect?companyId=${user.companyId}`,
        {
          method: "POST",
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            pageIds,
          }),
        },
      );

      const data = await response.json();

      if (data.reconnectedCount > 0) {
        setSelectedPageIds((current) =>
          current.filter((pageId) => !pageIds.includes(pageId)),
        );
        setSuccess(data.message || t("facebookOAuth.reconnectSuccess"));
        await loadOAuthStatus();
        emitFacebookPageSync(user.companyId);
      }

      if (data.failedPages?.length) {
        const failedNames = data.failedPages
          .map((page: { pageName?: string | null; pageId?: string | null }) =>
            page.pageName || page.pageId || t("facebookOAuth.unknownPage"),
          )
          .join("، ");

        setError(t("facebookOAuth.reconnectSomeFailed", { failedNames }));
      } else if (!data.success && !data.reconnectedCount) {
        setError(data.message || t("facebookOAuth.reconnectFailed"));
      }
    } catch (error) {
      console.error("Error reconnecting pages:", error);
      setError(t("facebookOAuth.reconnectError"));
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePageSelection = (pageId: string) => {
    setSelectedPageIds((current) =>
      current.includes(pageId)
        ? current.filter((value) => value !== pageId)
        : [...current, pageId],
    );
  };

  const handleToggleSelectAll = () => {
    const allPageIds = (oauthStatus?.pages || []).map((page) => page.id);
    setSelectedPageIds((current) =>
      current.length === allPageIds.length ? [] : allPageIds,
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(i18n.language === "ar" ? "ar-EG" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const pages = oauthStatus?.pages || [];
  const connectedPagesCount =
    oauthStatus?.connectedPagesCount ??
    pages.filter((page) => page.status === "connected").length;
  const disconnectedPagesCount =
    oauthStatus?.disconnectedPagesCount ??
    pages.filter((page) => page.status !== "connected").length;
  const allPagesSelected =
    pages.length > 0 && selectedPageIds.length === pages.length;
  const selectedPages = pages.filter((page) => selectedPageIds.includes(page.id));
  const selectedConnectedPageIds = selectedPages
    .filter((page) => page.status === "connected")
    .map((page) => page.id);
  const selectedReconnectablePageIds = selectedPages
    .filter((page) => page.canReconnect !== false)
    .map((page) => page.id);

  const accountGroups = useMemo(() => {
    const groups = new Map<string, FacebookPage[]>();
    for (const page of pages) {
      const key = page.account?.id || "__legacy__";
      const bucket = groups.get(key);
      if (bucket) {
        bucket.push(page);
      } else {
        groups.set(key, [page]);
      }
    }

    return Array.from(groups.entries()).map(([key, items]) => {
      const account =
        key === "__legacy__"
          ? undefined
          : oauthStatus?.accounts?.find((account) => account.id === key);
      return {
        key,
        label: account?.name
          ? t("facebookOAuth.accountGroupTitle", { name: account.name })
          : t("facebookOAuth.unknownAccount"),
        items,
      };
    });
  }, [pages, oauthStatus, t]);

  const handleDebug = async () => {
    if (!user?.companyId) return;

    try {
      // Make direct API call with companyId in URL
      const response = await fetch(
        `${envConfig.apiUrl}/facebook-oauth/debug?companyId=${user.companyId}`,
        {
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
        },
      );

      const data = await response.json();
      console.log("🐛 Debug Response:", data);

      alert(`${t("facebookOAuth.debugTitle")}:
${t("facebookOAuth.debugCompany", { id: data.companyId })}
${t("facebookOAuth.debugTotalPages", { count: data.totalPages })}
${t("facebookOAuth.debugConnectedPages", { count: data.connectedPages })}
${t("facebookOAuth.debugDisconnectedPages", { count: data.disconnectedPages })}

${t("facebookOAuth.debugPageDetails")}:
${(Array.isArray(data.pages) ? (data.pages as FacebookDebugPage[]) : [])
  .map((page) => t("facebookOAuth.debugPageEntry", { pageName: page.pageName, pageId: page.pageId, status: page.status }))
  .join("\n")}`);
    } catch (error) {
      console.error("Debug error:", error);
    }
  };
  void handleDebug;

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-gray-600">{t("facebookOAuth.mustLogin")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-6 space-y-6" dir={getDirection()}>
      {/* Success/Error Messages */}
      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl">
          <div className="flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-500 ml-3 shrink-0" />
            <p className="text-green-800 dark:text-green-200 whitespace-pre-line">{success}</p>
            <button
              onClick={() => {
                setSuccess(null);
                setSkippedPages([]);
              }}
              className="mr-auto text-green-600 hover:text-green-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Skipped Pages Warning */}
      {skippedPages.length > 0 && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-xl">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500 ml-3 mt-0.5 shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                {t("facebookOAuth.skippedPagesTitle", { count: skippedPages.length })}
              </h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-3">
                {t("facebookOAuth.skippedPagesDesc")}
              </p>
              <div className="space-y-2">
                {skippedPages.map((page) => (
                  <div
                    key={page.pageId}
                    className="flex items-center p-3 bg-white dark:bg-gray-800 rounded-xl border border-yellow-300 dark:border-yellow-700"
                  >
                    <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg flex items-center justify-center ml-3">
                      <ChatBubbleLeftRightIcon className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {page.pageName}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Page ID: {page.pageId}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 text-xs rounded-full">
                        {t("facebookOAuth.skippedPageBoundToOther")}
                      </span>
                      {(user?.role === "SUPER_ADMIN" ||
                        user?.role === "OWNER" ||
                        user?.role === "MANAGER" ||
                        user?.role === "COMPANY_ADMIN" ||
                        user?.role === "ADMIN") && (
                        <button
                          onClick={() => void forceDisconnectPage(page.pageId)}
                          disabled={forceDisconnecting === page.pageId}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-xs font-medium transition-colors"
                        >
                          {forceDisconnecting === page.pageId
                            ? t("facebookOAuth.forceDisconnecting")
                            : t("facebookOAuth.claimPageToCompany")}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-xl">
                <p className="text-sm text-yellow-900 dark:text-yellow-200 mb-3">
                  {t("facebookOAuth.skippedPagesNote")}
                </p>
                <button
                  onClick={resolveSkippedPages}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm font-medium"
                >
                  {t("facebookOAuth.skippedPagesAcknowledge")}
                </button>
              </div>
            </div>
            <button
              onClick={resolveSkippedPages}
              className="mr-2 text-yellow-600 hover:text-yellow-800 text-xl"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500 ml-3 shrink-0" />
            <p className="text-red-800 dark:text-red-200">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mr-auto text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* OAuth Connection Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 shrink-0">
            <ArrowTopRightOnSquareIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t("facebookOAuth.facebookInstagram")}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("facebookOAuth.description")}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="mr-3 text-sm text-gray-500">{t("facebookOAuth.loading")}</span>
          </div>
        ) : oauthStatus?.connected ? (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-900/30 border border-gray-150 dark:border-gray-800 rounded-xl">
              <div className="flex flex-col gap-2">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-950/30 rounded-full w-fit">
                  <CheckCircleIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">
                    {t("facebookOAuth.connectedPagesCount", { count: connectedPagesCount })}
                  </span>
                </div>
                {disconnectedPagesCount > 0 && (
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    {t("facebookOAuth.disconnectedPagesHint", { count: disconnectedPagesCount })}
                  </p>
                )}
              </div>

              {oauthStatus.facebookUser && (
                <div className="flex items-center gap-3 bg-white dark:bg-gray-850 p-2.5 px-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm shrink-0">
                  {oauthStatus.facebookUser.picture ? (
                    <img
                      src={oauthStatus.facebookUser.picture}
                      alt={oauthStatus.facebookUser.name}
                      className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                      {oauthStatus.facebookUser.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">{t("facebookOAuth.linkedAccount")}</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                      {oauthStatus.facebookUser.name}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => void handleConnectFacebook(false)}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                <PlusIcon className="h-4 w-4" />
                {loading ? t("facebookOAuth.loading") : t("facebookOAuth.addMorePages")}
              </button>

              <button
                onClick={() => void handleConnectFacebook(true)}
                disabled={loading}
                title={t("facebookOAuth.reselectPagesTooltip")}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 text-sm font-medium rounded-lg transition-colors border border-gray-200 dark:border-gray-600"
              >
                <ArrowPathIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                {t("facebookOAuth.reselectPages")}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-6">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mb-4">
              <ExclamationTriangleIcon className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t("facebookOAuth.noPagesConnected")}</p>

            {oauthStatus?.facebookUser && (
              <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900/30 p-2.5 px-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm mb-6 max-w-sm">
                {oauthStatus.facebookUser.picture ? (
                  <img
                    src={oauthStatus.facebookUser.picture}
                    alt={oauthStatus.facebookUser.name}
                    className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                    {oauthStatus.facebookUser.name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">{t("facebookOAuth.linkedAccount")}</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                    {oauthStatus.facebookUser.name}
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => void handleConnectFacebook(false)}
                disabled={loading || !user?.companyId}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-sm font-medium shadow-lg shadow-blue-600/20 transition-colors"
              >
                <ArrowTopRightOnSquareIcon className="h-5 w-5" />
                {loading ? t("facebookOAuth.loading") : t("facebookOAuth.connectWithFacebook")}
              </button>

              <button
                onClick={() => void handleConnectFacebook(true)}
                disabled={loading || !user?.companyId}
                title={t("facebookOAuth.reselectPagesTooltip")}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 text-sm font-medium rounded-xl transition-colors border border-gray-200 dark:border-gray-600"
              >
                <ArrowPathIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                {t("facebookOAuth.reselectPagesInitial")}
              </button>
            </div>

            <div className="mt-5 p-3 bg-blue-50/70 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl max-w-lg text-center">
              <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                {t("facebookOAuth.reconnectPagesHelpTip")}
              </p>
            </div>

            {!user?.companyId && (
              <p className="mt-2 text-sm text-red-600">{t("facebookOAuth.companyIdMissing")}</p>
            )}
          </div>
        )}
      </div>

      {/* Zero page grants — named state with guided recovery */}
      {noPageGrants && (
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800 shadow-sm p-5">
          <h3 className="text-base font-semibold text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
            {t("facebookOAuth.noPageGrantsTitle")}
          </h3>
          <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
            {t("facebookOAuth.noPageGrantsMessage")}
          </p>
          {affectedCompanies.length > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
              {t("facebookOAuth.reconsentWarningCompanies", {
                companies: affectedCompanies
                  .map((company) => company.companyName)
                  .join("، "),
              })}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleFullReconsent}
              disabled={reconsenting || loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
              {reconsenting
                ? t("facebookOAuth.reconsentProcessing")
                : t("facebookOAuth.reconsentButton")}
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {t("facebookOAuth.reconsentManualHint")}
            </span>
          </div>
        </div>
      )}

      {/* Connected Pages */}
      {pages.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
            <UserGroupIcon className="h-5 w-5 text-gray-500" />
            {t("facebookOAuth.savedPages", { count: pages.length })}
            {oauthStatus?.accounts && oauthStatus.accounts.length > 0 && (
              <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                {t("facebookOAuth.accountsCount", {
                  count: oauthStatus.accounts.length,
                })}
              </span>
            )}
          </h3>

          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-4 md:flex-row md:items-center md:justify-between">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
              <input
                type="checkbox"
                checked={allPagesSelected}
                onChange={handleToggleSelectAll}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              {t("facebookOAuth.selectAll")}
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ({selectedPageIds.length}/{pages.length})
              </span>
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleReconnectPages(selectedReconnectablePageIds)}
                disabled={loading || selectedReconnectablePageIds.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-xs font-medium transition-colors"
              >
                <ArrowPathIcon className="h-3.5 w-3.5" />
                {t("facebookOAuth.reconnectSelected")}
              </button>
              <button
                onClick={() => handleDisconnectPages(selectedConnectedPageIds)}
                disabled={loading || selectedConnectedPageIds.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-xs font-medium transition-colors"
              >
                <TrashIcon className="h-3.5 w-3.5" />
                {t("facebookOAuth.disconnectSelected")}
              </button>
              <button
                onClick={() => handleHardDeletePages(selectedPageIds)}
                disabled={loading || selectedPageIds.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-900 text-white rounded-lg hover:bg-red-950 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-xs font-medium transition-colors"
              >
                <TrashIcon className="h-3.5 w-3.5" />
                {t("facebookOAuth.deletePermanently")}
              </button>
            </div>
          </div>

          {pages.length === 0 && !loading ? (
            <div className="flex flex-col items-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
              <UserGroupIcon className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">{t("facebookOAuth.noPagesFoundYet")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {accountGroups.map((group) => (
                <div key={group.key} className="space-y-3">
                  <div className="flex items-center gap-2 px-1 pb-1">
                    <UserGroupIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {group.label}
                    </h4>
                    <span className="text-xs text-gray-400">
                      ({group.items.length})
                    </span>
                  </div>
                  {group.items.map((page) => (
                    <div
                      key={page.id}
                      className="flex items-start justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-xl gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                  <div className="flex items-start flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={selectedPageIds.includes(page.id)}
                      onChange={() => handleTogglePageSelection(page.id)}
                      className="mt-3 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ml-3 shrink-0"
                    />
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center ml-3 shrink-0">
                      <ChatBubbleLeftRightIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-medium text-gray-900 dark:text-white truncate">
                        {page.pageName}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {page.pageId}
                      </p>
                      {page.connectedAt && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {t("facebookOAuth.connectedSince", { date: formatDate(page.connectedAt) })}
                        </p>
                      )}
                      {page.disconnectedAt && page.status !== "connected" && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {t("facebookOAuth.disconnectedAt", { date: formatDate(page.disconnectedAt) })}
                        </p>
                      )}
                      {page.healthMessage && (
                        <p className="text-xs text-amber-600 mt-0.5">
                          {page.healthMessage}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <span
                      className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
                        page.status === "connected" && !page.needsReconnect
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                          : page.needsReconnect
                            ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      {page.status === "connected"
                        ? page.needsReconnect
                          ? t("facebookOAuth.needsReconnect")
                          : t("facebookOAuth.connected")
                        : t("facebookOAuth.pageNotConnected")}
                    </span>

                    {page.attribution === "stale" && (
                      <span
                        title={t("facebookOAuth.attributionStaleHint")}
                        className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 cursor-help"
                      >
                        {t("facebookOAuth.attributionStale")}
                      </span>
                    )}
                    {page.attribution === "unattributed" && (
                      <span
                        title={t("facebookOAuth.attributionUnlinkedHint")}
                        className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 cursor-help"
                      >
                        {t("facebookOAuth.attributionUnlinked")}
                      </span>
                    )}

                    {page.canReconnect !== false && (
                      <button
                        onClick={() => handleReconnectPages([page.id])}
                        disabled={loading}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg disabled:opacity-50 text-xs font-medium transition-colors"
                        title={t("facebookOAuth.reconnectTooltip")}
                      >
                        <ArrowPathIcon className="h-3.5 w-3.5" />
                        {t("facebookOAuth.reconnect")}
                      </button>
                    )}

                    {page.status === "connected" && (
                      <button
                        onClick={() => handleDisconnectPages([page.id])}
                        disabled={loading}
                        className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50 transition-colors"
                        title={t("facebookOAuth.disconnect")}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleHardDeletePages([page.id])}
                      disabled={loading}
                      className="p-1.5 text-red-900 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg disabled:opacity-50 transition-colors"
                        title={t("facebookOAuth.hardDeleteTooltip")}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default FacebookOAuth;
