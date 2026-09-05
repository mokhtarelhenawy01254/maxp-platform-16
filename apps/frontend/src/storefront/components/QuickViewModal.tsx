import React, { useState, useEffect, useMemo } from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { X, ShoppingCart, Zap, Check, Plus, Minus } from 'lucide-react';
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
import { sanitizeStorefrontHtml } from '../utils/html';
import { sanitizeProductCopy } from '../utils/productCopy';
import VariantSelector from './VariantSelector';
import { getVariantAttributes } from '../utils/variants';

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

  const rawVariants = useMemo(() => {
    return product?.productVariants || product?.variants || [];
  }, [product?.productVariants, product?.variants]);

  // Filter out explicitly inactive variants
  const variants = useMemo(() => {
    return rawVariants.filter((v) => v.isActive !== false);
  }, [rawVariants]);

  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState<number>(1);
  const [addedAnimation, setAddedAnimation] = useState<boolean>(false);

  useEffect(() => {
    if (variants.length > 0) {
      const firstAttrs = getVariantAttributes(variants[0]);
      setSelectedAttributes(firstAttrs);
    } else {
      setSelectedAttributes({});
    }
    setQuantity(1);
    setAddedAnimation(false);
  }, [product?.id, isOpen, variants]);

  const selectedVariant = useMemo(() => {
    if (!variants.length) return null;
    if (Object.keys(selectedAttributes).length === 0) return variants[0];

    return (
      variants.find((variant) => {
        const variantAttributes = getVariantAttributes(variant);
        const variantEntries = Object.entries(variantAttributes);
        if (variantEntries.length === 0) return false;
        return (
          variantEntries.length === Object.keys(selectedAttributes).length &&
          variantEntries.every(([key, value]) => selectedAttributes[key] === value)
        );
      }) || variants[0]
    );
  }, [variants, selectedAttributes]);

  if (!product) return null;

  const { id, name, price, description, slug } = product;
  const primaryImage = getPrimaryProductImage(product);
  const activeImage =
    selectedVariant?.imageUrl ||
    (selectedVariant as { image?: string })?.image ||
    primaryImage;

  const imageCandidates = (() => {
    const baseCandidates = getProductImageCandidates(product);
    if (activeImage && !baseCandidates.includes(activeImage)) {
      return [activeImage, ...baseCandidates];
    }
    return baseCandidates;
  })();

  const productPath = buildStorefrontPath(
    location.pathname,
    `/product/${slug || id}`,
    location.search,
  );
  const hasVariantChoices = Boolean(variants.length);
  const activePrice = selectedVariant?.price ?? price;
  const activeComparePrice = selectedVariant?.comparePrice ?? product.comparePrice;
  const sanitizedDescription = sanitizeStorefrontHtml(description);
  const hasVisibleDescription = Boolean(sanitizeProductCopy(description));

  const fitNote =
    (theme?.sections as any)?.['product-info']?.settings?.fitNote ||
    (theme as any)?.settings?.fitNote ||
    (theme as any)?.pdpSettings?.fitNote ||
    (theme?.id?.includes('khemet')
      ? 'لو مقاسك بين رقمين أو هتلبسي جورب تقيل شوية، اختاري الأكبر غالبًا.'
      : null);

  const variantSettings = {
    styles: {
      Style: 'thumbnails',
      الطراز: 'thumbnails',
      Color: 'circles',
      اللون: 'circles',
      Size: 'radio',
      المقاس: 'radio',
    },
  };

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
    const finalPrice = typeof activePrice === 'string' ? parseFloat(activePrice) : Number(activePrice);
    const finalComparePrice = typeof activeComparePrice === 'number' ? activeComparePrice : undefined;

    addItem({
      productId: id,
      variantId: selectedVariant?.id,
      selectedVariant: selectedVariant || undefined,
      attributes: selectedVariant?.attributes || (Object.keys(selectedAttributes).length > 0 ? selectedAttributes : undefined),
      name: selectedVariant?.name ? `${name} - ${selectedVariant.name}` : name,
      price: finalPrice,
      basePrice: finalPrice,
      comparePrice: finalComparePrice,
      quantity,
      imageUrl: activeImage,
      volumeDiscounts: getProductVolumeDiscounts(product),
    });

    trackAddToCartEvent({
      id,
      name,
      price: finalPrice,
      quantity,
      category: product.category?.name,
    });

    setAddedAnimation(true);
    setTimeout(() => {
      setAddedAnimation(false);
      onClose();
    }, 600);
  };

  const handleQuickBuy = () => {
    const finalPrice = typeof activePrice === 'string' ? parseFloat(activePrice) : Number(activePrice);
    const finalComparePrice = typeof activeComparePrice === 'number' ? activeComparePrice : undefined;

    addItem(
      {
        productId: id,
        variantId: selectedVariant?.id,
        selectedVariant: selectedVariant || undefined,
        attributes: selectedVariant?.attributes || (Object.keys(selectedAttributes).length > 0 ? selectedAttributes : undefined),
        name: selectedVariant?.name ? `${name} - ${selectedVariant.name}` : name,
        price: finalPrice,
        basePrice: finalPrice,
        comparePrice: finalComparePrice,
        quantity,
        imageUrl: activeImage,
        volumeDiscounts: getProductVolumeDiscounts(product),
      },
      { openCart: false },
    );

    trackAddToCartEvent({
      id,
      name,
      price: finalPrice,
      quantity,
      category: product.category?.name,
    });

    onClose();

    const checkoutPath = buildStorefrontPath(location.pathname, '/checkout', location.search);
    if (shouldForceDocumentNavigation) {
      navigateStorefrontDocument(checkoutPath);
      return;
    }

    navigate(checkoutPath);
  };

  const displayPrice = formatStorefrontCurrency(
    typeof activePrice === 'string' ? parseFloat(activePrice) : Number(activePrice),
    currency,
  );

  const displayComparePrice = activeComparePrice && activeComparePrice > activePrice
    ? formatStorefrontCurrency(Number(activeComparePrice), currency)
    : null;

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={onClose}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 animate-in fade-in duration-200" />
        <DialogPrimitive.Popup dir={theme.direction} className="fixed inset-x-0 bottom-0 z-50 w-full max-h-[95vh] overflow-y-auto bg-card p-0 shadow-2xl rounded-t-2xl border-t border-border animate-in slide-in-from-bottom duration-300 md:inset-auto md:left-[50%] md:top-[50%] md:translate-x-[-50%] md:translate-y-[-50%] md:max-w-4xl md:max-h-[90vh] md:rounded-xl md:border md:animate-in md:zoom-in-95" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
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
            <div className="p-6 md:p-8 flex flex-col h-full relative">
              <DialogPrimitive.Close className="absolute top-4 p-2 rounded-full hover:bg-muted transition-colors cursor-pointer" style={isRtl ? { left: '1rem' } : { right: '1rem' }}>
                <X size={20} />
              </DialogPrimitive.Close>

              <div className="space-y-4 flex-grow">
                <DialogPrimitive.Title className="text-2xl md:text-3xl font-bold font-heading">{name}</DialogPrimitive.Title>
                
                <div dir="ltr" className={`flex items-center gap-3 font-sans ${isRtl ? 'justify-end' : 'justify-start'}`}>
                  <span className="text-2xl font-bold text-primary">{displayPrice}</span>
                  {displayComparePrice && (
                    <span className="text-sm text-muted-foreground line-through">{displayComparePrice}</span>
                  )}
                </div>

                {/* Unified Variant Selector (Colors circles & Size buttons) */}
                {hasVariantChoices && (
                  <div className="space-y-3 pt-2">
                    <VariantSelector
                      variants={variants}
                      selectedAttributes={selectedAttributes}
                      onChange={setSelectedAttributes}
                      density="compact"
                      variantSettings={variantSettings}
                      isOpen={hasVariantChoices}
                    />
                    {fitNote ? (
                      <div className="flex items-center gap-2 rounded-[0.8rem] border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-900 dark:text-amber-200">
                        <span className="font-bold shrink-0">💡 {isRtl ? 'نصيحة المقاس:' : 'Fit tip:'}</span>
                        <span className="leading-snug">{fitNote}</span>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Quantity Control */}
                <div className="flex items-center gap-3 pt-2">
                  <label className="text-xs font-bold text-foreground">
                    {isRtl ? 'الكمية:' : 'Quantity:'}
                  </label>
                  <div className="inline-flex items-center rounded-lg border border-border bg-background">
                    <button
                      type="button"
                      onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                      className="p-2 text-foreground hover:bg-muted transition-colors rounded-s-lg"
                      disabled={quantity <= 1}
                    >
                      <Minus size={14} />
                    </button>
                    <span className="px-3 text-sm font-bold min-w-[2.5rem] text-center">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity((prev) => prev + 1)}
                      className="p-2 text-foreground hover:bg-muted transition-colors rounded-e-lg"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
                
                {hasVisibleDescription && sanitizedDescription ? (
                  <div
                    className="prose prose-sm text-muted-foreground line-clamp-3 pt-1 text-xs leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
                  />
                ) : (
                  <div className="prose prose-sm text-muted-foreground line-clamp-3 pt-1 text-xs leading-relaxed">
                    {isRtl ? 'لا يوجد وصف متوفر لهذا المنتج.' : 'No description available for this product.'}
                  </div>
                )}
              </div>

              {/* Conversion Buttons */}
              <div className="mt-6 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button 
                    onClick={handleAddToCart}
                    className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-md"
                  >
                    {addedAnimation ? <Check size={18} /> : <ShoppingCart size={18} />}
                    <span>
                      {addedAnimation 
                        ? (isRtl ? 'تمت الإضافة!' : 'Added!') 
                        : (addToCartLabel || (isRtl ? 'أضف للسلة' : 'Add to Cart'))
                      }
                    </span>
                  </button>

                  <button 
                    onClick={handleQuickBuy}
                    className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md"
                  >
                    <Zap size={18} className="fill-current" />
                    <span>{isRtl ? '⚡ شراء فوري الآن' : '⚡ Buy Now'}</span>
                  </button>
                </div>
                
                <button 
                  onClick={openProductDetails}
                  className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
                >
                  {viewFullDetailsLabel || (isRtl ? 'عرض كامل تفاصيل المنتج ←' : 'View Full Details →')}
                </button>
              </div>
            </div>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default QuickViewModal;
