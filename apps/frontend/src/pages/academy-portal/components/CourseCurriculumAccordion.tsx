import React, { useState } from "react";
import { Link } from "react-router-dom";
import { PlayCircle, Lock, ChevronDown, ChevronUp, Clock } from "lucide-react";

export interface LessonItem {
  id: string;
  title: string;
  durationMin: number;
  isFreePreview: boolean;
  isUnlocked: boolean;
}

export interface ModuleItem {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
  lessons: LessonItem[];
}

interface Props {
  courseId: string;
  modules: ModuleItem[];
}

export const CourseCurriculumAccordion: React.FC<Props> = ({ courseId, modules }) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    [modules[0]?.id || ""]: true,
  });

  const toggle = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-3 text-right" dir="rtl">
      {modules.map((module, mIdx) => {
        const isExp = expanded[module.id] ?? false;

        return (
          <div key={module.id} className="border border-border/70 rounded-2xl overflow-hidden bg-card shadow-xs transition-colors">
            <button
              type="button"
              onClick={() => toggle(module.id)}
              className="w-full p-4 sm:p-4.5 bg-card hover:bg-muted/30 transition-colors flex items-center justify-between gap-4 text-right"
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-mono font-bold border border-primary/20 shrink-0">
                  {mIdx + 1}
                </span>
                <div>
                  <span className="text-xs font-bold text-foreground block">{module.title}</span>
                  <span className="text-[11px] text-muted-foreground font-mono tabular-nums">{module.lessons?.length || 0} دروس</span>
                </div>
              </div>
              {isExp ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            {isExp && (
              <div className="p-2 sm:p-3 bg-muted/10 divide-y divide-border/40 border-t border-border/60">
                {module.lessons?.map((lesson, lIdx) => {
                  const isFree = lesson.isFreePreview || lIdx < 2;

                  return (
                    <div key={lesson.id} className="py-2.5 px-2 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isFree ? (
                          <PlayCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <Lock className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                        )}
                        <span className="text-foreground font-medium truncate">{lesson.title}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isFree ? (
                          <Link
                            to={`/portal/course/${courseId}/lesson/${lesson.id}`}
                            className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                          >
                            معاينة مجانية
                          </Link>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">متاح بعد الاشتراك</span>
                        )}
                        <span className="text-[11px] text-muted-foreground font-mono tabular-nums inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-muted-foreground/70" />
                          <span>{lesson.durationMin} د</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
