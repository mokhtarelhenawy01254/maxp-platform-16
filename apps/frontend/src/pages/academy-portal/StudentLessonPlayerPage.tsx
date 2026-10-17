import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  PlayCircle,
  FileText,
  Dumbbell,
  Loader2,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { LessonCoachChat } from "./components/LessonCoachChat";
import { LessonSyllabusSidebar, SidebarModule } from "./components/LessonSyllabusSidebar";
import { LessonQuizPanel } from "./components/LessonQuizPanel";
import { LessonExercisePanel } from "./components/LessonExercisePanel";

interface LessonContent {
  lesson: {
    id: string;
    title: string;
    durationMin: number;
    videoUrl: string | null;
    scriptText: string | null;
    exerciseText: string | null;
    isFreePreview: boolean;
  };
  quiz: {
    id?: string;
    title?: string;
    passScorePercent: number;
    questions: Array<{ id?: string; q: string; options: string[] }>;
  } | null;
  isEnrolled: boolean;
  enableWatermark: boolean;
  studentInfo: {
    name: string;
    phone: string;
    email: string;
  };
  progress: {
    status: "NOT_STARTED" | "IN_PROGRESS" | "DONE";
    quizScore?: number | null;
    enrollmentId?: string;
  } | null;
}

const FALLBACK_COURSE_ID = "cmuzmwaxs07r2juml2v04xon5";

