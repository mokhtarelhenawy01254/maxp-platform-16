import React, { useState } from "react";
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
  LayoutTemplate,
  Download,
  Upload,
  MoreVertical,
  X,
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
  onOpenTemplatesModal?: () => void;
  onExportJson?: () => void;
  onImportJson?: (file: File) => void;
  onGenerateAi: () => void;
  generatingAi: boolean;
  previewUrl: string;
  customerUrl: string;
  onCopyUrl: () => void;
  onTogglePhonePreview?: () => void;
  showPhonePreview?: boolean;
  isDirty?: boolean;
}

export const ProductLandingHeader: React.FC<ProductLandingHeaderProps> = ({
  pages,
  selectedId,
  onSelectPage,
  onRefresh,
  onSave,
  saving,
  onOpenCreateModal,
  onOpenTemplatesModal,
  onExportJson,
  onImportJson,
  onGenerateAi,
  generatingAi,
  previewUrl,
  customerUrl,
  onCopyUrl,
  onTogglePhonePreview,
  showPhonePreview,
  isDirty,
}) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const isBusy = saving || generatingAi;

  return (
    <header className="eo-builder-header" dir="rtl">
      {/* Mobile-Only Unified Bar (< 768px) */}
      <div className="eo-header-mobile-bar">
        <div className="eo-product-selector">
          <Search size={15} />
          <select
            value={selectedId}
            onChange={(e) => onSelectPage(e.target.value)}
          >
            <option value="">اختر صفحة هبوط...</option>
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} ({p.status === "PUBLISHED" ? "منشورة ✅" : "مسودة 📝"})
              </option>
            ))}
          </select>
        </div>

        <button
          className={`eo-btn eo-btn-save ${isDirty ? "is-dirty" : ""}`}
          type="button"
          onClick={onSave}
          disabled={isBusy || !selectedId}
          title={isDirty ? "توجد تغييرات غير محفوظة" : "حفظ التعديلات"}
        >
          {saving ? (
            <Loader2 className="eo-spin" size={15} />
          ) : (
            <Save size={15} />
          )}
          <span>حفظ{isDirty ? " ●" : ""}</span>
        </button>

        <button
          type="button"
          className={`eo-icon-btn ${isMoreMenuOpen ? "is-active" : ""}`}
          onClick={() => setIsMoreMenuOpen((prev) => !prev)}
          title="المزيد من الخيارات والأدوات"
          aria-label="المزيد من الخيارات"
        >
          {isMoreMenuOpen ? <X size={17} /> : <MoreVertical size={17} />}
        </button>
      </div>

      {/* Mobile More Actions Menu Sheet */}
      {isMoreMenuOpen && (
        <div className="eo-header-mobile-menu" dir="rtl">
          <div className="eo-mobile-menu-grid">
            <button
              className="eo-menu-item-btn"
              type="button"
              onClick={() => {
                onOpenCreateModal();
                setIsMoreMenuOpen(false);
              }}
            >
              <Plus size={16} className="text-emerald-600" />
              <span>+ صفحة هبوط جديدة</span>
            </button>

            <button
              className="eo-menu-item-btn"
              type="button"
              onClick={() => {
                onGenerateAi();
                setIsMoreMenuOpen(false);
              }}
              disabled={isBusy || !selectedId}
            >
              <Sparkles size={16} className="text-blue-600" />
              <span>كتابة بالذكاء الاصطناعي ✨</span>
            </button>

            {onOpenTemplatesModal && (
              <button
                className="eo-menu-item-btn"
                type="button"
                onClick={() => {
                  onOpenTemplatesModal();
                  setIsMoreMenuOpen(false);
                }}
              >
                <LayoutTemplate size={16} className="text-indigo-600" />
                <span>نماذج وقوالب جاهزة</span>
              </button>
            )}

            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="eo-menu-item-btn"
                onClick={() => setIsMoreMenuOpen(false)}
              >
                <Eye size={16} className="text-sky-600" />
                <span>معاينة حية في المتجر ↗</span>
              </a>
            )}

            {customerUrl && (
              <button
                className="eo-menu-item-btn"
                type="button"
                onClick={() => {
                  onCopyUrl();
                  setIsMoreMenuOpen(false);
                }}
              >
                <Copy size={16} className="text-slate-600" />
                <span>نسخ رابط الصفحة</span>
              </button>
            )}

            {onExportJson && (
              <button
                className="eo-menu-item-btn"
                type="button"
                onClick={() => {
                  onExportJson();
                  setIsMoreMenuOpen(false);
                }}
                disabled={!selectedId}
              >
                <Download size={16} className="text-amber-600" />
                <span>تصدير تصميم JSON</span>
              </button>
            )}

            {onImportJson && (
              <label
                className="eo-menu-item-btn cursor-pointer"
              >
                <Upload size={16} className="text-purple-600" />
                <span>استيراد تصميم JSON</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onImportJson(file);
                      e.target.value = "";
                      setIsMoreMenuOpen(false);
                    }
                  }}
                />
              </label>
            )}

            <button
              className="eo-menu-item-btn"
              type="button"
              onClick={() => {
                onRefresh();
                setIsMoreMenuOpen(false);
              }}
            >
              <RefreshCw size={16} className="text-slate-600" />
              <span>تحديث البيانات من السيرفر</span>
            </button>
          </div>
        </div>
      )}

      {/* Desktop Actions (Right side in RTL) */}
      <div className="eo-header-actions eo-desktop-only">
        <button
          className={`eo-btn eo-btn-save ${isDirty ? "is-dirty" : ""}`}
          type="button"
          onClick={onSave}
          disabled={isBusy || !selectedId}
          title={
            isDirty
              ? "توجد تغييرات غير محفوظة — اضغط لحفظ الصفحة"
              : "حفظ التعديلات في قاعدة البيانات"
          }
        >
          {saving ? (
            <Loader2 className="eo-spin" size={16} />
          ) : (
            <Save size={16} />
          )}
          <span>حفظ التعديلات{isDirty ? " ●" : ""}</span>
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

        {onOpenTemplatesModal && (
          <button
            className="eo-btn eo-btn-templates"
            type="button"
            onClick={onOpenTemplatesModal}
            title="تطبيق قوالب صفحات هبوط جاهزة ومجرّبة"
          >
            <LayoutTemplate size={16} />
            <span>نماذج وقوالب</span>
          </button>
        )}

        {onExportJson && (
          <button
            className="eo-btn eo-btn-export-json"
            type="button"
            onClick={onExportJson}
            disabled={!selectedId}
            title="تصدير تصميم الصفحة بصيغة JSON"
          >
            <Download size={15} />
            <span>تصدير JSON</span>
          </button>
        )}

        {onImportJson && (
          <label
            className="eo-btn eo-btn-import-json eo-file-upload-label"
            title="استيراد تصميم صفحة هبوط من ملف JSON"
            style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, margin: 0 }}
          >
            <Upload size={15} />
            <span>استيراد JSON</span>
            <input
              type="file"
              accept=".json,application/json"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  onImportJson(file);
                  e.target.value = "";
                }
              }}
            />
          </label>
        )}
      </div>

      {/* Desktop Utilities (Left side in RTL) */}
      <div className="eo-header-utilities eo-desktop-only">
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
