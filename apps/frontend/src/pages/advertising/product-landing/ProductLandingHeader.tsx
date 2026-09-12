import React from "react";
import {
  Copy,
  Eye,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { ProductLandingPage } from "../../../services/productLandingPagesService";

interface ProductLandingHeaderProps {
  pages: ProductLandingPage[];
  selectedId: string;
  onSelectPage: (id: string) => void;
  onRefresh: () => void;
  onSave: () => void;
  saving: boolean;
  onOpenCreateModal: () => void;
  onGenerateAi: () => void;
  generatingAi: boolean;
  previewUrl: string;
  customerUrl: string;
  onCopyUrl: () => void;
  onTogglePhonePreview?: () => void;
  showPhonePreview?: boolean;
}

export const ProductLandingHeader: React.FC<ProductLandingHeaderProps> = ({
  pages,
  selectedId,
  onSelectPage,
  onRefresh,
  onSave,
  saving,
  onOpenCreateModal,
  onGenerateAi,
  generatingAi,
  previewUrl,
  customerUrl,
  onCopyUrl,
  onTogglePhonePreview,
  showPhonePreview,
}) => {
  const isBusy = saving || generatingAi;

  return (
    <header className="eo-builder-header" dir="rtl">
      {/* Primary Actions (Right side in RTL) */}
      <div className="eo-header-actions">
        <button
          className="eo-btn eo-btn-save"
          type="button"
          onClick={onSave}
          disabled={isBusy || !selectedId}
          title="حفظ التعديلات في قاعدة البيانات"
        >
          {saving ? <Loader2 className="eo-spin" size={16} /> : <Save size={16} />}
          <span>حفظ التعديلات</span>
        </button>

        {previewUrl ? (
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="eo-btn eo-btn-preview"
            title="معاينة الصفحة كما يراها العميل"
          >
            <Eye size={16} />
            <span>معاينة حية</span>
          </a>
        ) : (
          <button className="eo-btn eo-btn-preview" disabled type="button">
            <Eye size={16} />
            <span>معاينة</span>
          </button>
        )}

        <button
          className="eo-btn eo-btn-ai"
          type="button"
          onClick={onGenerateAi}
          disabled={isBusy || !selectedId}
          title="توليد محتوى تسويقي احترافي للمنتج بالذكاء الاصطناعي"
        >
          {generatingAi ? (
            <>
              <Loader2 className="eo-spin" size={16} />
              <span>جاري التوليد...</span>
            </>
          ) : (
            <>
              <Sparkles size={16} />
              <span>كتابة بالذكاء الاصطناعي ✨</span>
            </>
          )}
        </button>

        <button
          className="eo-btn eo-btn-new-page"
          type="button"
          onClick={onOpenCreateModal}
          title="إنشاء صفحة هبوط جديدة لمنتج آخر"
        >
          <Plus size={16} />
          <span>+ صفحة جديدة</span>
        </button>
      </div>

      {/* Selector and Utility Actions (Left side in RTL) */}
      <div className="eo-header-utilities">
        {onTogglePhonePreview && (
          <button
            type="button"
            className={`eo-icon-btn ${showPhonePreview ? "is-active" : ""}`}
            onClick={onTogglePhonePreview}
            title={showPhonePreview ? "إخفاء شاشة الهاتف" : "إظهار شاشة الهاتف"}
          >
            <Smartphone size={17} />
          </button>
        )}

        {customerUrl && (
          <button
            className="eo-icon-btn"
            type="button"
            onClick={onCopyUrl}
            title="نسخ رابط صفحة الهبوط"
          >
            <Copy size={17} />
          </button>
        )}

        <button
          className="eo-icon-btn"
          type="button"
          onClick={onRefresh}
          title="تحديث البيانات من السيرفر"
        >
          <RefreshCw size={17} />
        </button>

        <div className="eo-product-selector">
          <Search size={15} />
          <select
            value={selectedId}
            onChange={(e) => onSelectPage(e.target.value)}
          >
            <option value="">اختر صفحة هبوط للتحرير...</option>
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} ({p.status === "PUBLISHED" ? "منشورة ✅" : "مسودة 📝"})
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
};
