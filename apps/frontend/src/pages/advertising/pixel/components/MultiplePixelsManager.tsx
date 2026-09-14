import React, { useState } from "react";
import {
  PlusIcon,
  StarIcon,
  TrashIcon,
  ArrowPathIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  SignalIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import { PixelConfig } from "../types";

interface MultiplePixelsManagerProps {
  pixels: PixelConfig[];
  onOpenAddModal: () => void;
  onOpenCreateModal: () => void;
  onSetPrimary: (pixelId: string) => Promise<void>;
  onDeletePixel: (pixelId: string) => Promise<void>;
  onTestPixelById: (pixelId: string) => Promise<void>;
  testingPixelId: string | null;
}

export const MultiplePixelsManager: React.FC<MultiplePixelsManagerProps> = ({
  pixels,
  onOpenAddModal,
  onOpenCreateModal,
  onSetPrimary,
  onDeletePixel,
  onTestPixelById,
  testingPixelId,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <section className="border border-gray-200/90 dark:border-gray-800/90 bg-white dark:bg-gray-900 rounded-xl overflow-hidden shadow-xs">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-850/50">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>البيكسلات المتعددة (Multiple Pixels)</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-mono">
              {pixels.length}
            </span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            مشاركة بيانات التتبع والتحويلات مع حسابات تسويقية إضافية أو شركاء
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90 transition-all active:scale-[0.97] min-h-[36px]"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>إضافة Pixel</span>
          </button>
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200/60 dark:border-emerald-800/60 transition-all active:scale-[0.97] min-h-[36px]"
          >
            <SparklesIcon className="w-3.5 h-3.5" />
            <span>إنشاء بيكسل جديد</span>
          </button>
        </div>
      </div>

      {/* Pixels List or Empty state */}
      {pixels.length > 0 ? (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {pixels.map((pixel) => (
            <div
              key={pixel.id}
              className={`p-3.5 sm:px-6 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                pixel.isPrimary
                  ? "bg-indigo-50/20 dark:bg-indigo-950/10"
                  : "hover:bg-gray-50/50 dark:hover:bg-gray-800/30"
              }`}
            >
              <div className="flex items-start sm:items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    pixel.isPrimary
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  <SignalIcon className="w-4 h-4" />
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm">
                      {pixel.pixelName}
                    </span>
                    {pixel.isPrimary && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold">
                        <StarSolidIcon className="w-3 h-3 text-indigo-500" />
                        <span>أساسي (Primary)</span>
                      </span>
                    )}
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        pixel.isActive
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      {pixel.isActive ? "نشط" : "غير مفعل"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <span
                      dir="ltr"
                      className="font-mono tabular-nums text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded"
                    >
                      {pixel.pixelId}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(pixel.pixelId)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-0.5"
                      title="نسخ المعرف"
                      aria-label="نسخ المعرف"
                    >
                      {copiedId === pixel.pixelId ? (
                        <CheckIcon className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                      )}
                    </button>
                    {pixel.totalEventsSent > 0 && (
                      <span className="text-[11px] font-mono">
                        • {pixel.totalEventsSent} أحداث مرسلة
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 self-end sm:self-center">
                {!pixel.isPrimary && (
                  <button
                    type="button"
                    onClick={() => onSetPrimary(pixel.id)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-all active:scale-[0.97] min-h-[34px] flex items-center gap-1"
                    title="تعيين كأساسي للمتجر"
                  >
                    <StarIcon className="w-3.5 h-3.5 text-amber-500" />
                    <span>تعيين كأساسي</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onTestPixelById(pixel.id)}
                  disabled={testingPixelId === pixel.id}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200/60 dark:border-indigo-800/60 transition-all active:scale-[0.97] disabled:opacity-40 min-h-[34px] flex items-center gap-1"
                >
                  {testingPixelId === pixel.id ? (
                    <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>اختبار</span>
                  )}
                </button>

                {!pixel.isPrimary && (
                  <button
                    type="button"
                    onClick={() => onDeletePixel(pixel.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors min-h-[34px] min-w-[34px] flex items-center justify-center"
                    title="حذف البيكسل"
                    aria-label="حذف البيكسل"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            لم يتم ربط بيكسلات إضافية. يمكنك ربط أكثر من بيكسل لمشاركة بيانات الحملات مع شركاء التسويق.
          </p>
        </div>
      )}
    </section>
  );
};
