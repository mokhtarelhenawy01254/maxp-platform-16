import React from "react";
import { Link } from "react-router-dom";
import type { DentalCaseStatusConfig } from "../../../../shared";

export interface DentalCasesKanbanColumnHeaderProps {
  stage: DentalCaseStatusConfig;
  count: number;
  applyFilter: (key: string, value: string, resetOthers?: boolean) => void;
}

export const DentalCasesKanbanColumnHeader: React.FC<DentalCasesKanbanColumnHeaderProps> = ({
  stage,
  count,
  applyFilter,
}) => {
  return (
    <div className="p-3.5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800 rounded-t-2xl">
      <div className="flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full ${stage.dotColor}`} />
        <Link
          to={`/dental-lab/cases?status=${stage.id}`}
          onClick={(e) => {
            e.stopPropagation();
            applyFilter("status", stage.id, true);
          }}
          className="font-bold text-sm text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer transition-colors"
          title={`عرض كل حالات مرحلة "${stage.label}" فقط`}
        >
          {stage.label}
        </Link>
      </div>
      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-mono tabular-nums">
        {count}
      </span>
    </div>
  );
};
