import { Plus, Printer, Receipt, X as XMarkIcon } from "lucide-react";
import type { DentalTechnician } from "../../../../shared";

interface TechnicianLedgerModalHeaderProps {
  tech: DentalTechnician;
  onPrint: () => void;
  onAddPayout: () => void;
  onClose: () => void;
}

export function TechnicianLedgerModalHeader({
  tech,
  onPrint,
  onAddPayout,
  onClose,
}: TechnicianLedgerModalHeaderProps) {
  return (
    <>
      <div className="flex items-center justify-between pb-3 border-b dark:border-gray-700 print:hidden">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <div>
            <h3 className="text-lg font-bold">كشف حساب وسجل مستحقات الفني</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {tech.name} — {tech.phone || "بدون هاتف"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onPrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            طباعة كشف الحساب
          </button>
          <button
            onClick={onAddPayout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            صرف جديد / سلفة
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            aria-label="إغلاق"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Printable Header */}
      <div className="hidden print:block mb-6 border-b pb-4 text-right" dir="rtl">
        <h2 className="text-2xl font-bold">سند كشف حساب فني معمل الأسنان</h2>
        <div className="grid grid-cols-2 gap-4 mt-3 text-sm text-gray-600">
          <div>
            <p>
              <span className="font-bold">اسم الفني:</span> {tech.name}
            </p>
            <p>
              <span className="font-bold">التخصص:</span> {tech.role}
            </p>
            <p>
              <span className="font-bold">الهاتف:</span> {tech.phone || "—"}
            </p>
          </div>
          <div className="text-left font-mono" dir="ltr">
            <p>
              <span className="font-bold">تاريخ الطباعة:</span>{" "}
              {new Date().toLocaleDateString("ar-EG")}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
