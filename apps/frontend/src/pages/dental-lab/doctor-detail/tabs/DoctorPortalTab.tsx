import { toast } from "sonner";
import { Building2, Copy, KeyRound } from "lucide-react";
import { fmtDateTime, fmtMoney } from "../../shared";
import type { DoctorPortalTabProps } from "../types/doctorDetailTypes";

export function DoctorPortalTab({
  doctor,
  onOpenPinDialog,
  onOpenEditModal,
}: DoctorPortalTabProps) {
  const handleCopyPortalLink = () => {
    const url = `${window.location.origin}/dental-portal`;
    navigator.clipboard.writeText(url);
    toast.success("تم نسخ رابط بوابة الأطباء");
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Card 1: Portal Access */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold">
          <KeyRound className="w-5 h-5" />
          <h3>بوابة الأطباء الذاتية (Doctor Portal)</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          تتيح البوابة للدكتور تسجيل ومتابعة طلبات التركيبات مباشرة، رفع ملفات السكانات والأشعة ثلاثية الأبعاد، واستعراض ومراجعة التصاميم.
        </p>

        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-500">حالة البوابة:</span>
            <span
              className={`font-semibold ${
                doctor.hasPortalPin ? "text-emerald-600" : "text-amber-600"
              }`}
            >
              {doctor.hasPortalPin ? "مفعلة ومحمية بـ PIN" : "غير مفعلة (لا يوجد PIN)"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">رقم الهاتف للدخول:</span>
            <span className="font-mono font-bold" dir="ltr">
              {doctor.phone || "غير مسجل"}
            </span>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-2">
          <button
            onClick={onOpenPinDialog}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 flex items-center justify-center gap-2 transition-colors"
          >
            <KeyRound className="w-4 h-4" />
            <span>{doctor.hasPortalPin ? "تغيير رمز الدخول (PIN)" : "تعيين رمز الدخول (PIN)"}</span>
          </button>

          <button
            onClick={handleCopyPortalLink}
            className="px-4 py-2 border dark:border-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center gap-2 transition-colors"
          >
            <Copy className="w-4 h-4" />
            <span>نسخ رابط البوابة</span>
          </button>
        </div>
      </div>

      {/* Card 2: Contact & Registration Details */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold">
          <Building2 className="w-5 h-5" />
          <h3>بيانات الاتصال والعيادة</h3>
        </div>

        <div className="divide-y dark:divide-gray-700 text-sm">
          <div className="py-2.5 flex justify-between">
            <span className="text-gray-500">اسم الطبيب:</span>
            <span className="font-bold text-gray-900 dark:text-gray-100">{doctor.name}</span>
          </div>
          <div className="py-2.5 flex justify-between">
            <span className="text-gray-500">رقم الهاتف:</span>
            <span className="font-mono" dir="ltr">
              {doctor.phone || "—"}
            </span>
          </div>
          <div className="py-2.5 flex justify-between">
            <span className="text-gray-500">اسم العيادة / المركز:</span>
            <span>{doctor.clinicName || "—"}</span>
          </div>
          <div className="py-2.5 flex justify-between">
            <span className="text-gray-500">المحافظة / العنوان:</span>
            <span>{doctor.governorate || "—"}</span>
          </div>
          <div className="py-2.5 flex justify-between">
            <span className="text-gray-500">حد الائتمان المسموح:</span>
            <span className="font-bold font-mono tabular-nums">
              {doctor.creditLimit ? `${fmtMoney(doctor.creditLimit)} ج.م` : "مفتوح"}
            </span>
          </div>
          <div className="py-2.5 flex justify-between">
            <span className="text-gray-500">تاريخ التسجيل:</span>
            <span className="font-mono tabular-nums">
              {doctor.createdAt ? fmtDateTime(doctor.createdAt) : "—"}
            </span>
          </div>
        </div>

        <button
          onClick={onOpenEditModal}
          className="w-full px-4 py-2 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl text-sm font-semibold hover:bg-blue-100 transition-colors"
        >
          تعديل كامل الملف
        </button>
      </div>
    </div>
  );
}

export default DoctorPortalTab;
