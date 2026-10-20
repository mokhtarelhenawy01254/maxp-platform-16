import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AlertTriangle, RefreshCw } from "lucide-react";
import {
  fetchOverdueReport,
  type OverdueReportRow,
  fmtMoney,
  fmtDate,
} from "../../shared";
import {
  tableWrap,
  thCls,
  tdCls,
  Skeleton,
  EmptyState,
} from "../types/reportsTypes";

export function OverdueCasesView() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<OverdueReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchOverdueReport());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-rose-600 dark:text-rose-400">
        <AlertTriangle className="w-4 h-4" />
        <span>{t("dentalLab.reports.overdueHint")}</span>
      </div>
      <button
        onClick={load}
        className="flex items-center gap-1.5 px-3 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        <RefreshCw className="w-4 h-4" />
        {t("dentalLab.common.refresh")}
      </button>

      {loading ? (
        <Skeleton />
      ) : rows.length === 0 ? (
        <EmptyState message={t("dentalLab.reports.noOverdue")} />
      ) : (
        <div className={tableWrap}>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={thCls}>{t("dentalLab.cases.caseNumber")}</th>
                <th className={thCls}>{t("dentalLab.reports.doctorName")}</th>
                <th className={thCls}>{t("dentalLab.cases.patient")}</th>
                <th className={thCls}>{t("dentalLab.cases.workType")}</th>
                <th className={thCls}>{t("dentalLab.cases.dueDate")}</th>
                <th className={thCls}>{t("dentalLab.reports.daysOverdue")}</th>
                <th className={thCls}>{t("dentalLab.common.remaining")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.caseNumber ?? i}
                  className="border-b dark:border-gray-700 last:border-b-0"
                >
                  <td className={`${tdCls} font-mono`} dir="ltr">
                    {r.caseNumber || "—"}
                  </td>
                  <td className={tdCls}>{r.doctorName || "—"}</td>
                  <td className={tdCls}>{r.patientName || "—"}</td>
                  <td className={tdCls}>{r.workTypeName || "—"}</td>
                  <td className={`${tdCls} font-mono tabular-nums`}>
                    {fmtDate(r.dueDate)}
                  </td>
                  <td className={tdCls}>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 font-mono tabular-nums">
                      {r.daysOverdue ?? 0} {t("dentalLab.reports.dayUnit")}
                    </span>
                  </td>
                  <td
                    className={`${tdCls} text-rose-600 dark:text-rose-400 font-mono tabular-nums`}
                  >
                    {fmtMoney(r.remaining)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default OverdueCasesView;
