import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRightLeft, RefreshCw, X } from "lucide-react";
import { getDirection } from "../../i18n";
import { apiClient } from "../../services/apiClient";
import "../../pages/categories/Categories.css";
import type { ManagedCategory } from "./types";
import { buildParentOptions } from "./categoryTreeUtils";

interface MoveProductsModalProps {
  open: boolean;
  sourceCategory: ManagedCategory | null;
  categories: ManagedCategory[];
  onClose: () => void;
  onMoved: () => void;
}

export const MoveProductsModal: React.FC<MoveProductsModalProps> = ({
  open,
  sourceCategory,
  categories,
  onClose,
  onMoved,
}) => {
  const { t } = useTranslation();
  const [targetId, setTargetId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTargetId("");
    setError(null);
    setIsSubmitting(false);
  }, [open, sourceCategory]);

  const options = useMemo(() => {
    const excluded = new Set<string>();
    if (sourceCategory) excluded.add(sourceCategory.id);
    return buildParentOptions(categories, excluded);
  }, [categories, sourceCategory]);

  if (!open || !sourceCategory) return null;

  const productCount = sourceCategory._count?.products || 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await apiClient.post<{
        success: boolean;
        data: { moved: number };
      }>(`/products/categories/${sourceCategory.id}/move-products`, {
        targetCategoryId: targetId || null,
      });
      if (response.data?.success) {
        onMoved();
        onClose();
      } else {
        setError(t("categories.management.form.errors.actionFailed") as string);
      }
    } catch (err) {
      const axiosError = err as {
        response?: { data?: { error?: string; message?: string } };
      };
      setError(
        axiosError.response?.data?.error ||
          axiosError.response?.data?.message ||
          (t("categories.management.form.errors.actionFailed") as string),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" dir={getDirection()} role="dialog" aria-modal="true">
      <div className="modal-content" style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <h3>{t("categories.management.move.title")}</h3>
          <button className="close-modal-btn" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
            {t("categories.management.move.description", {
              name: sourceCategory.name,
              count: productCount,
            })}
          </p>

          <div className="form-group">
            <label>{t("categories.management.move.target")}</label>
            <select
              name="targetCategoryId"
              value={targetId}
              onChange={(event) => setTargetId(event.target.value)}
            >
              <option value="">
                {t("categories.management.move.noCategory")}
              </option>
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {`${"    ".repeat(option.depth)}${
                    option.depth > 0 ? "↳ " : ""
                  }${option.label}`}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="mb-2 text-xs font-semibold text-rose-500">{error}</p>
          )}

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              {t("categories.management.form.cancel")}
            </button>
            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? (
                <RefreshCw className="spinning" size={16} />
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <ArrowRightLeft size={14} />
                  {t("categories.management.move.submit")}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MoveProductsModal;
