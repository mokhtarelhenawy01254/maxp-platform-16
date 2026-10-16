import React, { useState } from "react";
import { ThumbsUp, ThumbsDown, Check, Loader2 } from "lucide-react";
import { getApiUrl } from "../../config/environment";

interface RatingButtonsProps {
  messageId: string;
  conversationId: string;
  customerId: string;
  onRatingSubmit?: (rating: "positive" | "negative", comment?: string) => void;
  className?: string;
}

const RatingButtons: React.FC<RatingButtonsProps> = ({
  messageId,
  conversationId,
  customerId,
  onRatingSubmit,
  className = "",
}) => {
  const [selectedRating, setSelectedRating] = useState<
    "positive" | "negative" | null
  >(null);
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleRatingClick = async (rating: "positive" | "negative") => {
    if (isSubmitted) return;

    setSelectedRating(rating);

    if (rating === "positive") {
      await submitRating(rating);
    } else {
      setShowCommentBox(true);
    }
  };

  const submitRating = async (
    rating: "positive" | "negative",
    userComment?: string,
  ) => {
    if (isSubmitting || isSubmitted) return;

    setIsSubmitting(true);

    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/monitor/quality/rating`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messageId,
          conversationId,
          customerId,
          rating,
          comment: userComment || comment || "",
        }),
      });

      const data = await response.json();

      if (data && data.success) {
        setIsSubmitted(true);
        setShowCommentBox(false);

        if (onRatingSubmit) {
          onRatingSubmit(rating, userComment || comment);
        }
      } else {
        throw new Error(data?.message || "Failed to submit rating");
      }
    } catch (error) {
      console.error("Error submitting rating:", error);
      setSelectedRating(null);
      setShowCommentBox(false);
      setIsSubmitted(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommentSubmit = async () => {
    if (selectedRating) {
      await submitRating(selectedRating, comment);
    }
  };

  const handleCommentCancel = () => {
    setShowCommentBox(false);
    setSelectedRating(null);
    setComment("");
  };

  if (isSubmitted) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 ${className}`}
        dir="rtl"
      >
        <Check className="size-3.5" />
        <span>شكراً لتقييمك!</span>
        {selectedRating === "positive" ? (
          <ThumbsUp className="mr-1 size-3 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <ThumbsDown className="mr-1 size-3 text-rose-500" />
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`} dir="rtl">
      {/* Rating actions bar */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">هل كان هذا الرد مفيداً؟</span>

        <button
          type="button"
          onClick={() => handleRatingClick("positive")}
          disabled={isSubmitting || isSubmitted}
          className={`flex size-7 items-center justify-center rounded-lg border transition-all ${
            selectedRating === "positive"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border-border/70 bg-card text-muted-foreground hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-600"
          } ${isSubmitting ? "cursor-not-allowed opacity-50" : "cursor-pointer active:scale-[0.96]"}`}
          title="مفيد"
          aria-label="مفيد"
        >
          <ThumbsUp className="size-3.5" />
        </button>

        <button
          type="button"
          onClick={() => handleRatingClick("negative")}
          disabled={isSubmitting || isSubmitted}
          className={`flex size-7 items-center justify-center rounded-lg border transition-all ${
            selectedRating === "negative"
              ? "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400"
              : "border-border/70 bg-card text-muted-foreground hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-600"
          } ${isSubmitting ? "cursor-not-allowed opacity-50" : "cursor-pointer active:scale-[0.96]"}`}
          title="غير مفيد"
          aria-label="غير مفيد"
        >
          <ThumbsDown className="size-3.5" />
        </button>

        {isSubmitting && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin text-primary" />
            <span>جاري الإرسال...</span>
          </div>
        )}
      </div>

      {/* Negative Feedback Drawer */}
      {showCommentBox && (
        <div className="space-y-2 rounded-xl border border-border/70 bg-card/60 p-3 shadow-none">
          <label className="block text-xs font-medium text-foreground">
            ما الذي يمكن تحسينه في هذا الرد؟ (اختياري)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="اكتب ملاحظاتك لمساعدة النظام في التحسين..."
            className="w-full resize-none rounded-lg border border-border/70 bg-background/80 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            rows={2}
            maxLength={200}
          />
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
              {comment.length}/200
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCommentCancel}
                className="rounded-lg border border-border/70 bg-background px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleCommentSubmit}
                disabled={isSubmitting}
                className="rounded-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {isSubmitting ? "جاري الإرسال..." : "إرسال"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RatingButtons;
