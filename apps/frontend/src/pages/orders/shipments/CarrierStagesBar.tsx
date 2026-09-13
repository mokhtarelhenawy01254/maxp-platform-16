import React from "react";
import { PlusCircleIcon } from "@heroicons/react/24/outline";

export interface StageDefinition {
  key: string;
  label: string;
  countKey?: string;
  badgeColor?: string;
  icon?: React.ElementType;
}

// Exactly matching the 12 stages from Turbo Express Dashboard photo provided by the user
export const TURBO_STAGES: StageDefinition[] = [
  { key: "incomplete", label: "غير مكتملة", countKey: "incomplete", badgeColor: "border-amber-400 text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30" },
  { key: "turbo_sent", label: "قيد الإنتظار", countKey: "turbo_sent", badgeColor: "border-blue-400 text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30" },
  { key: "processing", label: "قيد التنفيذ", countKey: "processing", badgeColor: "border-purple-400 text-purple-800 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/30" },
  { key: "out_for_delivery", label: "مسلمة للمندوب", countKey: "out_for_delivery", badgeColor: "border-indigo-400 text-indigo-800 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/30" },
  { key: "delayed", label: "مؤجلة مع المندوب", countKey: "delayed", badgeColor: "border-yellow-400 text-yellow-800 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-950/30" },
  { key: "delivered", label: "تم التسليم", countKey: "delivered", badgeColor: "border-emerald-400 text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30" },
  { key: "returned_to_company", label: "مرتجعات في الشركة", countKey: "returned_to_company", badgeColor: "border-rose-400 text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/30" },
  { key: "returned_destroyed", label: "مرتجعات معدومة", countKey: "returned_destroyed", badgeColor: "border-red-500 text-red-800 dark:text-red-300 bg-red-50 dark:bg-red-950/30" },
  { key: "returned_missing", label: "مرتجعات مفقودة", countKey: "returned_missing", badgeColor: "border-orange-400 text-orange-800 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/30" },
  { key: "returned_resent", label: "معاد ارسالها", countKey: "returned_resent", badgeColor: "border-cyan-400 text-cyan-800 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/30" },
  { key: "remitted", label: "تم التوريد", countKey: "remitted", badgeColor: "border-green-500 text-green-800 dark:text-green-300 bg-green-50 dark:bg-green-950/30" },
  { key: "returned_received", label: "مرتجعات وصلتني", countKey: "returned_received", badgeColor: "border-violet-400 text-violet-800 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/30" },
];

export const GENERIC_STAGES: StageDefinition[] = [
  { key: "ALL", label: "جميع الحالات" },
  { key: "PENDING", label: "بانتظار الشحن" },
  { key: "CREATED", label: "تم إنشاء الشحنة" },
  { key: "IN_TRANSIT", label: "قيد التوصيل" },
  { key: "OUT_FOR_DELIVERY", label: "خرج للتوصيل" },
  { key: "delayed", label: "مؤجلة مع المندوب" },
  { key: "DELIVERED", label: "تم التسليم" },
  { key: "RETURNED", label: "مرتجع" },
  { key: "CANCELLED", label: "ملغي" },
];

interface CarrierStagesBarProps {
  carrierType?: string;
  selectedStage: string;
  onSelectStage: (stageKey: string) => void;
  stageCounts?: Record<string, number>;
  onOpenCreateShipment: () => void;
}

export const CarrierStagesBar: React.FC<CarrierStagesBarProps> = ({
  carrierType,
  selectedStage,
  onSelectStage,
  stageCounts = {},
  onOpenCreateShipment,
}) => {
  const isTurbo = carrierType?.toUpperCase() === "TURBO";
  const stages = isTurbo ? TURBO_STAGES : GENERIC_STAGES;

  return (
    <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 no-scrollbar">
      <div className="flex items-center gap-1.5 flex-nowrap">
        {/* Quick Action: Add Shipment */}
        <button
          type="button"
          onClick={onOpenCreateShipment}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition whitespace-nowrap active:scale-95"
          title="إضافة وتوجيه شحنة لشركة الشحن"
        >
          <PlusCircleIcon className="h-4 w-4" />
          <span>إضافة شحنة</span>
        </button>

        {/* "All" Stage Option for Turbo */}
        {isTurbo && (
          <button
            type="button"
            onClick={() => onSelectStage("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedStage === "ALL"
                ? "bg-foreground text-background font-semibold shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            <span>كل الشحنات</span>
            {stageCounts["all"] !== undefined && (
              <span className="font-mono text-[11px] tabular-nums opacity-80">
                ({stageCounts["all"]})
              </span>
            )}
          </button>
        )}

        {/* Dynamic Stage Buttons */}
        {stages.map((stage) => {
          const isSelected = selectedStage === stage.key;
          const count = stage.countKey ? stageCounts[stage.countKey] : stageCounts[stage.key];

          return (
            <button
              key={stage.key}
              type="button"
              onClick={() => onSelectStage(stage.key)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                isSelected
                  ? "border-primary bg-primary/10 text-primary font-bold ring-1 ring-primary/40 shadow-xs"
                  : "border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <span>{stage.label}</span>
              {count !== undefined && count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono tabular-nums font-semibold ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
