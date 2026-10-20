import { fmtMoney, PRIORITY_CONFIG, type DentalTechnician, type DentalWorkType } from "../../../../shared";
import type { DentalDoctor } from "../../../types/quickOrderTypes";

interface QuickOrderSummaryPricingCardProps {
  selectedDoctor: DentalDoctor | null;
  primaryWorkType: DentalWorkType | null;
  selectedTeeth: string[];
  unitsCount: number;
  shade: string;
  customShade: string;
  priceSnapshot: number;
  discount: number;
  priority: "NORMAL" | "URGENT" | "STAT";
  dueDate: string;
  technicians: DentalTechnician[];
  selectedTechnicianId: string;
}

export function QuickOrderSummaryPricingCard({
  selectedDoctor,
  primaryWorkType,
  selectedTeeth,
  unitsCount,
  shade,
  customShade,
  priceSnapshot,
  discount,
  priority,
  dueDate,
  technicians,
  selectedTechnicianId,
}: QuickOrderSummaryPricingCardProps) {
  const netTotal = Math.max(0, (Number(priceSnapshot) || 0) - (Number(discount) || 0));

  return (
    <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 p-3.5 space-y-2 text-xs">
      <div className="font-bold text-blue-900 dark:text-blue-100 flex items-center justify-between border-b border-blue-200/60 dark:border-blue-800/60 pb-1.5">
        <span>ملخص أمر الشغل النهائي</span>
        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold text-sm tabular-nums">
          صافي الإجمالي: {fmtMoney(netTotal)} ج.م
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-gray-700 dark:text-gray-300">
        <div>
          <span className="text-gray-400">الطبيب: </span>
          {selectedDoctor?.name || "—"}
        </div>
        <div>
          <span className="text-gray-400">الخدمة: </span>
          {primaryWorkType?.name || "—"}
        </div>
        <div>
          <span className="text-gray-400">الأسنان: </span>
          {selectedTeeth.length > 0 ? selectedTeeth.join(", ") : "—"}
        </div>
        <div>
          <span className="text-gray-400">عدد الوحدات: </span>
          <span className="font-mono tabular-nums">{unitsCount}</span>
        </div>
        <div>
          <span className="text-gray-400">اللون: </span>
          {customShade || shade || "غير محدد"}
        </div>
        <div>
          <span className="text-gray-400">الخصم: </span>
          <span className="font-mono tabular-nums">{fmtMoney(discount)} ج.م</span>
        </div>
        <div>
          <span className="text-gray-400">الأولوية: </span>
          {PRIORITY_CONFIG[priority]?.label || priority}
        </div>
        <div>
          <span className="text-gray-400">تاريخ التسليم: </span>
          <span className="font-mono tabular-nums">{dueDate || "غير محدد"}</span>
        </div>
        <div>
          <span className="text-gray-400">الفني المسند: </span>
          {technicians.find((t) => t.id === selectedTechnicianId)?.name || "غير مسند"}
        </div>
      </div>
    </div>
  );
}
