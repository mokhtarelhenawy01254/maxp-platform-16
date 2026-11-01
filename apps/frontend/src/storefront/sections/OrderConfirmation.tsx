import React from 'react';
import {
  OrderConfirmationActions,
  OrderConfirmationHeader,
  OrderConfirmationItemsRecap,
  OrderConfirmationSummaryCard,
  OrderConfirmationUpsell,
  OrderConfirmationUtilitySection,
  resolveShippingLocation,
  sanitizeOrderConfirmationCopy,
  useOrderConfirmationController,
  type OrderConfirmationProps,
} from './order-confirmation';

export { resolveShippingLocation, sanitizeOrderConfirmationCopy };
export type { OrderConfirmationProps };

export const OrderConfirmation: React.FC<OrderConfirmationProps> = (props) => {
  const { section, settings } = props;
  const ctrl = useOrderConfirmationController(props);

  return (
    <section className={ctrl.shellClassName}>
      <div className={ctrl.containerClassName}>
        <OrderConfirmationHeader
          successBadgeClassName={ctrl.successBadgeClassName}
          successIconWrapClassName={ctrl.successIconWrapClassName}
          titleClassName={ctrl.titleClassName}
          descriptionClassName={ctrl.descriptionClassName}
          title={ctrl.title}
          description={ctrl.description}
        />

        <OrderConfirmationSummaryCard
          summaryPanelClassName={ctrl.summaryPanelClassName}
          accentOverlineClassName={ctrl.accentOverlineClassName}
          orderNumberPrefix={ctrl.orderNumberPrefix}
          visibleOrderNumber={ctrl.visibleOrderNumber}
          statusPillClassName={ctrl.statusPillClassName}
          statusPulseClassName={ctrl.statusPulseClassName}
          statusDotClassName={ctrl.statusDotClassName}
          isPcHub={ctrl.isPcHub}
          statusLabel={ctrl.statusLabel}
          isOfferAccepted={ctrl.isOfferAccepted}
          showTimeline={ctrl.showTimeline}
          pcHubStatusExperience={ctrl.pcHubStatusExperience}
          timelineLabels={ctrl.timelineLabels}
        />

        {ctrl.orderItemsForDisplay.length > 0 ? (
          <OrderConfirmationItemsRecap
            recapPanelClassName={ctrl.recapPanelClassName}
            accentOverlineClassName={ctrl.accentOverlineClassName}
            isSoftAftercare={ctrl.isSoftAftercare}
            recapGridClassName={ctrl.recapGridClassName}
            quantityOfferSummary={ctrl.quantityOfferSummary}
            singleSummaryCardClassName={ctrl.singleSummaryCardClassName}
            offerPrimaryChipClassName={ctrl.offerPrimaryChipClassName}
            offerSecondaryChipClassName={ctrl.offerSecondaryChipClassName}
            offerFreeShippingChipClassName={ctrl.offerFreeShippingChipClassName}
            currency={ctrl.currency}
            orderItemCardClassName={ctrl.orderItemCardClassName}
            orderAttributeChipClassName={ctrl.orderAttributeChipClassName}
            prefersArabicCopy={ctrl.prefersArabicCopy}
            getDisplayItemName={ctrl.getDisplayItemName}
            getDisplayItemAttributes={ctrl.getDisplayItemAttributes}
          />
        ) : null}

        <OrderConfirmationActions
          primaryButtonClassName={ctrl.primaryButtonClassName}
          whatsappButtonClassName={ctrl.whatsappButtonClassName}
          emailPanelClassName={ctrl.emailPanelClassName}
          supportLinkClassName={ctrl.supportLinkClassName}
          continueShoppingText={ctrl.continueShoppingText}
          whatsappSupportLabel={ctrl.whatsappSupportLabel}
          resolvedWhatsappNumber={ctrl.resolvedWhatsappNumber}
          supportEmail={ctrl.supportEmail}
          supportText={ctrl.supportText}
          handleContinueShopping={ctrl.handleContinueShopping}
          handleWhatsappSupport={ctrl.handleWhatsappSupport}
          handleSupportEmailClick={ctrl.handleSupportEmailClick}
        />

        {ctrl.showTrackOrder || ctrl.showReorder ? (
          <OrderConfirmationUtilitySection
            showTrackOrder={ctrl.showTrackOrder}
            showReorder={ctrl.showReorder}
            utilityCardClassName={ctrl.utilityCardClassName}
            accentOverlineClassName={ctrl.accentOverlineClassName}
            prefersArabicCopy={ctrl.prefersArabicCopy}
            trackOrderTitle={ctrl.trackOrderTitle}
            trackOrderDescription={ctrl.trackOrderDescription}
            handleTrackOrderSubmit={ctrl.handleTrackOrderSubmit}
            trackOrderPhoneLabel={ctrl.trackOrderPhoneLabel}
            trackPhone={ctrl.trackPhone}
            setTrackPhone={ctrl.setTrackPhone}
            trackOrderPhonePlaceholder={ctrl.trackOrderPhonePlaceholder}
            trackInputClassName={ctrl.trackInputClassName}
            subtleButtonClassName={ctrl.subtleButtonClassName}
            resolvedOrderReference={ctrl.resolvedOrderReference}
            trackOrderLoading={ctrl.trackOrderLoading}
            trackOrderButtonText={ctrl.trackOrderButtonText}
            trackOrderError={ctrl.trackOrderError}
            errorMessageClassName={ctrl.errorMessageClassName}
            effectiveTrackedOrder={ctrl.effectiveTrackedOrder}
            nestedPanelClassName={ctrl.nestedPanelClassName}
            isPcHub={ctrl.isPcHub}
            pcHubStatusExperience={ctrl.pcHubStatusExperience}
            nestedCardClassName={ctrl.nestedCardClassName}
            currency={ctrl.currency}
            purchaseTotal={ctrl.purchaseTotal}
            purchaseItemsCount={ctrl.purchaseItems.length}
            trackedOrderLocation={ctrl.trackedOrderLocation}
            isRoseBoutique={ctrl.isSoftAftercare}
            reorderTitle={ctrl.reorderTitle}
            reorderDescription={ctrl.reorderDescription}
            reorderableItemsCount={ctrl.reorderableItems.length}
            reorderQuantity={ctrl.reorderQuantity}
            reorderButtonClassName={ctrl.reorderButtonClassName}
            handleReorder={ctrl.handleReorder}
            reorderButtonText={ctrl.reorderButtonText}
            reorderMessage={ctrl.reorderMessage}
            successMessageClassName={ctrl.successMessageClassName}
            reorderError={ctrl.reorderError}
          />
        ) : null}

        {ctrl.showRecommended ? (
          <OrderConfirmationUpsell
            showRecommended={ctrl.showRecommended}
            resolvedOrderReference={ctrl.resolvedOrderReference}
            purchaseItems={ctrl.purchaseItems}
            settings={ctrl.sanitizedSettings || settings}
            prefersArabicCopy={ctrl.prefersArabicCopy}
            isPcHub={ctrl.isPcHub}
            isRoseBoutique={ctrl.isSoftAftercare}
          />
        ) : null}
      </div>
    </section>
  );
};

export default OrderConfirmation;
