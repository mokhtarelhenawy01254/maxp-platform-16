import React, { useState, useEffect, useCallback } from "react";
import tokenManager from "../utils/tokenManager";
import { buildApiUrl } from "../utils/urlHelper";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon,
  ArrowPathIcon,
  ClockIcon,
  ServerIcon,
  CircleStackIcon,
} from "@heroicons/react/24/outline";

interface DiagnosticIssue {
  type: string;
  severity: "critical" | "warning" | "info";
  message: string;
  details: string;
}

interface DiagnosticRecommendation {
  type: string;
  priority: "high" | "medium" | "low";
  message: string;
  action: string;
}

interface FacebookDiagnosticPage {
  [key: string]: unknown;
}

interface DiagnosticsData {
  timestamp: string;
  server: {
    status: string;
    port: number;
    environment: string;
    uptime: number;
  };
  database: {
    status: string;
    connection: boolean;
    tables: Record<string, number>;
  };
  facebook: {
    config: {
      appId: string;
      appSecret: string;
      webhookVerifyToken: string;
      backendUrl: string;
    };
    pages: {
      total: number;
      connected: number;
      list?: FacebookDiagnosticPage[];
    };
    webhooks: {
      url: string;
      verifyToken: string;
      lastReceived: string;
    };
  };
  issues: DiagnosticIssue[];
  recommendations: DiagnosticRecommendation[];
}

const FacebookDiagnostics: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("🔍 Running Facebook diagnostics...");

      const response = await fetch(
        buildApiUrl("integrations/facebook/diagnostics"),
        {
          headers: tokenManager.createAuthHeaders({
            "Content-Type": "application/json",
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setDiagnostics(data.data);
        setLastRun(new Date().toLocaleString("ar-EG"));
        console.log("✅ Diagnostics completed:", data.data);
      } else {
        const errorMsg = data.error || "فشل التشخيص";
        setError(errorMsg);
        console.error("❌ Diagnostics failed:", data.error);
      }
    } catch (error: unknown) {
      const errorMsg = `خطأ في التشخيص: ${error instanceof Error ? error.message : "حدث خطأ غير متوقع"}`;
      setError(errorMsg);
      console.error("❌ Error running diagnostics:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runDiagnostics();
  }, [runDiagnostics]);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case "warning":
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case "info":
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-600 bg-red-50 border-red-200";
      case "medium":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "low":
        return "text-green-600 bg-green-50 border-green-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running":
      case "connected":
      case "configured":
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case "error":
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case "mock-mode":
      case "unknown":
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              تشخيص Facebook Integration
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              فحص شامل لحالة النظام والمشاكل المحتملة
            </p>
            {lastRun && (
              <p className="text-xs text-gray-500 mt-1 flex items-center">
                <ClockIcon className="h-4 w-4 ml-1" />
                آخر فحص: {lastRun}
              </p>
            )}
          </div>
          <button
            onClick={runDiagnostics}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            <ArrowPathIcon
              className={`h-5 w-5 ml-2 ${loading ? "animate-spin" : ""}`}
            />
            {loading ? "جاري الفحص..." : "تشغيل التشخيص"}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <XCircleIcon className="h-5 w-5 text-red-500 ml-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <ArrowPathIcon className="h-5 w-5 text-blue-500 ml-2 animate-spin" />
            <span className="text-blue-700">جاري تشغيل التشخيص...</span>
          </div>
        </div>
      )}

      {diagnostics && !loading && (
        <>
          {/* System Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Server Status */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <ServerIcon className="h-8 w-8 text-blue-500 ml-3" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900">الخادم</h3>
                  <div className="flex items-center mt-1">
                    {getStatusIcon(diagnostics.server.status)}
                    <span className="text-sm text-gray-600 mr-2">
                      Port {diagnostics.server.port} •{" "}
                      {formatUptime(diagnostics.server.uptime)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Database Status */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <CircleStackIcon className="h-8 w-8 text-green-500 ml-3" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    قاعدة البيانات
                  </h3>
                  <div className="flex items-center mt-1">
                    {getStatusIcon(diagnostics.database.status)}
                    <span className="text-sm text-gray-600 mr-2">
                      {diagnostics.database.connection ? "متصلة" : "غير متصلة"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Facebook Details */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                تفاصيل Facebook Integration
              </h3>
            </div>
            <div className="p-6 space-y-4">
              {/* Configuration */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  الإعدادات
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">App ID:</span>
                    <span className="mr-2 font-mono">
                      {diagnostics.facebook.config.appId ===
                      "your-facebook-app-id" ? (
                        <span className="text-red-600">غير محدد</span>
                      ) : (
                        diagnostics.facebook.config.appId
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">App Secret:</span>
                    <span className="mr-2">
                      {diagnostics.facebook.config.appSecret === "set" ? (
                        <span className="text-green-600">محدد</span>
                      ) : (
                        <span className="text-red-600">غير محدد</span>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Webhook URL:</span>
                    <span className="mr-2 font-mono text-xs">
                      {diagnostics.facebook.webhooks.url}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Verify Token:</span>
                    <span className="mr-2 font-mono text-xs">
                      {diagnostics.facebook.webhooks.verifyToken}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pages */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  الصفحات المربوطة
                </h4>
                <div className="text-sm text-gray-600">
                  المجموع: {diagnostics.facebook.pages.total} • المتصلة:{" "}
                  {diagnostics.facebook.pages.connected}
                </div>
                {diagnostics.facebook.pages.list &&
                  diagnostics.facebook.pages.list.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {diagnostics.facebook.pages.list.map((page, index) => (
                        <div key={index} className="flex items-center text-sm">
                          {getStatusIcon(page.status)}
                          <span className="mr-2">{page.pageName}</span>
                          <span className="text-gray-500">({page.pageId})</span>
                        </div>
                      ))}
                    </div>
                  )}
              </div>

              {/* Database Tables */}
              {diagnostics.database.connection && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    جداول قاعدة البيانات
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    {Object.entries(diagnostics.database.tables).map(
                      ([table, count]) => (
                        <div key={table}>
                          <span className="text-gray-600">{table}:</span>
                          <span className="mr-2 font-medium">{count}</span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Issues */}
          {diagnostics.issues.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  المشاكل المكتشفة
                </h3>
              </div>
              <div className="p-6 space-y-3">
                {diagnostics.issues.map((issue, index) => (
                  <div
                    key={index}
                    className="flex items-start p-3 border border-gray-200 rounded-lg"
                  >
                    {getSeverityIcon(issue.severity)}
                    <div className="mr-3 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {issue.message}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {issue.details}
                      </p>
                      <span className="inline-block mt-1 px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                        {issue.type} • {issue.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {diagnostics.recommendations.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">التوصيات</h3>
              </div>
              <div className="p-6 space-y-3">
                {diagnostics.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className={`p-3 border rounded-lg ${getPriorityColor(rec.priority)}`}
                  >
                    <p className="text-sm font-medium">{rec.message}</p>
                    <p className="text-xs mt-1">{rec.action}</p>
                    <span className="inline-block mt-2 px-2 py-1 text-xs rounded-full bg-white bg-opacity-50">
                      {rec.type} • أولوية {rec.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FacebookDiagnostics;
