import React from "react";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Globe,
  Pause,
  Play,
  ShoppingBag,
  Trash2,
  TrendingUp,
} from "lucide-react";
import {
  ProductLandingPage,
  ProductLandingProduct,
  ProductLandingStatus,
} from "../../../services/productLandingPagesService";
import { formatMoney, getProductImage } from "./types";

interface ProductSummaryCardProps {
  page: ProductLandingPage | null;
  product: ProductLandingProduct | null;
  title: string;
  onChangeTitle: (val: string) => void;
  slug: string;
  onChangeSlug: (val: string) => void;
  status: ProductLandingStatus;
  onUpdateStatus: (status: ProductLandingStatus) => void;
  updatingStatus: boolean;
  onDeletePage?: () => void;
  deleting?: boolean;
}

export const ProductSummaryCard: React.FC<ProductSummaryCardProps> = ({
  page,
  product,
  title,
  onChangeTitle,
  slug,
  onChangeSlug,
  status,
  onUpdateStatus,
  updatingStatus,
  onDeletePage,
  deleting,
}) => {
  const visits = page?.visits || 0;
  const orders = page?.orders || 0;
  const conversionRate = visits > 0 ? ((orders / visits) * 100).toFixed(1) : "0.0";
  const img = getProductImage(product);

  return (
    <div className="eo-canvas-card eo-product-summary-card">
      <div className="eo-summary-top">
        <div className="eo-prod-info">
          {img ? (
            <img src={img} alt="" className="eo-prod-img" />
          ) : (
            <div className="eo-prod-placeholder">
              <ShoppingBag size={24} />
            </div>
          )}
          <div className="eo-prod-details">
            <div className="eo-prod-title-wrap">
              <input
                type="text"
                className="eo-title-live-input"
                value={title}
                onChange={(e) => onChangeTitle(e.target.value)}
                placeholder="عنوان صفحة الهبوط..."
              />
            </div>
            <div className="eo-prod-meta-row">
              <span className="eo-prod-price">{formatMoney(product?.price)}</span>
              <span className={`eo-badge eo-badge-${status.toLowerCase()}`}>
                {status === "PUBLISHED" ? "منشورة حية" : status === "PAUSED" ? "متوقفة مؤقتاً" : "مسودة تعديل"}
              </span>
              <span className="eo-prod-original-name">المنتج: {product?.name || "غير محدد"}</span>
            </div>
          </div>
        </div>

        <div className="eo-summary-status-actions">
          {status === "PUBLISHED" ? (
            <button
              type="button"
              className="eo-btn eo-btn-outline"
              onClick={() => onUpdateStatus("PAUSED")}
              disabled={updatingStatus}
            >
              <Pause size={15} />
              <span>إيقاف مؤقت</span>
            </button>
          ) : (
            <button
              type="button"
              className="eo-btn eo-btn-primary-green"
              onClick={() => onUpdateStatus("PUBLISHED")}
              disabled={updatingStatus}
            >
              <Play size={15} />
              <span>نشر الصفحة حية</span>
            </button>
          )}

          {onDeletePage && (
            <button
              type="button"
              className="eo-btn eo-btn-del-page"
              onClick={() => {
                if (
                  window.confirm(
                    `هل أنت متأكد من حذف صفحة "${title || page?.title}" نهائياً؟`,
                  )
                ) {
                  onDeletePage();
                }
              }}
              disabled={deleting}
              title="حذف صفحة الهبوط نهائياً"
            >
              <Trash2 size={15} />
              <span>حذف</span>
            </button>
          )}
        </div>
      </div>

      {/* URL and Analytics Stats Strip */}
      <div className="eo-summary-bottom-strip">
        <div className="eo-slug-bar" dir="ltr">
          <Globe size={15} className="eo-slug-icon" />
          <span className="eo-slug-prefix">/store/lp/</span>
          <input
            type="text"
            className="eo-slug-text-input"
            value={slug}
            onChange={(e) =>
              onChangeSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))
            }
            placeholder="page-slug"
          />
          {page && slug !== page.slug && (
            <span
              className="eo-slug-unsaved-badge"
              title="يجب حفظ التعديلات لتفعيل هذا الرابط في المتجر"
            >
              غير محفوظ
            </span>
          )}
        </div>

        <div className="eo-summary-stats">
          <div className="eo-stat-pill">
            <Activity size={14} className="eo-stat-icon" />
            <span>الزيارات: <strong>{visits}</strong></span>
          </div>
          <div className="eo-stat-pill">
            <CheckCircle2 size={14} className="eo-stat-icon" />
            <span>الطلبات: <strong>{orders}</strong></span>
          </div>
          <div className="eo-stat-pill eo-stat-pill-highlight">
            <TrendingUp size={14} className="eo-stat-icon" />
            <span>التحويل: <strong>%{conversionRate}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
