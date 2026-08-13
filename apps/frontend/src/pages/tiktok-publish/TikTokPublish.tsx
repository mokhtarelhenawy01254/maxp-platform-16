import React, { useCallback, useEffect, useRef, useState } from "react";
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

const POLL_INTERVAL_MS = 8000;
const MAX_POLL_TRIES = 8;

const PRIVACY_OPTIONS: { value: TikTokPrivacyLevel; label: string }[] = [
  { value: "PUBLIC_TO_EVERYONE", label: "عام" },
  { value: "FOLLOWERS", label: "للمتابعين" },
  { value: "SELF_ONLY", label: "لنفسي" },
];

const STATUS_LABELS: Record<string, string> = {
  PENDING: "في الانتظار",
  PROCESSING: "قيد المعالجة",
  PUBLISHED: "منشور",
  FAILED: "فشل",
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  PROCESSING: "bg-blue-100 text-blue-800 border-blue-200",
  PUBLISHED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  FAILED: "bg-red-100 text-red-800 border-red-200",
};

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
const labelClass = "mb-1 block text-sm font-medium text-gray-700";
const cardClass =
  "rounded-xl border border-gray-200 bg-white p-5 shadow-sm";
const primaryBtnClass =
  "rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryBtnClass =
  "rounded-lg border border-blue-600 px-3 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50";

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
      setError("يرجى إدخال رابط الفيديو");
      return;
    }
    if (!account?.connected) {
      setError("اربط حساب TikTok أولاً من إدارة الحسابات");
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
    <div dir="rtl" className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold text-gray-900">
        نشر محتوى على TikTok
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        انشر فيديوهات مباشرة على حسابك في TikTok
      </p>

      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Account status card */}
      <section className={`${cardClass} mb-6`}>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">
          حالة الحساب
        </h2>
        {account?.connected ? (
          <div className="flex items-center gap-4">
            {account.avatarUrl ? (
              <img
                src={account.avatarUrl}
                alt={account.displayName || "حساب TikTok"}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-600">
                {(account.displayName || "T").charAt(0)}
              </div>
            )}
            <div>
              <div className="font-semibold text-gray-900">
                {account.displayName || "حساب TikTok"}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  متصل
                </span>
                <span className="text-xs text-gray-500">
                  {account.tokenExpiresAt
                    ? `انتهاء التوكن: ${formatDate(account.tokenExpiresAt)}`
                    : "التوكن دائم"}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-600">
            غير متصل — اربط حساب TikTok من إدارة الحسابات
          </div>
        )}
      </section>

      {/* Publish form */}
      <section className={`${cardClass} mb-6`}>
        <h2 className="mb-4 text-sm font-semibold text-gray-900">
          منشور جديد
        </h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="videoUrl" className={labelClass}>
              رابط الفيديو
            </label>
            <input
              id="videoUrl"
              type="text"
              dir="ltr"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://example.com/video.mp4"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="caption" className={labelClass}>
              الوصف
            </label>
            <textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="اكتب وصف الفيديو هنا"
              rows={3}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="privacyLevel" className={labelClass}>
              الخصوصية
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
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing || !account?.connected}
            className={primaryBtnClass}
          >
            {publishing ? "جاري النشر..." : "نشر"}
          </button>
        </div>
      </section>

      {/* Posts list */}
      <section className={cardClass}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">المنشورات</h2>
          {pagination && (
            <span className="text-xs text-gray-500">
              إجمالي {pagination.total} منشور
            </span>
          )}
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-gray-500">
            جاري التحميل...
          </div>
        ) : posts.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">
            لا توجد منشورات بعد
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-right text-xs text-gray-500">
                  <th className="px-3 py-2 font-medium">الوصف</th>
                  <th className="px-3 py-2 font-medium">الحالة</th>
                  <th className="px-3 py-2 font-medium">الخطأ</th>
                  <th className="px-3 py-2 font-medium">التاريخ</th>
                  <th className="px-3 py-2 font-medium">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id} className="border-b border-gray-100">
                    <td className="px-3 py-3">
                      <div className="max-w-[280px] truncate text-gray-900">
                        {post.caption || "بدون وصف"}
                      </div>
                      <div className="mt-1 text-xs text-gray-400">
                        {post.account?.displayName || "TikTok"}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${
                          STATUS_BADGE_CLASSES[post.status] ||
                          "border-gray-200 bg-gray-100 text-gray-700"
                        }`}
                      >
                        {STATUS_LABELS[post.status] || post.status}
                      </span>
                    </td>
                    <td className="max-w-[200px] truncate px-3 py-3 text-xs text-red-600">
                      {post.errorMessage || "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-gray-500">
                      {formatDate(post.createdAt)}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => handleRefresh(post.id)}
                        disabled={refreshingId === post.id}
                        className={secondaryBtnClass}
                      >
                        {refreshingId === post.id
                          ? "جاري التحديث..."
                          : "تحديث الحالة"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
