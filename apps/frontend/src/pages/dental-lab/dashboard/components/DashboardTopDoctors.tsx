import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { type DashboardData, fmtMoney } from "../../shared";

interface DashboardTopDoctorsProps {
  topDoctors: NonNullable<DashboardData["topDoctors"]>;
}

export function DashboardTopDoctors({
  topDoctors,
}: DashboardTopDoctorsProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {t("dentalLab.dashboard.topDoctors")}
        </h3>
        <button
          type="button"
          onClick={() => navigate("/dental-lab/doctors")}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
        >
          عرض جميع الأطباء <ArrowLeft className="w-3 h-3" />
        </button>
      </div>

      {topDoctors.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">
          {t("dentalLab.common.noData")}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-gray-700 text-gray-500 dark:text-gray-300 text-xs">
                <th className="text-right py-2 px-2">
                  {t("dentalLab.dashboard.doctorName")}
                </th>
                <th className="text-center py-2 px-2">
                  {t("dentalLab.dashboard.caseCount")}
                </th>
                <th className="text-left py-2 px-2">
                  {t("dentalLab.dashboard.doctorRevenue")}
                </th>
              </tr>
            </thead>
            <tbody>
              {topDoctors.map((d, i) => (
                <tr
                  key={d.doctorId ?? i}
                  onClick={() => {
                    if (d.doctorId) {
                      navigate(`/dental-lab/doctors/${d.doctorId}`);
                    } else if (d.doctorName) {
                      navigate(
                        `/dental-lab/cases?search=${encodeURIComponent(
                          d.doctorName
                        )}`
                      );
                    }
                  }}
                  className="border-b dark:border-gray-700 last:border-b-0 hover:bg-blue-50/60 dark:hover:bg-blue-950/20 cursor-pointer transition-colors group"
                  title="اضغط لفتح الملف الكامل للطبيب وحالاته"
                >
                  <td className="py-2.5 px-2 font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center gap-1.5">
                    <span>{d.doctorName || "—"}</span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-70 transition-opacity text-blue-500" />
                  </td>
                  <td className="py-2.5 px-2 text-center font-semibold font-mono tabular-nums">
                    {d.count ?? 0}
                  </td>
                  <td className="py-2.5 px-2 text-left font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                    {fmtMoney(d.revenue)} {t("dentalLab.common.egp")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default DashboardTopDoctors;
