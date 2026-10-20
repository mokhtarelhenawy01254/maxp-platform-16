import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  Image as ImageIcon,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { getDirection } from "../../i18n";
import { apiClient } from "../../services/apiClient";
import { getImageUrl } from "../../utils/imageUrl";
import "../../pages/categories/Categories.css";
import type { AxiosError } from "axios";
import type { ManagedCategory } from "./types";
import { buildParentOptions, collectDescendantIds } from "./categoryTreeUtils";

export type CategoryFormModalCategory = ManagedCategory;

interface CategoryFormModalProps {
  open: boolean;
  editingCategory?: ManagedCategory | null;
  categories?: ManagedCategory[];
  defaultParentId?: string | null;
  onClose: () => void;
  onSaved: (category: ManagedCategory) => void;
}

const arabicToFranco: Record<string, string> = {
  ا: "a",
  أ: "a",
  إ: "e",
  آ: "a",
  ء: "a",
  ب: "b",
  ت: "t",
  ث: "th",
  ج: "g",
  ح: "7",
  خ: "kh",
  د: "d",
  ذ: "dh",
  ر: "r",
  ز: "z",
  س: "s",
  ش: "sh",
  ص: "s",
  ض: "d",
  ط: "t",
  ظ: "z",
  ع: "3",
  غ: "gh",
  ف: "f",
  ق: "q",
  ك: "k",
  ل: "l",
  م: "m",
  ن: "n",
  ه: "h",
  ة: "a",
  و: "o",
  ؤ: "o",
  ي: "y",
  ى: "a",
  ئ: "e",
};

const transliterateArabicToFranco = (text: string): string =>
  text
    .split("")
    .map((char) => arabicToFranco[char] || char)
    .join("");

const buildSuggestedSlug = (value: string): string => {
  const transliterated = transliterateArabicToFranco(value);
  const normalized = transliterated
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized;
};

const getApiErrorMessage = (error: unknown): string | null => {
  const axiosError = error as AxiosError<{
    error?: string;
    message?: string;
  }>;
  return (
    axiosError.response?.data?.error ||
    axiosError.response?.data?.message ||
    null
  );
};

