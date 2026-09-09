import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  PlayCircle,
  CheckCircle2,
  Lock,
  Sparkles,
  BookOpen,
  Award,
  HelpCircle,
  FileText,
  MessageSquare,
  Send,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Check,
  RotateCcw,
  ArrowRight,
} from "lucide-react";
import { academyApi, Course, Module, Lesson, Quiz } from "./academyApi";

export default function AcademyLessonViewerPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId?: string }>();
  const [courseOutline, setCourseOutline] = useState<any>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active tab under video: 'script' | 'exercise' | 'quiz'
  const [activeTab, setActiveTab] = useState<"script" | "exercise" | "quiz">("script");

  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<any>(null);

  // AI Coach state
  const [coachMessages, setCoachMessages] = useState<Array<{ role: "user" | "coach"; text: string }>>([]);
  const [inputMsg, setInputMsg] = useState("");
  const [askingCoach, setAskingCoach] = useState(false);
  const [isCoachOpen, setIsCoachOpen] = useState(false);

  // Manual completion state
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (courseId) {
      loadOutlineAndLesson(lessonId);
    }
  }, [courseId, lessonId]);

  const loadOutlineAndLesson = async (targetLessonId?: string) => {
    if (!courseId) return;
    try {
      setLoading(true);
      const outline = await academyApi.getCourseOutline(courseId);
      setCourseOutline(outline);

      // Find which lesson to open: targetLessonId, or first unlocked lesson
      const allLessons = outline.modules.flatMap((m: Module) => m.lessons);
      let selected = allLessons.find((l: Lesson) => l.id === targetLessonId);
      if (!selected) {
        selected = allLessons.find((l: Lesson) => l.isUnlocked) || allLessons[0];
      }

      if (selected) {
        await selectLesson(selected.id, outline.enrollmentId);
      }
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.error || "فشل تحميل محتوى الدورة");
    } finally {
      setLoading(false);
    }
  };

  const selectLesson = async (lId: string, enrollmentId?: string) => {
    try {
      const data = await academyApi.getLessonContent(lId);
      setCurrentLesson(data.lesson);
      setCurrentQuiz(data.quiz);
      setQuizAnswers([]);
      setQuizResult(null);

      // Reset AI coach with welcoming lesson message
      setCoachMessages([
        {
          role: "coach",
          text: `مرحباً بك! أنا كوتش درس "${data.lesson.title}". أنا جاهز للإجابة على أي استفسار يخص محتوى هذا الدرس والتطبيق العملي. كيف يمكنني مساعدتك؟`,
        },
      ]);

      // If lesson has quiz and not done, suggest quiz tab
      if (data.quiz && data.progress?.status !== "DONE") {
        setActiveTab("script");
      } else {
        setActiveTab("script");
      }
    } catch (err: any) {
      alert(err?.response?.data?.error || "تعذر فتح هذا الدرس. قد يكون مقفلاً بالترتيب.");
    }
  };

  // Submit Quiz
  const handleSubmitQuiz = async () => {
    if (!currentLesson || !courseOutline?.enrollmentId) return;
    try {
      setQuizSubmitting(true);
      const res = await academyApi.submitQuiz(currentLesson.id, courseOutline.enrollmentId, quizAnswers);
      setQuizResult(res);
      if (res.passed) {
        // Refresh outline to unlock next lesson
        const outline = await academyApi.getCourseOutline(courseId!);
        setCourseOutline(outline);
      }
    } catch (err: any) {
      alert(err?.response?.data?.error || "فشل تسليم إجابات الاختبار");
    } finally {
      setQuizSubmitting(false);
    }
  };

  // Complete lesson manually (if no quiz)
  const handleCompleteManual = async () => {
    if (!currentLesson || !courseOutline?.enrollmentId) return;
    try {
      setCompleting(true);
      await academyApi.completeLesson(currentLesson.id, courseOutline.enrollmentId);
      // Refresh outline
      const outline = await academyApi.getCourseOutline(courseId!);
      setCourseOutline(outline);
      // Re-fetch current lesson
      const data = await academyApi.getLessonContent(currentLesson.id);
      setCurrentLesson(data.lesson);
    } catch (err: any) {
      alert(err?.response?.data?.error || "فشل تأكيد إتمام الدرس");
    } finally {
      setCompleting(false);
    }
  };

  // Ask AI Coach
  const handleAskCoach = async (promptText?: string) => {
    const textToSend = promptText || inputMsg;
    if (!textToSend.trim() || !currentLesson) return;

    const newMsgs = [...coachMessages, { role: "user" as const, text: textToSend.trim() }];
    setCoachMessages(newMsgs);
    if (!promptText) setInputMsg("");
    setAskingCoach(true);

    try {
      const res = await academyApi.askCoach(currentLesson.id, textToSend.trim());
      setCoachMessages([...newMsgs, { role: "coach", text: res.reply }]);
    } catch (err: any) {
      setCoachMessages([
        ...newMsgs,
        { role: "coach", text: "عذراً، حدث خطأ في التواصل مع الكوتش. حاول مرة أخرى." },
      ]);
    } finally {
      setAskingCoach(false);
    }
  };

  // Parse YouTube Embed ID
  const getEmbedUrl = (url?: string | null) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    const videoId = match ? match[1] : null;
    if (!videoId) return url;
    return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&controls=1`;
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500 text-sm">جاري تجهيز مشغل الدروس...</div>;
  }

  if (error || !courseOutline) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-rose-400 text-sm">{error || "تعذر العثور على الدورة"}</p>
        <Link to="/academy/catalog" className="text-xs text-emerald-400 underline">
          العودة لكتالوج الدورات
        </Link>
      </div>
    );
  }

  const allFlatLessons = courseOutline.modules.flatMap((m: Module) => m.lessons);
  const currentIdx = allFlatLessons.findIndex((l: Lesson) => l.id === currentLesson?.id);
  const nextLesson = currentIdx >= 0 && currentIdx < allFlatLessons.length - 1 ? allFlatLessons[currentIdx + 1] : null;
  const isLessonDone = allFlatLessons.find((l: Lesson) => l.id === currentLesson?.id)?.progress?.status === "DONE";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-2 sm:p-5 flex flex-col" dir="rtl">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Link
            to="/academy/catalog"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition"
            title="العودة للكتالوج"
          >
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-white line-clamp-1">{courseOutline.course.title}</h1>
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <span>درس {currentIdx + 1} من {allFlatLessons.length}</span>
              {courseOutline.certificate && (
                <span className="text-emerald-400 font-semibold inline-flex items-center gap-1 mr-2">
                  <Award className="w-3.5 h-3.5" />
                  <span>الشهادة متاحة!</span>
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {courseOutline.certificate && (
            <a
              href={`/api/v1/academy/certificates/${courseOutline.enrollmentId}/view`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition flex items-center gap-1"
            >
              <Award className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">عرض الشهادة المعتمدة</span>
            </a>
          )}

          <button
            onClick={() => setIsCoachOpen(!isCoachOpen)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 transition flex items-center gap-1.5 shadow-lg shadow-emerald-950/40"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>كوتش الذكاء الاصطناعي</span>
          </button>
        </div>
      </div>

      {/* Main Learning Workspace */}
      <div className="mt-4 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left / Center (Video + Tabs Content): 8 cols */}
        <div className="lg:col-span-8 space-y-4">
          {/* Cinema Video Box */}
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border border-slate-800 shadow-2xl shadow-black/80">
            {currentLesson?.videoUrl ? (
              <>
                <iframe
                  src={getEmbedUrl(currentLesson.videoUrl) || undefined}
                  title={currentLesson.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                {/* Overlay Barrier at top to prevent accidental header link clicking */}
                <div className="absolute top-0 inset-x-0 h-10 pointer-events-auto bg-transparent" />
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
                <PlayCircle className="w-12 h-12" />
                <p className="text-xs">لم يتم رفع فيديو لهذا الدرس بعد</p>
              </div>
            )}
          </div>

          {/* Lesson Action Header */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">{currentLesson?.title}</h2>
                {isLessonDone && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>مكتمل</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                المدة التقريبية: {currentLesson?.durationMin || 15} دقيقة
              </p>
            </div>

            {/* Completion / Next Action */}
            <div className="flex items-center gap-2">
              {!isLessonDone && (
                <button
                  onClick={handleCompleteManual}
                  disabled={completing}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 transition disabled:opacity-50"
                >
                  {completing ? "جاري الحفظ..." : "تأكيد إتمام الدرس"}
                </button>
              )}

              {nextLesson && nextLesson.isUnlocked && (
                <button
                  onClick={() => selectLesson(nextLesson.id, courseOutline.enrollmentId)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                >
                  الدرس التالي ⬅
                </button>
              )}
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <button
              onClick={() => setActiveTab("script")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === "script"
                  ? "bg-slate-800 text-emerald-400 border border-slate-700"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>سكريبت وملخص الدرس</span>
            </button>

            <button
              onClick={() => setActiveTab("exercise")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === "exercise"
                  ? "bg-slate-800 text-emerald-400 border border-slate-700"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>التطبيق العملي</span>
            </button>

            {currentQuiz && (
              <button
                onClick={() => setActiveTab("quiz")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === "quiz"
                    ? "bg-purple-900/30 text-purple-300 border border-purple-500/40"
                    : "text-slate-400 hover:text-purple-300"
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                <span>اختبار الدرس (كويز)</span>
              </button>
            )}
          </div>

          {/* Tab 1: Script Content */}
          {activeTab === "script" && (
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>نص الشرح الكامل والسكريبت المعتمد</span>
                </span>
                <span className="text-[11px] text-slate-500">مُراجع أكاديمياً</span>
              </div>

              <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                {currentLesson?.scriptText || "لا يوجد نص سكريبت تفصيلي متاح لهذا الدرس."}
              </div>
            </div>
          )}

          {/* Tab 2: Exercise */}
          {activeTab === "exercise" && (
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4">
              <h3 className="text-sm font-bold text-emerald-400">التمرين التطبيقي المطلوب في هذا الدرس:</h3>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 leading-relaxed">
                {currentLesson?.exerciseText || "لا يوجد تمرين محدد لهذا الدرس، احرص على مشاهدة الفيديو جيداً."}
              </div>
            </div>
          )}

          {/* Tab 3: Quiz */}
          {activeTab === "quiz" && currentQuiz && (
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">{currentQuiz.title}</h3>
                  <p className="text-xs text-slate-400">نسبة النجاح المطلوبة لاجتياز الدرس: {currentQuiz.passScorePercent}%</p>
                </div>

                {quizResult && (
                  <div
                    className={`px-3 py-1 rounded-xl text-xs font-bold border ${
                      quizResult.passed
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                    }`}
                  >
                    درجتك: {quizResult.scorePercent}% ({quizResult.passed ? "ناجح ومكتمل!" : "لم تجتز"})
                  </div>
                )}
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                {currentQuiz.questions.map((q, qIdx) => {
                  const fb = quizResult?.feedback?.[qIdx];
                  return (
                    <div
                      key={qIdx}
                      className={`p-4 rounded-xl border ${
                        fb
                          ? fb.isCorrect
                            ? "bg-emerald-950/20 border-emerald-500/30"
                            : "bg-rose-950/20 border-rose-500/30"
                          : "bg-slate-950 border-slate-800"
                      } space-y-2.5`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs sm:text-sm font-semibold text-white">
                          {qIdx + 1}. {q.q}
                        </h4>
                        {fb && (
                          <span className="text-xs font-bold">
                            {fb.isCorrect ? (
                              <span className="text-emerald-400 flex items-center gap-0.5">
                                <Check className="w-3.5 h-3.5" /> صحيحة
                              </span>
                            ) : (
                              <span className="text-rose-400">غير صحيحة</span>
                            )}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        {q.options.map((opt, optIdx) => (
                          <label
                            key={optIdx}
                            className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                              quizAnswers[qIdx] === optIdx
                                ? "bg-purple-950/40 border-purple-500 text-purple-200"
                                : "bg-slate-900/60 border-slate-800/80 text-slate-300 hover:bg-slate-800"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`quiz_q_${qIdx}`}
                              checked={quizAnswers[qIdx] === optIdx}
                              onChange={() => {
                                const next = [...quizAnswers];
                                next[qIdx] = optIdx;
                                setQuizAnswers(next);
                              }}
                              className="text-purple-600"
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>

                      {fb && !fb.isCorrect && fb.explanation && (
                        <p className="text-[11px] text-amber-300/90 pt-1">
                          توضيح الإجابة: {fb.explanation}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  onClick={handleSubmitQuiz}
                  disabled={quizSubmitting || quizAnswers.length < currentQuiz.questions.length}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/30 transition disabled:opacity-50"
                >
                  {quizSubmitting ? "جاري تصحيح الإجابات..." : "تسليم إجابات الاختبار"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Syllabus Navigation (4 cols) */}
        <div className="lg:col-span-4 rounded-2xl bg-slate-900/70 border border-slate-800 p-4 space-y-4 sticky top-4 max-h-[calc(100vh-6rem)] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <span>منهج وفهرس الدورة</span>
            </h3>
            <span className="text-[11px] text-slate-500">
              {allFlatLessons.filter((l: Lesson) => l.progress?.status === "DONE").length} / {allFlatLessons.length} مكتمل
            </span>
          </div>

          <div className="space-y-4">
            {courseOutline.modules.map((mod: Module, mIdx: number) => (
              <div key={mod.id} className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-400 px-2 py-1">
                  الوحدة {mIdx + 1}: {mod.title}
                </h4>

                <div className="space-y-1">
                  {mod.lessons.map((lesson: Lesson, lIdx: number) => {
                    const isSelected = lesson.id === currentLesson?.id;
                    const isDone = lesson.progress?.status === "DONE";
                    const isLocked = !lesson.isUnlocked;

                    return (
                      <button
                        key={lesson.id}
                        disabled={isLocked}
                        onClick={() => selectLesson(lesson.id, courseOutline.enrollmentId)}
                        className={`w-full text-right p-2.5 rounded-xl text-xs transition flex items-center justify-between gap-2 ${
                          isSelected
                            ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 font-bold"
                            : isLocked
                            ? "text-slate-600 bg-slate-950/40 cursor-not-allowed"
                            : "text-slate-300 hover:bg-slate-800/60"
                        }`}
                      >
                        <div className="flex items-center gap-2 line-clamp-1">
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          ) : isLocked ? (
                            <Lock className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                          ) : (
                            <PlayCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          )}
                          <span className="truncate">{lesson.title}</span>
                        </div>

                        {lesson.isFreePreview && !courseOutline.isEnrolled && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 flex-shrink-0">
                            مجاناً
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating AI Coach Drawer */}
      {isCoachOpen && (
        <div
          className="fixed bottom-4 left-4 z-50 w-full sm:w-96 rounded-2xl bg-slate-900 border border-emerald-500/40 shadow-2xl shadow-black/80 flex flex-col overflow-hidden"
          style={{ maxHeight: "550px" }}
        >
          {/* Coach Header */}
          <div className="p-3.5 bg-gradient-to-r from-emerald-950 to-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                <Sparkles className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-white">كوتش ماكس بي الذكي</h3>
                <p className="text-[10px] text-emerald-400">مقيد بسكريبت: {currentLesson?.title}</p>
              </div>
            </div>
            <button
              onClick={() => setIsCoachOpen(false)}
              className="text-slate-400 hover:text-white text-xs p-1"
            >
              ✕
            </button>
          </div>

          {/* Quick Prompts */}
          <div className="p-2 bg-slate-950/60 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px]">
            <button
              onClick={() => handleAskCoach("لخص لي محتوى هذا الدرس في 3 نقاط أساسية.")}
              className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 whitespace-nowrap"
            >
              📝 لخص الدرس
            </button>
            <button
              onClick={() => handleAskCoach("كيف أطبق هذا الدرس عملياً على متجري اليوم؟")}
              className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 whitespace-nowrap"
            >
              🎯 التطبيق العملي
            </button>
          </div>

          {/* Messages */}
          <div className="p-3 flex-1 overflow-y-auto space-y-2.5 text-xs">
            {coachMessages.map((m, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl leading-relaxed ${
                  m.role === "coach"
                    ? "bg-slate-800/90 text-slate-200 border border-slate-700/60"
                    : "bg-emerald-600 text-white self-end ml-4"
                }`}
              >
                {m.text}
              </div>
            ))}
            {askingCoach && (
              <div className="p-2.5 text-slate-400 text-[11px] animate-pulse">
                كوتش ماكس بي يراجع سكريبت الدرس ويكتب الرد...
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-2.5 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAskCoach()}
              placeholder="اسأل الكوتش عن أي نقطة في هذا الدرس..."
              className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={() => handleAskCoach()}
              disabled={askingCoach || !inputMsg.trim()}
              className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
