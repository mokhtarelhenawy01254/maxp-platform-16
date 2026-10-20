import React, { useState } from 'react';
import { Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button as UiButton } from '@/components/ui/button';
import {
  Dialog as UiDialog,
  DialogContent as UiDialogContent,
  DialogFooter as UiDialogFooter,
  DialogHeader as UiDialogHeader,
  DialogTitle as UiDialogTitle,
} from '@/components/ui/dialog';
import type { CatalogProduct } from '../../chat/types/whatsappChatTypes';

interface ChatCatalogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: CatalogProduct[];
  onSendProduct: (product: CatalogProduct) => void | Promise<void>;
}

export const ChatCatalogDialog: React.FC<ChatCatalogDialogProps> = ({
  open,
  onOpenChange,
  products,
  onSendProduct,
}) => {
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);

  const handleSend = async () => {
    if (!selectedProduct) return;
    await onSendProduct(selectedProduct);
    setSelectedProduct(null);
    onOpenChange(false);
  };

  const handleClose = () => {
    setSelectedProduct(null);
    onOpenChange(false);
  };

  return (
    <UiDialog open={open} onOpenChange={onOpenChange}>
      <UiDialogContent
        showCloseButton={false}
        className="max-w-5xl gap-0 rounded-[28px] border border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0"
      >
        <UiDialogHeader className="border-b border-[color:var(--shell-control-border)] px-6 py-5">
          <UiDialogTitle className="flex items-center gap-2 text-lg text-[color:var(--color-foreground)]">
            <Store className="size-5 text-[color:var(--color-primary)]" />
            <span>إرسال منتج من الكتالوج</span>
          </UiDialogTitle>
        </UiDialogHeader>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-6">
          {products.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-overlay)] px-4 py-10 text-center text-sm text-[color:var(--color-muted-foreground)]">
              لا توجد منتجات في الكتالوج.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => setSelectedProduct(product)}
                  className={cn(
                    'overflow-hidden rounded-[24px] border text-start transition-all',
                    selectedProduct?.id === product.id
                      ? 'border-[color:var(--color-primary)] bg-primary/8 shadow-md'
                      : 'border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface)] hover:bg-[var(--whatsapp-surface-hover)]',
                  )}
                >
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-40 w-full object-cover"
                    />
                  ) : null}
                  <div className="space-y-2 p-4">
                    <p className="truncate text-sm font-semibold text-[color:var(--color-foreground)]">
                      {product.name}
                    </p>
                    <p className="line-clamp-2 text-sm text-[color:var(--color-muted-foreground)]">
                      {product.description}
                    </p>
                    <p className="text-base font-semibold text-[color:var(--color-primary)] tabular-nums font-mono">
                      {product.price ?? 0} {product.currency || 'EGP'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <UiDialogFooter className="border-t border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-overlay)]">
          <UiButton variant="outline" onClick={handleClose}>
            إلغاء
          </UiButton>
          <UiButton
            onClick={handleSend}
            disabled={!selectedProduct}
          >
            إرسال المنتج
          </UiButton>
        </UiDialogFooter>
      </UiDialogContent>
    </UiDialog>
  );
};

export default ChatCatalogDialog;
