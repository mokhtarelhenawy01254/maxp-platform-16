import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Send,
  AlertTriangle,
  Film,
} from "lucide-react";
import {
  getAccountStatus,
  createPublish,
  listPosts,
  refreshPost,
  type TikTokAccountStatus,
  type TikTokPost,
  type TikTokPagination,
  type TikTokPrivacyLevel,
} from "../../services/tiktokPublishService";
import TikTokPublishPostsTable from "./TikTokPublishPostsTable";

const POLL_INTERVAL_MS = 8000;
const MAX_POLL_TRIES = 8;

const PRIVACY_OPTIONS: { value: TikTokPrivacyLevel; label: string }[] = [
  { value: "PUBLIC_TO_EVERYONE", label: "عام (الكل)" },
  { value: "FOLLOWERS", label: "للمتابعين فقط" },
  { value: "SELF_ONLY", label: "خاص (لنفسي)" },
];

const inputClass =
  "w-full rounded-md border border-border/80 bg-background px-3 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";
const labelClass = "mb-1 block text-xs font-medium text-foreground";

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ar-EG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function extractError(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as { response?: { data?: { error?: string | { message?: string } } }; message?: string };
    const errField = e.response?.data?.error;
    if (typeof errField === "string") return errField;
    if (errField && typeof errField === "object" && errField.message) return errField.message;
    if (e.message) return e.message;
  }
  return "حدث خطأ غير متوقع";
}

