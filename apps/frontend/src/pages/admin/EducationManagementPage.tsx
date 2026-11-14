import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
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

  return (
    <div
      className={`w-full h-full min-h-0 flex-1 overflow-y-auto max-w-[1600px] mx-auto p-3.5 sm:p-5 lg:p-6 pb-24 sm:pb-12 space-y-4 sm:space-y-5 font-sans ${isEn ? "ltr" : "rtl"}`}
      dir={isEn ? "ltr" : "rtl"}
    >
<<<<<<< Updated upstream
      {/* Sub-navigation lives exclusively in the central sidebar (sidebar.ts education section) —
          in-page tab bar removed per Ban Duplicate In-Page Navigation rule.
          NOTE: sidebar navigation keeps this component mounted (same catch-all route),
          so unsaved settings edits persist across tab switches. */}
=======
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
          <p className="text-xs text-muted-foreground">
            {t("education.subtitle", isEn ? "Comprehensive system for managing subjects, session packages, instructors, students, and recurring schedules" : "نظام متكامل لإدارة المواد، باقات الحصص، الكوادر التعليمية، والطلاب وجداول الحصص الدورية")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("logs")}
            title={t("education.logs", isEn ? "Education System Logs" : "سجلات النظام التعليمي")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              activeTab === "logs"
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border/70 hover:bg-muted/80 text-muted-foreground hover:text-foreground"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            {t("education.logs", isEn ? "System Logs" : "سجلات النظام التعليمي")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            title={t("education.settings", isEn ? "Customize Sections & Settings" : "إعدادات وتخصيص السكاشن")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              activeTab === "settings"
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border/70 hover:bg-muted/80 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            {t("education.settings", isEn ? "Settings" : "إعدادات وتخصيص السكاشن")}
          </button>
        </div>
      </div>

      {/* Education In-Page Navigation Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-border/60">
        {(() => {
          const defaultEnLabels: Record<string, string> = {
            dashboard: "Dashboard",
            subjects: "Subjects",
            packages: "Packages",
            groups: "Groups",
            students: "Students",
            teachers: "Teachers",
            enrollments: "Enrollments",
            sessions: "Sessions",
            settings: "Settings",
            logs: "Logs",
          };
          const tabsById = new Map(
            (educationSettings?.tabs || []).map((cfg) => [String(cfg.id || "").toLowerCase(), cfg]),
          );
          const orderedTabs = [...TABS]
            .filter((tab) => {
              if (tab.id === "subjects" && !enableSubjects) return false;
              const cfg = tabsById.get(tab.id.toLowerCase());
              if (cfg && cfg.visible === false && tab.id !== "settings") return false;
              return true;
            })
            .sort((a, b) => {
              const aOrder = tabsById.get(a.id.toLowerCase())?.order;
              const bOrder = tabsById.get(b.id.toLowerCase())?.order;
              if (typeof aOrder === "number" && typeof bOrder === "number") return aOrder - bOrder;
              if (typeof aOrder === "number") return -1;
              if (typeof bOrder === "number") return 1;
              return 0;
            });

          return orderedTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const cfg = tabsById.get(tab.id.toLowerCase());
            const rawConfigured = cfg ? (isEn ? cfg.labelEn || cfg.labelAr : cfg.labelAr || cfg.labelEn) : "";
            const isLegacyDefault =
              rawConfigured === "المهندسين" || rawConfigured === "Instructors";
            const label =
              rawConfigured && !isLegacyDefault
                ? rawConfigured
                : isEn
                  ? defaultEnLabels[tab.id] || tab.label
                  : tab.label;

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
                {label}
              </button>
            );
          });
        })()}
      </div>
>>>>>>> Stashed changes

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
