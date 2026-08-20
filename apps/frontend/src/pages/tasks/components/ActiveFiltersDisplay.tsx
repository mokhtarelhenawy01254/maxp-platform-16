import React from "react";

export interface ActiveFiltersDisplayProps {
  filters: any;
  setFilters: (filters: any) => void;
  projects: any[];
  categories: any[];
  users: any[];
  formatDate: (date: string) => string;
}

export const ActiveFiltersDisplay: React.FC<ActiveFiltersDisplayProps> = ({
  filters,
  setFilters,
  projects,
  categories,
  users,
  formatDate,
}) => {
  if (!Object.values(filters).some((v) => v)) return null;

  return (
    <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">
            الفلاتر النشطة:
          </span>
          {filters.projectId && (
            <span className="inline-flex items-center px-2 py-1 bg-white dark:bg-gray-800 border border-indigo-300 dark:border-indigo-700 rounded-full text-xs text-indigo-700 dark:text-indigo-300">
              المشروع:{" "}
              {projects.find((p) => p.id === filters.projectId)?.name}
              <button
                onClick={() => setFilters({ ...filters, projectId: "" })}
                className="mr-1 hover:text-indigo-900 dark:hover:text-indigo-200"
              >
                ×
              </button>
            </span>
          )}
          {filters.categoryId && (
            <span className="inline-flex items-center px-2 py-1 bg-white dark:bg-gray-800 border border-indigo-300 dark:border-indigo-700 rounded-full text-xs text-indigo-700 dark:text-indigo-300">
              القسم:{" "}
              {categories.find((c) => c.id === filters.categoryId)?.name}
              <button
                onClick={() => setFilters({ ...filters, categoryId: "" })}
                className="mr-1 hover:text-indigo-900"
              >
                ×
              </button>
            </span>
          )}
          {filters.status && (
            <span className="inline-flex items-center px-2 py-1 bg-white dark:bg-gray-800 border border-indigo-300 dark:border-indigo-700 rounded-full text-xs text-indigo-700 dark:text-indigo-300">
              الحالة:{" "}
              {filters.status === "pending"
                ? "في الانتظار"
                : filters.status === "in_progress"
                  ? "قيد التنفيذ"
                  : filters.status === "completed"
                    ? "مكتمل"
                    : "ملغي"}
              <button
                onClick={() => setFilters({ ...filters, status: "" })}
                className="mr-1 hover:text-indigo-900"
              >
                ×
              </button>
            </span>
          )}
          {filters.priority && (
            <span className="inline-flex items-center px-2 py-1 bg-white dark:bg-gray-800 border border-indigo-300 dark:border-indigo-700 rounded-full text-xs text-indigo-700 dark:text-indigo-300">
              الأولوية:{" "}
              {filters.priority === "urgent"
                ? "عاجل"
                : filters.priority === "high"
                  ? "عالي"
                  : filters.priority === "medium"
                    ? "متوسط"
                    : "منخفض"}
              <button
                onClick={() => setFilters({ ...filters, priority: "" })}
                className="mr-1 hover:text-indigo-900"
              >
                ×
              </button>
            </span>
          )}
          {filters.assignedTo && (
            <span className="inline-flex items-center px-2 py-1 bg-white dark:bg-gray-800 border border-indigo-300 dark:border-indigo-700 rounded-full text-xs text-indigo-700 dark:text-indigo-300">
              المسؤول:{" "}
              {users.find((u) => u.id === filters.assignedTo)?.firstName}
              <button
                onClick={() => setFilters({ ...filters, assignedTo: "" })}
                className="mr-1 hover:text-indigo-900"
              >
                ×
              </button>
            </span>
          )}
          {(filters.dueDateFrom || filters.dueDateTo) && (
            <span className="inline-flex items-center px-2 py-1 bg-white dark:bg-gray-800 border border-indigo-300 dark:border-indigo-700 rounded-full text-xs text-indigo-700 dark:text-indigo-300">
              التاريخ: {filters.dueDateFrom || "..."} -{" "}
              {filters.dueDateTo || "..."}
              <button
                onClick={() =>
                  setFilters({
                    ...filters,
                    dueDateFrom: "",
                    dueDateTo: "",
                  })
                }
                className="mr-1 hover:text-indigo-900"
              >
                ×
              </button>
            </span>
          )}
        </div>
        <button
          onClick={() => {
            setFilters({
              projectId: "",
              categoryId: "",
              status: "",
              priority: "",
              assignedTo: "",
              dueDateFrom: "",
              dueDateTo: "",
            });
          }}
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
        >
          مسح الكل
        </button>
      </div>
    </div>
  );
};
