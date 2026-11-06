import React, { useState, useEffect } from "react";
import {
  Clock,
  Calendar,
  DollarSign,
  TrendingUp,
  Users,
  Award,
  GraduationCap,
  AlertTriangle,
  FileText,
  BarChart3,
  ChevronLeft,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ErrorBoundary from "../../../components/ErrorBoundary";
import AttendanceReport from "./AttendanceReport";
import LeaveReport from "./LeaveReport";
import PayrollReport from "./PayrollReport";
import PerformanceReport from "./PerformanceReport";
import TurnoverReport from "./TurnoverReport";
import OvertimeReport from "./OvertimeReport";
import LateAbsenceReport from "./LateAbsenceReport";
import AbsentDaysReport from "./AbsentDaysReport";
import AttendanceSheetReport from "./AttendanceSheetReport";
import EmployeeReport from "./EmployeeReport";

type TabId =
  | "employee"
  | "attendance"
  | "attendance-sheet"
  | "absent-days"
  | "leaves"
  | "payroll"
  | "performance"
  | "turnover"
  | "overtime"
  | "late-absence"
  | "training"
  | "warnings"
  | "kpis";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ElementType;
  description: string;
}

const HRReportsHub: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>(
    (searchParams.get("tab") as TabId) || "employee",
  );

  useEffect(() => {
    const tab = searchParams.get("tab") as TabId;
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  const tabs: Tab[] = [
    {
      id: "employee",
      label: "تقرير الموظف الشامل",
      icon: Users,
      description: "جميع أنشطة موظف معين",
    },
    {
      id: "attendance",
      label: "تقرير الحضور",
      icon: Clock,
      description: "الحضور والانصراف والتأخير",
    },
    {
      id: "attendance-sheet",
      label: "كشف الحضور الشهري",
      icon: Calendar,
      description: "حالة كل موظف يومياً + أوقات الحضور والانصراف",
    },
    {
      id: "absent-days",
      label: "تقرير أيام الغياب",
      icon: Calendar,
      description: "تواريخ أيام الغياب لكل موظف",
    },
    {
      id: "leaves",
      label: "تقرير الإجازات",
      icon: Calendar,
      description: "طلبات الإجازات والرصيد",
    },
    {
      id: "payroll",
      label: "تقرير الرواتب",
      icon: DollarSign,
      description: "الرواتب والبدلات والخصومات",
    },
    {
      id: "performance",
      label: "تقرير الأداء",
      icon: Award,
      description: "تقييمات الأداء والأهداف",
    },
    {
      id: "turnover",
      label: "معدل دوران الموظفين",
      icon: Users,
      description: "التوظيف والاستقالات",
    },
    {
      id: "overtime",
      label: "تقرير العمل الإضافي",
      icon: TrendingUp,
      description: "ساعات العمل الإضافي",
    },
    {
      id: "late-absence",
      label: "التأخير والغياب",
      icon: AlertTriangle,
      description: "تحليل التأخير والغياب",
    },
    {
      id: "training",
      label: "تقرير التدريب",
      icon: GraduationCap,
      description: "البرامج التدريبية",
    },
    {
      id: "warnings",
      label: "تقرير الإنذارات",
      icon: FileText,
      description: "الإنذارات والجزاءات",
    },
    {
      id: "kpis",
      label: "مؤشرات الأداء",
      icon: BarChart3,
      description: "KPIs الموارد البشرية",
    },
  ];

  return (
    <div className="space-y-5 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/70 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/hr")}
            aria-label="العودة إلى الموارد البشرية"
            className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground"
          >
            <ChevronLeft className="size-4 rotate-180" />
          </button>
          <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
            <BarChart3 className="size-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight truncate">
              تقارير الموارد البشرية
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate">
              تقارير شاملة لجميع أنشطة الموارد البشرية
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
          {/* Sidebar Tabs */}
          <div className="lg:w-64 shrink-0 print:hidden">
            <div className="bg-card text-card-foreground rounded-xl border border-border/70 overflow-hidden lg:sticky lg:top-4">
              <div className="p-3 border-b border-border/70">
                <h2 className="font-medium text-sm text-foreground">
                  التقارير المتاحة
                </h2>
              </div>
              <nav className="p-1.5 max-h-[calc(100vh-220px)] overflow-y-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`w-full flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-right transition-colors ${
                      activeTab === tab.id
                        ? "bg-primary/10 text-primary"
                        : "text-foreground/80 hover:bg-muted"
                    }`}
                  >
                    <tab.icon
                      className={`size-4 mt-0.5 shrink-0 ${
                        activeTab === tab.id
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{tab.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2 text-right">
                        {tab.description}
                      </div>
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            <ErrorBoundary>
              {activeTab === "employee" && <EmployeeReport />}
              {activeTab === "attendance" && <AttendanceReport />}
              {activeTab === "attendance-sheet" && <AttendanceSheetReport />}
              {activeTab === "absent-days" && <AbsentDaysReport />}
              {activeTab === "leaves" && <LeaveReport />}
              {activeTab === "payroll" && <PayrollReport />}
              {activeTab === "performance" && <PerformanceReport />}
              {activeTab === "turnover" && <TurnoverReport />}
              {activeTab === "overtime" && <OvertimeReport />}
              {activeTab === "late-absence" && <LateAbsenceReport />}
              {activeTab === "training" && (
                <div className="bg-card text-card-foreground rounded-xl border border-border/70 p-8">
                  <div className="text-center">
                    <GraduationCap className="size-10 text-muted-foreground mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      تقرير التدريب
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      قريباً — تقرير البرامج التدريبية وفعاليتها
                    </p>
                  </div>
                </div>
              )}
              {activeTab === "warnings" && (
                <div className="bg-card text-card-foreground rounded-xl border border-border/70 p-8">
                  <div className="text-center">
                    <FileText className="size-10 text-muted-foreground mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      تقرير الإنذارات
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      قريباً — تقرير الإنذارات والجزاءات التأديبية
                    </p>
                  </div>
                </div>
              )}
              {activeTab === "kpis" && (
                <div className="bg-card text-card-foreground rounded-xl border border-border/70 p-8">
                  <div className="text-center">
                    <BarChart3 className="size-10 text-muted-foreground mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      مؤشرات الأداء الرئيسية
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      قريباً — لوحة شاملة لمؤشرات الأداء
                    </p>
                  </div>
                </div>
              )}
            </ErrorBoundary>
          </div>
      </div>
    </div>
  );
};

export default HRReportsHub;
