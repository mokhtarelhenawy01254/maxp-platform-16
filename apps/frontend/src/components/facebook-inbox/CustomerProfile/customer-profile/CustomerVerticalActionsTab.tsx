import React from "react";
import {
  CalendarPlus,
  ShoppingBag,
  Stethoscope,
  Wrench,
  ListTodo,
  ExternalLink,
  RefreshCw,
  Megaphone,
} from "lucide-react";
import { InboxConversation } from "../../../../types/inbox.types";
import type { CustomerProfileVerticalCapabilities } from "./types";
import { getInboxExternalImageUrl } from "../../../../utils/imageUrl";

export interface CustomerVerticalActionsTabProps {
  conversation: InboxConversation;
  verticalCapabilities?: CustomerProfileVerticalCapabilities;
  onPrimaryAction?: () => void;
  onCreateOrder?: () => void;
  onOpenServiceOrder?: () => void;
  onOpenTasks?: () => void;
  onInsertSnippet?: (text: string) => void;
  syncMessage: string | null;
  syncingMessages: boolean;
  onSyncMessages: () => void;
}

export const CustomerVerticalActionsTab: React.FC<CustomerVerticalActionsTabProps> = ({
  conversation,
  verticalCapabilities,
  onPrimaryAction,
  onCreateOrder,
  onOpenServiceOrder,
  onOpenTasks,
  syncMessage,
  syncingMessages,
  onSyncMessages,
}) => {
  const vertical = verticalCapabilities?.vertical || "commerce";
  const primaryAction = verticalCapabilities?.primaryAction;
  const specialtyLabel = verticalCapabilities?.specialtyLabel || "نشاط تجاري";

  const renderActionIcon = () => {
    switch (primaryAction?.id) {
      case "dental_case":
        return <Stethoscope className="w-4 h-4 shrink-0" />;
      case "appointment":
        return <CalendarPlus className="w-4 h-4 shrink-0" />;
      case "service_order":
        return <Wrench className="w-4 h-4 shrink-0" />;
      case "task":
        return <ListTodo className="w-4 h-4 shrink-0" />;
      default:
        return <ShoppingBag className="w-4 h-4 shrink-0" />;
    }
  };

  return (
    <div className="space-y-4 text-foreground">
      {/* 1. Primary Vertical Operational Action */}
      <div className="rounded-xl border border-border/60 bg-card p-3 shadow-2xs">
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-border/40">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-xs font-semibold text-foreground">
              {specialtyLabel}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
            إجراءات فورية
          </span>
        </div>

        {primaryAction && onPrimaryAction && (
          <button
            type="button"
            onClick={onPrimaryAction}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 active:scale-[0.98] transition-all cursor-pointer"
          >
            {renderActionIcon()}
            <span>{primaryAction.label}</span>
          </button>
        )}

        {/* Education Specific Fast Actions */}
        {vertical === "education" && onPrimaryAction && (
          <div className="mt-2.5 pt-2 border-t border-border/40 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={onPrimaryAction}
              className="px-2 py-1.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200 border border-amber-200/60 hover:bg-amber-100 transition-colors text-center cursor-pointer active:scale-[0.98]"
              title="تسجيل حجز ديمو داي الجمعة 4:00م"
            >
              ديمو الجمعة (4:00م)
            </button>
            <button
              type="button"
              onClick={onPrimaryAction}
              className="px-2 py-1.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200 border border-amber-200/60 hover:bg-amber-100 transition-colors text-center cursor-pointer active:scale-[0.98]"
              title="تسجيل حجز ديمو داي السبت 11:00ص"
            >
              ديمو السبت (11:00ص)
            </button>
          </div>
        )}

        {/* Quick Order Action (Available across all verticals) */}
        {onCreateOrder && primaryAction?.id !== "order" && (
          <button
            type="button"
            onClick={onCreateOrder}
            className="w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15 transition-colors cursor-pointer active:scale-[0.98]"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>إنشاء طلب سريع مع الشحن</span>
          </button>
        )}
      </div>

      {/* 2. Attribution / Ad Campaign Card (if conversation has postId) */}
      {conversation.postId && (
        <div className="rounded-xl border border-border/60 bg-card p-3 shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Megaphone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-semibold text-foreground">
                مصدر الإعلان / المنشور
              </span>
            </div>
            {conversation.postPermalink && (
              <a
                href={conversation.postPermalink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 dark:text-blue-400 hover:underline"
              >
                <span>عرض على فيسبوك</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>

          <div className="p-2 rounded-lg bg-muted/30 border border-border/40 text-xs text-muted-foreground leading-relaxed">
            {conversation.postMessage ? (
              <p className="line-clamp-3 text-[11px]">
                {conversation.postMessage}
              </p>
            ) : (
              <p className="text-[11px]">
                تفاعل العميل مع إعلان منشور فيسبوك للمؤسسة.
              </p>
            )}
            {conversation.postPicture && (
              <div className="mt-2 w-16 h-16 rounded-md overflow-hidden border border-border/40">
                <img
                  src={getInboxExternalImageUrl(conversation.postPicture)}
                  alt="منشور فيسبوك"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Technical Facebook Sync (Subtle at the bottom) */}
      {conversation.platform === "facebook" && (
        <div className="pt-2 border-t border-border/40">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] text-muted-foreground">
              مزامنة رسائل المحادثة مع فيسبوك
            </div>
            <button
              type="button"
              onClick={onSyncMessages}
              disabled={syncingMessages}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border border-border/60 bg-background hover:bg-muted/50 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <RefreshCw
                className={`w-3 h-3 ${syncingMessages ? "animate-spin" : ""}`}
              />
              <span>{syncingMessages ? "جاري المزامنة..." : "مزامنة"}</span>
            </button>
          </div>
          {syncMessage && (
            <p
              className={`text-[10px] mt-1 ${
                syncMessage.startsWith("تم:")
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {syncMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerVerticalActionsTab;
