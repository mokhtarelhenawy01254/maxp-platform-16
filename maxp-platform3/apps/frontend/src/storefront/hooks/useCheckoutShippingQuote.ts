import { useEffect, useMemo, useState } from "react";
import { storefrontApi } from "../../utils/storefrontApi";
import { useCheckoutStore } from "../store/useCheckoutStore";
import { useCartStore } from "../store/useCartStore";
import { getStorefrontFreeShippingPromotion } from "../utils/marketplaceApps";
import { useStorefrontSettings } from "./useStorefrontSettings";

interface UseCheckoutShippingQuoteOptions {
  shippingPromptText: string;
  shippingCalculatedText: string;
  noShippingChargeText: string;
  shippingErrorText: string;
  storefrontLoadingText: string;
  quantityOfferFreeShippingText?: string;
  freeShippingThresholdText?: string;
}

const replaceGovernorateToken = (template: string, governorate: string) =>
  template.replace("{{governorate}}", governorate);

export const useCheckoutShippingQuote = ({
  shippingPromptText,
  shippingCalculatedText,
  noShippingChargeText,
  shippingErrorText,
  storefrontLoadingText,
  quantityOfferFreeShippingText = "تم تفعيل الشحن المجاني بواسطة عرض الكميات.",
  freeShippingThresholdText = "تم تفعيل الشحن المجاني للطلب ده.",
}: UseCheckoutShippingQuoteOptions) => {
  const { formData } = useCheckoutStore();
  const { items, getSubtotal, hasQuantityOfferFreeShipping } = useCartStore();
  const { settings: storefrontSettings } = useStorefrontSettings();
  const [shippingCost, setShippingCost] = useState(0);
  const [quotedShippingCost, setQuotedShippingCost] = useState(0);
  const [freeShippingDiscount, setFreeShippingDiscount] = useState(0);
  const [shippingMessage, setShippingMessage] = useState("");
  const [isShippingLoading, setIsShippingLoading] = useState(false);

  const quantityOfferFreeShippingActive = hasQuantityOfferFreeShipping();
  const subtotal = getSubtotal();
  const freeShippingPromotion = getStorefrontFreeShippingPromotion(
    storefrontSettings,
    subtotal,
  );
  const conversionFreeShippingActive = freeShippingPromotion.eligible;
  const freeShippingActive =
    quantityOfferFreeShippingActive || conversionFreeShippingActive;
  const trimmedGovernorate = formData.governorate?.trim() || "";
  const shippingQuoteItems = useMemo(
    () =>
      items
        .map((item) => ({
          productId: String(item.productId || "").trim(),
          variantId: item.variantId || undefined,
          quantity: Number(item.quantity) || 1,
        }))
        .filter((item) => item.productId),
    [items],
  );

  useEffect(() => {
    let isCancelled = false;
    const companyId = storefrontSettings?.company?.id;

    if (quantityOfferFreeShippingActive) {
      setShippingCost(0);
      setQuotedShippingCost(0);
      setFreeShippingDiscount(0);
      setShippingMessage(quantityOfferFreeShippingText);
      setIsShippingLoading(false);
      return undefined;
    }

    if (!trimmedGovernorate) {
      setShippingCost(0);
      setQuotedShippingCost(0);
      setFreeShippingDiscount(0);
      setShippingMessage(shippingPromptText);
      setIsShippingLoading(false);
      return undefined;
    }

    if (!companyId) {
      setShippingCost(0);
      setQuotedShippingCost(0);
      setFreeShippingDiscount(0);
      setShippingMessage(storefrontLoadingText);
      setIsShippingLoading(false);
      return undefined;
    }

    setIsShippingLoading(true);

    storefrontApi
      .calculateShipping(trimmedGovernorate, companyId, shippingQuoteItems)
      .then((response) => {
        if (isCancelled) {
          return;
        }

        const nextShipping = Number(response?.data?.price) || 0;
        const freeShippingDiscountAmount = conversionFreeShippingActive
          ? nextShipping
          : 0;
        setQuotedShippingCost(nextShipping);
        setFreeShippingDiscount(freeShippingDiscountAmount);
        setShippingCost(conversionFreeShippingActive ? 0 : nextShipping);
        if (conversionFreeShippingActive) {
          setShippingMessage(freeShippingThresholdText);
        } else if (nextShipping > 0) {
          setShippingMessage(
            replaceGovernorateToken(
              shippingCalculatedText,
              trimmedGovernorate,
            ),
          );
        } else {
          setShippingMessage(response?.message || noShippingChargeText);
        }
      })
      .catch(() => {
        if (isCancelled) {
          return;
        }

        setShippingCost(0);
        setQuotedShippingCost(0);
        setFreeShippingDiscount(0);
        setShippingMessage(shippingErrorText);
      })
      .finally(() => {
        if (!isCancelled) {
          setIsShippingLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [
    noShippingChargeText,
    conversionFreeShippingActive,
    freeShippingThresholdText,
    quantityOfferFreeShippingActive,
    quantityOfferFreeShippingText,
    shippingCalculatedText,
    shippingErrorText,
    shippingPromptText,
    shippingQuoteItems,
    subtotal,
    storefrontLoadingText,
    storefrontSettings?.company?.id,
    trimmedGovernorate,
  ]);

  return {
    shippingCost,
    quotedShippingCost,
    freeShippingDiscount,
    shippingMessage,
    isShippingLoading,
    trimmedGovernorate,
    quantityOfferFreeShippingActive,
    conversionFreeShippingActive,
    freeShippingActive,
    freeShippingPromotion,
    quantityOfferFreeShippingText,
  };
};