const StudentLessonPlayerPage: React.FC = () => {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const [content, setContent] = useState<LessonContent | null>(null);
  const [outlineModules, setOutlineModules] = useState<SidebarModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"script" | "exercise" | "quiz" | "coach">("script");
  const [isCompleting, setIsCompleting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);

  useEffect(() => {
    if (!lessonId) return;

    const fetchLesson = async () => {
      try {
        setLoading(true);
        setError(null);
        const studentToken = localStorage.getItem("studentToken") || "";
        const headers: Record<string, string> = {};
        if (studentToken) headers["Authorization"] = `Bearer ${studentToken}`;

        // Fetch lesson content
        const res = await fetch(`/api/v1/academy/lessons/${lessonId}/content`, { headers });
        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || data.message || "تعذر فتح محتوى الدرس");
        }
        setContent(data);
        setIsCompleted(data.progress?.status === "DONE");
        if (data.progress?.enrollmentId) {
          setEnrollmentId(data.progress.enrollmentId);
        }

        // Fetch course outline for the sidebar syllabus
        const targetCourseId = courseId || FALLBACK_COURSE_ID;
        const outlineRes = await fetch(`/api/v1/academy/courses/${targetCourseId}/outline`, { headers });
        const outlineData = await outlineRes.json();
        if (outlineData.success && Array.isArray(outlineData.modules)) {
          setOutlineModules(outlineData.modules);
          if (outlineData.enrollmentId) {
            setEnrollmentId(outlineData.enrollmentId);
          }
        }
      } catch (err: any) {
        setError(err.message || "حدث خطأ أثناء تحميل محتوى الدرس");
      } finally {
        setLoading(false);
      }
    };

    fetchLesson();
  }, [lessonId, courseId]);

  // تحديث الفهرس بعد تقفيل درس (نجاح كويز/قبول تمرين) لتتحدث علامات الإنجاز
  const refreshOutline = async () => {
    try {
      const studentToken = localStorage.getItem("studentToken") || "";
      const headers: Record<string, string> = {};
      if (studentToken) headers["Authorization"] = `Bearer ${studentToken}`;
      const targetCourseId = courseId || FALLBACK_COURSE_ID;
      const outlineRes = await fetch(`/api/v1/academy/courses/${targetCourseId}/outline`, { headers });
      const outlineData = await outlineRes.json();
      if (outlineData.success && Array.isArray(outlineData.modules)) {
        setOutlineModules(outlineData.modules);
      }
    } catch {
      // تحديث الفهرس تحسين اختياري — لا نكسر الصفحة لفشله
    }
  };

  const handleLessonCompleted = () => {
    setIsCompleted(true);
    refreshOutline();
  };

  const handleMarkComplete = async () => {
    if (!lessonId) return;
    setCompleteError(null);
    try {
      setIsCompleting(true);
      const studentToken = localStorage.getItem("studentToken") || "";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (studentToken) headers["Authorization"] = `Bearer ${studentToken}`;

      const res = await fetch(`/api/v1/academy/lessons/${lessonId}/complete`, {
        method: "POST",
        headers,
        body: JSON.stringify({ enrollmentId: enrollmentId || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setIsCompleted(true);
        refreshOutline();
      } else {
        setCompleteError(data.error || data.message || "تعذر حفظ إنهاء الدرس — حاول مرة أخرى.");
      }
    } catch (err: any) {
      setCompleteError(err?.message || "تعذر حفظ إنهاء الدرس — حاول مرة أخرى.");
    } finally {
      setIsCompleting(false);
    }
  };

  // Find previous and next lessons
  const allLessons = outlineModules.flatMap((m) => m.lessons);
  const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  if (loading) {
    return (
      <div className="min-h-[460px] flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="text-sm font-medium">جاري تجهيز مشغل الدرس ومحتواه...</span>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-8 rounded-3xl text-center space-y-3">
        <p className="font-bold text-base">{error || "تعذر فتح محتوى هذا الدرس"}</p>
        <Link
          to={`/portal/course/${courseId || FALLBACK_COURSE_ID}`}
          className="inline-block text-xs font-bold text-rose-900 underline"
        >
          العودة لصفحة الكورس
        </Link>
      </div>
    );
  }

  const { lesson, isEnrolled, studentInfo } = content;

  // Format video url
  let embedUrl = lesson.videoUrl;
  if (embedUrl && embedUrl.includes("youtube.com/watch?v=")) {
    embedUrl = embedUrl.replace("watch?v=", "embed/");
  } else if (embedUrl && embedUrl.includes("youtu.be/")) {
    embedUrl = embedUrl.replace("youtu.be/", "www.youtube.com/embed/");
  }

  return (
    <div className="space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <Link
          to={`/portal/course/${courseId || FALLBACK_COURSE_ID}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-indigo-600 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>منهج الكورس</span>
        </Link>

        <h1 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate max-w-md">
          {lesson.title}
        </h1>

        <div className="flex items-center gap-2">
          {prevLesson && (
            <Link
              to={`/portal/course/${courseId || FALLBACK_COURSE_ID}/lesson/${prevLesson.id}`}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="الدرس السابق"
            >
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
          {nextLesson && (
            <Link
              to={`/portal/course/${courseId || FALLBACK_COURSE_ID}/lesson/${nextLesson.id}`}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="الدرس التالي"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>

      {/* Main Grid: Video + Tabs on Left, Syllabus on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Video Box & Interactive Tabs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Video Player Box */}
          <div className="relative bg-slate-950 rounded-3xl overflow-hidden aspect-video shadow-lg border border-slate-900">
            {embedUrl ? (
              <iframe
                src={embedUrl}
                title={lesson.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-2">
                <PlayCircle className="w-12 h-12 text-slate-600" />
                <p className="text-xs font-semibold">فيديو الشرح المعتمد قيد المزامنة</p>
              </div>
            )}

            {/* Anti-Leak Watermark Overlay for enrolled student */}
            {isEnrolled && studentInfo?.phone && (
              <div className="absolute bottom-4 left-4 pointer-events-none opacity-40 text-[10px] text-white/80 font-mono select-none bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm">
                <span>{studentInfo.name || "طالب ماكس بي"} · {studentInfo.phone}</span>
              </div>
            )}
          </div>

          {/* Action Row: Mark Complete & Status */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`w-3 h-3 rounded-full shrink-0 ${isCompleted ? "bg-emerald-500" : "bg-amber-400"}`} />
              <span className="text-xs font-bold text-slate-800 truncate">
                {isCompleted
                  ? "تم إنهاء هذا الدرس"
                  : content.quiz
                  ? "أكمل اختبار الدرس ليُحتسب مكتماً"
                  : "قيد الدراسة"}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!content.quiz && (
                <button
                  onClick={handleMarkComplete}
                  disabled={isCompleting || isCompleted}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    isCompleted
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100 cursor-default"
                      : "bg-slate-900 hover:bg-slate-800 text-white active:scale-95"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isCompleted ? "مكتمل ✓" : isCompleting ? "جاري التحديث..." : "علم كمنتهي"}</span>
                </button>
              )}

              {nextLesson && (
                <Link
                  to={`/portal/course/${courseId || FALLBACK_COURSE_ID}/lesson/${nextLesson.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors"
                >
                  <span>التالي</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          </div>

          {completeError && (
            <p className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">
              {completeError}
            </p>
          )}

          {/* Interactive Lesson Tabs */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
            {/* Tabs Header */}
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <button
                type="button"
                onClick={() => setActiveTab("script")}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                  activeTab === "script" ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>ملخص وسكريبت الدرس</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("exercise")}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                  activeTab === "exercise" ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Dumbbell className="w-4 h-4" />
                <span>التمرين العملي</span>
              </button>

              {content.quiz && (
                <button
                  type="button"
                  onClick={() => setActiveTab("quiz")}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                    activeTab === "quiz" ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>اختبار الدرس</span>
                  {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveTab("coach")}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                  activeTab === "coach" ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>الكوتش الذكي للدرس</span>
              </button>
            </div>

            {/* Tab 1: Script */}
            {activeTab === "script" && (
              <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line space-y-3 p-2">
                {lesson.scriptText || "لا يوجد نص سكريبت متاح لهذا الدرس حالياً."}
              </div>
            )}

            {/* Tab 2: Exercise */}
            {activeTab === "exercise" &&
              (isEnrolled ? (
                <LessonExercisePanel
                  lessonId={lesson.id}
                  enrollmentId={enrollmentId}
                  exerciseText={lesson.exerciseText}
                  isAuthenticated={Boolean(localStorage.getItem("studentToken"))}
                  onAccepted={handleLessonCompleted}
                />
              ) : (
                <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line space-y-3 p-2 bg-slate-50/70 rounded-2xl border border-slate-100">
                  {lesson.exerciseText || "لا يوجد تمرين عملي مخصص لهذا الدرس."}
                  <p className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xl p-2.5">
                    تسليم التمرين متاح للمشتركين — اشترك في الكورس لتسليم تطبيقك ويصححه الكوتش الذكي.
                  </p>
                </div>
              ))}

            {/* Tab 3: Lesson Quiz */}
            {activeTab === "quiz" && content.quiz && (
              <LessonQuizPanel
                lessonId={lesson.id}
                enrollmentId={enrollmentId}
                quiz={content.quiz}
                previousScore={content.progress?.quizScore ?? null}
                onPassed={handleLessonCompleted}
              />
            )}

            {/* Tab 4: AI Coach Chat */}
            {activeTab === "coach" && (
              <LessonCoachChat lessonId={lesson.id} />
            )}
          </div>
        </div>

        {/* Right Column: Syllabus Lessons Progression */}
        <LessonSyllabusSidebar
          courseId={courseId || FALLBACK_COURSE_ID}
          currentLessonId={lesson.id}
          isEnrolled={isEnrolled}
          modules={outlineModules}
        />
      </div>
    </div>
  );
};

export default StudentLessonPlayerPage;
