import React from "react";

interface CustomerListStatusTabsProps {
  currentStatus: string;
  onStatusChange: (statusId: string) => void;
}

export const CustomerListStatusTabs: React.FC<CustomerListStatusTabsProps> = ({
  currentStatus,
  onStatusChange,
}) => {
  const tabs = [
    { id: "", label: "الكل" },
    { id: "LEAD", label: "عملاء محتملون" },
    { id: "ACTIVE", label: "نشطون" },
    { id: "INACTIVE", label: "غير نشطين" },
    { id: "BLOCKED", label: "محظورون" },
  ];

  return (
    <div className="bg-zinc-100/80 dark:bg-zinc-800/60 p-1 rounded-lg border border-zinc-200/60 dark:border-zinc-700/50 flex items-center gap-1 overflow-x-auto no-scrollbar">
      {tabs.map((tab) => {
        const isActive = currentStatus === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onStatusChange(tab.id)}
            className={`px-3 py-1 rounded-md text-xs whitespace-nowrap transition-all duration-150 active:scale-[0.97] flex items-center gap-1.5 ${
              isActive
                ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-50 shadow-xs font-semibold"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60 font-medium"
            }`}
          >
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
