import React, { useState } from "react";
import { Link } from "react-router-dom";
import { PlayCircle, Lock, ChevronDown, ChevronUp } from "lucide-react";

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
    <div className="space-y-3">
      {modules.map((module, mIdx) => {
        const isExp = expanded[module.id] ?? false;

        return (
          <div key={module.id} className="border border-slate-200 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => toggle(module.id)}
              className="w-full p-4 sm:p-5 bg-slate-50/70 hover:bg-slate-100/80 transition-colors flex items-center justify-between gap-4 text-right"
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                  {mIdx + 1}
                </span>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">{module.title}</span>
                  <span className="text-[11px] text-slate-500">{module.lessons?.length || 0} دروس</span>
                </div>
              </div>
              {isExp ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>

            {isExp && (
              <div className="p-3 sm:p-4 bg-white divide-y divide-slate-100 space-y-1">
                {module.lessons?.map((lesson, lIdx) => {
                  const isFree = lesson.isFreePreview || lIdx < 2;

                  return (
                    <div key={lesson.id} className="pt-2.5 pb-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5">
                        {isFree ? (
                          <PlayCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span className="text-slate-800 font-medium">{lesson.title}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isFree ? (
                          <Link
                            to={`/portal/course/${courseId}/lesson/${lesson.id}`}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-bold hover:bg-emerald-100 transition-colors"
                          >
                            معاينة مجانية
                          </Link>
                        ) : (
                          <span className="text-[11px] text-slate-400">متاح بعد الاشتراك</span>
                        )}
                        <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                          {lesson.durationMin} د
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
