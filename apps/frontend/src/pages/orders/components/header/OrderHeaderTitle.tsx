import React from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { useDateFormat } from "../../../../hooks/useDateFormat";
import type { OrderDetailsType } from "../../types";
import {
  OrderStatusBadgeRail,
  type StatusOption,
} from "../OrderStatusBadgeRail";

export interface OrderHeaderTitleProps {
  order: OrderDetailsType;
  onBack: () => void;
  currentStatusConfig?: {
    code: string;
    name: string;
    color?: string;
    icon?: string;
  } | null;
  statusOptions?: StatusOption[];
  onStatusSelect?: (statusCode: string) => void;
  canUpdateStatus?: boolean;
  isEditing: boolean;
  updating: boolean;
  isStatusMenuOpen: boolean;
  setIsStatusMenuOpen: (open: boolean) => void;
  statusMenuRef: React.RefObject<HTMLDivElement | null>;
  statusStyles: {
    backgroundColor: string;
    color: string;
    border: string;
  };
}

export const OrderHeaderTitle: React.FC<OrderHeaderTitleProps> = ({
  order,
  onBack,
  currentStatusConfig,
  statusOptions = [],
  onStatusSelect,
  canUpdateStatus = true,
  isEditing,
  updating,
  isStatusMenuOpen,
  setIsStatusMenuOpen,
  statusMenuRef,
  statusStyles,
}) => {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();

  return (
    <div className="flex items-start sm:items-center min-w-0">
      <button
        type="button"
        onClick={onBack}
        className="me-2.5 sm:me-4 p-1.5 sm:p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition shrink-0"
        aria-label={String(t("common.back", { defaultValue: "رجوع" }))}
      >
        <ArrowLeft className="h-5 w-5 sm:h-5 sm:w-5 rtl:rotate-180" />
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="text-base sm:text-xl font-bold text-foreground flex flex-wrap items-center gap-1.5 sm:gap-2 leading-tight">
          <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
          <span>
            {t("orderDetails.titlePrefix", { defaultValue: "تفاصيل الطلب" })}
          </span>
          <span dir="ltr" className="font-mono tabular-nums text-foreground">
            #{String(order.orderNumber || "").startsWith("cart_")
              ? `INC-${String(order.orderNumber)
                  .replace(/^cart_/, "")
                  .slice(0, 8)
                  .toUpperCase()}`
              : order.orderNumber}
          </span>
        </h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
          <p className="text-muted-foreground whitespace-nowrap font-mono tabular-nums text-xs">
            {t("orderDetails.createdAt", {
              date: formatDateTime(order.createdAt),
            })}
          </p>
          <OrderStatusBadgeRail
            order={order}
            currentStatusConfig={currentStatusConfig}
            statusOptions={statusOptions}
            onStatusSelect={onStatusSelect}
            canUpdateStatus={canUpdateStatus}
            isEditing={isEditing}
            updating={updating}
            isStatusMenuOpen={isStatusMenuOpen}
            setIsStatusMenuOpen={setIsStatusMenuOpen}
            statusMenuRef={statusMenuRef}
            statusStyles={statusStyles}
          />
        </div>
      </div>
    </div>
  );
};
