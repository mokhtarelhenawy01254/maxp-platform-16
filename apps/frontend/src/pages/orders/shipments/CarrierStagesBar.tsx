import React from "react";
import {
  PlusCircleIcon,
  ArrowPathIcon,
  Squares2X2Icon,
  ClockIcon,
  TruckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowUturnLeftIcon,
  TrashIcon,
  QuestionMarkCircleIcon,
  ArrowPathRoundedSquareIcon,
  BanknotesIcon,
  InboxArrowDownIcon,
  XCircleIcon,
  DocumentMinusIcon,
} from "@heroicons/react/24/outline";

export interface StageDefinition {
  key: string;
  label: string;
  countKey?: string;
  inactiveStyle: string;
  badgeStyle: string;
  activeStyle: string;
  icon: React.ElementType;
}

// Complete 14 Operational Stages matching Turbo Express & Multi-Carrier Operations
export const ALL_OPERATIONAL_STAGES: StageDefinition[] = [
  {
    key: "ALL",
    label: "كل الشحنات",
    countKey: "all",
    inactiveStyle: "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-850 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800",
    badgeStyle: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
    activeStyle: "border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900 ring-2 ring-gray-900/30 shadow-sm",
    icon: Squares2X2Icon,
  },
  {
    key: "incomplete",
    label: "غير مكتملة",
    countKey: "incomplete",
    inactiveStyle: "border-amber-300 dark:border-amber-700/80 bg-amber-50/80 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 hover:bg-amber-100/70",
    badgeStyle: "bg-amber-200/80 text-amber-900 dark:bg-amber-900/70 dark:text-amber-200",
    activeStyle: "border-amber-500 bg-amber-500 text-white ring-2 ring-amber-500/40 shadow-sm",
    icon: DocumentMinusIcon,
  },
  {
    key: "turbo_sent",
    label: "قيد الإنتظار",
    countKey: "turbo_sent",
    inactiveStyle: "border-blue-300 dark:border-blue-700/80 bg-blue-50/80 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 hover:bg-blue-100/70",
    badgeStyle: "bg-blue-200/80 text-blue-900 dark:bg-blue-900/70 dark:text-blue-200",
    activeStyle: "border-blue-600 bg-blue-600 text-white ring-2 ring-blue-500/40 shadow-sm",
    icon: ClockIcon,
  },
  {
    key: "processing",
    label: "قيد التنفيذ",
    countKey: "processing",
    inactiveStyle: "border-purple-300 dark:border-purple-700/80 bg-purple-50/80 dark:bg-purple-950/30 text-purple-900 dark:text-purple-200 hover:bg-purple-100/70",
    badgeStyle: "bg-purple-200/80 text-purple-900 dark:bg-purple-900/70 dark:text-purple-200",
    activeStyle: "border-purple-600 bg-purple-600 text-white ring-2 ring-purple-500/40 shadow-sm",
    icon: ArrowPathIcon,
  },
  {
    key: "out_for_delivery",
    label: "مسلمة للمندوب",
    countKey: "out_for_delivery",
    inactiveStyle: "border-indigo-300 dark:border-indigo-700/80 bg-indigo-50/80 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 hover:bg-indigo-100/70",
    badgeStyle: "bg-indigo-200/80 text-indigo-900 dark:bg-indigo-900/70 dark:text-indigo-200",
    activeStyle: "border-indigo-600 bg-indigo-600 text-white ring-2 ring-indigo-500/40 shadow-sm",
    icon: TruckIcon,
  },
  {
    key: "delayed",
    label: "مؤجلة مع المندوب",
    countKey: "delayed",
    inactiveStyle: "border-yellow-400 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-950/40 text-yellow-950 dark:text-yellow-200 hover:bg-yellow-100/80 font-bold",
    badgeStyle: "bg-yellow-200 text-yellow-950 dark:bg-yellow-900/80 dark:text-yellow-200",
    activeStyle: "border-yellow-500 bg-yellow-500 text-gray-950 ring-2 ring-yellow-500/40 shadow-sm",
    icon: ExclamationTriangleIcon,
  },
  {
    key: "delivered",
    label: "تم التسليم",
    countKey: "delivered",
    inactiveStyle: "border-emerald-300 dark:border-emerald-700/80 bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100/70 font-semibold",
    badgeStyle: "bg-emerald-200/80 text-emerald-900 dark:bg-emerald-900/70 dark:text-emerald-200",
    activeStyle: "border-emerald-600 bg-emerald-600 text-white ring-2 ring-emerald-500/40 shadow-sm",
    icon: CheckCircleIcon,
  },
  {
    key: "returned_to_company",
    label: "مرتجعات في الشركة",
    countKey: "returned_to_company",
    inactiveStyle: "border-rose-300 dark:border-rose-700/80 bg-rose-50/80 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 hover:bg-rose-100/70 font-semibold",
    badgeStyle: "bg-rose-200/80 text-rose-900 dark:bg-rose-900/70 dark:text-rose-200",
    activeStyle: "border-rose-600 bg-rose-600 text-white ring-2 ring-rose-500/40 shadow-sm",
    icon: ArrowUturnLeftIcon,
  },
  {
    key: "returned_destroyed",
    label: "مرتجعات معدومة",
    countKey: "returned_destroyed",
    inactiveStyle: "border-red-400 dark:border-red-700/80 bg-red-50/80 dark:bg-red-950/30 text-red-900 dark:text-red-200 hover:bg-red-100/70",
    badgeStyle: "bg-red-200/80 text-red-900 dark:bg-red-900/70 dark:text-red-200",
    activeStyle: "border-red-600 bg-red-600 text-white ring-2 ring-red-500/40 shadow-sm",
    icon: TrashIcon,
  },
  {
    key: "returned_missing",
    label: "مرتجعات مفقودة",
    countKey: "returned_missing",
    inactiveStyle: "border-orange-300 dark:border-orange-700/80 bg-orange-50/80 dark:bg-orange-950/30 text-orange-900 dark:text-orange-200 hover:bg-orange-100/70",
    badgeStyle: "bg-orange-200/80 text-orange-900 dark:bg-orange-900/70 dark:text-orange-200",
    activeStyle: "border-orange-500 bg-orange-500 text-white ring-2 ring-orange-500/40 shadow-sm",
    icon: QuestionMarkCircleIcon,
  },
  {
    key: "returned_resent",
    label: "معاد ارسالها",
    countKey: "returned_resent",
    inactiveStyle: "border-cyan-300 dark:border-cyan-700/80 bg-cyan-50/80 dark:bg-cyan-950/30 text-cyan-900 dark:text-cyan-200 hover:bg-cyan-100/70",
    badgeStyle: "bg-cyan-200/80 text-cyan-900 dark:bg-cyan-900/70 dark:text-cyan-200",
    activeStyle: "border-cyan-600 bg-cyan-600 text-white ring-2 ring-cyan-500/40 shadow-sm",
    icon: ArrowPathRoundedSquareIcon,
  },
  {
    key: "remitted",
    label: "تم التوريد",
    countKey: "remitted",
    inactiveStyle: "border-green-400 dark:border-green-700/80 bg-green-100/80 dark:bg-green-950/50 text-green-950 dark:text-green-200 hover:bg-green-200/80 font-bold",
    badgeStyle: "bg-green-300/80 text-green-950 dark:bg-green-900/80 dark:text-green-200",
    activeStyle: "border-green-600 bg-green-600 text-white ring-2 ring-green-500/40 shadow-sm",
    icon: BanknotesIcon,
  },
  {
    key: "returned_received",
    label: "مرتجعات وصلتني",
    countKey: "returned_received",
    inactiveStyle: "border-violet-300 dark:border-violet-700/80 bg-violet-50/80 dark:bg-violet-950/30 text-violet-900 dark:text-violet-200 hover:bg-violet-100/70 font-semibold",
    badgeStyle: "bg-violet-200/80 text-violet-900 dark:bg-violet-900/70 dark:text-violet-200",
    activeStyle: "border-violet-600 bg-violet-600 text-white ring-2 ring-violet-500/40 shadow-sm",
    icon: InboxArrowDownIcon,
  },
  {
    key: "cancelled",
    label: "ملغي",
    countKey: "cancelled",
    inactiveStyle: "border-slate-300 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200/80",
    badgeStyle: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200",
    activeStyle: "border-slate-700 bg-slate-700 text-white ring-2 ring-slate-500/40 shadow-sm",
    icon: XCircleIcon,
  },
];

