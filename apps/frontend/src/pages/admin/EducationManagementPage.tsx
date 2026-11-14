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
      {/* Sub-navigation lives exclusively in the central sidebar (sidebar.ts education section) —
          in-page tab bar removed per Ban Duplicate In-Page Navigation rule.
          NOTE: sidebar navigation keeps this component mounted (same catch-all route),
          so unsaved settings edits persist across tab switches. */}

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
