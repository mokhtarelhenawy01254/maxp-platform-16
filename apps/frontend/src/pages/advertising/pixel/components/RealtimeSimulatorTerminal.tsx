import React, { useState } from "react";
import {
  CommandLineIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  PaperAirplaneIcon,
  ArrowTopRightOnSquareIcon,
  ClipboardDocumentIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { SimulatorEventType, SimulatorResult } from "../types";

interface RealtimeSimulatorTerminalProps {
  pixelId: string;
  hasCapiToken: boolean;
  testCode: string;
  onUpdateTestCode: (code: string) => void;
  onSendEvent: (params: {
    eventName: SimulatorEventType;
    value: number;
    contentName: string;
  }) => Promise<SimulatorResult | null>;
  isSending: boolean;
  recentEvents: SimulatorResult[];
}

export const RealtimeSimulatorTerminal: React.FC<RealtimeSimulatorTerminalProps> = ({
  pixelId,
  hasCapiToken,
  testCode,
  onUpdateTestCode,
  onSendEvent,
  isSending,
  recentEvents,
}) => {
  const [selectedEvent, setSelectedEvent] = useState<SimulatorEventType>("Purchase");
  const [value, setValue] = useState(150);
  const [contentName, setContentName] = useState("قميص كلاسيكي تجريبي للتأكد من الربط");
  const [result, setResult] = useState<SimulatorResult | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await onSendEvent({
      eventName: selectedEvent,
      value,
      contentName,
    });
    if (res) {
      setResult(res);
    }
  };

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isReady = Boolean(pixelId) && hasCapiToken;

  return (
    <section className="border border-gray-200/90 dark:border-gray-800/90 bg-white dark:bg-gray-900 rounded-xl overflow-hidden shadow-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-850/50">
        <div className="flex items-center gap-2">
          <CommandLineIcon className="w-4 h-4 text-indigo-500" />
          <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
            طرفية اختبار الأحداث اللحظية (Meta v26.0 Event Console)
          </h2>
        </div>

        <a
          href="https://business.facebook.com/events_manager2"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium"
        >
          <span>معاينة في Meta Test Events</span>
          <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
        </a>
      </div>

      <div className="p-4 sm:p-6 space-y-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Event Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                الحدث التجريبي
              </label>
              <select
                value={selectedEvent}
                onChange={(e) =>
                  setSelectedEvent(e.target.value as SimulatorEventType)
                }
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-h-[38px]"
              >
                <option value="Purchase">Purchase (إتمام الشراء)</option>
                <option value="AddToCart">AddToCart (إضافة للسلة)</option>
                <option value="InitiateCheckout">InitiateCheckout (بدء الطلب)</option>
                <option value="ViewContent">ViewContent (عرض منتج)</option>
                <option value="PageView">PageView (عرض صفحة)</option>
              </select>
            </div>

            {/* Event Value */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                القيمة النقدية (Value)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  value={value}
                  onChange={(e) => setValue(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-mono tabular-nums focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-h-[38px] pl-10"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-gray-400">
                  EGP
                </span>
              </div>
            </div>

            {/* Test Event Code */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                Test Event Code (من فيسبوك)
              </label>
              <input
                type="text"
                dir="ltr"
                value={testCode}
                onChange={(e) => onUpdateTestCode(e.target.value.trim())}
                placeholder="TEST12345"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-mono uppercase focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-h-[38px]"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={contentName}
                onChange={(e) => setContentName(e.target.value)}
                placeholder="اسم المنتج أو المحتوى التجريبي"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-h-[38px]"
              />
            </div>

            <button
              type="submit"
              disabled={isSending || !isReady}
              className="px-5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[38px] shadow-xs"
            >
              {isSending ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  <span>جاري الإرسال لـ Meta…</span>
                </>
              ) : (
                <>
                  <PaperAirplaneIcon className="w-4 h-4" />
                  <span>إرسال الحدث فورياً</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Real-time Response Output */}
        {result && (
          <div className="p-3.5 rounded-lg bg-gray-900 text-gray-100 font-mono text-xs border border-gray-800 space-y-2">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2 text-[11px] text-gray-400">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <CheckCircleIcon className="w-3.5 h-3.5" />
                <span>200 OK — تم استلام الحدث بنجاح في Meta Conversions API</span>
              </span>
              <span className="tabular-nums">{result.timestamp}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
              <div>
                <span className="text-gray-500">Event: </span>
                <span className="text-white font-bold">{result.eventName}</span>
              </div>
              <div className="truncate flex items-center gap-1">
                <span className="text-gray-500">Event ID: </span>
                <span className="text-amber-300 tabular-nums">{result.eventId}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(result.eventId)}
                  className="p-0.5 text-gray-400 hover:text-white"
                  title="نسخ"
                >
                  {copiedId === result.eventId ? (
                    <CheckIcon className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <ClipboardDocumentIcon className="w-3 h-3" />
                  )}
                </button>
              </div>
              {result.testEventCode && (
                <div>
                  <span className="text-gray-500">Test Code: </span>
                  <span className="text-cyan-300">{result.testEventCode}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recent Events Stream Table */}
        {recentEvents.length > 1 && (
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                سجل تدفق الأحداث الأخيرة في الجلسة (Session Event Log)
              </span>
              <span className="text-[10px] text-gray-400 font-mono">
                {recentEvents.length} أحداث
              </span>
            </div>

            <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 text-[11px] text-gray-500">
                    <th className="px-3 py-2">الحدث</th>
                    <th className="px-3 py-2">معرف الحدث (Event ID)</th>
                    <th className="px-3 py-2 text-center">الوقت</th>
                    <th className="px-3 py-2 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono text-[11px]">
                  {recentEvents.map((ev, idx) => (
                    <tr key={ev.eventId + idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="px-3 py-2 font-bold text-gray-900 dark:text-white">
                        {ev.eventName}
                      </td>
                      <td className="px-3 py-2 text-amber-600 dark:text-amber-400">
                        {ev.eventId}
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums text-gray-500">
                        {ev.timestamp}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 font-sans font-semibold">
                          Processed
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
