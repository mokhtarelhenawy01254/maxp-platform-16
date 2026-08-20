import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { api, fetchJson, RadiologyStatusMap, RadiologyReportStatusMap } from "./shared";

interface Stats {
  total: number; delivered: number; pendingReport: number; reported: number; completionRate: number;
  byStatus: Record<string, number>;
  byModality: Record<string, number>;
  byRadiologist: Record<string, number>;
  byDoctor: Record<string, number>;
  modalityOptions: string[];
}

const STATUS_LABEL: Record<string, string> = {
  PENDING_IMAGING: "radiology.studyStatus.PENDING_IMAGING", IMAGED: "radiology.studyStatus.IMAGED", PENDING_REPORT: "radiology.studyStatus.PENDING_REPORT", REPORTED: "radiology.studyStatus.REPORTED", DELIVERED: "radiology.studyStatus.DELIVERED",
};

interface StageTimeRow {
  fromStatus: string; toStatus: string; dimension: string;
  count: number; avgHours: number; minHours: number; maxHours: number;
}
interface TurnaroundRow { count: number; avgHours: number; minHours: number; maxHours: number; }
interface ModalityTat extends TurnaroundRow { modality: string; }
interface StuckEmergency {
  id: string; studyNumber?: string; patientName: string; examTypeName?: string;
  modality?: string; status: string; createdAt: string;
}
interface TatData {
  stageTimes: StageTimeRow[];
  byModality: ModalityTat[];
  stuckEmergencies: StuckEmergency[];
  overall: TurnaroundRow | null;
}

