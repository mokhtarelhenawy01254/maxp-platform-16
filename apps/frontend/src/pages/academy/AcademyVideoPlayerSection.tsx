import { CheckCircle2, Clock, Loader2, Play } from "lucide-react";
import { Lesson, Quiz } from "./academyApi";
import { DynamicVideoWatermark } from "./DynamicVideoWatermark";

interface AcademyVideoPlayerSectionProps {
  currentLesson: Lesson | null;
  watermarkEnabled: boolean;
  studentInfo: { name?: string; phone?: string; email?: string; id?: string } | null;
  currentQuiz: Quiz | null;
  completing: boolean;
  isLessonDone?: boolean;
  onCompleteManual: () => void;
}

export function AcademyVideoPlayerSection({
  currentLesson,
  watermarkEnabled,
  studentInfo,
  currentQuiz,
  completing,
  isLessonDone,
  onCompleteManual,
}: AcademyVideoPlayerSectionProps) {
  const getEmbedUrl = (url?: string | null) => {
    if (!url) return null;
    const match = url.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
    );
    const videoId = match ? match[1] : null;
    if (!videoId) return url;
    return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&controls=1`;
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Video Player Box */}
      <div className="relative aspect-video rounded-2xl overflow-hidden bg-black/95 border border-border/70 shadow-lg">
        {currentLesson?.videoUrl ? (
          <iframe
            src={getEmbedUrl(currentLesson.videoUrl) || ""}
            title={currentLesson.title}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground/80 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
              <Play className="w-5 h-5 ml-0.5" />
            </div>
            <p className="text-xs sm:text-sm text-white/80 font-medium">
              هذا الدرس يعتمد على المحتوى النصي والتطبيق العملي
            </p>
            <p className="text-[11px] text-white/50 max-w-sm">
              راجع السكريبت والتمرين في الأسفل لإكمال مهام الدرس
            </p>
          </div>
        )}

        {watermarkEnabled && (
          <DynamicVideoWatermark
            name={studentInfo?.name || "متدرب المنصة"}
            phone={studentInfo?.phone || ""}
          />
        )}
      </div>

      {/* Lesson Header & Complete Action */}
      <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/70 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div className="space-y-1">
          <h2 className="text-base sm:text-lg font-bold text-foreground">
            {currentLesson?.title}
          </h2>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono tabular-nums">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span>المدة التقديرية: {currentLesson?.durationMin || 15} دقيقة</span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          {!currentQuiz && (
            <button
              disabled={completing || isLessonDone}
              onClick={onCompleteManual}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs active:scale-[0.98] ${
                isLessonDone
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {completing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>{isLessonDone ? "مكتمل" : completing ? "جاري الإتمام..." : "تأكيد الإتمام"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
