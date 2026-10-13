import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Award,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  ExternalLink,
  Check,
  X,
  Sparkles,
  Filter,
  Loader2,
  Ban,
  RotateCcw,
  Search,
  UserPlus,
  MessageCircle,
  GraduationCap,
  Calendar,
  BookOpen,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";
import {
  academyApi,
  Course,
  StudentProgressRow,
  ExerciseSubmission,
} from "./academyApi";

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
  const [selectedSubmission, setSelectedSubmission] = useState<ExerciseSubmission | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewingAction, setReviewingAction] = useState<"ACCEPTED" | "REJECTED" | "NEEDS_MORE" | null>(null);
  const [submissionFilter, setSubmissionFilter] = useState<string>("ALL");

  // Manual enrollment modal
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentPhone, setNewStudentPhone] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [newStudentDays, setNewStudentDays] = useState("");
  const [isEnrollingManual, setIsEnrollingManual] = useState(false);

  // Suspend action
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
      }
      setError(null);
    } catch (err: any) {
      const msg = err?.response?.data?.error || "فشل تحميل بيانات الكورسات والطلاب";
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
      toast.error(err?.response?.data?.error || "فشل تحميل الطلاب للدورة المحددة");
    } finally {
      setLoadingStudents(false);
    }
  };

  const loadSubmissions = async (cId: string) => {
    try {
      setLoadingSubmissions(true);
      const data = await academyApi.getCourseSubmissions(cId);
      setSubmissions(data);
    } catch (err: any) {
      console.error("Failed to load course submissions:", err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleCourseChange = (cId: string) => {
    setSelectedCourseId(cId);
    setSearchQuery("");
    setStatusFilter("ALL");
    setSubmissionFilter("ALL");
    loadStudents(cId);
    loadSubmissions(cId);
  };

  const handleOpenReview = (sub: ExerciseSubmission) => {
    setSelectedSubmission(sub);
    setReviewNote(sub.instructorNote || "");
  };

  const handleSaveReview = async (newStatus: "ACCEPTED" | "REJECTED" | "NEEDS_MORE") => {
    if (!selectedSubmission) return;
    try {
      setReviewingAction(newStatus);
      const updated = await academyApi.reviewSubmission(selectedSubmission.id, {
        status: newStatus,
        instructorNote: reviewNote.trim() || undefined,
      });

      setSubmissions((prev) =>
        prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
      );
      setSelectedSubmission({ ...selectedSubmission, ...updated });
      toast.success(
        newStatus === "ACCEPTED"
          ? "تم اعتماد وقبول تسليم الطالب واحتساب إكمال الدرس."
          : newStatus === "REJECTED"
          ? "تم طلب تعديل وإعادة التسليم من الطالب."
          : "تم حفظ طلب التوضيح وإرساله للطالب."
      );
      if (selectedCourseId) loadStudents(selectedCourseId);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "فشل حفظ المراجعة");
    } finally {
      setReviewingAction(null);
    }
  };

  const handleToggleSuspend = async (student: StudentProgressRow) => {
    const isSuspended = student.status === "SUSPENDED";
    try {
      setSuspendingId(student.id);
      if (isSuspended) {
        await academyApi.reactivateEnrollment(student.id);
        toast.success(`تم إعادة تفعيل اشتراك الطالب ${student.studentName || ""}`);
      } else {
        await academyApi.suspendEnrollment(student.id);
        toast.warning(`تم إيقاف اشتراك الطالب ${student.studentName || ""}`);
      }
      setStudents((prev) =>
        prev.map((s) =>
          s.id === student.id
            ? { ...s, status: isSuspended ? "ACTIVE" : "SUSPENDED" }
            : s
        )
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "فشل تعديل حالة الاشتراك");
    } finally {
      setSuspendingId(null);
    }
  };

  const handleManualEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) {
      toast.error("يرجى اختيار دورة تدريبية أولاً");
      return;
    }
    if (!newStudentName.trim() || !newStudentPhone.trim()) {
      toast.error("يرجى إدخال اسم الطالب ورقم هاتفه");
      return;
    }

    try {
      setIsEnrollingManual(true);
      await academyApi.enrollStudent(selectedCourseId, {
        studentName: newStudentName.trim(),
        studentPhone: newStudentPhone.trim(),
        studentEmail: newStudentEmail.trim() || undefined,
        subscriptionDays: newStudentDays && parseInt(newStudentDays, 10) > 0 ? parseInt(newStudentDays, 10) : undefined,
      });

      toast.success(`تم تسجيل الطالب "${newStudentName}" في الدورة بنجاح.`);
      setIsEnrollModalOpen(false);
      setNewStudentName("");
      setNewStudentPhone("");
      setNewStudentEmail("");
      setNewStudentDays("");

      await loadStudents(selectedCourseId);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "فشل تسجيل الطالب");
    } finally {
      setIsEnrollingManual(false);
    }
  };

  // KPIs
  const totalStudents = students.length;
  const completedStudents = students.filter((s) => s.hasCertificate || s.progressPercent === 100).length;
  const inProgressStudents = students.filter((s) => s.status === "ACTIVE" && !s.isExpired && !s.hasCertificate && s.progressPercent < 100).length;
  const pendingSubmissionsCount = submissions.filter(
    (s) => s.status === "PENDING" || s.status === "NEEDS_MORE"
  ).length;

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (statusFilter === "ACTIVE" && (s.status !== "ACTIVE" || s.isExpired)) return false;
      if (statusFilter === "COMPLETED" && !(s.hasCertificate || s.progressPercent === 100)) return false;
      if (statusFilter === "SUSPENDED" && s.status !== "SUSPENDED") return false;
      if (statusFilter === "EXPIRED" && !s.isExpired) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const name = (s.studentName || "").toLowerCase();
      const phone = (s.studentPhone || "").toLowerCase();
      const email = (s.studentEmail || "").toLowerCase();
      return name.includes(q) || phone.includes(q) || email.includes(q);
    });
  }, [students, statusFilter, searchQuery]);

  // Filtered Submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      if (submissionFilter === "ALL") return true;
      return s.status === submissionFilter;
    });
  }, [submissions, submissionFilter]);

  // Format WhatsApp Link
  const getWhatsAppLink = (phone?: string) => {
    if (!phone) return null;
    const clean = phone.replace(/[^0-9]/g, "");
    const formatted = clean.startsWith("0") ? `2${clean}` : clean;
    return `https://wa.me/${formatted}`;
  };

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-background text-foreground p-3.5 sm:p-6 space-y-6" dir="rtl">
      {/* Top Command Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <span>متابعة الطلاب والتقييم الأكاديمي</span>
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/70 tabular-nums">
              {students.length} مشترك
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            متابعة نسب إنجاز الدروس، تصحيح التمارين العملية، وإدارة اشتراكات الطلاب
          </p>
        </div>

        {courses.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="w-full sm:w-60">
              <select
                value={selectedCourseId}
                onChange={(e) => handleCourseChange(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-card border border-border/70 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setIsEnrollModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-xs active:scale-[0.98]"
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
          <h2 className="text-base font-bold text-foreground">
            لم تقم بإنشاء أي دورة تدريبية بعد
          </h2>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            للبدء في متابعة الطلاب، تصحيح التمارين بالذكاء الاصطناعي، وإصدار الشهادات المعتمدة، يجب أولاً إنشاء دورتك التدريبية الأولى ونشر دروسها.
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-card border border-border/70 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] text-muted-foreground font-medium">إجمالي المسجلين</span>
                <div className="text-xl sm:text-2xl font-bold text-foreground mt-0.5 font-mono tabular-nums">{totalStudents}</div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-card border border-border/70 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] text-muted-foreground font-medium">أكملوا وحصلوا على شهادة</span>
                <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono tabular-nums">{completedStudents}</div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-card border border-border/70 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] text-muted-foreground font-medium">قيد التعلم والمتابعة</span>
                <div className="text-xl sm:text-2xl font-bold text-primary mt-0.5 font-mono tabular-nums">{inProgressStudents}</div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-card border border-border/70 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] text-muted-foreground font-medium">تسليمات بحاجة لمراجعة</span>
                <div className="text-xl sm:text-2xl font-bold text-amber-500 mt-0.5 font-mono tabular-nums">{pendingSubmissionsCount}</div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
            </div>
          </div>

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

              {loadingStudents ? (
                <div className="py-16 text-center space-y-2">
                  <Loader2 className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto text-primary" />
                  <p className="text-xs text-muted-foreground">جاري تحميل بيانات الطلاب...</p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="p-8 sm:p-12 rounded-xl bg-card border border-dashed border-border/80 text-center space-y-2 shadow-xs">
                  <Users className="w-8 h-8 text-muted-foreground/50 mx-auto" />
                  <h3 className="text-xs sm:text-sm font-bold text-foreground">
                    {searchQuery || statusFilter !== "ALL"
                      ? "لا توجد نتائج مطابقة لمعايير البحث والتصفية"
                      : "لا يوجد طلاب مسجلين في هذه الدورة بعد"}
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    {searchQuery || statusFilter !== "ALL"
                      ? "جرّب تغيير كلمات البحث أو مسح الفلتر لإظهار بقية الطلاب."
                      : "يمكنك إضافة طالب يدوياً الآن أو انتظار تسجيل الطلاب عبر المتجر أو رابط الكورس."}
                  </p>
                  {!searchQuery && statusFilter === "ALL" && (
                    <button
                      onClick={() => setIsEnrollModalOpen(true)}
                      className="mt-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
                    >
                      تسجيل أول طالب الآن
                    </button>
                  )}
                </div>
              ) : (
                <div className="rounded-xl bg-card border border-border/70 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs text-foreground">
                      <thead className="bg-muted/40 border-b border-border/70 text-muted-foreground font-semibold">
                        <tr>
                          <th className="p-3 sm:p-3.5">اسم الطالب</th>
                          <th className="p-3 sm:p-3.5">الهاتف / واتساب</th>
                          <th className="p-3 sm:p-3.5">نسبة الإكمال</th>
                          <th className="p-3 sm:p-3.5">الدروس المنجزة</th>
                          <th className="p-3 sm:p-3.5">الشهادة</th>
                          <th className="p-3 sm:p-3.5">انتهاء الاشتراك</th>
                          <th className="p-3 sm:p-3.5">تاريخ التسجيل</th>
                          <th className="p-3 sm:p-3.5 text-center">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {filteredStudents.map((st) => {
                          const waLink = getWhatsAppLink(st.studentPhone);

                          return (
                            <tr
                              key={st.id}
                              className={`hover:bg-muted/20 transition ${st.status === "SUSPENDED" ? "opacity-60 bg-muted/10" : ""}`}
                            >
                              <td className="p-3 sm:p-3.5 font-bold text-foreground">
                                <div className="flex items-center gap-1.5">
                                  {st.status === "SUSPENDED" && (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                      موقوف
                                    </span>
                                  )}
                                  {st.isExpired && st.status !== "SUSPENDED" && (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                      منتهي
                                    </span>
                                  )}
                                  <div>
                                    <div>{st.studentName || "طالب"}</div>
                                    {st.studentEmail && (
                                      <div className="text-[10px] text-muted-foreground font-normal">{st.studentEmail}</div>
                                    )}
                                    {st.orderId && (
                                      <div className="text-[10px] text-sky-600 dark:text-sky-400 font-mono mt-0.5" title={`مسجل عبر الطلب: ${st.orderId}`}>
                                        طلب رقم: {st.orderId.slice(-8)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td className="p-3 sm:p-3.5 font-mono text-muted-foreground">
                                {st.studentPhone ? (
                                  <div className="flex items-center gap-1.5">
                                    <span>{st.studentPhone}</span>
                                    {waLink && (
                                      <a
                                        href={waLink}
                                        target="_blank"
                                        rel="noreferrer"
                                        title="مراسلة عبر واتساب"
                                        className="p-1 rounded text-emerald-600 hover:bg-emerald-500/10 transition"
                                      >
                                        <MessageCircle className="w-3 h-3" />
                                      </a>
                                    )}
                                  </div>
                                ) : (
                                  "—"
                                )}
                              </td>

                              <td className="p-3 sm:p-3.5">
                                <div className="flex items-center gap-2">
                                  <div className="w-16 bg-muted rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className="bg-primary h-1.5 rounded-full transition-all duration-300"
                                      style={{ width: `${st.progressPercent}%` }}
                                    />
                                  </div>
                                  <span className="font-bold text-primary font-mono tabular-nums">{st.progressPercent}%</span>
                                </div>
                              </td>

                              <td className="p-3 sm:p-3.5 text-muted-foreground font-mono tabular-nums">
                                {st.completedLessonsCount} / {st.totalLessonsCount} درس
                              </td>

                              <td className="p-3 sm:p-3.5">
                                {st.hasCertificate ? (
                                  <a
                                    href={`/api/v1/academy/certificates/${st.id}/view`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-500 hover:text-amber-600 dark:text-amber-400 hover:underline"
                                  >
                                    <Award className="w-3 h-3" />
                                    <span>معتمدة ({st.certificateNumber})</span>
                                  </a>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground">قيد التقدم</span>
                                )}
                              </td>

                              <td className="p-3 sm:p-3.5 font-mono tabular-nums">
                                {st.expiresAt ? (
                                  <span className={st.isExpired ? "text-rose-500 font-bold" : "text-muted-foreground"}>
                                    {new Date(st.expiresAt).toLocaleDateString("ar-EG")}
                                    {st.isExpired && " (منتهي)"}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-[11px]">مؤبد</span>
                                )}
                              </td>

                              <td className="p-3 sm:p-3.5 text-muted-foreground font-mono tabular-nums">
                                {new Date(st.enrolledAt).toLocaleDateString("ar-EG")}
                              </td>

                              <td className="p-3 sm:p-3.5 text-center">
                                <button
                                  onClick={() => handleToggleSuspend(st)}
                                  disabled={suspendingId === st.id}
                                  title={st.status === "SUSPENDED" ? "إعادة تفعيل الاشتراك" : "إيقاف الاشتراك"}
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold transition disabled:opacity-50 ${
                                    st.status === "SUSPENDED"
                                      ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/20"
                                      : "bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border border-rose-500/20"
                                  }`}
                                >
                                  {suspendingId === st.id ? (
                                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                  ) : st.status === "SUSPENDED" ? (
                                    <RotateCcw className="w-2.5 h-2.5" />
                                  ) : (
                                    <Ban className="w-2.5 h-2.5" />
                                  )}
                                  <span>{st.status === "SUSPENDED" ? "تفعيل" : "إيقاف"}</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Exercise Submissions Table & Instructor Review Drawer */}
          {activeTab === "submissions" && (
            <div className="space-y-3">
              {/* Submissions Filter */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-medium">تصفية حسب الحالة:</span>
                  <div className="flex items-center gap-1 flex-wrap">
                    {[
                      { id: "ALL", label: "الكل" },
                      { id: "PENDING", label: "معلق / قيد المراجعة" },
                      { id: "ACCEPTED", label: "مقبول" },
                      { id: "REJECTED", label: "مرفوض / ناقص" },
                      { id: "NEEDS_MORE", label: "بحاجة لتوضيح" },
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setSubmissionFilter(f.id)}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                          submissionFilter === f.id
                            ? "bg-primary/10 text-primary border border-primary/30"
                            : "bg-muted/40 text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground font-mono tabular-nums">
                  {filteredSubmissions.length} تسليم
                </span>
              </div>

              {loadingSubmissions ? (
                <div className="py-16 text-center space-y-2">
                  <Loader2 className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto text-primary" />
                  <p className="text-xs text-muted-foreground">جاري تحميل تسليمات التمارين...</p>
                </div>
              ) : filteredSubmissions.length === 0 ? (
                <div className="p-8 sm:p-12 rounded-xl bg-card border border-dashed border-border/80 text-center space-y-2 shadow-xs">
                  <FileText className="w-8 h-8 text-muted-foreground/50 mx-auto" />
                  <h3 className="text-xs sm:text-sm font-bold text-foreground">لا توجد تسليمات تطابق الفلتر المحدد</h3>
                  <p className="text-xs text-muted-foreground">
                    تظهر هنا حلول الطلاب للتمارين فور إرسالها للتقييم والمراجعة.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl bg-card border border-border/70 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs text-foreground">
                      <thead className="bg-muted/40 border-b border-border/70 text-muted-foreground font-semibold">
                        <tr>
                          <th className="p-3 sm:p-3.5">الطالب</th>
                          <th className="p-3 sm:p-3.5">الدرس</th>
                          <th className="p-3 sm:p-3.5">حالة المصحح الذكي</th>
                          <th className="p-3 sm:p-3.5">رأي المصحح</th>
                          <th className="p-3 sm:p-3.5">تاريخ التسليم</th>
                          <th className="p-3 sm:p-3.5 text-center">إجراءات المراجعة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {filteredSubmissions.map((sub) => {
                          const verdict = sub.status;
                          const ai = sub.aiVerdictJson;

                          return (
                            <tr key={sub.id} className="hover:bg-muted/20 transition">
                              <td className="p-3 sm:p-3.5 font-bold text-foreground">
                                <div>{sub.studentName || "طالب"}</div>
                                {sub.studentPhone && (
                                  <div className="text-[10px] text-muted-foreground font-mono">{sub.studentPhone}</div>
                                )}
                              </td>
                              <td className="p-3 sm:p-3.5 font-medium text-foreground">
                                {sub.lessonTitle || `درس ${sub.lessonSortOrder || ""}`}
                              </td>
                              <td className="p-3 sm:p-3.5">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold inline-flex items-center gap-1 ${
                                    verdict === "ACCEPTED"
                                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                      : verdict === "REJECTED"
                                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                                      : verdict === "NEEDS_MORE"
                                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                      : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30"
                                  }`}
                                >
                                  {verdict === "ACCEPTED" && <Check className="w-2.5 h-2.5" />}
                                  {verdict === "REJECTED" && <X className="w-2.5 h-2.5" />}
                                  <span>
                                    {verdict === "ACCEPTED"
                                      ? "مقبول"
                                      : verdict === "REJECTED"
                                      ? "ناقص / مرفوض"
                                      : verdict === "NEEDS_MORE"
                                      ? "بحاجة لتوضيح"
                                      : "معلق"}
                                  </span>
                                </span>
                              </td>
                              <td className="p-3 sm:p-3.5 max-w-xs text-muted-foreground truncate" title={ai?.coachLine}>
                                {ai?.coachLine || sub.aiFeedback || "—"}
                              </td>
                              <td className="p-3 sm:p-3.5 text-muted-foreground font-mono tabular-nums">
                                {new Date(sub.createdAt).toLocaleDateString("ar-EG")}
                              </td>
                              <td className="p-3 sm:p-3.5 text-center">
                                <button
                                  onClick={() => handleOpenReview(sub)}
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 border border-primary/25 transition shadow-xs"
                                >
                                  فحص واعتماد
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Manual Student Enrollment Modal */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6" dir="rtl">
          <div className="bg-card border border-border/80 rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-primary" />
                <span>تسجيل طالب يدوياً في الدورة</span>
              </h3>
              <button
                onClick={() => setIsEnrollModalOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleManualEnroll} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">اسم الطالب *</label>
                <input
                  type="text"
                  required
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="مثال: محمد عبد الله"
                  className="w-full px-3 py-2 rounded-lg bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">رقم الهاتف / واتساب *</label>
                <input
                  type="tel"
                  required
                  value={newStudentPhone}
                  onChange={(e) => setNewStudentPhone(e.target.value)}
                  placeholder="010XXXXXXXX"
                  className="w-full px-3 py-2 rounded-lg bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">البريد الإلكتروني (اختياري)</label>
                <input
                  type="email"
                  value={newStudentEmail}
                  onChange={(e) => setNewStudentEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="w-full px-3 py-2 rounded-lg bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">مدة الاشتراك بالأيام (اتركه فارغاً للاشتراك المؤبد)</label>
                <input
                  type="number"
                  min="1"
                  value={newStudentDays}
                  onChange={(e) => setNewStudentDays(e.target.value)}
                  placeholder="مثال: 90 أو 365"
                  className="w-full px-3 py-2 rounded-lg bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/70">
                <button
                  type="button"
                  onClick={() => setIsEnrollModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isEnrollingManual}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isEnrollingManual && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>تأكيد التسجيل</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Drawer / Modal for Instructor */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6" dir="rtl">
          <div className="bg-card border border-border/80 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span>مراجعة تسليم الطالب: {selectedSubmission.studentName}</span>
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                  الدرس: {selectedSubmission.lessonTitle} — تاريخ التسليم: {new Date(selectedSubmission.createdAt).toLocaleString("ar-EG")}
                </p>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition text-sm"
              >
                ✕
              </button>
            </div>

            {/* Student's answer text */}
            <div className="space-y-1">
              <span className="text-xs font-semibold text-foreground block">إجابة وتطبيق الطالب:</span>
              <div className="p-3.5 rounded-xl bg-muted/20 border border-border/70 text-xs text-foreground whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto font-sans">
                {selectedSubmission.submissionText || "لم يكتب الطالب نصاً، واعتمد على رابط المرفق."}
              </div>
            </div>

            {/* Student's link / screenshot */}
            {selectedSubmission.submissionUrl && (
              <div className="space-y-1">
                <span className="text-xs font-semibold text-foreground block">رابط المرفقات / اللقطة:</span>
                <a
                  href={selectedSubmission.submissionUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>فتح الرابط المرفق للمعاينة: {selectedSubmission.submissionUrl}</span>
                </a>
              </div>
            )}

            {/* AI Grader Verdict */}
            {selectedSubmission.aiVerdictJson && (
              <div className="p-3.5 rounded-xl bg-muted/30 border border-border/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span>تقييم المصحح الذكي (AI Grader):</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-primary">
                    {selectedSubmission.aiVerdictJson.verdict}
                  </span>
                </div>

                {selectedSubmission.aiVerdictJson.coachLine && (
                  <p className="text-xs text-muted-foreground">
                    {selectedSubmission.aiVerdictJson.coachLine}
                  </p>
                )}

                {Array.isArray(selectedSubmission.aiVerdictJson.missing) &&
                  selectedSubmission.aiVerdictJson.missing.length > 0 && (
                    <div className="pt-1 space-y-1">
                      <span className="text-[11px] font-bold text-rose-500 block">البنود الناقصة المكتشفة:</span>
                      <ul className="text-xs space-y-0.5 text-muted-foreground pr-2">
                        {selectedSubmission.aiVerdictJson.missing.map((item: string, idx: number) => (
                          <li key={idx}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            )}

            {/* Instructor Feedback Note */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground block">
                ملاحظة المدرب البشري (تظهر للطالب في واجهة الدرس):
              </label>
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="اكتب توجيهاتك أو ملاحظاتك للطالب..."
                rows={3}
                className="w-full p-2.5 rounded-lg bg-background border border-input text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs leading-relaxed"
              />
            </div>

            {/* Decision Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/70 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground transition"
              >
                إغلاق
              </button>

              <button
                type="button"
                disabled={reviewingAction !== null}
                onClick={() => handleSaveReview("REJECTED")}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition disabled:opacity-50 flex items-center gap-1"
              >
                {reviewingAction === "REJECTED" ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <X className="w-3 h-3" />
                )}
                <span>طلب تعديل (رفض)</span>
              </button>

              <button
                type="button"
                disabled={reviewingAction !== null}
                onClick={() => handleSaveReview("NEEDS_MORE")}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-xs transition disabled:opacity-50 flex items-center gap-1"
              >
                {reviewingAction === "NEEDS_MORE" ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <AlertCircle className="w-3 h-3" />
                )}
                <span>طلب توضيح</span>
              </button>

              <button
                type="button"
                disabled={reviewingAction !== null}
                onClick={() => handleSaveReview("ACCEPTED")}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition disabled:opacity-50 flex items-center gap-1"
              >
                {reviewingAction === "ACCEPTED" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>اعتماد وقبول</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
