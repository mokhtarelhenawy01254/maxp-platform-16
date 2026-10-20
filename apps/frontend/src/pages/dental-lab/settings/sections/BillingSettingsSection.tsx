import { useTranslation } from "react-i18next";
import { CreditCard } from "lucide-react";
import {
  type BillingPolicy,
  type DentalInvoiceMode,
  tKey,
  MODAL_INPUT_CLS,
} from "../../shared";
import {
  sectionCardCls,
  labelCls,
  INVOICE_MODES,
} from "../types/settingsTypes";
import { ToggleRow } from "../components/ToggleRow";

interface BillingSettingsSectionProps {
  billingPolicy: BillingPolicy;
  setBillingPolicy: React.Dispatch<React.SetStateAction<BillingPolicy>>;
  guards: { requireQualityCheckBeforeReady?: boolean };
  setGuards: React.Dispatch<
    React.SetStateAction<{ requireQualityCheckBeforeReady?: boolean }>
  >;
}

export function BillingSettingsSection({
  billingPolicy,
  setBillingPolicy,
  guards,
  setGuards,
}: BillingSettingsSectionProps) {
  const { t } = useTranslation();
  const inputCls = `${MODAL_INPUT_CLS} text-sm`;

  return (
    <div className={`${sectionCardCls} space-y-4`}>
      <div className="flex items-center gap-2">
        <CreditCard className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        <div>
          <h3 className="font-semibold">
            {t("dentalLab.settings.billingPolicy.title")}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("dentalLab.settings.billingPolicy.hint")}
          </p>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3 text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
        {t("dentalLab.settings.billingPolicy.whoOwes")}
      </div>

      <div>
        <label className={labelCls}>
          {t("dentalLab.settings.billingPolicy.invoiceMode")}
        </label>
        <select
          className={inputCls}
          value={billingPolicy.invoiceMode ?? "AUTO_ON_DELIVERY"}
          onChange={(e) =>
            setBillingPolicy((prev) => ({
              ...prev,
              invoiceMode: e.target.value as DentalInvoiceMode,
            }))
          }
        >
          {INVOICE_MODES.map((m) => (
            <option key={m.id} value={m.id}>
              {t(m.labelKey)} — {tKey(t, m.hintKey)}
            </option>
          ))}
        </select>
      </div>

      <div className="divide-y dark:divide-gray-700 border-t dark:border-gray-700">
        <ToggleRow
          label={t(
            "dentalLab.settings.billingPolicy.requireInvoiceBeforeDelivery"
          )}
          hint={t(
            "dentalLab.settings.billingPolicy.requireInvoiceBeforeDelivery_hint"
          )}
          checked={billingPolicy.requireInvoiceBeforeDelivery !== false}
          onChange={(v) =>
            setBillingPolicy((prev) => ({
              ...prev,
              requireInvoiceBeforeDelivery: v,
            }))
          }
        />
        <ToggleRow
          label={t(
            "dentalLab.settings.billingPolicy.requireFullPaymentBeforeDelivery"
          )}
          hint={t(
            "dentalLab.settings.billingPolicy.requireFullPaymentBeforeDelivery_hint"
          )}
          checked={billingPolicy.requireFullPaymentBeforeDelivery === true}
          onChange={(v) =>
            setBillingPolicy((prev) => ({
              ...prev,
              requireFullPaymentBeforeDelivery: v,
            }))
          }
        />
        <ToggleRow
          label={t("dentalLab.settings.billingPolicy.enforceCreditLimit")}
          hint={t(
            "dentalLab.settings.billingPolicy.enforceCreditLimit_hint"
          )}
          checked={billingPolicy.enforceCreditLimit === true}
          onChange={(v) =>
            setBillingPolicy((prev) => ({
              ...prev,
              enforceCreditLimit: v,
            }))
          }
        />
        <ToggleRow
          label="إلزام فحص الجودة قبل التسليم"
          hint="يمنع نقل الحالة إلى جاهز للتسليم (READY) إلا بعد إجراء فحص جودة معتمد وناجح"
          checked={guards.requireQualityCheckBeforeReady === true}
          onChange={(v) =>
            setGuards((prev) => ({
              ...prev,
              requireQualityCheckBeforeReady: v,
            }))
          }
        />
      </div>
    </div>
  );
}

export default BillingSettingsSection;
