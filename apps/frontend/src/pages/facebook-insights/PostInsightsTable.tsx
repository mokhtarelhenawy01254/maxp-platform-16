import { ExternalLink } from "lucide-react";

export interface PostInsights {
  post_impressions?: number;
  post_impressions_unique?: number;
  post_engaged_users?: number;
  post_clicks?: number;
}

export interface PostInsightsRow {
  id: string;
  message: string;
  createdTime: string | null;
  permalinkUrl: string | null;
  insights: PostInsights | null;
  error: string | null;
}

interface PostInsightsTableProps {
  posts: PostInsightsRow[];
  loading?: boolean;
}

const formatValue = (value: number | undefined): string => {
  if (value === undefined || value === null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
};

const formatDate = (iso: string | null): string => {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const truncate = (value: string, maxLength = 70): string => {
  const clean = value.replace(/\s+/g, " ").trim();
  if (!clean) return "منشور بدون نص";
  return clean.length > maxLength ? `${clean.slice(0, maxLength)}…` : clean;
};

export function PostInsightsTable({ posts, loading = false }: PostInsightsTableProps) {
  return (
    <div className="rounded-lg border border-border/70 bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
        <h2 className="text-xs font-semibold text-foreground">
          إحصائيات آخر المنشورات
        </h2>
        <span className="text-[10px] tabular-nums text-muted-foreground">
          {posts.length} منشور
        </span>
      </div>

      {loading ? (
        <div className="space-y-2 p-3">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="h-9 animate-pulse rounded bg-muted/60" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="px-3 py-8 text-center text-xs text-muted-foreground">
          لا توجد منشورات متاحة على هذه الصفحة
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-xs">
            <thead>
              <tr className="border-b border-border/60 text-[10px] uppercase text-muted-foreground">
                <th className="px-3 py-2 text-start font-medium">المنشور</th>
                <th className="px-2 py-2 text-start font-medium">التاريخ</th>
                <th className="px-2 py-2 text-end font-medium">الظهور</th>
                <th className="px-2 py-2 text-end font-medium">ظهور فريد</th>
                <th className="px-2 py-2 text-end font-medium">مستخدمون متفاعلون</th>
                <th className="px-2 py-2 text-end font-medium">نقرات</th>
                <th className="px-3 py-2 text-center font-medium">الرابط</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr
                  key={post.id}
                  className="border-b border-border/40 last:border-0 hover:bg-muted/30"
                >
                  <td className="max-w-[280px] px-3 py-2">
                    <div className="truncate text-foreground" title={post.message || undefined}>
                      {truncate(post.message)}
                    </div>
                    {post.error ? (
                      <div className="mt-0.5 truncate text-[10px] text-destructive" title={post.error}>
                        {post.error}
                      </div>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 tabular-nums text-muted-foreground">
                    {formatDate(post.createdTime)}
                  </td>
                  <td className="px-2 py-2 text-end tabular-nums text-foreground">
                    {formatValue(post.insights?.post_impressions)}
                  </td>
                  <td className="px-2 py-2 text-end tabular-nums text-foreground">
                    {formatValue(post.insights?.post_impressions_unique)}
                  </td>
                  <td className="px-2 py-2 text-end tabular-nums text-foreground">
                    {formatValue(post.insights?.post_engaged_users)}
                  </td>
                  <td className="px-2 py-2 text-end tabular-nums text-foreground">
                    {formatValue(post.insights?.post_clicks)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {post.permalinkUrl ? (
                      <a
                        href={post.permalinkUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                        aria-label="فتح المنشور على Facebook"
                      >
                        عرض
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
