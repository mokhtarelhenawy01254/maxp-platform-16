import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays, Clock } from "lucide-react";
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
  "block w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-xs sm:text-sm text-foreground outline-hidden transition focus:border-primary focus:ring-2 focus:ring-primary/20";

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
      icon={CalendarDays}
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
      <div className="space-y-3.5">
        <div>
          <span className="mb-1.5 block text-xs font-semibold text-foreground">
            {t("orders.postponeOrderQuick", "تأجيل سريع")}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7].map((days) => {
              const target = new Date();
              target.setDate(target.getDate() + days);
              const iso = target.toISOString().slice(0, 10);
              const selected = scheduledDeliveryDate === iso;
              return (
                <button
                  key={days}
                  type="button"
                  onClick={() => {
                    setScheduledDeliveryDate(iso);
                  }}
                  className={`rounded-md border px-2.5 py-1 text-xs font-semibold font-mono tabular-nums transition-colors active:scale-[0.97] ${
                    selected
                      ? "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300"
                      : "border-border/70 bg-background text-muted-foreground hover:border-amber-500/30 hover:text-foreground"
                  }`}
                >
                  {t("orders.postponeOrderDays", "{{days}} أيام", { days })}
                </button>
              );
            })}
          </div>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-foreground">
            {t("orders.postponeOrderDeliveryDate")} *
          </span>
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="date"
              value={scheduledDeliveryDate}
              onChange={(e) => setScheduledDeliveryDate(e.target.value)}
              min={getMinDate()}
              className={`${inputClass} ps-3 pe-9 font-mono tabular-nums`}
            />
          </div>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-foreground">
            {t("orders.postponeOrderDeliveryTime")}
          </span>
          <div className="relative">
            <Clock className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="time"
              value={scheduledDeliveryTime}
              onChange={(e) => setScheduledDeliveryTime(e.target.value)}
              className={`${inputClass} ps-3 pe-9 font-mono tabular-nums`}
            />
          </div>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-foreground">
            {t("orders.postponeOrderNotes")}
          </span>
          <textarea
            value={scheduledNotes}
            onChange={(e) => setScheduledNotes(e.target.value)}
            rows={2}
            placeholder={String(t("orders.postponeOrderNotesPlaceholder"))}
            className={inputClass}
          />
        </label>

        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
          <input
            type="checkbox"
            checked={autoTransitionEnabled}
            onChange={(e) => setAutoTransitionEnabled(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
          />
          <span className="text-xs text-foreground leading-snug">
            {t("orders.postponeOrderAutoTransition")}
          </span>
        </label>
      </div>
    </OrderModal>
  );
};

export default PostponeOrderModal;
