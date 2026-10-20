import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Coins, Loader2, TrendingUp } from "lucide-react";
import {
  fetchDoctors,
  fetchDoctorStatement,
  type DentalLabDoctor,
  type DoctorStatement,
  fmtMoney,
  fmtDate,
} from "../../shared";
import {
  todayISO,
  monthStartISO,
  inputCls,
  dateCls,
  tableWrap,
  thCls,
  tdCls,
  EmptyState,
} from "../types/reportsTypes";

export function DoctorStatementView() {
  const { t } = useTranslation();
  const [doctors, setDoctors] = useState<DentalLabDoctor[]>([]);
  const [doctorId, setDoctorId] = useState("");
  const [from, setFrom] = useState(monthStartISO());
  const [to, setTo] = useState(todayISO());
  const [data, setData] = useState<DoctorStatement | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDoctors().then(setDoctors).catch(() => setDoctors([]));
  }, []);

  const load = async () => {
    if (!doctorId) {
      toast.error(t("dentalLab.reports.selectDoctorFirst"));
      return;
    }
    setLoading(true);
    try {
      setData(await fetchDoctorStatement({ doctorId, from, to }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setLoading(false);
    }
  };

  const totals = data?.totals;
  const cases = data?.cases ?? [];
  const invoices = data?.invoices ?? [];

  const kpi = [
    {
      label: t("dentalLab.reports.cases"),
      value: String(totals?.cases ?? "—"),
      tone: "text-gray-900 dark:text-white",
    },
    {
      label: t("dentalLab.reports.invoices"),
      value: String(totals?.invoicesCount ?? "—"),
      tone: "text-gray-900 dark:text-white",
    },
    {
      label: t("dentalLab.common.paid"),
      value: totals ? fmtMoney(totals.paid) : "—",
      tone: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: t("dentalLab.common.remaining"),
      value: totals ? fmtMoney(totals.remaining) : "—",
      tone: "text-rose-600 dark:text-rose-400",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px]">
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            {t("dentalLab.reports.doctor")}
          </label>
          <select
            className={inputCls}
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
          >
            <option value="">{t("dentalLab.reports.allDoctors")}</option>
            {doctors
              .filter((d) => d.isActive)
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            {t("dentalLab.reports.from")}
          </label>
          <input
            className={dateCls}
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            {t("dentalLab.reports.to")}
          </label>
          <input
            className={dateCls}
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <TrendingUp className="w-4 h-4" />
          )}
          {t("dentalLab.reports.run")}
        </button>
        {data?.doctor?.name ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm">
            <Coins className="w-4 h-4 text-gray-400" />
            <span className="text-gray-500 dark:text-gray-400">
              {t("dentalLab.reports.doctorName")}:
            </span>
            <span className="font-semibold">{data.doctor.name}</span>
          </div>
        ) : null}
      </div>

      {data ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {kpi.map((k) => (
              <div
                key={k.label}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-3"
              >
                <p className="text-xs text-gray-500 dark:text-gray-400">{k.label}</p>
                <p className={`text-xl font-bold mt-0.5 tabular-nums font-mono ${k.tone}`}>
                  {k.value}
                </p>
              </div>
            ))}
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              {t("dentalLab.reports.cases")}
            </h4>
            {cases.length === 0 ? (
              <EmptyState message={t("dentalLab.common.noData")} />
            ) : (
              <div className={tableWrap}>
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className={thCls}>{t("dentalLab.cases.caseNumber")}</th>
                      <th className={thCls}>{t("dentalLab.cases.patient")}</th>
                      <th className={thCls}>{t("dentalLab.cases.workType")}</th>
                      <th className={thCls}>{t("dentalLab.cases.dueDate")}</th>
                      <th className={thCls}>{t("dentalLab.common.total")}</th>
                      <th className={thCls}>{t("dentalLab.common.paid")}</th>
                      <th className={thCls}>{t("dentalLab.common.remaining")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cases.map((cs, i) => (
                      <tr
                        key={cs.caseNumber ?? i}
                        className="border-b dark:border-gray-700 last:border-b-0"
                      >
                        <td className={`${tdCls} font-mono`} dir="ltr">
                          {cs.caseNumber || "—"}
                        </td>
                        <td className={tdCls}>{cs.patientName || "—"}</td>
                        <td className={tdCls}>{cs.workTypeName || "—"}</td>
                        <td className={`${tdCls} font-mono tabular-nums`}>
                          {fmtDate(cs.dueDate)}
                        </td>
                        <td className={`${tdCls} font-mono tabular-nums`}>
                          {fmtMoney(cs.total)}
                        </td>
                        <td className={`${tdCls} font-mono tabular-nums`}>
                          {fmtMoney(cs.paid)}
                        </td>
                        <td
                          className={`${tdCls} text-rose-600 dark:text-rose-400 font-mono tabular-nums`}
                        >
                          {fmtMoney(cs.remaining)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              {t("dentalLab.reports.invoices")}
            </h4>
            {invoices.length === 0 ? (
              <EmptyState message={t("dentalLab.common.noData")} />
            ) : (
              <div className={tableWrap}>
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className={thCls}>{t("dentalLab.detail.invoiceNumber")}</th>
                      <th className={thCls}>{t("dentalLab.cases.patient")}</th>
                      <th className={thCls}>{t("dentalLab.common.total")}</th>
                      <th className={thCls}>{t("dentalLab.common.paid")}</th>
                      <th className={thCls}>{t("dentalLab.common.remaining")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr
                        key={inv.id}
                        className="border-b dark:border-gray-700 last:border-b-0"
                      >
                        <td className={`${tdCls} font-mono`} dir="ltr">
                          {inv.invoiceNumber || inv.id.slice(0, 8)}
                        </td>
                        <td className={tdCls}>{inv.patientName || "—"}</td>
                        <td className={`${tdCls} font-mono tabular-nums`}>
                          {fmtMoney(inv.total)}
                        </td>
                        <td className={`${tdCls} font-mono tabular-nums`}>
                          {fmtMoney(inv.paid)}
                        </td>
                        <td
                          className={`${tdCls} text-rose-600 dark:text-rose-400 font-mono tabular-nums`}
                        >
                          {fmtMoney(inv.remaining)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <EmptyState message={t("dentalLab.reports.runToSee")} />
      )}
    </div>
  );
}

export default DoctorStatementView;
