import React from "react";
import {
  XMarkIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { FacebookOAuthPixel } from "../types";

interface OAuthPixelSelectorSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  pixels: FacebookOAuthPixel[];
  isLoading: boolean;
  onSelectPixel: (pixel: FacebookOAuthPixel) => Promise<void>;
  isSelecting: boolean;
  selectedPixelId?: string;
}

export const OAuthPixelSelectorSlideOver: React.FC<OAuthPixelSelectorSlideOverProps> = ({
  isOpen,
  onClose,
  pixels,
  isLoading,
  onSelectPixel,
  isSelecting,
  selectedPixelId,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 h-full shadow-2xl border-l border-gray-200 dark:border-gray-800 flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-850/50">
          <div className="flex items-center gap-2">
            <SparklesIcon className="w-5 h-5 text-[#1877F2]" />
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                اختر البيكسل من حساب Facebook
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                سيتم جلب المعرّف وتوليد الـ Access Token تلقائياً
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors"
            aria-label="إغلاق"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* List of Pixels */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
              <ArrowPathIcon className="w-6 h-6 animate-spin text-[#1877F2]" />
              <p className="text-xs text-gray-500">جاري فحص البيكسلات المرتبطة بحسابك على Meta…</p>
            </div>
          ) : pixels.length > 0 ? (
            pixels.map((p) => {
              const isCurrent = p.pixelId === selectedPixelId;
              return (
                <button
                  key={p.pixelId}
                  type="button"
                  onClick={() => onSelectPixel(p)}
                  disabled={isSelecting}
                  className={`w-full text-right p-3.5 rounded-xl border transition-all active:scale-[0.98] ${
                    isCurrent
                      ? "border-[#1877F2] bg-blue-50/50 dark:bg-blue-950/20 shadow-xs"
                      : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-850"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                      {p.pixelName}
                    </span>
                    {isCurrent && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[#1877F2] text-white font-medium">
                        <CheckCircleIcon className="w-3 h-3" />
                        <span>مربوط حالياً</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                    <span>ID: {p.pixelId}</span>
                    {p.businessName && (
                      <span>• {p.businessName}</span>
                    )}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="p-8 text-center space-y-2">
              <p className="text-xs text-gray-500">
                لم يتم العثور على أية بيكسلات في حساب Business Manager المرتبط.
              </p>
              <p className="text-[11px] text-gray-400">
                يمكنك إنشاء بيكسل جديد مباشرة أو إدخال المعرف يدوياً.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
