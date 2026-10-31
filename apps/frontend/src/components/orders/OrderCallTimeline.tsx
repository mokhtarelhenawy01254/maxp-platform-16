import React, { useEffect, useState } from "react";
import api from "../../services/api";
import { PhoneCall, Play, Clock, AlertCircle, CheckCircle2, PhoneOff, PhoneForwarded } from "lucide-react";

export interface CallAttemptItem {
  id: string;
  orderId?: string | null;
  guestOrderId?: string | null;
  userId: string;
  direction?: string;
  callStatus?: string;
  durationSeconds: number;
  callerPhone?: string | null;
  customerPhone?: string | null;
  recordingUrl?: string | null;
  result?: string | null;
  notes?: string | null;
  createdAt: string;
  user?: {
    id: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null;
}

interface OrderCallTimelineProps {
  orderId: string;
  className?: string;
}

export const OrderCallTimeline: React.FC<OrderCallTimelineProps> = ({ orderId, className = "" }) => {
  const [logs, setLogs] = useState<CallAttemptItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    let isMounted = true;
    api
      .get<{ success: boolean; data: CallAttemptItem[] }>(`/voice/logs/${orderId}`)
      .then((res) => {
        if (isMounted && res.data?.data) {
          setLogs(res.data.data);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn("[VOICE-LOGS] Failed to load call logs:", err.message);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 text-xs text-gray-500 animate-pulse ${className}`}>
        جاري تحميل سجل مكالمات الطلب...
      </div>
    );
  }

  if (logs.length === 0) {
    return null; // Don't take up space if no voice calls have occurred yet
  }

  const getResultBadge = (result?: string | null) => {
    const res = String(result || "").toLowerCase();
    if (res === "reached") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="w-3 h-3" /> تم الرد والتأكيد
        </span>
      );
    }
    if (res === "busy") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          <PhoneOff className="w-3 h-3" /> الخط مشغول
        </span>
      );
    }
    if (res === "wrong_number") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
          <AlertCircle className="w-3 h-3" /> الرقم خاطئ
        </span>
      );
    }
    if (res === "pending") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          <Clock className="w-3 h-3 animate-spin" /> قيد الاتصال
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
        <PhoneForwarded className="w-3 h-3" /> لم يتم الرد ({res || "unreached"})
      </span>
    );
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 space-y-3 ${className}`}>
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-2.5">
        <div className="flex items-center gap-2">
          <PhoneCall className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h4 className="font-semibold text-xs text-gray-900 dark:text-white">
            سجل مكالمات الذكاء الاصطناعي (AI Voice Confirmation)
          </h4>
        </div>
        <span className="text-[11px] text-gray-400 font-mono">
          {logs.length} {logs.length === 1 ? "محاولة" : "محاولات"}
        </span>
      </div>

      <div className="space-y-2.5">
        {logs.map((log, index) => {
          const isSim = log.notes?.includes("SIMULATION") || log.recordingUrl?.includes("simulated");
          const dateStr = new Date(log.createdAt).toLocaleString("ar-EG", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <div
              key={log.id}
              className="p-3 bg-gray-50 dark:bg-gray-900/40 rounded-lg border border-gray-100 dark:border-gray-800 text-xs space-y-2"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    المحاولة #{logs.length - index}
                  </span>
                  {getResultBadge(log.result)}
                  {isSim && (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-medium">
                      SIMULATION
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-gray-400 font-mono flex items-center gap-2">
                  {log.durationSeconds > 0 && <span>{log.durationSeconds} ثانية</span>}
                  <span>{dateStr}</span>
                </div>
              </div>

              {log.notes && (
                <div className="text-[11px] text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-850 p-2 rounded border border-gray-100 dark:border-gray-800">
                  {log.notes}
                </div>
              )}

              {log.recordingUrl && (
                <div className="flex items-center gap-2 pt-1 text-[11px] text-indigo-600 dark:text-indigo-400">
                  <Play className="w-3 h-3" />
                  <a
                    href={log.recordingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline flex items-center gap-1 font-mono"
                  >
                    الاستماع لتسجيل المكالمة
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderCallTimeline;
