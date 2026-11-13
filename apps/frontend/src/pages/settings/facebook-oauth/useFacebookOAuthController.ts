import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../hooks/useAuthSimple";
import { envConfig } from "../../../config/environment";
import tokenManager from "../../../utils/tokenManager";
import {
  emitFacebookPageSync,
  subscribeToFacebookPageSync,
} from "../../../utils/facebookPageSync";
import {
  FACEBOOK_IMPORT_QUEUED_EVENT,
  createQueuedImportProgress,
  normalizeFacebookImportProgress,
  publishFacebookImportProgress,
  type FacebookImportProgress,
} from "./FacebookOAuthImportProgress";
import type {
  OAuthStatus,
  SkippedPage,
  FacebookPage,
  AffectedCompany,
  AccountGroup,
} from "./types";

/** التقدم بيتم سؤاله كل 1.5 ثانية، وبنسيب فرصة 3 دقايق كحد أقصى. */
const IMPORT_POLL_INTERVAL_MS = 1500;
const IMPORT_POLL_MAX_DURATION_MS = 3 * 60 * 1000;

const getAuthHeaders = (additionalHeaders: Record<string, string> = {}) =>
  tokenManager.createAuthHeaders(additionalHeaders);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getApiErrorMessage = (error: unknown, fallbackMessage: string): string => {
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

export function useFacebookOAuthController() {
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [oauthStatus, setOauthStatus] = useState<OAuthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [skippedPages, setSkippedPages] = useState<SkippedPage[]>([]);
  const [forceDisconnecting, setForceDisconnecting] = useState<string | null>(null);
  const [noPageGrants, setNoPageGrants] = useState(false);
  const [affectedCompanies, setAffectedCompanies] = useState<AffectedCompany[]>([]);
  const [reconsenting, setReconsenting] = useState(false);
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const [importProgress, setImportProgress] = useState<FacebookImportProgress | null>(null);
  /** 0 = مفيش polling شغّال؛ أي رقم = معرّف جلسة polling (بيتيح restart نظيف). */
  const [importPollRunId, setImportPollRunId] = useState(0);
  const popupRef = useRef<Window | null>(null);

  const applyImportProgress = useCallback(
    (progress: FacebookImportProgress | null) => {
      setImportProgress(progress);
      publishFacebookImportProgress(progress);
    },
    [],
  );

  const startImportPolling = useCallback(() => {
    setImportPollRunId(Date.now());
  }, []);

  const loadOAuthStatus = useCallback(async () => {
    if (!user?.companyId) {
      setError(t("facebookOAuth.companyIdMissing"));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${envConfig.apiUrl}/facebook-oauth/status?companyId=${user.companyId}`,
        {
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
        },
      );

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const isGatewayError =
          response.status === 502 || response.status === 503 || response.status === 504 || response.status === 520;
        setError(
          t("facebookOAuth.loadStatusError", {
            error: isGatewayError
              ? "الخادم غير متاح مؤقتاً، يرجى المحاولة بعد قليل"
              : `HTTP ${response.status}`,
          }),
        );
        return;
      }

      const data = await response.json();

      if (data.success) {
        setOauthStatus(data);

        // 📦 لو فيه استيراد صفحات شغّال/في الطابور، نكمل نتابع progress.
        const progress = normalizeFacebookImportProgress(data.importProgress);
        if (progress) {
          applyImportProgress(progress);
          if (progress.status === "queued" || progress.status === "running") {
            setImportPollRunId(Date.now());
          }
        }
      } else {
        setError(data.message || t("facebookOAuth.loadStatusFailed"));
      }
    } catch (err: unknown) {
      setError(
        t("facebookOAuth.loadStatusError", {
          error: getApiErrorMessage(err, t("facebookOAuth.unexpectedError")),
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [user?.companyId, t, applyImportProgress]);

  const loadSkippedPages = useCallback(async () => {
    if (!user?.companyId) return;

    try {
      const response = await fetch(
        `${envConfig.apiUrl}/facebook-oauth/skipped-pages?companyId=${user.companyId}`,
        {
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
        },
      );

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await response.json();
        if (data.success && data.skippedPages) {
          setSkippedPages(data.skippedPages);
        }
      }
    } catch {
      // silent catch for background telemetry
    }
  }, [user?.companyId]);

  useEffect(() => {
    if (isAuthenticated && user?.companyId) {
      void loadOAuthStatus();
      void loadSkippedPages();
    }
  }, [isAuthenticated, loadOAuthStatus, loadSkippedPages, user?.companyId]);

  // 🔄 متابعة استيراد الصفحات في الخلفية: poll لـ /status كل 1.5 ثانية،
  // يتوقف عند completed/failed أو بعد 3 دقايق.
  useEffect(() => {
    if (!importPollRunId || !user?.companyId) return;

    const companyId = user.companyId;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const deadline = Date.now() + IMPORT_POLL_MAX_DURATION_MS;

    const tick = async () => {
      if (cancelled) return;

      try {
        const response = await fetch(
          `${envConfig.apiUrl}/facebook-oauth/status?companyId=${companyId}`,
          { headers: getAuthHeaders({ "Content-Type": "application/json" }) },
        );
        const data = await response.json();
        const progress = data?.success
          ? normalizeFacebookImportProgress(data.importProgress)
          : null;

        if (cancelled) return;

        if (progress) {
          applyImportProgress(progress);

          if (progress.status === "completed") {
            setImportPollRunId(0);
            setNoPageGrants(progress.total === 0);
            if (progress.done > 0) {
              setSuccess(
                String(
                  t("facebookOAuth.pagesConnected" as any, { count: progress.done }),
                ),
              );
            }
            await loadOAuthStatus();
            void loadSkippedPages();
            emitFacebookPageSync(companyId);
            return;
          }

          if (progress.status === "failed") {
            setImportPollRunId(0);
            setError(
              String(
                t("facebookOAuth.importFailedWithError" as any, {
                  error: progress.lastError || "",
                }),
              ),
            );
            await loadOAuthStatus();
            return;
          }
        } else if (data?.success) {
          // مفيش progress في الـ instance ده (ممكن الـ job شغّال على worker تاني
          // في وضع PM2 cluster) — نعتمد على الداتابيز ونحدّث قائمة الصفحات.
          setOauthStatus(data);
        }
      } catch {
        // شبكة متعثرة لحظيًا — نكمل polling
      }

      if (cancelled) return;
      if (Date.now() >= deadline) {
        // خلص وقت المتابعة: نحدّث القائمة مرة أخيرة (الداتابيز هي الحقيقة).
        setImportPollRunId(0);
        void loadOAuthStatus();
        return;
      }
      timer = setTimeout(() => void tick(), IMPORT_POLL_INTERVAL_MS);
    };

    void tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [
    importPollRunId,
    user?.companyId,
    applyImportProgress,
    loadOAuthStatus,
    loadSkippedPages,
    t,
  ]);

  // 🔁 لو الكارت أعاد تشغيل الاستيراد (زرار إعادة المحاولة) نبدأ polling جديد.
  useEffect(() => {
    const handleQueued = () => startImportPolling();
    window.addEventListener(FACEBOOK_IMPORT_QUEUED_EVENT, handleQueued);
    return () =>
      window.removeEventListener(FACEBOOK_IMPORT_QUEUED_EVENT, handleQueued);
  }, [startImportPolling]);

  const retryPageImport = useCallback(async () => {
    if (!user?.companyId) return;

    try {
      setError(null);
      const response = await fetch(
        `${envConfig.apiUrl}/facebook-oauth/import-pages?companyId=${user.companyId}`,
        {
          method: "POST",
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({}),
        },
      );

      const data = await response.json();
      if (data?.success) {
        applyImportProgress(
          normalizeFacebookImportProgress(data.importProgress) ||
            createQueuedImportProgress(),
        );
        startImportPolling();
      } else {
        setError(
          data?.message ||
            String(
              t(
                "facebookOAuth.importRetryFailed" as any,
                "تعذّر بدء استيراد الصفحات",
              ),
            ),
        );
      }
    } catch {
      setError(
        String(
          t("facebookOAuth.importRetryFailed" as any, "تعذّر بدء استيراد الصفحات"),
        ),
      );
    }
  }, [user?.companyId, applyImportProgress, startImportPolling, t]);

  useEffect(() => {
    const availablePageIds = new Set(
      (oauthStatus?.pages || []).map((page) => page.id),
    );
    setSelectedPageIds((current) =>
      current.filter((pageId) => availablePageIds.has(pageId)),
    );
  }, [oauthStatus]);

  useEffect(() => {
    if (!user?.companyId) return;

    return subscribeToFacebookPageSync((payload) => {
      if (payload.companyId && payload.companyId !== user.companyId) return;
      void loadOAuthStatus();
      void loadSkippedPages();
    });
  }, [loadOAuthStatus, loadSkippedPages, user?.companyId]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const successParam = urlParams.get("success");
    const errorParam = urlParams.get("error");
    const pagesParam = urlParams.get("pages");
    const skippedParam = urlParams.get("skipped");
    const skippedDataParam = urlParams.get("skippedData");
    const companyParam = urlParams.get("companyId");
    const importQueuedParam = urlParams.get("importQueued") === "true";

    if (successParam === "true" && importQueuedParam) {
      // 🚀 الاستيراد بقى شغل خلفي: مش بنعرض عدد وهمي ولا بنودّي المستخدم
      // لحالة "مفيش صفحات"، بنبدأ متابعة التقدم لحد ما الجوب يخلص.
      setNoPageGrants(false);
      setSuccess(null);
      applyImportProgress(createQueuedImportProgress());
      startImportPolling();
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (successParam === "true") {
      const pagesCount = pagesParam || "0";
      const skippedCount = skippedParam || "0";

      if (pagesCount === "0") {
        setNoPageGrants(true);
        setSuccess(null);
      } else {
        setNoPageGrants(false);
        let successMessage = String(
          t("facebookOAuth.pagesConnected" as any, { count: parseInt(pagesCount, 10) }),
        );

        if (parseInt(skippedCount, 10) > 0) {
          successMessage +=
            " " +
            String(
              t("facebookOAuth.pagesSkipped" as any, { count: parseInt(skippedCount, 10) }),
            );

          if (skippedDataParam) {
            try {
              const decodedData = atob(decodeURIComponent(skippedDataParam));
              const parsed = JSON.parse(decodedData);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setSkippedPages(parsed);
              }
            } catch {
              // ignore malformed param
            }
          }
        }

        setSuccess(successMessage);
        window.history.replaceState({}, document.title, window.location.pathname);

        setTimeout(() => {
          void loadOAuthStatus();
          void loadSkippedPages();
          emitFacebookPageSync(companyParam || user?.companyId || null);
        }, 2000);
      }
    }

    if (errorParam) {
      const errorTranslations: Record<string, string> = {
        missing_code_or_state: String(t("facebookOAuth.missingCodeOrState" as any)),
        invalid_state: String(t("facebookOAuth.invalidState" as any)),
        no_company_id: String(t("facebookOAuth.noCompanyId" as any)),
        no_pages_found: String(t("facebookOAuth.noPagesFound" as any)),
        facebook_oauth_access_denied: String(t("facebookOAuth.accessDenied" as any)),
        account_identity_failed: String(t("facebookOAuth.accountIdentityFailed" as any)),
        account_link_failed: String(t("facebookOAuth.accountLinkFailed" as any)),
      };

      setError(
        errorTranslations[errorParam] ||
          String(t("facebookOAuth.connectError" as any, { error: decodeURIComponent(errorParam) })),
      );
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [
    loadOAuthStatus,
    loadSkippedPages,
    user?.companyId,
    t,
    applyImportProgress,
    startImportPolling,
  ]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "facebook-oauth-callback") {
        const data = event.data;
        if (data.success) {
          if (data.importQueued) {
            // 🚀 الجوب الخلفي بدأ: نظهر "جارٍ استيراد الصفحات" ونستنى الـ progress.
            // ملاحظة مهمة: مش بنعمل refresh للصفحات دلوقتي عشان كارت الربط
            // يفضل ظاهر ومعه شريط التقدم لحد ما الاستيراد يخلص.
            setNoPageGrants(false);
            setSuccess(null);
            applyImportProgress(createQueuedImportProgress());
            startImportPolling();
            if (data.skippedPages) {
              setSkippedPages(data.skippedPages);
            }
            if (popupRef.current && !popupRef.current.closed) {
              popupRef.current.close();
            }
            popupRef.current = null;
            return;
          }

          const pagesCount = data.pages || "0";
          const skippedCount = data.skipped || "0";
          if (pagesCount === "0") {
            setNoPageGrants(true);
          } else {
            setNoPageGrants(false);
            let msg = String(t("facebookOAuth.pagesConnected" as any, { count: pagesCount }));
            if (parseInt(skippedCount, 10) > 0) {
              msg += " " + String(t("facebookOAuth.pagesSkipped" as any, { count: skippedCount }));
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
  }, [
    loadOAuthStatus,
    loadSkippedPages,
    user?.companyId,
    t,
    applyImportProgress,
    startImportPolling,
  ]);

  useEffect(() => {
    if (!noPageGrants || !user?.companyId) return;
    let cancelled = false;

    const checkEligibility = async () => {
      try {
        const response = await fetch(
          `${envConfig.apiUrl}/facebook-oauth/reauthorize-consent/check?companyId=${user.companyId}`,
          { headers: getAuthHeaders({ "Content-Type": "application/json" }) },
        );
        const data = await response.json();
        if (!cancelled && data.success && Array.isArray(data.affectedCompanies)) {
          setAffectedCompanies(data.affectedCompanies);
        }
      } catch {
        // silent check fail
      }
    };

    void checkEligibility();
    return () => {
      cancelled = true;
    };
  }, [noPageGrants, user?.companyId]);

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
    } catch {
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
      popupRef.current = null;
      setError(t("facebookOAuth.startOAuthError"));
    } finally {
      setLoading(false);
    }
  };

  const handleFullReconsent = async () => {
    if (!user?.companyId) return;

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
    } catch {
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
      popupRef.current = null;
      setError(t("facebookOAuth.reconsentFailed"));
    } finally {
      setReconsenting(false);
    }
  };

  const resolveSkippedPages = async () => {
    if (!user?.companyId) return;

    try {
      const response = await fetch(
        `${envConfig.apiUrl}/facebook-oauth/resolve-skipped?companyId=${user.companyId}`,
        {
          method: "POST",
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({}),
        },
      );

      const data = await response.json();
      if (data.success) {
        setSkippedPages([]);
        setSuccess(
          String(t("facebookOAuth.pagesResolved" as any, { count: data.resolvedCount })),
        );
      }
    } catch {
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
    } catch {
      setError(t("facebookOAuth.forceDisconnectError"));
    } finally {
      setForceDisconnecting(null);
    }
  };

  const handleDisconnectPages = async (pageIds: string[]) => {
    if (pageIds.length === 0 || !user?.companyId) return;

    const confirmMessage =
      pageIds.length === 1
        ? t("facebookOAuth.confirmDisconnectSingle")
        : t("facebookOAuth.confirmDisconnectMultiple", { count: pageIds.length });

    if (!window.confirm(confirmMessage)) return;

    try {
      setLoading(true);

      const response = await fetch(
        `${envConfig.apiUrl}/facebook-oauth/disconnect?companyId=${user.companyId}`,
        {
          method: "DELETE",
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ pageIds }),
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
    } catch {
      setError(t("facebookOAuth.disconnectError"));
    } finally {
      setLoading(false);
    }
  };

  const handleHardDeletePages = async (pageIds: string[]) => {
    if (pageIds.length === 0 || !user?.companyId) return;

    const confirmMessage =
      pageIds.length === 1
        ? t("facebookOAuth.confirmHardDeleteSingle")
        : t("facebookOAuth.confirmHardDeleteMultiple", { count: pageIds.length });

    if (!window.confirm(confirmMessage)) return;

    try {
      setLoading(true);

      const response = await fetch(
        `${envConfig.apiUrl}/facebook-oauth/disconnect?companyId=${user.companyId}`,
        {
          method: "DELETE",
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ pageIds, permanent: true }),
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
    } catch {
      setError(t("facebookOAuth.hardDeleteError"));
    } finally {
      setLoading(false);
    }
  };

  const handleReconnectPages = async (pageIds: string[]) => {
    if (pageIds.length === 0 || !user?.companyId) return;

    try {
      setLoading(true);

      const response = await fetch(
        `${envConfig.apiUrl}/facebook-oauth/reconnect?companyId=${user.companyId}`,
        {
          method: "POST",
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ pageIds }),
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
          .map((p: { pageName?: string | null; pageId?: string | null }) =>
            p.pageName || p.pageId || t("facebookOAuth.unknownPage"),
          )
          .join("، ");
        setError(t("facebookOAuth.reconnectSomeFailed", { failedNames }));
      } else if (!data.success && !data.reconnectedCount) {
        setError(data.message || t("facebookOAuth.reconnectFailed"));
      }
    } catch {
      setError(t("facebookOAuth.reconnectError"));
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePageSelection = (pageId: string) => {
    setSelectedPageIds((current) =>
      current.includes(pageId)
        ? current.filter((val) => val !== pageId)
        : [...current, pageId],
    );
  };

  const handleToggleSelectAll = () => {
    const allPageIds = (oauthStatus?.pages || []).map((page) => page.id);
    setSelectedPageIds((current) =>
      current.length === allPageIds.length ? [] : allPageIds,
    );
  };

  const pages = useMemo(() => oauthStatus?.pages || [], [oauthStatus?.pages]);
  const connectedPagesCount =
    oauthStatus?.connectedPagesCount ??
    pages.filter((page) => page.status === "connected").length;
  const disconnectedPagesCount =
    oauthStatus?.disconnectedPagesCount ??
    pages.filter((page) => page.status !== "connected").length;
  const allPagesSelected =
    pages.length > 0 && selectedPageIds.length === pages.length;

  const selectedPages = useMemo(
    () => pages.filter((page) => selectedPageIds.includes(page.id)),
    [pages, selectedPageIds],
  );

  const selectedConnectedPageIds = useMemo(
    () =>
      selectedPages
        .filter((page) => page.status === "connected")
        .map((page) => page.id),
    [selectedPages],
  );

  const selectedReconnectablePageIds = useMemo(
    () =>
      selectedPages
        .filter((page) => page.canReconnect !== false)
        .map((page) => page.id),
    [selectedPages],
  );

  const accountGroups = useMemo<AccountGroup[]>(() => {
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
          : oauthStatus?.accounts?.find((acc) => acc.id === key);
      return {
        key,
        label: account?.name
          ? t("facebookOAuth.accountGroupTitle", { name: account.name })
          : t("facebookOAuth.unknownAccount"),
        items,
      };
    });
  }, [pages, oauthStatus?.accounts, t]);

  return {
    user,
    isAuthenticated,
    loading,
    error,
    setError,
    success,
    setSuccess,
    oauthStatus,
    pages,
    skippedPages,
    forceDisconnecting,
    noPageGrants,
    affectedCompanies,
    reconsenting,
    selectedPageIds,
    connectedPagesCount,
    disconnectedPagesCount,
    allPagesSelected,
    selectedConnectedPageIds,
    selectedReconnectablePageIds,
    accountGroups,
    importProgress,
    loadOAuthStatus,
    loadSkippedPages,
    resolveSkippedPages,
    retryPageImport,
    forceDisconnectPage,
    handleConnectFacebook,
    handleFullReconsent,
    handleDisconnectPages,
    handleHardDeletePages,
    handleReconnectPages,
    handleTogglePageSelection,
    handleToggleSelectAll,
  };
}
