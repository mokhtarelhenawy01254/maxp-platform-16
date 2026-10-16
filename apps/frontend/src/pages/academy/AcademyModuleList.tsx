import {
  BookOpen,
  Plus,
  HelpCircle,
  Sparkles,
  Trash2,
  Edit2,
  Video,
} from "lucide-react";
import { Module, Lesson } from "./academyApi";

interface AcademyModuleListProps {
  modules: Module[] | undefined;
  onOpenAddModule: () => void;
  onOpenAddLesson: (moduleId: string) => void;
  onOpenEditLesson: (moduleId: string, lesson: Lesson) => void;
  onOpenQuizModal: (lesson: Lesson) => void;
  onDeleteModule: (moduleId: string) => Promise<void>;
  onDeleteLesson: (lessonId: string) => Promise<void>;
}

export function AcademyModuleList({
  modules,
  onOpenAddModule,
  onOpenAddLesson,
  onOpenEditLesson,
  onOpenQuizModal,
  onDeleteModule,
  onDeleteLesson,
}: AcademyModuleListProps) {
  if (!modules || modules.length === 0) {
    return (
      <div className="p-8 sm:p-12 rounded-2xl bg-card border border-dashed border-border/80 text-center space-y-3 shadow-xs" dir="rtl">
        <div className="w-10 h-10 rounded-xl bg-muted/30 text-muted-foreground flex items-center justify-center mx-auto">
          <BookOpen className="w-5 h-5" />
        </div>
        <h3 className="text-sm sm:text-base font-bold text-foreground">المنهج فارغ حالياً</h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
          أضف الوحدة الأولى ثم أضف الدروس بداخلها مع الفيديوهات وسكريبتات الذكاء الاصطناعي.
        </p>
        <button
          onClick={onOpenAddModule}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition active:scale-[0.98]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>إضافة أول وحدة</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {modules.map((mod, modIdx) => (
        <div
          key={mod.id}
          className="rounded-2xl bg-card border border-border/70 overflow-hidden shadow-xs"
        >
          {/* Module Header */}
          <div className="p-3.5 sm:p-4 bg-muted/30 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20 font-mono tabular-nums">
                  الوحدة {modIdx + 1}
                </span>
                <h3 className="font-bold text-foreground text-sm sm:text-base">{mod.title}</h3>
              </div>
              {mod.description && (
                <p className="text-xs text-muted-foreground">{mod.description}</p>
              )}
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={() => onOpenAddLesson(mod.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition active:scale-[0.98] flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة درس</span>
              </button>
              <button
                onClick={() => onDeleteModule(mod.id)}
                className="p-1.5 text-muted-foreground hover:text-destructive transition rounded-lg hover:bg-destructive/10"
                title="حذف الوحدة"
              >
                <Trash2 className="w-4 h-4" />
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
                  className="p-3.5 sm:p-4 hover:bg-muted/15 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start sm:items-center gap-2.5">
                    <span className="w-6 h-6 rounded-md bg-muted/50 text-muted-foreground text-[11px] flex items-center justify-center font-mono font-bold flex-shrink-0 border border-border/60">
                      {lessonIdx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs sm:text-sm font-semibold text-foreground">
                          {lesson.title}
                        </h4>
                        {lesson.isFreePreview && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                            معاينة مجانية
                          </span>
                        )}
                        {lesson.quiz && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-1">
                            <HelpCircle className="w-3 h-3" />
                            <span>كويز</span>
                          </span>
                        )}
                        {lesson.scriptText ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            <span>سكريبت AI جاهز</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            سكريبت مفقود
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1 font-mono tabular-nums">
                        <span>المدة: {lesson.durationMin || 10} دقيقة</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Video className="w-3 h-3 text-muted-foreground" />
                          <span>{lesson.videoUrl ? "فيديو مرفوع" : "بدون فيديو"}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    <button
                      onClick={() => onOpenQuizModal(lesson)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 border border-purple-500/20 transition active:scale-[0.98] flex items-center gap-1"
                    >
                      <HelpCircle className="w-3 h-3" />
                      <span>{lesson.quiz ? "تعديل الكويز" : "+ كويز"}</span>
                    </button>

                    <button
                      onClick={() => onOpenEditLesson(mod.id, lesson)}
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition"
                      title="تعديل الدرس"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onDeleteLesson(lesson.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition"
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
      ))}
    </div>
  );
}
