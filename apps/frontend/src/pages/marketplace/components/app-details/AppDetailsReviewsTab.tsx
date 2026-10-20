import React from "react";
import { Star, Check, MessageSquare, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

export interface ReviewItem {
  id: string;
  rating: number;
  title?: string;
  comment?: string;
  isVerified: boolean;
  createdAt: string;
  user?: { name: string };
}

interface AppDetailsReviewsTabProps {
  rating: number;
  reviewCount: number;
  reviews: ReviewItem[];
  userRating: number;
  reviewText: string;
  submittingReview: boolean;
  onRatingChange: (rating: number) => void;
  onReviewTextChange: (text: string) => void;
  onSubmitReview: () => void;
}

export const AppDetailsReviewsTab: React.FC<AppDetailsReviewsTabProps> = ({
  rating,
  reviewCount,
  reviews,
  userRating,
  reviewText,
  submittingReview,
  onRatingChange,
  onReviewTextChange,
  onSubmitReview,
}) => {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border bg-card p-5 text-right">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-extrabold text-foreground">
          {t("marketplace.ratings")}
        </h2>
        <div className="flex items-center gap-3">
          <div className="text-center">
            <div className="text-3xl font-extrabold text-foreground tabular-nums font-mono">
              {rating?.toFixed(1)}
            </div>
            <div className="flex items-center gap-0.5 mt-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  size={14}
                  className={
                    i <= (rating || 0)
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/30"
                  }
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1 tabular-nums">
              {reviewCount}{" "}
              {t("marketplace.totalReviews", { count: reviewCount })}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {[5, 4, 3, 2, 1].map((score) => {
          const count = reviews.filter((r) => r.rating === score).length;
          const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
          return (
            <div key={score} className="flex items-center gap-3">
              <span className="text-xs font-bold text-muted-foreground w-5 tabular-nums">
                {score}
              </span>
              <Star
                size={12}
                className="fill-amber-400 text-amber-400 shrink-0"
              />
              <Progress value={pct} className="h-2 flex-1" />
              <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">
                {count}
              </span>
            </div>
          );
        })}
      </div>

      <Separator className="my-4" />

      <div className="space-y-4">
        {reviews.map((review) => (
          <article
            key={review.id}
            className="rounded-xl border bg-background p-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                  {review.user?.name?.[0] || "?"}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {review.user?.name || "مستخدم"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(review.createdAt).toLocaleDateString("ar-EG")}
                  </p>
                </div>
              </div>
              <div>
                <div className="flex gap-1 mb-1 justify-end">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      size={13}
                      className={
                        i <= review.rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/30"
                      }
                    />
                  ))}
                </div>
                {review.isVerified && (
                  <Badge variant="outline" className="text-[10px] gap-0.5">
                    <Check size={10} className="text-emerald-600" />
                    {t("marketplace.verifiedPurchase")}
                  </Badge>
                )}
              </div>
            </div>
            {review.title && (
              <h4 className="mt-2 text-sm font-bold text-foreground">
                {review.title}
              </h4>
            )}
            {review.comment && (
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                {review.comment}
              </p>
            )}
          </article>
        ))}
      </div>

      <Separator className="my-4" />

      <div className="rounded-xl border bg-background p-4">
        <h3 className="text-sm font-bold text-foreground mb-3">
          {t("marketplace.writeReview")}
        </h3>
        <div className="flex items-center gap-1 mb-3 justify-end">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => onRatingChange(i)}
              aria-label={`${i} نجوم`}
            >
              <Star
                size={20}
                className={
                  i <= userRating
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground/30"
                }
              />
            </button>
          ))}
        </div>
        <textarea
          value={reviewText}
          onChange={(e) => onReviewTextChange(e.target.value)}
          placeholder="شارك تجربتك مع هذه الأداة..."
          className="w-full rounded-xl border border-border bg-background p-3 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
          rows={3}
        />
        <Button
          onClick={onSubmitReview}
          disabled={userRating === 0 || submittingReview}
          className="mt-3 w-full gap-2"
          size="sm"
        >
          {submittingReview ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <MessageSquare size={14} />
          )}
          إرسال التقييم
        </Button>
      </div>
    </div>
  );
};
