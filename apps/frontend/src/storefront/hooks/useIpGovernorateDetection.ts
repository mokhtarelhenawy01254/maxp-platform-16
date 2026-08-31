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

    const { formData, updateFormData } = useCheckoutStore.getState();
    if (formData?.governorate?.trim()) return;

    let active = true;
    void detectGovernorateByIp().then(({ governorate, city }) => {
      if (!active || !governorate) return;

      const current = useCheckoutStore.getState().formData;
      if (current.governorate?.trim()) return;

      updateFormData({
        governorate,
        ...(city ? { city } : {}),
      });
    });

    return () => {
      active = false;
    };
  }, []);
};
