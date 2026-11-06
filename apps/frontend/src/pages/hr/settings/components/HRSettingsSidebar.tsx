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
      <div className="bg-card rounded-2xl border border-border/70 shadow-xs overflow-hidden lg:sticky lg:top-6">
        <div className="p-3.5 border-b border-border/70 bg-muted/20">
          <h2 className="font-semibold text-foreground text-xs uppercase tracking-wider mb-2.5">
            أقسام الإعدادات
          </h2>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="بحث في الأقسام..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className={`pr-8 text-xs h-8 ${searchQueryTrimmed ? "pl-8" : ""}`}
              aria-label="بحث في أقسام الإعدادات"
            />
            {searchQueryTrimmed && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                aria-label="مسح البحث"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {searchQueryTrimmed && (
            <p className="mt-2 text-xs text-muted-foreground tabular-nums font-mono">
              {filteredTabs.length === 0
                ? "لا توجد نتائج"
                : `${filteredTabs.length} من ${hrSettingsTabs.length} قسم`}
            </p>
          )}
        </div>
        <nav
          className="p-2 space-y-1 max-h-[400px] lg:max-h-[calc(100vh-220px)] overflow-y-auto custom-scrollbar"
          aria-label="تنقل أقسام الإعدادات"
        >
          {filteredTabs.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
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
                  className={`w-full flex items-start gap-2.5 px-3 py-2 rounded-xl text-right transition-colors text-xs ${
                    isActive
                      ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon
                    className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                    aria-hidden
                  />
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{tab.label}</div>
                    <div
                      className={`text-[10px] truncate ${
                        isActive
                          ? "text-primary/70"
                          : "text-muted-foreground/70"
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
