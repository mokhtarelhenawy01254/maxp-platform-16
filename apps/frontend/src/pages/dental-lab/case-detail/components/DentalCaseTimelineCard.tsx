import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowRight, CheckCircle2, History } from "lucide-react";
import DentalCaseCard from "./DentalCaseCard";
import {
  CASE_STATUS_MAP,
  fmtDateTime,
  type DentalCaseHistoryEntry,
} from "../../shared";
import { FALLBACK_BADGE } from "../types/dentalCaseDetailTypes";

interface DentalCaseTimelineCardProps {
  history: DentalCaseHistoryEntry[];
}

const renderBadge = (
  map: Record<string, { label: string; color: string }>,
  value?: string,
  fallback?: string
) => {
  if (!value) return null;
  const meta = map[value] ?? { ...FALLBACK_BADGE, label: fallback ?? value };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${meta.color}`}>
      {meta.label}
    </span>
  );
};

export default function DentalCaseTimelineCard({ history }: DentalCaseTimelineCardProps) {
  const { t } = useTranslation();

  return (
    <DentalCaseCard title={t("dentalLab.detail.timeline")} icon={<History className="w-5 h-5" />}>
      {history.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">{t("dentalLab.common.noData")}</p>
      ) : (
        <div className="space-y-4">
          {history.map((h) => (
            <div key={h.id} className="flex gap-3 text-sm">
              <div className="flex flex-col items-center">
                <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {h.dimension === "DESIGN_REVIEW" ? (
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        h.status === "APPROVED"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                      }`}
                    >
                      {h.status === "APPROVED" ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>اعتماد تصميم الـ 3D من الطبيب</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>طلب تعديل على تصميم الـ 3D</span>
                        </>
                      )}
                    </span>
                  ) : (
                    <>
                      {renderBadge(CASE_STATUS_MAP, h.fromStatus)}
                      <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                      {renderBadge(CASE_STATUS_MAP, h.toStatus)}
                    </>
                  )}
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-mono tabular-nums">
                    {fmtDateTime(h.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t("dentalLab.detail.changedBy")}: {h.userName || h.changedBy || "—"}
                </p>
                {h.reason ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{h.reason}</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </DentalCaseCard>
  );
}
