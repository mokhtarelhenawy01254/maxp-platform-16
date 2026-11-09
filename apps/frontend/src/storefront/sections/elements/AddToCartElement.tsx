import React, { useState, useEffect } from 'react';
import {
  buildElementTypographyStyle,
  useElementTypographyRef,
  type ElementTypographySettings,
} from './elementTypography';
import { useStorefrontDynamicContext } from '../../studio/utils/dynamicValues';
import { storefrontApi } from '../../../utils/storefrontApi';
import { useCartStore } from '../../store/useCartStore';
import { usePdpSelectionStore } from '../../store/usePdpSelectionStore';
import { getProductVolumeDiscounts } from '../../utils/volumeDiscounts';
import {
  extractProductOptions,
  resolveProductFromContext,
} from './commerceElementHelpers';

export interface AddToCartElementSettings extends ElementTypographySettings {
  label?: string; // default "أضف للسلة"
  outOfStockLabel?: string; // default "غير متوفر"
  missingOptionsMessage?: string; // default "يرجى تحديد الخيارات أولاً"
  variant?: 'primary' | 'outline' | 'ghost' | string;
  size?: 'sm' | 'md' | 'lg' | string;
  fullWidth?: boolean;
  align?: 'start' | 'center' | 'end' | 'left' | 'right' | string;
  className?: string;
}

export interface AddToCartElementProps {
  section?: {
    type?: string;
    variant?: string;
    settings?: AddToCartElementSettings;
    product?: unknown;
    selectedVariantId?: string;
    [key: string]: unknown;
  };
  settings?: AddToCartElementSettings;
  product?: unknown;
  selectedVariantId?: string;
  selectedAttributes?: Record<string, string>;
  quantity?: number;
  disabled?: boolean;
  onAdded?: (result: unknown) => void;
}

