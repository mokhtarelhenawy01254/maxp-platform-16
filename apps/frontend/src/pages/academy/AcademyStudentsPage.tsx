import { useEffect, useState } from "react";
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
} from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active top tab: 'students' | 'submissions'
  const [activeTab, setActiveTab] = useState<"students" | "submissions">("students");

  // Submissions state
  const [submissions, setSubmissions] = useState<ExerciseSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<ExerciseSubmission | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [submissionFilter, setSubmissionFilter] = useState<string>("ALL");

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
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
      setError(err?.response?.data?.error || "فشل تحميل بيانات الطلاب");
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async (cId: string) => {
    try {
      setLoading(true);
      const data = await academyApi.getStudentsProgress(cId);
      setStudents(data);
    } catch (err: any) {
      alert(err?.response?.data?.error || "فشل تحميل الطلاب للدورة المحددة");
    } finally {
      setLoading(false);
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
      setReviewing(true);
      const updated = await academyApi.reviewSubmission(selectedSubmission.id, {
        status: newStatus,
        instructorNote: reviewNote.trim() || undefined,
      });

      setSubmissions((prev) =>
        prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
      );
      setSelectedSubmission({ ...selectedSubmission, ...updated });
      alert("تم حفظ المراجعة واعتماد قرار المدرب بنجاح.");
    } catch (err: any) {
      alert(err?.response?.data?.error || "فشل حفظ المراجعة");
    } finally {
      setReviewing(false);
    }
  };

  // إيقاف / تفعيل اشتراك طالب
  const [suspending, setSuspending] = useState<string | null>(null);
  const handleToggleSuspend = async (student: StudentProgressRow) => {
    const isSuspended = student.status === "SUSPENDED";
    const confirmMsg = isSuspended
      ? `إعادة تفعيل اشتراك "${student.studentName}"؟`
      : `إيقاف اشتراك "${student.studentName}"؟ لن يتمكن من الوصول للكورس.`;
    if (!window.confirm(confirmMsg)) return;
    try {
      setSuspending(student.id);
      if (isSuspended) {
        await academyApi.reactivateEnrollment(student.id);
      } else {
        await academyApi.suspendEnrollment(student.id);
      }
      // تحديث القائمة محلياً
      setStudents((prev) =>
        prev.map((s) =>
          s.id === student.id
            ? { ...s, status: isSuspended ? "ACTIVE" : "SUSPENDED" }
            : s
        )
      );
    } catch (err: any) {
      alert(err?.response?.data?.error || "فشل تعديل الاشتراك");
    } finally {
      setSuspending(null);
    }
  };

  const totalStudents = students.length;
  const completedStudents = students.filter((s) => s.hasCertificate || s.progressPercent === 100).length;
  const inProgressStudents = totalStudents - completedStudents;

  const pendingSubmissionsCount = submissions.filter(
    (s) => s.status === "PENDING" || s.status === "NEEDS_MORE"
  ).length;

  const filteredSubmissions = submissions.filter((s) => {
    if (submissionFilter === "ALL") return true;
    return s.status === submissionFilter;
  });

  return (
    <div className="min-h-screen bg-background text-foreground p-3 sm:p-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/60">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-foreground flex items-center gap-2 tracking-tight">
            <Users className="w-6 h-6 text-primary" />
            <span>متابعة الطلاب والتقييم الأكاديمي</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            متابعة نسب إكمال الدروس، تصحيح التمارين العملية، ومراجعة تسليمات مسطرة الكورس
          </p>
        </div>

        {courses.length > 0 && (
          <div className="w-full sm:w-72">
            <select
              value={selectedCourseId}
              onChange={(e) => handleCourseChange(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Stats Bar */}
      {courses.length > 0 && !loading && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground font-medium">إجمالي المسجلين</span>
              <div className="text-2xl font-extrabold text-foreground mt-1 font-mono">{totalStudents}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground font-medium">أكملوا الدورة بنجاح</span>
              <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">{completedStudents}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground font-medium">قيد التعلّم والمتابعة</span>
              <div className="text-2xl font-extrabold text-primary mt-1 font-mono">{inProgressStudents}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground font-medium">تسليمات بحاجة لمراجعة</span>
              <div className="text-2xl font-extrabold text-amber-500 mt-1 font-mono">{pendingSubmissionsCount}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Tabs Switcher: Students Progress vs Exercise Submissions */}
      <div className="mt-8 flex items-center gap-2 border-b border-border/60 pb-3">
        <button
          onClick={() => setActiveTab("students")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
            activeTab === "students"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>سجل الطلاب ونسب الإنجاز ({students.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("submissions")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
            activeTab === "submissions"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>تسليمات التمارين العملية ({submissions.length})</span>
          {pendingSubmissionsCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-mono">
              {pendingSubmissionsCount}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: Students Progress Table */}
      {activeTab === "students" && (
        <div className="mt-6">
          {loading ? (
            <div className="py-16 text-center space-y-2">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">جاري تحميل بيانات الطلاب...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="p-12 rounded-2xl sm:rounded-3xl bg-card border border-dashed border-border/80 text-center space-y-2 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-foreground">لا يوجد طلاب مسجلين في هذه الدورة بعد</h3>
              <p className="text-xs text-muted-foreground">
                سيظهر هنا كل طالب فور شرائه الدورة من المتجر أو تسجيله عبر بوابة الطلاب.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl sm:rounded-3xl bg-card border border-border/60 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs text-foreground">
                  <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground font-semibold">
                    <tr>
                      <th className="p-3.5 sm:p-4">اسم الطالب</th>
                      <th className="p-3.5 sm:p-4">الهاتف / واتساب</th>
                      <th className="p-3.5 sm:p-4">نسبة الإكمال</th>
                      <th className="p-3.5 sm:p-4">الدروس المنجزة</th>
                      <th className="p-3.5 sm:p-4">الشهادة</th>
                      <th className="p-3.5 sm:p-4">انتهاء الاشتراك</th>
                      <th className="p-3.5 sm:p-4">تاريخ التسجيل</th>
                      <th className="p-3.5 sm:p-4 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {students.map((st) => (
                      <tr
                        key={st.id}
                        className={`hover:bg-muted/30 transition ${st.status === "SUSPENDED" ? "opacity-60" : ""}`}
                      >
                        <td className="p-3.5 sm:p-4 font-bold text-foreground">
                          <div className="flex items-center gap-1.5">
                            {st.status === "SUSPENDED" && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                موقوف
                              </span>
                            )}
                            {st.isExpired && st.status !== "SUSPENDED" && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                منتهي
                              </span>
                            )}
                            {st.studentName || "طالب"}
                          </div>
                        </td>
                        <td className="p-3.5 sm:p-4 font-mono text-muted-foreground">{st.studentPhone || "—"}</td>
                        <td className="p-3.5 sm:p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-muted rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-primary h-2 rounded-full transition-all duration-300"
                                style={{ width: `${st.progressPercent}%` }}
                              />
                            </div>
                            <span className="font-bold text-primary font-mono">{st.progressPercent}%</span>
                          </div>
                        </td>
                        <td className="p-3.5 sm:p-4 text-muted-foreground font-mono">
                          {st.completedLessonsCount} من {st.totalLessonsCount} درس
                        </td>
                        <td className="p-3.5 sm:p-4">
                          {st.hasCertificate ? (
                            <a
                              href={`/api/v1/academy/certificates/${st.id}/view`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-500 hover:text-amber-600 dark:text-amber-400 hover:underline"
                            >
                              <Award className="w-3.5 h-3.5" />
                              <span>معتمدة ({st.certificateNumber})</span>
                            </a>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">قيد التقدم</span>
                          )}
                        </td>
                        <td className="p-3.5 sm:p-4 font-mono">
                          {st.expiresAt ? (
                            <span className={st.isExpired ? "text-rose-500 font-bold" : "text-muted-foreground"}>
                              {new Date(st.expiresAt).toLocaleDateString("ar-EG")}
                              {st.isExpired && " (منتهي)"}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">مؤبد</span>
                          )}
                        </td>
                        <td className="p-3.5 sm:p-4 text-muted-foreground font-mono">
                          {new Date(st.enrolledAt).toLocaleDateString("ar-EG")}
                        </td>
                        <td className="p-3.5 sm:p-4 text-center">
                          <button
                            onClick={() => handleToggleSuspend(st)}
                            disabled={suspending === st.id}
                            title={st.status === "SUSPENDED" ? "إعادة تفعيل الاشتراك" : "إيقاف الاشتراك"}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition disabled:opacity-50 ${
                              st.status === "SUSPENDED"
                                ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border border-rose-500/20"
                            }`}
                          >
                            {suspending === st.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : st.status === "SUSPENDED" ? (
                              <RotateCcw className="w-3 h-3" />
                            ) : (
                              <Ban className="w-3 h-3" />
                            )}
                            <span>{st.status === "SUSPENDED" ? "تفعيل" : "إيقاف"}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Exercise Submissions Table & Instructor Review Drawer */}
      {activeTab === "submissions" && (
        <div className="mt-6 space-y-4">
          {/* Submissions Filter */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">تصفية حسب الحالة:</span>
              <div className="flex items-center gap-1.5">
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
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
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
            <span className="text-xs text-muted-foreground font-mono">
              {filteredSubmissions.length} تسليم
            </span>
          </div>

          {loadingSubmissions ? (
            <div className="py-16 text-center space-y-2">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">جاري تحميل تسليمات التمارين...</p>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="p-12 rounded-2xl sm:rounded-3xl bg-card border border-dashed border-border/80 text-center space-y-2 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-foreground">لا توجد تسليمات تطابق الفلتر المحدد</h3>
              <p className="text-xs text-muted-foreground">
                تظهر هنا حلول الطلاب للتمارين فور إرسالها للتقييم الآلي.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl sm:rounded-3xl bg-card border border-border/60 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs text-foreground">
                  <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground font-semibold">
                    <tr>
                      <th className="p-3.5 sm:p-4">الطالب</th>
                      <th className="p-3.5 sm:p-4">الدرس</th>
                      <th className="p-3.5 sm:p-4">حالة المصحح الذكي</th>
                      <th className="p-3.5 sm:p-4">رأي المصحح</th>
                      <th className="p-3.5 sm:p-4">تاريخ التسليم</th>
                      <th className="p-3.5 sm:p-4 text-center">إجراءات المراجعة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredSubmissions.map((sub) => {
                      const verdict = sub.status;
                      const ai = sub.aiVerdictJson;

                      return (
                        <tr key={sub.id} className="hover:bg-muted/30 transition">
                          <td className="p-3.5 sm:p-4 font-bold text-foreground">
                            <div>{sub.studentName || "طالب"}</div>
                            {sub.studentPhone && (
                              <div className="text-[10px] text-muted-foreground font-mono">{sub.studentPhone}</div>
                            )}
                          </td>
                          <td className="p-3.5 sm:p-4 font-medium text-foreground">
                            {sub.lessonTitle || `درس ${sub.lessonSortOrder || ""}`}
                          </td>
                          <td className="p-3.5 sm:p-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${
                                verdict === "ACCEPTED"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                  : verdict === "REJECTED"
                                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                                  : verdict === "NEEDS_MORE"
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                  : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30"
                              }`}
                            >
                              {verdict === "ACCEPTED" && <Check className="w-3 h-3" />}
                              {verdict === "REJECTED" && <X className="w-3 h-3" />}
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
                          <td className="p-3.5 sm:p-4 max-w-xs text-muted-foreground truncate" title={ai?.coachLine}>
                            {ai?.coachLine || sub.aiFeedback || "—"}
                          </td>
                          <td className="p-3.5 sm:p-4 text-muted-foreground font-mono">
                            {new Date(sub.createdAt).toLocaleDateString("ar-EG")}
                          </td>
                          <td className="p-3.5 sm:p-4 text-center">
                            <button
                              onClick={() => handleOpenReview(sub)}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 border border-primary/25 transition shadow-xs"
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

      {/* Slide-over Review Drawer / Modal for Instructor */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6" dir="rtl">
          <div className="bg-card border border-border/80 rounded-2xl sm:rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-7 space-y-5 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <span>مراجعة تسليم الطالب: {selectedSubmission.studentName}</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  الدرس: {selectedSubmission.lessonTitle} — تاريخ التسليم: {new Date(selectedSubmission.createdAt).toLocaleString("ar-EG")}
                </p>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="p-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Student's answer text */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-foreground block">إجابة وتطبيق الطالب:</span>
              <div className="p-4 rounded-xl bg-muted/30 border border-border/60 text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto font-sans">
                {selectedSubmission.submissionText || "لم يكتب الطالب نصاً، واعتمد على رابط المرفق."}
              </div>
            </div>

            {/* Student's link / screenshot */}
            {selectedSubmission.submissionUrl && (
              <div className="space-y-1">
                <span className="text-xs font-bold text-foreground block">رابط المرفقات / اللقطة:</span>
                <a
                  href={selectedSubmission.submissionUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline bg-primary/10 px-3 py-2 rounded-xl border border-primary/20"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>فتح الرابط المرفق للمعاينة: {selectedSubmission.submissionUrl}</span>
                </a>
              </div>
            )}

            {/* AI Grader Verdict & Missing items */}
            {selectedSubmission.aiVerdictJson && (
              <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-primary" />
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
                      <ul className="text-xs space-y-1 text-muted-foreground pr-2">
                        {selectedSubmission.aiVerdictJson.missing.map((item: string, idx: number) => (
                          <li key={idx}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            )}

            {/* Instructor Feedback Note */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground block">
                ملاحظة المدرب البشري (تظهر للطالب في واجهة الدرس):
              </label>
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="اكتب توجيهاتك أو ملاحظاتك للطالب..."
                rows={3}
                className="w-full p-3 rounded-xl bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs leading-relaxed"
              />
            </div>

            {/* Decision Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground transition"
              >
                إغلاق
              </button>

              <button
                type="button"
                disabled={reviewing}
                onClick={() => handleSaveReview("REJECTED")}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                <span>طلب إعادة وتعديل (رفض)</span>
              </button>

              <button
                type="button"
                disabled={reviewing}
                onClick={() => handleSaveReview("NEEDS_MORE")}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>طلب توضيح إضافي</span>
              </button>

              <button
                type="button"
                disabled={reviewing}
                onClick={() => handleSaveReview("ACCEPTED")}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {reviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>اعتماد وقبول التسليم</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
