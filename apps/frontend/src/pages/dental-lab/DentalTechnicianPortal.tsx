import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CheckCircle2, ClipboardList, Loader2, RefreshCw, Wallet, ArrowUpCircle } from "lucide-react";
import {
  fetchMyCases, fetchMyWage, MyCase, MyWage, advanceCase, fmtDate, fmtMoney, MODAL_INPUT_CLS,
  CASE_STATUS_MAP, nextStatusOf,
} from "./shared";

export default function DentalTechnicianPortal() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"cases" | "wage">("cases");
  const [cases, setCases] = useState<MyCase[]>([]);
  const [wage, setWage] = useState<MyWage | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, w] = await Promise.all([fetchMyCases(), fetchMyWage()]);
      setCases(c.items || []);
      setWage(w);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const completeMyStage = async (c: MyCase) => {
    if (busyId) return;
    const next = nextStatusOf(c.status || "");
    if (!next) return;
    setBusyId(c.id);
    try {
      await advanceCase(c.id, { to: next });
      toast.success(t("dentalLab.myCases.stageCompleted"));
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setBusyId(null);
    }
  };

  const statusLabel = (s?: string) => (s && CASE_STATUS_MAP[s] ? CASE_STATUS_MAP[s].label : s || "—");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t("dentalLab.myCases.title")}</h2>
          {wage?.technician && <p className="text-sm text-gray-500 dark:text-gray-400">{t("dentalLab.myCases.welcome")}: {wage.technician.name}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
            <RefreshCw className="w-4 h-4" />{t("dentalLab.common.refresh")}
          </button>
          <div className="flex rounded-lg border dark:border-gray-600 overflow-hidden">
            <button onClick={() => setTab("cases")} className={`px-4 py-2 text-sm flex items-center gap-1.5 ${tab === "cases" ? "bg-blue-600 text-white" : "hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
              <ClipboardList className="w-4 h-4" />{t("dentalLab.myCases.tab")}
            </button>
            <button onClick={() => setTab("wage")} className={`px-4 py-2 text-sm flex items-center gap-1.5 ${tab === "wage" ? "bg-blue-600 text-white" : "hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
              <Wallet className="w-4 h-4" />{t("dentalLab.myWage.title")}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : tab === "wage" ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5">
            <p className="text-xs text-gray-500 dark:text-gray-400">{t("dentalLab.myWage.rate")}</p>
            <p className="text-xl font-bold mt-1">{fmtMoney(wage?.rate)} {t("dentalLab.common.egp")}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5">
            <p className="text-xs text-gray-500 dark:text-gray-400">{t("dentalLab.myWage.thisMonth")}</p>
            <p className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{fmtMoney(wage?.thisMonthWage)} {t("dentalLab.common.egp")}</p>
            <p className="text-xs text-gray-400 mt-1">{wage?.thisMonthStages ?? 0} {t("dentalLab.myWage.stages")}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5">
            <p className="text-xs text-gray-500 dark:text-gray-400">{t("dentalLab.myWage.total")}</p>
            <p className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{fmtMoney(wage?.totalWage)} {t("dentalLab.common.egp")}</p>
            <p className="text-xs text-gray-400 mt-1">{wage?.completedStages ?? 0} {t("dentalLab.myWage.stages")}</p>
          </div>
        </div>
      ) : cases.length === 0 ? (
        <div className="p-12 text-center text-gray-400 dark:text-gray-500">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-3" />
          {t("dentalLab.myCases.empty")}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300">
                {[t("dentalLab.cases.caseNumber"), t("dentalLab.cases.patient"), t("dentalLab.cases.workType"), t("dentalLab.cases.teeth"), t("dentalLab.cases.shade"), t("dentalLab.cases.material"), t("dentalLab.myCases.myStage"), t("dentalLab.common.status"), t("dentalLab.myCases.dueDate"), t("dentalLab.common.actions")].map(h => (
                  <th key={h} className="text-right py-3 px-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cases.map(c => {
                const next = nextStatusOf(c.status || "");
                return (
                  <tr key={c.id} className="border-b dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="py-3 px-3 font-medium">{c.caseNumber || "—"}</td>
                    <td className="py-3 px-3">{c.patientName || "—"}</td>
                    <td className="py-3 px-3">{c.workTypeName || "—"}</td>
                    <td className="py-3 px-3" dir="ltr">{c.teeth || "—"}</td>
                    <td className="py-3 px-3">{c.shade || "—"}</td>
                    <td className="py-3 px-3">{c.material || "—"}</td>
                    <td className="py-3 px-3">
                      {c.myStage ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {c.myStage.name}
                          {c.myStage.assigneeName ? ` (${c.myStage.assigneeName})` : ""}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="py-3 px-3">{statusLabel(c.status)}</td>
                    <td className="py-3 px-3 text-gray-500 dark:text-gray-400">{fmtDate(c.dueDate)}</td>
                    <td className="py-3 px-3">
                      {next && (
                        <button
                          onClick={() => completeMyStage(c)}
                          disabled={busyId !== null}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs hover:bg-emerald-700 disabled:opacity-40"
                        >
                          {busyId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpCircle className="w-3.5 h-3.5" />}
                          {t("dentalLab.myCases.complete")}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
