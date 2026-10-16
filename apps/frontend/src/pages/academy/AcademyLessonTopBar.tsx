import { Link } from "react-router-dom";
import {
  ArrowRight,
  Award,
  Maximize2,
  Minimize2,
  Bot,
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
    <div className="flex items-center justify-between gap-4 pb-4 border-b border-border/60 text-right" dir="rtl">
      <div className="flex items-center gap-2.5 min-w-0">
        <Link
          to="/academy/catalog"
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          title="العودة للكتالوج"
          aria-label="العودة للكتالوج"
        >
          <ArrowRight className="w-4 h-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-bold text-foreground truncate">
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

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onToggleTheaterMode}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-card hover:bg-muted text-foreground border border-border/60 transition-all active:scale-[0.98] flex items-center gap-1.5 shadow-2xs"
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
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.98] flex items-center gap-1.5 shadow-2xs ${
            isCoachOpen
              ? "bg-primary text-primary-foreground border border-primary shadow-xs"
              : "bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>الكوتش الذكي</span>
        </button>
      </div>
    </div>
  );
}
