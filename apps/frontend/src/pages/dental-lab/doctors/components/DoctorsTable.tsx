import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Archive,
  BadgePercent,
  Banknote,
  Eye,
  Loader2,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { fmtMoney, type DentalLabDoctor, MODAL_INPUT_CLS } from "../../shared";
import type { DoctorsViewMode } from "../types/doctorsTypes";

interface DoctorsTableProps {
  rows: DentalLabDoctor[];
  loading: boolean;
  viewMode: DoctorsViewMode;
  searchInput: string;
  onSearchChange: (value: string) => void;
  removingId: string | null;
  onEdit: (doctor: DentalLabDoctor) => void;
  onBulkPayment: (doctor: DentalLabDoctor) => void;
  onPricing: (doctor: DentalLabDoctor) => void;
  onToggleActive: (doctor: DentalLabDoctor) => void;
  onRemove: (doctor: DentalLabDoctor) => void;
  onRestore: (doctor: DentalLabDoctor) => void;
  onPermanentDelete: (doctor: DentalLabDoctor) => void;
}

export function DoctorsTable({
  rows,
  loading,
  viewMode,
  searchInput,
  onSearchChange,
  removingId,
  onEdit,
  onBulkPayment,
  onPricing,
  onToggleActive,
  onRemove,
  onRestore,
  onPermanentDelete,
}: DoctorsTableProps) {
  const { t } = useTranslation();
  const inputCls = `${MODAL_INPUT_CLS} text-sm`;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <h3 className="font-semibold">
            {viewMode === "ACTIVE"
              ? t("dentalLab.doctors.title")
              : "الأطباء المؤرشفين"}
          </h3>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {t("dentalLab.doctors.ledger.title")}
          </span>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
          <input
            className={`${inputCls} pr-9 w-64`}
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("dentalLab.common.search")}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : rows.length === 0 ? (
        <div className="p-12 text-center text-gray-400 dark:text-gray-500">
          {viewMode === "ACTIVE" ? (
            <>
              <Users className="w-10 h-10 mx-auto mb-3" />
              {t("dentalLab.common.noResults")}
            </>
          ) : (
            <>
              <Archive className="w-10 h-10 mx-auto mb-3 text-gray-400" />
              <p>لا يوجد أطباء في الأرشيف</p>
            </>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300">
                {[
                  t("dentalLab.common.name"),
                  t("dentalLab.common.phone"),
                  t("dentalLab.doctors.clinicName"),
                  t("dentalLab.doctors.governorate"),
                  t("dentalLab.doctors.ledger.billed"),
                  t("dentalLab.doctors.ledger.paid"),
                  t("dentalLab.doctors.ledger.outstanding"),
                  t("dentalLab.doctors.ledger.activeCases"),
                  t("dentalLab.doctors.creditLimit"),
                  t("dentalLab.doctors.ledger.creditStatus"),
                  t("dentalLab.common.status"),
                  t("dentalLab.common.actions"),
                ].map((h) => (
                  <th
                    key={h}
                    className="text-right py-3 px-3 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr
                  key={d.id}
                  className="border-b dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="py-3 px-3 font-bold">
                    <Link
                      to={`/dental-lab/doctors/${d.id}`}
                      className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5"
                      title="عرض صفحة تفاصيل الطبيب"
                    >
                      <span>{d.name}</span>
                    </Link>
                  </td>
                  <td
                    className="py-3 px-3 text-gray-500 dark:text-gray-400 font-mono"
                    dir="ltr"
                  >
                    {d.phone || "—"}
                  </td>
                  <td className="py-3 px-3">
                    <div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {d.clinicName || "—"}
                      </span>
                      {d.doctors && d.doctors.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 mt-0.5">
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium border border-blue-200 dark:border-blue-800">
                            <Users className="w-3 h-3" /> {d.doctors.length} أطباء
                            بالعيادة
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3">{d.governorate || "—"}</td>
                  <td className="py-3 px-3 font-mono tabular-nums">
                    {fmtMoney(d.totalBilled ?? 0)}
                  </td>
                  <td className="py-3 px-3 text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                    {fmtMoney(d.totalPaid ?? 0)}
                  </td>
                  <td
                    className={`py-3 px-3 font-semibold font-mono tabular-nums ${
                      (d.outstanding ?? 0) > 0
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {fmtMoney(d.outstanding ?? 0)}
                  </td>
                  <td className="py-3 px-3 text-gray-600 dark:text-gray-300">
                    <span className="font-mono tabular-nums">{d.activeCases ?? 0}</span>
                    {(d.overdueCases ?? 0) > 0 && (
                      <span className="mr-1 text-xs text-rose-500 font-mono tabular-nums">
                        ({d.overdueCases} {t("dentalLab.doctors.ledger.overdue")})
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono tabular-nums">
                    {d.creditLimit ? fmtMoney(d.creditLimit) : "—"}
                  </td>
                  <td className="py-3 px-3">
                    {d.creditExceeded ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800">
                        {t("dentalLab.doctors.ledger.creditExceeded")}
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border border-green-200 dark:border-green-800">
                        {t("dentalLab.doctors.ledger.creditOk")}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <button
                      onClick={() => onToggleActive(d)}
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                        d.isActive
                          ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800"
                          : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {d.isActive
                        ? t("dentalLab.common.active")
                        : t("dentalLab.common.inactive")}
                    </button>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex gap-1">
                      <Link
                        to={`/dental-lab/doctors/${d.id}`}
                        className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        title="عرض تفاصيل الطبيب"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      {viewMode === "ACTIVE" ? (
                        <>
                          <button
                            onClick={() => onEdit(d)}
                            className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                            title={t("dentalLab.common.edit")}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onBulkPayment(d)}
                            className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg"
                            title="تحصيل دفعة على الحساب"
                          >
                            <Banknote className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onPricing(d)}
                            className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg"
                            title={t("dentalLab.doctors.pricing.title")}
                          >
                            <BadgePercent className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onRemove(d)}
                            disabled={removingId !== null}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg disabled:opacity-40"
                            title="أرشفة / حذف الطبيب"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => onRestore(d)}
                            disabled={removingId !== null}
                            className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg disabled:opacity-40"
                            title="استعادة إلى القائمة النشطة"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onPricing(d)}
                            className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg"
                            title={t("dentalLab.doctors.pricing.title")}
                          >
                            <BadgePercent className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onPermanentDelete(d)}
                            disabled={removingId !== null}
                            className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg disabled:opacity-40"
                            title="حذف نهائي من قاعدة البيانات"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
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

export default DoctorsTable;
