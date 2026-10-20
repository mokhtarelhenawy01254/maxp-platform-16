import React from "react";
import { ArrowPathIcon, LinkIcon } from "@heroicons/react/24/outline";

export interface LiveOccasion {
  id: string;
  name: string;
  scheduledAt: string;
  recurrence: string;
  totalSent?: number;
  templateId?: string | null;
}

export interface TemplateOccasionsSectionProps {
  liveOccasions: LiveOccasion[];
  linkedOccasionId: string | null;
  onStartLinking: (occ: { id: string; name: string }) => void;
}

export default function TemplateOccasionsSection({
  liveOccasions,
  linkedOccasionId,
  onStartLinking,
}: TemplateOccasionsSectionProps) {
  if (liveOccasions.length === 0) return null;

  return (
    <div className="mb-4 rounded-xl border border-violet-200/70 bg-violet-50/40 p-4 dark:border-violet-900/30 dark:bg-violet-950/20">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-violet-900 dark:text-violet-200">
            المناسبات المجدولة ({liveOccasions.length})
          </h3>
          <p className="text-xs text-violet-600 dark:text-violet-400">
            كل مناسبة بتبعت برسالتها الخاصة — اربطي كل مناسبة بقالب ميتا أو رسالة عادية
          </p>
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {liveOccasions.map((occ) => {
          const isLinked = linkedOccasionId === occ.id;
          return (
            <div
              key={occ.id}
              className="rounded-lg border border-violet-200 bg-white p-3 dark:border-violet-900/40 dark:bg-slate-900/50"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {occ.name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    {new Date(occ.scheduledAt).toLocaleDateString("ar-EG", {
                      day: "numeric",
                      month: "long",
                    })}
                    {" · "}
                    {occ.recurrence === "yearly"
                      ? "سنوي"
                      : occ.recurrence === "monthly"
                        ? "شهري"
                        : "مرة واحدة"}
                    {" · "}
                    <span className="tabular-nums font-mono">
                      {(occ.totalSent || 0).toLocaleString("ar-EG")}
                    </span>{" "}
                    مرسل
                  </p>
                </div>
                {occ.templateId && !isLinked && (
                  <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    مربوطة بقالب
                  </span>
                )}
              </div>
              {!occ.templateId ? (
                <button
                  type="button"
                  onClick={() => onStartLinking({ id: occ.id, name: occ.name })}
                  className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-blue-700"
                >
                  <LinkIcon className="size-3.5" />
                  اختيار قالب ميتا للمناسبة
                </button>
              ) : isLinked ? (
                <p className="mt-2 rounded-md bg-violet-100/60 p-2 text-[11px] text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                  جاري الربط… اختاري القالب من النافذة
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => onStartLinking({ id: occ.id, name: occ.name })}
                  className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-violet-300 px-3 py-1.5 text-[11px] font-medium text-violet-700 transition hover:bg-violet-50 dark:border-violet-800 dark:text-violet-300"
                >
                  <ArrowPathIcon className="size-3.5" />
                  تغيير القالب
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
