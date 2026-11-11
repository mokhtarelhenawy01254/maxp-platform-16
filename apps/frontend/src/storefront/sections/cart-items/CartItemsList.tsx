import React from 'react';
import type { getCartDisplayEntries } from '../../utils/cartQuantityOffers';
import { CartItemSingleRow } from './CartItemSingleRow';
import { CartItemOfferGroupRow } from './CartItemOfferGroupRow';
import { CartCouponRow } from './CartCouponRow';

export interface CartItemsListProps {
  listWrapperClassName: string;
  variant: string;
  isBiteRush: boolean;
  isPharmacy: boolean;
  isCommandCart: boolean;
  isMarketCart: boolean;
  isNatureCart: boolean;
  isWomenFashionCart: boolean;
  isWardrobeKhemet: boolean;
  hasServiceCartTone: boolean;
  isButcherCart: boolean;
  themeDirection?: string;
  productLabel: string;
  priceLabel: string;
  quantityLabel: string;
  totalLabel: string;
  removeLabel: string;
  currency: string;
  displayEntries: ReturnType<typeof getCartDisplayEntries>;
  rowClassName: string;
  imageWrapperClassName: string;
  removeButtonClassName: string;
  getItemName: (item: { name?: string; productId?: string; id?: string }) => string;
  getAttributeEntries: (attributes?: Record<string, string>) => [string, string][];
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  removeQuantityOfferGroup: (groupId: string) => void;
  cartTotal?: number;
  shopPath?: string;
  couponPlaceholder?: string;
  couponButtonText?: string;
  continueShoppingText?: string;
}

export const CartItemsList: React.FC<CartItemsListProps> = ({
  listWrapperClassName,
  variant,
  isBiteRush,
  isPharmacy,
  isCommandCart,
  isMarketCart,
  isNatureCart,
  isWomenFashionCart,
  isWardrobeKhemet,
  hasServiceCartTone,
  isButcherCart,
  themeDirection,
  productLabel,
  priceLabel,
  quantityLabel,
  totalLabel,
  removeLabel,
  currency,
  displayEntries,
  rowClassName,
  imageWrapperClassName,
  removeButtonClassName,
  getItemName,
  getAttributeEntries,
  updateQuantity,
  removeItem,
  removeQuantityOfferGroup,
  cartTotal,
  shopPath,
  couponPlaceholder,
  couponButtonText,
  continueShoppingText,
}) => {
  return (
    <div className={listWrapperClassName}>
      {variant !== 'playful-basket' &&
        !isBiteRush &&
        !isPharmacy &&
        !isCommandCart &&
        !isMarketCart &&
        !isNatureCart && (
          <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid">
            <span>{productLabel}</span>
            <span>{priceLabel}</span>
            <span>{quantityLabel}</span>
            <span>{totalLabel}</span>
            <span className="w-10">&nbsp;</span>
          </div>
        )}

      {displayEntries.map((entry) =>
        entry.type === 'single' ? (
          <CartItemSingleRow
            key={entry.key}
            entry={entry}
            rowClassName={rowClassName}
            isWomenFashionCart={isWomenFashionCart}
            isWardrobeKhemet={isWardrobeKhemet}
            imageWrapperClassName={imageWrapperClassName}
            hasServiceCartTone={hasServiceCartTone}
            isButcherCart={isButcherCart}
            themeDirection={themeDirection}
            isMarketCart={isMarketCart}
            isNatureCart={isNatureCart}
            priceLabel={priceLabel}
            totalLabel={totalLabel}
            removeLabel={removeLabel}
            currency={currency}
            removeButtonClassName={removeButtonClassName}
            getItemName={getItemName}
            getAttributeEntries={getAttributeEntries}
            updateQuantity={updateQuantity}
            removeItem={removeItem}
          />
        ) : (
          <CartItemOfferGroupRow
            key={entry.key}
            entry={entry}
            rowClassName={rowClassName}
            isBiteRush={isBiteRush}
            isPharmacy={isPharmacy}
            isWomenFashionCart={isWomenFashionCart}
            variant={variant}
            priceLabel={priceLabel}
            quantityLabel={quantityLabel}
            totalLabel={totalLabel}
            currency={currency}
            removeButtonClassName={removeButtonClassName}
            removeLabel={removeLabel}
            getItemName={getItemName}
            getAttributeEntries={getAttributeEntries}
            removeQuantityOfferGroup={removeQuantityOfferGroup}
          />
        ),
      )}

      {cartTotal !== undefined && shopPath && (
        <CartCouponRow
          cartTotal={cartTotal}
          currency={currency}
          shopPath={shopPath}
          couponPlaceholder={couponPlaceholder}
          couponButtonText={couponButtonText}
          continueShoppingText={continueShoppingText}
        />
      )}
    </div>
  );
};
