import { Link } from "react-router-dom";
import {
  ArrowRight,
  Award,
  Maximize2,
  Minimize2,
  Sparkles,
} from "lucide-react";

interface AcademyLessonTopBarProps {
  courseTitle: string;
  currentIdx: number;
  totalLessons: number;
  hasCertificate?: boolean;
  isTheaterMode: boolean;
  isCoachOpen: boolean;
  onToggleTheaterMode: () => void;
  onToggleCoach: () => void;
}

export function AcademyLessonTopBar({
  courseTitle,
  currentIdx,
  totalLessons,
  hasCertificate,
  isTheaterMode,
  isCoachOpen,
  onToggleTheaterMode,
  onToggleCoach,
}: AcademyLessonTopBarProps) {
  return (
    <div className="flex items-center justify-between gap-4 pb-4 border-b border-border/70">
      <div className="flex items-center gap-2">
        <Link
          to="/academy/catalog"
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition"
          title="العودة للكتالوج"
        >
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-sm sm:text-base font-bold text-foreground line-clamp-1">
            {courseTitle}
          </h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-mono tabular-nums">
            <span>
              درس {currentIdx + 1} من {totalLessons}
            </span>
            {hasCertificate && (
              <span className="text-primary font-semibold inline-flex items-center gap-1 mr-2">
                <Award className="w-3.5 h-3.5" />
                <span>الشهادة متاحة</span>
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onToggleTheaterMode}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-card hover:bg-muted text-foreground border border-border/70 transition flex items-center gap-1.5 shadow-xs"
        >
          {isTheaterMode ? (
            <Minimize2 className="w-3.5 h-3.5 text-primary" />
          ) : (
            <Maximize2 className="w-3.5 h-3.5 text-primary" />
          )}
          <span className="hidden sm:inline">
            {isTheaterMode ? "المشغل القياسي" : "وضع المسرح"}
          </span>
        </button>

        <button
          onClick={onToggleCoach}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition flex items-center gap-1.5 shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>الكوتش الذكي</span>
        </button>
      </div>
    </div>
  );
}
