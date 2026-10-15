import React from 'react';
import { RotateCcw, Trash2, Image as ImageIcon, Calendar, Tag } from 'lucide-react';

export interface DeletedProduct {
  id: string;
  name: string;
  price: number;
  sku: string;
  barcode: string;
  stock: number;
  images: any[];
  category?: {
    id: string;
    name: string;
  };
  deletedAt: string;
  createdAt: string;
}

interface TrashProductCardProps {
  product: DeletedProduct;
  isSelected: boolean;
  isRestoring: boolean;
  isDeleting: boolean;
  onToggleSelect: (id: string) => void;
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  formatPrice: (price: number) => string;
  formatDate: (date: string) => string;
}

export const TrashProductCard: React.FC<TrashProductCardProps> = ({
  product,
  isSelected,
  isRestoring,
  isDeleting,
  onToggleSelect,
  onRestore,
  onPermanentDelete,
  formatPrice,
  formatDate,
}) => {
  const getProductImage = (images: any[]) => {
    if (!images || images.length === 0) return null;
    const firstImage = images[0];
    if (typeof firstImage === 'string') return firstImage;
    return firstImage?.url || firstImage?.src || null;
  };

  const image = getProductImage(product.images);

  return (
    <div
      className={`bg-card rounded-2xl border p-4 transition-all shadow-2xs ${
        isSelected
          ? 'border-primary ring-1 ring-primary/20'
          : 'border-border/70 hover:border-border'
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(product.id)}
          className="mt-1 h-4 w-4 rounded border-border/80 text-primary focus:ring-0 cursor-pointer shrink-0"
        />

        <div className="h-14 w-14 rounded-xl border border-border/70 bg-muted/30 overflow-hidden flex items-center justify-center shrink-0">
          {image ? (
            <img
              src={image}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-xs sm:text-sm text-foreground truncate">
            {product.name}
          </h3>
          {product.sku && (
            <p className="font-mono text-[11px] text-muted-foreground mt-0.5" dir="ltr">
              SKU: {product.sku}
            </p>
          )}
          <p className="font-mono tabular-nums text-xs font-bold text-foreground mt-1">
            {formatPrice(product.price)}
          </p>
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
        {product.category && (
          <span className="inline-flex items-center gap-1 truncate max-w-[140px]">
            <Tag className="w-3 h-3 text-muted-foreground" />
            {product.category.name}
          </span>
        )}
        <span className="font-mono tabular-nums inline-flex items-center gap-1">
          <Calendar className="w-3 h-3 text-muted-foreground" />
          {formatDate(product.deletedAt)}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onRestore(product.id)}
          disabled={isRestoring || isDeleting}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl text-xs font-semibold bg-muted/40 hover:bg-muted/70 text-foreground border border-border/70 active:scale-[0.97] transition-all disabled:opacity-50"
        >
          <RotateCcw className={`h-3 w-3 ${isRestoring ? 'animate-spin' : ''}`} />
          <span>استعادة</span>
        </button>
        <button
          type="button"
          onClick={() => onPermanentDelete(product.id)}
          disabled={isRestoring || isDeleting}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 border border-destructive/20 active:scale-[0.97] transition-all disabled:opacity-50"
        >
          <Trash2 className={`h-3 w-3 ${isDeleting ? 'animate-spin' : ''}`} />
          <span>حذف نهائي</span>
        </button>
      </div>
    </div>
  );
};
