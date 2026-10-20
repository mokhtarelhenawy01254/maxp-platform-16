import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { CASE_STATUSES } from "../../shared";

interface DashboardStatusBreakdownProps {
  byStatus: Record<string, number>;
  totalCases: number;
}

export function DashboardStatusBreakdown({
  byStatus,
  totalCases,
}: DashboardStatusBreakdownProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {t("dentalLab.dashboard.byStatus")}
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono tabular-nums">
          {totalCases} {t("dentalLab.dashboard.totalCases")}
        </span>
      </div>

      <div
        className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden mb-4 flex cursor-pointer"
        title="انقر على أي مرحلة بالأسفل للفلترة"
      >
        {CASE_STATUSES.map((s) => {
          const count = byStatus[s.id] ?? 0;
          if (!count) return null;
          return (
            <div
              key={s.id}
              className="h-full hover:opacity-80 transition-opacity"
              style={{
                width: `${(count / (totalCases || 1)) * 100}%`,
                backgroundColor: s.barColor,
              }}
              onClick={() => navigate(`/dental-lab/cases?status=${s.id}`)}
              title={`${s.label}: ${count}`}
            />
          );
        })}
      </div>

      <div className="space-y-1">
        {CASE_STATUSES.map((s) => {
          const count = byStatus[s.id] ?? 0;
          return (
            <div
              key={s.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/dental-lab/cases?status=${s.id}`)}
              onKeyDown={(e) =>
                (e.key === "Enter" || e.key === " ") &&
                navigate(`/dental-lab/cases?status=${s.id}`)
              }
              className="flex items-center justify-between text-sm px-2.5 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-pointer transition-colors group"
              title={`عرض حالات مرحلة "${s.label}" (${count})`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${s.dotColor}`} />
                <span className="text-gray-600 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 font-medium">
                  {s.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold font-mono tabular-nums text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  {count}
                </span>
                <ArrowLeft className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 group-hover:-translate-x-0.5 transition-all" />
              </div>
            </div>
          );
        })}
        {Object.keys(byStatus).length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {t("dentalLab.common.noData")}
          </p>
        )}
      </div>
    </div>
  );
}

export default DashboardStatusBreakdown;
