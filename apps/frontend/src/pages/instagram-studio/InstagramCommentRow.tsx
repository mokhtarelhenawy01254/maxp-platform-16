import React from "react";
import { EyeOff, Loader2, Send, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import type { InstagramComment } from "./instagramStudioService";
import { formatIgDate } from "./instagramStudioUtils";

interface InstagramCommentRowProps {
  comment: InstagramComment;
  isHidden: boolean;
  isReplying: boolean;
  replyText: string;
  sending: boolean;
  onToggleReply: () => void;
  onReplyTextChange: (value: string) => void;
  onSendReply: () => void;
  onToggleHide: () => void;
  onDelete: () => void;
}

const InstagramCommentRow: React.FC<InstagramCommentRowProps> = ({
  comment,
  isHidden,
  isReplying,
  replyText,
  sending,
  onToggleReply,
  onReplyTextChange,
  onSendReply,
  onToggleHide,
  onDelete,
}) => (
  <div data-testid="instagram-comment-row" className="p-3 space-y-2">
    <div className="flex items-start gap-2">
      <div className="h-7 w-7 rounded-full bg-muted/50 flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
        {(comment.username || "IG").slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold text-foreground" dir="ltr">
            @{comment.username || "unknown"}
          </span>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {formatIgDate(comment.timestamp)}
          </span>
          {isHidden && (
            <span className="text-[10px] px-1.5 py-0.5 rounded border border-border/70 bg-muted/40 text-muted-foreground">
              مخفي
            </span>
          )}
        </div>

        <p
          className={`text-xs leading-relaxed whitespace-pre-wrap ${
            isHidden ? "text-muted-foreground line-through" : "text-foreground/90"
          }`}
        >
          {comment.text || "—"}
        </p>

        {(comment.replies?.data || []).length > 0 && (
          <div className="mt-1 space-y-1 border-r-2 border-border/60 pr-2">
            {(comment.replies?.data || []).map((reply) => (
              <div key={reply.id} className="text-[11px]">
                <span className="font-semibold text-foreground" dir="ltr">
                  @{reply.username || "unknown"}
                </span>
                <span className="text-muted-foreground"> — {reply.text || ""}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1.5 pt-0.5">
          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] gap-1" onClick={onToggleReply}>
            <Send className="h-3 w-3" /> رد
          </Button>
          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] gap-1" onClick={onToggleHide}>
            <EyeOff className="h-3 w-3" /> {isHidden ? "إظهار" : "إخفاء"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-[10px] gap-1 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3 w-3" /> حذف
          </Button>
        </div>

        {isReplying && (
          <div className="flex items-center gap-1.5 pt-1">
            <Input
              data-testid="instagram-reply-input"
              value={replyText}
              onChange={(event) => onReplyTextChange(event.target.value)}
              placeholder="اكتب ردك على هذا التعليق"
              className="h-8 text-xs border-border/70"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  onSendReply();
                }
              }}
            />
            <Button size="sm" className="h-8 text-xs gap-1 shrink-0" onClick={onSendReply} disabled={sending}>
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              إرسال
            </Button>
          </div>
        )}
      </div>
    </div>
  </div>
);

export default InstagramCommentRow;
