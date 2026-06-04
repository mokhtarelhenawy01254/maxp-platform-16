import { useEffect, useMemo, useRef, useState } from 'react';

interface DeferredSectionActivationOptions {
  idleTimeout?: number;
  rootMargin?: string;
}

export const useDeferredSectionActivation = (
  options: DeferredSectionActivationOptions = {},
) => {
  const { idleTimeout = 2500, rootMargin = '320px 0px' } = options;
  const sectionRef = useRef<HTMLElement | null>(null);
  const [isActive, setIsActive] = useState(false);

  const rootMarginValue = useMemo(() => rootMargin, [rootMargin]);

  useEffect(() => {
    if (isActive || typeof window === 'undefined') {
      return;
    }

    const element = sectionRef.current;
    if (!element) {
      return;
    }

    let isCancelled = false;
    let observer: IntersectionObserver | null = null;
    let fallbackTimer: number | null = null;
    let idleCallbackId: number | null = null;

    const activate = () => {
      if (isCancelled) {
        return;
      }
      setIsActive(true);
    };

    if (typeof window.IntersectionObserver === 'function') {
      observer = new window.IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            activate();
          }
        },
        {
          rootMargin: rootMarginValue,
        },
      );

      observer.observe(element);
    } else {
      fallbackTimer = window.setTimeout(activate, 1200);
    }

    const idleWindow = window as Window & {
      requestIdleCallback?: (
        callback: () => void,
        options?: { timeout: number },
      ) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (typeof idleWindow.requestIdleCallback === 'function') {
      idleCallbackId = idleWindow.requestIdleCallback(activate, {
        timeout: idleTimeout,
      });
    } else if (fallbackTimer === null) {
      fallbackTimer = window.setTimeout(activate, idleTimeout);
    }

    return () => {
      isCancelled = true;
      observer?.disconnect();
      if (fallbackTimer !== null) {
        window.clearTimeout(fallbackTimer);
      }
      if (
        idleCallbackId !== null &&
        typeof idleWindow.cancelIdleCallback === 'function'
      ) {
        idleWindow.cancelIdleCallback(idleCallbackId);
      }
    };
  }, [idleTimeout, isActive, rootMarginValue]);

  return {
    isActive,
    sectionRef,
  };
};

export default useDeferredSectionActivation;
