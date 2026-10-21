import React from "react";
import {
  XMarkIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import type { FieldErrors } from "../../types";
import type { ConvertPresentationResult } from "../../hooks/useProductPresentations";

interface ProductNewAlertsProps {
  error: string | null;
  success: boolean;
  successMessage: string | null;
  convertSuccess: ConvertPresentationResult | null;
  accessibleTargetCompany: { id: string; name: string } | null;
  fieldErrors: FieldErrors;
  linkCopied: boolean;
  switchCompany: (id: string) => Promise<void>;
  setIsCategoryModalOpen: (open: boolean) => void;
  setConvertSuccess: (val: ConvertPresentationResult | null) => void;
  handleCopyConvertLink: () => void;
  t: (key: string) => string;
}

export const ProductNewAlerts: React.FC<ProductNewAlertsProps> = ({
  error,
  success,
  successMessage,
  convertSuccess,
  accessibleTargetCompany,
  fieldErrors,
  linkCopied,
  switchCompany,
  setIsCategoryModalOpen,
  setConvertSuccess,
  handleCopyConvertLink,
  t,
}) => {
  return (
    <>
      {error && (
        <div className="mb-6 bg-destructive/10 border-l-4 rtl:border-l-0 rtl:border-r-4 border-destructive p-4 rounded-md">
          <div className="flex">
            <div className="shrink-0">
              <XMarkIcon className="h-5 w-5 text-destructive" aria-hidden="true" />
            </div>
            <div className="ml-3 rtl:mr-3 rtl:ml-0 flex-1">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs sm:text-sm font-medium text-destructive">
                  {error}
                </p>
                {accessibleTargetCompany && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await switchCompany(accessibleTargetCompany.id);
                        window.location.reload();
                      } catch (swErr) {
                        console.error("Switch failed:", swErr);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    التبديل إلى شركة {accessibleTargetCompany.name} والفتح فوراً
                  </button>
                )}
                {fieldErrors.category && (
                  <button
                    type="button"
                    onClick={() => setIsCategoryModalOpen(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-primary bg-primary/10 border border-primary/20 rounded-md hover:bg-primary/20 transition-colors"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    <span>{t("categories.management.addCategory")}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {(success || successMessage) && (
        <div className="mb-6 bg-emerald-500/10 border-l-4 rtl:border-l-0 rtl:border-r-4 border-emerald-500 p-4 rounded-md">
          <div className="flex items-center">
            <div className="shrink-0">
              <CheckCircleIcon className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="ml-3 rtl:mr-3 rtl:ml-0">
              <p className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                {successMessage || t("products.messages.productCreated")}
              </p>
            </div>
          </div>
        </div>
      )}

      {convertSuccess && (
        <div className="mb-6 bg-emerald-500/10 border-l-4 rtl:border-l-0 rtl:border-r-4 border-emerald-500 p-4 rounded-md">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <CheckCircleIcon
                className="h-5 w-5 text-emerald-600 shrink-0"
                aria-hidden="true"
              />
              <div>
                <p className="text-xs sm:text-sm font-medium text-emerald-800 dark:text-emerald-300">
                  تم تحويل المنتج إلى عرض تقديمي بنجاح
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-emerald-700 dark:text-emerald-400">
                  <span>الرابط الجديد:</span>
                  <span dir="ltr" className="font-mono text-xs">
                    /products/{convertSuccess.presentationSlug}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyConvertLink}
                    className="inline-flex items-center gap-1 rounded-md border border-emerald-300 dark:border-emerald-800 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                  >
                    {linkCopied ? (
                      <CheckCircleIcon className="h-3.5 w-3.5" />
                    ) : (
                      <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                    )}
                    <span>{linkCopied ? "تم النسخ" : "نسخ الرابط"}</span>
                  </button>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setConvertSuccess(null)}
              className="text-emerald-600 hover:text-emerald-800 shrink-0 p-1"
              aria-label="إغلاق الإشعار"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ProductNewAlerts;
