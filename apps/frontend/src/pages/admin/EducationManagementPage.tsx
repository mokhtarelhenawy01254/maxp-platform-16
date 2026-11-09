import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { School, AlertTriangle, Settings } from "lucide-react";
import {
  TABS,
  TabId,
  useEducationManagementController,
  EducationDashboardTab,
  EducationSubjectsTab,
  EducationPackagesTab,
  EducationStudentsTab,
  EducationTeachersTab,
  EducationEnrollmentsTab,
  EducationSessionsTab,
  EducationSettingsTab,
  EducationLogsTab,
  EducationSettingsData,
} from "./education-management";
import { api, fetchJson } from "./education-management/api";

export default function EducationManagementPage() {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";

  const {
    activeTab,
    setActiveTab,
    subjects,
    packages,
    students,
    teachers,
    enrollments,
    sessions,
    customers,
    loading,
    error,
    stats,
    // Modals
    subjectModal,
    setSubjectModal,
    packageModal,
    setPackageModal,
    studentModal,
    setStudentModal,
    teacherModal,
    setTeacherModal,
    sessionModal,
    setSessionModal,
    enrollmentModal,
    setEnrollmentModal,
    // Filters
    subjectSearch,
    setSubjectSearch,
    packageSubjectFilter,
    setPackageSubjectFilter,
    studentSearch,
    setStudentSearch,
    teacherSearch,
    setTeacherSearch,
    sessionFilters,
    setSessionFilters,
    customerResults,
    searchCustomers,
    fetchAll,
    // Handlers
    handleSaveSubject,
    handleToggleSubject,
    handleDeleteSubject,
    handleSavePackage,
    handleTogglePackage,
    handleDeletePackage,
    handleSaveStudent,
    handleToggleStudent,
    handleDeleteStudent,
    handleSaveTeacher,
    handleToggleTeacher,
    handleDeleteTeacher,
    handleSaveEnrollment,
    handleDeleteEnrollment,
    handleSaveSession,
    handleConfirmSession,
    handleCancelSession,
  } = useEducationManagementController();

  const [educationSettings, setEducationSettings] = useState<EducationSettingsData | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchJson(api("settings"))
      .then((data) => {
        if (isMounted && data) {
          setEducationSettings(data);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const tabsList = useMemo(() => {
    if (!educationSettings?.tabs || educationSettings.tabs.length === 0) {
      return TABS.map((tab) => ({
        ...tab,
        label: tab.id === "teachers" ? (isEn ? "Instructors" : "المهندسين") : tab.label,
      }));
    }

    const result: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [];

    // Order according to educationSettings.tabs
    educationSettings.tabs.forEach((st) => {
      if (st.visible === false && st.id !== "settings") return;
      const baseTab = TABS.find((t) => t.id.toLowerCase() === st.id.toLowerCase());
      if (baseTab) {
        const customLabel = isEn
          ? (st.labelEn || st.labelAr || baseTab.label)
          : (st.labelAr || baseTab.label);
        result.push({
          id: baseTab.id,
          label: customLabel,
          icon: baseTab.icon,
        });
      }
    });

    // Make sure activeTab is visible if navigated directly
    if (!result.some((r) => r.id === activeTab)) {
      const activeBaseTab = TABS.find((t) => t.id === activeTab);
      if (activeBaseTab) {
        result.push(activeBaseTab);
      }
    }

    return result;
  }, [educationSettings, isEn, activeTab]);

  return (
    <div
      className="w-full h-full min-h-0 flex-1 overflow-y-auto max-w-[1600px] mx-auto p-3.5 sm:p-5 lg:p-6 pb-24 sm:pb-12 space-y-4 sm:space-y-5 rtl font-sans"
      dir="rtl"
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-border/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              <School className="w-3.5 h-3.5" />
              {educationSettings?.systemTitle || "القطاع التعليمي"}
            </span>
            <span className="text-xs text-muted-foreground font-mono tabular-nums">
              {stats.totalStudents} طالب مسجل
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {educationSettings?.systemTitle ? educationSettings.systemTitle : "إدارة المراكز والأكاديميات التعليمية"}
          </h1>
          <p className="text-xs text-muted-foreground">
            نظام متكامل لإدارة المواد، باقات الحصص، الكوادر التعليمية، والطلاب وجداول الحصص الدورية
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            title="إعدادات وتخصيص النظام التعليمي"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              activeTab === "settings"
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border/70 hover:bg-muted/80 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            إعدادات النظام
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 border-b border-border/60 -mx-3.5 sm:mx-0 px-3.5 sm:px-0">
        {tabsList.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {error ? (
        <div className="bg-card border border-border/80 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center border border-red-500/20">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            تعذر تحميل بيانات المركز التعليمي
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">{error}</p>
          <button
            type="button"
            onClick={fetchAll}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center min-h-[350px] gap-3 text-muted-foreground">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono">
            جاري تحميل البيانات التعليمية...
          </span>
        </div>
      ) : (
        <>
          {activeTab === "dashboard" && (
            <EducationDashboardTab
              stats={stats}
              sessions={sessions}
              enrollments={enrollments}
              students={students}
              teachers={teachers}
              subjects={subjects}
              packages={packages}
              setActiveTab={setActiveTab}
              studentModal={studentModal}
              setStudentModal={setStudentModal}
              sessionModal={sessionModal}
              setSessionModal={setSessionModal}
              enrollmentModal={enrollmentModal}
              setEnrollmentModal={setEnrollmentModal}
              teacherModal={teacherModal}
              setTeacherModal={setTeacherModal}
              handleConfirmSession={handleConfirmSession}
              handleCancelSession={handleCancelSession}
              handleSaveStudent={handleSaveStudent}
              handleSaveTeacher={handleSaveTeacher}
              handleSaveSession={handleSaveSession}
              handleSaveEnrollment={handleSaveEnrollment}
              customers={customers}
              customerResults={customerResults}
              searchCustomers={searchCustomers}
            />
          )}
          {activeTab === "subjects" && (
            <EducationSubjectsTab
              subjects={subjects}
              subjectSearch={subjectSearch}
              setSubjectSearch={setSubjectSearch}
              subjectModal={subjectModal}
              setSubjectModal={setSubjectModal}
              handleSaveSubject={handleSaveSubject}
              handleToggleSubject={handleToggleSubject}
              handleDeleteSubject={handleDeleteSubject}
            />
          )}
          {activeTab === "packages" && (
            <EducationPackagesTab
              packages={packages}
              subjects={subjects}
              packageSubjectFilter={packageSubjectFilter}
              setPackageSubjectFilter={setPackageSubjectFilter}
              packageModal={packageModal}
              setPackageModal={setPackageModal}
              handleSavePackage={handleSavePackage}
              handleTogglePackage={handleTogglePackage}
              handleDeletePackage={handleDeletePackage}
            />
          )}
          {activeTab === "students" && (
            <EducationStudentsTab
              students={students}
              subjects={subjects}
              customers={customers}
              customerResults={customerResults}
              studentSearch={studentSearch}
              setStudentSearch={setStudentSearch}
              studentModal={studentModal}
              setStudentModal={setStudentModal}
              searchCustomers={searchCustomers}
              handleSaveStudent={handleSaveStudent}
              handleToggleStudent={handleToggleStudent}
              handleDeleteStudent={handleDeleteStudent}
            />
          )}
          {activeTab === "teachers" && (
            <EducationTeachersTab
              teachers={teachers}
              subjects={subjects}
              teacherSearch={teacherSearch}
              setTeacherSearch={setTeacherSearch}
              teacherModal={teacherModal}
              setTeacherModal={setTeacherModal}
              handleSaveTeacher={handleSaveTeacher}
              handleToggleTeacher={handleToggleTeacher}
              handleDeleteTeacher={handleDeleteTeacher}
            />
          )}
          {activeTab === "enrollments" && (
            <EducationEnrollmentsTab
              enrollments={enrollments}
              students={students}
              packages={packages}
              teachers={teachers}
              subjects={subjects}
              enrollmentModal={enrollmentModal}
              setEnrollmentModal={setEnrollmentModal}
              handleSaveEnrollment={handleSaveEnrollment}
              handleDeleteEnrollment={handleDeleteEnrollment}
              handleSaveStudent={handleSaveStudent}
            />
          )}
          {activeTab === "sessions" && (
            <EducationSessionsTab
              sessions={sessions}
              teachers={teachers}
              subjects={subjects}
              enrollments={enrollments}
              students={students}
              sessionFilters={sessionFilters}
              setSessionFilters={setSessionFilters}
              sessionModal={sessionModal}
              setSessionModal={setSessionModal}
              handleSaveSession={handleSaveSession}
              handleConfirmSession={handleConfirmSession}
              handleCancelSession={handleCancelSession}
            />
          )}
          {activeTab === "settings" && (
            <EducationSettingsTab
              onSaved={(updated) => {
                setEducationSettings(updated);
              }}
            />
          )}
          {activeTab === "logs" && (
            <EducationLogsTab />
          )}
        </>
      )}
    </div>
  );
}
