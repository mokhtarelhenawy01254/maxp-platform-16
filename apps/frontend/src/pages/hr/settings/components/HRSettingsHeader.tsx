import React from "react";
import { AlertCircle, RefreshCw, Save, X } from "lucide-react";
import { Button } from "../../../../components/ui/button";

interface HRSettingsHeaderProps {
  loading: boolean;
  saving: boolean;
  hasUnsavedChanges: boolean;
  errors: Record<string, string>;
  onClearErrors: () => void;
  onRefresh: () => void;
  onSave: () => void;
}

export const HRSettingsHeader: React.FC<HRSettingsHeaderProps> = ({
  loading,
  saving,
  hasUnsavedChanges,
  errors,
  onClearErrors,
  onRefresh,
  onSave,
}) => {
  return (
    <header className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg flex-shrink-0">
              HR
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                  إعدادات الموارد البشرية
                </h1>
                {hasUnsavedChanges && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                    role="status"
                    aria-live="polite"
                  >
                    <AlertCircle className="h-3 w-3" aria-hidden />
                    تغييرات غير محفوظة
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                تكوين إعدادات نظام HR الشامل
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto sm:flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading || saving}
              className="flex-1 sm:flex-initial order-2 sm:order-1"
              aria-label="إعادة تحميل الإعدادات"
            >
              <RefreshCw
                className={`h-4 w-4 me-2 rtl:rotate-180 ${loading ? "animate-spin" : ""}`}
                aria-hidden
              />
              إعادة تحميل
            </Button>
            <div className="flex flex-col gap-0.5 flex-1 sm:flex-initial order-1 sm:order-2">
              <Button
                size="sm"
                onClick={onSave}
                disabled={saving || !hasUnsavedChanges}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                aria-label={
                  hasUnsavedChanges
                    ? "حفظ الإعدادات (Ctrl+S)"
                    : "حفظ الإعدادات"
                }
                title={
                  hasUnsavedChanges
                    ? "حفظ التغييرات (Ctrl+S)"
                    : undefined
                }
              >
                {saving ? (
                  <>
                    <span
                      className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent me-2"
                      aria-hidden
                    />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 me-2" aria-hidden />
                    حفظ الإعدادات
                  </>
                )}
              </Button>
              {hasUnsavedChanges && (
                <span
                  className="text-[10px] text-gray-500 dark:text-gray-400 text-center sm:text-end hidden sm:inline tabular-nums font-mono"
                  dir="ltr"
                >
                  Ctrl+S
                </span>
              )}
            </div>
          </div>
        </div>
        {Object.keys(errors).length > 0 && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                  يوجد أخطاء في الإعدادات:
                </p>
                <ul className="text-sm text-red-700 dark:text-red-300 list-disc list-inside space-y-1">
                  {Object.entries(errors).map(([key, message]) => (
                    <li key={key}>{message}</li>
                  ))}
                </ul>
              </div>
              <button
                onClick={onClearErrors}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
                type="button"
                aria-label="إغلاق التنبيه"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
