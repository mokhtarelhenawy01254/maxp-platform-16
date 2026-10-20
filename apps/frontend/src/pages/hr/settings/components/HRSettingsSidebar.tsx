import React, { useMemo } from "react";
import {
  Clock,
  Calendar,
  DollarSign,
  Gift,
  Users,
  AlertTriangle,
  Briefcase,
  FileText,
  Home,
  Lock,
  Bell,
  Search,
  X,
} from "lucide-react";
import { Input } from "../../../../components/ui/input";
import type { TabDefinition } from "../types/hrSettingsTypes";

interface HRSettingsSidebarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const hrSettingsTabs: TabDefinition[] = [
  {
    id: "working-hours",
    label: "ساعات العمل",
    icon: Clock,
    description: "إدارة جدول العمل الأسبوعي",
    keywords: "ساعات عمل جدول أسبوع",
  },
  {
    id: "leaves",
    label: "الإجازات",
    icon: Calendar,
    description: "تكوين سياسات الإجازات",
    keywords: "إجازة إجازات سنوية مرضية",
  },
  {
    id: "payroll",
    label: "الرواتب",
    icon: DollarSign,
    description: "تكوين حسابات الرواتب",
    keywords: "راتب رواتب راتب ضريبة",
  },
  {
    id: "allowances",
    label: "البدلات",
    icon: Gift,
    description: "البدلات والمزايا الافتراضية",
    keywords: "بدل بدلات مواصلات سكن",
  },
  {
    id: "attendance",
    label: "الحضور والخصومات الالية",
    icon: Users,
    description: "سياسات الحضور والانصراف والخصم التلقائي",
    keywords: "حضور انصراف تأخير بصمة خصم تلقائي",
  },
  {
    id: "discipline",
    label: "الجزاءات",
    icon: AlertTriangle,
    description: "إدارة التحذيرات والخصومات",
    keywords: "جزاء إنذار خصم تحذير",
  },
  {
    id: "probation",
    label: "فترة الاختبار",
    icon: Briefcase,
    description: "إعدادات فترة الاختبار",
    keywords: "اختبار تجربة فترة",
  },
  {
    id: "employment",
    label: "التوظيف",
    icon: FileText,
    description: "سياسات التوظيف وعقود العمل",
    keywords: "توظيف عقد استقالة تقاعد",
  },
  {
    id: "remote",
    label: "العمل عن بُعد",
    icon: Home,
    description: "سياسات العمل من المنزل",
    keywords: "بعد منزل عن بعد",
  },
  {
    id: "security",
    label: "الأمان",
    icon: Lock,
    description: "أمان البيانات والوصول",
    keywords: "أمان أمن بيانات خصوصية",
  },
  {
    id: "notifications",
    label: "الإشعارات",
    icon: Bell,
    description: "إعدادات تنبيهات النظام",
    keywords: "إشعار تنبيه إشعارات",
  },
];

export const HRSettingsSidebar: React.FC<HRSettingsSidebarProps> = ({
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
}) => {
  const searchQueryTrimmed = searchQuery.trim();

  const filteredTabs = useMemo(() => {
    if (!searchQueryTrimmed) return hrSettingsTabs;
    const q = searchQueryTrimmed.toLowerCase();
    return hrSettingsTabs.filter((tab) => {
      if (tab.label.toLowerCase().includes(q) || tab.description.toLowerCase().includes(q)) {
        return true;
      }
      if (tab.keywords) {
        const words = tab.keywords.split(/\s+/);
        return words.some((w) => w.toLowerCase().includes(q));
      }
      return false;
    });
  }, [searchQueryTrimmed]);

  return (
    <div className="lg:w-64 flex-shrink-0">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden lg:sticky lg:top-24">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm mb-3">
            أقسام الإعدادات
          </h2>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <Input
              type="text"
              placeholder="بحث في الأقسام..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className={`pr-9 text-sm ${searchQueryTrimmed ? "pl-9" : ""}`}
              aria-label="بحث في أقسام الإعدادات"
            />
            {searchQueryTrimmed && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                aria-label="مسح البحث"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {searchQueryTrimmed && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 tabular-nums font-mono">
              {filteredTabs.length === 0
                ? "لا توجد نتائج"
                : `${filteredTabs.length} من ${hrSettingsTabs.length} قسم`}
            </p>
          )}
        </div>
        <nav
          className="p-2 space-y-1 max-h-[400px] lg:max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar"
          aria-label="تنقل أقسام الإعدادات"
        >
          {filteredTabs.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
              لا توجد نتائج للبحث. جرّب كلمات أخرى أو امسح البحث.
            </div>
          ) : (
            filteredTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  type="button"
                  className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-right transition-all duration-200 ${
                    isActive
                      ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50 shadow-sm"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-transparent"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon
                    className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                      isActive
                        ? "text-indigo-600 dark:text-indigo-400"
                        : "text-gray-400 dark:text-gray-500"
                    }`}
                    aria-hidden
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{tab.label}</div>
                    <div
                      className={`text-[10px] truncate ${
                        isActive
                          ? "text-indigo-500/80 dark:text-indigo-400/80"
                          : "text-gray-500"
                      }`}
                    >
                      {tab.description}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </nav>
      </div>
    </div>
  );
};
