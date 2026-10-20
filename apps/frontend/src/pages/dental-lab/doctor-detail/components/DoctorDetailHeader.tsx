import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  Banknote,
  Building2,
  KeyRound,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
} from "lucide-react";
import type { DentalLabDoctorDetail } from "../../shared";

export interface DoctorDetailHeaderProps {
  doctor: DentalLabDoctorDetail;
  onRefresh: () => void;
  onOpenEditModal: () => void;
  onToggleActive: () => void;
  onOpenBulkPayment: () => void;
  onOpenQuickOrder: () => void;
  whatsappUrl: string | null;
}

export function DoctorDetailHeader({
  doctor,
  onRefresh,
  onOpenEditModal,
  onToggleActive,
  onOpenBulkPayment,
  onOpenQuickOrder,
  whatsappUrl,
}: DoctorDetailHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {/* Top Breadcrumb Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b dark:border-gray-800">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Link
            to="/dental-lab/doctors"
            className="hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 font-medium transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            <span>{t("dentalLab.doctors.title")}</span>
          </Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-gray-100 font-bold truncate max-w-[200px] sm:max-w-none">
            {doctor.name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="p-2 border dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            title={t("dentalLab.common.refresh")}
            aria-label="تحديث"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenEditModal}
            className="flex items-center gap-1.5 px-3 py-1.5 border dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5 text-blue-600" />
            <span>تعديل البيانات</span>
          </button>
        </div>
      </div>

      {/* Hero Header Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center font-bold text-xl sm:text-2xl shadow-md shrink-0">
              {doctor.name.slice(0, 2)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100">
                  {doctor.name}
                </h1>
                <button
                  onClick={onToggleActive}
                  className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border transition-all ${
                    doctor.isActive
                      ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800"
                      : "bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                >
                  {doctor.isActive ? "طبيب نشط" : "مؤرشف / غير نشط"}
                </button>
                {doctor.hasPortalPin ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                    <KeyRound className="w-3 h-3" />
                    بوابة الطبيب مفعلة
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                    البوابة غير مضبوطة
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                {doctor.clinicName && (
                  <span className="flex items-center gap-1">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    {doctor.clinicName}
                  </span>
                )}
                {doctor.governorate && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    {doctor.governorate}
                  </span>
                )}
                {doctor.phone && (
                  <a
                    href={`tel:${doctor.phone}`}
                    className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium font-mono"
                    dir="ltr"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {doctor.phone}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 dark:border-gray-700">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm font-medium hover:bg-emerald-100 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>واتساب</span>
              </a>
            )}

            <button
              onClick={onOpenBulkPayment}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
            >
              <Banknote className="w-4 h-4" />
              <span>تحصيل دفعة</span>
            </button>

            <button
              onClick={onOpenQuickOrder}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>تسجيل حالة جديدة</span>
            </button>
          </div>
        </div>

        {/* Optional Notes banner */}
        {doctor.notes && (
          <div className="mt-4 p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs sm:text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2">
            <span className="font-bold shrink-0">ملاحظات الطبيب:</span>
            <span>{doctor.notes}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default DoctorDetailHeader;