export default function TikTokPublish() {
  const [account, setAccount] = useState<TikTokAccountStatus | null>(null);
  const [posts, setPosts] = useState<TikTokPost[]>([]);
  const [pagination, setPagination] = useState<TikTokPagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [videoUrl, setVideoUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [privacyLevel, setPrivacyLevel] = useState<TikTokPrivacyLevel>("SELF_ONLY");

  const pollTimersRef = useRef<Record<string, number>>({});

  const loadAccount = useCallback(async () => {
    try {
      const res = await getAccountStatus();
      setAccount(res);
    } catch (err) {
      setError(extractError(err));
    }
  }, []);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listPosts({ page: 1, limit: 50 });
      setPosts(res.data);
      setPagination(res.pagination);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccount();
    loadPosts();
  }, [loadAccount, loadPosts]);

  useEffect(() => {
    const timers = pollTimersRef.current;
    return () => {
      Object.values(timers).forEach((id) => window.clearInterval(id));
    };
  }, []);

  const updatePostInList = useCallback((updated: TikTokPost) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }, []);

  const startPolling = useCallback(
    (post: TikTokPost) => {
      if (post.status !== "PROCESSING") return;
      if (pollTimersRef.current[post.id]) return;

      let tries = 0;
      const timerId = window.setInterval(async () => {
        tries += 1;
        const stop = () => {
          window.clearInterval(timerId);
          delete pollTimersRef.current[post.id];
        };
        try {
          const updated = await refreshPost(post.id);
          updatePostInList(updated);
          if (updated.status !== "PROCESSING" || tries >= MAX_POLL_TRIES) {
            stop();
          }
        } catch {
          stop();
        }
      }, POLL_INTERVAL_MS);
      pollTimersRef.current[post.id] = timerId;
    },
    [updatePostInList],
  );

  const handlePublish = async () => {
    setError("");
    if (!videoUrl.trim()) {
      setError("يرجى إدخال رابط الفيديو المباشر");
      return;
    }
    if (!account?.connected) {
      setError("يرجى ربط حساب TikTok أولاً من لوحة الربط");
      return;
    }
    setPublishing(true);
    try {
      const post = await createPublish({
        videoUrl: videoUrl.trim(),
        caption: caption.trim(),
        privacyLevel,
      });
      await loadPosts();
      startPolling(post);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setPublishing(false);
    }
  };

  const handleRefresh = async (id: string) => {
    setRefreshingId(id);
    setError("");
    try {
      const updated = await refreshPost(id);
      updatePostInList(updated);
      startPolling(updated);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setRefreshingId(null);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-card text-foreground font-sans rtl">
      {/* Telemetry Status Ribbon */}
      <div className="border-b border-border/70 bg-muted/20 px-4 sm:px-6 py-2">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
              <span className={`inline-block w-2 h-2 rounded-full ${account?.connected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
              {account?.connected ? "بث الفيديو التلقائي نشط" : "غير متصل بحساب TikTok"}
            </span>
            <span className="text-border">|</span>
            <span className="text-muted-foreground font-mono">
              AUTH: {account?.displayName || "OFFLINE"}
            </span>
          </div>
          <div className="flex items-center gap-4 font-mono tabular-nums text-muted-foreground">
            <span>المنشورات: <strong className="text-foreground">{pagination?.total ?? posts.length}</strong></span>
            <span className="text-border">|</span>
            <span>انتهاء الصلاحية: <strong className="text-foreground">{account?.tokenExpiresAt ? formatDate(account.tokenExpiresAt) : "دائم"}</strong></span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 space-y-6">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-muted/40 text-foreground border border-border/70">
                <Film className="w-3.5 h-3.5 text-muted-foreground" />
                محرك النشر التلقائي
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                tiktok.publish.v2
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
              نشر مقاطع الفيديو على TikTok
            </h1>
            <p className="text-xs text-muted-foreground">
              بث ونشر محتوى الفيديو المباشر وحملات المنتجات على حساب TikTok الرسمي
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Account status card */}
        <div className="rounded-lg border border-border/70 bg-card p-4 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            الحساب المقترن
          </h2>
          {account?.connected ? (
            <div className="flex items-center gap-3">
              {account.avatarUrl ? (
                <img
                  src={account.avatarUrl}
                  alt={account.displayName || "حساب TikTok"}
                  className="h-10 w-10 rounded-full object-cover border border-border/80"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary border border-primary/20">
                  {(account.displayName || "T").charAt(0)}
                </div>
              )}
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-foreground">
                  {account.displayName || "حساب TikTok"}
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.2 text-[10px] font-medium border border-emerald-500/20 bg-emerald-500/10 text-emerald-500">
                    متصل ونشط
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {account.tokenExpiresAt
                      ? `ينتهي: ${formatDate(account.tokenExpiresAt)}`
                      : "جلسة دائمة"}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              الحساب غير متصل — يرجى ربط حساب TikTok من إعدادات الربط للتفعيل
            </div>
          )}
        </div>

        {/* Publish form */}
        <div className="rounded-lg border border-border/70 bg-card p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/70 pb-2">
            إنشاء وبث منشور جديد
          </h2>
          <div className="space-y-3">
            <div>
              <label htmlFor="videoUrl" className={labelClass}>
                رابط الفيديو المباشر (MP4 / WebM)
              </label>
              <input
                id="videoUrl"
                type="text"
                dir="ltr"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://cdn.maxp.online/videos/product-showcase.mp4"
                className={`${inputClass} font-mono`}
              />
            </div>
            <div>
              <label htmlFor="caption" className={labelClass}>
                نص الوصف والوسوم (Caption & Hashtags)
              </label>
              <textarea
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="اكتب وصف الفيديو والوسوم المرفقة..."
                rows={3}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="privacyLevel" className={labelClass}>
                مستوى الخصوصية في تيك توك
              </label>
              <select
                id="privacyLevel"
                value={privacyLevel}
                onChange={(e) =>
                  setPrivacyLevel(e.target.value as TikTokPrivacyLevel)
                }
                className={inputClass}
              >
                {PRIVACY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={handlePublish}
                disabled={publishing || !account?.connected}
                className="inline-flex items-center justify-center gap-2 px-5 py-2 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                {publishing ? "جاري الإرسال والمعالجة..." : "نشر الفيديو الآن"}
              </button>
            </div>
          </div>
        </div>

        {/* Posts list table component */}
        <TikTokPublishPostsTable
          posts={posts}
          pagination={pagination}
          loading={loading}
          refreshingId={refreshingId}
          onRefresh={handleRefresh}
          formatDate={formatDate}
        />
      </div>
    </div>
  );
}