const AddToCartElement: React.FC<AddToCartElementProps> = ({
  section,
  settings: directSettings,
  product: directProduct,
  selectedVariantId: propVariantId,
  quantity: propQuantity = 1,
  disabled: propDisabled,
  onAdded,
}) => {
  const dynamicCtx = useStorefrontDynamicContext();
  const mergedSettings = { ...section?.settings, ...directSettings };

  const product = resolveProductFromContext(
    dynamicCtx,
    directProduct ?? section?.product,
  );

  // Read pdpSelectionStore if available for cross-element option selection
  const pdpSelection = usePdpSelectionStore((state) => state.selection);
  const [localVariantId, setLocalVariantId] = useState<string | undefined>(
    propVariantId ?? section?.selectedVariantId,
  );
  const [isLoading, setIsLoading] = useState(false);

  // Listen for variant change events dispatched by ProductOptionsElement
  useEffect(() => {
    if (propVariantId) {
      setLocalVariantId(propVariantId);
      return;
    }

    const handleCustomVariantChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ productId?: string; variantId?: string }>;
      if (
        customEvent.detail &&
        (!customEvent.detail.productId ||
          String(customEvent.detail.productId) === String(product?.id))
      ) {
        setLocalVariantId(customEvent.detail.variantId);
      }
    };

    window.addEventListener('storefront:variantChange', handleCustomVariantChange);
    return () => {
      window.removeEventListener('storefront:variantChange', handleCustomVariantChange);
    };
  }, [product?.id, propVariantId]);

  // If the context is NOT a product -> do NOT render anything (do not display 0)
  if (!product) {
    return null;
  }

  // Stock check
  const stock =
    product.stock !== undefined && product.stock !== null && !Number.isNaN(Number(product.stock))
      ? Number(product.stock)
      : null;
  const isOutOfStock = stock !== null && stock <= 0;

  // Options check
  const extractedOptions = extractProductOptions(product);
  const variants = Array.isArray(product.variants)
    ? product.variants
    : Array.isArray(product.productVariants)
    ? product.productVariants
    : [];

  const hasOptions = extractedOptions.length > 0 || variants.length > 1;

  // Active selected variant ID
  const activeVariantId =
    propVariantId ??
    localVariantId ??
    (product as Record<string, unknown>).selectedVariantId ??
    (pdpSelection?.productId === String(product.id) ? pdpSelection?.variantId : undefined);

  // Missing options check
  const isMissingOptions = hasOptions && !activeVariantId;

  // Disabled state
  const isDisabled = Boolean(propDisabled || isOutOfStock || isMissingOptions || isLoading);

  // Labels & Messages
  const label = mergedSettings?.label || 'أضف للسلة';
  const outOfStockLabel = mergedSettings?.outOfStockLabel || 'غير متوفر';
  const missingOptionsMessage =
    mergedSettings?.missingOptionsMessage || 'يرجى تحديد الخيارات أولاً';

  const buttonText = isOutOfStock ? outOfStockLabel : label;

  const rawVariant = String(
    mergedSettings?.variant || section?.variant || 'primary',
  ).trim().toLowerCase();
  const rawSize = String(mergedSettings?.size || 'md').trim().toLowerCase();
  const fullWidth = mergedSettings?.fullWidth !== false;
  const rawAlign = String(mergedSettings?.align || 'start').trim().toLowerCase();
  const customClass = mergedSettings?.className || '';

  // Size styling
  let sizeClasses = 'px-6 py-3 text-sm font-semibold min-h-[44px]';
  if (rawSize === 'sm') {
    sizeClasses = 'px-4 py-2 text-xs font-medium min-h-[36px]';
  } else if (rawSize === 'lg') {
    sizeClasses = 'px-8 py-4 text-base font-bold min-h-[50px]';
  }

  // Variant classes
  let variantClasses = '';
  const buttonStyle: React.CSSProperties = {
    borderRadius: 'var(--store-radius, 8px)',
    fontFamily: 'var(--store-font-family, inherit)',
  };

  if (isDisabled) {
    variantClasses = 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-800 dark:text-gray-500 opacity-60';
  } else if (rawVariant === 'outline') {
    variantClasses = 'border border-[var(--store-accent,#2563eb)] text-[var(--store-accent,#2563eb)] bg-transparent hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98]';
    buttonStyle.borderColor = 'var(--store-accent, #2563eb)';
    buttonStyle.color = 'var(--store-accent, #2563eb)';
  } else if (rawVariant === 'ghost') {
    variantClasses = 'text-[var(--store-accent,#2563eb)] bg-transparent hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98]';
    buttonStyle.color = 'var(--store-accent, #2563eb)';
  } else {
    // Primary
    variantClasses = 'text-white bg-[var(--store-accent,#2563eb)] shadow-sm hover:opacity-90 active:scale-[0.98]';
    buttonStyle.backgroundColor = 'var(--store-accent, #2563eb)';
    buttonStyle.color = '#ffffff';
  }

  let alignClass = 'justify-start';
  if (rawAlign === 'center') {
    alignClass = 'justify-center';
  } else if (rawAlign === 'end' || rawAlign === 'right') {
    alignClass = 'justify-end';
  }

  const typoStyle = buildElementTypographyStyle(mergedSettings, buttonText);
  const elementRef = useElementTypographyRef(typoStyle.letterSpacing);

  const finalButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    ...typoStyle,
  };

  const handleAddToCart = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (isDisabled) return;

    setIsLoading(true);
    try {
      const payload: {
        productId: string;
        variantId?: string;
        quantity?: number;
      } = {
        productId: String(product.id),
        quantity: Math.max(1, propQuantity),
      };

      if (activeVariantId) {
        payload.variantId = String(activeVariantId);
      }

      // Exact storefrontApi.addToCart invocation
      const response = await storefrontApi.addToCart(payload);

      // Synchronize with local Zustand cart store if available
      try {
        useCartStore.getState().addItem(
          {
            productId: String(product.id),
            variantId: activeVariantId ? String(activeVariantId) : undefined,
            name: product.title || product.name || '',
            price: Number(product.price) || 0,
            basePrice: Number(product.price) || 0,
            quantity: Math.max(1, propQuantity),
            volumeDiscounts: getProductVolumeDiscounts(product, Number(product.price) || 0),
            imageUrl:
              product.image ||
              product.featuredImage ||
              (Array.isArray(product.images) && product.images.length > 0
                ? product.images[0]
                : undefined),
          },
          { openCart: true },
        );
      } catch {
        // In environments without storage, zustand persist might throw
      }

      onAdded?.(response);
    } catch (error) {
      console.error('Failed to add to cart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      data-storefront-element="add-to-cart"
      data-element="add-to-cart"
      data-product-id={product.id}
      data-variant-id={activeVariantId ?? undefined}
      data-disabled={isDisabled}
      data-out-of-stock={isOutOfStock}
      data-missing-options={isMissingOptions}
      className={`storefront-add-to-cart-wrapper flex flex-col w-full ${alignClass}`}
    >
      <button
        ref={elementRef as React.RefObject<HTMLButtonElement>}
        type="button"
        disabled={isDisabled}
        onClick={handleAddToCart}
        data-testid="add-to-cart-button"
        className={`inline-flex items-center justify-center text-center select-none transition-all duration-150 ${
          fullWidth ? 'w-full' : 'w-auto'
        } ${sizeClasses} ${variantClasses} ${customClass}`.trim()}
        style={finalButtonStyle}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            <span>جاري الإضافة…</span>
          </span>
        ) : (
          <span>{buttonText}</span>
        )}
      </button>

      {/* When product has options and no option is selected, display helpful message */}
      {isMissingOptions && !isOutOfStock && (
        <p
          data-missing-options-message="true"
          className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 font-medium"
        >
          {missingOptionsMessage}
        </p>
      )}
    </div>
  );
};

export default AddToCartElement;
