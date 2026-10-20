import React from "react";
import { GlobeAltIcon, PaperAirplaneIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import type { MetaSession } from "../types";

export interface TemplateBatchPublishBannerProps {
  unsubmittedCount: number;
  metaSessions: MetaSession[];
  selectedMetaSession: string;
  onSelectMetaSession: (id: string) => void;
  batchPublishing: boolean;
  onBatchPublish: () => void;
}

export default function TemplateBatchPublishBanner({
  unsubmittedCount,
  metaSessions,
  selectedMetaSession,
  onSelectMetaSession,
  batchPublishing,
  onBatchPublish,
}: TemplateBatchPublishBannerProps) {
  if (unsubmittedCount === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-500/30 bg-sky-500/[0.06] p-3.5 backdrop-blur-sm dark:border-sky-500/30 dark:bg-sky-500/10">
      <div className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:bg-sky-500/25 dark:text-sky-400">
          <GlobeAltIcon className="size-5" />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
            قوالب Meta الرسمية جاهزة ({unsubmittedCount} قالب جاهز)
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            تم تجهيز قوالب الحالات تلقائياً بمعايير Meta المعتمدة. اضغط لإرسالها لميتا للمراجعة والاعتماد لأول مرة.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {metaSessions.length > 1 && (
          <select
            value={selectedMetaSession}
            onChange={(e) => onSelectMetaSession(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            {metaSessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          onClick={onBatchPublish}
          disabled={batchPublishing}
          className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700 active:scale-95 disabled:opacity-50 dark:bg-sky-500 dark:hover:bg-sky-600"
        >
          {batchPublishing ? (
            <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <PaperAirplaneIcon className="h-3.5 w-3.5" />
          )}
          إرسال القوالب لميتا الآن
        </button>
      </div>
    </div>
  );
}
