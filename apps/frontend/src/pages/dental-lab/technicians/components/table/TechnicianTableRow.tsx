import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Palmtree,
  Pencil,
  Plus,
  Receipt,
  ShieldCheck,
  Trash2,
  Wallet,
} from "lucide-react";
import {
  fmtMoney,
  isTechnicianOnVacation,
  ROLE_CONFIG,
  type DentalTechnician,
  type TeamMember,
} from "../../../shared";

export interface TechnicianTableRowProps {
  x: DentalTechnician;
  rows: DentalTechnician[];
  wageDefault: number;
  removingId: string | null;
  team: TeamMember[];
  onOpenEdit: (tech: DentalTechnician) => void;
  onRemove: (tech: DentalTechnician) => void;
  onToggleActive: (tech: DentalTechnician) => void;
  onOpenPayout: (tech: DentalTechnician) => void;
  onOpenLedger: (tech: DentalTechnician) => void;
}

export const TechnicianTableRow: React.FC<TechnicianTableRowProps> = ({
  x,
  rows,
  wageDefault,
  removingId,
  team,
  onOpenEdit,
  onRemove,
  onToggleActive,
  onOpenPayout,
  onOpenLedger,
}) => {
  const { t } = useTranslation();

  const roleBadge = (role: string) => {
    const cleanRole = String(role || "")
      .replace(/\s*\/\s*(Master|QC)\s*$/i, "")
      .trim();
    const meta = ROLE_CONFIG[cleanRole] || ROLE_CONFIG[role];
    if (!meta) {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
          {cleanRole}
        </span>
      );
    }
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${meta.color}`}>
        {meta.label}
      </span>
    );
  };

  const teamName = (userId?: string) => {
    if (!userId) return "—";
    const m = team.find((mm) => mm.userId === userId);
    return m ? m.name || m.email || userId : userId;
  };

  const vac = isTechnicianOnVacation(x);

  return (
    <tr
      key={x.id}
      className="border-b dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700"
    >
      <td className="py-3 px-3 font-medium text-gray-900 dark:text-gray-100">
        <Link
          to={`/dental-lab/cases?technicianId=${x.id}`}
          className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer"
          title="عرض كل حالات هذا الفني فقط"
        >
          {x.name}
        </Link>
      </td>
      <td className="py-3 px-3 text-xs text-gray-600 dark:text-gray-300 font-mono" dir="ltr">
        {x.phone || "—"}
      </td>
      <td className="py-3 px-3">{roleBadge(x.role)}</td>
      <td className="py-3 px-3 text-xs">
        <div className="font-mono tabular-nums text-gray-800 dark:text-gray-200">
          {Array.isArray(x.workingDays) && x.workingDays.length > 0
            ? `${x.workingDays.length} أيام عمل`
            : "6 أيام (افتراضي)"}
        </div>
        <div className="text-[11px] text-gray-400 mt-0.5 font-mono tabular-nums">
          {x.dailyCap && x.dailyCap > 0 ? `سقف: ${x.dailyCap} حالة/يوم` : "سقف مفتوح"}
        </div>
        {vac.onVacation && vac.vacation && (
          <div
            className="inline-flex items-center gap-1 mt-1 text-[11px] font-medium text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded px-1.5 py-0.5"
            title={
              vac.vacation.reason
                ? `السبب: ${vac.vacation.reason}`
                : `في إجازة حتى ${vac.vacation.endDate}`
            }
          >
            <Palmtree className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="font-mono tabular-nums">في إجازة حتى {vac.vacation.endDate}</span>
          </div>
        )}
        {!vac.onVacation && vac.upcomingCount > 0 && (
          <div
            className="inline-flex items-center gap-1 mt-0.5 text-[10px] text-amber-700/90 dark:text-amber-400/90 font-mono tabular-nums"
            title={`${vac.upcomingCount} فترة إجازة قادمة مسجلة`}
          >
            <Palmtree className="w-2.5 h-2.5 shrink-0" />
            <span>{vac.upcomingCount} إجازة مجدولة</span>
          </div>
        )}
      </td>
      <td className="py-3 px-3 text-xs">
        {x.backupTechnicianName ||
        (x.backupTechnicianId &&
          rows.find((r) => r.id === x.backupTechnicianId)?.name) ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
            {x.backupTechnicianName ||
              rows.find((r) => r.id === x.backupTechnicianId)?.name}
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
      <td className="py-3 px-3">
        {x.wagePerStage != null ? (
          <span className="font-semibold text-gray-800 dark:text-gray-200 font-mono tabular-nums">
            {fmtMoney(x.wagePerStage)} ج.م
          </span>
        ) : (
          <span className="text-xs text-gray-400 font-mono tabular-nums">
            افتراضي ({fmtMoney(wageDefault)} ج.م)
          </span>
        )}
      </td>
      <td className="py-3 px-3 font-mono font-medium text-blue-600 dark:text-blue-400 tabular-nums">
        {x.completedStages ?? 0}
      </td>
      <td className="py-3 px-3 font-semibold text-blue-600 dark:text-blue-400">
        <div className="font-mono tabular-nums">{fmtMoney(x.totalEarnings)} ج.م</div>
        {Number(x.totalBonuses) > 0 || Number(x.totalDeductions) > 0 ? (
          <div className="text-[11px] font-normal flex items-center gap-1 mt-0.5 font-mono tabular-nums">
            {Number(x.totalBonuses) > 0 && (
              <span className="text-emerald-600 dark:text-emerald-400">
                +{fmtMoney(x.totalBonuses)}
              </span>
            )}
            {Number(x.totalDeductions) > 0 && (
              <span className="text-red-600 dark:text-red-400">
                -{fmtMoney(x.totalDeductions)}
              </span>
            )}
          </div>
        ) : null}
      </td>
      <td className="py-3 px-3 font-semibold text-purple-600 dark:text-purple-400 font-mono tabular-nums">
        {fmtMoney(x.totalPaid ?? 0)} ج.م
      </td>
      <td
        className={`py-3 px-3 font-bold font-mono tabular-nums ${
          (x.balanceDue ?? 0) > 0
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-gray-600 dark:text-gray-300"
        }`}
      >
        {fmtMoney(x.balanceDue ?? 0)} ج.م
      </td>
      <td className="py-3 px-3 text-xs">
        {x.userEmail ||
        x.user?.email ||
        (x.userId && teamName(x.userId) !== "—") ? (
          <div className="inline-flex items-center gap-1.5 font-mono text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span
              className="truncate max-w-[170px]"
              title={x.userEmail || x.user?.email || teamName(x.userId)}
            >
              {x.userEmail || x.user?.email || teamName(x.userId)}
            </span>
          </div>
        ) : (
          <button
            onClick={() => onOpenEdit(x)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 hover:bg-amber-100"
            title="اضغط لإنشاء أو ربط حساب المنصة"
          >
            <Plus className="w-3 h-3" />
            <span>إنشاء حساب دخول</span>
          </button>
        )}
      </td>
      <td className="py-3 px-3">
        <button
          onClick={() => onToggleActive(x)}
          className={`text-xs px-2 py-0.5 rounded-full border ${
            x.isActive
              ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800"
              : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"
          }`}
        >
          {x.isActive ? t("dentalLab.common.active") : t("dentalLab.common.inactive")}
        </button>
      </td>
      <td className="py-3 px-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onOpenPayout(x)}
            className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
            title="صرف مستحقات / سلفة"
          >
            <Wallet className="w-4 h-4" />
          </button>
          <button
            onClick={() => onOpenLedger(x)}
            className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
            title="كشف حساب وسجل السندات"
          >
            <Receipt className="w-4 h-4" />
          </button>
          <button
            onClick={() => onOpenEdit(x)}
            className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title={String(t("dentalLab.common.edit"))}
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => onRemove(x)}
            disabled={removingId !== null}
            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg disabled:opacity-40 transition-colors"
            title={String(t("dentalLab.common.delete"))}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default TechnicianTableRow;
