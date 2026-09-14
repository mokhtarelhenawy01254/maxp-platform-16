import React, { useState, useEffect } from "react";
import {
  CheckCircleIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
  KeyIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { FacebookPixelSettings } from "../types";

interface ConnectionCredentialsPanelProps {
  settings: Partial<FacebookPixelSettings>;
  onChange: (updated: Partial<FacebookPixelSettings>) => void;
  onTestPixel: () => Promise<void>;
  onTestCapi: () => Promise<void>;
  onEasyConnect: () => Promise<void>;
  onCheckPermissions: () => Promise<void>;
  onFetchOAuthPixels: () => Promise<void>;
  isTestingPixel: boolean;
  isTestingCapi: boolean;
  isConnectingOAuth: boolean;
  isCheckingPermissions: boolean;
  isFetchingOAuthPixels: boolean;
  hasCapiTokenFromOAuth: boolean;
}

export const ConnectionCredentialsPanel: React.FC<ConnectionCredentialsPanelProps> = ({
  settings,
  onChange,
  onTestPixel,
  onTestCapi,
  onEasyConnect,
  onCheckPermissions,
  onFetchOAuthPixels,
  isTestingPixel,
  isTestingCapi,
  isConnectingOAuth,
  isCheckingPermissions,
  isFetchingOAuthPixels,
  hasCapiTokenFromOAuth,
}) => {
  const [showToken, setShowToken] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [isAdBlockerActive, setIsAdBlockerActive] = useState<boolean | null>(null);

  useEffect(() => {
    // Silent check if browser extensions block Meta tracking
    try {
      const probeImg = new Image();
      probeImg.src = "https://www.facebook.com/tr/?id=0&ev=probe&noscript=1";
      probeImg.onerror = () => setIsAdBlockerActive(true);
      probeImg.onload = () => setIsAdBlockerActive(false);
    } catch {
      // ignore probe errors
    }
  }, []);

  const handleCopy = () => {
    if (!settings.facebookPixelId) return;
    navigator.clipboard.writeText(settings.facebookPixelId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const isPixelValid =
    Boolean(settings.facebookPixelId) &&
    /^\d{14,18}$/.test(settings.facebookPixelId || "");

  return (
    <section className="border border-gray-200/90 dark:border-gray-800/90 bg-white dark:bg-gray-900 rounded-xl overflow-hidden shadow-xs">
      {/* Panel Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-850/50">
        <div className="flex items-center gap-2">
          <KeyIcon className="w-4 h-4 text-indigo-500" />
          <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
            بيانات الربط والتفويض (Meta Credentials)
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Fetch Pixels from Connected Account */}
          <button
            type="button"
            onClick={onFetchOAuthPixels}
            disabled={isFetchingOAuthPixels}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-all active:scale-[0.97] min-h-[36px]"
          >
            {isFetchingOAuthPixels ? (
              <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <SparklesIcon className="w-3.5 h-3.5 text-[#1877F2]" />
            )}
            <span>استيراد بيكسلات الحساب</span>
          </button>

          {/* 1-Click Facebook OAuth Connect Button */}
          <button
            type="button"
            onClick={onEasyConnect}
            disabled={isConnectingOAuth}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#1877F2] hover:bg-[#166fe5] text-white transition-all active:scale-[0.97] min-h-[36px] shadow-xs"
          >
            {isConnectingOAuth ? (
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
            ) : (
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            )}
            <span>ربط حساب Facebook</span>
          </button>
        </div>
      </div>

      {/* AdBlocker Intelligence Banner */}
      {isAdBlockerActive && (
        <div className="mx-4 sm:mx-6 mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/60 flex items-center justify-between gap-2 text-xs text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              تم رصد مانع إعلانات (AdBlocker) في متصفحك — نظام Conversions API v26.0 السحابي يعمل تلقائياً كخط دفاع أول لحماية مبيعاتك من الفقدان.
            </span>
          </div>
          <span className="font-mono font-bold text-[10px] px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50">
            CAPI Shielded
          </span>
        </div>
      )}

      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* Left Column: Browser Pixel Credentials */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <span>معرّف البيكسل الرئيسي (Pixel ID)</span>
              <span className="text-red-500">*</span>
            </label>

            {/* Toggle Browser Pixel */}
            <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs text-gray-600 dark:text-gray-400">
              <span>تفعيل الويب</span>
              <input
                type="checkbox"
                checked={settings.facebookPixelEnabled || false}
                onChange={(e) =>
                  onChange({ facebookPixelEnabled: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600 relative" />
            </label>
          </div>

          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                dir="ltr"
                value={settings.facebookPixelId || ""}
                onChange={(e) =>
                  onChange({ facebookPixelId: e.target.value.trim() })
                }
                placeholder="1234567890123456"
                maxLength={20}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm tabular-nums focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all pl-10 min-h-[42px]"
              />
              {settings.facebookPixelId && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                  title="نسخ المعرف"
                  aria-label="نسخ المعرف"
                >
                  {copiedId ? (
                    <CheckIcon className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <ClipboardDocumentIcon className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onTestPixel}
              disabled={isTestingPixel || !isPixelValid}
              className="px-3.5 py-2.5 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap min-h-[42px] flex items-center gap-1.5"
            >
              {isTestingPixel ? (
                <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircleIcon className="w-3.5 h-3.5 text-indigo-500" />
              )}
              <span>فحص Pixel</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
            <span>يتكون من 14 إلى 18 رقماً</span>
            <a
              href="https://business.facebook.com/events_manager2"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Events Manager ↗
            </a>
          </div>
        </div>

        {/* Right Column: Server Conversions API Token */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                <span>Conversions API Access Token</span>
              </label>
              {hasCapiTokenFromOAuth && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-medium">
                  متصل بالسيرفر
                </span>
              )}
            </div>

            {/* Toggle CAPI */}
            <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs text-gray-600 dark:text-gray-400">
              <span>تفعيل السيرفر</span>
              <input
                type="checkbox"
                checked={settings.facebookConvApiEnabled || false}
                onChange={(e) =>
                  onChange({ facebookConvApiEnabled: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600 relative" />
            </label>
          </div>

          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type={showToken ? "text" : "password"}
                dir="ltr"
                value={settings.facebookConvApiToken || ""}
                onChange={(e) =>
                  onChange({ facebookConvApiToken: e.target.value.trim() })
                }
                placeholder={
                  hasCapiTokenFromOAuth
                    ? "• • • • • • • • (حساب فيسبوك مرتبط تلقائياً)"
                    : "EAAxxxxxxxxxxxxxxxxxxxxxxxxx"
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all pl-10 min-h-[42px]"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                title={showToken ? "إخفاء الرمز" : "إظهار الرمز"}
              >
                {showToken ? (
                  <EyeSlashIcon className="w-4 h-4" />
                ) : (
                  <EyeIcon className="w-4 h-4" />
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={onTestCapi}
              disabled={isTestingCapi || !settings.facebookPixelId}
              className="px-3.5 py-2.5 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap min-h-[42px] flex items-center gap-1.5"
            >
              {isTestingCapi ? (
                <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500" />
              )}
              <span>فحص CAPI</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
            <span>System User Token مع صلاحية ads_management</span>
            <button
              type="button"
              onClick={onCheckPermissions}
              disabled={isCheckingPermissions}
              className="text-emerald-600 hover:underline dark:text-emerald-400 font-medium inline-flex items-center gap-1"
            >
              {isCheckingPermissions && (
                <ArrowPathIcon className="w-3 h-3 animate-spin" />
              )}
              <span>فحص الصلاحيات</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
