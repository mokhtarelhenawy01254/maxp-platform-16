import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Ban,
  Bell,
  BellOff,
  CalendarPlus,
  CheckCircle2,
  ListTodo,
  ShoppingBag,
  Stethoscope,
  Volume2,
  VolumeX,
  Wrench,
} from "lucide-react";
import {
  ConversationStatus,
  InboxConversation,
} from "../../../../types/inbox.types";
import { getInboxCustomerAvatarUrl } from "../../../../utils/imageUrl";
import StatusDropdown from "../../StatusDropdown/StatusDropdown";
import AssignmentDropdown from "../../AssignmentDropdown/AssignmentDropdown";
import type {
  CustomerProfileVerticalCapabilities,
  CustomerProfileVerticalContext,
} from "./types";
import { extractVerticalRecords } from "./CustomerVerticalRecordsTab";

interface CustomerProfileHeaderProps {
  conversation: InboxConversation;
  compactHeader?: boolean;
  ordersCount: number;
  ltv: number;
  effectiveStatus: ConversationStatus;
  currentAssignee?: string | null;
  currentAssigneeName?: string | null;
  onStatusChange?: (status: string) => void;
  onAssign?: (userId: string | null) => void;
  disabled?: boolean;
  soundEnabled?: boolean;
  notificationsEnabled?: boolean;
  onSoundToggle?: () => void;
  onNotificationsToggle?: () => void;
  onCreateOrder?: () => void;
  checkingBlockStatus?: boolean;
  isBlocked?: boolean;
  blocking?: boolean;
  onBlockClick?: () => void;
  onUnblockClick?: () => void;
  verticalCapabilities?: CustomerProfileVerticalCapabilities;
  verticalContext?: CustomerProfileVerticalContext | null;
  onPrimaryAction?: () => void;
  onOpenServiceOrder?: () => void;
  onOpenTasks?: () => void;
}

const renderActionIcon = (actionId?: string) => {
  switch (actionId) {
    case "dental_case":
      return <Stethoscope className="h-3.5 w-3.5 shrink-0" />;
    case "appointment":
      return <CalendarPlus className="h-3.5 w-3.5 shrink-0" />;
    case "service_order":
      return <Wrench className="h-3.5 w-3.5 shrink-0" />;
    case "task":
      return <ListTodo className="h-3.5 w-3.5 shrink-0" />;
    default:
      return <ShoppingBag className="h-3.5 w-3.5 shrink-0" />;
  }
};

