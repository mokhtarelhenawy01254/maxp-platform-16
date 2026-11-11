import React from 'react';
import CartUpsellHost from '../components/CartUpsellHost';
import type { CartItemsProps } from './cart-items/cartItemsTypes';
import { useCartItemsController } from './cart-items/useCartItemsController';
import { CartEmptyState } from './cart-items/CartEmptyState';
import { CartTimer } from './cart-items/CartTimer';
import { FreeShippingProgress } from './cart-items/FreeShippingProgress';
import { CartItemsHeader } from './cart-items/CartItemsHeader';
import { CartItemsList } from './cart-items/CartItemsList';

export const CartItems: React.FC<CartItemsProps> = ({ section, settings }) => {
  const ctrl = useCartItemsController({ section, settings });

  if (ctrl.items.length === 0) {
    return (
      <CartEmptyState
        isBiteRush={ctrl.isBiteRush}
        isSproutRoom={ctrl.isSproutRoom}
        isPharmacy={ctrl.isPharmacy}
        isMarketCart={ctrl.isMarketCart}
        isNatureCart={ctrl.isNatureCart}
        emptyTitle={ctrl.emptyTitle}
        emptyText={ctrl.emptyText}
        continueShoppingText={ctrl.continueShoppingText}
        continueShoppingClassName={ctrl.continueShoppingClassName}
        shopPath={ctrl.shopPath}
      />
    );
  }

  return (
    <section
      className={`w-full ${
        ctrl.variant === 'wardrobe-cart'
          ? 'bg-[linear-gradient(180deg,#fffdfc_0%,#fff8f7_48%,#ffffff_100%)]'
          : ctrl.isSproutRoom
            ? 'bg-[linear-gradient(180deg,#fbfaf5_0%,#eef5ea_42%,#ffffff_100%)]'
          : ctrl.isNatureCart
            ? 'bg-[linear-gradient(180deg,#f8fbf7_0%,#eef5ea_42%,#ffffff_100%)]'
          : ctrl.isMarketCart
            ? 'bg-[linear-gradient(180deg,#fffdf9_0%,#fff7ef_44%,#ffffff_100%)]'
          : ctrl.isCommandCart
            ? 'bg-[linear-gradient(180deg,#fffdf9_0%,#fff8ee_44%,#ffffff_100%)]'
          : 'bg-background'
      }`}
    >
      <CartItemsHeader
        headerWrapperClassName={ctrl.headerWrapperClassName}
        isBiteRush={ctrl.isBiteRush}
        isSproutRoom={ctrl.isSproutRoom}
        isPharmacy={ctrl.isPharmacy}
        isMarketCart={ctrl.isMarketCart}
        isNatureCart={ctrl.isNatureCart}
        isCommandCart={ctrl.isCommandCart}
        isWomenFashionCart={ctrl.isWomenFashionCart}
        variant={ctrl.variant}
        headerBadge={ctrl.headerBadge}
        pharmacyBrandName={ctrl.pharmacyBrandName}
        title={ctrl.title}
        subtitle={ctrl.subtitle}
        hasServiceCartTone={ctrl.hasServiceCartTone}
        serviceHighlights={ctrl.serviceHighlights}
        countBadgeClassName={ctrl.countBadgeClassName}
        displayEntriesCount={ctrl.displayEntries.length}
        serviceNoteLabel={ctrl.serviceNoteLabel}
        serviceNote={ctrl.serviceNote}
      />

      {ctrl.shouldShowCartMomentum && (
        <div className="px-4 md:px-0">
          <CartTimer
            isBiteRush={ctrl.isBiteRush}
            isPharmacy={ctrl.isPharmacy}
            isCommandCart={ctrl.isCommandCart}
          />
          <FreeShippingProgress
            total={ctrl.cartTotal}
            threshold={ctrl.isCommandCart ? 25000 : ctrl.freeShippingThreshold}
            currency={ctrl.currency}
            isBiteRush={ctrl.isBiteRush}
            isPharmacy={ctrl.isPharmacy}
            isCommandCart={ctrl.isCommandCart}
          />
        </div>
      )}

      <CartItemsList
        listWrapperClassName={ctrl.listWrapperClassName}
        variant={ctrl.variant}
        isBiteRush={ctrl.isBiteRush}
        isPharmacy={ctrl.isPharmacy}
        isCommandCart={ctrl.isCommandCart}
        isMarketCart={ctrl.isMarketCart}
        isNatureCart={ctrl.isNatureCart}
        isWomenFashionCart={ctrl.isWomenFashionCart}
        isWardrobeKhemet={ctrl.isWardrobeKhemet}
        hasServiceCartTone={ctrl.hasServiceCartTone}
        isButcherCart={ctrl.isButcherCart}
        themeDirection={ctrl.theme.direction}
        productLabel={ctrl.productLabel}
        priceLabel={ctrl.priceLabel}
        quantityLabel={ctrl.quantityLabel}
        totalLabel={ctrl.totalLabel}
        removeLabel={ctrl.removeLabel}
        currency={ctrl.currency}
        displayEntries={ctrl.displayEntries}
        rowClassName={ctrl.rowClassName}
        imageWrapperClassName={ctrl.imageWrapperClassName}
        removeButtonClassName={ctrl.removeButtonClassName}
        getItemName={ctrl.getItemName}
        getAttributeEntries={ctrl.getAttributeEntries}
        updateQuantity={ctrl.updateQuantity}
        removeItem={ctrl.removeItem}
        removeQuantityOfferGroup={ctrl.removeQuantityOfferGroup}
        cartTotal={ctrl.cartTotal}
        shopPath={ctrl.shopPath}
        couponPlaceholder={ctrl.couponPlaceholder}
        couponButtonText={ctrl.couponButtonText}
        continueShoppingText={ctrl.continueShoppingText}
      />

      {ctrl.showUpsell ? <CartUpsellHost open={ctrl.items.length > 0} layout="inline" /> : null}
    </section>
  );
};

export default CartItems;
