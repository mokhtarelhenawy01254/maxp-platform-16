import React, { useState } from 'react';
import {
  buildElementTypographyStyle,
  useElementTypographyRef,
  type ElementTypographySettings,
} from './elementTypography';
import { useStorefrontDynamicContext } from '../../studio/utils/dynamicValues';
import { usePdpSelectionStore } from '../../store/usePdpSelectionStore';
import {
  extractProductOptions,
  findMatchingVariantId,
  resolveProductFromContext,
} from './commerceElementHelpers';

export interface ProductOptionsElementSettings extends ElementTypographySettings {
  displayStyle?: 'buttons' | 'dropdown' | string;
  showLabels?: boolean;
  align?: 'start' | 'center' | 'end' | 'left' | 'right' | string;
  className?: string;
}

export interface ProductOptionsElementProps {
  section?: {
    type?: string;
    variant?: string;
    settings?: ProductOptionsElementSettings;
    product?: unknown;
    [key: string]: unknown;
  };
  settings?: ProductOptionsElementSettings;
  product?: unknown;
  initialAttributes?: Record<string, string>;
  onChange?: (selection: {
    selectedAttributes: Record<string, string>;
    variantId?: string;
  }) => void;
}

const ProductOptionsElement: React.FC<ProductOptionsElementProps> = ({
  section,
  settings: directSettings,
  product: directProduct,
  initialAttributes = {},
  onChange,
}) => {
  const dynamicCtx = useStorefrontDynamicContext();
  const mergedSettings = { ...section?.settings, ...directSettings };

  const product = resolveProductFromContext(
    dynamicCtx,
    directProduct ?? section?.product,
  );

  const [selectedAttributes, setSelectedAttributes] =
    useState<Record<string, string>>(initialAttributes);

  // If the context is NOT a product -> do NOT render anything unless in studio preview
  if (!product) {
    const isStudioPreview =
      typeof window !== 'undefined' &&
      (window.location.pathname.includes('/studio') ||
        window.location.search.includes('studio='));
    if (isStudioPreview) {
      return (
        <div
          data-storefront-element="product-options"
          data-element="product-options"
          data-studio-placeholder="true"
          className="storefront-product-options flex flex-col gap-2 w-full rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground"
        >
          <span className="font-semibold text-foreground">خيارات المنتج (معاينة)</span>
          <div className="flex flex-wrap gap-1.5">
            {['S', 'M', 'L'].map((val, idx) => (
              <span
                key={val}
                className={`px-3 py-1 rounded-md border text-xs font-medium ${
                  idx === 0
                    ? 'border-[var(--store-accent,#2563eb)] bg-[var(--store-accent,#2563eb)] text-white'
                    : 'border-border bg-background text-foreground'
                }`}
              >
                {val}
              </span>
            ))}
          </div>
        </div>
      );
    }
    return null;
  }

  const options = extractProductOptions(product);

  // If product has no options or variants to select from, return null
  if (options.length === 0) {
    return null;
  }

  const showLabels = mergedSettings?.showLabels !== false;
  const rawAlign = String(mergedSettings?.align || 'start').trim().toLowerCase();
  const customClass = mergedSettings?.className || '';

  let alignClass = 'items-start';
  if (rawAlign === 'center') {
    alignClass = 'items-center text-center';
  } else if (rawAlign === 'end' || rawAlign === 'right') {
    alignClass = 'items-end text-end';
  }

  const typoStyle = buildElementTypographyStyle(mergedSettings);
  const elementRef = useElementTypographyRef(typoStyle.letterSpacing);

  const containerStyle: React.CSSProperties = {
    fontFamily: 'var(--store-font-family, inherit)',
    ...typoStyle,
  };

  const handleSelectOption = (optionName: string, value: string) => {
    const updated = {
      ...selectedAttributes,
      [optionName]: value,
    };
    setSelectedAttributes(updated);

    const matchedVariantId = findMatchingVariantId(product, updated);

    // Notify parent callback
    onChange?.({
      selectedAttributes: updated,
      variantId: matchedVariantId,
    });

    // Notify via window custom event for decoupled AddToCartElement
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('storefront:variantChange', {
          detail: {
            productId: String(product.id),
            variantId: matchedVariantId,
            attributes: updated,
          },
        }),
      );
    }

    // Sync with pdp selection store if active
    if (matchedVariantId) {
      const variants = Array.isArray(product.variants)
        ? product.variants
        : Array.isArray(product.productVariants)
        ? product.productVariants
        : [];
      const selectedVariant = variants.find(
        (v: any) => v && typeof v === 'object' && String(v.id) === String(matchedVariantId),
      ) as Record<string, unknown> | undefined;
      const resolvedUnitPrice = Number(selectedVariant?.price ?? product.price) || 0;

      usePdpSelectionStore.getState().syncSelection({
        productId: String(product.id),
        productName: product.title || product.name || '',
        variantId: matchedVariantId,
        unitPrice: resolvedUnitPrice,
        attributes: updated,
        volumeDiscounts: Array.isArray((product as any)?.volumeDiscounts)
          ? (product as any).volumeDiscounts
          : [],
        requiresVariantSelection: true,
        isSelectionReady: true,
      });
    }
  };

  return (
    <div
      ref={elementRef as React.RefObject<HTMLDivElement>}
      data-storefront-element="product-options"
      data-element="product-options"
      data-product-id={product.id}
      className={`storefront-product-options flex flex-col gap-3 w-full ${alignClass} ${customClass}`.trim()}
      style={containerStyle}
    >
      {options.map((option) => {
        const activeValue = selectedAttributes[option.name];

        return (
          <div
            key={option.name}
            data-option-group={option.name}
            className="flex flex-col gap-1.5 w-full"
          >
            {showLabels && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <span data-option-label="true">{option.name}:</span>
                {activeValue && (
                  <span
                    data-selected-value="true"
                    className="text-muted-foreground font-normal"
                  >
                    {activeValue}
                  </span>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-1.5">
              {option.values.map((val) => {
                const isSelected = activeValue === val;

                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleSelectOption(option.name, val)}
                    data-option-name={option.name}
                    data-option-value={val}
                    data-selected={isSelected}
                    aria-pressed={isSelected}
                    className={`px-3 py-1.5 text-xs rounded-md border transition-all cursor-pointer font-medium select-none ${
                      isSelected
                        ? 'border-[var(--store-accent,#2563eb)] bg-[var(--store-accent,#2563eb)] text-white shadow-xs'
                        : 'border-border bg-background text-foreground hover:border-[var(--store-accent,#2563eb)] hover:bg-muted/30'
                    }`}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProductOptionsElement;
