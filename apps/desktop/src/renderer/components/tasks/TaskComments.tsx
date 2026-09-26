import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Send, Trash2, Pencil, Check, X, Loader2 } from 'lucide-react';
import { audioAlerts } from '../../utils/audioAlerts';

interface TaskCommentsProps {
  taskId: string;
  currentUserId?: string;
  isAdmin?: boolean;
}

interface CommentUser {
  firstName?: string;
  lastName?: string;
  avatar?: string;
}

interface CommentItem {
  id: string;
  content: string;
  userId: string;
  createdAt: string;
  isEdited?: boolean;
  users?: CommentUser;
  replies?: CommentItem[];
}

export const TaskComments: React.FC<TaskCommentsProps> = ({
  taskId,
  currentUserId = '',
  isAdmin = false,
}) => {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchComments = useCallback(async () => {
    if (!taskId || !window.electronAPI?.getTaskComments) return;
    setLoading(true);
    try {
      const res = await window.electronAPI.getTaskComments(taskId);
      if (res?.success && Array.isArray(res.comments)) {
        setComments(res.comments);
      } else {
        setComments([]);
      }
    } catch (err: any) {
      console.warn('[TaskComments] Fetch failed:', err?.message);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = newComment.trim();
    if (!text || submitting || !window.electronAPI?.addTaskComment) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await window.electronAPI.addTaskComment(taskId, text);
      if (res?.success) {
        setNewComment('');
        audioAlerts.playTaskComplete();
        fetchComments();
      } else {
        setError(res?.error || 'فشل في إرسال التعليق');
      }
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء الإرسال');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (commentId: string) => {
    const text = editContent.trim();
    if (!text || updating || !window.electronAPI?.updateTaskComment) return;

    setUpdating(true);
    setError(null);
    try {
      const res = await window.electronAPI.updateTaskComment(commentId, text);
      if (res?.success) {
        setEditingId(null);
        setEditContent('');
        fetchComments();
      } else {
        setError(res?.error || 'فشل في تعديل التعليق');
      }
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء التعديل');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!window.electronAPI?.deleteTaskComment) return;
    try {
      const res = await window.electronAPI.deleteTaskComment(commentId);
      if (res?.success) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }
    } catch (err: any) {
      console.warn('[TaskComments] Delete failed:', err?.message);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatCommentDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <MessageSquare size={13} color="var(--accent-blue)" />
          <span style={styles.headerTitle}>التعليقات والمناقشات</span>
          <span style={styles.countBadge}>{comments.length}</span>
        </div>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      {/* Comments List */}
      <div style={styles.commentsList}>
        {loading && comments.length === 0 ? (
          <div style={styles.loadingWrap}>
            <Loader2 size={14} className="spin" color="var(--text-dim)" />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>جاري تحميل التعليقات…</span>
          </div>
        ) : comments.length === 0 ? (
          <div style={styles.emptyState}>لا توجد تعليقات بعد على هذه المهمة. كن أول من يعلق.</div>
        ) : (
          comments.map((comment) => {
            const authorName = `${comment.users?.firstName || ''} ${comment.users?.lastName || ''}`.trim() || 'مستخدم';
            const initial = authorName.charAt(0).toUpperCase() || 'U';
            const canModify = isAdmin || (currentUserId && comment.userId === currentUserId);

            return (
              <div key={comment.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={styles.commentItem}>
                  <div style={styles.avatar}>
                    {comment.users?.avatar ? (
                      <img src={comment.users.avatar} alt={authorName} style={styles.avatarImg} />
                    ) : (
                      <span>{initial}</span>
                    )}
                  </div>

                  <div style={styles.commentBody}>
                    <div style={styles.commentMeta}>
                      <span style={styles.authorName}>{authorName}</span>
                      <span style={styles.timeLabel}>{formatCommentDate(comment.createdAt)}</span>
                      {comment.isEdited && (
                        <span style={{ fontSize: 9, color: 'var(--text-dim)', fontStyle: 'italic' }}>· معدل</span>
                      )}
                      {canModify && (
                        <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(comment.id);
                              setEditContent(comment.content);
                            }}
                            style={styles.deleteBtn}
                            title="تعديل التعليق"
                          >
                            <Pencil size={11} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(comment.id)}
                            style={styles.deleteBtn}
                            title="حذف التعليق"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      )}
                    </div>

                    {editingId === comment.id ? (
                      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                        <input
                          type="text"
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdate(comment.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          style={styles.input}
                          disabled={updating}
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdate(comment.id)}
                          disabled={updating || !editContent.trim()}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--accent-green, #10b981)',
                            cursor: 'pointer',
                            padding: 2,
                          }}
                          title="حفظ"
                        >
                          {updating ? <Loader2 size={12} className="spin" /> : <Check size={12} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-dim, #94a3b8)',
                            cursor: 'pointer',
                            padding: 2,
                          }}
                          title="إلغاء"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div style={styles.commentContent}>{comment.content}</div>
                    )}
                  </div>
                </div>

                {/* Nested Replies */}
                {Array.isArray(comment.replies) && comment.replies.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 16 }}>
                    {comment.replies.map((reply) => {
                      const replyAuthor = `${reply.users?.firstName || ''} ${reply.users?.lastName || ''}`.trim() || 'مستخدم';
                      const replyInitial = replyAuthor.charAt(0).toUpperCase() || 'U';
                      const canDeleteReply = isAdmin || (currentUserId && reply.userId === currentUserId);

                      return (
                        <div key={reply.id} style={{ ...styles.commentItem, backgroundColor: 'rgba(255, 255, 255, 0.01)' }}>
                          <div style={{ ...styles.avatar, width: 18, height: 18, fontSize: 9 }}>
                            {reply.users?.avatar ? (
                              <img src={reply.users.avatar} alt={replyAuthor} style={styles.avatarImg} />
                            ) : (
                              <span>{replyInitial}</span>
                            )}
                          </div>
                          <div style={styles.commentBody}>
                            <div style={styles.commentMeta}>
                              <span style={styles.authorName}>{replyAuthor}</span>
                              <span style={styles.timeLabel}>{formatCommentDate(reply.createdAt)}</span>
                              {canDeleteReply && (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(reply.id)}
                                  style={{ ...styles.deleteBtn, marginRight: 'auto' }}
                                  title="حذف الرد"
                                >
                                  <Trash2 size={10} />
                                </button>
                              )}
                            </div>
                            <div style={styles.commentContent}>{reply.content}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Input Box */}
      <form onSubmit={handleSend} style={styles.inputBar}>
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="اكتب تعليقاً… (اضغط Enter للإرسال)"
          style={styles.input}
          disabled={submitting}
        />
        <button
          type="submit"
          disabled={submitting || !newComment.trim()}
          style={{
            ...styles.sendBtn,
            opacity: submitting || !newComment.trim() ? 0.5 : 1,
            cursor: submitting || !newComment.trim() ? 'default' : 'pointer',
          }}
          title="إرسال التعليق"
        >
          {submitting ? <Loader2 size={12} className="spin" /> : <Send size={12} />}
        </button>
      </form>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTop: '1px solid var(--border-subtle)',
    direction: 'rtl',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-secondary)',
  },
  countBadge: {
    fontSize: 9,
    fontWeight: 700,
    padding: '1px 5px',
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    color: 'var(--text-muted)',
    fontVariantNumeric: 'tabular-nums',
  },
  commentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    maxHeight: 180,
    overflowY: 'auto',
    paddingRight: 2,
  },
  loadingWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 0',
  },
  emptyState: {
    fontSize: 11,
    color: 'var(--text-muted)',
    fontStyle: 'italic',
    padding: '4px 0',
  },
  commentItem: {
    display: 'flex',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 6,
    padding: '6px 8px',
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    backgroundColor: 'var(--accent-blue)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    fontWeight: 700,
    flexShrink: 0,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  commentBody: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  commentMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  authorName: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  timeLabel: {
    fontSize: 9,
    color: 'var(--text-dim)',
    fontVariantNumeric: 'tabular-nums',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-dim)',
    cursor: 'pointer',
    padding: 2,
    marginRight: 'auto',
    opacity: 0.6,
  },
  commentContent: {
    fontSize: 11,
    color: 'var(--text-secondary)',
    lineHeight: 1.4,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  inputBar: {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
    marginTop: 2,
  },
  input: {
    flex: 1,
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 5,
    padding: '5px 8px',
    fontSize: 11,
    color: 'var(--text-primary)',
    outline: 'none',
  },
  sendBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--accent-blue)',
    color: '#fff',
    border: 'none',
    borderRadius: 5,
    width: 28,
    height: 28,
    flexShrink: 0,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#ef4444',
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 10,
  },
};

export default TaskComments;