interface CarrierStagesBarProps {
  carrierType?: string;
  selectedStage: string;
  onSelectStage: (stageKey: string) => void;
  stageCounts?: Record<string, number>;
  onOpenCreateShipment: () => void;
  onLiveSync?: () => void;
  isLiveSyncing?: boolean;
}

export const CarrierStagesBar: React.FC<CarrierStagesBarProps> = ({
  selectedStage,
  onSelectStage,
  stageCounts = {},
  onOpenCreateShipment,
  onLiveSync,
  isLiveSyncing = false,
}) => {
  return (
    <div className="w-full space-y-2.5 pb-1">
      {/* Top Controls: Quick Actions + Status Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
            <Squares2X2Icon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>حالات ومراحل الشحنات التشغيلية</span>
          </span>
          <span className="text-[11px] text-gray-400 dark:text-gray-500 hidden sm:inline">
            (تصفية فورية حسب مرحلة التوصيل في شركة الشحن)
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Quick Action: Live Sync */}
          {onLiveSync && (
            <button
              type="button"
              onClick={onLiveSync}
              disabled={isLiveSyncing}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition active:scale-95 disabled:opacity-50"
              title="تحديث ومزامنة الحالات الحية لجميع الشحنات من شركة الشحن"
            >
              <ArrowPathIcon className={`h-3.5 w-3.5 ${isLiveSyncing ? "animate-spin" : ""}`} />
              <span>{isLiveSyncing ? "جاري التحديث..." : "مزامنة سريعة"}</span>
            </button>
          )}

          {/* Quick Action: Add Shipment */}
          <button
            type="button"
            onClick={onOpenCreateShipment}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95"
            title="إضافة وتوجيه شحنة لشركة الشحن"
          >
            <PlusCircleIcon className="h-3.5 w-3.5" />
            <span>إضافة شحنة</span>
          </button>
        </div>
      </div>

      {/* Complete Stages Ribbon (Wrapped, High-Visibility, Color-Coded) */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {ALL_OPERATIONAL_STAGES.map((stage) => {
          const isSelected = selectedStage === stage.key;
          const count = stage.countKey ? stageCounts[stage.countKey] : stageCounts[stage.key];
          const displayCount = count !== undefined ? count : 0;
          const IconComp = stage.icon;

          return (
            <button
              key={stage.key}
              type="button"
              onClick={() => onSelectStage(stage.key)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 border active:scale-95 ${
                isSelected
                  ? stage.activeStyle
                  : `${stage.inactiveStyle} border`
              }`}
            >
              <IconComp className={`h-3.5 w-3.5 shrink-0 ${isSelected ? "text-white dark:text-gray-900" : "opacity-80"}`} />
              <span className="font-semibold whitespace-nowrap">{stage.label}</span>

              {/* High-visibility Counter Badge */}
              <span
                className={`font-mono text-[11px] tabular-nums px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected
                    ? "bg-white/25 text-white dark:bg-black/20 dark:text-gray-900"
                    : stage.badgeStyle
                }`}
              >
                {displayCount}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