/** رسائل السيرفر القديمة إنجليزي — بنترجمها بدل ما تطلع في alert إنجليزي */
const mapServerMessage = (
  message: string | null,
  t: (key: string) => string,
): string | null => {
  if (!message) return null;

  if (
    message.toLowerCase().includes("already exists") ||
    message.includes("بنفس الاسم")
  ) {
    return t("categories.management.form.errors.duplicateName");
  }
  if (message.includes("الفئة الأب غير موجودة")) {
    return t("categories.management.form.errors.parentNotFound");
  }
  if (
    message.includes("داخل إحدى فئاتها الفرعية") ||
    message.includes("تابعة لنفسها")
  ) {
    return t("categories.management.form.errors.parentCycle");
  }
  if (message.includes("اسم الفئة مطلوب")) {
    return t("categories.management.form.errors.nameRequired");
  }
  if (message.includes("الفئة غير موجودة")) {
    return t("categories.management.form.errors.notFound");
  }
  return message;
};

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  open,
  editingCategory,
  categories = [],
  defaultParentId = null,
  onClose,
  onSaved,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    isActive: true,
    parentId: "",
    sortOrder: "0",
    metaTitle: "",
    metaDescription: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parentSearch, setParentSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    if (editingCategory) {
      setFormData({
        name: editingCategory.name,
        slug: editingCategory.slug,
        description: editingCategory.description || "",
        isActive: editingCategory.isActive,
        parentId: editingCategory.parentId || "",
        sortOrder: String(editingCategory.sortOrder ?? 0),
        metaTitle: editingCategory.metaTitle || "",
        metaDescription: editingCategory.metaDescription || "",
      });
      setImageFile(null);
      setImagePreview(getImageUrl(editingCategory.image));
      setRemoveImage(false);
      setShowAdvanced(
        Boolean(editingCategory.metaTitle || editingCategory.metaDescription),
      );
    } else {
      setFormData({
        name: "",
        slug: "",
        description: "",
        isActive: true,
        parentId: defaultParentId || "",
        sortOrder: "0",
        metaTitle: "",
        metaDescription: "",
      });
      setImageFile(null);
      setImagePreview(null);
      setRemoveImage(false);
      setShowAdvanced(false);
    }
    setParentSearch("");
    setIsSubmitting(false);
  }, [open, editingCategory, defaultParentId]);

  const parentOptions = useMemo(() => {
    const excluded = new Set<string>();
    if (editingCategory) {
      excluded.add(editingCategory.id);
      collectDescendantIds(categories, editingCategory.id).forEach((id) =>
        excluded.add(id),
      );
    }
    const options = buildParentOptions(categories, excluded);
    if (!parentSearch.trim()) return options;
    const needle = parentSearch.trim().toLowerCase();
    return options.filter((option) =>
      option.label.toLowerCase().includes(needle),
    );
  }, [categories, editingCategory, parentSearch]);

  if (!open) return null;

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));

    if (name === "name" && !editingCategory) {
      setFormData((prev) => ({ ...prev, slug: buildSuggestedSlug(value) }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setRemoveImage(false);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(Boolean(editingCategory?.image));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert(t("categories.management.form.errors.nameRequired"));
      return;
    }

    setIsSubmitting(true);
    try {
      const submitData = new FormData();
      submitData.append("name", formData.name.trim());
      submitData.append(
        "slug",
        buildSuggestedSlug(formData.slug || formData.name),
      );
      submitData.append("description", formData.description);
      submitData.append("isActive", String(formData.isActive));
      submitData.append("parentId", formData.parentId || "");
      submitData.append("sortOrder", formData.sortOrder || "0");
      submitData.append("metaTitle", formData.metaTitle);
      submitData.append("metaDescription", formData.metaDescription);

      if (imageFile) {
        submitData.append("image", imageFile);
      } else if (removeImage) {
        submitData.append("removeImage", "true");
      }

      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      };

      let savedCategory: ManagedCategory;
      if (editingCategory) {
        const response = await apiClient.put<{ data: ManagedCategory }>(
          `/products/categories/${editingCategory.id}`,
          submitData,
          config,
        );
        savedCategory = response.data?.data || editingCategory;
      } else {
        const response = await apiClient.post<{ data: ManagedCategory }>(
          "/products/categories",
          submitData,
          config,
        );
        savedCategory = response.data?.data;
      }

      onSaved?.(savedCategory);
      onClose();
    } catch (err) {
      console.error("Error saving category:", err);
      alert(
        mapServerMessage(getApiErrorMessage(err), t) ||
          (t("categories.management.form.errors.actionFailed") as string),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      dir={getDirection()}
      role="dialog"
      aria-modal="true"
    >
      <div className="modal-content">
        <div className="modal-header">
          <h3>
            {editingCategory
              ? t("categories.management.form.editTitle")
              : t("categories.management.form.addTitle")}
          </h3>
          <button className="close-modal-btn" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t("categories.management.form.name")}</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
            <p
              className="category-modal-hint"
              style={{
                marginTop: "0.4rem",
                fontSize: "0.75rem",
                color: "#64748b",
                lineHeight: 1.5,
              }}
            >
              {t("categories.management.form.nameHelp")}
            </p>
          </div>

          <div className="form-group">
            <label>{t("categories.management.form.parent")}</label>
            {categories.length > 6 && (
              <div style={{ position: "relative", marginBottom: "0.4rem" }}>
                <Search
                  size={14}
                  style={{
                    position: "absolute",
                    top: "50%",
                    transform: "translateY(-50%)",
                    insetInlineStart: "0.6rem",
                    color: "#94a3b8",
                    pointerEvents: "none",
                  }}
                />
                <input
                  type="text"
                  value={parentSearch}
                  onChange={(event) => setParentSearch(event.target.value)}
                  placeholder={
                    t("categories.management.form.parentSearch") as string
                  }
                  style={{ paddingInlineStart: "2rem" }}
                />
              </div>
            )}
            <select
              name="parentId"
              value={formData.parentId}
              onChange={handleInputChange}
            >
              <option value="">
                {t("categories.management.form.parentNone")}
              </option>
              {parentOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {`${"    ".repeat(option.depth)}${
                    option.depth > 0 ? "↳ " : ""
                  }${option.label}`}
                </option>
              ))}
            </select>
            <p
              className="category-modal-hint"
              style={{
                marginTop: "0.4rem",
                fontSize: "0.75rem",
                color: "#64748b",
                lineHeight: 1.5,
              }}
            >
              {t("categories.management.form.parentHelp")}
            </p>
          </div>

          <div className="form-group">
            <label>{t("categories.management.form.slug")}</label>
            <input
              type="text"
              name="slug"
              value={formData.slug}
              onChange={handleInputChange}
              placeholder="e.g. skin-care-products"
            />
          </div>
          <div className="form-group">
            <label>{t("categories.management.form.description")}</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
            ></textarea>
          </div>
          <div className="form-group">
            <label>
              {t("categories.management.form.image", "Category Image")}
            </label>
            <div className="image-upload-wrapper">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="image-file-input"
                id="category-image-upload"
              />
              <label
                htmlFor="category-image-upload"
                className="image-upload-label"
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="image-preview"
                  />
                ) : (
                  <div className="image-upload-placeholder">
                    <ImageIcon size={24} />
                    <span>
                      {t(
                        "categories.management.form.uploadImage",
                        "Upload Image",
                      )}
                    </span>
                  </div>
                )}
              </label>
              {imagePreview && (
                <button
                  type="button"
                  className="remove-image-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    handleRemoveImage();
                  }}
                  title={t("categories.management.form.removeImage") as string}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>{t("categories.management.form.sortOrder")}</label>
            <input
              type="number"
              name="sortOrder"
              value={formData.sortOrder}
              onChange={handleInputChange}
              min={0}
              step={1}
            />
            <p
              className="category-modal-hint"
              style={{
                marginTop: "0.4rem",
                fontSize: "0.75rem",
                color: "#64748b",
                lineHeight: 1.5,
              }}
            >
              {t("categories.management.form.sortOrderHelp")}
            </p>
          </div>

          <div className="form-group">
            <button
              type="button"
              onClick={() => setShowAdvanced((previous) => !previous)}
              aria-expanded={showAdvanced}
              style={{
                display: "flex",
                width: "100%",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.5rem",
                padding: "0.55rem 0.75rem",
                borderRadius: "0.5rem",
                border: "1px solid #e4e4e7",
                background: "#fafafa",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "#3f3f46",
                cursor: "pointer",
              }}
            >
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <SlidersHorizontal size={14} />
                {t("categories.management.form.seoSection")}
              </span>
              <ChevronDown
                size={14}
                style={{
                  transform: showAdvanced ? "rotate(180deg)" : "none",
                  transition: "transform 150ms",
                }}
              />
            </button>
          </div>

          {showAdvanced && (
            <>
              <div className="form-group">
                <label>{t("categories.management.form.metaTitle")}</label>
                <input
                  type="text"
                  name="metaTitle"
                  value={formData.metaTitle}
                  onChange={handleInputChange}
                  maxLength={70}
                />
                <p
                  className="category-modal-hint"
                  style={{
                    marginTop: "0.4rem",
                    fontSize: "0.75rem",
                    color: "#64748b",
                    lineHeight: 1.5,
                  }}
                >
                  {t("categories.management.form.metaTitleHelp")}
                </p>
              </div>
              <div className="form-group">
                <label>
                  {t("categories.management.form.metaDescription")}
                </label>
                <textarea
                  name="metaDescription"
                  value={formData.metaDescription}
                  onChange={handleInputChange}
                  rows={2}
                  maxLength={160}
                ></textarea>
                <p
                  className="category-modal-hint"
                  style={{
                    marginTop: "0.4rem",
                    fontSize: "0.75rem",
                    color: "#64748b",
                    lineHeight: 1.5,
                  }}
                >
                  {t("categories.management.form.metaDescriptionHelp")}
                </p>
              </div>
            </>
          )}

          <div className="form-group checkbox">
            <label className="switch">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    isActive: e.target.checked,
                  }))
                }
              />
              <span className="slider round"></span>
            </label>
            <span>{t("categories.management.form.status")}</span>
          </div>
          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              {t("categories.management.form.cancel")}
            </button>
            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? (
                <RefreshCw className="spinning" size={16} />
              ) : (
                t("categories.management.form.save")
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryFormModal;
