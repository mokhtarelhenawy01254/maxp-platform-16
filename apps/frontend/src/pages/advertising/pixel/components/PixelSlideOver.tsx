import React, { useState, useEffect } from "react";
import {
  XMarkIcon,
  PlusIcon,
  SparklesIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

interface PixelSlideOverProps {
  isOpen: boolean;
  mode: "add" | "create";
  onClose: () => void;
  onAddPixel: (data: {
    pixelName: string;
    pixelId: string;
    accessToken?: string;
    isPrimary: boolean;
  }) => Promise<void>;
  onCreatePixel: (pixelName: string, businessId: string) => Promise<void>;
  businessAccounts: Array<{ id: string; name: string }>;
  isLoadingBusinesses: boolean;
  isSubmitting: boolean;
}

export const PixelSlideOver: React.FC<PixelSlideOverProps> = ({
  isOpen,
  mode,
  onClose,
  onAddPixel,
  onCreatePixel,
  businessAccounts,
  isLoadingBusinesses,
  isSubmitting,
}) => {
  const [pixelName, setPixelName] = useState("");
  const [pixelId, setPixelId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState("");

  useEffect(() => {
    if (isOpen) {
      setPixelName("");
      setPixelId("");
      setAccessToken("");
      setIsPrimary(false);
      if (businessAccounts.length > 0) {
        setSelectedBusinessId(businessAccounts[0].id);
      }
    }
  }, [isOpen, businessAccounts]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "add") {
      await onAddPixel({
        pixelName,
        pixelId,
        accessToken: accessToken.trim() || undefined,
        isPrimary,
      });
    } else {
      await onCreatePixel(pixelName, selectedBusinessId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Slide-over Chassis */}
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 h-full shadow-2xl border-l border-gray-200 dark:border-gray-800 flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-850/50">
          <div className="flex items-center gap-2">
            {mode === "add" ? (
              <PlusIcon className="w-5 h-5 text-indigo-500" />
            ) : (
              <SparklesIcon className="w-5 h-5 text-emerald-500" />
            )}
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              {mode === "add" ? "إضافة Pixel قائم" : "إنشاء Pixel جديد عبر Meta"}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="إغلاق"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              اسم البيكسل <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={pixelName}
              onChange={(e) => setPixelName(e.target.value)}
              placeholder="مثال: Pixel الحملات الإضافية"
              className="w-full px-3.5 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-h-[38px]"
            />
          </div>

          {mode === "add" ? (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Pixel ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  dir="ltr"
                  value={pixelId}
                  onChange={(e) => setPixelId(e.target.value.trim())}
                  placeholder="1234567890123456"
                  maxLength={20}
                  className="w-full px-3.5 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-xs tabular-nums focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-h-[38px]"
                />
                <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 block">
                  يتكون من 14 إلى 18 رقماً
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Access Token (اختياري لربط CAPI مستقل)
                </label>
                <input
                  type="password"
                  dir="ltr"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value.trim())}
                  placeholder="EAAxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3.5 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-h-[38px]"
                />
              </div>

              <label className="flex items-start gap-2.5 p-3 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 rounded border-gray-300 dark:border-gray-700 mt-0.5"
                />
                <div>
                  <span className="text-xs font-bold text-gray-900 dark:text-white block">
                    تعيين كـ Pixel أساسي للمتجر
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 block">
                    سيتم اعتماده كمعرّف تتبع رئيسي في متجر الويب وطلبات الشراء
                  </span>
                </div>
              </label>
            </>
          ) : (
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                حساب الأعمال (Business Account) <span className="text-red-500">*</span>
              </label>
              {isLoadingBusinesses ? (
                <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
                  <ArrowPathIcon className="w-4 h-4 animate-spin text-indigo-500" />
                  <span>جاري جلب حسابات الأعمال…</span>
                </div>
              ) : businessAccounts.length > 0 ? (
                <select
                  value={selectedBusinessId}
                  onChange={(e) => setSelectedBusinessId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-h-[38px]"
                >
                  {businessAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-red-600 py-1">
                  لا توجد حسابات أعمال متاحة. تأكد من إتمام الربط التلقائي أولاً.
                </p>
              )}
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg min-h-[38px]"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting ||
                !pixelName.trim() ||
                (mode === "add" ? !pixelId : !selectedBusinessId)
              }
              className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all active:scale-[0.97] disabled:opacity-50 min-h-[38px] flex items-center gap-2 shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                  <span>جاري المعالجة…</span>
                </>
              ) : (
                <span>{mode === "add" ? "إضافة البيكسل" : "إنشاء البيكسل"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