function TatSection() {
  const { t } = useTranslation();
  const [tat, setTat] = useState<TatData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchJson<TatData>(api("intelligence/tat"));
      setTat(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.tat.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const fmtHours = (v?: number | null) =>
    v === undefined || v === null ? "ΓÇö" : `${Math.round(v * 10) / 10} ${t("radiology.tat.hours")}`;

  const stageLabel = (dimension: string, status: string) => {
    const key = dimension === "REPORT" ? RadiologyReportStatusMap[status]?.label : RadiologyStatusMap[status]?.label;
    return key ? t(key) : status;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{t("radiology.tat.title")}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("radiology.tat.subtitle")}</p>
        </div>
        <button onClick={() => load()} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
          <RefreshCw className="w-4 h-4" />{t("radiology.refresh")}
        </button>
      </div>

      {loading && !tat ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : !tat ? (
        <p className="text-center py-16 text-gray-400 dark:text-gray-500">{t("radiology.tat.noData")}</p>
      ) : (
        <>
          {tat.overall && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: t("radiology.tat.overallCount"), value: tat.overall.count },
                { label: t("radiology.tat.avg"), value: fmtHours(tat.overall.avgHours) },
                { label: t("radiology.tat.min"), value: fmtHours(tat.overall.minHours) },
                { label: t("radiology.tat.max"), value: fmtHours(tat.overall.maxHours) },
              ].map(c => (
                <div key={c.label} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{c.label}</p>
                  <p className="text-2xl font-bold mt-1">{c.value}</p>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5 lg:col-span-2 overflow-x-auto">
              <h3 className="font-semibold mb-4">{t("radiology.tat.stage")}</h3>
              {tat.stageTimes.length === 0 ? (
                <p className="text-sm text-gray-400">{t("radiology.tat.noData")}</p>
              ) : (
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b dark:border-gray-700 text-gray-500 dark:text-gray-400 text-right">
                      <th className="py-2 px-2">{t("radiology.tat.stage")}</th>
                      <th className="py-2 px-2">{t("radiology.tat.count")}</th>
                      <th className="py-2 px-2">{t("radiology.tat.avg")}</th>
                      <th className="py-2 px-2">{t("radiology.tat.min")}</th>
                      <th className="py-2 px-2">{t("radiology.tat.max")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tat.stageTimes.map(r => (
                      <tr key={`${r.dimension}|${r.fromStatus}|${r.toStatus}`} className="border-b dark:border-gray-700/50">
                        <td className="py-2 px-2 whitespace-nowrap">
                          <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">{r.dimension}</span>
                          {stageLabel(r.dimension, r.fromStatus)} <span className="text-gray-400">ΓåÆ</span> {stageLabel(r.dimension, r.toStatus)}
                        </td>
                        <td className="py-2 px-2">{r.count}</td>
                        <td className="py-2 px-2">{fmtHours(r.avgHours)}</td>
                        <td className="py-2 px-2">{fmtHours(r.minHours)}</td>
                        <td className="py-2 px-2">{fmtHours(r.maxHours)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
              <h3 className="font-semibold mb-4">{t("radiology.tat.byModality")}</h3>
              {tat.byModality.length === 0 ? (
                <p className="text-sm text-gray-400">{t("radiology.tat.noData")}</p>
              ) : (
                <div className="space-y-2">
                  {tat.byModality.map(m => {
                    const max = Math.max(...tat.byModality.map(x => x.avgHours), 1);
                    return (
                      <div key={m.modality} className="flex items-center gap-2 text-sm">
                        <span className="w-32 truncate text-gray-600 dark:text-gray-300">{m.modality}</span>
                        <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded h-4 overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded" style={{ width: `${(m.avgHours / max) * 100}%` }} />
                        </div>
                        <span className="w-16 text-left text-gray-500 dark:text-gray-400">{fmtHours(m.avgHours)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" />{t("radiology.tat.stuckEmergencies")}</h3>
              {tat.stuckEmergencies.length === 0 ? (
                <p className="text-sm text-gray-400">{t("radiology.tat.stuckEmpty")}</p>
              ) : (
                <div className="space-y-2">
                  {tat.stuckEmergencies.map(s => (
                    <div key={s.id} className="flex justify-between items-center text-sm border dark:border-gray-700/50 rounded-lg px-3 py-2">
                      <div>
                        <p className="font-medium">{s.patientName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{s.examTypeName || s.modality || "ΓÇö"}{s.studyNumber ? ` ΓÇó ${s.studyNumber}` : ""}</p>
                      </div>
                      <span className="text-xs text-amber-600 dark:text-amber-400">{RadiologyStatusMap[s.status] ? t(RadiologyStatusMap[s.status].label) : s.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function StatisticsTab() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchJson<Stats>(api("statistics"));
      setStats(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.statistics.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const bars = (obj?: Record<string, number>) => {
    if (!obj) return null;
    const entries = Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (entries.length === 0) return <p className="text-sm text-gray-400">{t("radiology.statistics.noData")}</p>;
    const max = Math.max(...entries.map(e => e[1]), 1);
    return (
      <div className="space-y-2">
        {entries.map(([k, v]) => (
          <div key={k} className="flex items-center gap-2 text-sm">
            <span className="w-40 truncate text-gray-600 dark:text-gray-300">{k}</span>
            <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded h-4 overflow-hidden">
              <div className="h-full bg-blue-500 rounded" style={{ width: `${(v / max) * 100}%` }} />
            </div>
            <span className="w-10 text-left text-gray-500 dark:text-gray-400">{v}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{t("radiology.statistics.title")}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("radiology.statistics.subtitle")}</p>
        </div>
        <button onClick={() => load()} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
          <RefreshCw className="w-4 h-4" />{t("radiology.refresh")}
        </button>
      </div>

      {loading && !stats ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : !stats ? (
        <p className="text-center py-16 text-gray-400 dark:text-gray-500">{t("radiology.statistics.noData")}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
            {[
              { label: t("radiology.statistics.totalStudies"), value: stats.total },
              { label: t("radiology.statistics.delivered"), value: stats.delivered },
              { label: t("radiology.statistics.reported"), value: stats.reported },
              { label: t("radiology.statistics.pendingReport"), value: stats.pendingReport },
              { label: t("radiology.statistics.completionRate"), value: `${stats.completionRate}%` },
            ].map(c => (
              <div key={c.label} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400">{c.label}</p>
                <p className="text-2xl font-bold mt-1">{c.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
              <h3 className="font-semibold mb-4">{t("radiology.statistics.byStudyStatus")}</h3>
              <div className="space-y-2">
                {Object.entries(stats.byStatus).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm border-b dark:border-gray-700/50 pb-1.5">
                    <span className="text-gray-600 dark:text-gray-300">{STATUS_LABEL[k] ? t(STATUS_LABEL[k] ?? "") : k}</span>
                    <b>{v}</b>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
              <h3 className="font-semibold mb-4">{t("radiology.statistics.byModality")}</h3>
              {bars(stats.byModality)}
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
              <h3 className="font-semibold mb-4">{t("radiology.statistics.byRadiologist")}</h3>
              {bars(stats.byRadiologist)}
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
              <h3 className="font-semibold mb-4">{t("radiology.statistics.byReferringDoctor")}</h3>
              {bars(stats.byDoctor)}
            </div>
          </div>
        </>
      )}

      <TatSection />
    </div>
  );
}
