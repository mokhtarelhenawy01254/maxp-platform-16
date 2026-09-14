import React from "react";
import {
  WrenchScrewdriverIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { DiagnosticsData, TokenPermissionsData } from "../types";

interface DiagnosticsTelemetryCardProps {
  diagnostics: DiagnosticsData | null;
  tokenPermissions: TokenPermissionsData | null;
  onCheckPermissions: () => Promise<void>;
  isCheckingToken: boolean;
}

export const DiagnosticsTelemetryCard: React.FC<DiagnosticsTelemetryCardProps> = ({
  diagnostics,
  tokenPermissions,
  onCheckPermissions,
  isCheckingToken,
}) => {
  if (!diagnostics && !tokenPermissions) {
    return null;
  }

  const score = diagnostics?.overall?.score ?? 0;
  const isHealthy = score >= 80;

  return (
    <section className="border border-gray-200/90 dark:border-gray-800/90 bg-white dark:bg-gray-900 rounded-xl overflow-hidden shadow-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-850/50">
        <div className="flex items-center gap-2">
          <WrenchScrewdriverIcon className="w-4 h-4 text-indigo-500" />
          <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
            تشخيص سلامة الاتصال والأذونات (Telemetry & Diagnostics)
          </h2>
        </div>

        {diagnostics?.overall && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              درجة الصحة:
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold tabular-nums border ${
                isHealthy
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/60"
                  : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/60"
              }`}
            >
              {score}/100
            </span>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-6 space-y-4">
        {/* Diagnostics Status Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-800 flex items-center justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400 font-medium">
              تتبع المتصفح (Browser Pixel)
            </span>
            <span
              className={`font-semibold inline-flex items-center gap-1 ${
                diagnostics?.pixel?.configured
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-gray-400"
              }`}
            >
              {diagnostics?.pixel?.configured ? (
                <>
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>مُهيّأ بنجاح</span>
                </>
              ) : (
                <span>غير مُهيّأ</span>
              )}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-800 flex items-center justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400 font-medium">
              اتصال السيرفر (Conversions API)
            </span>
            <span
              className={`font-semibold inline-flex items-center gap-1 ${
                diagnostics?.capi?.configured
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            >
              {diagnostics?.capi?.configured ? (
                <>
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>مُهيّأ بنجاح</span>
                </>
              ) : (
                <>
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  <span>بحاجة لـ Access Token</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Token Permissions Result */}
        {tokenPermissions && (
          <div
            className={`p-3.5 rounded-lg border text-xs ${
              tokenPermissions.valid
                ? "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300"
                : "border-red-200 dark:border-red-800/60 bg-red-50/50 dark:bg-red-950/20 text-red-800 dark:text-red-300"
            }`}
          >
            <div className="flex items-center gap-2 font-bold mb-1.5">
              {tokenPermissions.valid ? (
                <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
              ) : (
                <XCircleIcon className="w-4 h-4 text-red-600" />
              )}
              <span>
                {tokenPermissions.valid
                  ? "صلاحيات Token سليمة وصالحة لـ Meta Conversions API"
                  : "توجد مشكلة في صلاحيات الـ Token الحالي"}
              </span>
            </div>

            {tokenPermissions.permissions && tokenPermissions.permissions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tokenPermissions.permissions.map((p) => (
                  <span
                    key={p}
                    className="px-2 py-0.5 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-mono text-[11px] text-gray-700 dark:text-gray-300"
                  >
                    {p}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
