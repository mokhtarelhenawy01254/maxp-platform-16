import { useState, useEffect, type FormEvent } from "react";
import { Sparkles, X } from "lucide-react";
import { Lesson } from "./academyApi";

interface AcademyLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleId: string | null;
  editingLesson: Lesson | null;
  onSave: (payload: {
    title: string;
    videoUrl?: string | null;
    scriptText?: string | null;
    exerciseText?: string | null;
    durationMin: number;
    isFreePreview: boolean;
  }) => Promise<void>;
}

export function AcademyLessonModal({
  isOpen,
  onClose,
  moduleId,
  editingLesson,
  onSave,
}: AcademyLessonModalProps) {
  const [title, setTitle] = useState("");
  const [video, setVideo] = useState("");
  const [script, setScript] = useState("");
  const [exercise, setExercise] = useState("");
  const [duration, setDuration] = useState("15");
  const [freePreview, setFreePreview] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingLesson) {
      setTitle(editingLesson.title);
      setVideo(editingLesson.videoUrl || "");
      setScript(editingLesson.scriptText || "");
      setExercise(editingLesson.exerciseText || "");
      setDuration(String(editingLesson.durationMin || 15));
      setFreePreview(editingLesson.isFreePreview);
    } else {
      setTitle("");
      setVideo("");
      setScript("");
      setExercise("");
      setDuration("15");
      setFreePreview(false);
    }
  }, [editingLesson, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !moduleId) return;
    try {
      setSaving(true);
      await onSave({
        title: title.trim(),
        videoUrl: video.trim() || null,
        scriptText: script.trim() || null,
        exerciseText: exercise.trim() || null,
        durationMin: Number(duration) || 15,
        isFreePreview: freePreview,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs"
      dir="rtl"
    >
      <div className="bg-card border border-border/80 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between pb-2 border-b border-border/70">
          <h2 className="text-sm sm:text-base font-bold text-foreground">
            {editingLesson ? "تعديل الدرس" : "إضافة درس جديد"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted text-sm transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              عنوان الدرس *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: 1. مقدمة في شراء الوسائط الرقمية"
              className="w-full px-3 py-2 rounded-lg bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                رابط الفيديو (YouTube Unlisted)
              </label>
              <input
                type="url"
                value={video}
                onChange={(e) => setVideo(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-3 py-2 rounded-lg bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                مدة الدرس (دقيقة)
              </label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
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
              اكتب هنا ملخص الشرح الكامل والنقاط الأساسية للدرس. كوتش الذكاء الاصطناعي يستعين بهذا السكريبت للإجابة على أسئلة المتدربين بدقة.
            </p>
            <textarea
              rows={5}
              required
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="اكتب سكريبت الدرس بالتفصيل هنا..."
              className="w-full px-3 py-2 rounded-lg bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              التطبيق العملي والتمرين المطلوب
            </label>
            <textarea
              rows={2}
              value={exercise}
              onChange={(e) => setExercise(e.target.value)}
              placeholder="المهمة التطبيقية التي يجب على المتدرب تنفيذها..."
              className="w-full px-3 py-2 rounded-lg bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="previewCheckbox"
              checked={freePreview}
              onChange={(e) => setFreePreview(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary border-input"
            />
            <label
              htmlFor="previewCheckbox"
              className="text-xs text-foreground cursor-pointer font-medium"
            >
              إتاحة هذا الدرس كمعاينة مجانية لأي زائر قبل الاشتراك
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/70">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs disabled:opacity-50 transition"
            >
              {saving ? "جاري الحفظ..." : "حفظ الدرس"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