export const CustomerProfileHeader: React.FC<CustomerProfileHeaderProps> = ({
  conversation,
  compactHeader = false,
  ordersCount,
  ltv,
  effectiveStatus,
  currentAssignee,
  currentAssigneeName,
  onStatusChange,
  onAssign,
  disabled = false,
  soundEnabled = true,
  notificationsEnabled = true,
  onSoundToggle,
  onNotificationsToggle,
  onCreateOrder,
  checkingBlockStatus = false,
  isBlocked = false,
  blocking = false,
  onBlockClick,
  onUnblockClick,
  verticalCapabilities,
  verticalContext,
  onPrimaryAction,
  onOpenServiceOrder,
  onOpenTasks,
}) => {
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => (typeof window !== "undefined" ? window.innerWidth < 768 : false),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => setIsMobileViewport(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const customerAvatarUrl = getInboxCustomerAvatarUrl(
    conversation.customerId,
    conversation.customerAvatar,
  );

  const isNonCommerce = Boolean(
    verticalCapabilities &&
      verticalCapabilities.vertical !== "commerce" &&
      verticalCapabilities.vertical !== "cafe",
  );
  const verticalRecordsCount = extractVerticalRecords(verticalContext).length;
  const kpiCount = isNonCommerce
    ? (verticalContext?.summary?.primaryCount ??
      verticalContext?.summary?.totalCount ??
      (verticalRecordsCount || ordersCount))
    : ordersCount;
  const kpiValue = isNonCommerce
    ? (verticalContext?.summary?.secondaryValue ??
      verticalContext?.summary?.totalValue ??
      ltv)
    : ltv;
  const countLabel = verticalCapabilities?.kpiLabels.countLabel || "الطلبات";
  const valueLabel = verticalCapabilities?.kpiLabels.valueLabel || "القيمة";

  const statsSummary = (
    <div
      className={[
        "grid grid-cols-2 gap-1.5",
        compactHeader ? "w-full" : "shrink-0",
      ].join(" ")}
    >
      <div className="min-w-[54px] rounded-lg border border-border/50 bg-muted/20 px-2.5 py-1.5 text-center">
        <p className="text-[10px] font-medium text-muted-foreground leading-4">
          {countLabel}
        </p>
        <p className="text-sm font-bold font-mono tabular-nums text-foreground leading-5">
          {kpiCount}
        </p>
      </div>
      <div className="min-w-[68px] rounded-lg border border-border/50 bg-muted/20 px-2.5 py-1.5 text-center">
        <p className="text-[10px] font-medium text-muted-foreground leading-4">
          {valueLabel}
        </p>
        <p className="text-sm font-bold tabular-nums text-primary leading-5">
          {Number(kpiValue || 0).toLocaleString()} ج.م
        </p>
      </div>
    </div>
  );

  const useCompactActions = compactHeader || isMobileViewport;
  const compactActionCls =
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border p-0 text-xs font-medium transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer";
  const expandedActionCls =
    "flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-medium transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer";
  const actionLabelCls = useCompactActions ? "sr-only" : "truncate";

  const handlePrimaryClick = onPrimaryAction || onCreateOrder;
  const primaryId = verticalCapabilities?.primaryAction.id || "order";
  const primaryLabel = verticalCapabilities?.primaryAction.label || "طلب";
  const primaryTitle =
    verticalCapabilities?.primaryAction && primaryId !== "order"
      ? verticalCapabilities.primaryAction.label
      : "إنشاء طلب سريع لهذا العميل";

  return (
    <div className="business-inbox-header border-b border-border/50 bg-card/60 px-3 py-2.5 text-right">
      {compactHeader ? (
        statsSummary
      ) : (
        <div className="flex items-center gap-2.5">
          {customerAvatarUrl ? (
            <img
              src={customerAvatarUrl}
              alt={conversation.customerName}
              className="h-11 w-11 shrink-0 rounded-full object-cover border border-border/60"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = "none";
                const fallback = e.currentTarget.nextElementSibling;
                if (fallback) (fallback as HTMLElement).style.display = "flex";
              }}
            />
          ) : null}
          <div
            className="h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-base font-bold text-primary"
            style={{ display: customerAvatarUrl ? "none" : "flex" }}
          >
            {conversation.customerName?.charAt(0)?.toUpperCase() || "؟"}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-bold leading-5 text-foreground">
              {conversation.customerName}
            </h3>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
              <span className="tabular-nums">
                عميل منذ {format(new Date(), "yyyy")}
              </span>
              {conversation.platform === "facebook" && (
                <span className="truncate font-medium">
                  {conversation.pageName || "Facebook"}
                </span>
              )}
            </div>
          </div>

          {statsSummary}
        </div>
      )}

      {(onStatusChange || onAssign) && (
        <div
          className="mt-2 grid gap-1.5"
          style={{
            gridTemplateColumns:
              onStatusChange && onAssign
                ? "minmax(0, 1fr) minmax(0, 1fr)"
                : "minmax(0, 1fr)",
          }}
        >
          {onStatusChange && (
            <div className="min-w-0 [&>div>button]:w-full [&>div>button]:justify-between [&>div>button]:overflow-hidden [&>div>button]:rounded-lg [&>div>button]:px-2 [&>div>button]:py-1 [&>div>button]:text-xs [&>div>button_span]:truncate">
              <StatusDropdown
                currentStatus={effectiveStatus}
                onStatusChange={onStatusChange}
                disabled={disabled}
              />
            </div>
          )}
          {onAssign && (
            <div className="min-w-0 [&>div>button]:w-full [&>div>button]:justify-between [&>div>button]:overflow-hidden [&>div>button]:rounded-lg [&>div>button]:px-2 [&>div>button]:py-1 [&>div>button]:text-xs [&>div>button_span]:truncate">
              <AssignmentDropdown
                currentAssignee={currentAssignee ?? conversation.assignedTo}
                currentAssigneeName={
                  currentAssigneeName ?? conversation.assignedToName
                }
                onAssign={onAssign}
                disabled={disabled}
              />
            </div>
          )}
        </div>
      )}

      {(onSoundToggle ||
        onNotificationsToggle ||
        handlePrimaryClick ||
        onOpenServiceOrder ||
        onOpenTasks ||
        (conversation.pageId && (onBlockClick || onUnblockClick))) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {onSoundToggle && (
            <button
              type="button"
              onClick={onSoundToggle}
              className={`${compactActionCls} ${
                soundEnabled
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border/60 bg-background text-muted-foreground hover:text-foreground"
              }`}
              title={soundEnabled ? "كتم الصوت" : "تفعيل الصوت"}
              aria-label={soundEnabled ? "كتم الصوت" : "تفعيل الصوت"}
            >
              {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>
          )}

          {onNotificationsToggle && (
            <button
              type="button"
              onClick={onNotificationsToggle}
              className={`${compactActionCls} ${
                notificationsEnabled
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border/60 bg-background text-muted-foreground hover:text-foreground"
              }`}
              title={notificationsEnabled ? "كتم الإشعارات" : "تفعيل الإشعارات"}
              aria-label={
                notificationsEnabled ? "كتم الإشعارات" : "تفعيل الإشعارات"
              }
            >
              {notificationsEnabled ? <Bell size={15} /> : <BellOff size={15} />}
            </button>
          )}

          {handlePrimaryClick && (
            <button
              type="button"
              onClick={handlePrimaryClick}
              className={`${
                useCompactActions ? compactActionCls : expandedActionCls
              } border-primary/30 bg-primary/10 text-primary hover:bg-primary/15`}
              title={primaryTitle}
              aria-label={primaryTitle}
            >
              {renderActionIcon(primaryId)}
              <span className={actionLabelCls}>{primaryLabel}</span>
            </button>
          )}

          {onCreateOrder && primaryId !== "order" && (
            <button
              type="button"
              onClick={onCreateOrder}
              className={`${compactActionCls} border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15`}
              title="إنشاء طلب سريع"
              aria-label="إنشاء طلب سريع"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
            </button>
          )}

          {onOpenServiceOrder && primaryId !== "service_order" && (
            <button
              type="button"
              onClick={onOpenServiceOrder}
              className={`${compactActionCls} border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15`}
              title="طلب خدمة"
              aria-label="طلب خدمة"
            >
              <Wrench className="h-3.5 w-3.5" />
            </button>
          )}

          {onOpenTasks && primaryId !== "task" && (
            <button
              type="button"
              onClick={onOpenTasks}
              className={`${compactActionCls} border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300 hover:bg-violet-500/15`}
              title="إنشاء مهمة"
              aria-label="إنشاء مهمة"
            >
              <ListTodo className="h-3.5 w-3.5" />
            </button>
          )}

          {conversation.pageId &&
            (onBlockClick || onUnblockClick) &&
            (checkingBlockStatus ? (
              <div
                className={[
                  "flex h-8 items-center justify-center rounded-lg border border-border/50 bg-muted/20",
                  useCompactActions ? "w-8 shrink-0" : "min-w-0 flex-1",
                ].join(" ")}
              >
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
              </div>
            ) : isBlocked ? (
              <button
                type="button"
                onClick={onUnblockClick}
                disabled={blocking}
                className={`${
                  useCompactActions ? compactActionCls : expandedActionCls
                } border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-50`}
                title="إلغاء حظر العميل على الصفحة"
                aria-label="إلغاء حظر العميل على الصفحة"
              >
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span className={actionLabelCls}>فتح</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onBlockClick}
                className={`${
                  useCompactActions ? compactActionCls : expandedActionCls
                } border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15`}
                title="حظر العميل على الصفحة"
                aria-label="حظر العميل على الصفحة"
              >
                <Ban className="h-3.5 w-3.5 shrink-0" />
                <span className={actionLabelCls}>حظر</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
};
