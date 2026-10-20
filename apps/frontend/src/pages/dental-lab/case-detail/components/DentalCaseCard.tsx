import type { ReactNode } from "react";

interface DentalCaseCardProps {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}

export default function DentalCaseCard({
  title,
  icon,
  action,
  children,
}: DentalCaseCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b dark:border-gray-700">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          {icon ? <span className="text-blue-600 dark:text-blue-400">{icon}</span> : null}
          {title}
        </h3>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
