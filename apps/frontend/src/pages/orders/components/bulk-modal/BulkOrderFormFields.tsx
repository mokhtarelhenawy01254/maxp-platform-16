import React from "react";
import { useTranslation } from "react-i18next";

const inputClass =
  "w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-xs sm:text-sm text-foreground outline-hidden transition focus:border-primary focus:ring-2 focus:ring-primary/20";

export interface BulkOrderFormFieldsProps {
  name: string;
  setName: (name: string) => void;
  description: string;
  setDescription: (desc: string) => void;
  status: string;
  setStatus: (status: string) => void;
}

export const BulkOrderFormFields: React.FC<BulkOrderFormFieldsProps> = React.memo(
  ({ name, setName, description, setDescription, status, setStatus }) => {
    const { t } = useTranslation();

    return (
      <>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-foreground">
            {t("orders.bulkNameLabel")}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("orders.bulkNamePlaceholder")}
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-foreground">
            {t("orders.bulkDescriptionLabel")}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("orders.bulkDescriptionPlaceholder")}
            rows={2}
            className={`${inputClass} resize-none`}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-foreground">
            {t("orders.bulkDefaultStatus")}
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={inputClass}
          >
            {[
              "DRAFT",
              "PENDING",
              "PROCESSING",
              "COMPLETED",
              "FAILED",
              "CANCELLED",
            ].map((s) => (
              <option key={s} value={s}>
                {t(`orders.bulkStatus${s}`)}
              </option>
            ))}
          </select>
        </div>
      </>
    );
  }
);

BulkOrderFormFields.displayName = "BulkOrderFormFields";
