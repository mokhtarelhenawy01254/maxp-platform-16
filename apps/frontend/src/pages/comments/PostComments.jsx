import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n";
import CommentService from "../../services/commentService";

const dtf = new Intl.DateTimeFormat("ar-EG", { dateStyle: "short", timeStyle: "short" });
import {
  MessageSquare,
  CheckCircle,
  Clock,
  Trash2,
  ArrowRight,
  Settings,
  RefreshCw,
  Send,
  ChevronDown,
  User,
  AlertCircle,
  CheckCheck,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";

/* ────────────────────────────────────────────
   Helper: Avatar initials with deterministic colour
──────────────────────────────────────────── */
const AVATAR_COLOURS = [
  "from-violet-500 to-purple-700",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-indigo-500 to-blue-700",
];

function getAvatarColour(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLOURS[Math.abs(hash) % AVATAR_COLOURS.length];
}

function initials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
}

/* ────────────────────────────────────────────
   Avatar component
──────────────────────────────────────────── */
function Avatar({ name, size = "md" }) {
  const sz = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  return (
    <div
      className={`${sz} rounded-full bg-gradient-to-br ${getAvatarColour(name)} flex items-center justify-center text-white font-bold flex-shrink-0 shadow-sm`}
    >
      {initials(name) || <User className="w-4 h-4" />}
    </div>
  );
}

