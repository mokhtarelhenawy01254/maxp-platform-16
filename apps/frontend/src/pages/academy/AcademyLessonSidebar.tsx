import {
  BookOpen,
  CheckCircle2,
  Lock,
  PlayCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Module, Lesson } from "./academyApi";

interface AcademyLessonSidebarProps {
  courseOutline: any;
  currentLessonId?: string;
  expandedModules: Record<string, boolean>;
  isTheaterMode: boolean;
  onToggleModule: (modId: string) => void;
  onSelectLesson: (lessonId: string) => void;
}

export function AcademyLessonSidebar({
  courseOutline,
  currentLessonId,
  expandedModules,
  isTheaterMode,
  onToggleModule,
  onSelectLesson,
}: AcademyLessonSidebarProps) {
  const modules: Module[] = courseOutline?.modules || [];
  const allFlatLessons = modules.flatMap((m) => m.lessons || []);
  const completedCount = allFlatLessons.filter(
    (l) => l.progress?.status === "DONE"
  ).length;

  return (
    <div
      className={`${
        isTheaterMode ? "lg:col-span-12" : "lg:col-span-4"
      } rounded-2xl bg-card border border-border/70 p-4 space-y-4 sticky top-4 max-h-[calc(100vh-6rem)] overflow-y-auto shadow-xs`}
    >
      <div className="flex items-center justify-between border-b border-border/70 pb-3">
        <h3 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-primary" />
          <span>منهج وفهرس الدورة</span>
        </h3>
        <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
          {completedCount} / {allFlatLessons.length} مكتمل
        </span>
      </div>

      <div className="space-y-3">
        {modules.map((mod, mIdx) => {
          const isExpanded = expandedModules[mod.id] ?? true;
          const completedInMod = (mod.lessons || []).filter(
            (l) => l.progress?.status === "DONE"
          ).length;

          return (
            <div
              key={mod.id}
              className="rounded-xl border border-border/60 overflow-hidden bg-muted/20"
            >
              {/* Collapsible Module Accordion Header */}
              <button
                type="button"
                onClick={() => onToggleModule(mod.id)}
                className="w-full text-right p-3 flex items-center justify-between gap-2 hover:bg-muted/40 transition"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                    الوحدة {mIdx + 1}
                  </span>
                  <h4 className="text-xs font-bold text-foreground line-clamp-1">
                    {mod.title}
                  </h4>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                    {completedInMod}/{(mod.lessons || []).length}
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
                  {(mod.lessons || []).map((lesson: Lesson) => {
                    const isSelected = lesson.id === currentLessonId;
                    const isDone = lesson.progress?.status === "DONE";
                    const isLocked = !lesson.isUnlocked;

                    return (
                      <button
                        key={lesson.id}
                        disabled={isLocked}
                        onClick={() => onSelectLesson(lesson.id)}
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
                            <PlayCircle className="w-4 h-4 text-primary flex-shrink-0" />
                          )}
                          <span className="truncate">{lesson.title}</span>
                        </div>

                        {lesson.isFreePreview && !courseOutline?.isEnrolled && (
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
  );
}
