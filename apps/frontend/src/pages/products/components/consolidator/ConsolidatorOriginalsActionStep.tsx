import React from "react";
import { ORIGINALS_ACTIONS } from "./types";

interface ConsolidatorOriginalsActionStepProps {
  originalsAction: string;
  onSetOriginalsAction: (action: string) => void;
}

export const ConsolidatorOriginalsActionStep: React.FC<ConsolidatorOriginalsActionStepProps> = ({
  originalsAction,
  onSetOriginalsAction,
}) => {
  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
        5. ماذا يحدث للمنتجات الأصلية؟
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {ORIGINALS_ACTIONS.map((action) => (
          <button
            key={action.value}
            type="button"
            onClick={() => onSetOriginalsAction(action.value)}
            className={`border rounded-lg p-3 text-right transition-colors cursor-pointer ${
              originalsAction === action.value
                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300"
            }`}
          >
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {action.label}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {action.hint}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};
