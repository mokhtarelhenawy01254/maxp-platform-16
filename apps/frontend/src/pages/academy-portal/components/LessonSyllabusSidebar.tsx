import React from "react";
import { Link } from "react-router-dom";
import { Layers, PlayCircle, Lock } from "lucide-react";

export interface SidebarLesson {
  id: string;
  title: string;
  isFreePreview: boolean;
  isUnlocked: boolean;
}

export interface SidebarModule {
  id: string;
  title: string;
  lessons: SidebarLesson[];
}

interface Props {
  courseId: string;
  currentLessonId: string;
  isEnrolled: boolean;
  modules: SidebarModule[];
}

export const LessonSyllabusSidebar: React.FC<Props> = ({
  courseId,
  currentLessonId,
  isEnrolled,
  modules,
}) => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4 shadow-sm h-fit">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <Layers className="w-4 h-4 text-indigo-600" />
        <h3 className="font-extrabold text-xs text-slate-900">فهرس دروس الكورس</h3>
      </div>

      <div className="space-y-4 max-h-[600px] overflow-y-auto pl-1">
        {modules.map((mod, mIdx) => (
          <div key={mod.id} className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-500 block">
              وحدة {mIdx + 1}: {mod.title}
            </span>

            <div className="space-y-1">
              {mod.lessons.map((l) => {
                const isCurrent = l.id === currentLessonId;
                const canAccess = l.isUnlocked || l.isFreePreview || isEnrolled;

                return (
                  <Link
                    key={l.id}
                    to={canAccess ? `/portal/course/${courseId}/lesson/${l.id}` : "#"}
                    className={`p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 transition-colors ${
                      isCurrent
                        ? "bg-indigo-50 text-indigo-900 font-bold border border-indigo-200"
                        : canAccess
                        ? "hover:bg-slate-50 text-slate-700"
                        : "text-slate-400 opacity-60 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {canAccess ? (
                        <PlayCircle className={`w-3.5 h-3.5 shrink-0 ${isCurrent ? "text-indigo-600" : "text-slate-400"}`} />
                      ) : (
                        <Lock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      )}
                      <span className="truncate">{l.title}</span>
                    </div>
                    {l.isFreePreview && (
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded shrink-0">
                        معاينة
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
