import React from "react";
import {
  PaperClipIcon,
  DocumentTextIcon,
  PhotoIcon,
  ShoppingBagIcon,
  BoltIcon,
  FaceSmileIcon,
  PlusIcon,
  ShoppingCartIcon,
  ClipboardDocumentListIcon,
  SparklesIcon,
  ChartBarIcon,
  Bars3Icon,
  ListBulletIcon,
  MapPinIcon,
  BuildingStorefrontIcon,
} from "@heroicons/react/24/outline";
import { MessageInputProps } from "./types";

interface DesktopToolsRowProps {
  uploadingFile: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  showQuickReplies: boolean;
  setShowQuickReplies: React.Dispatch<React.SetStateAction<boolean>>;
  showEmojiPicker: boolean;
  setShowEmojiPicker: React.Dispatch<React.SetStateAction<boolean>>;
  showDesktopExtraTools: boolean;
  setShowDesktopExtraTools: React.Dispatch<React.SetStateAction<boolean>>;
  desktopExtraToolsRef: React.RefObject<HTMLDivElement | null>;
  hasExtraTools: boolean;
  onFocusInput: () => void;
  props: MessageInputProps;
}

export const DesktopToolsRow: React.FC<DesktopToolsRowProps> = ({
  uploadingFile,
  fileInputRef,
  showQuickReplies,
  setShowQuickReplies,
  showEmojiPicker,
  setShowEmojiPicker,
  showDesktopExtraTools,
  setShowDesktopExtraTools,
  desktopExtraToolsRef,
  hasExtraTools,
  onFocusInput,
  props,
}) => {
  const {
    onSendFile,
    onOpenTextGallery,
    onOpenImageGallery,
    onOpenProductPicker,
    onOpenOrder,
    onOpenServiceOrder,
    onOpenTasks,
    onOpenInteractive,
    onOpenPoll,
    onOpenButtons,
    onOpenList,
    onOpenTemplate,
    onOpenLocation,
    onOpenCatalog,
  } = props;

  const extraActionItems = [
    {
      show: Boolean(onOpenOrder),
      label: "إنشاء طلب سريع",
      icon: ShoppingCartIcon,
      color: "text-emerald-500",
      action: onOpenOrder,
    },
    {
      show: Boolean(onOpenServiceOrder),
      label: "طلب صيانة / خدمة",
      icon: ClipboardDocumentListIcon,
      color: "text-cyan-500",
      action: onOpenServiceOrder,
    },
    {
      show: Boolean(onOpenTasks),
      label: "إدارة المهام",
      icon: SparklesIcon,
      color: "text-violet-500",
      action: onOpenTasks,
    },
    {
      show: Boolean(onOpenInteractive),
      label: "رسائل تفاعلية",
      icon: SparklesIcon,
      color: "text-pink-500",
      action: onOpenInteractive,
    },
    {
      show: Boolean(onOpenPoll),
      label: "استطلاع رأي",
      icon: ChartBarIcon,
      color: "text-amber-500",
      action: onOpenPoll,
    },
    {
      show: Boolean(onOpenButtons),
      label: "أزرار سريعة",
      icon: Bars3Icon,
      color: "text-blue-500",
      action: onOpenButtons,
    },
    {
      show: Boolean(onOpenList),
      label: "رسالة قائمة",
      icon: ListBulletIcon,
      color: "text-teal-500",
      action: onOpenList,
    },
    {
      show: Boolean(onOpenTemplate),
      label: "قوالب الرسائل",
      icon: DocumentTextIcon,
      color: "text-indigo-500",
      action: onOpenTemplate,
    },
    {
      show: Boolean(onOpenLocation),
      label: "إرسال موقع",
      icon: MapPinIcon,
      color: "text-red-500",
      action: onOpenLocation,
    },
    {
      show: Boolean(onOpenCatalog),
      label: "كتالوج المنتجات",
      icon: BuildingStorefrontIcon,
      color: "text-teal-500",
      action: onOpenCatalog,
    },
  ];

  return (
    <div className="hidden sm:flex flex-shrink-0 items-center gap-1 sm:gap-1.5 business-chat-composer-tools">
      {/* File Upload */}
      {onSendFile && (
        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFile}
            className="business-icon-button rounded-xl p-1.5 transition-colors disabled:opacity-50 sm:p-2"
            title="إرفاق ملف"
            aria-label="إرفاق ملف"
          >
            {uploadingFile ? (
              <div
                className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent sm:h-5 sm:w-5"
                style={{
                  borderColor: "var(--color-primary)",
                  borderTopColor: "transparent",
                }}
              />
            ) : (
              <PaperClipIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
          </button>
        </div>
      )}

      {/* Text Gallery Button */}
      {onOpenTextGallery && (
        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={onOpenTextGallery}
            className="business-icon-button rounded-xl p-1.5 transition-colors sm:p-2"
            title="حافظة النصوص المحفوظة"
            aria-label="حافظة النصوص المحفوظة"
          >
            <DocumentTextIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>
      )}

      {/* Image Gallery Button */}
      {onOpenImageGallery && (
        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={onOpenImageGallery}
            className="business-icon-button rounded-xl p-1.5 transition-colors sm:p-2"
            title="حافظة الصور المحفوظة"
            aria-label="حافظة الصور المحفوظة"
          >
            <PhotoIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>
      )}

      {/* Product Picker Button */}
      {onOpenProductPicker && (
        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={onOpenProductPicker}
            className="business-icon-button rounded-xl p-1.5 transition-colors sm:p-2"
            title="اختيار منتج من المتجر"
            aria-label="اختيار منتج من المتجر"
          >
            <ShoppingBagIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>
      )}

      {/* Quick Order Button (Direct Access) */}
      {onOpenOrder && (
        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={onOpenOrder}
            className="business-icon-button rounded-xl p-1.5 transition-colors sm:p-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-500/10"
            title="إنشاء طلب سريع (أوردر)"
            aria-label="إنشاء طلب سريع"
          >
            <ShoppingCartIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>
      )}

      {/* Quick Replies Button (Desktop) */}
      <div className="relative flex-shrink-0">
        <button
          type="button"
          onClick={() => {
            setShowQuickReplies((prev) => {
              const nextState = !prev;
              if (nextState) {
                onFocusInput();
              }
              return nextState;
            });
          }}
          className={`business-icon-button rounded-xl p-1.5 transition-colors sm:p-2 ${
            showQuickReplies ? "text-primary bg-primary/10 border-primary/30" : ""
          }`}
          title="الردود السريعة (/)"
          aria-label="الردود السريعة"
        >
          <BoltIcon className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
      </div>

      {/* Desktop Emoji Picker Button */}
      <div className="relative flex-shrink-0">
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="business-icon-button rounded-xl p-1.5 transition-colors sm:p-2"
          title="إيموجي"
          aria-label="إيموجي"
        >
          <FaceSmileIcon className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
      </div>

      {/* WhatsApp / Rich Actions Popover (Desktop) */}
      {hasExtraTools && (
        <div className="relative flex-shrink-0" ref={desktopExtraToolsRef}>
          <button
            type="button"
            onClick={() => setShowDesktopExtraTools((prev) => !prev)}
            className={`business-icon-button rounded-xl p-1.5 transition-colors sm:p-2 ${
              showDesktopExtraTools ? "text-primary bg-primary/10 border-primary/30" : ""
            }`}
            title="إجراءات وأدوات إضافية"
            aria-label="إجراءات إضافية"
          >
            <PlusIcon
              className={`h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-200 ${
                showDesktopExtraTools ? "rotate-45" : ""
              }`}
            />
          </button>

          {showDesktopExtraTools && (
            <div className="absolute bottom-full mb-2 start-0 z-50 flex w-56 flex-col gap-1 rounded-2xl border border-border/60 bg-popover/95 p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in-0 zoom-in-95">
              <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground border-b border-border/40">
                أدوات وإجراءات المحادثة
              </div>

              {extraActionItems
                .filter((item) => item.show)
                .map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setShowDesktopExtraTools(false);
                        item.action?.();
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                    >
                      <Icon className={`h-4 w-4 ${item.color}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
