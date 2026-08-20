import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Users,
  User,
  ArrowLeft,
} from "lucide-react";

interface Department {
  id: string;
  name: string;
  nameEn: string | null;
  parentId: string | null;
  manager: {
    firstName: string;
    lastName: string;
  } | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  _count: {
    users: number; // ✅ Changed from employees to users (employees are in User table)
    positions: number;
    children: number;
  };
}

interface TreeNodeProps {
  dept: Department;
  allDepartments: Department[];
  level: number;
}

const TreeNode: React.FC<TreeNodeProps> = ({ dept, allDepartments, level }) => {
  const [isOpen, setIsOpen] = React.useState(true);
  const children = allDepartments
    .filter((d) => d.parentId === dept.id)
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return (a.sortOrder || 0) - (b.sortOrder || 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  const hasChildren = children.length > 0;

  return (
    <div className="relative" dir="rtl">
      <div
        className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group ${level === 0
          ? "bg-primary/5 border border-primary/10"
          : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
          }`}
        style={{ marginRight: `${level * 24}px` }}
      >
        {hasChildren && (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        )}
        {!hasChildren && <div className="w-6" />}

        <div
          className={`p-2 rounded-lg ${level === 0 ? "bg-primary text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}
        >
          <Building2 className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-gray-900 dark:text-white truncate">
              {dept.name}
            </h4>
            {dept._count.users > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full font-bold text-gray-500">
                <Users className="h-3 w-3" />
                {dept._count.users}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            {dept.manager ? (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {dept.manager.firstName} {dept.manager.lastName}
              </span>
            ) : (
              <span className="italic">بدون مدير</span>
            )}
          </div>
        </div>
      </div>

      {hasChildren && isOpen && (
        <div className="relative mr-4 pr-4 border-r-2 border-gray-100 dark:border-gray-800 mt-2 space-y-2">
          {children.map((child) => (
            <TreeNode
              key={child.id}
              dept={child}
              allDepartments={allDepartments}
              level={0} // Fixed indenting via relative div
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface HierarchyViewProps {
  departments: Department[];
}

const HierarchyView: React.FC<HierarchyViewProps> = ({ departments }) => {
  const rootDepartments = departments
    .filter((d) => !d.parentId)
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return (a.sortOrder || 0) - (b.sortOrder || 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm min-h-[400px]">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <ArrowLeft className="h-5 w-5 text-primary" />
          الهيكل التنظيمي للأقسام
        </h3>
        <p className="text-sm text-gray-400">إجمالي {departments.length} قسم</p>
      </div>

      {rootDepartments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 italic">
          <Building2 className="h-12 w-12 mb-4 opacity-20" />
          لا يوجد هيكل تنظيمي متاح
        </div>
      ) : (
        <div className="space-y-4 max-w-4xl">
          {rootDepartments.map((root) => (
            <TreeNode
              key={root.id}
              dept={root}
              allDepartments={departments}
              level={0}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HierarchyView;
