import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MessageSquare, CheckCircle2, Clock, ArrowLeft, Loader2 } from "lucide-react";
import CommentService from "../../services/commentService";

const CommentStatsWidget = () => {
  const [stats, setStats] = useState({
    total: 0,
    responded: 0,
    pending: 0,
    responseRate: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const response = await CommentService.getCommentStats();
      if (response && response.success) {
        setStats(response.data || {});
      }
    } catch (error) {
      console.error("Error fetching comment statistics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-border/70 bg-card p-4 shadow-none sm:p-5">
        <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <MessageSquare className="size-3.5" />
            </div>
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              تعليقات فيسبوك
            </h3>
          </div>
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
        <div className="space-y-2.5">
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted/60" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted/60" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 shadow-none transition-colors hover:border-border sm:p-5">
      <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            <MessageSquare className="size-3.5" />
          </div>
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            تعليقات فيسبوك
          </h3>
        </div>
        <Link
          to="/comments"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:underline"
        >
          <span>عرض الكل</span>
          <ArrowLeft className="size-3" />
        </Link>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">إجمالي التعليقات</p>
            <p className="mt-0.5 font-mono text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {stats.total.toLocaleString()}
            </p>
          </div>
          <div className="flex size-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <MessageSquare className="size-4" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2.5">
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-3.5" />
              <span>تم الرد</span>
            </div>
            <p className="mt-1 font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {stats.responded.toLocaleString()}
            </p>
          </div>

          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2.5">
            <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <Clock className="size-3.5" />
              <span>قيد الانتظار</span>
            </div>
            <p className="mt-1 font-mono text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums">
              {stats.pending.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">معدل الاستجابة</span>
            <span className="font-mono font-semibold text-foreground tabular-nums">
              {stats.responseRate}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${Math.min(stats.responseRate, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentStatsWidget;
