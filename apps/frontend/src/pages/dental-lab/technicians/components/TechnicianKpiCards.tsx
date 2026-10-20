import { useTranslation } from "react-i18next";
import { fmtMoney } from "../../shared";
import type { TechnicianKpiCardsProps } from "../types/technicianTypes";

export function TechnicianKpiCards({
  wageDefault,
  totalWages,
  totalPaid,
  totalBalanceDue,
}: TechnicianKpiCardsProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
        <p className="text-xs text-gray-500 dark:text-gray-400">أجر المرحلة الافتراضي</p>
        <p className="text-xl font-bold mt-1 font-mono tabular-nums">
          {fmtMoney(wageDefault)} {t("dentalLab.common.egp")}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
        <p className="text-xs text-gray-500 dark:text-gray-400">إجمالي مستحقات الإنتاج</p>
        <p className="text-xl font-bold mt-1 text-blue-600 dark:text-blue-400 font-mono tabular-nums">
          {fmtMoney(totalWages)} {t("dentalLab.common.egp")}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
        <p className="text-xs text-gray-500 dark:text-gray-400">إجمالي المنصرف والسلف</p>
        <p className="text-xl font-bold mt-1 text-purple-600 dark:text-purple-400 font-mono tabular-nums">
          {fmtMoney(totalPaid)} {t("dentalLab.common.egp")}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
        <p className="text-xs text-gray-500 dark:text-gray-400">صافي المستحق القائم للفريق</p>
        <p
          className={`text-xl font-bold mt-1 font-mono tabular-nums ${
            totalBalanceDue > 0
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-gray-600 dark:text-gray-300"
          }`}
        >
          {fmtMoney(totalBalanceDue)} {t("dentalLab.common.egp")}
        </p>
      </div>
    </div>
  );
}

export default TechnicianKpiCards;
