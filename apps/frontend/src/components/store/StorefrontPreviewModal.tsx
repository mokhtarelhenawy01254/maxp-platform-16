import React, { useEffect, useMemo, useRef, useState } from "react";
import { XMarkIcon, ArrowTopRightOnSquareIcon, ComputerDesktopIcon, DevicePhoneMobileIcon, DeviceTabletIcon } from "@heroicons/react/24/outline";

export interface StorefrontPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  previewUrl: string;
  draftTokens: any; // Using any for brevity, since it's a dynamic partial payload
  draftHomeSections?: any;
}

const StorefrontPreviewModal: React.FC<StorefrontPreviewModalProps> = ({
  isOpen,
  onClose,
  previewUrl,
  draftTokens,
  draftHomeSections,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const previewOrigin = useMemo(() => { try { return new URL(previewUrl).origin; } catch { return window.location.origin; } }, [previewUrl]);

  useEffect(() => {
    if (!isOpen || !iframeRef.current) return;

    // We send a postMessage on every draftTokens/draftHomeSections change
    // when the modal is open. We also debounce it slightly to avoid spamming the iframe
    // while the user drags a slider.
    const handler = setTimeout(() => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          {
            type: "UPDATE_PREVIEW_TOKENS",
            payload: {
              ...draftTokens,
              ...(draftHomeSections ? { home: { sections: draftHomeSections } } : {}),
            },
          },
          previewOrigin,
        );
      }
    }, 150);

    return () => clearTimeout(handler);
  }, [isOpen, draftTokens, draftHomeSections]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="relative flex h-full w-full max-w-6xl 2xl:max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-900/5 dark:bg-gray-900 dark:ring-white/10">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-950 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-current" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                المعاينة الحية (Live Preview)
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                أنت الآن تشاهد تأثير التعديلات المبدئية قبل الحفظ
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-200/50 dark:bg-gray-800/50 rounded-lg p-1 mr-2">
              <button
                onClick={() => setPreviewMode("desktop")}
                className={`p-1.5 rounded-md transition-colors ${previewMode === "desktop" ? "bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400" : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"}`}
                title="شاشة كمبيوتر"
              >
                <ComputerDesktopIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPreviewMode("tablet")}
                className={`p-1.5 rounded-md transition-colors ${previewMode === "tablet" ? "bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400" : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"}`}
                title="جهاز لوحي"
              >
                <DeviceTabletIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPreviewMode("mobile")}
                className={`p-1.5 rounded-md transition-colors ${previewMode === "mobile" ? "bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400" : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"}`}
                title="هاتف محمول"
              >
                <DevicePhoneMobileIcon className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={() => window.open(previewUrl, "_blank", "noopener,noreferrer")}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
            >
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
              <span className="hidden sm:inline">فتح في نافذة جديدة</span>
            </button>
            
            <div className="h-4 w-px bg-gray-300 dark:bg-gray-700" />
            
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
            >
              <XMarkIcon className="h-5 w-5" />
              <span className="hidden sm:inline">إغلاق المعاينة</span>
            </button>
          </div>
        </div>

        {/* Browser Chrome Simulator */}
        <div className="flex items-center border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-400/80" />
            <div className="h-3 w-3 rounded-full bg-amber-400/80" />
            <div className="h-3 w-3 rounded-full bg-green-400/80" />
          </div>
          <div className="mx-4 flex-1 truncate rounded-md bg-gray-100 px-3 py-1.5 text-center text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            {previewUrl}
          </div>
        </div>

        {/* Iframe */}
        <div className="flex-1 bg-gray-100 dark:bg-black overflow-hidden flex justify-center items-start pt-4 sm:pt-6 pb-0">
          <div 
            className={`h-full bg-white transition-all duration-300 ease-in-out origin-top border-t border-x border-gray-200 dark:border-gray-800 rounded-t-xl overflow-hidden shadow-2xl ${
              previewMode === "mobile" ? "w-[375px]" : previewMode === "tablet" ? "w-[768px]" : "w-full rounded-t-none border-0"
            }`}
          >
            <iframe
              ref={iframeRef}
              src={previewUrl}
              className="h-full w-full border-0"
              title="Storefront Live Preview"
              allow="fullscreen"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorefrontPreviewModal;
