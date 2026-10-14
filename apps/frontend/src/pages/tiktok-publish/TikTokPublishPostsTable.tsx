import React from "react";
import { RefreshCw } from "lucide-react";
import {
  type TikTokPost,
  type TikTokPagination,
} from "../../services/tiktokPublishService";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "في الانتظار",
  PROCESSING: "قيد المعالجة",
  PUBLISHED: "منشور بنجاح",
  FAILED: "فشل النشر",
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  PROCESSING: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  PUBLISHED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  FAILED: "bg-red-500/10 text-red-500 border-red-500/20",
};

interface TikTokPublishPostsTableProps {
  posts: TikTokPost[];
  pagination: TikTokPagination | null;
  loading: boolean;
  refreshingId: string | null;
  onRefresh: (id: string) => void;
  formatDate: (value?: string | null) => string;
}

export const TikTokPublishPostsTable: React.FC<TikTokPublishPostsTableProps> = ({
  posts,
  pagination,
  loading,
  refreshingId,
  onRefresh,
  formatDate,
}) => {
  return (
    <div className="rounded-lg border border-border/70 bg-card overflow-hidden">
      <div className="p-4 bg-muted/20 border-b border-border/70 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          سجل المنشورات
        </h2>
        {pagination && (
          <span className="text-xs font-mono tabular-nums text-muted-foreground">
            إجمالي {pagination.total} منشور
          </span>
        )}
      </div>

      {loading ? (
        <div className="py-10 text-center text-xs text-muted-foreground font-mono">
          جاري فحص وتحديث المنشورات...
        </div>
      ) : posts.length === 0 ? (
        <div className="py-10 text-center text-xs text-muted-foreground">
          لا توجد منشورات سابقة مسجلة
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-border/70 bg-muted/30 text-muted-foreground text-[11px] font-medium">
                <th className="px-4 py-2.5">الوصف</th>
                <th className="px-4 py-2.5">الحالة</th>
                <th className="px-4 py-2.5">الرسالة / الخطأ</th>
                <th className="px-4 py-2.5">تاريخ البث</th>
                <th className="px-4 py-2.5">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-muted/25 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="max-w-[280px] truncate text-foreground font-medium">
                      {post.caption || "بدون وصف"}
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      {post.account?.displayName || "TikTok"}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-[10px] font-medium border ${
                        STATUS_BADGE_CLASSES[post.status] ||
                        "border-border/70 bg-muted text-muted-foreground"
                      }`}
                    >
                      {STATUS_LABELS[post.status] || post.status}
                    </span>
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-2.5 text-[11px] text-muted-foreground">
                    {post.errorMessage || "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground font-mono tabular-nums">
                    {formatDate(post.createdAt)}
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => onRefresh(post.id)}
                      disabled={refreshingId === post.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-muted/40 text-foreground hover:bg-muted/70 border border-border/70 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`w-3 h-3 text-muted-foreground ${
                          refreshingId === post.id ? "animate-spin" : ""
                        }`}
                      />
                      {refreshingId === post.id ? "جاري التحديث..." : "تحديث"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
export default TikTokPublishPostsTable;
