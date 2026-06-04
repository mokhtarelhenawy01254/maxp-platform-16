import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, ShoppingCart } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Product } from '../hooks/useProducts';
import { useCartStore } from '../store/useCartStore';
import { formatStorefrontCurrency } from '../utils/currency';
import { buildStorefrontPath } from '../utils/paths';
import { useStorefrontFacebookTracking } from '../hooks/useStorefrontFacebookTracking';
import StorefrontProductImage from './StorefrontProductImage';
import {
  getPrimaryProductImage,
  getProductImageCandidates,
} from '../utils/productImages';
import { getProductVolumeDiscounts } from '../utils/volumeDiscounts';
import { useStorefrontTheme } from '../engine/ThemeProvider';
import {
  navigateStorefrontDocument,
  shouldStorefrontForceDocumentNavigation,
} from '../utils/navigationGuards';

interface QuickViewModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  currency?: string;
  addToCartLabel?: string;
  viewFullDetailsLabel?: string;
}

const QuickViewModal: React.FC<QuickViewModalProps> = ({ 
  product, 
  isOpen, 
  onClose,
  currency = 'EGP',
  addToCartLabel,
  viewFullDetailsLabel
}) => {
  const { theme } = useStorefrontTheme();
  const isRtl = theme.direction === 'rtl';
  const { addItem } = useCartStore();
  const { trackAddToCartEvent } = useStorefrontFacebookTracking();
  const navigate = useNavigate();
  const location = useLocation();

  if (!product) return null;

  const { id, name, price, description, slug } = product;
  const imageCandidates = getProductImageCandidates(product);
  const primaryImage = getPrimaryProductImage(product);
  const productPath = buildStorefrontPath(
    location.pathname,
    `/product/${slug || id}`,
    location.search,
  );
  const hasVariantChoices = Boolean(product.productVariants?.length);
  const shouldForceDocumentNavigation = shouldStorefrontForceDocumentNavigation(
    theme.id,
    true,
  );

  const openProductDetails = () => {
    onClose();
    if (shouldForceDocumentNavigation) {
      navigateStorefrontDocument(productPath);
      return;
    }

    navigate(productPath);
  };

  const handleAddToCart = () => {
    if (hasVariantChoices) {
      openProductDetails();
      return;
    }

    addItem({
      productId: id,
      name: name,
      price: typeof price === 'string' ? parseFloat(price) : price,
      basePrice: typeof price === 'string' ? parseFloat(price) : price,
      quantity: 1,
      imageUrl: primaryImage,
      volumeDiscounts: getProductVolumeDiscounts(product),
    });

    trackAddToCartEvent({
      id,
      name,
      price: typeof price === 'string' ? parseFloat(price) : price,
      quantity: 1,
      category: product.category?.name,
    });
    onClose();
  };

  const displayPrice = formatStorefrontCurrency(
    typeof price === 'string' ? parseFloat(price) : price,
    currency,
  );

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 animate-in fade-in duration-200" />
        <Dialog.Content dir={theme.direction} className="fixed inset-x-0 bottom-0 z-50 w-full max-h-[95vh] overflow-y-auto bg-card p-0 shadow-2xl rounded-t-2xl border-t border-border animate-in slide-in-from-bottom duration-300 md:inset-auto md:left-[50%] md:top-[50%] md:translate-x-[-50%] md:translate-y-[-50%] md:max-w-4xl md:max-h-[90vh] md:rounded-xl md:border md:animate-in md:zoom-in-95" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            {/* Gallery Section */}
            <div className="aspect-square bg-muted">
              <StorefrontProductImage
                candidates={imageCandidates}
                alt={name}
                width="800"
                height="800"
                className="h-full w-full object-cover"
                fallback={(
                  <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,hsl(var(--background)),hsl(var(--muted))_68%)] px-6 text-center text-sm font-medium text-muted-foreground">
                    No Image Available
                  </div>
                )}
              />
            </div>

            {/* Info Section */}
            <div className="p-8 flex flex-col h-full relative">
              <Dialog.Close className={`absolute top-4 p-2 rounded-full hover:bg-muted transition-colors ${isRtl ? 'left-4' : 'right-4'}`}>
                <X size={20} />
              </Dialog.Close>

              <div className="space-y-4 flex-grow">
                <Dialog.Title className="text-3xl font-bold font-heading">{name}</Dialog.Title>
                <div dir="ltr" className={`text-2xl font-semibold text-primary font-sans ${isRtl ? 'text-right' : 'text-left'}`}>{displayPrice}</div>
                
                <div className="prose prose-sm text-muted-foreground line-clamp-6">
                  {description || (isRtl ? 'لا يوجد وصف متوفر لهذا المنتج.' : 'No description available for this product.')}
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <button 
                  onClick={handleAddToCart}
                  className="w-full py-4 bg-primary text-primary-foreground rounded-lg font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                >
                  <ShoppingCart size={20} />
                  {hasVariantChoices 
                    ? (isRtl ? 'اختر خيارات' : 'Choose Options') 
                    : (addToCartLabel || (isRtl ? 'أضف للسلة' : 'Add to Cart'))
                  }
                </button>
                
                <button 
                  onClick={openProductDetails}
                  className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {viewFullDetailsLabel || (isRtl ? 'عرض كامل التفاصيل' : 'View Full Details')}
                </button>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default QuickViewModal;
