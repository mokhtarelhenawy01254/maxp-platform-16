import React, { useEffect, useState, useCallback } from "react";
import {
  FileText,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Share2,
  Calendar,
  Search,
  Hash,
} from "lucide-react";
import {
  getPagePublishedPosts,
  type FacebookPagePost,
} from "../../../../services/facebookAdsService";

interface PagePostsSelectorProps {
  pageId: string;
  selectedPostId?: string;
  onSelectPost: (post: FacebookPagePost) => void;
  onManualPostIdChange: (postId: string) => void;
  error?: string;
}

export const PagePostsSelector: React.FC<PagePostsSelectorProps> = ({
  pageId,
  selectedPostId,
  onSelectPost,
  onManualPostIdChange,
  error,
}) => {
  const [posts, setPosts] = useState<FacebookPagePost[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [manualId, setManualId] = useState(selectedPostId || "");
  const [showManualInput, setShowManualInput] = useState(false);

  const fetchPosts = useCallback(async () => {
    if (!pageId) return;
    try {
      setLoading(true);
      setFetchError(null);
      const res = await getPagePublishedPosts(pageId, 30);
      if (res.success && Array.isArray(res.posts)) {
        setPosts(res.posts);
      } else {
        setFetchError(res.error || "تعذر جلب منشورات الصفحة");
      }
    } catch (err: any) {
      setFetchError(err.message || "حدث خطأ أثناء تحميل المنشورات من فيسبوك");
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const filteredPosts = posts.filter((post) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      post.id.toLowerCase().includes(term) ||
      (post.message && post.message.toLowerCase().includes(term))
    );
  });

  const formatDate = (isoString?: string) => {
    if (!isoString) return "";
    try {
      return new Date(isoString).toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-700 pb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            منشورات الصفحة المتاحة للترويج
          </span>
          {posts.length > 0 && (
            <span className="text-xs bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
              {posts.length} منشور
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchPosts}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors disabled:opacity-50"
            title="تحديث قائمة المنشورات"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
            تحديث
          </button>
          <button
            type="button"
            onClick={() => setShowManualInput(!showManualInput)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline font-medium"
          >
            {showManualInput ? "إخفاء الإدخال اليدوي" : "إدخال معرف يدويًا"}
          </button>
        </div>
      </div>

      {/* Manual Post ID input */}
      {showManualInput && (
        <div className="p-3 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-xl space-y-2">
          <label className="block text-xs font-medium text-blue-900 dark:text-blue-300">
            معرّف المنشور (Post ID) يدويًا
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Hash className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                placeholder="مثال: 123456789012345"
                className="w-full pr-9 pl-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
            <button
              type="button"
              onClick={() => onManualPostIdChange(manualId.trim())}
              disabled={!manualId.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors"
            >
              تأكيد
            </button>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            يمكنك استخدام هذا الخيار إذا كان المنشور مخفياً (Dark Post) أو غير ظاهر في القائمة التلقائية.
          </p>
        </div>
      )}

      {/* Search Input */}
      {posts.length > 5 && (
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث في نصوص المنشورات أو المعرف..."
            className="w-full pr-9 pl-3 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Error Message */}
      {fetchError && (
        <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{fetchError}</span>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-xs">جاري جلب المنشورات من صفحة فيسبوك...</span>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="py-8 text-center text-gray-500 dark:text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/40">
          <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
          <p className="text-xs font-medium">لم يتم العثور على منشورات منشورة</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
            تأكد من نشر منشورات على الصفحة أو استخدم خيار الإدخال اليدوي أعلاه
          </p>
        </div>
      ) : (
        /* Posts List */
        <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
          {filteredPosts.map((post) => {
            const isSelected = selectedPostId === post.id;
            return (
              <div
                key={post.id}
                onClick={() => onSelectPost(post)}
                className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex gap-3 items-start ${
                  isSelected
                    ? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 shadow-sm"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800"
                }`}
              >
                {/* Thumbnail */}
                <div className="w-14 h-14 rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden flex-shrink-0 border border-gray-200 dark:border-gray-600 flex items-center justify-center">
                  {post.pictureUrl ? (
                    <img
                      src={post.pictureUrl}
                      alt="Thumbnail"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FileText className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100 line-clamp-2 leading-relaxed">
                      {post.message || "منشور بدون نص (صورة أو وسائط)"}
                    </p>
                    {isSelected ? (
                      <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600 flex-shrink-0 mt-0.5" />
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1 font-mono">
                      <Hash className="w-3 h-3 text-gray-400" />
                      {post.id}
                    </span>
                    {post.createdTime && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        {formatDate(post.createdTime)}
                      </span>
                    )}
                    {post.sharesCount ? (
                      <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 px-1.5 py-0.5 rounded">
                        <Share2 className="w-3 h-3" />
                        {post.sharesCount} مشاركة
                      </span>
                    ) : null}
                    {post.permalinkUrl && (
                      <a
                        href={post.permalinkUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mr-auto"
                      >
                        عرض المنشور
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}
    </div>
  );
};
