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
  Send,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Check,
  RotateCcw,
  ArrowRight,
  Maximize2,
  Minimize2,
  ExternalLink,
  RefreshCw,
  Loader2,
  Clock,
} from "lucide-react";
import { academyApi, Module, Lesson, Quiz, ExerciseSubmission } from "./academyApi";

export default function AcademyLessonViewerPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId?: string }>();
  const [courseOutline, setCourseOutline] = useState<any>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Theater Mode / Cinema Mode toggle
  const [isTheaterMode, setIsTheaterMode] = useState(false);

  // Syllabus accordion state (expanded modules)
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  // Watermark state
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [studentInfo, setStudentInfo] = useState<{ name?: string; phone?: string; email?: string; id?: string } | null>(null);

  // Active tab under video: 'script' | 'exercise' | 'quiz'
  const [activeTab, setActiveTab] = useState<"script" | "exercise" | "quiz">("script");

  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<any>(null);

  // Exercise Submissions state (M2 & M5)
  const [exerciseSubmissions, setExerciseSubmissions] = useState<ExerciseSubmission[]>([]);
  const [exerciseTextVal, setExerciseTextVal] = useState("");
  const [exerciseUrlVal, setExerciseUrlVal] = useState("");
  const [submittingExercise, setSubmittingExercise] = useState(false);
  const [isEditingSubmission, setIsEditingSubmission] = useState(false);

  // AI Coach state
  const [coachMessages, setCoachMessages] = useState<Array<{ role: "user" | "coach"; text: string }>>([]);
  const [inputMsg, setInputMsg] = useState("");
  const [askingCoach, setAskingCoach] = useState(false);
  const [isCoachOpen, setIsCoachOpen] = useState(false);

  // Manual completion state
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (courseId) {
      loadOutlineAndLesson(lessonId || undefined);
    }
  }, [courseId, lessonId]);

  const toggleModule = (modId: string) => {
    setExpandedModules((prev) => ({ ...prev, [modId]: !prev[modId] }));
  };

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
        // Auto-expand the module containing the active lesson
        const parentMod = outline.modules.find((m: Module) =>
          m.lessons.some((l: Lesson) => l.id === selected!.id)
        );
        if (parentMod) {
          setExpandedModules((prev) => ({ ...prev, [parentMod.id]: true }));
        }

        await selectLesson(selected.id, outline);
      }
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.error || "فشل تحميل محتوى الدورة");
    } finally {
      setLoading(false);
    }
  };

  const selectLesson = async (lId: string, outlineRef?: any) => {
    try {
      const data = await academyApi.getLessonContent(lId);
      setCurrentLesson(data.lesson);
      setCurrentQuiz(data.quiz);
      setQuizAnswers([]);
      setQuizResult(null);

      // Auto-expand module for this lesson
      const activeOutline = outlineRef || courseOutline;
      if (activeOutline) {
        const parentMod = activeOutline.modules?.find((m: Module) =>
          m.lessons.some((l: Lesson) => l.id === lId)
        );
        if (parentMod) {
          setExpandedModules((prev) => ({ ...prev, [parentMod.id]: true }));
        }
      }

      // Watermark settings
      setWatermarkEnabled(data.enableWatermark !== false);
      if (data.studentInfo) {
        setStudentInfo(data.studentInfo);
      }

      // Load previous exercise submissions if any
      try {
        const subs = await academyApi.getLessonSubmissions(data.lesson.id);
        setExerciseSubmissions(subs);
        const firstSub = subs[0];
        if (firstSub) {
          setExerciseTextVal(firstSub.submissionText || "");
          setExerciseUrlVal(firstSub.submissionUrl || "");
          setIsEditingSubmission(false);
        } else {
          setExerciseTextVal("");
          setExerciseUrlVal("");
          setIsEditingSubmission(true);
        }
      } catch (e) {
        setExerciseSubmissions([]);
        setIsEditingSubmission(true);
      }

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

  // Submit Exercise (M2 & M5)
  const handleExerciseSubmit = async () => {
    if (!currentLesson) return;
    if (!exerciseTextVal.trim() && !exerciseUrlVal.trim()) {
      alert("يرجى كتابة خطوات التنفيذ أو إرفاق رابط صورة للتسليم");
      return;
    }

    try {
      setSubmittingExercise(true);
      const res = await academyApi.submitExercise(currentLesson.id, {
        enrollmentId: courseOutline?.enrollmentId || null,
        submissionText: exerciseTextVal.trim(),
        submissionUrl: exerciseUrlVal.trim(),
      });

      setExerciseSubmissions((prev) => [res.submission, ...prev]);
      setIsEditingSubmission(false);

      if (res.gradeResult?.verdict === "ACCEPTED") {
        if (courseId) {
          const outline = await academyApi.getCourseOutline(courseId);
          setCourseOutline(outline);
        }
      }
    } catch (err: any) {
      alert(err?.response?.data?.error || "فشل تسليم التمرين");
    } finally {
      setSubmittingExercise(false);
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
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">جاري تجهيز مشغل الدروس...</p>
        </div>
      </div>
    );
  }

  if (error || !courseOutline) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <p className="text-sm text-rose-500 font-medium">{error || "تعذر العثور على الدورة"}</p>
          <Link to="/academy/catalog" className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline">
            <ArrowRight className="w-3.5 h-3.5" />
            <span>العودة لكتالوج الدورات</span>
          </Link>
        </div>
      </div>
    );
  }

  const allFlatLessons = courseOutline.modules.flatMap((m: Module) => m.lessons);
  const currentIdx = allFlatLessons.findIndex((l: Lesson) => l.id === currentLesson?.id);
  const nextLesson = currentIdx >= 0 && currentIdx < allFlatLessons.length - 1 ? allFlatLessons[currentIdx + 1] : null;
  const isLessonDone = allFlatLessons.find((l: Lesson) => l.id === currentLesson?.id)?.progress?.status === "DONE";

  return (
    <div className="min-h-screen bg-background text-foreground p-2 sm:p-5 flex flex-col" dir="rtl">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Link
            to="/academy/catalog"
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition"
            title="العودة للكتالوج"
          >
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-foreground line-clamp-1">{courseOutline.course.title}</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span>درس {currentIdx + 1} من {allFlatLessons.length}</span>
              {courseOutline.certificate && (
                <span className="text-primary font-semibold inline-flex items-center gap-1 mr-2">
                  <Award className="w-3.5 h-3.5" />
                  <span>الشهادة متاحة!</span>
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Theater Mode Toggle */}
          <button
            onClick={() => setIsTheaterMode(!isTheaterMode)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-card hover:bg-muted text-foreground border border-border/60 transition flex items-center gap-1.5 shadow-xs"
            title={isTheaterMode ? "خروج من وضع المسرح" : "تفعيل وضع المسرح"}
          >
            {isTheaterMode ? <Minimize2 className="w-3.5 h-3.5 text-primary" /> : <Maximize2 className="w-3.5 h-3.5 text-primary" />}
            <span className="hidden sm:inline">{isTheaterMode ? "المشغل القياسي" : "وضع المسرح"}</span>
          </button>

          {courseOutline.certificate && (
            <a
              href={`/api/v1/academy/certificates/${courseOutline.enrollmentId}/view`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition flex items-center gap-1"
            >
              <Award className="w-4 h-4 text-amber-500" />
              <span className="hidden sm:inline">عرض الشهادة المعتمدة</span>
            </a>
          )}

          <button
            onClick={() => setIsCoachOpen(!isCoachOpen)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-primary/10 text-primary border border-primary/25 hover:bg-primary/20 transition flex items-center gap-1.5 shadow-xs active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4" />
            <span>كوتش الذكاء الاصطناعي</span>
          </button>
        </div>
      </div>

      {/* Main Learning Workspace */}
      <div className="mt-4 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left / Center (Video + Tabs Content): 8 cols (or 12 in Theater Mode) */}
        <div className={`${isTheaterMode ? "lg:col-span-12" : "lg:col-span-8"} space-y-4`}>
          {/* Cinema Video Box */}
          <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-black aspect-video border border-border/80 shadow-2xl shadow-black/40">
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

                {/* Dynamic Anti-Leak Floating Watermark */}
                {watermarkEnabled && (
                  <DynamicVideoWatermark
                    name={studentInfo?.name}
                    phone={studentInfo?.phone}
                  />
                )}
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground space-y-2">
                <PlayCircle className="w-12 h-12 text-muted-foreground/60" />
                <p className="text-xs">لم يتم رفع فيديو لهذا الدرس بعد</p>
              </div>
            )}
          </div>

          {/* Lesson Action Header */}
          <div className="p-4 rounded-2xl bg-card border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-foreground">{currentLesson?.title}</h2>
                {isLessonDone && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>مكتمل</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                المدة التقريبية: {currentLesson?.durationMin || 15} دقيقة
              </p>
            </div>

            {/* Completion / Next Action */}
            <div className="flex items-center gap-2">
              {!isLessonDone && (
                <button
                  onClick={handleCompleteManual}
                  disabled={completing}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition disabled:opacity-50 active:scale-[0.98]"
                >
                  {completing ? "جاري الحفظ..." : "تأكيد إتمام الدرس"}
                </button>
              )}

              {nextLesson && nextLesson.isUnlocked && (
                <button
                  onClick={() => selectLesson(nextLesson.id, courseOutline.enrollmentId)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-card hover:bg-muted text-foreground border border-border/60 transition shadow-xs"
                >
                  الدرس التالي ⬅
                </button>
              )}
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="flex items-center gap-2 border-b border-border/60 pb-2">
            <button
              onClick={() => setActiveTab("script")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === "script"
                  ? "bg-card text-primary border border-border/60 shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>سكريبت وملخص الدرس</span>
            </button>

            <button
              onClick={() => setActiveTab("exercise")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === "exercise"
                  ? "bg-card text-primary border border-border/60 shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
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
                    ? "bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/30 shadow-xs"
                    : "text-muted-foreground hover:text-purple-600 dark:hover:text-purple-300"
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                <span>اختبار الدرس (كويز)</span>
              </button>
            )}
          </div>

          {/* Tab 1: Script Content */}
          {activeTab === "script" && (
            <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border/60 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>نص الشرح الكامل والسكريبت المعتمد</span>
                </span>
                <span className="text-[11px] text-muted-foreground font-medium">مُراجع أكاديمياً</span>
              </div>

              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap font-sans">
                {currentLesson?.scriptText || "لا يوجد نص سكريبت تفصيلي متاح لهذا الدرس."}
              </div>
            </div>
          )}

          {/* Tab 2: Exercise Submission & AI Evaluation */}
          {activeTab === "exercise" && (
            <div className="space-y-4">
              {/* Exercise Ruler & Instructions Box */}
              <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border/60 space-y-3 shadow-xs">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span>نص ومسطرة التمرين العملي للدرس</span>
                  </h3>
                  <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-mono">
                    بوابة اجتياز عملية
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50 text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap font-sans">
                  {currentLesson?.exerciseText || "لا يوجد تمرين محدد لهذا الدرس، احرص على مشاهدة الفيديو جيداً."}
                </div>
              </div>

              {/* Submissions & AI Feedback Section */}
              <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border/60 space-y-5 shadow-xs">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span>تسليم التمرين والتصحيح الذكي الفوري</span>
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      يتم فحص تسليمك آلياً وفق معايير مسطرة التمرين فور إرساله
                    </p>
                  </div>

                  {exerciseSubmissions.length > 0 && !isEditingSubmission && (
                    <button
                      onClick={() => setIsEditingSubmission(true)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground border border-border/60 transition flex items-center gap-1.5 shadow-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-primary" />
                      <span>تعديل وإعادة التسليم</span>
                    </button>
                  )}
                </div>

                {/* Case 1: Prior submission review / verdict display */}
                {exerciseSubmissions.length > 0 && !isEditingSubmission && (() => {
                  const latest = exerciseSubmissions[0];
                  if (!latest) return null;
                  const verdict = latest.status;
                  const ai = latest.aiVerdictJson;

                  return (
                    <div className="space-y-4">
                      {/* Latest Status Banner */}
                      {verdict === "ACCEPTED" ? (
                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 space-y-2">
                          <div className="flex items-center gap-2 font-bold text-sm">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            <span>عاش يا بطل! تم قبول تسليمك للتمرين بنجاح (ACCEPTED)</span>
                          </div>
                          {ai?.coachLine && <p className="text-xs">{ai.coachLine}</p>}
                          {ai?.nextStep && <p className="text-xs font-semibold text-foreground">الخطوة القادمة: {ai.nextStep}</p>}
                        </div>
                      ) : verdict === "REJECTED" || verdict === "NEEDS_MORE" ? (
                        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 space-y-3">
                          <div className="flex items-center gap-2 font-bold text-sm">
                            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                            <span>
                              {verdict === "REJECTED"
                                ? "التسليم بحاجة لإكمال النواقص (REJECTED)"
                                : "التسليم بحاجة لتوضيحات إضافية (NEEDS_MORE)"}
                            </span>
                          </div>
                          {ai?.coachLine && <p className="text-xs">{ai.coachLine}</p>}

                          {/* Missing ruler checklist */}
                          {ai && Array.isArray(ai.missing) && (ai.missing.length ?? 0) > 0 && (
                            <div className="mt-2 p-3 rounded-lg bg-background/80 border border-rose-500/20 text-foreground space-y-1.5">
                              <span className="text-xs font-bold text-rose-600 dark:text-rose-400 block">
                                البنود الناقصة طبقاً لمسطرة التمرين:
                              </span>
                              <ul className="space-y-1 text-xs">
                                {(ai.missing ?? []).map((item: string, i: number) => (
                                  <li key={i} className="flex items-start gap-1.5">
                                    <span className="text-rose-500 font-bold">•</span>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {ai?.nextStep && (
                            <p className="text-xs font-semibold text-foreground pt-1">
                              الخطوة العملية التالية: {ai.nextStep}
                            </p>
                          )}

                          <div className="pt-1">
                            <button
                              onClick={() => setIsEditingSubmission(true)}
                              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition flex items-center gap-1.5"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>تعديل الحل وإعادة التسليم الآن</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-700 dark:text-sky-300 flex items-center gap-2 text-xs font-medium">
                          <Clock className="w-4 h-4 text-sky-500" />
                          <span>تم استلام التمرين وجاري مراجعته وتقييمه.</span>
                        </div>
                      )}

                      {/* Display submitted text and links */}
                      <div className="p-4 rounded-xl bg-muted/20 border border-border/50 space-y-2.5">
                        <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border/40 pb-2">
                          <span>تسليمك المسجل بتاريخ {new Date(latest.createdAt).toLocaleString("ar-EG")}</span>
                          {latest.instructorNote && (
                            <span className="text-primary font-semibold">ملاحظة المدرب مسجلة</span>
                          )}
                        </div>

                        {latest.submissionText && (
                          <div className="text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                            {latest.submissionText}
                          </div>
                        )}

                        {latest.submissionUrl && (
                          <div className="pt-1">
                            <a
                              href={latest.submissionUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>عرض المرفق / لقطة الشاشة ({latest.submissionUrl})</span>
                            </a>
                          </div>
                        )}

                        {latest.instructorNote && (
                          <div className="mt-3 p-3 rounded-lg bg-primary/10 border border-primary/20 text-xs text-foreground">
                            <span className="font-bold text-primary block mb-1">ملاحظة المدرب البشري:</span>
                            <p>{latest.instructorNote}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Case 2: New submission or editing prior submission */}
                {(exerciseSubmissions.length === 0 || isEditingSubmission) && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <span>نص الإجابة وخطوات التطبيق:</span>
                        <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        value={exerciseTextVal}
                        onChange={(e) => setExerciseTextVal(e.target.value)}
                        placeholder="اكتب هنا تفاصيل تنفيذك لبنود التمرين وملاحظاتك بالتفصيل وفق مسطرة القبول المذكورة بالأعلى..."
                        rows={6}
                        className="w-full p-3.5 rounded-xl bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs leading-relaxed"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <span>رابط لقطات الشاشة أو المرفقات (Google Drive / رابط مباشر / Imgur):</span>
                      </label>
                      <input
                        type="url"
                        value={exerciseUrlVal}
                        onChange={(e) => setExerciseUrlVal(e.target.value)}
                        placeholder="https://drive.google.com/... أو https://..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        تأكد أن الرابط متاح للعرض العام لتسهيل فحصه بواسطة المصحح والمدرب.
                      </p>
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/50">
                      {exerciseSubmissions.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsEditingSubmission(false)}
                          className="px-4 py-2 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground transition"
                        >
                          إلغاء التعديل
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleExerciseSubmit}
                        disabled={submittingExercise || (!exerciseTextVal.trim() && !exerciseUrlVal.trim())}
                        className="px-6 py-2.5 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition disabled:opacity-50 flex items-center gap-2"
                      >
                        {submittingExercise ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>جاري التقييم بواسطة المصحح الذكي...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>تسليم التمرين للتقييم الذكي</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Quiz */}
          {activeTab === "quiz" && currentQuiz && (
            <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border/60 space-y-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-foreground">{currentQuiz.title}</h3>
                  <p className="text-xs text-muted-foreground">نسبة النجاح المطلوبة لاجتياز الدرس: {currentQuiz.passScorePercent}%</p>
                </div>

                {quizResult && (
                  <div
                    className={`px-3 py-1 rounded-xl text-xs font-bold border ${
                      quizResult.passed
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
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
                            ? "bg-emerald-500/5 border-emerald-500/30"
                            : "bg-rose-500/5 border-rose-500/30"
                          : "bg-muted/30 border-border/60"
                      } space-y-2.5`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs sm:text-sm font-semibold text-foreground">
                          {qIdx + 1}. {q.q}
                        </h4>
                        {fb && (
                          <span className="text-xs font-bold">
                            {fb.isCorrect ? (
                              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                <Check className="w-3.5 h-3.5" /> صحيحة
                              </span>
                            ) : (
                              <span className="text-rose-600 dark:text-rose-400">غير صحيحة</span>
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
                                ? "bg-purple-500/10 border-purple-500/40 text-purple-600 dark:text-purple-300 font-medium"
                                : "bg-card border-border/60 text-muted-foreground hover:bg-muted"
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
                              className="text-purple-600 focus:ring-purple-500 w-4 h-4"
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>

                      {fb && !fb.isCorrect && fb.explanation && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 pt-1">
                          توضيح الإجابة: {fb.explanation}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
                <button
                  onClick={handleSubmitQuiz}
                  disabled={quizSubmitting || quizAnswers.length < currentQuiz.questions.length}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-sm transition disabled:opacity-50"
                >
                  {quizSubmitting ? "جاري تصحيح الإجابات..." : "تسليم إجابات الاختبار"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Syllabus Navigation (4 cols, or drops below in Theater Mode) */}
        <div
          className={`${
            isTheaterMode ? "lg:col-span-12" : "lg:col-span-4"
          } rounded-2xl sm:rounded-3xl bg-card border border-border/60 p-4 space-y-4 sticky top-4 max-h-[calc(100vh-6rem)] overflow-y-auto shadow-xs`}
        >
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <h3 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-primary" />
              <span>منهج وفهرس الدورة</span>
            </h3>
            <span className="text-[11px] text-muted-foreground font-mono">
              {allFlatLessons.filter((l: Lesson) => l.progress?.status === "DONE").length} / {allFlatLessons.length} مكتمل
            </span>
          </div>

          <div className="space-y-3">
            {courseOutline.modules.map((mod: Module, mIdx: number) => {
              const isExpanded = expandedModules[mod.id] ?? true;
              const completedInMod = mod.lessons.filter((l: Lesson) => l.progress?.status === "DONE").length;

              return (
                <div key={mod.id} className="rounded-xl border border-border/50 overflow-hidden bg-muted/20">
                  {/* Collapsible Module Accordion Header */}
                  <button
                    type="button"
                    onClick={() => toggleModule(mod.id)}
                    className="w-full text-right p-3 flex items-center justify-between gap-2 hover:bg-muted/40 transition"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                        الوحدة {mIdx + 1}
                      </span>
                      <h4 className="text-xs font-bold text-foreground line-clamp-1">{mod.title}</h4>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {completedInMod}/{mod.lessons.length}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {/* Lessons List in Module */}
                  {isExpanded && (
                    <div className="p-2 pt-0 space-y-1 divide-y divide-border/30">
                      {mod.lessons.map((lesson: Lesson) => {
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
                                ? "bg-primary/10 text-primary border border-primary/30 font-bold shadow-xs"
                                : isLocked
                                ? "text-muted-foreground/60 bg-muted/10 cursor-not-allowed opacity-60"
                                : "text-foreground hover:bg-muted/50"
                            }`}
                          >
                            <div className="flex items-center gap-2 line-clamp-1">
                              {isDone ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                              ) : isLocked ? (
                                <Lock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                              ) : (
                                <PlayCircle className="w-4 h-4 text-primary/80 flex-shrink-0" />
                              )}
                              <span className="truncate">{lesson.title}</span>
                            </div>

                            {lesson.isFreePreview && !courseOutline.isEnrolled && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 flex-shrink-0 font-medium">
                                مجاناً
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating 2026 Glassmorphic AI Coach Drawer */}
      {isCoachOpen && (
        <div
          className="fixed bottom-4 left-4 z-50 w-full sm:w-96 rounded-2xl sm:rounded-3xl bg-card/95 backdrop-blur-xl border border-primary/30 shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300"
          style={{ maxHeight: "560px" }}
        >
          {/* Coach Header */}
          <div className="p-3.5 bg-gradient-to-r from-primary/15 via-card to-card border-b border-border/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-primary/10 text-primary">
                <Sparkles className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-foreground">كوتش ماكس بي الذكي</h3>
                <p className="text-[10px] text-muted-foreground line-clamp-1">مرتبط بسكريبت: {currentLesson?.title}</p>
              </div>
            </div>
            <button
              onClick={() => setIsCoachOpen(false)}
              className="text-muted-foreground hover:text-foreground text-xs p-1.5 rounded-lg hover:bg-muted transition"
            >
              ✕
            </button>
          </div>

          {/* Quick Prompts */}
          <div className="p-2 bg-muted/40 border-b border-border/60 flex items-center gap-1.5 overflow-x-auto text-[11px]">
            <button
              onClick={() => handleAskCoach("لخص لي محتوى هذا الدرس في 3 نقاط أساسية.")}
              className="px-2.5 py-1 rounded-full bg-card hover:bg-muted text-foreground border border-border/60 whitespace-nowrap shadow-xs"
            >
              📝 لخص الدرس
            </button>
            <button
              onClick={() => handleAskCoach("كيف أطبق هذا الدرس عملياً على متجري اليوم؟")}
              className="px-2.5 py-1 rounded-full bg-card hover:bg-muted text-foreground border border-border/60 whitespace-nowrap shadow-xs"
            >
              🎯 التطبيق العملي
            </button>
          </div>

          {/* Messages */}
          <div className="p-3 flex-1 overflow-y-auto space-y-2.5 text-xs">
            {coachMessages.map((m, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-2xl leading-relaxed ${
                  m.role === "coach"
                    ? "bg-muted/70 text-foreground border border-border/50"
                    : "bg-primary text-primary-foreground self-end ml-4 shadow-xs"
                }`}
              >
                {m.text}
              </div>
            ))}
            {askingCoach && (
              <div className="p-3 rounded-2xl bg-muted/40 text-muted-foreground text-[11px] animate-pulse">
                كوتش ماكس بي يراجع سكريبت الدرس ويكتب الرد...
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-2.5 bg-card border-t border-border/60 flex items-center gap-2">
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAskCoach()}
              placeholder="اسأل الكوتش عن أي نقطة في هذا الدرس..."
              className="flex-1 px-3.5 py-2 rounded-xl bg-background border border-input text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-muted-foreground"
            />
            <button
              onClick={() => handleAskCoach()}
              disabled={askingCoach || !inputMsg.trim()}
              className="p-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 transition shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DynamicVideoWatermark({ name, phone }: { name?: string; phone?: string }) {
  const [posIdx, setPosIdx] = useState(0);
  const [currentTime, setCurrentTime] = useState(() =>
    new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setPosIdx((prev) => (prev + 1) % 6);
      setCurrentTime(new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }));
    }, 9000);
    return () => clearInterval(timer);
  }, []);

  // Diverse quadrants across the video viewport to make cropping impossible
  const positions = [
    "top-6 right-6 text-right",
    "bottom-12 left-6 text-left",
    "top-1/3 left-1/4 text-center",
    "bottom-16 right-8 text-right",
    "top-10 left-10 text-left",
    "bottom-1/3 right-1/4 text-center",
  ];

  const pos = positions[posIdx] || positions[0];

  return (
    <>
      {/* Floating dynamic drifting badge */}
      <div
        className={`absolute ${pos} pointer-events-none z-30 transition-all duration-1000 ease-in-out select-none`}
      >
        <div className="bg-black/50 backdrop-blur-[3px] border border-white/20 px-3 py-1.5 rounded-xl text-white/70 font-mono text-[11px] leading-tight shadow-lg space-y-0.5">
          <div className="font-bold tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/90 animate-pulse inline-block" />
            <span className="text-white/90">{name || "طالب ماكس بي"}</span>
          </div>
          {phone && <div className="text-[10px] text-white/60 font-mono">{phone}</div>}
          <div className="text-[9px] text-white/40 font-sans">MaxP Academy • {currentTime}</div>
        </div>
      </div>

      {/* Subtle faint diagonal watermark in the center */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 select-none overflow-hidden opacity-10">
        <div className="transform -rotate-12 text-center text-white font-mono text-sm tracking-widest uppercase">
          <div>{name || "MaxP Student"}</div>
          {phone && <div>{phone}</div>}
        </div>
      </div>
    </>
  );
}
