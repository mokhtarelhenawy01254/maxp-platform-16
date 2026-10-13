import { useEffect, useState, type FormEvent } from "react";
import { useParams, Link } from "react-router-dom";
import {
  BookOpen,
  Plus,
  ArrowRight,
  Video,
  FileText,
  HelpCircle,
  Sparkles,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Settings,
  Shield,
  Lock,
  Tag,
  Globe,
  ChevronRight,
  Clock,
  Layers,
} from "lucide-react";
import { academyApi, Course, Module, Lesson, Quiz, Question, AcademyStoreProduct } from "./academyApi";

export default function AcademyCourseEditorPage() {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [storeProducts, setStoreProducts] = useState<AcademyStoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Course Settings Modal
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [editCourseTitle, setEditCourseTitle] = useState("");
  const [editCourseDesc, setEditCourseDesc] = useState("");
  const [editCoursePrice, setEditCoursePrice] = useState("0");
  const [editFreePreviewCount, setEditFreePreviewCount] = useState("2");
  const [editStoreProductId, setEditStoreProductId] = useState("");
  const [editVisibility, setEditVisibility] = useState<"PUBLIC" | "UNLISTED" | "INVITE_ONLY" | "TAG_GATED">("PUBLIC");
  const [editAllowedTags, setEditAllowedTags] = useState("");
  const [editEnableWatermark, setEditEnableWatermark] = useState(true);
  const [editIsGlobal, setEditIsGlobal] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Module modal
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleDesc, setModuleDesc] = useState("");

  // Lesson modal
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonVideo, setLessonVideo] = useState("");
  const [lessonScript, setLessonScript] = useState("");
  const [lessonExercise, setLessonExercise] = useState("");
  const [lessonDuration, setLessonDuration] = useState("15");
  const [lessonFreePreview, setLessonFreePreview] = useState(false);

  // Quiz modal
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [quizLessonId, setQuizLessonId] = useState<string | null>(null);
  const [quizTitle, setQuizTitle] = useState("اختبار نهاية الدرس");
  const [quizPassScore, setQuizPassScore] = useState(70);
  const [questions, setQuestions] = useState<Question[]>([
    { q: "", options: ["", "", "", ""], correctIndex: 0, explanation: "" },
  ]);

  useEffect(() => {
    if (id) loadCourse();
    loadStoreProducts();
  }, [id]);

  const loadStoreProducts = async () => {
    try {
      const prods = await academyApi.getStoreProducts();
      setStoreProducts(prods);
    } catch (_) {}
  };

  const loadCourse = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await academyApi.getCourseDetails(id);
      setCourse(data);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.error || "فشل تحميل تفاصيل الكورس");
    } finally {
      setLoading(false);
    }
  };

  const openSettingsModal = () => {
    if (!course) return;
    setEditCourseTitle(course.title);
    setEditCourseDesc(course.description || "");
    setEditCoursePrice(String(course.price || 0));
    setEditFreePreviewCount(String(course.freePreviewLessons || 2));
    setEditStoreProductId(course.storeProductId || "");
    setEditVisibility(course.visibility || "PUBLIC");
    setEditAllowedTags(course.allowedTags?.join(", ") || "");
    setEditEnableWatermark(course.enableWatermark !== false);
    setEditIsGlobal(course.isGlobal || false);
    setIsSettingsModalOpen(true);
  };

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    if (!id || !editCourseTitle.trim()) return;
    try {
      setSavingSettings(true);
      const tagsArray = editAllowedTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      await academyApi.updateCourse(id, {
        title: editCourseTitle.trim(),
        description: editCourseDesc.trim() || undefined,
        price: Number(editCoursePrice) || 0,
        freePreviewLessons: Number(editFreePreviewCount) || 2,
        storeProductId: editStoreProductId.trim() || null,
        visibility: editVisibility,
        allowedTags: editVisibility === "TAG_GATED" ? tagsArray : [],
        enableWatermark: editEnableWatermark,
        isGlobal: editIsGlobal,
      });
      setIsSettingsModalOpen(false);
      loadCourse();
    } catch (err: any) {
      alert(err?.response?.data?.error || "فشل حفظ إعدادات الدورة");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddModule = async (e: FormEvent) => {
    e.preventDefault();
    if (!id || !moduleTitle.trim()) return;
    try {
      await academyApi.addModule(id, {
        title: moduleTitle.trim(),
        description: moduleDesc.trim() || undefined,
        sortOrder: (course?.modules?.length || 0) + 1,
      });
      setIsModuleModalOpen(false);
      setModuleTitle("");
      setModuleDesc("");
      loadCourse();
    } catch (err: any) {
      alert(err?.response?.data?.error || "فشل إضافة الوحدة");
    }
  };

  const openLessonModal = (moduleId: string, lesson?: Lesson) => {
    setSelectedModuleId(moduleId);
    if (lesson) {
      setEditingLesson(lesson);
      setLessonTitle(lesson.title);
      setLessonVideo(lesson.videoUrl || "");
      setLessonScript(lesson.scriptText || "");
      setLessonExercise(lesson.exerciseText || "");
      setLessonDuration(String(lesson.durationMin || 15));
      setLessonFreePreview(lesson.isFreePreview);
    } else {
      setEditingLesson(null);
      setLessonTitle("");
      setLessonVideo("");
      setLessonScript("");
      setLessonExercise("");
      setLessonDuration("15");
      setLessonFreePreview(false);
    }
    setIsLessonModalOpen(true);
  };

  const handleSaveLesson = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedModuleId || !lessonTitle.trim()) return;

    try {
      if (editingLesson) {
        await academyApi.updateLesson(editingLesson.id, {
          title: lessonTitle.trim(),
          videoUrl: lessonVideo.trim() || null,
          scriptText: lessonScript.trim() || null,
          exerciseText: lessonExercise.trim() || null,
          durationMin: Number(lessonDuration) || 15,
          isFreePreview: lessonFreePreview,
        });
      } else {
        await academyApi.addLesson(selectedModuleId, {
          title: lessonTitle.trim(),
          videoUrl: lessonVideo.trim() || null,
          scriptText: lessonScript.trim() || null,
          exerciseText: lessonExercise.trim() || null,
          durationMin: Number(lessonDuration) || 15,
          isFreePreview: lessonFreePreview,
        });
      }
      setIsLessonModalOpen(false);
      loadCourse();
    } catch (err: any) {
      alert(err?.response?.data?.error || "فشل حفظ الدرس");
    }
  };

  const openQuizModal = (lesson: Lesson) => {
    setQuizLessonId(lesson.id);
    if (lesson.quiz) {
      setQuizTitle(lesson.quiz.title || "اختبار نهاية الدرس");
      setQuizPassScore(lesson.quiz.passScorePercent || 70);
      setQuestions(
        lesson.quiz.questions?.length
          ? lesson.quiz.questions
          : [{ q: "", options: ["", "", "", ""], correctIndex: 0, explanation: "" }]
      );
    } else {
      setQuizTitle(`اختبار: ${lesson.title}`);
      setQuizPassScore(70);
      setQuestions([{ q: "", options: ["", "", "", ""], correctIndex: 0, explanation: "" }]);
    }
    setIsQuizModalOpen(true);
  };

  const handleSaveQuiz = async (e: FormEvent) => {
    e.preventDefault();
    if (!quizLessonId) return;
    try {
      await academyApi.saveLessonQuiz(quizLessonId, {
        title: quizTitle,
        passScorePercent: Number(quizPassScore) || 70,
        questions,
      });
      setIsQuizModalOpen(false);
      loadCourse();
    } catch (err: any) {
      alert(err?.response?.data?.error || "فشل حفظ الاختبار");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-background text-foreground flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs sm:text-sm text-muted-foreground">جاري تحميل منهج الدورة...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-background text-foreground flex items-center justify-center p-8" dir="rtl">
        <div className="text-center space-y-3 p-8 rounded-xl bg-card border border-border/70 max-w-md shadow-xs">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h2 className="text-base font-bold text-foreground">الدورة غير موجودة أو تم حذفها</h2>
          <p className="text-xs text-muted-foreground">يرجى التأكد من المعرف المطلوب أو اختيار دورة أخرى من القائمة.</p>
          <Link
            to="/academy/courses"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-xs"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>العودة لقائمة الدورات</span>
          </Link>
        </div>
      </div>
    );
  }

  const lessonCount = course.modules?.reduce((sum, m) => sum + (m.lessons?.length || 0), 0) || 0;

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-background text-foreground p-3.5 sm:p-6 space-y-6" dir="rtl">
      {/* Top Command Bar & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
        <div>
          <Link
            to="/academy/courses"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-1.5 transition"
          >
            <ArrowRight className="w-3 h-3" />
            <span>العودة لكل الدورات</span>
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">{course.title}</h1>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                course.isPublished
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
              }`}
            >
              {course.isPublished ? "منشور" : "مسودة"}
            </span>

            {/* Visibility Badge */}
            {course.visibility === "UNLISTED" && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                <span>غير مدرج (رابط مباشر)</span>
              </span>
            )}
            {course.visibility === "INVITE_ONLY" && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-orange-500/10 text-orange-600 dark:text-orange-300 border border-orange-500/20 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                <span>خاص (دعوة فقط)</span>
              </span>
            )}
            {course.visibility === "TAG_GATED" && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20 flex items-center gap-1">
                <Tag className="w-2.5 h-2.5" />
                <span>مخصص لوسوم: {course.allowedTags?.join(", ") || "بدون تحديد"}</span>
              </span>
            )}
            {(!course.visibility || course.visibility === "PUBLIC") && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-300 border border-sky-500/20 flex items-center gap-1">
                <Globe className="w-2.5 h-2.5" />
                <span>عام بالكتالوج</span>
              </span>
            )}

            {course.enableWatermark !== false && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                <Shield className="w-2.5 h-2.5" />
                <span>علامة مائية نشطة</span>
              </span>
            )}

            <span className="text-xs font-mono font-bold bg-muted text-foreground px-2 py-0.5 rounded border border-border/70 tabular-nums">
              {course.price > 0 ? `${course.price.toLocaleString()} ج.م` : "مجاني"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={openSettingsModal}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border/70 transition-all active:scale-[0.98]"
            title="تعديل تفاصيل الدورة، الخصوصية، الوسوم، والعلامة المائية"
          >
            <Settings className="w-3.5 h-3.5 text-primary" />
            <span>إعدادات الدورة</span>
          </button>

          <Link
            to={`/academy/catalog/${course.id}`}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border/70 transition-all active:scale-[0.98]"
          >
            <Eye className="w-3.5 h-3.5 text-primary" />
            <span>معاينة كطالب</span>
          </Link>
          <button
            onClick={() => setIsModuleModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition-all active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة وحدة</span>
          </button>
        </div>
      </div>

      {/* Course Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-card border border-border/70">
          <span className="text-[11px] text-muted-foreground">عدد الوحدات التدريبية</span>
          <p className="text-lg font-bold text-foreground font-mono tabular-nums mt-0.5">
            {course.modules?.length || 0}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-card border border-border/70">
          <span className="text-[11px] text-muted-foreground">إجمالي الدروس</span>
          <p className="text-lg font-bold text-foreground font-mono tabular-nums mt-0.5">
            {lessonCount}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-card border border-border/70">
          <span className="text-[11px] text-muted-foreground">دروس المعاينة المجانية</span>
          <p className="text-lg font-bold text-foreground font-mono tabular-nums mt-0.5">
            {course.freePreviewLessons || 0}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-card border border-border/70">
          <span className="text-[11px] text-muted-foreground">الطلاب المسجلين</span>
          <p className="text-lg font-bold text-foreground font-mono tabular-nums mt-0.5">
            {course._count?.enrollments || 0}
          </p>
        </div>
      </div>

      {/* Modules & Lessons Curriculum */}
      <div className="space-y-4">
        {course.modules?.length === 0 ? (
          <div className="p-8 sm:p-12 rounded-xl bg-card border border-dashed border-border/80 text-center space-y-3">
            <BookOpen className="w-10 h-10 text-muted-foreground/50 mx-auto" />
            <h3 className="text-sm sm:text-base font-bold text-foreground">المنهج فارغ حالياً</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              أضف الوحدة الأولى ثم أضف الدروس بداخلها مع الفيديوهات وسكريبتات الذكاء الاصطناعي.
            </p>
            <button
              onClick={() => setIsModuleModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة أول وحدة</span>
            </button>
          </div>
        ) : (
          course.modules?.map((mod, modIdx) => (
            <div
              key={mod.id}
              className="rounded-xl bg-card border border-border/70 overflow-hidden shadow-xs"
            >
              {/* Module Header */}
              <div className="p-3.5 sm:p-4 bg-muted/30 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                      الوحدة {modIdx + 1}
                    </span>
                    <h3 className="font-bold text-foreground text-sm sm:text-base">{mod.title}</h3>
                  </div>
                  {mod.description && <p className="text-xs text-muted-foreground">{mod.description}</p>}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => openLessonModal(mod.id)}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>إضافة درس</span>
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm("هل تريد حذف هذه الوحدة ودروسها؟")) {
                        await academyApi.deleteModule(mod.id);
                        loadCourse();
                      }
                    }}
                    className="p-1 text-muted-foreground hover:text-rose-500 transition rounded-lg hover:bg-rose-500/10"
                    title="حذف الوحدة"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Lessons Inside Module */}
              <div className="divide-y divide-border/60">
                {mod.lessons?.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    لا توجد دروس في هذه الوحدة بعد.
                  </div>
                ) : (
                  mod.lessons?.map((lesson, lessonIdx) => (
                    <div
                      key={lesson.id}
                      className="p-3 sm:p-3.5 hover:bg-muted/20 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start sm:items-center gap-2.5">
                        <span className="w-5 h-5 rounded-md bg-muted text-muted-foreground text-[11px] flex items-center justify-center font-mono font-bold flex-shrink-0 border border-border/60">
                          {lessonIdx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs sm:text-sm font-semibold text-foreground">{lesson.title}</h4>
                            {lesson.isFreePreview && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                                معاينة مجانية
                              </span>
                            )}
                            {lesson.quiz && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-0.5">
                                <HelpCircle className="w-2.5 h-2.5" />
                                <span>كويز</span>
                              </span>
                            )}
                            {lesson.scriptText ? (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-0.5">
                                <Sparkles className="w-2.5 h-2.5" />
                                <span>سكريبت AI جاهز</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                سكريبت مفقود
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                            المدة: {lesson.durationMin || 10} دقيقة • {lesson.videoUrl ? "فيديو مرفوع" : "بدون فيديو"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        <button
                          onClick={() => openQuizModal(lesson)}
                          className="px-2 py-1 rounded-lg text-[11px] font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 border border-purple-500/20 transition flex items-center gap-1"
                        >
                          <HelpCircle className="w-3 h-3" />
                          <span>{lesson.quiz ? "تعديل الكويز" : "+ كويز"}</span>
                        </button>

                        <button
                          onClick={() => openLessonModal(mod.id, lesson)}
                          className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition"
                          title="تعديل الدرس"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={async () => {
                            if (confirm("هل تريد حذف هذا الدرس؟")) {
                              await academyApi.deleteLesson(lesson.id);
                              loadCourse();
                            }
                          }}
                          className="p-1 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition"
                          title="حذف الدرس"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Module Modal */}
      {isModuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs" dir="rtl">
          <div className="bg-card border border-border/80 rounded-2xl w-full max-w-md p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-border/70">
              <h2 className="text-sm sm:text-base font-bold text-foreground">إضافة وحدة تدريبية جديدة</h2>
              <button
                type="button"
                onClick={() => setIsModuleModalOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent text-sm"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddModule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">عنوان الوحدة *</label>
                <input
                  type="text"
                  required
                  value={moduleTitle}
                  onChange={(e) => setModuleTitle(e.target.value)}
                  placeholder="مثال: الوحدة 1: التأسيس وسيكولوجية العرض"
                  className="w-full px-3 py-2 rounded-lg bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">وصف مختصر للوحدة</label>
                <textarea
                  rows={2}
                  value={moduleDesc}
                  onChange={(e) => setModuleDesc(e.target.value)}
                  placeholder="الأهداف التعليمية لهذه الوحدة..."
                  className="w-full px-3 py-2 rounded-lg bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/70">
                <button
                  type="button"
                  onClick={() => setIsModuleModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition"
                >
                  إضافة الوحدة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lesson Modal */}
      {isLessonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs" dir="rtl">
          <div className="bg-card border border-border/80 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-border/70">
              <h2 className="text-sm sm:text-base font-bold text-foreground">
                {editingLesson ? "تعديل الدرس" : "إضافة درس جديد"}
              </h2>
              <button
                type="button"
                onClick={() => setIsLessonModalOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent text-sm"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveLesson} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">عنوان الدرس *</label>
                <input
                  type="text"
                  required
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  placeholder="مثال: 1. مقدمة في شراء الوسائط الرقمية"
                  className="w-full px-3 py-2 rounded-lg bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">رابط الفيديو (YouTube Unlisted)</label>
                  <input
                    type="url"
                    value={lessonVideo}
                    onChange={(e) => setLessonVideo(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-3 py-2 rounded-lg bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">مدة الدرس (دقيقة)</label>
                  <input
                    type="number"
                    value={lessonDuration}
                    onChange={(e) => setLessonDuration(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-input text-xs sm:text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              {/* Script Text — Critical for AI Coach */}
              <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>سكريبت الدرس (مصدر معرفة الـ AI Coach) *</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  اكتب هنا ملخص الشرح الكامل والنقاط الأساسية للدرس. كوتش الذكاء الاصطناعي مقيد حرفياً بالإجابة على أسئلة الطالب من هذا السكريبت فقط!
                </p>
                <textarea
                  rows={6}
                  required
                  value={lessonScript}
                  onChange={(e) => setLessonScript(e.target.value)}
                  placeholder="اكتب سكريبت الدرس بالتفصيل هنا..."
                  className="w-full px-3 py-2 rounded-lg bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">التطبيق العملي والتمرين المطلوب</label>
                <textarea
                  rows={2}
                  value={lessonExercise}
                  onChange={(e) => setLessonExercise(e.target.value)}
                  placeholder="المهمة التطبيقية التي يجب على المتدرب تنفيذها..."
                  className="w-full px-3 py-2 rounded-lg bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="previewCheckbox"
                  checked={lessonFreePreview}
                  onChange={(e) => setLessonFreePreview(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary border-input"
                />
                <label htmlFor="previewCheckbox" className="text-xs text-foreground cursor-pointer font-medium">
                  إتاحة هذا الدرس كمعاينة مجانية لأي زائر قبل الاشتراك
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/70">
                <button
                  type="button"
                  onClick={() => setIsLessonModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition"
                >
                  حفظ الدرس
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quiz Modal */}
      {isQuizModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs" dir="rtl">
          <div className="bg-card border border-border/80 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-border/70">
              <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-purple-500" />
                <span>إعداد اختبار الدرس (Quiz)</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsQuizModalOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuiz} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">عنوان الاختبار</label>
                  <input
                    type="text"
                    value={quizTitle}
                    onChange={(e) => setQuizTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">نسبة النجاح المطلوبة (%)</label>
                  <input
                    type="number"
                    value={quizPassScore}
                    onChange={(e) => setQuizPassScore(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-input text-xs sm:text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              {/* Questions */}
              <div className="space-y-3">
                {questions.map((q, qIdx) => (
                  <div key={qIdx} className="p-3.5 rounded-xl bg-muted/20 border border-border/70 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-600 dark:text-purple-400">السؤال {qIdx + 1}</span>
                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setQuestions(questions.filter((_, i) => i !== qIdx))}
                          className="text-xs text-rose-500 hover:underline font-medium"
                        >
                          حذف السؤال
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      required
                      placeholder="نص السؤال..."
                      value={q.q}
                      onChange={(e) => {
                        const next = [...questions];
                        next[qIdx].q = e.target.value;
                        setQuestions(next);
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />

                    <div className="space-y-1.5">
                      <label className="block text-[11px] text-muted-foreground font-medium">الاختيارات (حدد الإجابة الصحيحة):</label>
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct_${qIdx}`}
                            checked={q.correctIndex === optIdx}
                            onChange={() => {
                              const next = [...questions];
                              next[qIdx].correctIndex = optIdx;
                              setQuestions(next);
                            }}
                            className="text-purple-600 focus:ring-purple-500 w-4 h-4"
                          />
                          <input
                            type="text"
                            required
                            placeholder={`خيار ${optIdx + 1}`}
                            value={opt}
                            onChange={(e) => {
                              const next = [...questions];
                              next[qIdx].options[optIdx] = e.target.value;
                              setQuestions(next);
                            }}
                            className="flex-1 px-3 py-1 rounded-lg bg-background border border-input text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          />
                        </div>
                      ))}
                    </div>

                    <div>
                      <label className="block text-[11px] text-muted-foreground mb-1">شرح توضيحي للإجابة الصحيحة (اختياري):</label>
                      <input
                        type="text"
                        placeholder="لماذا هذه هي الإجابة الصحيحة؟"
                        value={q.explanation || ""}
                        onChange={(e) => {
                          const next = [...questions];
                          next[qIdx].explanation = e.target.value;
                          setQuestions(next);
                        }}
                        className="w-full px-3 py-1.5 rounded-lg bg-background border border-input text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() =>
                    setQuestions([
                      ...questions,
                      { q: "", options: ["", "", "", ""], correctIndex: 0, explanation: "" },
                    ])
                  }
                  className="w-full py-2 rounded-lg text-xs font-semibold bg-muted/40 border border-dashed border-border/80 text-purple-600 dark:text-purple-400 hover:bg-muted transition"
                >
                  + إضافة سؤال آخر
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/70">
                <button
                  type="button"
                  onClick={() => setIsQuizModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-xs transition"
                >
                  حفظ الاختبار
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Course Settings & Privacy Modal */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs" dir="rtl">
          <div className="bg-card border border-border/80 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" />
                <span>إعدادات الدورة والخصوصية والعلامة المائية</span>
              </h2>
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">اسم الدورة *</label>
                <input
                  type="text"
                  required
                  value={editCourseTitle}
                  onChange={(e) => setEditCourseTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">وصف الدورة</label>
                <textarea
                  rows={3}
                  value={editCourseDesc}
                  onChange={(e) => setEditCourseDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">سعر البيع (EGP)</label>
                  <input
                    type="number"
                    value={editCoursePrice}
                    onChange={(e) => setEditCoursePrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-input text-xs sm:text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">الدروس المجانية (معاينة)</label>
                  <input
                    type="number"
                    value={editFreePreviewCount}
                    onChange={(e) => setEditFreePreviewCount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-input text-xs sm:text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-foreground">
                  ربط بمنتج المتجر (للاشتراك والتسجيل التلقائي فور الدفع)
                </label>
                {storeProducts.length > 0 ? (
                  <select
                    value={editStoreProductId}
                    onChange={(e) => {
                      const selId = e.target.value;
                      setEditStoreProductId(selId);
                      const prod = storeProducts.find((p) => p.id === selId);
                      if (prod && (!editCoursePrice || editCoursePrice === "0")) {
                        setEditCoursePrice(String(prod.price));
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">-- بدون ربط بمنتج متجر --</option>
                    {storeProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.price} EGP {p.sku ? `- SKU: ${p.sku}` : ""})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={editStoreProductId}
                    onChange={(e) => setEditStoreProductId(e.target.value)}
                    placeholder="ID المنتج في المتجر"
                    className="w-full px-3 py-2 rounded-lg bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                  />
                )}
                {storeProducts.length > 0 && (
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                    <span>
                      {editStoreProductId ? "التسجيل التلقائي مفعّل فور تأكيد وسداد طلب هذا المنتج" : "اختر المنتج الذي عند شرائه يتم تسجيل الطالب تلقائياً"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const customId = prompt("أدخل معرف المنتج (Store Product ID) يدوياً:", editStoreProductId);
                        if (customId !== null) setEditStoreProductId(customId.trim());
                      }}
                      className="text-primary hover:underline text-[11px]"
                    >
                      إدخال ID يدوي
                    </button>
                  </div>
                )}
              </div>

              {/* Privacy & Visibility Settings */}
              <div className="p-3 rounded-xl bg-muted/30 border border-border/70 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    نطاق ظهور الدورة (الخصوصية والتحكم في الوصول)
                  </label>
                  <select
                    value={editVisibility}
                    onChange={(e: any) => setEditVisibility(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-card border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="PUBLIC">عام (معروض للجميع في كتالوج الأكاديمية)</option>
                    <option value="UNLISTED">غير مدرج (مخفي من الكتالوج ومتاح برابط مباشر فقط)</option>
                    <option value="INVITE_ONLY">خاص / دعوة فقط (لا يظهر إلا للمشتركين المسجلين)</option>
                    <option value="TAG_GATED">مخصص لوسوم معينة (يظهر فقط لعملاء بوسوم CRM محددة)</option>
                  </select>
                </div>

                {editVisibility === "TAG_GATED" && (
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      الوسوم المصرح لها برؤية الكورس (مفصولة بفواصل)
                    </label>
                    <input
                      type="text"
                      value={editAllowedTags}
                      onChange={(e) => setEditAllowedTags(e.target.value)}
                      placeholder="مثال: vip, agency, media_buyer"
                      className="w-full px-3 py-2 rounded-lg bg-card border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      سيظهر الكورس في الكتالوج فقط للعملاء الذين يمتلكون واحداً على الأقل من هذه الوسوم.
                    </p>
                  </div>
                )}

                {/* Watermark toggle */}
                <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editEnableWatermark}
                    onChange={(e) => setEditEnableWatermark(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-primary focus:ring-primary border-input"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-foreground">تفعيل العلامة المائية ضد التسريب (Anti-Leak Watermark)</span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      تعرض اسم ورقم هاتف وتوقيت دخول الطالب متحركاً على الفيديو لمنع تصوير الشاشة وتحديد مسرب الكورس فوراً.
                    </p>
                  </div>
                </label>

                {/* Global Platform Course toggle */}
                <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editIsGlobal}
                    onChange={(e) => setEditIsGlobal(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-primary focus:ring-primary border-input"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-amber-500" />
                      كورس عام على مستوى المنصة (Global)
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      عند التفعيل، يظهر هذا الكورس تلقائياً في كتالوج جميع الشركات والتجار على MaxP، وليس فقط داخل شركتك. (صلاحية الـ Super Admin فقط)
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/70">
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs disabled:opacity-50 transition"
                >
                  {savingSettings ? "جاري الحفظ..." : "حفظ التعديلات"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
