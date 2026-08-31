import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Image as ImageIcon, RefreshCw, X } from "lucide-react";
import { getDirection } from "../../i18n";
import { apiClient } from "../../services/apiClient";
import { getImageUrl } from "../../utils/imageUrl";
import "../../pages/categories/Categories.css";
import type { AxiosError } from "axios";

export interface CategoryFormModalCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  isActive: boolean;
  parentId: string | null;
  _count?: {
    products: number;
  };
}

interface CategoryFormModalProps {
  open: boolean;
  editingCategory?: CategoryFormModalCategory | null;
  onClose: () => void;
  onSaved: (category: CategoryFormModalCategory) => void;
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

const getApiErrorMessage = (
  error: unknown,
): string | null => {
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

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  open,
  editingCategory,
  onClose,
  onSaved,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    isActive: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingCategory) {
      setFormData({
        name: editingCategory.name,
        slug: editingCategory.slug,
        description: editingCategory.description || "",
        isActive: editingCategory.isActive,
      });
      setImageFile(null);
      setImagePreview(getImageUrl(editingCategory.image));
    } else {
      setFormData({
        name: "",
        slug: "",
        description: "",
        isActive: true,
      });
      setImageFile(null);
      setImagePreview(null);
    }
    setIsSubmitting(false);
  }, [open, editingCategory]);

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
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : value,
    }));

    if (name === "name" && !editingCategory) {
      const suggestedSlug = buildSuggestedSlug(value);
      setFormData((prev) => ({ ...prev, slug: suggestedSlug }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      alert(t("categories.management.form.errors.nameRequired"));
      return;
    }

    setIsSubmitting(true);
    try {
      const submitData = new FormData();
      submitData.append("name", formData.name);
      const resolvedSlug = buildSuggestedSlug(
        formData.slug || formData.name,
      );
      submitData.append("slug", resolvedSlug);
      submitData.append("description", formData.description);
      submitData.append("isActive", String(formData.isActive));

      if (imageFile) {
        submitData.append("image", imageFile);
      }

      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      };

      let savedCategory: CategoryFormModalCategory;
      if (editingCategory) {
        const response = await apiClient.put<{ data: CategoryFormModalCategory }>(
          `/products/categories/${editingCategory.id}`,
          submitData,
          config,
        );
        savedCategory = response.data?.data || editingCategory;
      } else {
        const response = await apiClient.post<{ data: CategoryFormModalCategory }>(
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
        getApiErrorMessage(err) ||
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
          <button className="close-modal-btn" onClick={onClose}>
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
              style={{ marginTop: "0.4rem", fontSize: "0.75rem", color: "#64748b", lineHeight: 1.5 }}
            >
              {t("categories.management.form.nameHelp")}
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
                    setImageFile(null);
                    setImagePreview(null);
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
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
            <button
              type="button"
              className="cancel-btn"
              onClick={onClose}
            >
              {t("categories.management.form.cancel")}
            </button>
            <button
              type="submit"
              className="submit-btn"
              disabled={isSubmitting}
            >
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
