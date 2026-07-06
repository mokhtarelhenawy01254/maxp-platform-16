import React, { useState, useEffect, useCallback } from "react";
import { companyAwareApi } from "../../services/companyAwareApi";

interface FacebookPost {
  id: string;
  postId: string;
  pageId: string;
  message: string;
  mediaUrl: string | null;
  permalink: string | null;
  postedAt: string;
  isProduct: boolean;
  page: { pageName: string };
}

interface FacebookPage {
  pageId: string;
  pageName: string;
}

const headingStyle: React.CSSProperties = {
  color: "var(--color-foreground)",
};

const mutedStyle: React.CSSProperties = {
  color: "var(--color-muted-foreground)",
};

export default function FacebookPostManager() {
  const [posts, setPosts] = useState<FacebookPost[]>([]);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [selectedPage, setSelectedPage] = useState<string>("");
  const [filterProduct, setFilterProduct] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  const loadPages = useCallback(async () => {
    try {
      const res = await companyAwareApi.get("/integrations/facebook/connected");
      if (res.data.success) setPages(res.data.pages);
    } catch { /* ignore */ }
  }, []);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string> = {};
      if (selectedPage) params.pageId = selectedPage;
      if (filterProduct === "product") params.isProduct = "true";
      else if (filterProduct === "nonproduct") params.isProduct = "false";

      const res = await companyAwareApi.get("/facebook/posts", { params });
      if (res.data.success) setPosts(res.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedPage, filterProduct]);

  useEffect(() => { loadPages(); }, [loadPages]);
  useEffect(() => { loadPosts(); }, [loadPosts]);

  const handleSync = async () => {
    if (!selectedPage) return;
    setSyncing(true);
    try {
      await companyAwareApi.post("/facebook/posts/sync", { pageId: selectedPage });
      await loadPosts();
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleProduct = async (postId: string, current: boolean) => {
    try {
      await companyAwareApi.patch(`/facebook/posts/${postId}/product`, { isProduct: !current });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, isProduct: !current } : p));
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message);
    }
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" });
  };

  const truncate = (text: string, max: number) =>
    text.length > max ? text.slice(0, max) + "..." : text;

  const tableStyle: React.CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.875rem",
  };

  const thStyle: React.CSSProperties = {
    textAlign: "left",
    padding: "0.75rem 1rem",
    borderBottom: "1px solid var(--business-card-border)",
    color: "var(--color-muted-foreground)",
    fontWeight: 600,
    whiteSpace: "nowrap",
  };

  const tdStyle: React.CSSProperties = {
    padding: "0.75rem 1rem",
    borderBottom: "1px solid var(--business-card-border)",
    verticalAlign: "top",
  };

  const containerStyle: React.CSSProperties = {
    padding: "1.5rem",
    maxWidth: "1200px",
    margin: "0 auto",
  };

  const controlsStyle: React.CSSProperties = {
    display: "flex",
    gap: "0.75rem",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: "1.5rem",
  };

  const selectStyle: React.CSSProperties = {
    padding: "0.5rem 0.75rem",
    borderRadius: "6px",
    border: "1px solid var(--business-card-border)",
    background: "var(--color-background)",
    color: "var(--color-foreground)",
    fontSize: "0.875rem",
  };

  const btnStyle: React.CSSProperties = {
    padding: "0.5rem 1rem",
    borderRadius: "6px",
    border: "1px solid var(--color-primary)",
    background: "var(--color-primary)",
    color: "#fff",
    cursor: "pointer",
    fontSize: "0.875rem",
    fontWeight: 500,
  };

  const badgeProductStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.25rem 0.75rem",
    borderRadius: "999px",
    fontSize: "0.75rem",
    fontWeight: 600,
    background: "color-mix(in srgb, var(--color-primary) 15%, transparent)",
    color: "var(--color-primary)",
    cursor: "pointer",
    border: "1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)",
    userSelect: "none" as const,
  };

  const badgeNonProductStyle: React.CSSProperties = {
    ...badgeProductStyle,
    background: "color-mix(in srgb, var(--color-muted-foreground) 10%, transparent)",
    color: "var(--color-muted-foreground)",
    border: "1px solid var(--business-card-border)",
  };

  const linkStyle: React.CSSProperties = {
    color: "var(--color-primary)",
    textDecoration: "none",
    fontSize: "0.8rem",
  };

  return (
    <div style={containerStyle}>
      <h1 style={{ ...headingStyle, fontSize: "1.5rem", marginBottom: "0.25rem" }}>إدارة منشورات فيسبوك</h1>
      <p style={{ ...mutedStyle, marginBottom: "1.5rem", fontSize: "0.875rem" }}>
        حدد المنشورات التي تمثل منتجات — الايجنت يستخدم هذه المعلومة تلقائياً
      </p>

      <div style={controlsStyle}>
        <select
          style={selectStyle}
          value={selectedPage}
          onChange={e => setSelectedPage(e.target.value)}
        >
          <option value="">-- اختر الصفحة --</option>
          {pages.map(p => (
            <option key={p.pageId} value={p.pageId}>{p.pageName}</option>
          ))}
        </select>

        <select
          style={selectStyle}
          value={filterProduct}
          onChange={e => setFilterProduct(e.target.value)}
        >
          <option value="all">كل المنشورات</option>
          <option value="product">المنتجات فقط</option>
          <option value="nonproduct">غير المنتجات</option>
        </select>

        <button
          style={{ ...btnStyle, opacity: selectedPage && !syncing ? 1 : 0.5 }}
          disabled={!selectedPage || syncing}
          onClick={handleSync}
        >
          {syncing ? "جاري السحب..." : "🔄 سحب المنشورات"}
        </button>
      </div>

      {error && (
        <div style={{
          padding: "0.75rem 1rem",
          background: "color-mix(in srgb, #ef4444 10%, transparent)",
          border: "1px solid #ef4444",
          borderRadius: "6px",
          color: "#ef4444",
          marginBottom: "1rem",
          fontSize: "0.875rem",
        }}>⚠️ {error}</div>
      )}

      {loading ? (
        <p style={mutedStyle}>جاري التحميل...</p>
      ) : posts.length === 0 ? (
        <p style={mutedStyle}>لا توجد منشورات. اختر صفحة واضغط "سحب المنشورات".</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>صورة</th>
                <th style={thStyle}>النص</th>
                <th style={thStyle}>الصفحة</th>
                <th style={thStyle}>التاريخ</th>
                <th style={thStyle}>منتج</th>
              </tr>
            </thead>
            <tbody>
              {posts.map(post => (
                <tr key={post.id}>
                  <td style={tdStyle}>
                    {post.mediaUrl ? (
                      <img
                        src={post.mediaUrl}
                        alt=""
                        style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "4px" }}
                        loading="lazy"
                      />
                    ) : (
                      <div style={{ width: "60px", height: "60px", background: "var(--business-card-border)", borderRadius: "4px" }} />
                    )}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ maxWidth: "350px", lineHeight: 1.4 }}>
                      {post.message ? truncate(post.message, 200) : <span style={mutedStyle}>(بدون نص)</span>}
                    </div>
                    {post.permalink && (
                      <a href={post.permalink} target="_blank" rel="noopener noreferrer" style={linkStyle}>
                        🔗 عرض على فيسبوك
                      </a>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: "0.8rem" }}>{post.page?.pageName}</span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>{formatDate(post.postedAt)}</span>
                  </td>
                  <td style={tdStyle}>
                    <span
                      style={post.isProduct ? badgeProductStyle : badgeNonProductStyle}
                      onClick={() => handleToggleProduct(post.id, post.isProduct)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === "Enter" && handleToggleProduct(post.id, post.isProduct)}
                    >
                      {post.isProduct ? "✅ منتج" : "⬜"}
                    </span>
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