/* ────────────────────────────────────────────
   Inline Reply Box
──────────────────────────────────────────── */
function ReplyBox({ commentId, onReplySent }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef(null);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      tToast.warning("postComments.msg_82fc");
      textareaRef.current?.focus();
      return;
    }
    setSending(true);
    try {
      const result = await CommentService.sendManualResponseToFacebook(commentId, trimmed);
      if (result.success) {
        setText("");
        tToast.success("postComments.success_send_e82a");
        onReplySent?.();
      } else {
        toast.error(i18n.t("postComments.msg_6164", { error: result.message || "خطأ غير معروف" }));
      }
    } catch (err) {
      toast.error(i18n.t("postComments.msg_5470", { error: err.message }));
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send();
  };

  return (
    <div className="mt-3 flex gap-2 items-end">
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="اكتب ردك هنا... (Ctrl+Enter للإرسال)"
          className="w-full px-4 py-2.5 pr-4 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#6b52a3]/40 focus:border-[#6b52a3] transition-all bg-white shadow-sm placeholder:text-gray-400 text-right"
          dir="rtl"
          disabled={sending}
        />
        <span className="absolute bottom-2 left-2 text-[10px] text-gray-300 select-none">
          {text.length}
        </span>
      </div>
      <button
        onClick={send}
        disabled={sending || !text.trim()}
        className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm flex-shrink-0 ${
          sending || !text.trim()
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-[#6b52a3] hover:bg-[#5a4491] text-white"
        }`}
      >
        {sending ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
        {sending ? "جاري..." : "إرسال"}
      </button>
    </div>
  );
}

/* ────────────────────────────────────────────
   Single Comment Card
──────────────────────────────────────────── */
function CommentCard({ comment, selected, onToggleSelect, onDelete, onReplySent }) {
  const [showReply, setShowReply] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const responded = !!comment.respondedAt;

  const handleDelete = async () => {
    if (deleting) return;
    // Use toast confirm pattern instead of window.confirm
    toast(
      <div className="text-right" dir="rtl">
        <p className="font-bold text-gray-800 mb-1">حذف التعليق؟</p>
        <p className="text-sm text-gray-500 mb-3">لا يمكن التراجع عن هذا الإجراء</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => toast.dismiss()}
            className="px-3 py-1 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-700"
          >
            إلغاء
          </button>
          <button
            onClick={async () => {
              toast.dismiss();
              setDeleting(true);
              try {
                const result = await CommentService.deleteFacebookComment(comment.id);
                if (result.success) {
                  tToast.success("postComments.success_delete_ea34");
                  onDelete?.(comment.id);
                } else {
                  tToast.error("postComments.msg_8e60");
                }
              } catch (err) {
                toast.error(i18n.t("postComments.msg_2ae6", { error: err.message }));
              } finally {
                setDeleting(false);
              }
            }}
            className="px-3 py-1 text-sm bg-red-600 rounded-lg hover:bg-red-700 text-white"
          >
            حذف
          </button>
        </div>
      </div>,
      { duration: 8000 }
    );
  };

  return (
    <div
      className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
        selected
          ? "border-[#6b52a3]/40 shadow-md ring-1 ring-[#6b52a3]/20"
          : "border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200"
      } ${deleting ? "opacity-50" : ""}`}
    >
      {/* Card Header */}
      <div className="flex items-start gap-3 p-4 pb-3">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="mt-1 w-4 h-4 rounded text-[#6b52a3] border-gray-300 focus:ring-[#6b52a3] cursor-pointer flex-shrink-0"
        />

        {/* Avatar */}
        <Avatar name={comment.senderName} />

        {/* Sender Info */}
        <div className="flex-1 min-w-0 text-right">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              {responded ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCheck className="w-3 h-3" />
                  تم الرد
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-700">
                  <Clock className="w-3 h-3" />
                  انتظار
                </span>
              )}
            </div>
            <div className="text-right">
              <h4 className="font-bold text-sm text-gray-900 truncate">{comment.senderName}</h4>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {comment.senderId && <span className="font-mono">{comment.senderId}</span>}
                {comment.createdTime && (
                  <span className="mr-2">
                    {dtf.format(new Date(comment.createdTime))}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Comment Text */}
      <div className="px-4 pb-3">
        <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100 text-right" dir="rtl">
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{comment.message}</p>
        </div>
      </div>

      {/* Existing Response */}
      {comment.response && (
        <div className="px-4 pb-3">
          <div className="bg-gradient-to-r from-[#6b52a3]/5 to-[#e84b5c]/5 rounded-xl px-4 py-3 border border-[#6b52a3]/15 text-right" dir="rtl">
            <div className="flex items-center gap-1.5 mb-2">
              <CheckCircle className="w-3.5 h-3.5 text-[#6b52a3]" />
              <span className="text-[10px] font-bold text-[#6b52a3]">ردك</span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{comment.response}</p>
            {comment.respondedAt && (
              <p className="text-[10px] text-gray-400 mt-2">
                {dtf.format(new Date(comment.respondedAt))}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Actions Footer */}
      <div className="px-4 pb-4 flex items-center justify-between gap-2 border-t border-gray-50 pt-3">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-100 hover:border-red-200"
        >
          <Trash2 className="w-3.5 h-3.5" />
          حذف
        </button>

        {!responded && (
          <button
            onClick={() => setShowReply((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg transition-all border ${
              showReply
                ? "bg-gray-100 text-gray-600 border-gray-200"
                : "bg-[#6b52a3] text-white border-transparent hover:bg-[#5a4491] shadow-sm"
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            {showReply ? "إخفاء" : "رد"}
            <ChevronDown className={`w-3 h-3 transition-transform ${showReply ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>

      {/* Inline Reply Box */}
      {showReply && !responded && (
        <div className="px-4 pb-4 border-t border-gray-50 pt-3 bg-gray-50/50">
          <ReplyBox
            commentId={comment.id}
            onReplySent={() => {
              setShowReply(false);
              onReplySent?.();
            }}
          />
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────
   Main PostComments Page
──────────────────────────────────────────── */
const PostComments = () => {
  const { t } = useTranslation();
  const { postId } = useParams();
  const navigate = useNavigate();

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedComments, setSelectedComments] = useState([]);
  const [filters, setFilters] = useState({ status: "all" });
  const [deletingBulk, setDeletingBulk] = useState(false);

  /* ── Fetch ── */
  const fetchComments = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await CommentService.getCommentsByPostId(postId, filters);
      if (response.success) {
        setComments(response.data || []);
      }
    } catch (error) {
      toast.error(i18n.t("postComments.msg_1e96", { error: error.message }));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchComments(); }, [postId, filters]);

  /* ── Selection ── */
  const toggleSelect = (id) =>
    setSelectedComments((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const toggleSelectAll = () =>
    setSelectedComments(
      selectedComments.length === comments.length ? [] : comments.map((c) => c.id)
    );

  /* ── Remove one from state ── */
  const removeComment = (id) => {
    setComments((prev) => prev.filter((c) => c.id !== id));
    setSelectedComments((prev) => prev.filter((x) => x !== id));
  };

  /* ── Bulk Delete ── */
  const handleBulkDelete = () => {
    if (selectedComments.length === 0) {
      tToast.warning("postComments.msg_6ebe");
      return;
    }
    toast(
      <div className="text-right" dir="rtl">
        <p className="font-bold text-gray-800 mb-1">
          حذف {selectedComments.length} تعليق؟
        </p>
        <p className="text-sm text-gray-500 mb-3">لا يمكن التراجع عن هذا الإجراء</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => toast.dismiss()}
            className="px-3 py-1 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-700"
          >
            إلغاء
          </button>
          <button
            onClick={async () => {
              toast.dismiss();
              setDeletingBulk(true);
              try {
                const result = await CommentService.bulkDeleteFacebookComments(selectedComments);
                if (result.success) {
                  toast.success(`تم حذف ${selectedComments.length} تعليق`);
                  setComments((prev) => prev.filter((c) => !selectedComments.includes(c.id)));
                  setSelectedComments([]);
                } else {
                  tToast.error("postComments.msg_3297");
                }
              } catch (err) {
                toast.error(i18n.t("postComments.msg_2ae6", { error: err.message }));
              } finally {
                setDeletingBulk(false);
              }
            }}
            className="px-3 py-1 text-sm bg-red-600 rounded-lg hover:bg-red-700 text-white"
          >
            حذف الكل
          </button>
        </div>
      </div>,
      { duration: 8000 }
    );
  };

  /* ── Stats ── */
  const respondedCount = useMemo(() => comments.filter((c) => c.respondedAt).length, [comments]);
  const pendingCount = comments.length - respondedCount;

  /* ── Filtered view ── */
  const visibleComments = useMemo(() => {
    if (filters.status === "all") return comments;
    if (filters.status === "responded") return comments.filter((c) => c.respondedAt);
    return comments.filter((c) => !c.respondedAt);
  }, [comments, filters.status]);

  /* ────────────── RENDER ────────────── */
  return (
    <div className="min-h-screen bg-[#f3f4f6]" dir="rtl">

      {/* ── Top Bar ── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate("/unified-comments")}
            className="p-2 text-gray-500 hover:text-[#6b52a3] hover:bg-[#6b52a3]/5 rounded-xl transition-colors"
            title="رجوع"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-900 text-base truncate">تعليقات المنشور</h1>
            <p className="text-[11px] text-gray-400 font-mono truncate">{postId}</p>
          </div>
          <button
            onClick={() => navigate(`/posts/${postId}/settings`)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#6b52a3] border border-[#6b52a3]/30 rounded-xl hover:bg-[#6b52a3]/5 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            الإعدادات
          </button>
          <button
            onClick={() => fetchComments(true)}
            disabled={refreshing}
            className="p-2 text-gray-400 hover:text-[#6b52a3] hover:bg-[#6b52a3]/5 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-5">

        {/* ── Stats Row ── */}
        {!loading && comments.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <p className="text-2xl font-black text-gray-900">{comments.length}</p>
              <p className="text-xs text-gray-500 mt-0.5 font-medium">إجمالي</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-100 text-center">
              <p className="text-2xl font-black text-emerald-600">{respondedCount}</p>
              <p className="text-xs text-emerald-500 mt-0.5 font-medium">تم الرد</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-amber-100 text-center">
              <p className="text-2xl font-black text-amber-600">{pendingCount}</p>
              <p className="text-xs text-amber-500 mt-0.5 font-medium">انتظار</p>
            </div>
          </div>
        )}

        {/* ── Filter & Bulk Toolbar ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 flex flex-wrap items-center gap-3">
          {/* Filter tabs */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 flex-shrink-0">
            {[
              { val: "all", label: "الكل" },
              { val: "pending", label: "انتظار" },
              { val: "responded", label: "تم الرد" },
            ].map(({ val, label }) => (
              <button
                key={val}
                onClick={() => setFilters((f) => ({ ...f, status: val }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filters.status === val
                    ? "bg-white text-[#6b52a3] shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Select All */}
          {comments.length > 0 && (
            <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-600 font-medium select-none">
              <input
                type="checkbox"
                checked={selectedComments.length === comments.length && comments.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded text-[#6b52a3] border-gray-300 focus:ring-[#6b52a3]"
              />
              تحديد الكل ({comments.length})
            </label>
          )}

          {/* Bulk Delete */}
          {selectedComments.length > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={deletingBulk}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
              حذف {selectedComments.length} محدد
            </button>
          )}

          <div className="mr-auto flex items-center gap-1 text-xs text-gray-400">
            <Filter className="w-3.5 h-3.5" />
            <span>{visibleComments.length} نتيجة</span>
          </div>
        </div>

        {/* ── Comments List ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-[#6b52a3]/20 border-t-[#6b52a3] animate-spin" />
            <p className="text-gray-400 font-medium text-sm">جاري تحميل التعليقات...</p>
          </div>
        ) : visibleComments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6b52a3]/10 to-[#e84b5c]/10 flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-[#6b52a3]/40" />
            </div>
            <div className="text-center">
              <p className="font-bold text-gray-600 text-base">
                {filters.status === "all" ? "لا توجد تعليقات بعد" : "لا توجد تعليقات في هذه الفئة"}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {filters.status === "all"
                  ? "ستظهر التعليقات هنا عندما يتفاعل الجمهور مع المنشور"
                  : "جرّب فلتراً مختلفاً"}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {visibleComments.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                selected={selectedComments.includes(comment.id)}
                onToggleSelect={() => toggleSelect(comment.id)}
                onDelete={removeComment}
                onReplySent={() => fetchComments(true)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PostComments;
