import React, { useState, useEffect } from "react";
import {
  BriefcaseIcon,
  UserGroupIcon,
  ClipboardDocumentCheckIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
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
    { id: "overview", name: "نظرة عامة", icon: ChartBarIcon },
    { id: "jobs", name: "الوظائف المتاحة", icon: BriefcaseIcon },
    { id: "applicants", name: "المتقدمين", icon: UserGroupIcon },
    { id: "interviews", name: "المقابلات", icon: CalendarDaysIcon },
    { id: "pipeline", name: "مسار التوظيف", icon: ClipboardDocumentCheckIcon },
    {
      id: "forms",
      name: "استبيانات التقديم",
      icon: ClipboardDocumentCheckIcon,
    },
  ];

  const statCards = [
    {
      title: "الوظائف النشطة",
      value: stats.activeJobs,
      icon: BriefcaseIcon,
      color: "blue",
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
      borderColor: "border-blue-200",
    },
    {
      title: "إجمالي المتقدمين",
      value: stats.totalApplicants,
      icon: UserGroupIcon,
      color: "purple",
      bgColor: "bg-purple-50",
      iconColor: "text-purple-600",
      borderColor: "border-purple-200",
    },
    {
      title: "المقابلات المجدولة",
      value: stats.scheduledInterviews,
      icon: CalendarDaysIcon,
      color: "green",
      bgColor: "bg-green-50",
      iconColor: "text-green-600",
      borderColor: "border-green-200",
    },
    {
      title: "بانتظار المراجعة",
      value: stats.pendingReviews,
      icon: ClockIcon,
      color: "amber",
      bgColor: "bg-amber-50",
      iconColor: "text-amber-600",
      borderColor: "border-amber-200",
    },
    {
      title: "تم التوظيف هذا الشهر",
      value: stats.hiredThisMonth,
      icon: CheckCircleIcon,
      color: "emerald",
      bgColor: "bg-emerald-50",
      iconColor: "text-emerald-600",
      borderColor: "border-emerald-200",
    },
    {
      title: "متوسط وقت التوظيف",
      value: `${stats.averageTimeToHire} يوم`,
      icon: ChartBarIcon,
      color: "indigo",
      bgColor: "bg-indigo-50",
      iconColor: "text-indigo-600",
      borderColor: "border-indigo-200",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              إدارة التوظيف
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              إدارة الوظائف والمتقدمين ومراحل التوظيف
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg scale-105"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.name}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Content */}
      {activeTab === "overview" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {statCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`${card.bgColor} border-2 ${card.borderColor} rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:scale-105`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`p-3 rounded-xl ${card.bgColor} border ${card.borderColor}`}
                    >
                      <Icon className={`w-6 h-6 ${card.iconColor}`} />
                    </div>
                  </div>
                  <h3 className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                    {card.title}
                  </h3>
                  <p className={`text-3xl font-bold ${card.iconColor}`}>
                    {card.value}
                  </p>
                </motion.div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border-2 border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
              إجراءات سريعة
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => setActiveTab("jobs")}
                className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl hover:shadow-md transition-all border-2 border-blue-200 dark:border-blue-700"
              >
                <PlusIcon className="w-6 h-6 text-blue-600" />
                <span className="font-medium text-gray-800 dark:text-white">
                  إضافة وظيفة جديدة
                </span>
              </button>
              <button
                onClick={() => setActiveTab("applicants")}
                className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl hover:shadow-md transition-all border-2 border-purple-200 dark:border-purple-700"
              >
                <UserGroupIcon className="w-6 h-6 text-purple-600" />
                <span className="font-medium text-gray-800 dark:text-white">
                  عرض المتقدمين
                </span>
              </button>
              <button
                onClick={() => setActiveTab("interviews")}
                className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl hover:shadow-md transition-all border-2 border-green-200 dark:border-green-700"
              >
                <CalendarDaysIcon className="w-6 h-6 text-green-600" />
                <span className="font-medium text-gray-800 dark:text-white">
                  جدولة مقابلة
                </span>
              </button>
              <button
                onClick={() => setActiveTab("pipeline")}
                className="flex items-center gap-3 p-4 bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-xl hover:shadow-md transition-all border-2 border-amber-200 dark:border-amber-700"
              >
                <ClipboardDocumentCheckIcon className="w-6 h-6 text-amber-600" />
                <span className="font-medium text-gray-800 dark:text-white">
                  تتبع المراحل
                </span>
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "jobs" && <JobPostingsSection />}
      {activeTab === "applicants" && <ApplicantsSection />}
      {activeTab === "interviews" && <InterviewsSection />}
      {activeTab === "pipeline" && <HiringPipelineSection />}
      {activeTab === "forms" && <ApplicationFormsSection />}
    </div>
  );
};

export default RecruitmentDashboard;
