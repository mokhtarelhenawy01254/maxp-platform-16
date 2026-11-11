import React, { useCallback, useEffect, useState } from "react";
import { ImageOff, Loader2, MessageCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import InstagramAccountSelector from "./InstagramAccountSelector";
import InstagramCommentRow from "./InstagramCommentRow";
import InstagramCommentsMediaList from "./InstagramCommentsMediaList";
import {
  deleteComment,
  extractInstagramError,
  getComments,
  getMedia,
  getTargets,
  hideComment,
  replyToComment,
  type InstagramComment,
  type InstagramMediaItem,
  type InstagramTarget,
} from "./instagramStudioService";
import { formatIgNumber } from "./instagramStudioUtils";

const InstagramComments: React.FC = () => {
  const [targets, setTargets] = useState<InstagramTarget[]>([]);
  const [noAccountMessage, setNoAccountMessage] = useState<string | null>(null);
  const [igId, setIgId] = useState("");
  const [media, setMedia] = useState<InstagramMediaItem[]>([]);
  const [selectedMediaId, setSelectedMediaId] = useState("");
  const [comments, setComments] = useState<InstagramComment[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Record<string, boolean>>({});
  const [replyTargetId, setReplyTargetId] = useState("");
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const result = await getTargets();
        if (!mounted) return;
        setTargets(result.targets);
        setNoAccountMessage(result.noAccountMessage);
        if (result.targets.length > 0) setIgId(result.targets[0].igId);
      } catch (err) {
        if (mounted) setError(extractInstagramError(err));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const loadMedia = useCallback(async (accountId: string) => {
    if (!accountId) return;
    setLoading(true);
    setError("");
    setComments([]);
    setSelectedMediaId("");
    try {
      const result = await getMedia({ igAccountId: accountId, limit: 25 });
      const items = result.media || [];
      setMedia(items);
      if (items.length > 0) setSelectedMediaId(items[0].id);
    } catch (err) {
      setMedia([]);
      setError(extractInstagramError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (igId) loadMedia(igId);
  }, [igId, loadMedia]);

  const loadComments = useCallback(
    async (mediaId: string) => {
      if (!mediaId) return;
      setLoadingComments(true);
      setError("");
      setHiddenIds({});
      setReplyTargetId("");
      try {
        const result = await getComments(mediaId, igId);
        setComments(result.comments || []);
      } catch (err) {
        setComments([]);
        setError(extractInstagramError(err));
      } finally {
        setLoadingComments(false);
      }
    },
    [igId],
  );

  useEffect(() => {
    if (selectedMediaId && igId) loadComments(selectedMediaId);
  }, [selectedMediaId, igId, loadComments]);

  const handleReply = async (commentId: string) => {
    const text = replyText.trim();
    if (!text) {
      toast.error("اكتب نص الرد أولاً");
      return;
    }
    setSending(true);
    try {
      const created = await replyToComment(commentId, text, igId);
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId
            ? {
                ...comment,
                pendingReply: true,
                replies: {
                  data: [
                    ...(comment.replies?.data || []),
                    {
                      id: created.id || `local-${Date.now()}`,
                      text: created.text,
                      username: "أنت",
                      timestamp: new Date().toISOString(),
                    },
                  ],
                },
              }
            : comment,
        ),
      );
      setReplyText("");
      setReplyTargetId("");
      toast.success("تم نشر الرد على Instagram");
    } catch (err) {
      toast.error(extractInstagramError(err));
    } finally {
      setSending(false);
    }
  };

  const handleHide = async (comment: InstagramComment) => {
    const nextHidden = !hiddenIds[comment.id];
    try {
      await hideComment(comment.id, nextHidden, igId);
      setHiddenIds((prev) => ({ ...prev, [comment.id]: nextHidden }));
      toast.success(nextHidden ? "تم إخفاء التعليق" : "تم إظهار التعليق");
    } catch (err) {
      toast.error(extractInstagramError(err));
    }
  };

  const handleDelete = async (comment: InstagramComment) => {
    if (!window.confirm("تأكيد حذف هذا التعليق نهائياً من Instagram؟")) return;
    try {
      await deleteComment(comment.id, igId);
      setComments((prev) => prev.filter((item) => item.id !== comment.id));
      toast.success("تم حذف التعليق");
    } catch (err) {
      toast.error(extractInstagramError(err));
    }
  };

  if (!loading && targets.length === 0) {
    return (
      <div className="container mx-auto p-4 md:p-6 max-w-6xl" dir="rtl">
        <div className="rounded-lg border border-dashed border-border/70 bg-card p-10 text-center space-y-3">
          <ImageOff className="h-8 w-8 text-muted-foreground mx-auto" />
          <h1 className="text-base font-bold text-foreground">لا يوجد حساب Instagram مرتبط</h1>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            {noAccountMessage ||
              "اربط حساب Instagram احترافي بصفحة Facebook من إعدادات التكاملات، ثم ارجع إلى هذه الشاشة."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-3 max-w-7xl" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-border/70 pb-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-pink-600" />
            إدارة تعليقات Instagram
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            الرد على التعليقات وإخفاؤها أو حذفها مباشرة على Instagram
          </p>
        </div>
        <div className="flex items-end gap-2">
          <InstagramAccountSelector targets={targets} value={igId} onChange={setIgId} disabled={loading} />
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs gap-1.5 border-border/70"
            onClick={() => loadComments(selectedMediaId)}
            disabled={loadingComments || !selectedMediaId}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingComments ? "animate-spin" : ""}`} /> تحديث
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-3 items-start">
        <InstagramCommentsMediaList
          media={media}
          loading={loading}
          selectedMediaId={selectedMediaId}
          onSelect={setSelectedMediaId}
        />

        <div className="rounded-lg border border-border/70 bg-card min-h-[320px]">
          <div className="px-3 py-2 border-b border-border/60 text-xs font-semibold text-foreground flex items-center justify-between">
            <span>التعليقات</span>
            <span className="tabular-nums text-muted-foreground">{formatIgNumber(comments.length)}</span>
          </div>

          {loadingComments ? (
            <div className="p-4 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> جاري جلب التعليقات
            </div>
          ) : comments.length === 0 ? (
            <div className="p-8 text-center text-[11px] text-muted-foreground">
              لا توجد تعليقات على هذا المنشور.
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {comments.map((comment) => (
                <InstagramCommentRow
                  key={comment.id}
                  comment={comment}
                  isHidden={!!hiddenIds[comment.id]}
                  isReplying={replyTargetId === comment.id}
                  replyText={replyText}
                  sending={sending}
                  onToggleReply={() => {
                    setReplyTargetId(replyTargetId === comment.id ? "" : comment.id);
                    setReplyText("");
                  }}
                  onReplyTextChange={setReplyText}
                  onSendReply={() => handleReply(comment.id)}
                  onToggleHide={() => handleHide(comment)}
                  onDelete={() => handleDelete(comment)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstagramComments;
