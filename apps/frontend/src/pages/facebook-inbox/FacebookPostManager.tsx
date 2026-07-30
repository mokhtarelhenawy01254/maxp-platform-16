import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useCallback, useRef } from "react";
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
  productId: string | null;
  product: { id: string; name: string; mainImage: string | null; sku: string } | null;
  page: { pageName: string };
}

interface FacebookPage {
  pageId: string;
  pageName: string;
}

interface ProductItem {
  id: string;
  name: string;
  mainImage: string | null;
  sku: string;
}

const SafeImage: React.FC<{ src: string | null; alt?: string; style?: React.CSSProperties }> = ({ src, alt = "", style }) => {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <div style={{ ...style, background: "var(--business-card-border)" }} />;
  }
  return <img src={src} alt={alt} style={style} loading="lazy" onError={() => setFailed(true)} />;
};

const headingStyle: React.CSSProperties = {
  color: "var(--color-foreground)",
};

const mutedStyle: React.CSSProperties = {
  color: "var(--color-muted-foreground)",
};

export default function FacebookPostManager() {
  const { t } = useTranslation();
  const [posts, setPosts] = useState<FacebookPost[]>([]);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [selectedPage, setSelectedPage] = useState<string>("");
  const [filterProduct, setFilterProduct] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [pickerPostId, setPickerPostId] = useState<string | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

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

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await companyAwareApi.get("/products", { params: { limit: 200, isActive: "true" } });
      const list: ProductItem[] = (res.data.data || res.data.products || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        mainImage: p.mainImage || p.images?.[0] || null,
        sku: p.sku || "",
      }));
      setProducts(list);
    } catch { /* ignore */ }
    finally { setLoadingProducts(false); }
  }, []);

  useEffect(() => { loadPages(); }, [loadPages]);
  useEffect(() => { loadPosts(); }, [loadPosts]);
  useEffect(() => { loadProducts(); }, [loadProducts]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerPostId(null);
        setProductSearch("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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

  const handleSetProduct = async (postId: string, productId: string | null) => {
    try {
      const res = await companyAwareApi.patch(`/facebook/posts/${postId}/product`, { productId });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, ...res.data.data } : p));
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message);
    }
    setPickerPostId(null);
    setProductSearch("");
  };

  const filteredProducts = products.filter(p =>
    !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku.toLowerCase().includes(productSearch.toLowerCase())
  );

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

  const chipStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.25rem 0.75rem",
    borderRadius: "999px",
    fontSize: "0.75rem",
    fontWeight: 600,
    background: "color-mix(in srgb, var(--color-primary) 15%, transparent)",
    color: "var(--color-primary)",
    border: "1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)",
  };

  const emptyChipStyle: React.CSSProperties = {
    ...chipStyle,
    background: "color-mix(in srgb, var(--color-muted-foreground) 10%, transparent)",
    color: "var(--color-muted-foreground)",
    border: "1px solid var(--business-card-border)",
    cursor: "pointer",
  };

  const linkStyle: React.CSSProperties = {
    color: "var(--color-primary)",
    textDecoration: "none",
    fontSize: "0.8rem",
  };

  const removeBtnStyle: React.CSSProperties = {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "var(--color-primary)",
    fontSize: "1rem",
    lineHeight: 1,
    padding: 0,
    marginRight: "0.25rem",
  };

  return (
    <div style={containerStyle}>
      <h1 style={{ ...headingStyle, fontSize: "1.5rem", marginBottom: "0.25rem" }}>{t("facebookPostManager.pageTitle")}</h1>
      <p style={{ ...mutedStyle, marginBottom: "1.5rem", fontSize: "0.875rem" }}>
        {t("facebookPostManager.pageSubtitle")}
      </p>

      <div style={controlsStyle}>
        <select
          style={selectStyle}
          value={selectedPage}
          onChange={e => setSelectedPage(e.target.value)}
        >
          <option value="">{t("facebookPostManager.selectPage")}</option>
          {pages.map(p => (
            <option key={p.pageId} value={p.pageId}>{p.pageName}</option>
          ))}
        </select>

        <select
          style={selectStyle}
          value={filterProduct}
          onChange={e => setFilterProduct(e.target.value)}
        >
          <option value="all">{t("facebookPostManager.allPosts")}</option>
          <option value="product">{t("facebookPostManager.productsOnly")}</option>
          <option value="nonproduct">{t("facebookPostManager.nonProducts")}</option>
        </select>

        <button
          style={{ ...btnStyle, opacity: selectedPage && !syncing ? 1 : 0.5 }}
          disabled={!selectedPage || syncing}
          onClick={handleSync}
        >
          {syncing ? t("facebookPostManager.syncing") : t("facebookPostManager.syncPosts")}
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
        <p style={mutedStyle}>{t("facebookPostManager.loading")}</p>
      ) : posts.length === 0 ? (
        <p style={mutedStyle}>{t("facebookPostManager.noPosts")}</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{t("facebookPostManager.tableImage")}</th>
                <th style={thStyle}>{t("facebookPostManager.tableText")}</th>
                <th style={thStyle}>{t("facebookPostManager.tablePage")}</th>
                <th style={thStyle}>{t("facebookPostManager.tableDate")}</th>
                <th style={thStyle}>{t("facebookPostManager.tableProduct")}</th>
              </tr>
            </thead>
            <tbody>
              {posts.map(post => (
                <tr key={post.id}>
                  <td style={tdStyle}>
                    {post.mediaUrl ? (
                      <SafeImage
                        src={post.mediaUrl}
                        alt=""
                        style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "4px" }}
                      />
                    ) : (
                      <div style={{ width: "60px", height: "60px", background: "var(--business-card-border)", borderRadius: "4px" }} />
                    )}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ maxWidth: "350px", lineHeight: 1.4 }}>
                      {post.message ? truncate(post.message, 200) : <span style={mutedStyle}>{t("facebookPostManager.noText")}</span>}
                    </div>
                    {post.permalink && (
                      <a href={post.permalink} target="_blank" rel="noopener noreferrer" style={linkStyle}>
                        🔗 {t("facebookPostManager.viewOnFacebook")}
                      </a>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: "0.8rem" }}>{post.page?.pageName}</span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>{formatDate(post.postedAt)}</span>
                  </td>
                  <td style={{ ...tdStyle, position: "relative" }}>
                    {post.product ? (
                      <span style={chipStyle}>
                        {post.product.mainImage && (
                          <SafeImage src={post.product.mainImage} alt="" style={{ width: "20px", height: "20px", borderRadius: "4px", objectFit: "cover" }} />
                        )}
                        <button style={removeBtnStyle} onClick={() => handleSetProduct(post.id, null)} title={t("facebookPostManager.removeProduct")}>×</button>
                        {post.product.name}
                      </span>
                    ) : (
                      <span
                        style={emptyChipStyle}
                        onClick={() => { setPickerPostId(post.id); setProductSearch(""); }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => e.key === "Enter" && setPickerPostId(post.id)}
                      >
                        {t("facebookPostManager.selectProduct")}
                      </span>
                    )}

                    {pickerPostId === post.id && (
                      <div
                        ref={pickerRef}
                        style={{
                          position: "absolute",
                          top: "100%",
                          right: 0,
                          zIndex: 50,
                          width: "280px",
                          background: "var(--color-background)",
                          border: "1px solid var(--business-card-border)",
                          borderRadius: "8px",
                          boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                          padding: "0.5rem",
                        }}
                      >
                        <input
                          type="text"
                          value={productSearch}
                          onChange={e => setProductSearch(e.target.value)}
                          placeholder={t("facebookPostManager.searchProduct")}
                          autoFocus
                          style={{
                            width: "100%",
                            padding: "0.5rem",
                            border: "1px solid var(--business-card-border)",
                            borderRadius: "6px",
                            fontSize: "0.8rem",
                            background: "var(--color-background)",
                            color: "var(--color-foreground)",
                            boxSizing: "border-box",
                          }}
                        />
                        <div style={{ marginTop: "0.5rem", maxHeight: "200px", overflowY: "auto" }}>
                          {loadingProducts ? (
                            <p style={{ ...mutedStyle, fontSize: "0.75rem", padding: "0.5rem" }}>{t("facebookPostManager.loading")}</p>
                          ) : filteredProducts.length === 0 ? (
                            <p style={{ ...mutedStyle, fontSize: "0.75rem", padding: "0.5rem" }}>{t("facebookPostManager.noProducts")}</p>
                          ) : filteredProducts.map(p => (
                            <div
                              key={p.id}
                              onClick={() => handleSetProduct(post.id, p.id)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={e => e.key === "Enter" && handleSetProduct(post.id, p.id)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                padding: "0.5rem",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "0.8rem",
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = "color-mix(in srgb, var(--color-primary) 10%, transparent)")}
                              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                            >
                              {p.mainImage && (
                                <SafeImage src={p.mainImage} alt="" style={{ width: "28px", height: "28px", borderRadius: "4px", objectFit: "cover" }} />
                              )}
                              <div>
                                <div style={{ fontWeight: 500, color: "var(--color-foreground)" }}>{p.name}</div>
                                {p.sku && <div style={{ ...mutedStyle, fontSize: "0.7rem" }}>{p.sku}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
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
