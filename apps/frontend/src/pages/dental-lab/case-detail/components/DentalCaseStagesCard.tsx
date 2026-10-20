import { useTranslation } from "react-i18next";
import { Layers, Users } from "lucide-react";
import DentalCaseCard from "./DentalCaseCard";
import {
  STAGE_STATUS_MAP,
  fmtDate,
  type DentalCaseStage,
} from "../../shared";
import {
  STAGE_ASSIGNEE_ROLES,
  FALLBACK_BADGE,
} from "../types/dentalCaseDetailTypes";

interface DentalCaseStagesCardProps {
  stages: DentalCaseStage[];
  isDeleted?: boolean;
  onAssignStage: (stage: DentalCaseStage) => void;
}

const renderBadge = (
  map: Record<string, { label: string; color: string }>,
  value?: string,
  fallback?: string
) => {
  if (!value) return null;
  const meta = map[value] ?? { ...FALLBACK_BADGE, label: fallback ?? value };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${meta.color}`}>
      {meta.label}
    </span>
  );
};

export default function DentalCaseStagesCard({
  stages,
  isDeleted,
  onAssignStage,
}: DentalCaseStagesCardProps) {
  const { t } = useTranslation();

  return (
    <DentalCaseCard title={t("dentalLab.detail.stages")} icon={<Layers className="w-5 h-5" />}>
      {stages.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">{t("dentalLab.detail.noStages")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-gray-700 text-gray-500 dark:text-gray-300">
                <th className="text-right py-2.5 px-3">{t("dentalLab.detail.stageName")}</th>
                <th className="text-right py-2.5 px-3">الفنيون المسندون للمرحلة</th>
                <th className="text-right py-2.5 px-3">{t("dentalLab.common.status")}</th>
                <th className="text-right py-2.5 px-3">{t("dentalLab.detail.startedAt")}</th>
                <th className="text-right py-2.5 px-3">{t("dentalLab.detail.completedAt")}</th>
                <th className="text-right py-2.5 px-3">إدارة الفنيين</th>
              </tr>
            </thead>
            <tbody>
              {stages.map((s) => {
                const hasAssignees = s.assignees && s.assignees.length > 0;
                return (
                  <tr
                    key={s.id}
                    className="border-b dark:border-gray-700 last:border-b-0 hover:bg-gray-50/50 dark:hover:bg-gray-900/30"
                  >
                    <td className="py-2.5 px-3 font-medium">{s.name}</td>
                    <td className="py-2.5 px-3">
                      {hasAssignees ? (
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {s.assignees!.map((asg) => {
                            const techName =
                              asg.technician?.name || asg.technicianName || asg.technicianId;
                            const roleMeta = STAGE_ASSIGNEE_ROLES.find((r) => r.id === asg.role);
                            return (
                              <span
                                key={asg.id || asg.technicianId}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs border font-medium ${
                                  roleMeta?.badgeCls ||
                                  "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                                }`}
                                title={asg.notes ? `ملاحظات: ${asg.notes}` : undefined}
                              >
                                <span className="font-semibold">{techName}</span>
                                <span className="text-[10px] opacity-80">
                                  ({roleMeta ? roleMeta.shortLabel : asg.role})
                                </span>
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span
                          className={
                            s.assigneeName
                              ? "font-semibold text-gray-900 dark:text-gray-100"
                              : "text-gray-400 italic text-xs"
                          }
                        >
                          {s.assigneeName || "غير محدد"}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {renderBadge(STAGE_STATUS_MAP, s.status) ?? (
                        <span className="text-gray-400">{s.status}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-xs font-mono tabular-nums">{fmtDate(s.startedAt)}</td>
                    <td className="py-2.5 px-3 text-xs font-mono tabular-nums">{fmtDate(s.completedAt)}</td>
                    <td className="py-2.5 px-3">
                      {!isDeleted && (
                        <button
                          type="button"
                          onClick={() => onAssignStage(s)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-1"
                          title="إدارة وإسناد الفنيين لهذه المرحلة (يمكن إضافة أكثر من فني)"
                        >
                          <Users className="w-3.5 h-3.5" />
                          {hasAssignees
                            ? `إدارة الفنيين (${s.assignees!.length})`
                            : s.assigneeName
                            ? "إدارة الفني"
                            : "+ تعيين فني"}
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
    </DentalCaseCard>
  );
}
