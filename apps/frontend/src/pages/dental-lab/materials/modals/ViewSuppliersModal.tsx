import { Building2, MapPin, Phone, Plus, User, X } from "lucide-react";
import { fmtMoney, MODAL_CONTENT_CLS } from "../../shared";
import type { ViewSuppliersModalProps } from "../types/materialsTypes";

export function ViewSuppliersModal({
  isOpen,
  onClose,
  suppliers,
  onOpenAddSupplier,
}: ViewSuppliersModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className={`${MODAL_CONTENT_CLS} max-w-xl!`}>
        <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700 mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              <span>الشركات والموردين المعتمدين ({suppliers.length})</span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              قائمة الموردين المعتمدين لتوريد خامات وأقراص ومستهلكات المعمل
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {suppliers.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-xs">
              <Building2 className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="font-semibold">لا يوجد موردين مسجلين بعد</p>
              <p className="mt-1">
                يمكنك إضافة أول شركة توريد لتسجيل أقراص وخامات المعمل باسمها.
              </p>
            </div>
          ) : (
            suppliers.map((s) => (
              <div
                key={s.id}
                className="p-3 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700/80 rounded-xl flex items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span>{s.name}</span>
                    {s.city && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 flex items-center gap-1 font-normal">
                        <MapPin className="w-3 h-3" />
                        {s.city}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-gray-500 dark:text-gray-400 text-[11px]">
                    {s.contactPerson && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-gray-400" />
                        {s.contactPerson}
                      </span>
                    )}
                    {s.phone && (
                      <span className="flex items-center gap-1 dir-ltr font-mono">
                        <Phone className="w-3 h-3 text-gray-400" />
                        {s.phone}
                      </span>
                    )}
                  </div>
                </div>

                {s.currentBalance !== undefined && Number(s.currentBalance) !== 0 && (
                  <div className="text-left shrink-0">
                    <span className="text-[10px] text-gray-400 block">الرصيد</span>
                    <span
                      className={`font-bold font-mono tabular-nums ${
                        Number(s.currentBalance) > 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {fmtMoney(Number(s.currentBalance))}
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
          <button
            type="button"
            onClick={onOpenAddSupplier}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ مورد / شركة جديدة</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-semibold cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

export default ViewSuppliersModal;
