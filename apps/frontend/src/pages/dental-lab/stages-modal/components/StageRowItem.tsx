import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { type WorkTypeStageTemplateItem, MODAL_INPUT_CLS } from "../../shared";
import { ROLE_OPTIONS } from "../types/stagesModalTypes";

interface StageRowItemProps {
  stage: WorkTypeStageTemplateItem;
  index: number;
  totalStages: number;
  onUpdate: (updates: Partial<WorkTypeStageTemplateItem>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}

export function StageRowItem({
  stage,
  index,
  totalStages,
  onUpdate,
  onMove,
  onRemove,
}: StageRowItemProps) {
  return (
    <div className="bg-white dark:bg-gray-800/80 border dark:border-gray-700/70 rounded-lg p-3 flex flex-col md:flex-row md:items-center gap-3 shadow-xs hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
      {/* Reorder and Index */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-mono font-bold flex items-center justify-center tabular-nums">
          {index + 1}
        </span>
        <div className="flex flex-col">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            className="p-0.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20 transition-colors"
            title="تحريك لأعلى"
            aria-label={`تحريك المرحلة ${index + 1} لأعلى`}
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={index === totalStages - 1}
            onClick={() => onMove(1)}
            className="p-0.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20 transition-colors"
            title="تحريك لأسفل"
            aria-label={`تحريك المرحلة ${index + 1} لأسفل`}
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Stage Name */}
      <div className="flex-1 min-w-[140px]">
        <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
          اسم المرحلة *
        </label>
        <input
          type="text"
          value={stage.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="مثال: التصميم"
          className={`${MODAL_INPUT_CLS} text-sm py-1.5`}
        />
      </div>

      {/* Required Role */}
      <div className="w-full md:w-56 shrink-0">
        <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
          الدور الفني المطلوب (requiredRole)
        </label>
        <select
          value={stage.requiredRole || "GENERAL_TECHNICIAN"}
          onChange={(e) => onUpdate({ requiredRole: e.target.value })}
          className={`${MODAL_INPUT_CLS} text-xs py-1.5`}
        >
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* SLA Hours */}
      <div className="w-24 shrink-0">
        <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
          المدة (SLA س)
        </label>
        <input
          type="number"
          min="1"
          value={stage.slaHours || 24}
          onChange={(e) =>
            onUpdate({ slaHours: Number(e.target.value) || 1 })
          }
          className={`${MODAL_INPUT_CLS} text-xs py-1.5 text-center font-mono tabular-nums`}
        />
      </div>

      {/* Stage Wage */}
      <div className="w-24 shrink-0">
        <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
          أجر المرحلة (ج.م)
        </label>
        <input
          type="number"
          min="0"
          value={stage.stageWage ?? 0}
          onChange={(e) =>
            onUpdate({ stageWage: Number(e.target.value) || 0 })
          }
          placeholder="0"
          className={`${MODAL_INPUT_CLS} text-xs py-1.5 text-center font-mono tabular-nums`}
        />
      </div>

      {/* Required toggle and Delete */}
      <div className="flex items-center gap-2 shrink-0 md:pt-4">
        <label
          className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 cursor-pointer"
          title="مرحلة إلزامية في تسلسل الحالة"
        >
          <input
            type="checkbox"
            checked={stage.isRequired !== false}
            onChange={(e) => onUpdate({ isRequired: e.target.checked })}
            className="rounded border-gray-300 text-blue-600"
          />
          <span className="text-[11px]">إلزامية</span>
        </label>

        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
          title="حذف المرحلة"
          aria-label={`حذف المرحلة ${stage.name || index + 1}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default StageRowItem;
