import React, { useState, useEffect, useCallback } from "react";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  PlusIcon,
  ArrowTopRightOnSquareIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../hooks/useAuthSimple";
import { envConfig } from "../../config/environment";
import tokenManager from "../../utils/tokenManager";
import {
  emitFacebookPageSync,
  subscribeToFacebookPageSync,
} from "../../utils/facebookPageSync";

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
}

interface OAuthStatus {
  connected: boolean;
  pagesCount: number;
  connectedPagesCount?: number;
  disconnectedPagesCount?: number;
  needsAttention?: boolean;
  unhealthyPagesCount?: number;
  pages: FacebookPage[];
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

const FacebookOAuth: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [oauthStatus, setOauthStatus] = useState<OAuthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [skippedPages, setSkippedPages] = useState<SkippedPage[]>([]);
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);

  const loadOAuthStatus = useCallback(async () => {
    if (!user?.companyId) {
      console.error("No company ID available");
      setError("معرف الشركة غير متوفر");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log("🔄 Loading OAuth status for company:", user.companyId);

      // استخدام await صريح مع زيادة timeout
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
        setError(data.message || "فشل في تحميل حالة الربط");
      }
    } catch (error: unknown) {
      console.error("❌ Error loading OAuth status:", error);
      setError(
        `خطأ في تحميل حالة الربط: ${getApiErrorMessage(error, "حدث خطأ غير متوقع")}`,
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

      let successMessage = `تم ربط ${pagesCount} صفحة بنجاح!`;

      // ⚠️ إضافة تحذير مفصل إذا كانت هناك صفحات تم تخطيها
      if (parseInt(skippedCount) > 0) {
        successMessage += ` (تم تخطي ${skippedCount} صفحة)`;

        // فك تشفير تفاصيل الصفحات المتخطاة
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
        void loadSkippedPages(); // 🆕 جلب الصفحات المتخطاة
        emitFacebookPageSync(companyParam || user?.companyId || null);
      }, 2000);
    }

    if (errorParam) {
      let errorMessage = `خطأ في الربط: ${decodeURIComponent(errorParam)}`;

      // ترجمة أخطاء معروفة
      const errorTranslations: { [key: string]: string } = {
        missing_code_or_state: "بيانات الربط ناقصة",
        invalid_state: "رابط الربط غير صالح",
        no_company_id: "معرف الشركة مفقود",
        no_pages_found: "لم يتم العثور على صفحات Facebook",
        facebook_oauth_access_denied: "تم رفض الإذن من قبل المستخدم",
      };

      if (errorTranslations[errorParam]) {
        errorMessage = errorTranslations[errorParam];
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
        setSuccess(`تم وضع علامة على ${data.resolvedCount} صفحة كمحلولة`);
      }
    } catch (error: unknown) {
      console.error("❌ Error resolving skipped pages:", error);
      setError("خطأ في وضع علامة على الصفحات المتخطاة");
    }
  };

  const handleConnectFacebook = async () => {
    if (!user?.companyId) {
      setError("معرف الشركة غير متوفر");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log("Connecting Facebook with company ID:", user.companyId);

      // Get authorization URL from backend with companyId in URL directly
      const response = await fetch(
        `${envConfig.apiUrl}/facebook-oauth/authorize?companyId=${user.companyId}&userId=${user.id}&returnOrigin=${encodeURIComponent(window.location.origin)}`,
        {
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
        },
      );

      const data = await response.json();

      console.log("Authorization Response:", data);

      if (data.success) {
        // Redirect to Facebook OAuth
        console.log("Redirecting to:", data.authUrl);
        window.location.href = data.authUrl;
      } else {
        setError(data.message || "فشل في إنشاء رابط الربط");
      }
    } catch (error) {
      console.error("Error initiating OAuth:", error);
      setError("خطأ في بدء عملية الربط");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectPages = async (pageIds: string[]) => {
    if (pageIds.length === 0) {
      return;
    }

    const confirmMessage =
      pageIds.length === 1
        ? "هل أنت متأكد من قطع الاتصال مع هذه الصفحة؟"
        : `هل أنت متأكد من قطع الاتصال مع ${pageIds.length} صفحات؟`;

    if (!confirm(confirmMessage)) {
      return;
    }

    if (!user?.companyId) {
      setError("معرف الشركة غير متوفر");
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
        setSuccess(data.message || "تم قطع الاتصال بنجاح");
        await loadOAuthStatus();
        emitFacebookPageSync(user.companyId);
      } else {
        setError(data.message || "فشل في قطع الاتصال");
      }
    } catch (error) {
      console.error("Error disconnecting page:", error);
      setError("خطأ في قطع الاتصال");
    } finally {
      setLoading(false);
    }
  };

  const handleReconnectPages = async (pageIds: string[]) => {
    if (pageIds.length === 0) {
      return;
    }

    if (!user?.companyId) {
      setError("معرف الشركة غير متوفر");
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
        setSuccess(data.message || "تمت إعادة الربط بنجاح");
        await loadOAuthStatus();
        emitFacebookPageSync(user.companyId);
      }

      if (data.failedPages?.length) {
        const failedNames = data.failedPages
          .map((page: { pageName?: string | null; pageId?: string | null }) =>
            page.pageName || page.pageId || "صفحة غير معروفة",
          )
          .join("، ");

        setError(`تعذر إعادة ربط بعض الصفحات: ${failedNames}`);
      } else if (!data.success && !data.reconnectedCount) {
        setError(data.message || "فشل في إعادة الربط");
      }
    } catch (error) {
      console.error("Error reconnecting pages:", error);
      setError("خطأ في إعادة الربط");
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
    return new Date(dateString).toLocaleDateString("ar-EG", {
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

      // عرض معلومات مفصلة
      alert(`معلومات التصحيح:
الشركة: ${data.companyId}
إجمالي الصفحات: ${data.totalPages}
الصفحات المتصلة: ${data.connectedPages}
الصفحات المقطوعة: ${data.disconnectedPages}

تفاصيل الصفحات:
${(Array.isArray(data.pages) ? (data.pages as FacebookDebugPage[]) : [])
  .map((page) => `- ${page.pageName} (${page.pageId}): ${page.status}`)
  .join("\n")}`);
    } catch (error) {
      console.error("Debug error:", error);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-gray-600">يجب تسجيل الدخول أولاً</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          ربط Facebook
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          ربط صفحات Facebook الخاصة بك بسهولة وأمان
        </p>
      </div>

      {/* Debug Info (remove in production) */}
      {import.meta.env.DEV && (
        <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded text-sm dark:text-gray-300">
          <p>Company ID: {user?.companyId || "غير متوفر"}</p>
          <p>User ID: {user?.id || "غير متوفر"}</p>
          <button
            onClick={handleDebug}
            className="mt-2 px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            Debug Info
          </button>
        </div>
      )}

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
            <p className="text-green-800 whitespace-pre-line">{success}</p>
            <button
              onClick={() => {
                setSuccess(null);
                setSkippedPages([]);
              }}
              className="ml-auto text-green-600 hover:text-green-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Skipped Pages Warning */}
      {skippedPages.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500 mr-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                صفحات لم يتم ربطها ({skippedPages.length})
              </h3>
              <p className="text-sm text-yellow-800 mb-3">
                الصفحات التالية مربوطة بالفعل بشركة أخرى ولا يمكن ربطها:
              </p>
              <div className="space-y-2">
                {skippedPages.map((page) => (
                  <div
                    key={page.pageId}
                    className="flex items-center p-3 bg-white rounded-md border border-yellow-300"
                  >
                    <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-yellow-600 text-sm">📘</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {page.pageName}
                      </h4>
                      <p className="text-xs text-gray-500">
                        Page ID: {page.pageId}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                      مربوطة بحساب آخر
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-yellow-100 rounded-md">
                <p className="text-sm text-yellow-900 mb-3">
                  <strong>💡 ملاحظة:</strong> لربط هذه الصفحات، يجب أولاً فك
                  ربطها من الشركة الأخرى التي تستخدمها حالياً.
                </p>
                <button
                  onClick={resolveSkippedPages}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-sm"
                >
                  ✓ تم الاطلاع - إخفاء هذا التنبيه
                </button>
              </div>
            </div>
            <button
              onClick={resolveSkippedPages}
              className="ml-2 text-yellow-600 hover:text-yellow-800 text-xl"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* OAuth Connection Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
            <span className="text-white text-xl">📘</span>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Facebook OAuth
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              ربط آمن وسهل مع Facebook
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2">جاري التحميل...</span>
          </div>
        ) : oauthStatus?.connected ? (
          <div className="space-y-4">
            <div className="flex items-center text-green-600">
              <CheckCircleIcon className="h-5 w-5 mr-2" />
              <span className="font-medium">
                متصل - {connectedPagesCount} صفحة نشطة
              </span>
            </div>

            {disconnectedPagesCount > 0 && (
              <p className="text-sm text-amber-700">
                هناك {disconnectedPagesCount} صفحة غير متصلة ويمكن إعادة ربطها من
                الأسفل.
              </p>
            )}

            <button
              onClick={handleConnectFacebook}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              {loading ? "جاري التحميل..." : "إضافة صفحات أخرى"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center text-gray-500">
              <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
              <span>غير متصل</span>
            </div>

            <button
              onClick={handleConnectFacebook}
              disabled={loading || !user?.companyId}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center text-lg"
            >
              <ArrowTopRightOnSquareIcon className="h-5 w-5 mr-2" />
              {loading ? "جاري التحميل..." : "رابط مع Facebook"}
            </button>

            {!user?.companyId && (
              <p className="text-sm text-red-600">معرف الشركة غير متوفر</p>
            )}
          </div>
        )}
      </div>

      {/* Connected Pages */}
      {pages.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <UserGroupIcon className="h-5 w-5 mr-2" />
            الصفحات المحفوظة ({pages.length})
          </h3>

          <div className="mb-4 flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 md:flex-row md:items-center md:justify-between">
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-200">
              <input
                type="checkbox"
                checked={allPagesSelected}
                onChange={handleToggleSelectAll}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
              />
              تحديد الكل
              <span className="mr-2 text-xs text-gray-500">
                ({selectedPageIds.length}/{pages.length})
              </span>
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleReconnectPages(selectedReconnectablePageIds)}
                disabled={loading || selectedReconnectablePageIds.length === 0}
                className="px-3 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                إعادة ربط المحدد
              </button>
              <button
                onClick={() => handleDisconnectPages(selectedConnectedPageIds)}
                disabled={loading || selectedConnectedPageIds.length === 0}
                className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                فصل المحدد
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {pages.map((page) => (
              <div
                key={page.id}
                className="flex items-start justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg gap-4"
              >
                <div className="flex items-start flex-1">
                  <input
                    type="checkbox"
                    checked={selectedPageIds.includes(page.id)}
                    onChange={() => handleTogglePageSelection(page.id)}
                    className="mt-3 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                  />
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-blue-600 text-sm">📘</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {page.pageName}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Page ID: {page.pageId}
                    </p>
                    {page.connectedAt && (
                      <p className="text-sm text-gray-500">
                        متصل منذ: {formatDate(page.connectedAt)}
                      </p>
                    )}
                    {page.disconnectedAt && page.status !== "connected" && (
                      <p className="text-sm text-gray-500">
                        تم الفصل في: {formatDate(page.disconnectedAt)}
                      </p>
                    )}
                    {page.healthMessage && (
                      <p className="text-sm text-amber-700 mt-1">
                        {page.healthMessage}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      page.status === "connected" && !page.needsReconnect
                        ? "bg-green-100 text-green-800"
                        : page.needsReconnect
                          ? "bg-amber-100 text-amber-800"
                          : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {page.status === "connected"
                      ? page.needsReconnect
                        ? "يحتاج إعادة ربط"
                        : "متصل"
                      : "غير متصل"}
                  </span>

                  {page.canReconnect !== false && (
                    <button
                      onClick={() => handleReconnectPages([page.id])}
                      disabled={loading || page.canReconnect === false}
                      className="px-3 py-2 text-emerald-700 hover:bg-emerald-50 rounded-lg disabled:opacity-50 flex items-center"
                      title="إعادة الربط"
                    >
                      <ArrowPathIcon className="h-4 w-4 mr-1" />
                      إعادة ربط
                    </button>
                  )}

                  {page.status === "connected" && (
                    <button
                      onClick={() => handleDisconnectPages([page.id])}
                      disabled={loading}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                      title="قطع الاتصال"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Benefits Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-lg p-6 mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <ShieldCheckIcon className="h-5 w-5 mr-2" />
          مميزات الربط الآمن
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start">
            <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">
                آمان عالي
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                لا نحفظ كلمات مرور أو بيانات حساسة
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">
                سهولة الاستخدام
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                ربط بنقرة واحدة بدون إدخال بيانات يدوياً
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">
                إدارة متقدمة
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                إضافة أو إزالة صفحات بسهولة
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">
                صلاحيات محدودة
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                نطلب فقط الصلاحيات الضرورية
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacebookOAuth;
