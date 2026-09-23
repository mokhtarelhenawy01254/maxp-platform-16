import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Loader2, RefreshCw, UserCheck, ScanLine, FileText, PackageCheck, AlertTriangle, Clock } from "lucide-react";
import {
  api, fetchJson,
  derivePrimaryStage,
  RadiologyStage,
} from "./shared";

interface QueueAppointment {
  id: string; bookingNo?: number; patientName: string; patientPhone?: string;
  examTypeName?: string; deviceId?: string; deviceName?: string;
  appointmentDate?: string; appointmentTime?: string;
  status: string; emergency?: boolean; createdAt: string;
}

interface QueueStudy {
  id: string; studyNumber?: string; patientName: string; patientPhone?: string;
  examTypeName?: string; modality?: string; deviceId?: string; deviceName?: string;
  status: string; orderStatus?: string; emergency: boolean; createdAt: string;
  stuckHours?: number;
}

interface DailyQueueData {
  counts: {
    pendingCheckIn: number; imagingQueue: number; readyForReport: number;
    readyForDelivery: number; stuck: number; totalActive: number;
  };
  pendingCheckIn: QueueAppointment[];
  imagingQueue: QueueStudy[];
  readyForReport: QueueStudy[];
  readyForDelivery: QueueStudy[];
  stuck: QueueStudy[];
}

const EMPTY_COUNTS = { pendingCheckIn: 0, imagingQueue: 0, readyForReport: 0, readyForDelivery: 0, stuck: 0, totalActive: 0 };

import { StageBadge } from "./StageBadge";

