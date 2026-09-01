import React, { useEffect, useState } from "react";
import { useCartStore } from "../store/useCartStore";

const LazyCartDrawer = React.lazy(() => import("./CartDrawer"));

export const STOREFRONT_CART_DRAWER_IDLE_DELAY_MS = 2500;
export const STOREFRONT_CART_DRAWER_INTENT_EVENTS = [
  "click",
  "pointerdown",
  "touchstart",
  "scroll",
] as const;

export const DeferredCartDrawerHost: React.FC = () => {
  const shouldActivateCartDrawer = useCartStore(
    (state) => state.isOpen || state.items.length > 0,
  );
  const [canRenderCartDrawer, setCanRenderCartDrawer] = useState(() =>
    typeof window !== "undefined" ? useCartStore.getState().items.length > 0 : false,
  );

  useEffect(() => {
    if (canRenderCartDrawer || typeof window === "undefined") {
      return undefined;
    }

    if (shouldActivateCartDrawer) {
      setCanRenderCartDrawer(true);
      return undefined;
    }

    let isActive = true;
    let idleId: number | null = null;
    let timerId: number | null = null;

    const activate = () => {
      if (isActive) {
        setCanRenderCartDrawer(true);
      }
    };

    const onFirstIntent = () => {
      window.setTimeout(activate, 0);
    };
    const options: AddEventListenerOptions = { once: true, passive: true };

    STOREFRONT_CART_DRAWER_INTENT_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, onFirstIntent, options);
    });

    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(activate, {
        timeout: STOREFRONT_CART_DRAWER_IDLE_DELAY_MS,
      });
    } else {
      timerId = window.setTimeout(
        activate,
        STOREFRONT_CART_DRAWER_IDLE_DELAY_MS,
      );
    }

    return () => {
      isActive = false;
      STOREFRONT_CART_DRAWER_INTENT_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, onFirstIntent);
      });
      if (idleId !== null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
    };
  }, [canRenderCartDrawer, shouldActivateCartDrawer]);

  if (!canRenderCartDrawer) {
    return null;
  }

  return (
    <React.Suspense fallback={null}>
      <LazyCartDrawer />
    </React.Suspense>
  );
};
