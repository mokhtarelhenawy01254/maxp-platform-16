import { useEffect, useRef } from "react";
import { useCheckoutStore } from "../store/useCheckoutStore";
import { detectGovernorateByIp } from "../utils/ipGovernorate";

/**
 * Pre-selects the customer's governorate from their IP as soon as the
 * storefront boots. Only fills the field when it is still empty so a value the
 * buyer already chose (or one they start typing) is never overwritten.
 */
export const useIpGovernorateDetection = (): void => {
  // Guard against double-invocation in StrictMode / repeated mounts.
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const { formData } = useCheckoutStore.getState();
    const isManuallySelected =
      typeof window !== "undefined" &&
      window.sessionStorage?.getItem("sf-gov-manual-selection") === "true";
    if (formData?.governorate?.trim() && isManuallySelected) return;

    let active = true;

    const runDetection = () => {
      void detectGovernorateByIp().then(({ governorate, city }) => {
        if (!active || !governorate) return;

        const current = useCheckoutStore.getState().formData;
        const isManuallySelected =
          typeof window !== "undefined" &&
          window.sessionStorage?.getItem("sf-gov-manual-selection") === "true";

        if (
          !current.governorate?.trim() ||
          (!isManuallySelected && current.governorate === "Cairo" && governorate !== "Cairo")
        ) {
          useCheckoutStore.getState().updateFormData({
            governorate,
            ...(city ? { city } : {}),
          });
        }
      });
    };

    // Run detection immediately so governorate is pre-selected when user views the checkout form
    runDetection();

    return () => {
      active = false;
    };
  }, []);
};
