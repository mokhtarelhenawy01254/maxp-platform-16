import React, { useState, useEffect } from "react";
import {
  Briefcase,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  BarChart3,
  GitBranch,
  FileText
} from "lucide-react";
import { companyAwareApi } from "../../../services/companyAwareApi";
import JobPostingsSection from "./sections/JobPostingsSection";
import ApplicantsSection from "./sections/ApplicantsSection";
import InterviewsSection from "./sections/InterviewsSection";
import HiringPipelineSection from "./sections/HiringPipelineSection";
import ApplicationFormsSection from "./sections/ApplicationFormsSection";

interface RecruitmentStats {
  activeJobs: number;
  totalApplicants: number;
  scheduledInterviews: number;
  pendingReviews: number;
  hiredThisMonth: number;
  averageTimeToHire: number;
}

const RecruitmentDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "overview" | "jobs" | "applicants" | "interviews" | "pipeline" | "forms"
  >("overview");
  const [stats, setStats] = useState<RecruitmentStats>({
    activeJobs: 0,
    totalApplicants: 0,
    scheduledInterviews: 0,
    pendingReviews: 0,
    hiredThisMonth: 0,
    averageTimeToHire: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await companyAwareApi.get("/hr/recruitment/stats");
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching recruitment stats:", error);
      setStats({
        activeJobs: 0,
        totalApplicants: 0,
        scheduledInterviews: 0,
        pendingReviews: 0,
        hiredThisMonth: 0,
        averageTimeToHire: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "overview", name: "نظرة عامة", icon: BarChart3 },
    { id: "jobs", name: "الوظائف المتاحة", icon: Briefcase },
    { id: "applicants", name: "المتقدمين للوظائف", icon: Users },
    { id: "interviews", name: "المقابلات المجدولة", icon: Calendar },
    { id: "pipeline", name: "مسار مراحل التوظيف", icon: GitBranch },
    { id: "forms", name: "استبيانات ونماذج التقديم", icon: FileText },
  ];

  const statCards = [
    {
      title: "الوظائف المفتوحة",
      value: stats.activeJobs,
      icon: Briefcase,
    },
    {
      title: "إجمالي المتقدمين",
      value: stats.totalApplicants,
      icon: Users,
    },
    {
      title: "المقابلات المجدولة",
      value: stats.scheduledInterviews,
      icon: Calendar,
    },
    {
      title: "بانتظار المراجعة",
      value: stats.pendingReviews,
      icon: Clock,
    },
    {
      title: "تم توظيفهم هذا الشهر",
      value: stats.hiredThisMonth,
      icon: CheckCircle2,
    },
    {
      title: "متوسط فترة التوظيف",
      value: `${stats.averageTimeToHire} يوم`,
      icon: BarChart3,
    },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-foreground">
                إدارة التوظيف واستقطاب الكفاءات
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                متابعة الوظائف المعلنة، المتقدمين، المقابلات الشخصية، ومراحل قبول الموظفين
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("jobs")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>نشر إعلان وظيفة جديدة</span>
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="bg-card border border-border/70 rounded-xl p-1.5 shadow-sm">
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Overview Content */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="bg-card border border-border/70 rounded-xl p-3.5 shadow-sm space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-muted-foreground">{card.title}</span>
                    <Icon className="w-3.5 h-3.5 text-primary/70" />
                  </div>
                  <span className="text-xl font-bold font-mono tabular-nums text-foreground block">
                    {card.value}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Quick Actions Surface */}
          <div className="bg-card border border-border/70 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-foreground border-b border-border/40 pb-3">
              إجراءات التوظيف السريعة
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => setActiveTab("jobs")}
                className="flex items-center gap-3 p-3.5 rounded-xl border border-border/70 bg-muted/10 hover:bg-muted/20 hover:border-primary/40 transition-colors text-right"
              >
                <div className="p-2 rounded-lg bg-background border border-border/60 shrink-0 text-primary">
                  <Plus className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-xs text-foreground block">إضافة وظيفة</span>
                  <span className="text-[11px] text-muted-foreground">صياغة ونشر إعلان وظيفي</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("applicants")}
                className="flex items-center gap-3 p-3.5 rounded-xl border border-border/70 bg-muted/10 hover:bg-muted/20 hover:border-primary/40 transition-colors text-right"
              >
                <div className="p-2 rounded-lg bg-background border border-border/60 shrink-0 text-primary">
                  <Users className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-xs text-foreground block">سجل المتقدمين</span>
                  <span className="text-[11px] text-muted-foreground">فحص السير الذاتية والطلبات</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("interviews")}
                className="flex items-center gap-3 p-3.5 rounded-xl border border-border/70 bg-muted/10 hover:bg-muted/20 hover:border-primary/40 transition-colors text-right"
              >
                <div className="p-2 rounded-lg bg-background border border-border/60 shrink-0 text-primary">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-xs text-foreground block">جدولة مقابلة</span>
                  <span className="text-[11px] text-muted-foreground">تحديد مواعيد المقابلات الفنية</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("pipeline")}
                className="flex items-center gap-3 p-3.5 rounded-xl border border-border/70 bg-muted/10 hover:bg-muted/20 hover:border-primary/40 transition-colors text-right"
              >
                <div className="p-2 rounded-lg bg-background border border-border/60 shrink-0 text-primary">
                  <GitBranch className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-xs text-foreground block">مسار القبول</span>
                  <span className="text-[11px] text-muted-foreground">لوحة كانبان لمراحل المرشحين</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-sections */}
      {activeTab === "jobs" && <JobPostingsSection />}
      {activeTab === "applicants" && <ApplicantsSection />}
      {activeTab === "interviews" && <InterviewsSection />}
      {activeTab === "pipeline" && <HiringPipelineSection />}
      {activeTab === "forms" && <ApplicationFormsSection />}
    </div>
  );
};

export default RecruitmentDashboard;
