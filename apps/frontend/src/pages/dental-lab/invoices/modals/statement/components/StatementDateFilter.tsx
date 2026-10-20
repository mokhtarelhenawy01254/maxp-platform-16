import React from "react";

interface StatementDateFilterProps {
  from: string;
  to: string;
  onFromChange: (val: string) => void;
  onToChange: (val: string) => void;
  onClear: () => void;
}

export const StatementDateFilter: React.FC<StatementDateFilterProps> = ({
  from,
  to,
  onFromChange,
  onToChange,
  onClear,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2.5 pb-3 border-b dark:border-gray-800 text-xs print:hidden">
      <span className="font-semibold text-gray-600 dark:text-gray-400">
        الفترة:
      </span>
      <div className="flex items-center gap-1.5">
        <span>من:</span>
        <input
          type="date"
          aria-label="تاريخ البداية"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          className="border dark:border-gray-700 rounded px-2 py-1 text-xs dark:bg-gray-800"
        />
      </div>
      <div className="flex items-center gap-1.5">
        <span>إلى:</span>
        <input
          type="date"
          aria-label="تاريخ النهاية"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          className="border dark:border-gray-700 rounded px-2 py-1 text-xs dark:bg-gray-800"
        />
      </div>
      {(from || to) && (
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          عرض الكل
        </button>
      )}
    </div>
  );
};

export default StatementDateFilter;
