export interface CartItemsProps {
  section?: {
    variant?: string;
    [key: string]: unknown;
  };
  settings?: {
    title?: string;
    subtitle?: string;
    emptyTitle?: string;
    emptyText?: string;
    continueShoppingText?: string;
    productLabel?: string;
    priceLabel?: string;
    quantityLabel?: string;
    totalLabel?: string;
    removeLabel?: string;
    headerBadge?: string;
    serviceHighlights?: string[] | string;
    serviceNoteLabel?: string;
    serviceNote?: string;
    showUpsell?: string | boolean;
    couponPlaceholder?: string;
    couponButtonText?: string;
    [key: string]: unknown;
  };
}

export type CartVariant =
  | 'standard'
  | 'editorial'
  | 'compact'
  | 'market-basket'
  | 'nature-cart'
  | 'playful-basket'
  | 'wardrobe-cart'
  | 'command-cart';
