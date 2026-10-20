import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BadgeCheck,
  CheckCircle2,
  History,
  Loader2,
  Plus,
  RotateCcw,
  UserCheck,
  XCircle,
} from "lucide-react";
import DentalCaseCard from "./DentalCaseCard";
import {
  ROLE_CONFIG,
  fmtDate,
  fmtDateTime,
  type DentalQualityCheck,
  type DentalRefabrication,
  type DentalLabCaseDetail,
} from "../../shared";

interface DentalCaseTeamQualityCardsProps {
  assignments?: DentalLabCaseDetail["assignments"];
  qualityChecks: DentalQualityCheck[];
  refabrications: DentalRefabrication[];
  latestCheck?: DentalQualityCheck;
  refabBusyId: string | null;
  onOpenQuality: () => void;
  onOpenRefab: () => void;
  onResolveRefab: (refab: DentalRefabrication) => void;
}

export default function DentalCaseTeamQualityCards({
  assignments = [],
  qualityChecks,
  refabrications,
  latestCheck,
  refabBusyId,
  onOpenQuality,
  onOpenRefab,
  onResolveRefab,
}: DentalCaseTeamQualityCardsProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Team Assignments Card */}
      <DentalCaseCard title={t("dentalLab.detail.team")} icon={<UserCheck className="w-5 h-5" />}>
        {assignments.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">{t("dentalLab.detail.noTeam")}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {assignments.map((a) => (
              <div
                key={a.id}
                className="border dark:border-gray-700 rounded-lg p-3 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-sm">
                    <Link
                      to={`/dental-lab/cases?technicianId=${a.technicianId}`}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
                      title={`عرض كل حالات الفني ${a.technician?.name || a.technicianId}`}
                    >
                      {a.technician?.name || a.technicianId}
                    </Link>
                  </p>
                  <p className="text-xs text-gray-400">
                    {t("dentalLab.technicians.role")}: {ROLE_CONFIG[a.role]?.label ?? a.role}
                  </p>
                </div>
                <span className="text-xs text-gray-400 font-mono tabular-nums">
                  {fmtDate(a.assignedAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </DentalCaseCard>

      {/* Quality Checks Card */}
      <DentalCaseCard
        title={t("dentalLab.detail.qualityTitle")}
        icon={<BadgeCheck className="w-5 h-5" />}
        action={
          <button
            onClick={onOpenQuality}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            {t("dentalLab.detail.qualityAdd")}
          </button>
        }
      >
        {latestCheck && latestCheck.passed && (
          <div className="flex items-center gap-1.5 mb-3 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 text-xs font-medium w-fit">
            <CheckCircle2 className="w-4 h-4" />
            {t("dentalLab.detail.qualityInspected")}
          </div>
        )}
        {qualityChecks.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {t("dentalLab.detail.qualityNoData")}
          </p>
        ) : (
          <div className="space-y-3">
            {[...qualityChecks]
              .sort(
                (a, b) =>
                  new Date(b.checkedAt ?? 0).getTime() - new Date(a.checkedAt ?? 0).getTime()
              )
              .map((q) => (
                <div key={q.id} className="border dark:border-gray-700 rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      {q.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      {q.passed
                        ? t("dentalLab.detail.qualityPassed")
                        : t("dentalLab.detail.qualityFailed")}
                    </span>
                    <span className="text-xs text-gray-400 font-mono tabular-nums">
                      {fmtDateTime(q.checkedAt)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t("dentalLab.detail.changedBy")}: {q.checkedByName || q.checkedBy || "—"}
                  </p>
                  {q.notes ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{q.notes}</p>
                  ) : null}
                </div>
              ))}
          </div>
        )}
      </DentalCaseCard>

      {/* Refabrication / Remakes Card */}
      <DentalCaseCard
        title={t("dentalLab.detail.refabTitle")}
        icon={<RotateCcw className="w-5 h-5" />}
        action={
          <button
            onClick={onOpenRefab}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs hover:bg-amber-600 shadow-sm transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t("dentalLab.detail.refabButton")}
          </button>
        }
      >
        {refabrications.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {t("dentalLab.detail.refabNoData")}
          </p>
        ) : (
          <div className="space-y-3">
            {[...refabrications]
              .sort(
                (a, b) =>
                  new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
              )
              .map((r) => (
                <div key={r.id} className="border dark:border-gray-700 rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        r.resolved || r.status === "RESOLVED"
                          ? "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                      }`}
                    >
                      {r.resolved || r.status === "RESOLVED"
                        ? t("dentalLab.detail.refabResolvedTag")
                        : t("dentalLab.detail.refabOpenTag")}
                    </span>
                    <span className="text-xs text-gray-400 font-mono tabular-nums">
                      {fmtDateTime(r.createdAt)}
                    </span>
                  </div>
                  {r.reason ? (
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{r.reason}</p>
                  ) : null}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {t("dentalLab.detail.refabStageFrom")}:{" "}
                    {r.stageFrom ? t(`dentalLab.status.${r.stageFrom}` as any) : "—"}
                  </p>
                  {!(r.resolved || r.status === "RESOLVED") && (
                    <button
                      onClick={() => onResolveRefab(r)}
                      disabled={refabBusyId !== null}
                      className="mt-2 flex items-center gap-1.5 px-3 py-1.5 border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 dark:border-green-700 dark:text-green-300 dark:bg-green-900/30 dark:hover:bg-green-900/50 rounded-lg text-xs font-semibold disabled:opacity-50 transition"
                    >
                      {refabBusyId === r.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      {t("dentalLab.detail.refabResolve")}
                    </button>
                  )}
                </div>
              ))}
          </div>
        )}
      </DentalCaseCard>
    </div>
  );
}
