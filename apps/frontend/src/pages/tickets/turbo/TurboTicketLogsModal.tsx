import React, { useState, useEffect } from "react";
import {
  XMarkIcon,
  ClockIcon,
  UserIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { apiClient } from "../../../services/apiClient";
import { TurboTicketLog } from "./types";

interface TurboTicketLogsModalProps {
  isOpen: boolean;
  ticketId: number | null;
  onClose: () => void;
}

export const TurboTicketLogsModal: React.FC<TurboTicketLogsModalProps> = ({
  isOpen,
  ticketId,
  onClose,
}) => {
  const [logs, setLogs] = useState<TurboTicketLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    if (!ticketId) return;
    setLoading(true);
    try {
      const res = await apiClient.get<any>(`/turbo/tickets/${ticketId}/log`);
      const list =
        res.data?.data?.logs ||
        res.data?.logs ||
        res.data?.feed ||
        res.data?.data ||
        [];
      setLogs(Array.isArray(list) ? list : []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && ticketId) {
      fetchLogs();
    }
  }, [isOpen, ticketId]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-fadeIn"
    >
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col max-h-[80vh] overflow-hidden text-right">
        {/* Header */}
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
              <ClockIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                سجل تحركات التذكرة #{ticketId}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                التسلسل الزمني للعمليات وتحديثات الحالة
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={fetchLogs}
              disabled={loading}
              className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              title="تحديث السجل"
            >
              <ArrowPathIcon
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 min-h-0">
          {loading ? (
            <div className="py-12 text-center text-xs text-zinc-500 space-y-2">
              <div className="h-5 w-5 border-2 border-zinc-900 dark:border-zinc-100 border-t-transparent animate-spin rounded-full mx-auto" />
              <p>جاري تحميل السجل...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-400">
              لا توجد سجلات مسجلة لهذه التذكرة حتى الآن.
            </div>
          ) : (
            logs.map((log, idx) => {
              const desc =
                typeof log.description === "object"
                  ? log.description?.ar || log.description?.en || ""
                  : log.description || "تحديث حالة";
              const author =
                log.user?.full_name || log.user?.name || "نظام تربو";
              const dateStr = log.created_at
                ? new Date(log.created_at).toLocaleString("ar-EG")
                : "";

              return (
                <div
                  key={log.id || idx}
                  className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 text-xs space-y-1.5"
                >
                  <p className="font-medium text-zinc-800 dark:text-zinc-200">
                    {desc}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span className="flex items-center gap-1">
                      <UserIcon className="h-3 w-3" />
                      <span>{author}</span>
                    </span>
                    <span className="tabular-nums">{dateStr}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
