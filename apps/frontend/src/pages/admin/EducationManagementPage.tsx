import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { School, AlertTriangle } from "lucide-react";
import {
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
  TABS,
} from "./education-management";
import { api, fetchJson } from "./education-management/api";
import EducationGroupsPage from "./EducationGroupsPage";

export default function EducationManagementPage() {
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

  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";

  const [educationSettings, setEducationSettings] = useState<EducationSettingsData | null>(null);
  const [loadingSettings, setLoadingSettings] = useState<boolean>(true);
  const enableSubjects = educationSettings?.enableSubjects ?? false;

  useEffect(() => {
    let isMounted = true;
    fetchJson(api("settings"))
      .then((data) => {
        if (isMounted && data) {
          setEducationSettings(data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoadingSettings(false);
      });

    const handleSettingsUpdated = (e: any) => {
      if (isMounted && e.detail) {
        setEducationSettings(e.detail);
      }
    };
    window.addEventListener("education-settings-updated", handleSettingsUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener("education-settings-updated", handleSettingsUpdated);
    };
  }, []);

  const systemTitle = isEn
    ? (educationSettings?.systemTitleEn || educationSettings?.systemTitle || t("education.systemTitle", "Education System"))
    : (educationSettings?.systemTitle || t("education.systemTitle", "القطاع التعليمي"));

  const systemSubtitle = isEn
    ? (educationSettings?.systemTitleEn || t("education.systemTitleDefault", "Educational Centers & Academies Management"))
    : (educationSettings?.systemTitle || t("education.systemTitleDefault", "إدارة المراكز والأكاديميات التعليمية"));

  return (
    <div
      className={`w-full h-full min-h-0 flex-1 overflow-y-auto max-w-[1600px] mx-auto p-3.5 sm:p-5 lg:p-6 pb-24 sm:pb-12 space-y-4 sm:space-y-5 font-sans ${isEn ? "ltr" : "rtl"}`}
      dir={isEn ? "ltr" : "rtl"}
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-border/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              <School className="w-3.5 h-3.5" />
              {systemTitle}
            </span>
            <span className="text-xs text-muted-foreground font-mono tabular-nums">
              {t("education.totalStudentsCount", { count: stats.totalStudents, defaultValue: isEn ? `${stats.totalStudents} enrolled students` : `${stats.totalStudents} طالب مسجل` })}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {systemSubtitle}
          </h1>
        </div>
      </div>

      {/* Education In-Page Navigation Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-border/60">
        {TABS.filter((tab) => {
          if (tab.id === "subjects" && !enableSubjects) return false;
          return true;
        }).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {isEn ? (tab.id === "dashboard" ? "Dashboard" : tab.id === "subjects" ? "Subjects" : tab.id === "packages" ? "Packages" : tab.id === "groups" ? "Groups" : tab.id === "students" ? "Students" : tab.id === "teachers" ? "Instructors" : tab.id === "enrollments" ? "Enrollments" : tab.id === "sessions" ? "Sessions" : tab.id === "settings" ? "Settings" : "Logs") : tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "settings" ? (
        <EducationSettingsTab
          onSaved={(updated) => {
            setEducationSettings(updated);
          }}
        />
      ) : activeTab === "logs" ? (
        <EducationLogsTab />
      ) : error ? (
        <div className="bg-card border border-border/80 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center border border-red-500/20">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            {t("education.errorLoading", isEn ? "Failed to load educational center data" : "تعذر تحميل بيانات المركز التعليمي")}
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">{error}</p>
          <button
            type="button"
            onClick={fetchAll}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90"
          >
            {t("education.retry", isEn ? "Retry" : "إعادة المحاولة")}
          </button>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center min-h-[350px] gap-3 text-muted-foreground">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono">
            {t("education.loading", isEn ? "Loading educational data..." : "جاري تحميل البيانات التعليمية...")}
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
              enableSubjects={enableSubjects}
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
            loadingSettings ? (
              <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 text-muted-foreground">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-mono">{t("education.loading", isEn ? "Loading settings..." : "جاري تحميل الإعدادات...")}</span>
              </div>
            ) : enableSubjects ? (
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
            ) : (
              <div className="bg-card border border-border/80 rounded-2xl p-10 text-center space-y-3">
                <p className="text-sm font-semibold text-foreground">
                  {isEn ? "Subjects section is disabled in current Courses & Packages mode" : "سيكشن المواد الدراسية غير مفعل في نمط الكورسات والباقات الحالي"}
                </p>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  {isEn ? "You can enable subjects anytime from the Education System settings above" : "يمكنك تفعيل سيكشن المواد في أي وقت من إعدادات وتخصيص السكاشن بالأعلى"}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("packages")}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90"
                >
                  {isEn ? "Go to Packages & Courses" : "الانتقال إلى الكورسات والباقات"}
                </button>
              </div>
            )
          )}
          {activeTab === "packages" && (
            <EducationPackagesTab
              packages={packages}
              subjects={subjects}
              enableSubjects={enableSubjects}
              packageSubjectFilter={packageSubjectFilter}
              setPackageSubjectFilter={setPackageSubjectFilter}
              packageModal={packageModal}
              setPackageModal={setPackageModal}
              handleSavePackage={handleSavePackage}
              handleTogglePackage={handleTogglePackage}
              handleDeletePackage={handleDeletePackage}
            />
          )}
          {activeTab === "groups" && (
            <EducationGroupsPage embedded enableSubjects={enableSubjects} />
          )}
          {activeTab === "students" && (
            <EducationStudentsTab
              students={students}
              subjects={subjects}
              enableSubjects={enableSubjects}
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
              enableSubjects={enableSubjects}
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
              enableSubjects={enableSubjects}
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
        </>
      )}
    </div>
  );
}