export default function DailyQueueTab() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState<DailyQueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const busyRef = useRef(false);

  const load = async (opts?: { silent?: boolean }) => {
    if (busyRef.current) return;
    busyRef.current = true;
    if (!opts?.silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetchJson<DailyQueueData>(api("queue/daily"));
      setData(res);
      setLastUpdated(new Date());
    } catch (e) {
      if (!opts?.silent) toast.error(e instanceof Error ? e.message : t("radiology.queue.loadFailed"));
    } finally {
      busyRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(() => load({ silent: true }), 30000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runAction = async (id: string, fn: () => Promise<unknown>, onFailKey: string, onDone?: () => void) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await fn();
      onDone?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t(onFailKey));
    } finally {
      setBusyId(null);
    }
  };

  const checkIn = (appt: QueueAppointment) =>
    runAction(
      appt.id,
      () => fetchJson(api(`appointments/${appt.id}`), { method: "PUT", body: JSON.stringify({ status: "CHECKED_IN" }) }),
      "radiology.queue.checkInFailed",
      () => { toast.success(t("radiology.queue.checkInDone")); load({ silent: true }); },
    );

  const markImaged = (study: QueueStudy) =>
    runAction(
      study.id,
      () => fetchJson(api(`studies/${study.id}`), { method: "PUT", body: JSON.stringify({ status: "IMAGED" }) }),
      "radiology.queue.advanceFailed",
      () => { toast.success(t("radiology.queue.markImagedDone")); load({ silent: true }); },
    );

  const deliver = (study: QueueStudy) =>
    runAction(
      study.id,
      () => fetchJson(api(`studies/${study.id}/deliver`), { method: "POST" }),
      "radiology.queue.deliverFailed",
      () => { toast.success(t("radiology.queue.deliverDone")); load({ silent: true }); },
    );

  const counts = data?.counts || EMPTY_COUNTS;
  const fmtTime = (d?: string) => (d ? new Date(d).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }) : "—");
  const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString("ar-EG") : "—");

  const kpiCards = [
    { key: "awaitingCheckin", label: t("radiology.queue.awaitingCheckin"), value: counts.pendingCheckIn, color: "text-blue-600 dark:text-blue-400" },
    { key: "imagingQueue", label: t("radiology.queue.imagingQueue"), value: counts.imagingQueue, color: "text-indigo-600 dark:text-indigo-400" },
    { key: "readyForReport", label: t("radiology.queue.readyForReport"), value: counts.readyForReport, color: "text-amber-600 dark:text-amber-400" },
    { key: "readyForDelivery", label: t("radiology.queue.readyForDelivery"), value: counts.readyForDelivery, color: "text-teal-600 dark:text-teal-400" },
    { key: "stuck", label: t("radiology.queue.stuck"), value: counts.stuck, color: "text-red-600 dark:text-red-400" },
    { key: "totalActive", label: t("radiology.queue.totalActive"), value: counts.totalActive, color: "text-gray-600 dark:text-gray-400" },
  ];

  const columns: [
    { stage: RadiologyStage; title: string; count: number; accent: string },
    { stage: RadiologyStage; title: string; count: number; accent: string },
    { stage: RadiologyStage; title: string; count: number; accent: string },
    { stage: RadiologyStage; title: string; count: number; accent: string },
  ] = [
    { stage: "RECEPTION", title: t("radiology.queue.reception"), count: counts.pendingCheckIn, accent: "border-r-blue-500" },
    { stage: "IMAGING", title: t("radiology.queue.imaging"), count: counts.imagingQueue, accent: "border-r-indigo-500" },
    { stage: "REPORT", title: t("radiology.queue.report"), count: counts.readyForReport, accent: "border-r-amber-500" },
    { stage: "DELIVERY", title: t("radiology.queue.delivery"), count: counts.readyForDelivery, accent: "border-r-teal-500" },
  ];

  const studyMeta = (s: QueueStudy) => {
    const stage = derivePrimaryStage(s);
    const extra: Record<string, string> = {};
    if (s.modality) extra[t("radiology.queue.modality")] = s.modality;
    if (s.examTypeName) extra[t("radiology.queue.exam")] = s.examTypeName;
    if (s.deviceName) extra[t("radiology.queue.device")] = s.deviceName;
    return { stage, extra };
  };

  const renderStudyCard = (s: QueueStudy, action?: React.ReactNode) => {
    const { stage, extra } = studyMeta(s);
    return (
      <div key={s.id} className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-3 space-y-2 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{s.patientName}</p>
            {s.studyNumber ? <p className="text-[11px] text-gray-400 dark:text-gray-500 font-mono" dir="ltr">{s.studyNumber}</p> : null}
          </div>
          <StageBadge stage={stage} />
        </div>
        {s.emergency ? <span className="text-[11px] font-semibold text-red-600 dark:text-red-400">{t("radiology.queue.emergency")}</span> : null}
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
          {Object.entries(extra).map(([k, v]) => (
            <span key={k}><b className="text-gray-400 dark:text-gray-500">{k}:</b> {v}</span>
          ))}
          <span><b className="text-gray-400 dark:text-gray-500">{t("radiology.queue.time")}:</b> {fmtTime(s.createdAt)}</span>
        </div>
        {action ? <div className="pt-1">{action}</div> : null}
      </div>
    );
  };

  const renderColumn = (col: { stage: RadiologyStage; title: string; count: number; accent: string }, children: React.ReactNode) => (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 border-r-4 ${col.accent} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">{col.title}</h3>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{col.count}</span>
      </div>
      <div className="space-y-2 max-h-[520px] overflow-y-auto pl-1">
        {children}
      </div>
    </div>
  );

  const emptyCol = () => <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">{t("radiology.queue.empty")}</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{t("radiology.tabs.queue")}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("radiology.queue.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated ? (
            <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />{t("radiology.queue.lastUpdated", { time: fmtTime(lastUpdated.toISOString()) })}
            </span>
          ) : null}
          <button onClick={() => load()} disabled={refreshing} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />{t("radiology.queue.refresh")}
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : !data ? (
        <p className="text-center py-16 text-gray-400 dark:text-gray-500">{t("radiology.queue.loadFailed")}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
            {kpiCards.map(c => (
              <div key={c.key} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{c.label}</p>
                <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {renderColumn(columns[0],
              data.pendingCheckIn.length === 0 ? emptyCol() : data.pendingCheckIn.map(a => (
                <div key={a.id} className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-3 space-y-2 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm truncate">{a.patientName}</p>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" dir="ltr">{a.appointmentTime || "—"}</span>
                  </div>
                  {a.emergency ? <span className="text-[11px] font-semibold text-red-600 dark:text-red-400">{t("radiology.queue.emergency")}</span> : null}
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {a.examTypeName ? <span><b className="text-gray-400 dark:text-gray-500">{t("radiology.queue.exam")}:</b> {a.examTypeName}</span> : null}
                    {a.deviceName ? <span><b className="text-gray-400 dark:text-gray-500">{t("radiology.queue.device")}:</b> {a.deviceName}</span> : null}
                    <span><b className="text-gray-400 dark:text-gray-500">{t("radiology.queue.date")}:</b> {fmtDate(a.appointmentDate)}</span>
                  </div>
                  <div className="pt-1">
                    <button
                      onClick={() => checkIn(a)}
                      disabled={busyId !== null}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {busyId === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}{t("radiology.queue.checkIn")}
                    </button>
                  </div>
                </div>
              ))
            )}

            {renderColumn(columns[1],
              data.imagingQueue.length === 0 ? emptyCol() : data.imagingQueue.map(s => renderStudyCard(
                s,
                <button
                  onClick={() => markImaged(s)}
                  disabled={busyId !== null}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {busyId === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScanLine className="w-3.5 h-3.5" />}{t("radiology.queue.markImaged")}
                </button>
              ))
            )}

            {renderColumn(columns[2],
              data.readyForReport.length === 0 ? emptyCol() : data.readyForReport.map(s => renderStudyCard(
                s,
                <button
                  onClick={() => navigate(`/radiology/study/${s.id}`)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                >
                  <FileText className="w-3.5 h-3.5" />{t("radiology.queue.openStudy")}
                </button>
              ))
            )}

            {renderColumn(columns[3],
              data.readyForDelivery.length === 0 ? emptyCol() : data.readyForDelivery.map(s => renderStudyCard(
                s,
                <button
                  onClick={() => deliver(s)}
                  disabled={busyId !== null}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
                >
                  {busyId === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PackageCheck className="w-3.5 h-3.5" />}{t("radiology.queue.deliver")}
                </button>
              ))
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 border-red-200 dark:border-red-900/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="w-4 h-4" />{t("radiology.queue.stuck")}
              </h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">{counts.stuck}</span>
            </div>
            {data.stuck.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">{t("radiology.queue.noStuck")}</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                {data.stuck.map(s => (
                  <div key={s.id} className="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-900/50 p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm truncate">{s.patientName}</p>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 whitespace-nowrap">
                        {t("radiology.queue.stuckHours", { hours: s.stuckHours ?? 0 })}
                      </span>
                    </div>
                    {s.emergency ? <span className="text-[11px] font-semibold text-red-600 dark:text-red-400">{t("radiology.queue.emergency")}</span> : null}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-600 dark:text-gray-300">
                      {s.examTypeName ? <span><b className="text-gray-400 dark:text-gray-500">{t("radiology.queue.exam")}:</b> {s.examTypeName}</span> : null}
                      {s.deviceName ? <span><b className="text-gray-400 dark:text-gray-500">{t("radiology.queue.device")}:</b> {s.deviceName}</span> : null}
                      <span><b className="text-gray-400 dark:text-gray-500">{t("radiology.queue.time")}:</b> {fmtTime(s.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
