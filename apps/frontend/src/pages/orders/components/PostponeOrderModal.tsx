import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDaysIcon, ClockIcon } from "@heroicons/react/24/outline";
import OrderModal from "../../../components/common/OrderModal";

interface PostponeOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    scheduledDeliveryDate: string;
    scheduledNotes: string;
    autoTransitionEnabled: boolean;
  }) => Promise<void>;
  initialDate?: string;
  initialNotes?: string;
  initialAutoTransition?: boolean;
  loading?: boolean;
}

const inputClass =
  "block w-full rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30";

const PostponeOrderModal: React.FC<PostponeOrderModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialDate = "",
  initialNotes = "",
  initialAutoTransition = true,
  loading = false,
}) => {
  const { t } = useTranslation();
  const [scheduledDeliveryDate, setScheduledDeliveryDate] =
    useState(initialDate);
  const [scheduledDeliveryTime, setScheduledDeliveryTime] = useState("");
  const [scheduledNotes, setScheduledNotes] = useState(initialNotes);
  const [autoTransitionEnabled, setAutoTransitionEnabled] = useState(
    initialAutoTransition,
  );

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  };

  const handleConfirm = async () => {
    if (!scheduledDeliveryDate) return;

    const dateTime = scheduledDeliveryTime
      ? `${scheduledDeliveryDate}T${scheduledDeliveryTime}:00`
      : `${scheduledDeliveryDate}T00:00:00`;

    await onConfirm({
      scheduledDeliveryDate: dateTime,
      scheduledNotes,
      autoTransitionEnabled,
    });
  };

  return (
    <OrderModal
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={t("orders.postponeOrderTitle")}
      description={t("orders.postponeOrderDescription")}
      icon={CalendarDaysIcon}
      tone="warning"
      size="md"
      busy={loading}
      primaryAction={{
        label: loading
          ? t("orders.postponeOrderPostponing")
          : t("orders.postponeOrderAction"),
        onClick: handleConfirm,
        disabled: loading || !scheduledDeliveryDate,
        loading,
      }}
    >
      <div className="space-y-4">
        <div>
          <span className="mb-1.5 block text-sm font-medium text-foreground">
            {t("orders.postponeOrderQuick", "تأجيل سريع")}
          </span>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((days) => {
              const target = new Date();
              target.setDate(target.getDate() + days);
              const iso = target.toISOString().split("T")[0];
              const selected = scheduledDeliveryDate === iso;
              return (
                <button
                  key={days}
                  type="button"
                  onClick={() => {
                    setScheduledDeliveryDate(iso);
                  }}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                    selected
                      ? "border-warning bg-warning/20 text-warning"
                      : "border-border bg-background text-muted-foreground hover:border-warning/50 hover:text-warning"
                  }`}
                >
                  {t("orders.postponeOrderDays", "{{days}} أيام", { days })}
                </button>
              );
            })}
          </div>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-foreground">
            {t("orders.postponeOrderDeliveryDate")} *
          </span>
          <div className="relative">
            <CalendarDaysIcon className="pointer-events-none absolute end-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="date"
              value={scheduledDeliveryDate}
              onChange={(e) => setScheduledDeliveryDate(e.target.value)}
              min={getMinDate()}
              className={`${inputClass} ps-4 pe-10`}
            />
          </div>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-foreground">
            {t("orders.postponeOrderDeliveryTime")}
          </span>
          <div className="relative">
            <ClockIcon className="pointer-events-none absolute end-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="time"
              value={scheduledDeliveryTime}
              onChange={(e) => setScheduledDeliveryTime(e.target.value)}
              className={`${inputClass} ps-4 pe-10`}
            />
          </div>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-foreground">
            {t("orders.postponeOrderNotes")}
          </span>
          <textarea
            value={scheduledNotes}
            onChange={(e) => setScheduledNotes(e.target.value)}
            rows={3}
            placeholder={String(t("orders.postponeOrderNotesPlaceholder"))}
            className={inputClass}
          />
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-3">
          <input
            type="checkbox"
            checked={autoTransitionEnabled}
            onChange={(e) => setAutoTransitionEnabled(e.target.checked)}
            className="mt-0.5 h-5 w-5 rounded border-border text-warning focus:ring-warning"
          />
          <span className="text-sm text-foreground">
            {t("orders.postponeOrderAutoTransition")}
          </span>
        </label>
      </div>
    </OrderModal>
  );
};

export default PostponeOrderModal;
