import React from "react";
import { useTranslation } from "react-i18next";
import { School, AlertTriangle } from "lucide-react";
import {
  TABS,
  useEducationManagementController,
  EducationDashboardTab,
  EducationSubjectsTab,
  EducationPackagesTab,
  EducationStudentsTab,
  EducationTeachersTab,
  EducationEnrollmentsTab,
  EducationSessionsTab,
} from "./education-management";

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
              القطاع التعليمي
            </span>
            <span className="text-xs text-muted-foreground font-mono tabular-nums">
              {stats.totalStudents} طالب مسجل
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            إدارة المراكز والأكاديميات التعليمية
          </h1>
          <p className="text-xs text-muted-foreground">
            نظام متكامل لإدارة المواد، باقات الحصص، المهندسين، والطلاب وجداول الحصص الدورية
          </p>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 border-b border-border/60 -mx-3.5 sm:mx-0 px-3.5 sm:px-0">
        {TABS.map((tab) => {
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
              {tab.id === "teachers" ? (isEn ? "Instructors" : "المهندسين") : tab.label}
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
        </>
      )}
    </div>
  );
}
