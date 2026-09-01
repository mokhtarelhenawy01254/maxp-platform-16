import { useEffect, useState } from "react";

export const STOREFRONT_CONVERSION_HOST_IDLE_DELAY_MS = 8000;
export const STOREFRONT_CONVERSION_HOST_INTENT_EVENTS = [
  "click",
  "pointerdown",
  "touchstart",
  "scroll",
] as const;

export const useDeferredStorefrontConversionHosts = (): boolean => {
  const [canRender, setCanRender] = useState(false);

  useEffect(() => {
    if (canRender || typeof window === "undefined") {
      return undefined;
    }

    let isActive = true;
    let idleId: number | null = null;
    let timerId: number | null = null;

    const activate = () => {
      if (!isActive) {
        return;
      }

      setCanRender(true);
    };

    const onFirstIntent = () => {
      window.setTimeout(activate, 0);
    };
    const options: AddEventListenerOptions = { once: true, passive: true };
    const keyOptions: AddEventListenerOptions = { once: true };

    STOREFRONT_CONVERSION_HOST_INTENT_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, onFirstIntent, options);
    });
    window.addEventListener("keydown", onFirstIntent, keyOptions);

    timerId = window.setTimeout(() => {
      if ("requestIdleCallback" in window) {
        idleId = window.requestIdleCallback(activate, { timeout: 800 });
        return;
      }

      activate();
    }, STOREFRONT_CONVERSION_HOST_IDLE_DELAY_MS);

    return () => {
      isActive = false;
      STOREFRONT_CONVERSION_HOST_INTENT_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, onFirstIntent);
      });
      window.removeEventListener("keydown", onFirstIntent);

      if (idleId !== null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }

      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
    };
  }, [canRender]);

  return canRender;
};
