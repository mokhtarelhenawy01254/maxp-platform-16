import React, { useState, useMemo } from "react";
import { Loader2, Plus, Search, ShoppingBag, X } from "lucide-react";
import { ProductLandingProduct } from "../../../services/productLandingPagesService";
import { formatMoney, getProductImage } from "./types";

interface CreateLandingModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ProductLandingProduct[];
  loadingProducts: boolean;
  onSearchProducts: (search: string) => void;
  onCreate: (payload: {
    productId: string;
    title: string;
    slug: string;
  }) => Promise<void>;
  creating: boolean;
}

export const CreateLandingModal: React.FC<CreateLandingModalProps> = ({
  isOpen,
  onClose,
  products,
  loadingProducts,
  onSearchProducts,
  onCreate,
  creating,
}) => {
  const [search, setSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [isTitleTouched, setIsTitleTouched] = useState(false);
  const [isSlugTouched, setIsSlugTouched] = useState(false);
  const [error, setError] = useState("");

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) || null,
    [products, selectedProductId],
  );

  if (!isOpen) return null;

  const handleSelectProduct = (prod: ProductLandingProduct) => {
    setSelectedProductId(prod.id);
    if (!isTitleTouched) {
      setTitle(`${prod.name} — عرض حصري`);
    }
    if (!isSlugTouched) {
      const generatedSlug = (prod.slug || prod.name)
        .toLowerCase()
        .replace(/[\s_]+/g, "-")
        .replace(/[^a-z0-9\u0600-\u06ff-]+/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      setSlug(generatedSlug || `landing-${Date.now().toString().slice(-4)}`);
    }
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      setError("يرجى اختيار منتج من القائمة أولاً");
      return;
    }
    if (!title.trim()) {
      setError("يرجى كتابة عنوان للصفحة");
      return;
    }

    try {
      setError("");
      await onCreate({
        productId: selectedProductId,
        title: title.trim(),
        slug: slug.trim(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر إنشاء الصفحة");
    }
  };

  return (
    <div className="eo-modal-overlay" onClick={onClose}>
      <div className="eo-modal-container" onClick={(e) => e.stopPropagation()} dir="rtl">
        <header className="eo-modal-header">
          <div className="eo-modal-title">
            <div className="eo-modal-icon">
              <Plus size={20} />
            </div>
            <div>
              <h3>إنشاء صفحة هبوط جديدة للمنتج</h3>
              <p>اختر المنتج المراد ربطه بالصفحة وسيتم إعداد بيانات التحويل تلقائياً</p>
            </div>
          </div>
          <button type="button" className="eo-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="eo-modal-body">
          {error && <div className="eo-modal-alert-error">{error}</div>}

          {/* Product Search & Selection */}
          <div className="eo-modal-field">
            <label>
              <strong>1. اختر المنتج من كتالوج المتجر:</strong>
            </label>
            <div className="eo-modal-search">
              <Search size={16} />
              <input
                type="text"
                value={search}
                placeholder="ابحث بالاسم أو كود المنتج..."
                onChange={(e) => {
                  setSearch(e.target.value);
                  onSearchProducts(e.target.value);
                }}
              />
            </div>

            <div className="eo-modal-products-grid">
              {loadingProducts ? (
                <div className="eo-modal-loading">
                  <Loader2 className="eo-spin" size={24} />
                  <span>جاري تحميل المنتجات...</span>
                </div>
              ) : products.length === 0 ? (
                <div className="eo-modal-empty">لا توجد منتجات مطابقة للبحث</div>
              ) : (
                products.map((p) => {
                  const isSelected = p.id === selectedProductId;
                  const img = getProductImage(p);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={`eo-prod-card-choice ${isSelected ? "is-selected" : ""}`}
                      onClick={() => handleSelectProduct(p)}
                    >
                      {img ? (
                        <img src={img} alt="" className="eo-prod-card-thumb" />
                      ) : (
                        <div className="eo-prod-card-placeholder">
                          <ShoppingBag size={20} />
                        </div>
                      )}
                      <div className="eo-prod-card-meta">
                        <strong>{p.name}</strong>
                        <span className="eo-prod-card-price">{formatMoney(p.price)}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Title & Slug Settings */}
          {selectedProduct && (
            <div className="eo-modal-settings-grid">
              <div className="eo-modal-field">
                <label>
                  <strong>2. عنوان صفحة الهبوط:</strong>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setIsTitleTouched(true);
                  }}
                  placeholder="مثال: سماعة بلوتوث لاسلكية — خصم 30%"
                  required
                />
              </div>

              <div className="eo-modal-field">
                <label>
                  <strong>3. رابط الصفحة (Slug):</strong>
                </label>
                <div className="eo-slug-input-wrap" dir="ltr">
                  <span className="eo-slug-prefix">/store/lp/</span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => {
                      setSlug(
                        e.target.value.toLowerCase().replace(/\s+/g, "-"),
                      );
                      setIsSlugTouched(true);
                    }}
                    placeholder="product-name"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          <footer className="eo-modal-footer">
            <button
              type="button"
              className="eo-btn eo-btn-outline"
              onClick={onClose}
              disabled={creating}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="eo-btn eo-btn-primary-green"
              disabled={creating || !selectedProductId}
            >
              {creating ? (
                <>
                  <Loader2 className="eo-spin" size={16} />
                  <span>جاري الإنشاء...</span>
                </>
              ) : (
                <>
                  <Plus size={16} />
                  <span>إنشاء الصفحة الآن</span>
                </>
              )}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};
