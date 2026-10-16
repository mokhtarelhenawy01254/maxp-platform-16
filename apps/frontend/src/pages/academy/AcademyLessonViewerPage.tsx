import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  HelpCircle,
  FileText,
  AlertCircle,
  ArrowRight,
  BookOpen,
  Loader2,
} from "lucide-react";
import { academyApi, Module, Lesson, Quiz, ExerciseSubmission } from "./academyApi";
import { AcademyLessonSidebar } from "./AcademyLessonSidebar";
import { AcademyLessonExerciseView } from "./AcademyLessonExerciseView";
import { AcademyLessonQuizView } from "./AcademyLessonQuizView";
import { AcademyLessonAiCoachDrawer } from "./AcademyLessonAiCoachDrawer";
import { AcademyVideoPlayerSection } from "./AcademyVideoPlayerSection";
import { AcademyLessonTopBar } from "./AcademyLessonTopBar";
import { AcademyLessonScriptTab } from "./AcademyLessonScriptTab";

export default function AcademyLessonViewerPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId?: string }>();
  const [courseOutline, setCourseOutline] = useState<any>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View mode & Accordion state
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  // Watermark state
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [studentInfo, setStudentInfo] = useState<{ name?: string; phone?: string; email?: string; id?: string } | null>(null);

  // Active tab & Quiz state
  const [activeTab, setActiveTab] = useState<"script" | "exercise" | "quiz">("script");
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<any>(null);

  // Exercise Submissions state
  const [exerciseSubmissions, setExerciseSubmissions] = useState<ExerciseSubmission[]>([]);
  const [exerciseTextVal, setExerciseTextVal] = useState("");
  const [exerciseUrlVal, setExerciseUrlVal] = useState("");
  const [submittingExercise, setSubmittingExercise] = useState(false);
  const [isEditingSubmission, setIsEditingSubmission] = useState(false);

  // AI Coach & Completion state
  const [coachMessages, setCoachMessages] = useState<Array<{ role: "user" | "coach"; text: string }>>([]);
  const [inputMsg, setInputMsg] = useState("");
  const [askingCoach, setAskingCoach] = useState(false);
  const [isCoachOpen, setIsCoachOpen] = useState(false);
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

      const allLessons = (outline.modules || []).flatMap((m: Module) => m.lessons || []);
      let selected = allLessons.find((l: Lesson) => l.id === targetLessonId);
      if (!selected) {
        selected = allLessons.find((l: Lesson) => l.isUnlocked) || allLessons[0];
      }

      if (selected) {
        const parentMod = (outline.modules || []).find((m: Module) =>
          (m.lessons || []).some((l: Lesson) => l.id === selected!.id)
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
      if (data?.lesson) {
        setCurrentLesson(data.lesson);
        setCurrentQuiz(data.quiz || null);
      }
      setQuizAnswers([]);
      setQuizResult(null);

      const activeOutline = outlineRef || courseOutline;
      if (activeOutline) {
        const parentMod = (activeOutline.modules || []).find((m: Module) =>
          (m.lessons || []).some((l: Lesson) => l.id === lId)
        );
        if (parentMod) {
          setExpandedModules((prev) => ({ ...prev, [parentMod.id]: true }));
        }
      }

      setWatermarkEnabled(data?.enableWatermark !== false);
      if (data?.studentInfo) {
        setStudentInfo(data.studentInfo);
      }

      try {
        const subs = await academyApi.getLessonSubmissions(lId);
        setExerciseSubmissions(subs || []);
        const firstSub = subs?.[0];
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

      setCoachMessages([
        {
          role: "coach",
          text: `مرحباً بك في درس "${data?.lesson?.title || ""}"! أنا كوتش ماكس بي الذكي، جاهز للإجابة على أي استفسار حول هذا الدرس.`,
        },
      ]);
    } catch (err: any) {
      // silently handle
    }
  };

  const handleExerciseSubmit = async () => {
    if (!currentLesson || (!exerciseTextVal.trim() && !exerciseUrlVal.trim())) return;
    try {
      setSubmittingExercise(true);
      const res = await academyApi.submitExercise(currentLesson.id, {
        submissionText: exerciseTextVal.trim(),
        submissionUrl: exerciseUrlVal.trim() || undefined,
      });

      setExerciseSubmissions((prev) => [res.submission, ...prev]);
      setIsEditingSubmission(false);

      if (res.submission.status === "ACCEPTED" && courseId) {
        const outline = await academyApi.getCourseOutline(courseId);
        setCourseOutline(outline);
      }
    } catch (err: any) {
      alert(err?.response?.data?.error || "فشل إرسال التمرين للمصحح الذكي");
    } finally {
      setSubmittingExercise(false);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!currentQuiz || !courseOutline?.enrollmentId || !currentLesson) return;
    try {
      setQuizSubmitting(true);
      const res = await academyApi.submitQuiz(
        currentQuiz.id,
        courseOutline.enrollmentId,
        currentLesson.id,
        quizAnswers
      );
      setQuizResult(res);

      if (res.passed && courseId) {
        const outline = await academyApi.getCourseOutline(courseId);
        setCourseOutline(outline);
      }
    } catch (err: any) {
      alert(err?.response?.data?.error || "فشل تسليم إجابات الاختبار");
    } finally {
      setQuizSubmitting(false);
    }
  };

  const handleCompleteManual = async () => {
    if (!currentLesson || !courseOutline?.enrollmentId) return;
    try {
      setCompleting(true);
      await academyApi.completeLesson(currentLesson.id, courseOutline.enrollmentId);
      const outline = await academyApi.getCourseOutline(courseId!);
      setCourseOutline(outline);
      const data = await academyApi.getLessonContent(currentLesson.id);
      if (data?.lesson) setCurrentLesson(data.lesson);
    } catch (err: any) {
      alert(err?.response?.data?.error || "فشل تأكيد إتمام الدرس");
    } finally {
      setCompleting(false);
    }
  };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-8">
        <div className="text-center space-y-2 bg-card border border-border/70 rounded-2xl p-8 shadow-xs">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">جاري تجهيز مشغل الدروس...</p>
        </div>
      </div>
    );
  }

  if (error || !courseOutline) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-8" dir="rtl">
        <div className="text-center space-y-3 p-8 rounded-2xl bg-card border border-border/70 max-w-md shadow-xs">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
          <p className="text-sm text-destructive font-medium">{error || "تعذر العثور على الدورة"}</p>
          <Link to="/academy/catalog" className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline">
            <ArrowRight className="w-3.5 h-3.5" />
            <span>العودة لكتالوج الدورات</span>
          </Link>
        </div>
      </div>
    );
  }

  const allFlatLessons = (courseOutline.modules || []).flatMap((m: Module) => m.lessons || []);
  const currentIdx = allFlatLessons.findIndex((l: Lesson) => l.id === currentLesson?.id);
  const isLessonDone = allFlatLessons.find((l: Lesson) => l.id === currentLesson?.id)?.progress?.status === "DONE";
  const courseTitle = courseOutline?.course?.title || courseOutline?.title || "دورة تعليمية";

  return (
    <div className="min-h-screen bg-background text-foreground p-2 sm:p-5 flex flex-col space-y-4" dir="rtl">
      {/* Top Bar */}
      <AcademyLessonTopBar
        courseTitle={courseTitle}
        currentIdx={currentIdx}
        totalLessons={allFlatLessons.length}
        hasCertificate={Boolean(courseOutline.certificate)}
        isTheaterMode={isTheaterMode}
        isCoachOpen={isCoachOpen}
        onToggleTheaterMode={() => setIsTheaterMode(!isTheaterMode)}
        onToggleCoach={() => setIsCoachOpen(!isCoachOpen)}
      />

      {/* Main Grid: Player + Tabs & Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
        <div className={`${isTheaterMode ? "lg:col-span-12" : "lg:col-span-8"} space-y-4`}>
          {/* Video Player Section */}
          <AcademyVideoPlayerSection
            currentLesson={currentLesson}
            watermarkEnabled={watermarkEnabled}
            studentInfo={studentInfo}
            currentQuiz={currentQuiz}
            completing={completing}
            isLessonDone={isLessonDone}
            onCompleteManual={handleCompleteManual}
          />

          {/* Under-Player Tabs Switcher */}
          <div className="flex items-center gap-2 border-b border-border/60 pb-2">
            <button
              onClick={() => setActiveTab("script")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-[0.98] ${
                activeTab === "script"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>سكريبت وملخص الدرس</span>
            </button>

            <button
              onClick={() => setActiveTab("exercise")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-[0.98] ${
                activeTab === "exercise"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>التطبيق العملي</span>
            </button>

            {currentQuiz && (
              <button
                onClick={() => setActiveTab("quiz")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-[0.98] ${
                  activeTab === "quiz"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                <span>اختبار الدرس (كويز)</span>
              </button>
            )}
          </div>

          {/* Tab 1: Script */}
          {activeTab === "script" && (
            <AcademyLessonScriptTab scriptText={currentLesson?.scriptText} />
          )}

          {/* Tab 2: Exercise */}
          {activeTab === "exercise" && (
            <AcademyLessonExerciseView
              currentLesson={currentLesson}
              exerciseSubmissions={exerciseSubmissions}
              isEditingSubmission={isEditingSubmission}
              exerciseTextVal={exerciseTextVal}
              exerciseUrlVal={exerciseUrlVal}
              submittingExercise={submittingExercise}
              onSetExerciseTextVal={setExerciseTextVal}
              onSetExerciseUrlVal={setExerciseUrlVal}
              onSetIsEditingSubmission={setIsEditingSubmission}
              onSubmitExercise={handleExerciseSubmit}
            />
          )}

          {/* Tab 3: Quiz */}
          {activeTab === "quiz" && currentQuiz && (
            <AcademyLessonQuizView
              quiz={currentQuiz}
              quizAnswers={quizAnswers}
              quizSubmitting={quizSubmitting}
              quizResult={quizResult}
              onChangeAnswer={(qIdx, optIdx) => {
                const next = [...quizAnswers];
                next[qIdx] = optIdx;
                setQuizAnswers(next);
              }}
              onSubmitQuiz={handleSubmitQuiz}
            />
          )}
        </div>

        {/* Right Syllabus Navigation */}
        <AcademyLessonSidebar
          courseOutline={courseOutline}
          currentLessonId={currentLesson?.id}
          expandedModules={expandedModules}
          isTheaterMode={isTheaterMode}
          onToggleModule={toggleModule}
          onSelectLesson={(lId) => selectLesson(lId, courseOutline?.enrollmentId)}
        />
      </div>

      {/* Floating AI Coach Drawer */}
      <AcademyLessonAiCoachDrawer
        isOpen={isCoachOpen}
        currentLessonTitle={currentLesson?.title}
        coachMessages={coachMessages}
        inputMsg={inputMsg}
        askingCoach={askingCoach}
        onClose={() => setIsCoachOpen(false)}
        onSetInputMsg={setInputMsg}
        onAskCoach={handleAskCoach}
      />
    </div>
  );
}
