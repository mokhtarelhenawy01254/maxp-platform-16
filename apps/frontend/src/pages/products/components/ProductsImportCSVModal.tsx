import React from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface ProductsImportCSVModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportCSV: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isEn: boolean;
}

export const ProductsImportCSVModal: React.FC<ProductsImportCSVModalProps> = ({
  isOpen,
  onClose,
  onImportCSV,
  fileInputRef,
  isEn,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl border border-border/70 shadow-2xl p-5 w-full max-w-md text-xs">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/60">
          <h3 className="text-sm font-bold text-foreground">
            {isEn ? "Import Products from CSV" : "استيراد منتجات من CSV"}
          </h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <input
          ref={fileInputRef as any}
          type="file"
          accept=".csv"
          onChange={onImportCSV}
          className="w-full px-3 py-2 border border-border/70 bg-background text-foreground rounded-lg text-xs file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
        />

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors"
          >
            {isEn ? "Cancel" : "إلغاء"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductsImportCSVModal;
