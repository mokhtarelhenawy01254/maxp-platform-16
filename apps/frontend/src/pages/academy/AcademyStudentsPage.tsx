import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  AlertCircle,
  FileText,
  Search,
  UserPlus,
  GraduationCap,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  academyApi,
  Course,
  StudentProgressRow,
  ExerciseSubmission,
} from "./academyApi";
import { AcademyManualEnrollModal } from "./AcademyManualEnrollModal";
import { AcademyStudentsSubmissionsTab } from "./AcademyStudentsSubmissionsTab";
import { AcademyStudentsKpiBar } from "./AcademyStudentsKpiBar";
import { AcademyStudentsTable } from "./AcademyStudentsTable";

export default function AcademyStudentsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [students, setStudents] = useState<StudentProgressRow[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active top tab: 'students' | 'submissions'
  const [activeTab, setActiveTab] = useState<"students" | "submissions">("students");

  // Search & Filter for students
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "COMPLETED" | "SUSPENDED" | "EXPIRED">("ALL");

  // Submissions state
  const [submissions, setSubmissions] = useState<ExerciseSubmission[]>([]);

  // Manual enrollment modal
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);

  // Suspend action loading state
  const [suspendingId, setSuspendingId] = useState<string | null>(null);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoadingCourses(true);
      const data = await academyApi.getCourses();
      setCourses(data);
      const firstCourse = data[0];
      if (firstCourse) {
        setSelectedCourseId(firstCourse.id);
        await Promise.all([
          loadStudents(firstCourse.id),
          loadSubmissions(firstCourse.id),
        ]);
      } else {
        setSelectedCourseId("");
        setStudents([]);
        setSubmissions([]);
      }
      setError(null);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || "فشل تحميل بيانات الكورسات والطلاب";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoadingCourses(false);
    }
  };

  const loadStudents = async (cId: string) => {
    try {
      setLoadingStudents(true);
      const data = await academyApi.getStudentsProgress(cId);
      setStudents(data);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "فشل تحميل قائمة الطلاب");
    } finally {
      setLoadingStudents(false);
    }
  };

  const loadSubmissions = async (cId: string) => {
    try {
      setLoadingSubmissions(true);
      const subs = await academyApi.getCourseSubmissions(cId);
      setSubmissions(subs);
    } catch (err: any) {
      // silently handle
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleSelectCourse = async (cId: string) => {
    setSelectedCourseId(cId);
    await Promise.all([loadStudents(cId), loadSubmissions(cId)]);
  };

  const handleToggleSuspend = async (studentId: string, currentStatus: string) => {
    try {
      setSuspendingId(studentId);
      if (currentStatus === "SUSPENDED") {
        await academyApi.activateStudent(studentId);
        toast.success("تم رفع الإيقاف وتفعيل حساب الطالب بنجاح");
      } else {
        await academyApi.suspendStudent(studentId);
        toast.success("تم إيقاف حساب الطالب ومنعه من مشاهدة المحتوى");
      }
      if (selectedCourseId) loadStudents(selectedCourseId);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "فشل تحديث حالة الطالب");
    } finally {
      setSuspendingId(null);
    }
  };

  const handleManualEnroll = async (payload: {
    name: string;
    phone: string;
    email?: string;
    days?: number;
  }) => {
    if (!selectedCourseId) return;
    try {
      await academyApi.enrollStudentManually(selectedCourseId, {
        studentName: payload.name,
        studentPhone: payload.phone,
        studentEmail: payload.email,
        accessDurationDays: payload.days,
      });
      toast.success("تم تسجيل الطالب في الدورة التدريبية بنجاح");
      loadStudents(selectedCourseId);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "فشل تسجيل الطالب يدوياً");
      throw err;
    }
  };

  const handleSaveReview = async (
    subId: string,
    status: "ACCEPTED" | "REJECTED" | "NEEDS_MORE",
    note?: string
  ) => {
    try {
      await academyApi.reviewExerciseSubmission(subId, {
        status,
        instructorNote: note,
      });
      toast.success(
        status === "ACCEPTED"
          ? "تم اعتماد تسليم الطالب بنجاح"
          : status === "REJECTED"
          ? "تم رفض التسليم ومطالبة الطالب بإعادة المحاولة"
          : "تم حفظ طلب التوضيح وإرساله للمتدرب"
      );
      if (selectedCourseId) loadSubmissions(selectedCourseId);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "فشل تحديث تقييم التسليم");
      throw err;
    }
  };

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesSearch =
        !searchQuery.trim() ||
        (s.studentName && s.studentName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.studentPhone && s.studentPhone.includes(searchQuery.trim())) ||
        (s.studentEmail && s.studentEmail.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchesStatus = true;
      if (statusFilter === "ACTIVE") matchesStatus = s.status === "ACTIVE" && !s.isExpired;
      else if (statusFilter === "COMPLETED") matchesStatus = s.progressPercent === 100 || s.hasCertificate;
      else if (statusFilter === "SUSPENDED") matchesStatus = s.status === "SUSPENDED";
      else if (statusFilter === "EXPIRED") matchesStatus = Boolean(s.isExpired);

      return matchesSearch && matchesStatus;
    });
  }, [students, searchQuery, statusFilter]);

  // KPIs
  const totalStudents = students.length;
  const completedStudents = students.filter((s) => s.hasCertificate || s.progressPercent === 100).length;
  const inProgressStudents = students.filter((s) => s.status === "ACTIVE" && !s.isExpired && s.progressPercent < 100).length;
  const pendingSubmissionsCount = submissions.filter((s) => s.status === "PENDING").length;

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-background text-foreground p-3.5 sm:p-6 space-y-6" dir="rtl">
      {/* Top Header & Course Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <span>إدارة الطلاب والتسليمات الأكاديمية</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            متابعة تقدم المتدربين، تصحيح التمارين بالذكاء الاصطناعي، واعتماد الشهادات المهنية.
          </p>
        </div>

        {courses.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <select
              value={selectedCourseId}
              onChange={(e) => handleSelectCourse(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-card border border-border/70 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>

            <button
              onClick={() => setIsEnrollModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition-all active:scale-[0.98]"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>تسجيل طالب يدوياً</span>
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs sm:text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loadingCourses ? (
        <div className="py-24 text-center space-y-2">
          <Loader2 className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto text-primary" />
          <p className="text-xs sm:text-sm text-muted-foreground">جاري تحميل الدورات والبيانات الأكاديمية...</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="p-8 sm:p-14 rounded-xl bg-card border border-border/70 text-center max-w-xl mx-auto space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-foreground">لم تقم بإنشاء أي دورة تدريبية بعد</h2>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            للبدء في متابعة الطلاب وتصحيح التمارين بالذكاء الاصطناعي، يجب أولاً إنشاء دورتك التدريبية الأولى ونشر دروسها.
          </p>
          <div className="pt-1">
            <Link
              to="/academy/courses"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition shadow-xs"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>إنشاء دورة تدريبية جديدة</span>
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* KPI Stats Bar */}
          <AcademyStudentsKpiBar
            totalStudents={totalStudents}
            completedStudents={completedStudents}
            inProgressStudents={inProgressStudents}
            pendingSubmissionsCount={pendingSubmissionsCount}
          />

          {/* Tabs Switcher */}
          <div className="flex items-center gap-2 border-b border-border/70 pb-2">
            <button
              onClick={() => setActiveTab("students")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === "students"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>سجل الطلاب ({students.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("submissions")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === "submissions"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>تسليمات التمارين ({submissions.length})</span>
              {pendingSubmissionsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-mono">
                  {pendingSubmissionsCount}
                </span>
              )}
            </button>
          </div>

          {/* TAB 1: Students Progress Table */}
          {activeTab === "students" && (
            <div className="space-y-3">
              {/* Search & Filter Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث بالاسم أو رقم الهاتف..."
                    className="w-full pr-9 pl-3 py-1.5 rounded-lg bg-card border border-border/70 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <span className="text-[11px] text-muted-foreground font-medium ml-1 flex-shrink-0">الحالة:</span>
                  {[
                    { id: "ALL", label: "الكل" },
                    { id: "ACTIVE", label: "نشط" },
                    { id: "COMPLETED", label: "مكتمل" },
                    { id: "SUSPENDED", label: "موقوف" },
                    { id: "EXPIRED", label: "منتهي" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setStatusFilter(f.id as any)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition ${
                        statusFilter === f.id
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <AcademyStudentsTable
                students={filteredStudents}
                loading={loadingStudents}
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                suspendingId={suspendingId}
                onToggleSuspend={handleToggleSuspend}
                onOpenManualEnroll={() => setIsEnrollModalOpen(true)}
              />
            </div>
          )}

          {/* TAB 2: Submissions Review */}
          {activeTab === "submissions" && (
            <AcademyStudentsSubmissionsTab
              submissions={submissions}
              loading={loadingSubmissions}
              onSaveReview={handleSaveReview}
            />
          )}
        </>
      )}

      {/* Manual Student Enrollment Modal */}
      <AcademyManualEnrollModal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        onEnroll={handleManualEnroll}
      />
    </div>
  );
}
