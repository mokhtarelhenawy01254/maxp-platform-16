import { useTranslation } from "react-i18next";
import type { QcCheckKey } from "../types";

const QC_LABEL_KEY_MAP: Record<QcCheckKey, string> = {
  quantity: "preparation.qc.quantity",
  variant: "preparation.qc.variant",
  packaging: "preparation.qc.packaging",
  accessories: "preparation.qc.accessories",
  invoiceSlip: "preparation.qc.invoiceSlip",
};

interface PreparationOrderQcChecklistProps {
  orderNumber: string;
  enabledQcChecks: QcCheckKey[];
  qcChecklist: Partial<Record<QcCheckKey, boolean>> | undefined;
  qcCompleted: boolean;
  onQcCheckToggle: (
    orderNumber: string,
    key: QcCheckKey,
    checked: boolean,
  ) => void;
}

const PreparationOrderQcChecklist = ({
  orderNumber,
  enabledQcChecks,
  qcChecklist,
  qcCompleted,
  onQcCheckToggle,
}: PreparationOrderQcChecklistProps) => {
  const { t } = useTranslation();

  if (enabledQcChecks.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-xs font-semibold text-foreground">{t("preparation.qc.title")}</h4>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("preparation.qc.desc")}
          </p>
        </div>

        <span
          className={`self-start sm:self-auto rounded-md border px-2 py-0.5 text-[11px] font-medium font-mono tabular-nums ${
            qcCompleted
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
          }`}
        >
          {qcCompleted ? t("preparation.qc.completed") : t("preparation.qc.incomplete")}
        </span>
      </div>

      <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {enabledQcChecks.map((key) => (
          <label
            key={`${orderNumber}-${key}`}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border/60 bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-border"
          >
            <input
              type="checkbox"
              checked={qcChecklist?.[key] === true}
              onChange={(event) =>
                onQcCheckToggle(orderNumber, key, event.target.checked)
              }
              className="h-3.5 w-3.5 rounded border-border/70 text-primary focus:ring-primary/40"
            />
            {t(QC_LABEL_KEY_MAP[key])}
          </label>
        ))}
      </div>
    </div>
  );
};

export default PreparationOrderQcChecklist;
